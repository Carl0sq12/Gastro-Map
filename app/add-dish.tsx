import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
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
import LocationPicker from '@/components/location-picker';

const AnimatedPressable =
  Animated.createAnimatedComponent(Pressable);

type SaveDishInput = {
  name: string;
  photoUri: string;
  latitude: number;
  longitude: number;
};

type Coordinates = {
  lat: number;
  lng: number;
};

type LocationMode = 'automatic' | 'manual';

export default function AddDishScreen() {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [locationMode, setLocationMode] = useState<LocationMode | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Coordinates | null>(null);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);

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

    if (!selectedLocation) {
      Alert.alert(
        'Ubicacion requerida',
        'Selecciona una ubicacion automatica o manual antes de registrar el plato.',
      );

      return;
    }

    saveDishMutation.mutate({
      latitude: selectedLocation.lat,
      longitude: selectedLocation.lng,
      name: trimmedName,
      photoUri,
    });
  };

  const handleAutomaticLocation = async () => {
    try {
      setIsResolvingLocation(true);
      const coords = await getAutomaticCoordinates();
      setLocationMode('automatic');
      setSelectedLocation(coords);
    } catch (error) {
      Alert.alert('Ubicacion no disponible', getSaveErrorMessage(error));
    } finally {
      setIsResolvingLocation(false);
    }
  };

  const handleManualLocationSelect = (coords: Coordinates) => {
    setLocationMode('manual');
    setSelectedLocation(coords);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.contentContainer}
      style={styles.container}>
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

      <View style={styles.locationSection}>
        <Text style={styles.label}>Ubicacion del plato</Text>

        <View style={styles.locationActions}>
          <Pressable
            disabled={isResolvingLocation}
            onPress={handleAutomaticLocation}
            style={[
              styles.locationOptionButton,
              locationMode === 'automatic' ? styles.locationOptionButtonActive : undefined,
              isResolvingLocation ? styles.disabled : undefined,
            ]}>
            <Text
              style={[
                styles.locationOptionText,
                locationMode === 'automatic' ? styles.locationOptionTextActive : undefined,
              ]}>
              {isResolvingLocation ? 'Obteniendo ubicacion...' : 'Usar mi ubicacion actual'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setLocationMode('manual')}
            style={[
              styles.locationOptionButton,
              locationMode === 'manual' ? styles.locationOptionButtonActive : undefined,
            ]}>
            <Text
              style={[
                styles.locationOptionText,
                locationMode === 'manual' ? styles.locationOptionTextActive : undefined,
              ]}>
              Seleccionar manualmente
            </Text>
          </Pressable>
        </View>

        {locationMode === 'manual' ? (
          <LocationPicker
            latitude={selectedLocation?.lat ?? null}
            longitude={selectedLocation?.lng ?? null}
            onSelectLocation={handleManualLocationSelect}
          />
        ) : null}

        {selectedLocation ? (
          <Text style={styles.coordinatesText}>
            Lat: {selectedLocation.lat.toFixed(5)} | Lon: {selectedLocation.lng.toFixed(5)}
          </Text>
        ) : (
          <Text style={styles.helperText}>
            Elige una de las dos opciones para guardar la ubicacion del plato.
          </Text>
        )}

        {Platform.OS !== 'web' && locationMode === 'manual' ? (
          <Text style={styles.helperText}>
            Toca el mapa para fijar la ubicacion manual del plato.
          </Text>
        ) : null}
      </View>

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
    </ScrollView>
  );
}

async function saveDish({
  latitude,
  longitude,
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

  const locationMetadata = await reverseGeocodeCoordinates({
    lat: latitude,
    lng: longitude,
  });

  const photoUrl =
    await uploadDishPhoto(
      photoUri,
      user.id
    );

  return insertDish({
    city: locationMetadata.city,
    country: locationMetadata.country,
    latitude,
    longitude,
    name,
    photo_uri: photoUrl,
    user_id: user.id,
  });
}

async function getAutomaticCoordinates(): Promise<Coordinates> {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => reject(new Error('No se pudo obtener tu ubicacion actual.')),
        {
          enableHighAccuracy: true,
          timeout: 10000,
        },
      );
    });
  }

  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    throw new Error('No se concedio permiso para acceder a la ubicacion.');
  }

  const currentLocation = await Location.getCurrentPositionAsync({});

  return {
    lat: currentLocation.coords.latitude,
    lng: currentLocation.coords.longitude,
  };
}

async function reverseGeocodeCoordinates({ lat, lng }: Coordinates) {
  try {
    const [geocode] = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lng,
    });

    return {
      city: geocode?.city || geocode?.region || null,
      country: geocode?.country || null,
    };
  } catch {
    return {
      city: null,
      country: null,
    };
  }
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
  },

  contentContainer: {
    gap: 16,
    paddingBottom: 40,
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

  locationSection: {
    gap: 12,
  },

  locationActions: {
    gap: 12,
  },

  locationOptionButton: {
    alignItems: 'center',
    borderColor: '#0A7EA4',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },

  locationOptionButtonActive: {
    backgroundColor: '#0A7EA4',
  },

  locationOptionText: {
    color: '#0A7EA4',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },

  locationOptionTextActive: {
    color: '#FFFFFF',
  },

  helperText: {
    color: '#6B7280',
    fontSize: 14,
  },

  coordinatesText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
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
