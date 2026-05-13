import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* PageHeaderCard skeleton */}
      <div className="border border-border bg-card p-6 lg:p-8">
        <Skeleton className="mb-3 h-4 w-16" />
        <Skeleton className="mb-3 h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-3xl" />
      </div>

      {/* MetricCards skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-border bg-card p-6">
            <Skeleton className="mb-2 h-3 w-16" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>

      {/* Checkpoints skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-border bg-card p-5">
            <Skeleton className="mb-2 h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-1 h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
