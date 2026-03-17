import PaperBackground from "@/components/PaperBackground";

export default function Loading() {
    return (
        <div className="w-full min-h-screen flex flex-col relative font-body">
            <PaperBackground />
            <div className="space-y-8 relative z-10 w-full animate-pulse font-handwriting">
                {/* 1. Header Skeleton */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-2">
                        <div className="h-10 w-48 bg-gray-200 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"></div>
                        <div className="h-5 w-64 bg-gray-100 border-2 border-gray-300"></div>
                    </div>
                </div>

                {/* 2. Tabs Skeleton */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 w-32 bg-white border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]"></div>
                    ))}
                </div>

                {/* 3. Profile Card Skeleton */}
                <div className="bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-8">
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex-shrink-0 space-y-4">
                            <div className="w-32 h-32 rounded-full border-4 border-gray-900 bg-gray-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] mx-auto md:mx-0"></div>
                            <div className="h-10 w-32 bg-yellow-200 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mx-auto md:mx-0"></div>
                        </div>
                        <div className="flex-1 space-y-6">
                            <div className="space-y-2">
                                <div className="h-8 w-64 bg-gray-200 border-2 border-gray-900"></div>
                                <div className="h-20 w-full bg-gray-50 border-2 border-gray-300"></div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <div key={i} className="h-16 bg-gray-50 border-2 border-gray-300"></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Quota Card Skeleton */}
                <div className="h-32 bg-green-100 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"></div>
            </div>
        </div>
    )
}
