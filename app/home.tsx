import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    FadeInDown,
    FadeOutLeft,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

import { deleteDish, fetchDishes } from '@/lib/dish-service';
import { supabase } from '@/lib/supabase';
import type { Dish } from '@/types/dish';

export default function HomeScreen() {
  const queryClient = useQueryClient();

  const dishesQuery = useQuery({
    queryKey: ['dishes'],
    queryFn: loadUserDishes,
  });

  const dishes = useMemo(() => dishesQuery.data?.dishes ?? [], [dishesQuery.data?.dishes]);
  const user = dishesQuery.data?.user ?? null;

  useEffect(() => {
    if (dishesQuery.isError) {
      Alert.alert('Error', 'No se pudieron cargar los platos.');
    }
  }, [dishesQuery.isError]);

  const deleteMutation = useMutation({
    mutationFn: (dish: Dish) => deleteDish(dish.id, dish.user_id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dishes'] });
    },
    onError: () => {
      Alert.alert('Error', 'No se pudo eliminar el plato.');
    },
  });

  const confirmDelete = (dish: Dish) => {
    Alert.alert('Eliminar plato', `Eliminar "${dish.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(dish),
      },
    ]);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    queryClient.clear();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gastro-Map</Text>
        <Text style={styles.email}>{user?.email ?? ''}</Text>
      </View>

      <FlatList
        data={dishes}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <DishCard dish={item} index={index} onDelete={() => confirmDelete(item)} />
        )}
        refreshing={dishesQuery.isFetching}
        onRefresh={() => dishesQuery.refetch()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {dishesQuery.isLoading ? 'Cargando...' : 'Aun no hay platos. Agrega el primero!'}
          </Text>
        }
      />

      <Pressable
        style={styles.fab}
        onPress={() => router.push('/add-dish')}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <Pressable
        style={styles.signOutButton}
        onPress={signOut}>
        <Text style={styles.signOutText}>Cerrar sesion</Text>
      </Pressable>
    </View>
  );
}

async function loadUserDishes() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    router.replace('/');
    return { user: null, dishes: [] };
  }

  const dishes = await fetchDishes(user.id);
  return { user, dishes };
}

function DishCard({
  dish,
  index,
  onDelete,
}: {
  dish: Dish;
  index: number;
  onDelete: () => void;
}) {
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onUpdate((event) => {
      translateX.value = Math.min(0, event.translationX);
    })
    .onEnd(() => {
      if (translateX.value < -120) {
        runOnJS(onDelete)();
      }

      translateX.value = withSpring(0);
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.deleteBackground}>
      <View style={styles.deleteLabelContainer}>
        <Text style={styles.deleteLabel}>Eliminar</Text>
      </View>

      <GestureDetector gesture={panGesture}>
        <Animated.View
          entering={FadeInDown.delay(index * 45)}
          exiting={FadeOutLeft}
          style={[styles.card, cardStyle]}>
          <Pressable onPress={() => router.push({ pathname: '/dish/[id]', params: { id: dish.id } })}>
            {dish.photo_uri ? (
              <Image source={{ uri: dish.photo_uri }} style={styles.cardImage} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.mutedText}>Sin foto</Text>
              </View>
            )}
            <Text style={styles.cardTitle}>{dish.name}</Text>
            <Text style={styles.locationText}>
              {dish.city ?? 'Ciudad no disponible'}, {dish.country ?? 'Pais no disponible'}
            </Text>
            {dish.latitude !== null && dish.longitude !== null ? (
              <Text style={styles.locationText}>
                Lat: {dish.latitude.toFixed(5)}, Lon: {dish.longitude.toFixed(5)}
              </Text>
            ) : null}
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
  },
  header: {
    gap: 4,
    marginBottom: 20,
  },
  title: {
    color: '#111827',
    fontSize: 32,
    fontWeight: '700',
  },
  email: {
    color: '#6B7280',
    fontSize: 14,
  },
  listContent: {
    flexGrow: 1,
    gap: 12,
    paddingBottom: 128,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 16,
    marginTop: 48,
    textAlign: 'center',
  },
  fab: {
    alignItems: 'center',
    backgroundColor: '#0A7EA4',
    borderRadius: 28,
    bottom: 96,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: 24,
    width: 56,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 36,
  },
  signOutButton: {
    alignItems: 'center',
    borderColor: '#0A7EA4',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    marginBottom: 24,
    minHeight: 48,
  },
  signOutText: {
    color: '#0A7EA4',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteBackground: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    overflow: 'hidden',
  },
  deleteLabelContainer: {
    height: '100%',
    justifyContent: 'center',
    position: 'absolute',
    right: 20,
    top: 0,
  },
  deleteLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  cardImage: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    height: 160,
    width: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    height: 160,
    justifyContent: 'center',
    width: '100%',
  },
  mutedText: {
    color: '#6B7280',
    fontSize: 14,
  },
  cardTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  locationText: {
    color: '#6B7280',
    fontSize: 14,
  },
});
