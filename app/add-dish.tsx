import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';

import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { insertDish } from '@/lib/dish-service';
import { supabase } from '@/lib/supabase';

const AnimatedPressable =
  Animated.createAnimatedComponent(Pressable);

type SaveDishInput = {
  name: string;
  photoUri: string;
};

export default function AddDishScreen() {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const scale = useSharedValue(1);

  const saveDishMutation = useMutation({
    mutationFn: saveDish,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['dishes'],
      });

      router.replace('/home');
    },

    onError: (error) => {
      console.log('SAVE ERROR:', error);

      Alert.alert(
        'Error',
        getSaveErrorMessage(error)
      );
    },
  });

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const chooseImageSource = () => {
    Alert.alert(
      'Foto del plato',
      'Elige una fuente para la imagen.',
      [
        {
          text: 'Camara',
          onPress: takePhoto,
        },
        {
          text: 'Galeria',
          onPress: pickImage,
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  const pickImage = async () => {
    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permission =
      await ImagePicker.requestCameraPermissionsAsync();

    if (permission.status !== 'granted') {
      Alert.alert(
        'Permiso denegado',
        'Se necesita permiso para usar la camara.'
      );

      return;
    }

    const result =
      await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      Alert.alert(
        'Campo requerido',
        'Escribe el nombre del plato.'
      );

      return;
    }

    if (!photoUri) {
      Alert.alert(
        'Campo requerido',
        'Selecciona una foto del plato.'
      );

      return;
    }

    saveDishMutation.mutate({
      name: trimmedName,
      photoUri,
    });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Nuevo plato',
        }}
      />

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>
          Nombre del plato
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Ej: Ceviche"
          placeholderTextColor="#737373"
          value={name}
          onChangeText={setName}
        />
      </View>

      <Pressable
        style={styles.photoButton}
        onPress={chooseImageSource}
      >
        <Text style={styles.photoButtonText}>
          Elegir foto
        </Text>
      </Pressable>

      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={styles.preview}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Sin foto seleccionada
          </Text>
        </View>
      )}

      <Text style={styles.helperText}>
        La ubicacion se capturara automaticamente
        al registrar.
      </Text>

      <AnimatedPressable
        disabled={saveDishMutation.isPending}
        onPress={handleSave}
        onPressIn={() => {
          scale.value = withSpring(0.96);
        }}
        onPressOut={() => {
          scale.value = withSpring(1);
        }}
        style={[
          styles.saveButton,
          buttonStyle,
          saveDishMutation.isPending
            ? styles.disabled
            : undefined,
        ]}
      >
        {saveDishMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveText}>
            Registrar
          </Text>
        )}
      </AnimatedPressable>
    </View>
  );
}

async function saveDish({
  name,
  photoUri,
}: SaveDishInput) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error(
      'Inicia sesion para registrar platos.'
    );
  }

  const location =
    await getCurrentLocation();

  const photoUrl =
    await uploadDishPhoto(
      photoUri,
      user.id
    );

  return insertDish({
    city: location.city,
    country: location.country,
    latitude: location.latitude,
    longitude: location.longitude,
    name,
    photo_uri: photoUrl,
    user_id: user.id,
  });
}

async function getCurrentLocation() {
  const { status } =
    await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    throw new Error(
      'No se puede registrar el plato sin permiso de ubicacion.'
    );
  }

  const currentLocation =
    await Location.getCurrentPositionAsync({});

  const [geocode] =
    await Location.reverseGeocodeAsync({
      latitude:
        currentLocation.coords.latitude,
      longitude:
        currentLocation.coords.longitude,
    });

  const city =
    geocode?.city || geocode?.region;

  const country = geocode?.country;

  if (!city || !country) {
    throw new Error(
      'No se pudo resolver ciudad y pais.'
    );
  }

  return {
    city,
    country,
    latitude:
      currentLocation.coords.latitude,
    longitude:
      currentLocation.coords.longitude,
  };
}

async function uploadDishPhoto(
  uri: string,
  userId: string
) {
  try {
    // Leer imagen local
    const response = await fetch(uri);

    if (!response.ok) {
      throw new Error(
        'No se pudo leer la imagen.'
      );
    }

    // Convertir a ArrayBuffer
    const arrayBuffer =
      await response.arrayBuffer();

    // Nombre archivo
    const fileExt =
      uri.split('.').pop() || 'jpg';

    const fileName =
      `${Date.now()}.${fileExt}`;

    const filePath =
      `${userId}/${fileName}`;

    console.log(
      'SUBIENDO:',
      filePath
    );

    // Upload Supabase Storage
    const { data, error } =
      await supabase.storage
        .from('dish-photos')
        .upload(
          filePath,
          arrayBuffer,
          {
            contentType:
              'image/jpeg',
            upsert: false,
          }
        );

    if (error) {
      console.log(
        'STORAGE ERROR:',
        error
      );

      throw new Error(
        error.message
      );
    }

    console.log(
      'UPLOAD OK:',
      data
    );

    // Obtener URL publica
    const {
      data: publicUrlData,
    } = supabase.storage
      .from('dish-photos')
      .getPublicUrl(data.path);

    if (
      !publicUrlData?.publicUrl
    ) {
      throw new Error(
        'No se pudo obtener la URL publica.'
      );
    }

    console.log(
      'PUBLIC URL:',
      publicUrlData.publicUrl
    );

    return publicUrlData.publicUrl;

  } catch (error) {
    console.log(
      'UPLOAD ERROR:',
      error
    );

    throw error;
  }
}

function getSaveErrorMessage(
  error: unknown
) {
  if (!(error instanceof Error)) {
    return 'Ocurrio un error al guardar.';
  }

  return error.message;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    flex: 1,
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 32,
  },

  fieldGroup: {
    gap: 8,
  },

  label: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },

  input: {
    borderColor: '#D1D5DB',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 16,
  },

  photoButton: {
    alignItems: 'center',
    borderColor: '#0A7EA4',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
  },

  photoButtonText: {
    color: '#0A7EA4',
    fontWeight: '700',
  },

  preview: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    height: 224,
    width: '100%',
  },

  placeholder: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    height: 224,
    justifyContent: 'center',
    width: '100%',
  },

  placeholderText: {
    color: '#6B7280',
  },

  helperText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
  },

  saveButton: {
    alignItems: 'center',
    backgroundColor: '#0A7EA4',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 56,
  },

  disabled: {
    opacity: 0.7,
  },

  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});