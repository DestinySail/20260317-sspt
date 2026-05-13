export type SSEEvent =
  | { type: "code"; chunk: string }
  | { type: "done"; html: string }
  | { type: "error"; message: string };

export function formatSSE(event: SSEEvent): string {
  switch (event.type) {
    case "code":
      return `event: code\ndata: ${JSON.stringify({ chunk: event.chunk })}\n\n`;
    case "done":
      return `event: done\ndata: ${JSON.stringify({ html: event.html })}\n\n`;
    case "error":
      return `event: error\ndata: ${JSON.stringify({ message: event.message })}\n\n`;
  }
}

interface OpenAIChunk {
  id: string;
  choices: Array<{
    delta: { content?: string };
    finish_reason: string | null;
  }>;
}

export function parseOpenAIChunk(line: string): string | null | "done" {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data: ")) return null;

  const dataStr = trimmed.slice(6);
  if (dataStr === "[DONE]") return "done";

  try {
    const chunk: OpenAIChunk = JSON.parse(dataStr);
    const content = chunk.choices?.[0]?.delta?.content;
    return content ?? null;
  } catch {
    return null;
  }
}

export function createSSEStream(
  aiResponseStream: ReadableStream<Uint8Array>
): ReadableStream<Uint8Array> {
  const reader = aiResponseStream.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let fullHtml = "";
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const result = parseOpenAIChunk(line);
            if (result === "done") {
              controller.enqueue(
                encoder.encode(formatSSE({ type: "done", html: fullHtml }))
              );
              controller.close();
              return;
            }
            if (result !== null) {
              fullHtml += result;
              controller.enqueue(
                encoder.encode(formatSSE({ type: "code", chunk: result }))
              );
            }
          }
        }

        controller.enqueue(
          encoder.encode(formatSSE({ type: "done", html: fullHtml }))
        );
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "流读取错误";
        controller.enqueue(
          encoder.encode(formatSSE({ type: "error", message }))
        );
        controller.close();
      }
    },

    cancel() {
      reader.cancel();
    },
  });
}

export function createErrorResponse(message: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        encoder.encode(formatSSE({ type: "error", message }))
      );
      controller.close();
    },
  });
}
