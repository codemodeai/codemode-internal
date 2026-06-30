'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

// Responsive shell: the sidebar is a static column on desktop (lg+) and a
// slide-in drawer on mobile, toggled by the hamburger in the TopBar.
export default function Shell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="flex h-screen bg-cm-bg overflow-hidden">
      {/* Mobile backdrop */}
      {navOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setNavOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar — drawer on mobile, static on desktop */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onNavigate={() => setNavOpen(false)} />
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <TopBar onMenu={() => setNavOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
