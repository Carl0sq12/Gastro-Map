import { StyleSheet, View } from 'react-native';
import NativeMapView, { Marker, Polyline } from 'react-native-maps';

type MapViewProps = {
  latitude: number;
  longitude: number;
  label?: string;
  userLatitude?: number | null;
  userLongitude?: number | null;
};

export default function MapView({
  latitude,
  longitude,
  label,
  userLatitude = null,
  userLongitude = null,
}: MapViewProps) {
  const region = {
    latitude: userLatitude ?? latitude,
    longitude: userLongitude ?? longitude,
    latitudeDelta: Math.max(Math.abs((userLatitude ?? latitude) - latitude) * 2, 0.01),
    longitudeDelta: Math.max(Math.abs((userLongitude ?? longitude) - longitude) * 2, 0.01),
  };
  const hasUserLocation = userLatitude !== null && userLongitude !== null;

  return (
    <View style={styles.container}>
      <NativeMapView
        initialRegion={region}
        mapType="standard"
        style={styles.map}>
        {hasUserLocation ? (
          <Marker
            coordinate={{ latitude: userLatitude, longitude: userLongitude }}
            pinColor="#2563EB"
            title="Tu ubicacion"
          />
        ) : null}
        <Marker coordinate={{ latitude, longitude }} title={label ?? 'Ubicacion del plato'} />
        {hasUserLocation ? (
          <Polyline
            coordinates={[
              { latitude: userLatitude, longitude: userLongitude },
              { latitude, longitude },
            ]}
            strokeColor="#DC2626"
            strokeWidth={4}
          />
        ) : null}
      </NativeMapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    minHeight: 320,
    overflow: 'hidden',
  },
  map: {
    height: 320,
    width: '100%',
  },
});
