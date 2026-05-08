import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

export type SignUpProfile = {
  nombre: string;
  apellido: string;
  telefono?: string;
};

type AuthContextValue = {
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, profile: SignUpProfile) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      session,
      user: session?.user ?? null,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          throw formatAuthError(error);
        }
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();

        if (error) {
          throw error;
        }
      },
      signUp: async (email, password, profile) => {
        const { data: existingUser, error: existingUserError } = await supabase
          .from('usuarios')
          .select('id')
          .eq('correo', email)
          .maybeSingle();

        if (existingUserError) {
          throw existingUserError;
        }

        if (existingUser) {
          throw new Error('Este correo ya esta registrado. Usa la pantalla de Login.');
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              apellido: profile.apellido,
              nombre: profile.nombre,
              telefono: profile.telefono ?? null,
            },
          },
        });

        if (error) {
          if (error.message.toLowerCase().includes('rate limit')) {
            throw new Error(
              'Supabase alcanzo el limite de correos. Espera unos minutos o inicia sesion si la cuenta ya fue creada.',
            );
          }

          throw error;
        }

        if (!data.user) {
          throw new Error('No se pudo crear el usuario.');
        }

        if (data.user.identities?.length === 0) {
          throw new Error('Este correo ya esta registrado. Usa la pantalla de Login.');
        }

        const { error: profileError } = await supabase.from('usuarios').insert({
          apellido: profile.apellido,
          correo: email,
          id: data.user.id,
          nombre: profile.nombre,
          password,
          telefono: profile.telefono || null,
        });

        if (profileError) {
          throw profileError;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

        if (signInError) {
          throw formatAuthError(signInError);
        }
      },
    }),
    [isLoading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return value;
}

function formatAuthError(error: Error) {
  const message = error.message.toLowerCase();

  if (message.includes('invalid login credentials')) {
    return new Error('Correo o contrasena incorrectos. Si acabas de registrarte, usa Login con ese mismo correo.');
  }

  if (message.includes('rate limit')) {
    return new Error('Supabase alcanzo el limite de intentos. Espera unos minutos antes de volver a probar.');
  }

  return error;
}
