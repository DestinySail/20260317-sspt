import { describe, expect, it } from "vitest";
import {
  formatSSE,
  parseOpenAIChunk,
  createSSEStream,
  createErrorResponse,
} from "@/lib/ai/sse-stream";

describe("formatSSE", () => {
  it("格式化 code 事件", () => {
    const result = formatSSE({ type: "code", chunk: "<div>" });
    expect(result).toBe('event: code\ndata: {"chunk":"<div>"}\n\n');
  });

  it("格式化 done 事件", () => {
    const result = formatSSE({ type: "done", html: "<html></html>" });
    expect(result).toBe('event: done\ndata: {"html":"<html></html>"}\n\n');
  });

  it("格式化 error 事件", () => {
    const result = formatSSE({ type: "error", message: "失败" });
    expect(result).toBe('event: error\ndata: {"message":"失败"}\n\n');
  });

  it("正确转义特殊字符", () => {
    const result = formatSSE({
      type: "code",
      chunk: '<div class="test">\n</div>',
    });
    expect(result).toContain('\\"test\\"');
    expect(result).toContain("\\n");
  });
});

describe("parseOpenAIChunk", () => {
  it("解析正常的内容 chunk", () => {
    const line =
      'data: {"id":"chatcmpl-123","choices":[{"delta":{"content":"<div>"},"finish_reason":null}]}';
    expect(parseOpenAIChunk(line)).toBe("<div>");
  });

  it("解析 [DONE] 信号", () => {
    expect(parseOpenAIChunk("data: [DONE]")).toBe("done");
  });

  it("忽略非 data: 行", () => {
    expect(parseOpenAIChunk("")).toBeNull();
    expect(parseOpenAIChunk("event: ping")).toBeNull();
  });

  it("处理无 content 的 chunk", () => {
    const line =
      'data: {"id":"chatcmpl-123","choices":[{"delta":{},"finish_reason":null}]}';
    expect(parseOpenAIChunk(line)).toBeNull();
  });

  it("处理无效 JSON", () => {
    expect(parseOpenAIChunk("data: not-json")).toBeNull();
  });

  it("处理空 choices", () => {
    const line = 'data: {"id":"chatcmpl-123","choices":[]}';
    expect(parseOpenAIChunk(line)).toBeNull();
  });
});

describe("createSSEStream", () => {
  function createMockAIStream(chunks: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    let index = 0;
    return new ReadableStream<Uint8Array>({
      pull(controller) {
        if (index >= chunks.length) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(chunks[index]));
        index++;
      },
    });
  }

  async function collectStream(
    stream: ReadableStream<Uint8Array>
  ): Promise<string[]> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    const events: string[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      events.push(decoder.decode(value));
    }
    return events;
  }

  it("将 AI 响应转换为 SSE 事件流", async () => {
    const aiChunks = [
      'data: {"id":"1","choices":[{"delta":{"content":"<html>"},"finish_reason":null}]}\ndata: {"id":"2","choices":[{"delta":{"content":"<body>"},"finish_reason":null}]}\n',
      'data: {"id":"3","choices":[{"delta":{"content":"</body></html>"},"finish_reason":"stop"}]}\ndata: [DONE]\n',
    ];
    const stream = createSSEStream(createMockAIStream(aiChunks));
    const events = await collectStream(stream);

    expect(events).toHaveLength(4); // 2 code + 1 code + 1 done
    expect(events[0]).toContain("event: code");
    expect(events[0]).toContain("<html>");
    expect(events[1]).toContain("<body>");
    expect(events[events.length - 1]).toContain("event: done");
    expect(events[events.length - 1]).toContain("<html><body></body></html>");
  });

  it("处理空响应", async () => {
    const stream = createSSEStream(createMockAIStream(["data: [DONE]\n"]));
    const events = await collectStream(stream);
    expect(events).toHaveLength(1);
    expect(events[0]).toContain("event: done");
    expect(events[0]).toContain('""');
  });

  it("流没有 [DONE] 标记时，内层流关闭后仍应发送 done 事件并关闭", async () => {
    const aiChunks = [
      'data: {"id":"1","choices":[{"delta":{"content":"<html>"},"finish_reason":null}]}\n',
      'data: {"id":"2","choices":[{"delta":{"content":"<body>"},"finish_reason":"stop"}]}\n',
      // 注意：没有 data: [DONE] 这一行
    ];
    const stream = createSSEStream(createMockAIStream(aiChunks));
    const events = await collectStream(stream);

    const codeEvents = events.filter((e) => e.includes("event: code"));
    const doneEvents = events.filter((e) => e.includes("event: done"));

    expect(codeEvents.length).toBeGreaterThanOrEqual(2);
    expect(doneEvents).toHaveLength(1);
    expect(doneEvents[0]).toContain("<html><body>");
  });

  it("内层流立即关闭（无数据）时应发送空 done 事件", async () => {
    const stream = createSSEStream(createMockAIStream([]));
    const events = await collectStream(stream);

    expect(events).toHaveLength(1);
    expect(events[0]).toContain("event: done");
    expect(events[0]).toContain('""');
  });
});

describe("createErrorResponse", () => {
  it("返回错误 SSE 事件", async () => {
    const stream = createErrorResponse("API 调用失败");
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    const { value } = await reader.read();
    const event = decoder.decode(value);
    expect(event).toContain("event: error");
    expect(event).toContain("API 调用失败");
  });
});
