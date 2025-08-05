'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/profile')
}

export async function signUp(formData: FormData) {
  const origin = headers().get('origin')
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        name: name,
        role: 'user', // Default role
      },
    },
  })

  if (error) {
    return { error: error.message, data: {} }
  }

  // Manually update user metadata because of a known Supabase issue
  // where data on signup is not always persisted.
  if (data.user) {
    const { error: updateError } = await supabase.auth.updateUser({
        data: {
            name: name,
            role: 'user'
        }
    })
    if (updateError) {
        // Log the error but don't block the user flow
        console.error("Error updating user metadata:", updateError.message)
    }
  }


  return { error: null, data };
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}


export async function sendPasswordResetEmail(formData: FormData) {
  const origin = headers().get('origin')
  const email = formData.get('email') as string
  const supabase = createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?type=password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string
  const supabase = createClient()

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: error.message }
  }
  
  redirect('/profile')
}
