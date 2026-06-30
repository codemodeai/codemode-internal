'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CalendarDays,
  Settings,
  Activity,
  Webhook,
  MessageCircle,
  CheckSquare,
} from 'lucide-react'

const NAV = [
  { href: '/',         label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/funnels',  label: 'Funnels',       icon: Webhook },
  { href: '/leads',    label: 'Leads',         icon: Users },
  { href: '/inbox',    label: 'WhatsApp',      icon: MessageCircle },
  { href: '/clients',  label: 'Clients',       icon: Briefcase },
  { href: '/content',  label: 'Content',       icon: CalendarDays },
  { href: '/tasks',    label: 'Tasks & Ideas', icon: CheckSquare },
  { href: '/settings', label: 'Settings',      icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 flex-shrink-0 bg-cm-sidebar flex flex-col">
      {/* Logo */}
      <div className="px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cm-blue flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">CM</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">Code Mode</p>
            <p className="text-cm-steel text-xs leading-tight">Internal System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-cm-blue text-white shadow-sm'
                  : 'text-cm-steel hover:text-white hover:bg-white/8'
              }`}
            >
              <Icon size={17} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom status card */}
      <div className="px-3 pb-5">
        <div className="bg-cm-blue/15 border border-cm-blue/20 rounded-xl p-4">
          <div className="w-7 h-7 rounded-lg bg-cm-blue/20 flex items-center justify-center mb-3">
            <Activity size={14} className="text-cm-blue-dim" />
          </div>
          <p className="text-white text-xs font-semibold">All Systems Live</p>
          <p className="text-cm-steel text-xs mt-0.5">Webhooks active</p>
          <div className="flex items-center gap-1.5 mt-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-xs">Operational</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
