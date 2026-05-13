"use client";

import { useEffect, useRef } from "react";

interface CodeStreamViewerProps {
  codeRef: React.RefObject<string | null>;
  isStreaming: boolean;
}

export function CodeStreamViewer({ codeRef, isStreaming }: CodeStreamViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const codeElRef = useRef<HTMLPreElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let running = true;

    const tick = () => {
      if (!running) return;
      if (codeElRef.current && codeRef.current != null) {
        const code = codeRef.current;
        const lines = code.split("\n");
        const lineCount = lines.length;
        const lastLineLen = lines[lineCount - 1].length;

        codeElRef.current.textContent = code;

        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }

        const counterEl = containerRef.current?.querySelector("[data-line-counter]");
        if (counterEl) {
          counterEl.textContent = `${lineCount} 行 | ${lastLineLen} 字符`;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [codeRef]);

  return (
    <div className="flex h-full flex-col border border-border bg-[#1e1e1e]">
      <div className="flex items-center justify-between border-b border-[#333] bg-[#252526] px-4 py-2">
        <span className="font-mono text-xs text-[#ccc]">生成的代码</span>
        <div className="flex items-center gap-3">
          <span data-line-counter className="font-mono text-xs text-[#858585]">
            0 行 | 0 字符
          </span>
          {isStreaming && (
            <span className="flex items-center gap-2 font-mono text-xs text-[#4ec9b0]">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#4ec9b0]" />
              生成中
            </span>
          )}
          {!isStreaming && (
            <span className="font-mono text-xs text-[#6a9955]">完成</span>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 font-mono text-sm leading-6"
      >
        <pre
          ref={codeElRef}
          className="whitespace-pre-wrap break-all text-[#d4d4d4]"
        />
      </div>
    </div>
  );
}
