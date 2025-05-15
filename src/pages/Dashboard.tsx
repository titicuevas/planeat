import { useEffect, useState } from 'react'
import { supabase } from '../config/supabase'

interface Profile {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
}

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function getProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) throw new Error('No user found')

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) throw error
        setProfile(data)
      } catch (error) {
        console.error('Error loading profile:', error)
      } finally {
        setLoading(false)
      }
    }

    getProfile()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900">
            Bienvenido, {profile?.full_name || 'Usuario'}
          </h1>
          <p className="mt-2 text-gray-600">
            Esta es tu página de dashboard. Aquí podrás gestionar tus planes de alimentación.
          </p>
        </div>
      </div>
    </div>
  )
} 