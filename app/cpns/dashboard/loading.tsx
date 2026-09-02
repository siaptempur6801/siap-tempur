export default function DashboardLoading() {
    return (
        <div className="st-product w-full space-y-8 font-body" aria-busy="true" aria-label="Memuat dashboard CPNS">
            <div className="animate-pulse space-y-8">
                <header className="max-w-3xl space-y-3">
                    <div className="h-7 w-36 border-2 border-[var(--st-ink)] bg-[var(--st-yellow)]" />
                    <div className="h-12 w-full max-w-2xl bg-gray-200" />
                    <div className="h-5 w-full max-w-xl bg-gray-100" />
                </header>

                <section className="grid gap-4 lg:grid-cols-[1.7fr_0.8fr]">
                    <div className="st-card-md min-h-56 bg-white p-6">
                        <div className="h-4 w-32 bg-blue-100" />
                        <div className="mt-5 h-8 w-3/4 bg-gray-200" />
                        <div className="mt-3 h-4 w-full bg-gray-100" />
                        <div className="mt-2 h-4 w-4/5 bg-gray-100" />
                        <div className="mt-6 h-12 w-44 border-2 border-[var(--st-ink)] bg-blue-200" />
                    </div>
                    <div className="st-card min-h-56 bg-white p-6">
                        <div className="h-4 w-24 bg-gray-100" />
                        <div className="mt-5 h-12 w-20 bg-gray-200" />
                        <div className="mt-3 h-4 w-28 bg-gray-100" />
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="h-8 w-56 bg-gray-200" />
                    <div className="grid gap-4 sm:grid-cols-3">
                        {[0, 1, 2].map((item) => (
                            <div key={item} className="st-card h-44 bg-white p-5">
                                <div className="h-10 w-10 border-2 border-[var(--st-ink)] bg-gray-100" />
                                <div className="mt-5 h-7 w-20 bg-gray-200" />
                                <div className="mt-3 h-3 w-full bg-gray-100" />
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    )
}
