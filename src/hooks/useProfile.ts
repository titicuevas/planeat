import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from '../types/dashboard';

export function useProfile(session: Session | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function getProfile() {
      setLoading(true);
      try {
        const user = session?.user;
        if (!user) {
          navigate('/login', { replace: true });
          setLoading(false);
          return;
        }

        let { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([{
              id: user.id,
              name: user.user_metadata?.name || '',
              email: user.email
            }]);
          if (insertError) throw insertError;
          const { data: newProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          profileData = newProfile;
        } else if (error) {
          throw error;
        }

        if (!profileData) {
          setProfile({ id: user.id, name: '', goal: null, intolerances: null });
          setProfileLoaded(true);
          setLoading(false);
          navigate('/perfil', { replace: true });
          return;
        }

        setProfile(profileData);
        setProfileLoaded(true);
      } catch (err: any) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    }

    getProfile();
  }, [session, navigate]);

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile?.id);
      
      if (error) throw error;
      
      setProfile(prev => prev ? { ...prev, ...updates } : prev);
      return true;
    } catch (err: any) {
      console.error('Error updating profile:', err);
      return false;
    }
  };

  return {
    profile,
    loading,
    profileLoaded,
    updateProfile
  };
} 