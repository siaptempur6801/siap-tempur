import { Skeleton } from '@/components/ui/LoadingState';
import { AdminDataTable } from './data-display/AdminDataTable';
export function AdminLoadingSkeleton({mode='table',label='Memuat halaman admin',metricsCount=4}:{mode?:'dashboard'|'table'|'workspace';label?:string;metricsCount?:number}) {
 return <div className="flex w-full flex-col gap-6 pb-10" role="status" aria-busy="true" aria-label={label}><span className="sr-only">{label}</span><Skeleton className="h-4 w-40"/><div className="flex flex-col gap-2"><Skeleton className="h-7 w-56"/><Skeleton className="h-4 w-full max-w-xl"/></div>{mode==='dashboard'&&metricsCount>0&&<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({length:Math.min(4,metricsCount)},(_,i)=><Skeleton key={i} className="h-24"/>)}</div>}<Skeleton className="h-9 w-full"/><div className="rounded-lg border border-border bg-card"><AdminDataTable caption={label} loading/></div></div>
}
