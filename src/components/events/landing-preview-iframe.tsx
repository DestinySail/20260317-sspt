"use client";

interface LandingPreviewIframeProps {
  html: string;
  isLoading: boolean;
}

export function LandingPreviewIframe({
  html,
  isLoading,
}: LandingPreviewIframeProps) {
  return (
    <div className="flex h-full flex-col border border-border">
      <div className="flex items-center justify-between border-b border-border bg-muted px-4 py-2">
        <span className="font-mono text-xs text-muted-foreground">
          预览
        </span>
        {isLoading && (
          <span className="flex items-center gap-2 font-mono text-xs text-primary">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
            渲染中
          </span>
        )}
      </div>

      <div className="relative flex-1 bg-white">
        {!html && !isLoading && (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p className="text-sm">等待代码生成...</p>
          </div>
        )}
        {html && (
          <iframe
            srcDoc={html}
            className="h-full w-full border-0"
            title="落地页预览"
            sandbox="allow-scripts allow-same-origin"
          />
        )}
      </div>
    </div>
  );
}
