import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { UserNav } from './user-nav'
import { Button } from './ui/button'
import { Mountain } from 'lucide-react'

export async function Header() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAdmin = user?.user_metadata?.role === 'admin'

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex items-center h-16 max-w-screen-2xl">
        <Link href="/" className="flex items-center mr-6 font-bold">
          <Mountain className="w-6 h-6 mr-2" />
          <span className="font-headline">Profile Forge</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          {isAdmin && (
            <Link
              href="/admin"
              className="font-medium transition-colors text-foreground/60 hover:text-foreground/80"
            >
              Admin
            </Link>
          )}
        </nav>
        <div className="flex items-center justify-end flex-1">
          {user ? (
            <UserNav user={user} />
          ) : (
            <Button asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
