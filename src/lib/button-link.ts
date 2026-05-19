import { cn } from "@/lib/utils";

const baseClassName =
  "inline-flex shrink-0 items-center justify-center rounded-md border text-sm font-semibold whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50";

const variantClassName = {
  default:
    "border-primary bg-primary text-primary-foreground shadow-sm hover:-translate-y-px hover:bg-primary/90 hover:shadow-md",
  outline:
    "border-border bg-card hover:-translate-y-px hover:border-primary/40 hover:bg-secondary hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
};

const sizeClassName = {
  default: "h-8 min-h-11 w-auto min-w-11 gap-1.5 px-2.5",
  sm: "h-7 min-h-11 w-auto min-w-11 gap-1 rounded-md px-2.5 text-[0.8rem]",
};

export function linkButtonClassName(
  variant: keyof typeof variantClassName = "default",
  size: keyof typeof sizeClassName = "sm",
  className?: string
) {
  return cn(baseClassName, variantClassName[variant], sizeClassName[size], className);
}
