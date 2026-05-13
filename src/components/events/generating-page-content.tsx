"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CodeStreamViewer } from "@/components/events/code-stream-viewer";
import { LandingPreviewIframe } from "@/components/events/landing-preview-iframe";

interface GeneratingPageContentProps {
  eventId: string;
  eventName: string;
  initialStyleHint?: string;
}

type GenerationStatus = "idle" | "connecting" | "streaming" | "completed" | "error";

const STYLE_HINTS = [
  { id: "minimal", label: "简约", description: "简洁大方，大量留白，清晰层次" },
  { id: "tech", label: "科技感", description: "渐变色、几何图形、前沿科技氛围" },
  { id: "vibrant", label: "活力", description: "色彩丰富、充满动感、激发热情" },
  { id: "retro", label: "复古未来", description: "赛博朋克、霓虹灯、复古科技" },
  { id: "luxury", label: "奢华精致", description: "金色点缀、高端质感、优雅排版" },
  { id: "editorial", label: "杂志风", description: "大图排版、editorial 布局、视觉冲击" },
];

export function GeneratingPageContent({
  eventId,
  eventName,
  initialStyleHint,
}: GeneratingPageContentProps) {
  const router = useRouter();
  const [status, setStatus] = useState<GenerationStatus>(
    initialStyleHint ? "connecting" : "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [selectedHint, setSelectedHint] = useState(initialStyleHint || "minimal");
  const [customHint, setCustomHint] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const codeRef = useRef("");
  const fullHtmlRef = useRef("");
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedulePreviewUpdate = useCallback(() => {
    if (previewTimerRef.current) return;
    previewTimerRef.current = setTimeout(() => {
      previewTimerRef.current = null;
      setPreviewHtml(codeRef.current);
    }, 300);
  }, []);

  const handleGenerate = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    codeRef.current = "";
    fullHtmlRef.current = "";
    setPreviewHtml("");

    const styleHint =
      customHint || STYLE_HINTS.find((h) => h.id === selectedHint)?.label || selectedHint;

    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/generate-landing`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ styleHint }),
        }
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "生成失败");
      }

      if (!response.body) {
        throw new Error("未收到响应流");
      }

      setStatus("streaming");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
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
            if (line.startsWith("event: ")) {
              eventType = line.slice(7);
            } else if (line.startsWith("data: ")) {
              eventData = line.slice(6);
            }
          }

          if (eventType === "code" && eventData) {
            try {
              const parsed = JSON.parse(eventData);
              codeRef.current += parsed.chunk;
              schedulePreviewUpdate();
            } catch {
              // ignore
            }
          } else if (eventType === "done" && eventData) {
            try {
              const parsed = JSON.parse(eventData);
              fullHtmlRef.current = parsed.html;
              setPreviewHtml(parsed.html);
              setStatus("completed");
            } catch {
              setStatus("error");
              setError("解析完成事件失败");
            }
          } else if (eventType === "error" && eventData) {
            try {
              const parsed = JSON.parse(eventData);
              setStatus("error");
              setError(parsed.message);
            } catch {
              setStatus("error");
              setError("未知错误");
            }
          }
        }
      }

      if (status === "streaming") {
        setPreviewHtml(codeRef.current);
        setStatus("completed");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setStatus("error");
      setError(err instanceof Error ? err.message : "生成失败，请重试");
    }
  }, [eventId, selectedHint, customHint, status, schedulePreviewUpdate]);

  useEffect(() => {
    if (initialStyleHint && status === "connecting") {
      handleGenerate();
    }
  }, [initialStyleHint, status, handleGenerate]);

  useEffect(() => {
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  const handleSave = async () => {
    try {
      const styleHint =
        customHint || STYLE_HINTS.find((h) => h.id === selectedHint)?.label || selectedHint;

      const html = fullHtmlRef.current || codeRef.current;

      const response = await fetch(
        `/api/admin/events/${eventId}/save-landing`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ html, styleHint }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "保存失败");
      }

      router.push(`/admin/events/${eventId}/landing-preview`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    }
  };

  const handleDiscard = () => {
    setStatus("idle");
    codeRef.current = "";
    fullHtmlRef.current = "";
    setPreviewHtml("");
    setError(null);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {status === "idle" && (
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-2xl space-y-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold">为「{eventName}」生成赛事页</h1>
              <p className="mt-2 text-muted-foreground">
                选择风格方向，AI 将为你生成一个独特的赛事落地页
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold">选择风格</h2>
              <div className="grid gap-3 md:grid-cols-3">
                {STYLE_HINTS.map((hint) => (
                  <button
                    key={hint.id}
                    onClick={() => {
                      setSelectedHint(hint.id);
                      setCustomHint("");
                    }}
                    className={`border p-4 text-left transition-all ${
                      selectedHint === hint.id && !customHint
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="text-sm font-medium">{hint.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {hint.description}
                    </div>
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">或自定义风格描述</label>
                <textarea
                  value={customHint}
                  onChange={(e) => setCustomHint(e.target.value)}
                  placeholder="例如：暗黑风格，紫色霓虹灯效果，赛博朋克氛围..."
                  className="w-full border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.push("/admin/events")}
              >
                跳过，稍后生成
              </Button>
              <Button onClick={handleGenerate}>开始生成</Button>
            </div>
          </div>
        </div>
      )}

      {(status === "connecting" || status === "streaming" || status === "completed") && (
        <>
          <div className="flex items-center justify-between border-b border-border bg-muted px-4 py-2">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/events"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← 返回赛事列表
              </Link>
              <span className="text-muted-foreground">|</span>
              <span className="text-sm font-medium">{eventName}</span>
            </div>

            <div className="flex items-center gap-2">
              {status === "connecting" && (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
                  连接中...
                </span>
              )}
              {status === "streaming" && (
                <span className="flex items-center gap-2 text-sm text-primary">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                  生成中...
                </span>
              )}
              {status === "completed" && (
                <>
                  <Button variant="outline" size="sm" onClick={handleDiscard}>
                    丢弃
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    保存并查看
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="w-1/2 border-r border-border">
              <CodeStreamViewer
                codeRef={codeRef}
                isStreaming={status === "streaming"}
              />
            </div>
            <div className="w-1/2">
              <LandingPreviewIframe
                html={previewHtml}
                isLoading={status === "streaming"}
              />
            </div>
          </div>
        </>
      )}

      {status === "error" && (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center border-4 border-destructive bg-destructive/10">
              <span className="text-4xl">✕</span>
            </div>

            <h2 className="text-2xl font-bold text-destructive">生成失败</h2>
            <p className="mt-2 text-muted-foreground">{error}</p>

            <div className="mt-8 flex justify-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.push("/admin/events")}
              >
                返回列表
              </Button>
              <Button onClick={handleGenerate}>重试</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
