import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

function createMockAIResponse(chunks: string[], delay = 0): Response {
  const encoder = new TextEncoder();
  let index = 0;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      if (index >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunks[index]));
      index++;
    },
  });
  return new Response(stream, { status: 200 });
}

async function collectSSEEvents(
  stream: ReadableStream<Uint8Array>
): Promise<{ type: string; data: string }[]> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const events: { type: string; data: string }[] = [];
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      if (!part.trim()) continue;
      const lines = part.split("\n");
      let eventType = "";
      let eventData = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) eventType = line.slice(7);
        else if (line.startsWith("data: ")) eventData = line.slice(6);
      }
      if (eventType) events.push({ type: eventType, data: eventData });
    }
  }

  if (buffer.trim()) {
    const lines = buffer.split("\n");
    let eventType = "";
    let eventData = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) eventType = line.slice(7);
      else if (line.startsWith("data: ")) eventData = line.slice(6);
    }
    if (eventType) events.push({ type: eventType, data: eventData });
  }

  return events;
}

describe("generateLandingPageStream", () => {
  const originalEnv = process.env;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      AI_PROVIDER: "openai",
      AI_BASE_URL: "https://api.test.com/v1",
      AI_API_KEY: "test-key",
      AI_MODEL_NAME: "test-model",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
  });

  it("正常流式响应应发送 code 事件和 done 事件", async () => {
    const aiChunks = [
      'data: {"id":"1","choices":[{"delta":{"content":"<html>"},"finish_reason":null}]}\ndata: {"id":"2","choices":[{"delta":{"content":"<body>"},"finish_reason":null}]}\n',
      'data: {"id":"3","choices":[{"delta":{"content":"</body></html>"},"finish_reason":"stop"}]}\ndata: [DONE]\n',
    ];
    globalThis.fetch = vi.fn().mockResolvedValue(createMockAIResponse(aiChunks));

    const { generateLandingPageStream } = await import(
      "@/lib/ai/code-generator"
    );
    const stream = generateLandingPageStream({
      eventData: {
        name: "测试",
        description: "描述",
        startDate: "2026-04-01",
        endDate: "2026-06-30",
        registrationStart: "2026-04-01",
        registrationEnd: "2026-05-15",
        submissionStart: "2026-05-16",
        submissionEnd: "2026-06-15",
        reviewStart: "2026-06-16",
        reviewEnd: "2026-06-30",
        tracks: [],
        challenges: [],
        prizes: [],
        scoringCriteria: [],
      },
      styleHint: "简约",
      eventSlug: "test-slug",
    });

    const events = await collectSSEEvents(stream);
    const codeEvents = events.filter((e) => e.type === "code");
    const doneEvents = events.filter((e) => e.type === "done");

    expect(codeEvents.length).toBeGreaterThanOrEqual(2);
    expect(doneEvents).toHaveLength(1);
    expect(doneEvents[0].data).toContain("<html>");
  });

  it("AI 响应没有 [DONE] 标记时应自动关闭并发送 done 事件", async () => {
    const aiChunks = [
      'data: {"id":"1","choices":[{"delta":{"content":"<html>"},"finish_reason":null}]}\n',
      'data: {"id":"2","choices":[{"delta":{"content":"<body>"},"finish_reason":"stop"}]}\n',
      // 没有 [DONE]
    ];
    globalThis.fetch = vi.fn().mockResolvedValue(createMockAIResponse(aiChunks));

    const { generateLandingPageStream } = await import(
      "@/lib/ai/code-generator"
    );
    const stream = generateLandingPageStream({
      eventData: {
        name: "测试",
        description: "描述",
        startDate: "2026-04-01",
        endDate: "2026-06-30",
        registrationStart: "2026-04-01",
        registrationEnd: "2026-05-15",
        submissionStart: "2026-05-16",
        submissionEnd: "2026-06-15",
        reviewStart: "2026-06-16",
        reviewEnd: "2026-06-30",
        tracks: [],
        challenges: [],
        prizes: [],
        scoringCriteria: [],
      },
      styleHint: "简约",
      eventSlug: "test-slug",
    });

    const events = await collectSSEEvents(stream);
    const doneEvents = events.filter((e) => e.type === "done");

    expect(doneEvents).toHaveLength(1);
    expect(doneEvents[0].data).toContain("<html><body>");
  });

  it("AI API 返回错误时应发送 error 事件", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("Rate limited", { status: 429 })
    );

    const { generateLandingPageStream } = await import(
      "@/lib/ai/code-generator"
    );
    const stream = generateLandingPageStream({
      eventData: {
        name: "测试",
        description: "描述",
        startDate: "2026-04-01",
        endDate: "2026-06-30",
        registrationStart: "2026-04-01",
        registrationEnd: "2026-05-15",
        submissionStart: "2026-05-16",
        submissionEnd: "2026-06-15",
        reviewStart: "2026-06-16",
        reviewEnd: "2026-06-30",
        tracks: [],
        challenges: [],
        prizes: [],
        scoringCriteria: [],
      },
      styleHint: "简约",
      eventSlug: "test-slug",
    });

    const events = await collectSSEEvents(stream);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("error");
    expect(events[0].data).toContain("429");
  });

  it("AI API 超时时应发送 error 事件而不是永远挂起", async () => {
    // 模拟一个支持 AbortSignal 的 fetch
    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((resolve, reject) => {
          const signal = init?.signal;
          if (signal) {
            signal.addEventListener("abort", () => {
              reject(new DOMException("The operation was aborted.", "AbortError"));
            });
          }
          // 永远不 resolve，模拟 AI 服务无响应
        })
    );

    const { generateLandingPageStream } = await import(
      "@/lib/ai/code-generator"
    );
    const stream = generateLandingPageStream({
      eventData: {
        name: "测试",
        description: "描述",
        startDate: "2026-04-01",
        endDate: "2026-06-30",
        registrationStart: "2026-04-01",
        registrationEnd: "2026-05-15",
        submissionStart: "2026-05-16",
        submissionEnd: "2026-06-15",
        reviewStart: "2026-06-16",
        reviewEnd: "2026-06-30",
        tracks: [],
        challenges: [],
        prizes: [],
        scoringCriteria: [],
      },
      styleHint: "简约",
      eventSlug: "test-slug",
      timeoutMs: 2000,
    });

    // 应该在 5 秒内返回 error，而不是永远挂起
    const events = await Promise.race([
      collectSSEEvents(stream),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("stream did not close in time")), 5000)
      ),
    ]);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("error");
    expect(events[0].data).toContain("超时");
  }, 10000);
});
