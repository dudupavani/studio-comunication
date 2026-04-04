import { createServerClientWithCookies } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const typeParam = searchParams.get('type')
  const accessToken = searchParams.get('access_token')
  const refreshToken = searchParams.get('refresh_token')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'
  const safeNext = next.startsWith('/') ? next : '/'
  const isPasswordRecovery = typeParam === 'recovery' || typeParam === 'password'
  const recoveryTarget = `${origin}/reset-password`
  const defaultTarget = `${origin}${safeNext}`

  const getOtpType = () => {
    if (typeParam === 'recovery') return 'recovery'
    if (typeParam === 'signup') return 'signup'
    if (typeParam === 'magiclink') return 'magiclink'
    if (typeParam === 'invite') return 'invite'
    if (typeParam === 'email_change') return 'email_change'
    return 'email'
  }

  if (code) {
    const supabase = createServerClientWithCookies() // Use write-enabled client
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (isPasswordRecovery) {
        return NextResponse.redirect(recoveryTarget)
      }
      return NextResponse.redirect(defaultTarget)
    }
  }

  if (tokenHash) {
    const supabase = createServerClientWithCookies()
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: getOtpType(),
    })
    if (!error) {
      if (isPasswordRecovery) {
        return NextResponse.redirect(recoveryTarget)
      }
      return NextResponse.redirect(defaultTarget)
    }
  }

  if (accessToken && refreshToken) {
    const supabase = createServerClientWithCookies()
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    if (!error) {
      if (isPasswordRecovery) {
        return NextResponse.redirect(recoveryTarget)
      }
      return NextResponse.redirect(defaultTarget)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?message=Could not authenticate user`)
}
