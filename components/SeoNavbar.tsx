import { createClient } from "@/lib/utils/supabase/server";
import SeoNavbarClient from "@/components/SeoNavbarClient";

export default async function SeoNavbar({
    navItems,
}: {
    /** Item navigasi khusus halaman ini (mis. anchor section halaman blog). */
    navItems?: readonly { href: string; label: string }[];
} = {}) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    return <SeoNavbarClient isAuthenticated={Boolean(user)} navItems={navItems} />;
}
