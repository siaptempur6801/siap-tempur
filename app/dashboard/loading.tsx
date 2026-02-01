export default function DashboardLoading() {
    return (
        <div className="space-y-6 animate-pulse p-6 md:p-8 max-w-7xl mx-auto">
            {/* Header Skeleton */}
            <div className="flex flex-col gap-2 mb-8">
                <div className="h-10 w-64 bg-secondary/30 rounded-lg" />
                <div className="h-4 w-96 bg-secondary/20 rounded-lg" />
            </div>

            {/* Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* Hero Card Skeleton */}
                    <div className="h-64 bg-secondary/10 rounded-[2rem] border border-white/5 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                    </div>
                    {/* Progress Skeleton */}
                    <div className="h-96 bg-secondary/10 rounded-[2rem] border border-white/5" />
                </div>
                {/* Right Column Skeleton */}
                <div className="h-[500px] bg-secondary/10 rounded-[2rem] border border-white/5" />
            </div>
        </div>
    )
}
