import PaperBackground from '@/components/PaperBackground'
import BeliPaketClient from '@/components/dashboard/BeliPaketClient'

export default function BeliPaketPage() {
    return (
        <div className="font-body w-full flex flex-col relative">
            <PaperBackground />
            <BeliPaketClient />
        </div>
    )
}
