import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
        // The password reset flow needs a redirect to a specific page.
        // The type 'password' is used by Supabase for this purpose.
        const type = searchParams.get('type');
        if (type === 'password') {
            return NextResponse.redirect(`${origin}/reset-password`);
        }
        return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?message=Could not authenticate user`)
}
