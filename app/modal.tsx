import { Text, View } from 'react-native';
import { Link, Stack } from 'expo-router';

export default function Modal() {
  return (
    <View className="flex-1 items-center justify-center bg-white p-6 dark:bg-surface-dark">
      <Stack.Screen options={{ title: 'Modal' }} />
      <Text className="text-xl font-bold text-text-primary dark:text-text-dark">
        Modal title
      </Text>
      <Link href="/" className="mt-4 text-base text-primary underline">
        Cerrar
      </Link>
    </View>
  );
}
