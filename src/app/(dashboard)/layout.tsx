import Shell from '@/components/layout/Shell'

// Auth is enforced in middleware.ts — it validates the session and redirects
// unauthenticated users to /login before this layout ever renders. We
// deliberately do NOT call supabase.auth.getUser() again here; that was a
// second auth round-trip to Supabase on every single page navigation.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>
}
