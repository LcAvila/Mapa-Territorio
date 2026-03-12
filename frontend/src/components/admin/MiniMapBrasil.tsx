import { useEffect, useRef, useState, useMemo } from 'react';
import { REP_COLOR_PALETTE } from '@/data/representatives';

interface Territory { id: number; municipio: string; uf: string; repCode: string; modo: string; }
interface Representative { code: string; name: string; fullName: string; isVago: boolean; colorIndex: number; }

interface MiniMapBrasilProps {
  territories: Territory[];
  reps: Representative[];
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

function featureToPath(geometry: any, w: number, h: number): string {
  if (!geometry) return '';
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.map((ring: number[][]) => ringToPath(ring, w, h)).join(' ');
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flatMap((poly: number[][][]) =>
      poly.map((ring: number[][]) => ringToPath(ring, w, h))
    ).join(' ');
  }
  return '';
}

// Extract 2-letter UF sigla from GeoJSON feature properties
function getUfFromFeature(feature: any, ufMap: Record<number, string>): string {
  const code = feature?.properties?.codarea ?? feature?.properties?.CD_UF ?? feature?.properties?.codigo;
  return code ? (ufMap[Number(code)] || '') : '';
}

export default function MiniMapBrasil({ territories, reps, filterUF, filterRep, onClickUF }: MiniMapBrasilProps) {
  const [geoData, setGeoData] = useState<any>(null);
  const [ufMap, setUfMap] = useState<Record<number, string>>({}); // {codigo: sigla}
  const [hoveredUF, setHoveredUF] = useState<string | null>(null);
  const cacheRef = useRef<any>(null);
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
      .then((states: any[]) => {
        const map: Record<number, string> = {};
        states.forEach(s => { map[s.id] = s.sigla; });
        setUfMap(map);
      })
      .catch(() => {});
  }, []);

  // Build UF → dominant rep mapping from territories
  const ufRepMap = useMemo(() => {
    const map: Record<string, { repCode: string; count: number }[]> = {};
    for (const t of territories) {
      if (!t.uf) continue;
      if (!map[t.uf]) map[t.uf] = [];
      const existing = map[t.uf].find(e => e.repCode === t.repCode);
      if (existing) existing.count++;
      else map[t.uf].push({ repCode: t.repCode, count: 1 });
    }
    // Sort by count descending → pick dominant
    const result: Record<string, string> = {};
    for (const [uf, entries] of Object.entries(map)) {
      entries.sort((a, b) => b.count - a.count);
      result[uf] = entries[0].repCode;
    }
    return result;
  }, [territories]);

  const getStateColor = (uf: string): string => {
    if (filterUF && uf !== filterUF) return 'hsl(220 15% 22%)';
    if (filterRep && ufRepMap[uf] !== filterRep) return 'hsl(220 15% 22%)';
    const repCode = ufRepMap[uf];
    if (!repCode) return 'hsl(220 15% 22%)';
    const rep = reps.find(r => r.code === repCode);
    if (!rep || rep.isVago) return 'hsl(0 0% 38%)';
    return REP_COLOR_PALETTE[rep.colorIndex] || 'hsl(220 15% 28%)';
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
        {geoData.features.map((feature: any, i: number) => {
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
              stroke={isHovered || isActive ? 'hsl(var(--admin-sidebar-accent))' : 'hsl(220 15% 30%)'}
              strokeWidth={isHovered || isActive ? 1.5 : 0.5}
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
          {ufRepMap[hoveredUF] && (
            <span style={{ opacity: 0.7, fontWeight: 400, marginLeft: 6 }}>
              {reps.find(r => r.code === ufRepMap[hoveredUF])?.name || ufRepMap[hoveredUF]}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
