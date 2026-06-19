import { NextResponse } from 'next/server'

export function validateHookSecret(req: Request): NextResponse | null {
  const secret = req.headers.get('x-hook-secret')
  if (!secret || secret !== process.env.HOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
