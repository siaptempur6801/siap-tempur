'use client'
import { adminHref } from '@/lib/admin-routes'
import { X } from 'lucide-react'
import { usePathname,useRouter } from 'next/navigation'
import { useEffect,useRef,useState } from 'react'
import { adminInputClass } from './AdminUi'
export default function AdminSearchInput({name,value,placeholder}:{name:string;value:string;placeholder:string}) {
 const [query,setQuery]=useState(value);const timer=useRef<ReturnType<typeof setTimeout>|null>(null);const input=useRef<HTMLInputElement>(null);const router=useRouter();const pathname=usePathname()
 const [previous,setPrevious]=useState(value);if(previous!==value){setPrevious(value);setQuery(value)}
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[])
 function update(text:string) {setQuery(text);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>{const form=input.current?.form;if(!form)return;const params=new URLSearchParams();for(const [key,val] of new FormData(form))if(typeof val==='string'&&val&&!['page','participant_page','question_page','selector_page'].includes(key))params.set(key,val);if(text)params.set(name,text);else params.delete(name);router.replace(adminHref(`${pathname}?${params}`),{scroll:false})},450)}
 return <><input ref={input} className={`${adminInputClass} pl-9 pr-9`} name={name} value={query} placeholder={placeholder} aria-label={placeholder} onChange={e=>update(e.target.value)}/>{query && <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 focus-visible:outline" type="button" aria-label="Hapus pencarian" onClick={()=>{update('');input.current?.focus()}}><X size={16}/></button>}</>
}
