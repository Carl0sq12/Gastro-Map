import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { StyleSheet, View } from 'react-native';
import { MapContainer, Marker, Popup, Polyline, TileLayer } from 'react-leaflet';

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

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
  label = 'Ubicacion del plato',
  userLatitude = null,
  userLongitude = null,
}: MapViewProps) {
  const hasUserLocation = userLatitude !== null && userLongitude !== null;

  return (
    <View style={styles.wrapper}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        scrollWheelZoom
        style={styles.map}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {hasUserLocation ? (
          <Marker position={[userLatitude, userLongitude]}>
            <Popup>Tu ubicacion</Popup>
          </Marker>
        ) : null}
        <Marker position={[latitude, longitude]}>
          <Popup>{label}</Popup>
        </Marker>
        {hasUserLocation ? (
          <Polyline
            pathOptions={{ color: '#DC2626', weight: 4 }}
            positions={[
              [userLatitude, userLongitude],
              [latitude, longitude],
            ]}
          />
        ) : null}
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 12,
    minHeight: 320,
    overflow: 'hidden',
    width: '100%',
  },
  map: {
    height: '100%',
    minHeight: 320,
    width: '100%',
  },
});
