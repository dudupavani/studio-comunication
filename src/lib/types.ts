export type Profile = {
  id: string
  email: string | undefined
  name: string | null
  role: 'admin' | 'user'
  created_at: string
}
