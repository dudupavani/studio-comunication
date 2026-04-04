"use server";

import { createServerClientWithCookies } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = createServerClientWithCookies(); // Use write-enabled client

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = createServerClientWithCookies(); // Use write-enabled client
  await supabase.auth.signOut();
  redirect("/login");
}

export async function sendPasswordResetEmail(formData: FormData) {
  const hdr = await headers();
  const origin = hdr.get("origin") || undefined;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    origin ||
    "http://localhost:3000";

  const email = formData.get("email") as string;
  const supabase = createServerClientWithCookies(); // Use write-enabled client

  const redirectTo = `${siteUrl.replace(/\/$/, "")}/auth/recovery`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function updatePassword(formData: FormData) {
  const password = formData.get("password") as string;
  const supabase = createServerClientWithCookies(); // Use write-enabled client

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect("/login");
}
