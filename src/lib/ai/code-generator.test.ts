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
  let currentEventType = "";
  let currentEventData = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      if (!part.trim()) continue;
      const lines = part.split("\n");
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          // 如果有待发送的事件，先发送
          if (currentEventType) {
            events.push({ type: currentEventType, data: currentEventData });
          }
          currentEventType = line.slice(7);
          currentEventData = "";
        } else if (line.startsWith("data: ")) {
          currentEventData = line.slice(6);
        }
      }
    }
  }

  // 处理剩余 buffer
  if (buffer.trim()) {
    const lines = buffer.split("\n");
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        if (currentEventType) {
          events.push({ type: currentEventType, data: currentEventData });
        }
        currentEventType = line.slice(7);
        currentEventData = "";
      } else if (line.startsWith("data: ")) {
        currentEventData = line.slice(6);
      }
    }
  }

  // 发送最后的待处理事件
  if (currentEventType) {
    events.push({ type: currentEventType, data: currentEventData });
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

  it("thinking 文本遇到 ```html 时应切段并发送 phase: code", async () => {
    const aiChunks = [
      'data: {"id":"1","choices":[{"delta":{"content":"我来设计一个简约风格的页面。"},"finish_reason":null}]}\n',
      'data: {"id":"2","choices":[{"delta":{"content":"```html\n"},"finish_reason":null}]}\n',
      'data: {"id":"3","choices":[{"delta":{"content":"<html>"},"finish_reason":null}]}\n',
      'data: {"id":"4","choices":[{"delta":{"content":"</html>"},"finish_reason":"stop"}]}\ndata: [DONE]\n',
    ];
    globalThis.fetch = vi.fn().mockResolvedValue(createMockAIResponse(aiChunks));

    const { generateLandingPageStream } = await import("@/lib/ai/code-generator");
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
    const thinkingEvents = events.filter((e) => e.type === "thinking");
    const phaseEvents = events.filter((e) => e.type === "phase");
    const codeEvents = events.filter((e) => e.type === "code");
    const doneEvents = events.filter((e) => e.type === "done");

    // thinking 阶段应有内容
    expect(thinkingEvents.length).toBeGreaterThanOrEqual(1);
    expect(thinkingEvents.some((e) => e.data.includes("设计"))).toBe(true);

    // phase 事件应在 code 事件之前发送
    expect(phaseEvents).toHaveLength(1);
    expect(phaseEvents[0].data).toBe('{"phase":"code"}');

    // code 事件应在 phase 之后，不包含 thinking 内容
    expect(codeEvents.length).toBeGreaterThanOrEqual(1);
    expect(codeEvents.some((e) => e.data.includes("<html>"))).toBe(true);
    expect(codeEvents[0].data).not.toContain("```html");
    expect(doneEvents[0].data).not.toContain("```html");

    // done 事件
    expect(doneEvents).toHaveLength(1);
  });

  it("保存到 done 的 HTML 应剥离结尾代码围栏", async () => {
    const aiChunks = [
      'data: {"id":"1","choices":[{"delta":{"content":"```html\\n<!DOCTYPE html>"},"finish_reason":null}]}\n',
      'data: {"id":"2","choices":[{"delta":{"content":"<html><body>ok</body></html>\\n```"},"finish_reason":"stop"}]}\ndata: [DONE]\n',
    ];
    globalThis.fetch = vi.fn().mockResolvedValue(createMockAIResponse(aiChunks));

    const { generateLandingPageStream } = await import("@/lib/ai/code-generator");
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
    const doneEvent = events.find((e) => e.type === "done");

    expect(doneEvent?.data).toContain("<!DOCTYPE html>");
    expect(doneEvent?.data).not.toContain("```");
  });

  it("thinking 文本遇到 <!DOCTYPE 时应切段并发送 phase: code", async () => {
    const aiChunks = [
      'data: {"id":"1","choices":[{"delta":{"content":"让我先分析一下页面结构。"},"finish_reason":null}]}\n',
      'data: {"id":"2","choices":[{"delta":{"content":"<!DOCTYPE html>"},"finish_reason":null}]}\n',
      'data: {"id":"3","choices":[{"delta":{"content":"<html><body></body></html>"},"finish_reason":"stop"}]}\ndata: [DONE]\n',
    ];
    globalThis.fetch = vi.fn().mockResolvedValue(createMockAIResponse(aiChunks));

    const { generateLandingPageStream } = await import("@/lib/ai/code-generator");
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
    const thinkingEvents = events.filter((e) => e.type === "thinking");
    const phaseEvents = events.filter((e) => e.type === "phase");
    const codeEvents = events.filter((e) => e.type === "code");

    expect(thinkingEvents.some((e) => e.data.includes("分析"))).toBe(true);
    expect(phaseEvents[0].data).toBe('{"phase":"code"}');
    expect(codeEvents.length).toBeGreaterThanOrEqual(1);
  });

  it("纯代码文本（无 thinking）应直接进 code 阶段，不发 thinking 事件", async () => {
    const aiChunks = [
      'data: {"id":"1","choices":[{"delta":{"content":"<html>"},"finish_reason":null}]}\n',
      'data: {"id":"2","choices":[{"delta":{"content":"<body></body></html>"},"finish_reason":"stop"}]}\ndata: [DONE]\n',
    ];
    globalThis.fetch = vi.fn().mockResolvedValue(createMockAIResponse(aiChunks));

    const { generateLandingPageStream } = await import("@/lib/ai/code-generator");
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
    const thinkingEvents = events.filter((e) => e.type === "thinking");
    const codeEvents = events.filter((e) => e.type === "code");
    const doneEvents = events.filter((e) => e.type === "done");

    // 无 thinking 事件
    expect(thinkingEvents).toHaveLength(0);
    // 直接进 code 阶段
    expect(codeEvents.length).toBeGreaterThanOrEqual(1);
    expect(doneEvents).toHaveLength(1);
  });

  it("thinking 文本遇到 <html（不带 <!DOCTYPE）时应切段", async () => {
    // 注意：AI 输出 "开始编写 HTML" 时，如果 thinkingBuffer 为空，则不会发送 thinking 事件
    // 因为检测到 HTML 时 thinkingBuffer 是空的，没有 pending thinking 内容可发
    // 改为用 "开始编写"（不含 HTML）触发 thinking，然后用 "<html" 触发 phase
    const aiChunks = [
      'data: {"id":"1","choices":[{"delta":{"content":"开始编写"},"finish_reason":null}]}\n',
      "data: {\"id\":\"2\",\"choices\":[{\"delta\":{\"content\":\" <html lang=\\\"zh\\\">\"},\"finish_reason\":null}]}\n",
      'data: {"id":"3","choices":[{"delta":{"content":"</html>"},"finish_reason":"stop"}]}\ndata: [DONE]\n',
    ];
    globalThis.fetch = vi.fn().mockResolvedValue(createMockAIResponse(aiChunks));

    const { generateLandingPageStream } = await import("@/lib/ai/code-generator");
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
    const thinkingEvents = events.filter((e) => e.type === "thinking");
    const phaseEvents = events.filter((e) => e.type === "phase");
    const codeEvents = events.filter((e) => e.type === "code");

    expect(thinkingEvents.some((e) => e.data.includes("开始编写"))).toBe(true);
    expect(phaseEvents).toHaveLength(1);
    expect(phaseEvents[0].data).toBe('{"phase":"code"}');
    expect(codeEvents.length).toBeGreaterThanOrEqual(1);
    const allCodeData = codeEvents.map((e) => e.data).join("");
    expect(allCodeData).toContain("<html");
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
