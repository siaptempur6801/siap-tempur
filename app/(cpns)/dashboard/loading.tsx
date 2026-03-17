import PaperBackground from "@/components/PaperBackground";

export default function DashboardLoading() {
    return (
        <div className="w-full min-h-screen flex flex-col relative font-body">
            <PaperBackground />
            <div className="space-y-8 relative z-10 w-full animate-pulse">
                {/* 1. Hero Header Skeleton */}
                <div className="space-y-3">
                    <div className="h-10 w-48 md:w-64 bg-gray-200 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"></div>
                    <div className="h-6 w-full max-w-md bg-gray-100 border-2 border-gray-300"></div>
                </div>

                {/* 2. Hero Card Skeleton */}
                <div className="min-h-[480px] md:h-64 bg-white border-2 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 md:p-8">
                    <div className="flex flex-col sm:flex-row justify-between gap-4 mb-8">
                        <div className="flex gap-4">
                            <div className="h-8 w-32 bg-green-200 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"></div>
                            <div className="h-8 w-32 bg-yellow-100 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"></div>
                        </div>
                        <div className="h-8 w-40 bg-blue-100 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="h-32 bg-blue-500/10 border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"></div>
                        <div className="h-32 bg-gray-50 border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"></div>
                    </div>
                </div>

                {/* 3. Grid Layout Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {/* Results Skeleton */}
                        <div className="h-96 bg-white border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"></div>
                        {/* Leaderboard Skeleton */}
                        <div className="h-48 bg-white border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"></div>
                    </div>
                    <div className="space-y-6">
                        {/* Level Skeleton */}
                        <div className="h-48 bg-yellow-300 border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"></div>
                        {/* Mini Stats Skeleton */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="h-24 bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"></div>
                            <div className="h-24 bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
