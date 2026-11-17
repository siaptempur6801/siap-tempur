'use client'
import { AdminPage,AdminPageHeader,adminSecondaryButtonClass } from '@/components/admin/AdminUi'
import { AdminErrorState } from '@/components/admin/feedback/AdminErrorState'
import Link from '@/components/admin/navigation/AdminLink'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
export default function AdminError({error,reset}:{error:Error&{digest?:string};reset:()=>void}) {
 const path=usePathname()
 useEffect(()=>{console.error('[admin] halaman gagal dirender',error)},[error])
 const noun=path.includes('/events')?'Event':path.includes('/exams')?'Assessment':path.includes('/questions')?'Question Bank':path.includes('/review')?'Review':path.includes('/organizations')?'Instansi':path.includes('/monitoring')?'Monitoring':path.includes('/results')?'hasil':path.includes('/commerce/products')?'Products':path.includes('/commerce')?'Orders':path.includes('/users')?'Users':path.includes('/audit')?'Audit Log':path.includes('/settings')?'Settings':'Dashboard'
 return <AdminPage><AdminPageHeader title={noun}/><AdminErrorState noun={noun} action={<button type="button" onClick={reset} className={adminSecondaryButtonClass}>Coba Lagi</button>}/><Link href="/admin" className={adminSecondaryButtonClass}>Kembali ke Dashboard</Link>{error.digest&&<p className="text-xs text-muted-foreground">Referensi: {error.digest}</p>}</AdminPage>
}
