import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { router } from 'expo-router';

import { Controller, useForm } from 'react-hook-form';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';

type AuthMode = 'signIn' | 'signUp';

type FormData = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type RegisterInput = {
  apellido: string;
  correo: string;
  nombre: string;
  password: string;
  telefono: string;
};

export function AuthScreen() {
  const { signIn } = useAuth();

  const [mode, setMode] =
    useState<AuthMode>('signIn');

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const isSignIn = mode === 'signIn';

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password');

  const submit = async (formData: FormData) => {
    setIsSubmitting(true);

    try {
      const email =
        formData.email.trim().toLowerCase();

      // LOGIN
      if (isSignIn) {
        const result = await signIn(
          email,
          formData.password,
        );

        // por si tu signIn devuelve error
        if ((result as any)?.error) {
          throw new Error(
            (result as any).error.message,
          );
        }

        router.replace('/home');
      }

      // REGISTRO
      else {
        await handleRegister({
          nombre:
            formData.firstName.trim(),
          apellido:
            formData.lastName.trim(),
          correo: email,
          password: formData.password,
          telefono:
            formData.phone.trim(),
        });

        Alert.alert(
          'Registro exitoso',
          'Tu cuenta fue creada correctamente.',
        );

        setMode('signIn');

        reset();
      }
    } catch (error) {
      console.log(
        'ERROR COMPLETO:',
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : 'Ocurrió un error';

      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.select({
          ios: 'padding',
          default: undefined,
        })}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title">
              Gastro-Map
            </ThemedText>

            <ThemedText style={styles.subtitle}>
              {isSignIn
                ? 'Inicia sesión para continuar.'
                : 'Registra tu cuenta'}
            </ThemedText>
          </View>

          <View style={styles.form}>
            {/* NOMBRE */}
            {!isSignIn && (
              <>
                <Controller
                  control={control}
                  name="firstName"
                  rules={{
                    required:
                      'El nombre es obligatorio',
                    pattern: {
                      value:
                        /^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+$/,
                      message:
                        'Solo se permiten letras',
                    },
                  }}
                  render={({
                    field: {
                      onChange,
                      value,
                    },
                  }) => (
                    <TextInput
                      placeholder="Nombre"
                      placeholderTextColor="#9CA3AF"
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                    />
                  )}
                />

                {errors.firstName && (
                  <ThemedText
                    style={styles.error}
                  >
                    {
                      errors.firstName
                        .message
                    }
                  </ThemedText>
                )}

                {/* APELLIDO */}
                <Controller
                  control={control}
                  name="lastName"
                  rules={{
                    required:
                      'El apellido es obligatorio',
                    pattern: {
                      value:
                        /^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+$/,
                      message:
                        'Solo se permiten letras',
                    },
                  }}
                  render={({
                    field: {
                      onChange,
                      value,
                    },
                  }) => (
                    <TextInput
                      placeholder="Apellido"
                      placeholderTextColor="#9CA3AF"
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                    />
                  )}
                />

                {errors.lastName && (
                  <ThemedText
                    style={styles.error}
                  >
                    {
                      errors.lastName
                        .message
                    }
                  </ThemedText>
                )}
              </>
            )}

            {/* EMAIL */}
            <Controller
              control={control}
              name="email"
              rules={{
                required:
                  'El correo es obligatorio',
                pattern: {
                  value:
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message:
                    'Correo electrónico inválido',
                },
              }}
              render={({
                field: { onChange, value },
              }) => (
                <TextInput
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />

            {errors.email && (
              <ThemedText style={styles.error}>
                {errors.email.message}
              </ThemedText>
            )}

            {/* PASSWORD */}
            <Controller
              control={control}
              name="password"
              rules={{
                required:
                  'La contraseña es obligatoria',
                minLength: {
                  value: 6,
                  message:
                    'Mínimo 6 caracteres',
                },
              }}
              render={({
                field: { onChange, value },
              }) => (
                <TextInput
                  secureTextEntry
                  placeholder="Contraseña"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />

            {errors.password && (
              <ThemedText style={styles.error}>
                {errors.password.message}
              </ThemedText>
            )}

            {/* CONFIRM PASSWORD */}
            {!isSignIn && (
              <>
                <Controller
                  control={control}
                  name="confirmPassword"
                  rules={{
                    required:
                      'Confirma tu contraseña',
                    validate: value =>
                      value ===
                        passwordValue ||
                      'Las contraseñas no coinciden',
                  }}
                  render={({
                    field: {
                      onChange,
                      value,
                    },
                  }) => (
                    <TextInput
                      secureTextEntry
                      placeholder="Confirmar contraseña"
                      placeholderTextColor="#9CA3AF"
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                    />
                  )}
                />

                {errors.confirmPassword && (
                  <ThemedText
                    style={styles.error}
                  >
                    {
                      errors
                        .confirmPassword
                        .message
                    }
                  </ThemedText>
                )}
              </>
            )}

            {/* TELEFONO */}
            {!isSignIn && (
              <>
                <Controller
                  control={control}
                  name="phone"
                  rules={{
                    required:
                      'El teléfono es obligatorio',
                    pattern: {
                      value: /^[0-9]+$/,
                      message:
                        'Solo se permiten números',
                    },
                    minLength: {
                      value: 10,
                      message:
                        'Debe tener 10 dígitos',
                    },
                  }}
                  render={({
                    field: {
                      onChange,
                      value,
                    },
                  }) => (
                    <TextInput
                      keyboardType="numeric"
                      placeholder="Teléfono"
                      placeholderTextColor="#9CA3AF"
                      style={styles.input}
                      value={value}
                      onChangeText={text => {
                        const clean =
                          text.replace(
                            /[^0-9]/g,
                            '',
                          );

                        onChange(clean);
                      }}
                    />
                  )}
                />

                {errors.phone && (
                  <ThemedText
                    style={styles.error}
                  >
                    {errors.phone.message}
                  </ThemedText>
                )}
              </>
            )}

            {/* BOTON */}
            <Pressable
              disabled={isSubmitting}
              onPress={handleSubmit(submit)}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  opacity:
                    pressed ||
                    isSubmitting
                      ? 0.7
                      : 1,
                },
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <ThemedText
                  style={
                    styles.primaryButtonText
                  }
                >
                  {isSignIn
                    ? 'Iniciar sesión'
                    : 'Registrarme'}
                </ThemedText>
              )}
            </Pressable>

            {/* CAMBIAR MODO */}
            <Pressable
              onPress={() => {
                setMode(
                  isSignIn
                    ? 'signUp'
                    : 'signIn',
                );

                reset();
              }}
              style={styles.secondaryButton}
            >
              <ThemedText type="link">
                {isSignIn
                  ? 'Crear cuenta'
                  : 'Ya tengo cuenta'}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

async function handleRegister({
  apellido,
  correo,
  nombre,
  password,
  telefono,
}: RegisterInput) {
  console.log(
    'INICIANDO REGISTRO...',
  );

  // CREAR USUARIO EN AUTH
  const { data, error } =
    await supabase.auth.signUp({
      email: correo,
      password,
    });

  console.log(
    'RESPUESTA AUTH:',
    data,
  );

  if (error) {
    console.log(
      'ERROR AUTH:',
      error,
    );

    throw new Error(error.message);
  }

  const userId = data.user?.id;

  if (!userId) {
    throw new Error(
      'No se pudo obtener el ID del usuario',
    );
  }

  console.log('USER ID:', userId);

  // INSERTAR PERFIL
  const { error: profileError } =
    await supabase
      .from('usuarios')
      .insert({
        id: userId,
        nombre,
        apellido,
        correo,
        telefono,
        password,
      });

  console.log(
    'ERROR PERFIL:',
    profileError,
  );

  if (profileError) {
    throw new Error(
      profileError.message,
    );
  }

  console.log(
    'REGISTRO COMPLETADO',
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  keyboardView: {
    flex: 1,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },

  header: {
    marginBottom: 24,
    gap: 10,
  },

  subtitle: {
    fontSize: 16,
  },

  form: {
    gap: 12,
  },

  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    minHeight: 52,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#11181C',
  },

  error: {
    color: '#DC2626',
    fontSize: 14,
  },

  primaryButton: {
    backgroundColor: '#0A7EA4',
    minHeight: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  secondaryButton: {
    alignItems: 'center',
    marginTop: 12,
  },
});