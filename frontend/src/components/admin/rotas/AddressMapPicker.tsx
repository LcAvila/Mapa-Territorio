/**
 * @file AddressMapPicker.tsx
 * @description Esse aqui é o oclinhos do sistema. Ele mostra pro usuário onde o pino 
 * vai cair no mapa antes de salvar. Se o pino tiver no lugar errado, o usuário 
 * dá um toque no mapa e o pino pula pro lugar certo. Mó molezinha!
 * 
 * @author Cria de Nova Iguaçu
 */

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Corrigindo o bug dos ícones do Leaflet que somem no build do Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface AddressMapPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}

/**
 * Componente interno pra centralizar o mapa quando as coordenadas mudarem
 */
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 16);
  }, [center, map]);
  return null;
}

/**
 * Componente interno pra capturar o clique do usuário no mapa
 */
function MapEventsHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function AddressMapPicker({ lat, lng, onChange }: AddressMapPickerProps) {
  // Se não tiver posição, começa no Rio de Janeiro (Nova Iguaçu seria o ideal, né?)
  const defaultPos: [number, number] = [-22.75, -43.45]; 
  const currentPos: [number, number] = lat && lng ? [lat, lng] : defaultPos;

  return (
    <div className="w-full h-[250px] rounded-lg overflow-hidden border border-border shadow-inner relative z-0">
      <MapContainer 
        center={currentPos} 
        zoom={lat && lng ? 16 : 12} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {lat && lng && (
          <>
            <Marker position={[lat, lng]} />
            <ChangeView center={[lat, lng]} />
          </>
        )}
        
        <MapEventsHandler onLocationSelect={onChange} />
      </MapContainer>
      
      {!lat || !lng ? (
        <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] flex items-center justify-center z-[1000] pointer-events-none">
          <p className="bg-card px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm border border-border text-muted-foreground">
            Aguardando endereço ou clique no mapa para marcar
          </p>
        </div>
      ) : (
        <div className="absolute top-2 right-2 z-[1000]">
          <p className="bg-emerald-500 text-white px-2 py-1 rounded text-[10px] font-bold shadow-sm">
            LOCALIZADO
          </p>
        </div>
      )}
    </div>
  );
}
