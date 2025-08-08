import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function ResetPasswordPage() {
    const supabase = createClient()
    const { data: { session }} = await supabase.auth.getSession();

    if (!session) {
        redirect('/login')
    }

    return (
        <div className="container flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Suspense>
            <ResetPasswordForm />
          </Suspense>
        </div>
    )
}
