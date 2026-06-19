'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function TopBar() {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-14 flex items-center justify-end px-6 bg-cm-bg border-b border-cm-border flex-shrink-0">
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
