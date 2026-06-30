import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'

// Auth is enforced in middleware.ts — it validates the session and redirects
// unauthenticated users to /login before this layout ever renders. We
// deliberately do NOT call supabase.auth.getUser() again here; that was a
// second auth round-trip to Supabase on every single page navigation.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-cm-bg overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
