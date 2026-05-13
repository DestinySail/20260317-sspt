import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* PageHeaderCard skeleton */}
      <div className="border border-border bg-card p-6 lg:p-8">
        <Skeleton className="mb-3 h-4 w-16" />
        <Skeleton className="mb-3 h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

      {/* MetricCards skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-border bg-card p-6">
            <Skeleton className="mb-2 h-3 w-16" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="overflow-hidden border border-border bg-card">
        <div className="border-b border-border px-6 py-3">
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
        </div>
        {[1, 2].map((row) => (
          <div key={row} className="border-b border-border px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-full" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-7 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
