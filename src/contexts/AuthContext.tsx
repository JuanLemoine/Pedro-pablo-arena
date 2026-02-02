import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthUser {
  id: string;
  email: string;
  nombre: string;
  rol: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, nombre: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Obtener sesión inicial
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setIsLoading(false);
          return;
        }

        setSession(session);
        
        if (session?.user) {
          // Usar directamente los datos de auth
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            nombre: session.user.user_metadata?.nombre || session.user.email?.split('@')[0] || 'Usuario',
            rol: 'vendedor'
          });
        }
      } catch (error) {
        console.error('Error in initSession:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          nombre: session.user.user_metadata?.nombre || session.user.email?.split('@')[0] || 'Usuario',
          rol: 'vendedor'
        });
      } else {
        setUser(null);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (error.message === 'Invalid login credentials') {
          return { success: false, error: 'Email o contraseña incorrectos' };
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Error al iniciar sesión' };
    }
  };

  const register = async (email: string, password: string, nombre: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nombre }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          return { success: false, error: 'Este email ya está registrado' };
        }
        return { success: false, error: error.message };
      }

      // Verificar si necesita confirmación de email
      if (data.user && !data.session) {
        return { success: true, error: 'Revisa tu email para confirmar la cuenta' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Error al registrar usuario' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
