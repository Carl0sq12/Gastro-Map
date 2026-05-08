import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './supabase';
import type { Dish } from '@/types/dish';

const dishCacheKey = (userId: string) => `gastro-map:dishes:${userId}`;

export async function fetchDishes(userId: string): Promise<Dish[]> {
  const { data, error } = await supabase
    .from('dishes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    const cachedDishes = await getCachedDishes(userId);

    if (cachedDishes.length > 0) {
      return cachedDishes;
    }

    throw error;
  }

  const dishes = data ?? [];
  await cacheDishes(userId, dishes);
  return dishes;
}

export async function insertDish(dish: {
  user_id: string;
  name: string;
  photo_uri: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
}): Promise<Dish> {
  const { data, error } = await supabase
    .from('dishes')
    .insert(dish)
    .select()
    .single();

  if (error) throw error;
  await prependCachedDish(dish.user_id, data);
  return data;
}

export async function deleteDish(id: string, userId?: string): Promise<void> {
  const { error } = await supabase.from('dishes').delete().eq('id', id);
  if (error) throw error;

  if (userId) {
    await removeCachedDish(userId, id);
  }
}

async function getCachedDishes(userId: string): Promise<Dish[]> {
  try {
    const cached = await AsyncStorage.getItem(dishCacheKey(userId));
    return cached ? (JSON.parse(cached) as Dish[]) : [];
  } catch {
    return [];
  }
}

async function cacheDishes(userId: string, dishes: Dish[]) {
  await AsyncStorage.setItem(dishCacheKey(userId), JSON.stringify(dishes));
}

async function prependCachedDish(userId: string, dish: Dish) {
  const cachedDishes = await getCachedDishes(userId);
  await cacheDishes(userId, [dish, ...cachedDishes.filter((item) => item.id !== dish.id)]);
}

async function removeCachedDish(userId: string, dishId: string) {
  const cachedDishes = await getCachedDishes(userId);
  await cacheDishes(
    userId,
    cachedDishes.filter((dish) => dish.id !== dishId),
  );
}
