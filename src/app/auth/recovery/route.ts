import { createServerClientWithCookies } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  if (code) {
    const supabase = createServerClientWithCookies()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}/reset-password`)
    }
  }

  if (tokenHash && type === 'recovery') {
    const supabase = createServerClientWithCookies()
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    })
    if (!error) {
      return NextResponse.redirect(`${origin}/reset-password`)
    }
  }

  return NextResponse.redirect(`${origin}/login?message=Link inválido ou expirado`)
}
