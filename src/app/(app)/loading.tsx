import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex w-full flex-1 flex-col">
      {/* Hero skeleton */}
      <section className="bg-muted border-b border-border px-6 py-16 text-center lg:px-8 lg:py-20">
        <Skeleton className="mx-auto mb-4 h-10 w-96 max-w-full" />
        <Skeleton className="mx-auto h-5 w-full max-w-2xl" />
      </section>

      {/* 赛事列表骨架 */}
      <section className="mx-auto w-full max-w-6xl px-6 py-10 lg:px-8">
        <div className="flex flex-col gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-4 border border-border bg-card p-5 sm:flex-row sm:items-start sm:gap-6 sm:p-6"
            >
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:items-end">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
