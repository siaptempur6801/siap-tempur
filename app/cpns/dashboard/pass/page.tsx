import { redirect } from 'next/navigation'

export default function LegacyAccessRoute(): never {
  redirect('/cpns/dashboard')
}
