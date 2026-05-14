import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';

import MapView from '@/components/map-view';
import { fetchDishes } from '@/lib/dish-service';
import { supabase } from '@/lib/supabase';

export default function DishDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isMapVisible, setIsMapVisible] = useState(false);

  const dishQuery = useQuery({
    queryKey: ['dish', id],
    queryFn: async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      if (!user) {
        throw new Error('Inicia sesion para ver el detalle del plato.');
      }

      const dishes = await fetchDishes(user.id);
      const dish = dishes.find((item) => item.id === id);

      if (!dish) {
        throw new Error('No se encontro el plato solicitado.');
      }

      return dish;
    },
    enabled: typeof id === 'string' && id.length > 0,
  });

  const hasCoordinates = useMemo(() => {
    const dish = dishQuery.data;

    return dish?.latitude !== null && dish?.longitude !== null;
  }, [dishQuery.data]);

  const userLocationQuery = useQuery({
    queryKey: ['user-location', dishQuery.data?.id],
    queryFn: async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        return null;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});

      return {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
    },
    enabled: hasCoordinates,
    staleTime: 1000 * 60 * 5,
  });

  const addressQuery = useQuery({
    queryKey: ['dish-address', dishQuery.data?.id, dishQuery.data?.latitude, dishQuery.data?.longitude],
    queryFn: async () => {
      if (!dishQuery.data || dishQuery.data.latitude === null || dishQuery.data.longitude === null) {
        return null;
      }

      const [result] = await Location.reverseGeocodeAsync({
        latitude: dishQuery.data.latitude,
        longitude: dishQuery.data.longitude,
      });

      if (!result) {
        return null;
      }

      const parts = [result.street, result.streetNumber].filter(Boolean);
      const locality = [result.district, result.city || result.subregion, result.region]
        .filter(Boolean)
        .join(', ');

      return {
        line1: parts.length > 0 ? parts.join(' ') : null,
        line2: locality || null,
      };
    },
    enabled: hasCoordinates,
    staleTime: 1000 * 60 * 30,
  });

  const distanceInKm = useMemo(() => {
    const dish = dishQuery.data;

    if (
      !hasCoordinates ||
      !userLocationQuery.data ||
      !dish ||
      dish.latitude === null ||
      dish.longitude === null
    ) {
      return null;
    }

    return calculateDistanceInKm(
      userLocationQuery.data.latitude,
      userLocationQuery.data.longitude,
      dish.latitude,
      dish.longitude,
    );
  }, [dishQuery.data, hasCoordinates, userLocationQuery.data]);

  if (dishQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Detalle del plato' }} />
        <ActivityIndicator />
      </View>
    );
  }

  if (dishQuery.isError || !dishQuery.data) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Detalle del plato' }} />
        <Text style={styles.errorText}>No se pudo cargar el plato.</Text>
      </View>
    );
  }

  const dish = dishQuery.data;

  return (
    <ScrollView contentContainerStyle={styles.contentContainer} style={styles.container}>
      <Stack.Screen options={{ title: dish.name }} />

      {dish.photo_uri ? (
        <Image source={{ uri: dish.photo_uri }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderText}>Sin foto disponible</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.title}>{dish.name}</Text>
        <Text style={styles.metaText}>Ciudad: {dish.city ?? 'No disponible'}</Text>
        <Text style={styles.metaText}>Pais: {dish.country ?? 'No disponible'}</Text>
        {hasCoordinates ? (
          <Text style={styles.metaText}>
            Direccion:{' '}
            {addressQuery.isLoading
              ? 'Buscando direccion...'
              : addressQuery.data?.line1 || addressQuery.data?.line2
                ? [addressQuery.data?.line1, addressQuery.data?.line2].filter(Boolean).join(' | ')
                : 'No se pudo resolver una direccion exacta'}
          </Text>
        ) : null}
        {hasCoordinates ? (
          <Text style={styles.metaText}>
            Distancia:{' '}
            {userLocationQuery.isLoading
              ? 'Calculando distancia...'
              : distanceInKm !== null
                ? `${distanceInKm.toFixed(2)} km desde tu ubicacion actual`
                : 'No se pudo obtener tu ubicacion actual'}
          </Text>
        ) : null}
        <Text style={styles.metaText}>
          Coordenadas:{' '}
          {hasCoordinates ? `${dish.latitude?.toFixed(5)}, ${dish.longitude?.toFixed(5)}` : 'No disponibles'}
        </Text>
      </View>

      <Pressable
        disabled={!hasCoordinates}
        onPress={() => setIsMapVisible((current) => !current)}
        style={[styles.locationButton, !hasCoordinates ? styles.locationButtonDisabled : undefined]}>
        <Text style={styles.locationButtonText}>
          {hasCoordinates
            ? isMapVisible
              ? 'Ocultar ubicacion'
              : 'Ver ubicacion'
            : 'Ubicacion no disponible'}
        </Text>
      </Pressable>

      {hasCoordinates && isMapVisible ? (
        <MapView
          latitude={dish.latitude!}
          longitude={dish.longitude!}
          label={dish.name}
          userLatitude={userLocationQuery.data?.latitude ?? null}
          userLongitude={userLocationQuery.data?.longitude ?? null}
        />
      ) : null}
    </ScrollView>
  );
}

function calculateDistanceInKm(
  startLatitude: number,
  startLongitude: number,
  endLatitude: number,
  endLongitude: number,
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLatitude = toRadians(endLatitude - startLatitude);
  const deltaLongitude = toRadians(endLongitude - startLongitude);
  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(toRadians(startLatitude)) *
      Math.cos(toRadians(endLatitude)) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  contentContainer: {
    gap: 16,
    padding: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 15,
  },
  image: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    height: 260,
    width: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    height: 260,
    justifyContent: 'center',
    width: '100%',
  },
  placeholderText: {
    color: '#6B7280',
    fontSize: 14,
  },
  section: {
    gap: 8,
  },
  title: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '700',
  },
  metaText: {
    color: '#4B5563',
    fontSize: 15,
  },
  locationButton: {
    alignItems: 'center',
    backgroundColor: '#0A7EA4',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  locationButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
