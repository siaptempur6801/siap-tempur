'use client'

import { useState, useRef, useEffect, useId } from 'react'
import SignoutConfirmation from './SignoutConfirmation'
import { BarChart3, Clock3, Compass, Library, LogOut, Sparkles, User, Ticket } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import TempurPassIndicator from '@/components/dashboard/TempurPassIndicator'

interface MobileProfileDropdownProps {
  user: {
    email?: string
    user_metadata?: {
      full_name?: string
      name?: string
    }
  }
  profile: {
    avatar_url?: string
    full_name?: string
  } | null
  tokenBalance: number
  hasActiveTempurPass: boolean

  signoutAction: (redirectTo?: string) => Promise<{ success: boolean }>
  signoutRedirectTo?: string
}

export default function MobileProfileDropdown({
  user,
  profile,
  tokenBalance,
  hasActiveTempurPass,
  signoutAction,
  signoutRedirectTo = '/',
}: MobileProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const contentId = useId()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const displayName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    'Pejuang Tryout'
  const avatarUrl = profile?.avatar_url

  return (
    <div
      className="relative"
      ref={dropdownRef}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !isOpen) return
        event.preventDefault()
        setIsOpen(false)
        triggerRef.current?.focus()
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false)
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-controls={isOpen ? contentId : undefined}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Tutup menu profil' : 'Buka menu profil'}
        aria-expanded={isOpen}
        className="st-focus relative size-11 rounded-xl border border-border bg-white flex items-center justify-center overflow-hidden transition-colors hover:bg-muted"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt="Foto profil"
            fill
            priority
            className="object-cover"
            sizes="40px"
          />
        ) : (
          <span className="text-sm font-semibold font-body text-foreground">
            {user.email?.[0]?.toUpperCase() || '?'}
          </span>
        )}
      </button>

      {isOpen && (
        <nav
          id={contentId}
          aria-label="Menu profil"
          className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-border bg-white shadow-lg z-50 overflow-hidden font-body"
        >
          <div className="p-4 border-b border-border bg-muted/50">
            <p className="font-semibold text-sm truncate text-foreground">{displayName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground truncate">{user.email}</p>

            <div className="mt-2.5 flex items-center gap-2">
              <span className="text-xs px-2 py-1 font-medium inline-flex items-center gap-1 rounded-md border border-info-border bg-info-muted text-info-foreground">
                <Ticket size={12} className="fill-current" />
                {tokenBalance} Token
              </span>
              {hasActiveTempurPass && (
                <TempurPassIndicator
                  href="/cpns/dashboard/pass"
                  label="Tempur Pass CPNS aktif"
                  compact
                />
              )}
            </div>
          </div>

          <div className="p-2 relative z-10">
            <Link
              href="/cpns/dashboard/materi"
              className="st-focus flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Library size={18} />
              Kisi-Kisi
            </Link>

            <Link
              href="/cpns/dashboard/riwayat"
              className="st-focus flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Clock3 size={18} />
              Hasil
            </Link>

            <Link
              href="/cpns/dashboard/ranking"
              className="st-focus flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <BarChart3 size={18} />
              Ranking Nasional
            </Link>

            <Link
              href="/cpns/dashboard/pilih-jalur"
              className="st-focus flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Compass size={18} />
              Pilih Jalur
            </Link>

            <Link
              href="/cpns/dashboard/pass"
              className="st-focus flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Sparkles size={18} />
              Tempur Pass CPNS
            </Link>

            <Link
              href="/cpns/dashboard/profile"
              className="st-focus flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <User size={18} />
              Profil Saya
            </Link>

            <button
              onClick={() => {
                setIsOpen(false)
                setShowModal(true)
              }}
              type="button"
              className="st-focus flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-danger hover:bg-danger-muted transition-colors"
            >
              <LogOut size={18} />
              Keluar
            </button>
          </div>
        </nav>
      )}

      <SignoutConfirmation
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        signoutAction={signoutAction}
        redirectTo={signoutRedirectTo}
        returnFocusRef={triggerRef}
      />
    </div>
  )
}
