import { Loader2 } from "lucide-react";
import PaperBackground from "@/components/PaperBackground";

export default function Loading() {
    return (
        <div className="w-full min-h-screen flex flex-col relative font-body">
            <PaperBackground />
            <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                <div className="animate-spin p-4 bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-full">
                    <Loader2 className="w-8 h-8 text-blue-600" />
                </div>
                <p className="mt-4 font-bold text-gray-600 animate-pulse">Memuat Profil...</p>
            </div>
        </div>
    )
}
