'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut, Menu } from 'lucide-react'

export default function TopBar({ onMenu }: { onMenu?: () => void }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-14 flex items-center justify-between px-4 sm:px-6 bg-cm-bg border-b border-cm-border flex-shrink-0">
      {/* Mobile hamburger + brand */}
      <div className="flex items-center gap-3 lg:hidden">
        <button
          onClick={onMenu}
          className="text-cm-muted hover:text-cm-text transition-colors -ml-1 p-1"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <span className="font-semibold text-sm text-cm-text">Code Mode</span>
      </div>

      {/* Spacer keeps sign-out right-aligned on desktop */}
      <div className="hidden lg:block" />

      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 text-cm-muted hover:text-cm-text text-sm transition-colors"
      >
        <LogOut size={14} />
        Sign out
      </button>
    </header>
  )
}
