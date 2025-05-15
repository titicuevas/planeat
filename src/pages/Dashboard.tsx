import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'

interface Profile {
  id: string
  username?: string
  full_name?: string
  name?: string
  email?: string
  avatar_url?: string | null
}

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-8 px-4 flex flex-col items-center">
        <div className="w-full flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Bienvenido, {profile?.name || profile?.full_name || 'Usuario'}
          </h1>
          <button
            onClick={handleLogout}
            className="ml-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
        <p className="mt-2 text-gray-600 text-center">
          Esta es tu página de dashboard. Aquí podrás gestionar tus planes de alimentación.
        </p>
      </div>
    </div>
  )
} 