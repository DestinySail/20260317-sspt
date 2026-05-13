import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex w-full flex-1 flex-col gap-8 px-6 py-10 lg:px-8">
      {/* PageHeaderCard skeleton */}
      <div className="border border-border bg-card p-6 lg:p-8">
        <Skeleton className="mb-3 h-4 w-20" />
        <Skeleton className="mb-3 h-9 w-96 max-w-full" />
        <Skeleton className="mb-4 h-4 w-full max-w-3xl" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>

      {/* MetricCards skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-border bg-card p-6">
            <Skeleton className="mb-2 h-3 w-16" />
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>

      {/* Timeline + Config skeleton */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="border border-border bg-card p-6">
          <Skeleton className="mb-4 h-6 w-32" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </div>
        </div>
        <div className="border border-border bg-card p-6">
          <Skeleton className="mb-4 h-6 w-40" />
          <div className="mb-4 grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <Skeleton className="mb-2 h-3 w-12" />
                <Skeleton className="h-5 w-8" />
              </div>
            ))}
          </div>
          <Skeleton className="h-12 w-full" />
        </div>
      </div>

      {/* Tracks skeleton */}
      <div className="border border-border bg-card p-6">
        <Skeleton className="mb-4 h-6 w-24" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-border bg-background/50 p-4">
              <Skeleton className="mb-2 h-5 w-32" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
