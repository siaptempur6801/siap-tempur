import { createClient } from "@/lib/utils/supabase/server";
import SeoNavbarClient from "@/components/SeoNavbarClient";

export default async function SeoNavbar() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    return <SeoNavbarClient isAuthenticated={Boolean(user)} />;
}
