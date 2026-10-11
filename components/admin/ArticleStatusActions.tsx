'use client'

import {
  archiveArticle,
  deleteArticle,
  publishArticle,
  unpublishArticle,
} from '@/app/actions/articles'
import { adminDangerButtonClass, adminTableIconActionClass } from '@/components/admin/AdminUi'
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog'
import Link from '@/components/admin/navigation/AdminLink'
import { Archive, Ellipsis, Eye, EyeOff, Send, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { toast } from 'sonner'
import { useTransition } from 'react'

const menuActionClass =
  'flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
const menuDangerActionClass = `${menuActionClass} text-danger hover:bg-danger-muted`

interface ArticleStatusActionsProps {
  articleId: string
  title: string
  previewHref?: string
  status: 'draft' | 'published' | 'archived'
  canPublish: boolean
  canArchive: boolean
  canDelete: boolean
}

type ConfirmAction = 'archive' | 'delete'

export default function ArticleStatusActions({
  articleId,
  title,
  previewHref,
  status,
  canPublish,
  canArchive,
  canDelete,
}: ArticleStatusActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !menuRef.current) return
    const triggerRect = triggerRef.current.getBoundingClientRect()
    const menuRect = menuRef.current.getBoundingClientRect()
    const margin = 8
    const top =
      triggerRect.bottom + menuRect.height <= window.innerHeight - margin
        ? triggerRect.bottom + 4
        : Math.max(margin, triggerRect.top - menuRect.height - 4)
    const left = Math.max(
      margin,
      Math.min(triggerRect.right - menuRect.width, window.innerWidth - menuRect.width - margin),
    )
    setPosition({ top, left })
    menuRef.current.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (
        !(target instanceof Node) ||
        menuRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      )
        return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
        return
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      const items = Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
      )
      if (!items.length) return
      event.preventDefault()
      const current = items.indexOf(document.activeElement as HTMLElement)
      const delta = event.key === 'ArrowDown' ? 1 : -1
      items[(current + delta + items.length) % items.length]?.focus()
    }
    const onScroll = () => setOpen(false)
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  const hasActions =
    Boolean(previewHref) ||
    (canPublish && status !== 'published' && status !== 'archived') ||
    (canPublish && status === 'published') ||
    (canArchive && status !== 'archived') ||
    (canDelete && status !== 'published')

  if (!hasActions) return null

  function runAction(action: () => Promise<{ success: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action()
      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  async function requestConfirmation(action: ConfirmAction) {
    setOpen(false)
    triggerRef.current?.focus()
    setConfirmAction(action)
  }

  function confirmMessage() {
    if (confirmAction === 'archive') {
      return {
        title: 'Konfirmasi arsipkan artikel',
        message: 'Arsipkan artikel ini?',
        detail:
          'Artikel tidak lagi tampil di blog publik, tetapi isinya tetap tersimpan dan bisa dipublikasikan kembali.',
        label: 'Arsipkan',
      }
    }
    return {
      title: 'Konfirmasi hapus artikel',
      message: 'Hapus permanen artikel ini?',
      detail: 'Artikel yang dihapus tidak bisa dikembalikan dari panel ini.',
      label: 'Hapus permanen',
    }
  }

  function confirmSelectedAction() {
    const action = confirmAction
    setConfirmAction(null)
    triggerRef.current?.focus()
    if (action === 'archive') runAction(() => archiveArticle(articleId))
    if (action === 'delete') runAction(() => deleteArticle(articleId))
  }

  function cancelConfirmation() {
    setConfirmAction(null)
    triggerRef.current?.focus()
  }

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Tab') {
      event.preventDefault()
      setOpen(false)
      const focusable = Array.from(
        document.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null && !menuRef.current?.contains(element))
      const triggerIndex = focusable.indexOf(triggerRef.current as HTMLElement)
      const nextIndex = triggerIndex + (event.shiftKey ? -1 : 1)
      const nextElement = focusable[nextIndex] ?? triggerRef.current
      nextElement?.focus()
    }
  }

  const confirmation = confirmAction ? confirmMessage() : null
  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Aksi artikel ${title}`}
          onKeyDown={handleMenuKeyDown}
          style={{
            top: position?.top ?? 0,
            left: position?.left ?? 0,
            visibility: position ? 'visible' : 'hidden',
          }}
          className="fixed z-[60] max-h-[calc(100dvh-1rem)] min-w-48 overflow-y-auto rounded-lg border border-border bg-card p-1.5 shadow-xl"
        >
          {previewHref ? (
            <Link
              href={previewHref}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                triggerRef.current?.focus()
              }}
              className={menuActionClass}
            >
              <Eye size={15} aria-hidden="true" />
              Lihat artikel
            </Link>
          ) : null}
          {canPublish && status !== 'published' && status !== 'archived' ? (
            <button
              type="button"
              role="menuitem"
              disabled={isPending}
              onClick={() => {
                setOpen(false)
                triggerRef.current?.focus()
                runAction(() => publishArticle(articleId))
              }}
              className={menuActionClass}
            >
              <Send size={15} aria-hidden="true" />
              Terbitkan
            </button>
          ) : null}
          {canPublish && status === 'published' ? (
            <button
              type="button"
              role="menuitem"
              disabled={isPending}
              onClick={() => {
                setOpen(false)
                triggerRef.current?.focus()
                runAction(() => unpublishArticle(articleId))
              }}
              className={menuActionClass}
            >
              <EyeOff size={15} aria-hidden="true" />
              Tarik dari terbit
            </button>
          ) : null}
          {canArchive && status !== 'archived' ? (
            <button
              type="button"
              role="menuitem"
              disabled={isPending}
              onClick={() => void requestConfirmation('archive')}
              className={menuDangerActionClass}
            >
              <Archive size={15} aria-hidden="true" />
              Arsipkan
            </button>
          ) : null}
          {canDelete && status !== 'published' ? (
            <button
              type="button"
              role="menuitem"
              disabled={isPending}
              onClick={() => void requestConfirmation('delete')}
              className={menuDangerActionClass}
            >
              <Trash2 size={15} aria-hidden="true" />
              Hapus permanen
            </button>
          ) : null}
        </div>,
        document.body,
      )
    : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Aksi artikel ${title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setPosition(null)
          setOpen((current) => !current)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setPosition(null)
            setOpen(true)
          }
        }}
        className={adminTableIconActionClass}
      >
        <Ellipsis size={18} aria-hidden="true" />
      </button>
      {menu}
      {confirmation
        ? createPortal(
            <div className="contents">
              <AdminConfirmDialog
                open
                title={confirmation.title}
                message={confirmation.message}
                detail={confirmation.detail}
                onCancel={cancelConfirmation}
              >
                <button
                  type="button"
                  onClick={cancelConfirmation}
                  className="admin-action inline-flex min-h-8 items-center justify-center rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Batal
                </button>
                <button
                  type="button"
                  data-autofocus
                  onClick={confirmSelectedAction}
                  className={adminDangerButtonClass}
                >
                  {confirmation.label}
                </button>
              </AdminConfirmDialog>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
