import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div
          className="absolute w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10"
          aria-hidden="true"
        ></div>
      </div>
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 font-medium border rounded-full">
          <LockKeyhole className="w-4 h-4" />
          <span>Secure Authentication by Supabase</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl font-headline">
          Welcome to Profile Forge
        </h1>
        <p className="max-w-2xl mx-auto mt-6 text-lg text-muted-foreground">
          Your all-in-one solution for seamless user authentication and profile management.
          Built with Next.js for performance and security.
        </p>
        <div className="flex flex-col justify-center gap-4 mt-8 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/signup">
              Get Started <ArrowRight className="ml-2" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
