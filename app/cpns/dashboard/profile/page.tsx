import AccountProfilePage from '@/components/profile/AccountProfilePage'

export default function ProfilePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    return <AccountProfilePage searchParams={searchParams} />
}
