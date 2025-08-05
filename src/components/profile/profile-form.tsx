'use client'

import type { User } from '@supabase/supabase-js'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { updateUserProfile } from '@/lib/actions/user'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

const formSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  email: z.string().email(),
})

export function ProfileForm({ user }: { user: User }) {
  const { toast } = useToast()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user.user_metadata.name || '',
      email: user.email || '',
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const formData = new FormData()
    formData.append('name', values.name)
    
    // Only append email if it has changed
    if(values.email !== user.email) {
      formData.append('email', values.email)
    }

    const { error } = await updateUserProfile(formData)

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error updating profile',
        description: error,
      })
    } else {
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || !form.formState.isDirty}
              >
                {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
