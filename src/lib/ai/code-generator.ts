import { getAIConfig } from "./config";
import { buildPrompts, type EventData } from "./prompt-builder";
import { findHtmlStart, stripHtmlCodeFence } from "./html-sanitize";
import { formatSSE, parseOpenAIChunk, parseAnthropicChunk } from "./sse-stream";

export type { EventData };

export interface GenerateLandingPageOptions {
  eventData: EventData;
  styleHint: string;
  eventSlug: string;
  timeoutMs?: number;
}

export function generateLandingPageStream(
  options: GenerateLandingPageOptions
): ReadableStream<Uint8Array> {
  const config = getAIConfig();
  const { eventData, styleHint, eventSlug, timeoutMs = 60000 } = options;
  const { systemPrompt, userPrompt } = buildPrompts(
    eventData,
    styleHint,
    eventSlug
  );

  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

      const write = (event: Parameters<typeof formatSSE>[0]) => {
        controller.enqueue(encoder.encode(formatSSE(event)));
      };

      try {
        const isAnthropicFormat = config.provider === "anthropic";

        const fetchOptions: RequestInit = isAnthropicFormat
          ? {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": config.apiKey,
                "anthropic-version": "2023-06-01",
                "anthropic-dangerous-direct-browser-access": "true",
              },
              body: JSON.stringify({
                model: config.modelName,
                messages: [
                  { role: "user", content: systemPrompt },
                  { role: "user", content: userPrompt },
                ],
                temperature: 0.8,
                max_tokens: 16000,
                stream: true,
              }),
              signal: abortController.signal,
            }
          : {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${config.apiKey}`,
              },
              body: JSON.stringify({
                model: config.modelName,
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userPrompt },
                ],
                temperature: 0.8,
                max_tokens: 16000,
                stream: true,
              }),
              signal: abortController.signal,
            };

        const endpoint = isAnthropicFormat
          ? `${config.baseUrl}/v1/messages`
          : `${config.baseUrl}/chat/completions`;

        const response = await fetch(endpoint, fetchOptions);

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          write({
            type: "error",
            message: `AI API 调用失败：${response.status} ${errorText}`,
          });
          controller.close();
          return;
        }

        if (!response.body) {
          write({ type: "error", message: "AI API 未返回响应流" });
          controller.close();
          return;
        }

        // 直接读取 AI 响应流，不做嵌套
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullHtml = "";
        let buffer = "";
        let inCodePhase = false;
        let thinkingBuffer = "";

        const flushThinking = () => {
          if (thinkingBuffer.length > 0) {
            write({ type: "thinking", chunk: thinkingBuffer });
            thinkingBuffer = "";
          }
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            const parseChunk = isAnthropicFormat ? parseAnthropicChunk : parseOpenAIChunk;

            for (const line of lines) {
              const result = parseChunk(line);
              if (result === "done") {
                // flush any remaining thinking
                if (!inCodePhase && thinkingBuffer.length > 0) {
                  flushThinking();
                }
                write({ type: "done", html: stripHtmlCodeFence(fullHtml) });
                controller.close();
                return;
              }
              if (result !== null) {
                if (!inCodePhase) {
                  // 检查是否进入 code 阶段
                  const textToCheck = thinkingBuffer + result;
                  const htmlStart = findHtmlStart(textToCheck);
                  if (htmlStart) {
                    const thinkingPart = textToCheck.slice(0, htmlStart.index);
                    if (thinkingPart.length > 0) {
                      write({ type: "thinking", chunk: thinkingPart });
                    }
                    inCodePhase = true;
                    write({ type: "phase", phase: "code" });
                    const codePart = textToCheck.slice(htmlStart.contentStart);
                    if (codePart.length > 0) {
                      fullHtml += codePart;
                      write({ type: "code", chunk: codePart });
                    }
                    thinkingBuffer = "";
                  } else {
                    // 还在 thinking 阶段
                    thinkingBuffer += result;
                  }
                } else {
                  // code 阶段
                  fullHtml += result;
                  write({ type: "code", chunk: result });
                }
              }
            }
          }

          // 流结束时 flush remaining thinking
          if (!inCodePhase && thinkingBuffer.length > 0) {
            flushThinking();
          }
          write({ type: "done", html: stripHtmlCodeFence(fullHtml) });
          controller.close();
        } catch (readError) {
          const msg =
            readError instanceof Error ? readError.message : "流读取错误";
          write({ type: "error", message: msg });
          controller.close();
        }
      } catch (error) {
        clearTimeout(timeoutId);

        let message: string;
        if (error instanceof DOMException && error.name === "AbortError") {
          message = `AI API 请求超时（${timeoutMs / 1000}秒）`;
        } else {
          message = error instanceof Error ? error.message : "未知错误";
        }

        write({ type: "error", message });
        controller.close();
      }
    },
  });
}
