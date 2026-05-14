import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

type LocationPickerProps = {
  latitude: number | null;
  longitude: number | null;
  onSelectLocation: (coords: { lat: number; lng: number }) => void;
};

const DEFAULT_CENTER: [number, number] = [-2.170998, -79.922359];

function ClickHandler({
  onSelectLocation,
}: {
  onSelectLocation: LocationPickerProps['onSelectLocation'];
}) {
  useMapEvents({
    click(event) {
      onSelectLocation({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });

  return null;
}

function RecenterMap({
  latitude,
  longitude,
}: {
  latitude: number | null;
  longitude: number | null;
}) {
  const map = useMapEvents({});

  useEffect(() => {
    if (latitude === null || longitude === null) {
      return;
    }

    map.setView([latitude, longitude], map.getZoom());
  }, [latitude, longitude, map]);

  return null;
}

export default function LocationPicker({
  latitude,
  longitude,
  onSelectLocation,
}: LocationPickerProps) {
  const markerPosition =
    latitude !== null && longitude !== null ? ([latitude, longitude] as [number, number]) : null;

  return (
    <View style={styles.container}>
      <Text style={styles.helper}>Haz clic en el mapa para seleccionar la ubicacion del plato.</Text>
      <View style={styles.mapWrapper}>
        <MapContainer
          center={markerPosition ?? DEFAULT_CENTER}
          zoom={13}
          scrollWheelZoom
          style={styles.map}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onSelectLocation={onSelectLocation} />
          <RecenterMap latitude={latitude} longitude={longitude} />
          {markerPosition ? <Marker position={markerPosition} /> : null}
        </MapContainer>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  helper: {
    color: '#4B5563',
    fontSize: 14,
  },
  mapWrapper: {
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
