/**
 * @file RoutingPanel.tsx
 * @description Painel para calcular e visualizar a rota de um representante.
 * Recebe os clientes selecionados, pede a origem do representante e exibe
 * o resultado da rota (distância + tempo) calculada via HERE API.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Navigation2, X, Loader2, Route, Clock, MapPin,
  Car, Truck, Bike, PersonStanding, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle2, Crosshair
} from "lucide-react";
import { Cliente } from "@/hooks/use-api-data";
import { useRouting, RouteWaypoint, TransportMode } from "@/hooks/use-routing";

interface RoutingPanelProps {
  /** Clientes que fazem parte do roteiro */
  clients: Cliente[];
  onClose: () => void;
  /** Callback com as coordenadas das seções para desenhar no mapa */
  onRouteCalculated?: (waypoints: RouteWaypoint[]) => void;
  onRouteClear?: () => void;
}

const MODES: { value: TransportMode; label: string; Icon: React.ElementType }[] = [
  { value: "car", label: "Carro", Icon: Car },
  { value: "truck", label: "Caminhão", Icon: Truck },
  { value: "bicycle", label: "Bicicleta", Icon: Bike },
  { value: "pedestrian", label: "A pé", Icon: PersonStanding },
];

export default function RoutingPanel({
  clients, onClose, onRouteCalculated, onRouteClear,
}: RoutingPanelProps) {
  const { calculateRoute, clearRoute, isLoading, error, result } = useRouting();
  const [mode, setMode] = useState<TransportMode>("car");
  const [originLat, setOriginLat] = useState("");
  const [originLng, setOriginLng] = useState("");
  const [showSections, setShowSections] = useState(false);
  const [geoErrorMsg, setGeoErrorMsg] = useState<string | null>(null);

  // Filtra clientes com coordenadas válidas
  const validClients = clients.filter((c) => c.latitude && c.longitude);

  const handleGeolocate = () => {
    setGeoErrorMsg(null);
    if (!navigator.geolocation) {
      setGeoErrorMsg("Geolocalização não disponível no seu navegador.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOriginLat(pos.coords.latitude.toFixed(6));
        setOriginLng(pos.coords.longitude.toFixed(6));
      },
      () => setGeoErrorMsg("Não foi possível obter sua localização.")
    );
  };

  const handleCalculate = async () => {
    const lat = parseFloat(originLat);
    const lng = parseFloat(originLng);

    if (isNaN(lat) || isNaN(lng)) {
      return;
    }

    const origin: RouteWaypoint = { lat, lng, label: "Origem" };
    const stops: RouteWaypoint[] = validClients.map((c) => ({
      lat: c.latitude,
      lng: c.longitude,
      label: c.nome_cliente,
    }));

    const waypoints = [origin, ...stops];
    const routeResult = await calculateRoute(waypoints, mode);

    if (routeResult && onRouteCalculated) {
      onRouteCalculated(waypoints);
    }
  };

  const handleClear = () => {
    clearRoute();
    onRouteClear?.();
  };

  const canCalculate =
    originLat.trim() !== "" &&
    originLng.trim() !== "" &&
    !isNaN(parseFloat(originLat)) &&
    !isNaN(parseFloat(originLng)) &&
    validClients.length >= 1;

  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="w-[300px] bg-card border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
    >
      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-gradient-to-r from-blue-900/30 to-transparent flex-shrink-0">
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4 text-blue-400" />
          <h2 className="font-semibold text-sm text-foreground">Roteiro</h2>
          <span className="text-[10px] bg-blue-600/20 text-blue-400 border border-blue-600/30 px-1.5 py-0.5 rounded-full font-bold">
            {validClients.length} cliente{validClients.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-y-auto flex-1">
        {/* ── Clients list ── */}
        <div className="px-3 pt-3 pb-2">
          <p className="text-[10px] text-muted-foreground mb-1.5 font-semibold uppercase tracking-wide">
            Paradas do roteiro
          </p>
          {validClients.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Nenhum cliente com coordenadas selecionado.</span>
            </div>
          ) : (
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {validClients.map((c, i) => (
                <div
                  key={c.id_cliente}
                  className="flex items-center gap-2 text-xs bg-secondary/40 rounded px-2 py-1.5"
                >
                  <span className="w-4 h-4 rounded-full bg-blue-600/30 text-blue-400 text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="truncate text-foreground">{c.nome_cliente}</span>
                  <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0 ml-auto" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Origin ── */}
        <div className="px-3 py-2 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground mb-1.5 font-semibold uppercase tracking-wide">
            Ponto de origem (representante)
          </p>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="number"
              placeholder="Latitude"
              value={originLat}
              onChange={(e) => setOriginLat(e.target.value)}
              className="flex-1 bg-secondary text-foreground text-xs px-2 py-1.5 rounded-md border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 min-w-0"
            />
            <input
              type="number"
              placeholder="Longitude"
              value={originLng}
              onChange={(e) => setOriginLng(e.target.value)}
              className="flex-1 bg-secondary text-foreground text-xs px-2 py-1.5 rounded-md border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 min-w-0"
            />
          </div>
          <button
            onClick={handleGeolocate}
            className="w-full flex items-center justify-center gap-1.5 text-[10px] text-blue-400 hover:text-blue-300 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/20 rounded-md py-1.5 transition-all"
          >
            <Crosshair className="w-3 h-3" />
            Usar minha localização atual
          </button>
          {geoErrorMsg && (
            <p className="text-[10px] text-red-400 mt-1">{geoErrorMsg}</p>
          )}
        </div>

        {/* ── Transport mode ── */}
        <div className="px-3 py-2 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground mb-1.5 font-semibold uppercase tracking-wide">
            Modo de transporte
          </p>
          <div className="grid grid-cols-4 gap-1">
            {MODES.map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => setMode(value)}
                className={`flex flex-col items-center gap-1 py-2 rounded-md text-[9px] font-semibold transition-all border ${
                  mode === value
                    ? "bg-blue-600/20 text-blue-300 border-blue-600/40"
                    : "bg-secondary/40 text-muted-foreground border-border/50 hover:bg-secondary"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Error ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 py-2"
            >
              <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Result ── */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="px-3 py-2 border-t border-border/50"
            >
              <div className="bg-emerald-600/10 border border-emerald-600/20 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-xs font-semibold text-emerald-300">Rota calculada!</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-card/60 rounded-md p-2 text-center">
                    <Clock className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
                    <p className="text-sm font-bold text-foreground">{result.durationFormatted}</p>
                    <p className="text-[9px] text-muted-foreground">Duração total</p>
                  </div>
                  <div className="bg-card/60 rounded-md p-2 text-center">
                    <Navigation2 className="w-3.5 h-3.5 text-purple-400 mx-auto mb-1" />
                    <p className="text-sm font-bold text-foreground">{result.distanceFormatted}</p>
                    <p className="text-[9px] text-muted-foreground">Distância total</p>
                  </div>
                </div>

                {/* Sections toggle */}
                <button
                  onClick={() => setShowSections((p) => !p)}
                  className="w-full flex items-center justify-between text-[10px] text-muted-foreground hover:text-foreground transition-colors pt-1 border-t border-border/30"
                >
                  <span>Detalhes por trecho ({result.sections.length})</span>
                  {showSections ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                <AnimatePresence>
                  {showSections && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-1.5 overflow-hidden"
                    >
                      {result.sections.map((s) => (
                        <div key={s.index} className="flex items-center gap-2 text-[10px] bg-card/40 rounded px-2 py-1.5">
                          <span className="w-4 h-4 rounded-full bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center flex-shrink-0">
                            {s.index + 1}
                          </span>
                          <span className="text-muted-foreground">
                            {s.durationFormatted} · {s.distanceFormatted}
                          </span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Actions ── */}
      <div className="px-3 py-3 border-t border-border flex gap-2 flex-shrink-0">
        {result && (
          <button
            onClick={handleClear}
            className="flex-1 py-2 text-xs font-semibold rounded-md border border-border text-muted-foreground hover:bg-secondary transition-all"
          >
            Limpar
          </button>
        )}
        <button
          onClick={handleCalculate}
          disabled={!canCalculate || isLoading}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-all ${
            canCalculate && !isLoading
              ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30"
              : "bg-secondary text-muted-foreground cursor-not-allowed"
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Calculando...
            </>
          ) : (
            <>
              <Navigation2 className="w-3.5 h-3.5" />
              Calcular Rota
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
