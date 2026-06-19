import { permanentRedirect } from "next/navigation";

export default function EventRedirectPage() {
    permanentRedirect("/cpns#active-event");
}
