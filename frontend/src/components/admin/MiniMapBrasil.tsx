import { useEffect, useRef, useState, useMemo } from 'react';
import { REP_COLOR_PALETTE } from '@/data/representatives';
import { GeoJSONFeature, GeoJSONFeatureCollection } from '@/hooks/use-api-data';

interface Territory { id: number; municipio: string; uf: string; userId?: number; modo: string; }

interface IBGEState {
  id: number;
  sigla: string;
  nome: string;
}

interface MiniMapBrasilProps {
  territories: Territory[];
  filterUF?: string;
  filterRep?: string;
  onClickUF?: (uf: string) => void;
}

// Brazil bounds for projection
const BOUNDS = { minLon: -73.99, maxLon: -28.85, minLat: -33.75, maxLat: 5.27 };

function projectPoint([lon, lat]: number[], w: number, h: number): [number, number] {
  const x = ((lon - BOUNDS.minLon) / (BOUNDS.maxLon - BOUNDS.minLon)) * w;
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * h;
  return [x, y];
}

function ringToPath(ring: number[][], w: number, h: number): string {
  return ring.map((pt, i) => {
    const [x, y] = projectPoint(pt, w, h);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ') + 'Z';
}

function featureToPath(geometry: GeoJSONFeature['geometry'], w: number, h: number): string {
  if (!geometry) return '';
  if (geometry.type === 'Polygon') {
    const coords = geometry.coordinates as number[][][];
    return coords.map((ring: number[][]) => ringToPath(ring, w, h)).join(' ');
  }
  if (geometry.type === 'MultiPolygon') {
    const coords = geometry.coordinates as number[][][][];
    return coords.flatMap((poly: number[][][]) =>
      poly.map((ring: number[][]) => ringToPath(ring, w, h))
    ).join(' ');
  }
  return '';
}

// Extract 2-letter UF sigla from GeoJSON feature properties
function getUfFromFeature(feature: GeoJSONFeature, ufMap: Record<number, string>): string {
  const code = feature?.properties?.codarea ?? feature?.properties?.CD_UF ?? feature?.properties?.codigo;
  return code ? (ufMap[Number(code)] || '') : '';
}

export default function MiniMapBrasil({ territories, filterUF, onClickUF }: MiniMapBrasilProps) {
  const [geoData, setGeoData] = useState<GeoJSONFeatureCollection | null>(null);
  const [ufMap, setUfMap] = useState<Record<number, string>>({}); // {codigo: sigla}
  const [hoveredUF, setHoveredUF] = useState<string | null>(null);
  const cacheRef = useRef<GeoJSONFeatureCollection | null>(null);
  const W = 320;
  const H = 280;

  // Fetch states GeoJSON from IBGE
  useEffect(() => {
    if (cacheRef.current) { setGeoData(cacheRef.current); return; }
    fetch('https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=UF')
      .then(r => r.json())
      .then(data => {
        cacheRef.current = data;
        setGeoData(data);
      })
      .catch(() => {});

    // Also fetch UF name->sigla mapping
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados')
      .then(r => r.json())
      .then((states: IBGEState[]) => {
        const map: Record<number, string> = {};
        states.forEach(s => { map[s.id] = s.sigla; });
        setUfMap(map);
      })
      .catch(() => {});
  }, []);

  // Build UF coverage set
  const coveredUFs = useMemo(() => {
    const set = new Set<string>();
    for (const t of territories) {
      if (t.uf) set.add(t.uf);
    }
    return set;
  }, [territories]);

  const getStateColor = (uf: string): string => {
    const isSelected = filterUF === uf;
    const isCovered = coveredUFs.has(uf);
    
    // Se não tiver cobertura, sempre cinza escuro
    if (!isCovered) return 'hsl(220 15% 20%)';
    
    // Se o estado estiver selecionado (clicado), destaca com a cor de sotaque
    if (isSelected) return 'hsl(var(--admin-sidebar-accent))';

    // Para os demais estados com cobertura, usa um cinza sutil (estilo "o outro mapa")
    return 'hsl(220 15% 28%)';
  };

  if (!geoData || !geoData.features) {
    return (
      <div style={{ width: W, height: H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>Carregando mapa...</span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        {geoData.features.map((feature: GeoJSONFeature, i: number) => {
          const uf = getUfFromFeature(feature, ufMap);
          const color = getStateColor(uf);
          const isHovered = hoveredUF === uf;
          const isActive = filterUF ? uf === filterUF : false;
          const path = featureToPath(feature.geometry, W, H);
          if (!path) return null;
          return (
            <path
              key={i}
              d={path}
              fill={color}
              stroke={isHovered || isActive ? 'hsl(var(--admin-sidebar-accent))' : 'hsl(220 15% 45%)'}
              strokeWidth={isHovered || isActive ? 1.5 : 0.8}
              style={{ cursor: 'pointer', transition: 'fill 0.2s, stroke 0.2s' }}
              onMouseEnter={() => setHoveredUF(uf)}
              onMouseLeave={() => setHoveredUF(null)}
              onClick={() => uf && onClickUF?.(uf)}
            />
          );
        })}
      </svg>

      {/* Hover tooltip */}
      {hoveredUF && (
        <div style={{
          position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
          background: 'hsl(var(--admin-sidebar-bg))', color: '#fff',
          padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700,
          pointerEvents: 'none', letterSpacing: '0.05em',
          border: '1px solid hsl(var(--admin-sidebar-accent) / 0.4)',
        }}>
          {hoveredUF}
        </div>
      )}
    </div>
  );
}
