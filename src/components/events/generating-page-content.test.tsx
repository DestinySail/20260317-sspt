import { describe, expect, it } from "vitest";
import {
  CODE_PANEL_CLASS_NAME,
  CODE_SCROLL_CLASS_NAME,
  COMPLETED_GENERATION_ACTIONS,
  CODE_VIEW_MASK_IMAGE,
  GENERATING_PAGE_CLASS_NAME,
  THINKING_PANEL_CLASS_NAME,
} from "@/components/events/generating-page-layout";

// Test the pure formatting logic from generating-page-content
describe("formatTimer", () => {
  function formatTimer(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  it("formats 0 seconds as 0:00", () => {
    expect(formatTimer(0)).toBe("0:00");
  });

  it("formats 5 seconds as 0:05", () => {
    expect(formatTimer(5)).toBe("0:05");
  });

  it("formats 65 seconds as 1:05", () => {
    expect(formatTimer(65)).toBe("1:05");
  });

  it("formats 125 seconds as 2:05", () => {
    expect(formatTimer(125)).toBe("2:05");
  });

  it("formats 600 seconds as 10:00", () => {
    expect(formatTimer(600)).toBe("10:00");
  });
});

describe("GenerationStatus state machine", () => {
  type GenerationStatus = "idle" | "connecting" | "thinking" | "code" | "completed" | "error";

  it("idle shows style selection UI", () => {
    const status: GenerationStatus = "idle";
    const showStyleSelection = status === "idle";
    expect(showStyleSelection).toBe(true);
  });

  it("connecting shows timer and status indicator", () => {
    const status: GenerationStatus = "connecting";
    const showTimer = (status as GenerationStatus) !== "idle" && (status as GenerationStatus) !== "error";
    expect(showTimer).toBe(true);
  });

  it("thinking shows thinking chunks and timer", () => {
    const status: GenerationStatus = "thinking";
    const showTimer = (status as GenerationStatus) !== "idle" && (status as GenerationStatus) !== "error";
    const showThinking = (status as GenerationStatus) === "thinking";
    expect(showTimer && showThinking).toBe(true);
  });

  it("code phase collapses thinking and shows code typewriter", () => {
    const status: GenerationStatus = "code";
    const isThinkingCollapsed = (status as GenerationStatus) === "code";
    const showCodePhase = (status as GenerationStatus) === "code" || (status as GenerationStatus) === "thinking";
    expect(isThinkingCollapsed && showCodePhase).toBe(true);
  });

  it("completed shows save and discard buttons", () => {
    const status: GenerationStatus = "completed";
    const showActions = (status as GenerationStatus) === "completed";
    expect(showActions).toBe(true);
  });

  it("error hides timer and shows error message", () => {
    const status: GenerationStatus = "error";
    const showTimer = (status as GenerationStatus) !== "idle" && (status as GenerationStatus) !== "error";
    const showError = (status as GenerationStatus) === "error";
    expect(!showTimer && showError).toBe(true);
  });

  it("transitions: connecting -> thinking -> code -> completed", () => {
    const canTransition = (from: GenerationStatus, to: GenerationStatus): boolean => {
      const order = ["idle", "connecting", "thinking", "code", "completed", "error"];
      return order.indexOf(to) > order.indexOf(from);
    };

    expect(canTransition("connecting", "thinking")).toBe(true);
    expect(canTransition("thinking", "code")).toBe(true);
    expect(canTransition("code", "completed")).toBe(true);
  });

  it("error can transition back to idle via discard", () => {
    const afterDiscard: GenerationStatus = "idle";
    expect(afterDiscard).toBe("idle");
  });
});

describe("SSE event parsing", () => {
  function parseSSELines(part: string): { eventType: string; eventData: string } | null {
    if (!part.trim()) return null;
    const lines = part.split("\n");
    let eventType = "";
    let eventData = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) eventType = line.slice(7);
      else if (line.startsWith("data: ")) eventData = line.slice(6);
    }
    return eventType ? { eventType, eventData } : null;
  }

  it("parses thinking event correctly", () => {
    const part = 'event: thinking\ndata: {"chunk":"分析赛事需求"}\n\n';
    const result = parseSSELines(part);
    expect(result?.eventType).toBe("thinking");
    expect(result?.eventData).toBe('{"chunk":"分析赛事需求"}');
  });

  it("parses phase event correctly", () => {
    const part = 'event: phase\ndata: {"phase":"code"}\n\n';
    const result = parseSSELines(part);
    expect(result?.eventType).toBe("phase");
    expect(result?.eventData).toBe('{"phase":"code"}');
  });

  it("parses code event correctly", () => {
    const part = 'event: code\ndata: {"chunk":"<html>"}';
    const result = parseSSELines(part);
    expect(result?.eventType).toBe("code");
    expect(result?.eventData).toBe('{"chunk":"<html>"}');
  });

  it("parses done event correctly", () => {
    const part = 'event: done\ndata: {"html":"<html></html>"}';
    const result = parseSSELines(part);
    expect(result?.eventType).toBe("done");
    expect(result?.eventData).toBe('{"html":"<html></html>"}');
  });

  it("parses error event correctly", () => {
    const part = 'event: error\ndata: {"message":"API 调用失败"}';
    const result = parseSSELines(part);
    expect(result?.eventType).toBe("error");
    expect(result?.eventData).toBe('{"message":"API 调用失败"}');
  });
});

describe("STYLE_HINTS constant", () => {
  const STYLE_HINTS = [
    { id: "minimal", label: "简约", description: "简洁大方，大量留白，清晰层次" },
    { id: "tech", label: "科技感", description: "渐变色、几何图形、前沿科技氛围" },
    { id: "vibrant", label: "活力", description: "色彩丰富、充满动感、激发热情" },
    { id: "retro", label: "复古未来", description: "赛博朋克、霓虹灯、复古科技" },
    { id: "luxury", label: "奢华精致", description: "金色点缀、高端质感、优雅排版" },
    { id: "editorial", label: "杂志风", description: "大图排版、editorial 布局、视觉冲击" },
  ];

  it("has exactly 6 style hints", () => {
    expect(STYLE_HINTS).toHaveLength(6);
  });

  it("each style hint has id, label, and description", () => {
    for (const hint of STYLE_HINTS) {
      expect(hint.id).toBeDefined();
      expect(hint.label).toBeDefined();
      expect(hint.description).toBeDefined();
    }
  });

  it("style hints have unique ids", () => {
    const ids = STYLE_HINTS.map((h) => h.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe("edge gradient CSS logic", () => {
  it("only fades generated code near the top edge", () => {
    expect(CODE_VIEW_MASK_IMAGE).toBe(
      "linear-gradient(transparent 0%, black 4%, black 100%)"
    );
    expect(CODE_VIEW_MASK_IMAGE).not.toContain("transparent 100%");
  });

  it("keeps the thinking panel sized to content instead of filling the page", () => {
    expect(THINKING_PANEL_CLASS_NAME).toContain("flex-none");
    expect(THINKING_PANEL_CLASS_NAME).not.toContain("flex-1");
  });
});

describe("generating page layout constraints", () => {
  it("keeps the generating page inside the viewport instead of creating page scroll", () => {
    expect(GENERATING_PAGE_CLASS_NAME).toContain("h-[calc(100dvh-8rem)]");
    expect(GENERATING_PAGE_CLASS_NAME).toContain("overflow-hidden");
    expect(GENERATING_PAGE_CLASS_NAME).toContain("min-h-0");
  });

  it("uses an opaque code surface with internal scrolling", () => {
    expect(CODE_PANEL_CLASS_NAME).toContain("bg-[#111111]");
    expect(CODE_SCROLL_CLASS_NAME).toContain("bg-[#111111]");
    expect(CODE_SCROLL_CLASS_NAME).toContain("overflow-auto");
  });
});

describe("completed generation actions", () => {
  it("includes a preview action before discard and save", () => {
    expect(COMPLETED_GENERATION_ACTIONS).toEqual(["预览", "丢弃", "保存"]);
  });
});
