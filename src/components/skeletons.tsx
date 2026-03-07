import { cn } from '../lib/utils';

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('skeleton-shimmer rounded-lg', className)} aria-hidden="true" />;
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden border border-creo-border bg-creo-card">
      <SkeletonBlock className="aspect-video w-full" />
      <div className="p-2 space-y-2">
        <SkeletonBlock className="h-3 w-4/5" />
        <SkeletonBlock className="h-3 w-2/5" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 md:gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <ProductCardSkeleton key={`product-skeleton-${idx}`} />
      ))}
    </div>
  );
}

export function HorizontalCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="home-cards-track flex overflow-x-auto overflow-y-hidden pb-4 -mx-4 px-4 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={`horizontal-skeleton-${idx}`} className="home-cards-item shrink-0">
          <ProductCardSkeleton />
        </div>
      ))}
    </div>
  );
}

export function OrderRowSkeleton() {
  return (
    <div className="bg-creo-card border border-creo-border rounded-2xl p-4 md:p-6 flex flex-col md:flex-row gap-4 md:items-center justify-between">
      <div className="flex items-center gap-4">
        <SkeletonBlock className="w-16 h-16 rounded-xl" />
        <div className="space-y-2">
          <SkeletonBlock className="h-4 w-40" />
          <SkeletonBlock className="h-3 w-52" />
        </div>
      </div>
      <div className="flex items-center justify-between md:flex-col md:items-end gap-2 border-t border-creo-border pt-4 md:pt-0 md:border-t-0">
        <SkeletonBlock className="h-5 w-20" />
        <SkeletonBlock className="h-6 w-24 rounded-full" />
      </div>
    </div>
  );
}

export function OrdersListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, idx) => (
        <OrderRowSkeleton key={`order-skeleton-${idx}`} />
      ))}
    </div>
  );
}

export function DashboardCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-2">
      <SkeletonBlock className="h-3 w-24" />
      <SkeletonBlock className="h-7 w-20" />
      <SkeletonBlock className="h-3 w-32" />
    </div>
  );
}

export function DashboardWidgetsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <DashboardCardSkeleton key={`dashboard-card-skeleton-${idx}`} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={`dashboard-panel-skeleton-${idx}`} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
            <SkeletonBlock className="h-4 w-32" />
            {Array.from({ length: 5 }).map((__, row) => (
              <SkeletonBlock key={`dash-row-skeleton-${idx}-${row}`} className="h-3 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
