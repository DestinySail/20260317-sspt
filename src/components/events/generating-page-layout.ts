export const CODE_VIEW_MASK_IMAGE =
  "linear-gradient(transparent 0%, black 4%, black 100%)";

export const THINKING_PANEL_CLASS_NAME =
  "flex flex-none flex-col overflow-hidden border-b border-border";

export const GENERATING_PAGE_CLASS_NAME =
  "flex h-[calc(100dvh-8rem)] min-h-0 flex-col overflow-hidden border border-border bg-[#111111]";

export const CODE_PANEL_CLASS_NAME =
  "relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#111111]";

export const CODE_SCROLL_CLASS_NAME =
  "min-h-0 flex-1 overflow-auto bg-[#111111] p-4 font-mono text-sm leading-6";

export const COMPLETED_GENERATION_ACTIONS = ["预览", "丢弃", "保存"] as const;
