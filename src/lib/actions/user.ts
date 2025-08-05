'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Profile } from '../types'

export async function updateUserProfile(formData: FormData) {
  const supabase = createClient()
  const name = formData.get('name') as string
  const email = formData.get('email') as string | null
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in to update your profile.' }
  }

  const updateData: {data: {name: string}, email?: string} = {
    data: { name }
  }
  
  if (email) {
    updateData.email = email
  }

  const { error } = await supabase.auth.updateUser(updateData)

  if (error) {
    return { error: error.message }
  }
  
  revalidatePath('/profile')
  return { error: null }
}

async function getAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function checkAdminRole() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') {
    throw new Error('Not authorized')
  }
  return user
}

export async function getUsers(): Promise<Profile[]> {
  await checkAdminRole()
  const supabaseAdmin = await getAdminClient()
  
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()

  if (error) {
    console.error('Error fetching users:', error)
    return []
  }

  return users.map(user => ({
    id: user.id,
    email: user.email,
    name: user.user_metadata.name || 'No name',
    role: user.user_metadata.role || 'user',
    created_at: user.created_at,
  }))
}

export async function getUserById(id: string): Promise<Profile | null> {
    await checkAdminRole();
    const supabaseAdmin = await getAdminClient();

    const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);

    if (error) {
        console.error('Error fetching user:', error);
        return null;
    }

    const user = data.user;
    return {
        id: user.id,
        email: user.email,
        name: user.user_metadata.name || 'No name',
        role: user.user_metadata.role || 'user',
        created_at: user.created_at,
    };
}


export async function updateUser(formData: FormData) {
  await checkAdminRole()
  const supabaseAdmin = await getAdminClient()
  
  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const role = formData.get('role') as 'admin' | 'user'

  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    user_metadata: { name, role },
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/users/${id}/edit`)
  return { error: null }
}


export async function deleteUser(userId: string) {
    await checkAdminRole();
    const supabaseAdmin = await getAdminClient();

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/admin');
    return { error: null };
}
