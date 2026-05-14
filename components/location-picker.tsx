import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type MapPressEvent } from 'react-native-maps';

type LocationPickerProps = {
  latitude: number | null;
  longitude: number | null;
  onSelectLocation: (coords: { lat: number; lng: number }) => void;
};

const DEFAULT_REGION = {
  latitude: -2.170998,
  longitude: -79.922359,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function LocationPicker({
  latitude,
  longitude,
  onSelectLocation,
}: LocationPickerProps) {
  const markerCoordinate =
    latitude !== null && longitude !== null ? { latitude, longitude } : null;

  const initialRegion = markerCoordinate
    ? {
        ...markerCoordinate,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : DEFAULT_REGION;

  const handlePress = (event: MapPressEvent) => {
    onSelectLocation({
      lat: event.nativeEvent.coordinate.latitude,
      lng: event.nativeEvent.coordinate.longitude,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.helper}>Toca el mapa para seleccionar manualmente la ubicacion.</Text>
      <View style={styles.mapWrapper}>
        <MapView
          initialRegion={initialRegion}
          mapType="standard"
          onPress={handlePress}
          style={styles.map}>
          {markerCoordinate ? <Marker coordinate={markerCoordinate} /> : null}
        </MapView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  helper: {
    color: '#4B5563',
    fontSize: 14,
  },
  mapWrapper: {
    borderRadius: 12,
    minHeight: 320,
    overflow: 'hidden',
  },
  map: {
    height: 320,
    width: '100%',
  },
});
