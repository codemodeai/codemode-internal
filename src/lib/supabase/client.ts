'use client'

import { createBrowserClient } from '@supabase/ssr'

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()

export function createClient() {
  return createBrowserClient(
    clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  )
}
