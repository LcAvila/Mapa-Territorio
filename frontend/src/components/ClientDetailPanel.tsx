import { X, MapPin, User, Building2, Layers, Search, CheckCircle2, Navigation2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Client {
  id_cliente: number;
  codigo_cliente: string;
  nome_cliente: string;
  nome_abreviado?: string;
  endereco_completo?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  latitude: number;
  longitude: number;
}

interface ClientDetailPanelProps {
  clients: Client[];
  onClose: () => void;
  onSelectClient?: (client: Client) => void;
  onCalculateRoute?: () => void;
}

const ClientDetailPanel = ({ clients, onClose, onSelectClient, onCalculateRoute }: ClientDetailPanelProps) => {
  if (clients.length === 0) return null;

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="w-full max-h-[calc(100vh-120px)] bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
    >
      <div className="p-4 border-b border-border flex items-center justify-between bg-primary/5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/20 rounded-lg">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">
              {clients.length === 1 ? "Detalhes do Cliente" : "Clientes Selecionados"}
            </h3>
            <p className="text-[10px] text-muted-foreground">
              {clients.length} registro(s) encontrado(s)
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {clients.map((client, idx) => (
            <motion.div
              key={client.id_cliente}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onSelectClient?.(client)}
              className={`p-3 rounded-lg border ${
                clients.length > 1 
                  ? "bg-muted/30 border-border/50 hover:bg-muted/50 transition-colors cursor-pointer" 
                  : "bg-transparent border-transparent"
              } space-y-3`}
            >
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-bold text-primary leading-tight">
                    {client.nome_cliente}
                  </h4>
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">
                    #{client.codigo_cliente}
                  </Badge>
                </div>
                {client.nome_abreviado && (
                  <p className="text-xs text-muted-foreground italic">
                    {client.nome_abreviado}
                  </p>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="text-[11px] leading-relaxed">
                    <p className="font-medium">{client.endereco_completo || "Endereço não disponível"}</p>
                    <p className="text-muted-foreground">
                      {client.bairro ? `${client.bairro}, ` : ""}{client.cidade} - {client.uf}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-[11px] text-muted-foreground">
                    Coordenadas: {client.latitude.toFixed(5)}, {client.longitude.toFixed(5)}
                  </span>
                </div>
              </div>

              {clients.length > 1 && (
                <div className="flex justify-end pt-1">
                  <span className="text-[9px] text-primary/70 flex items-center gap-1 uppercase tracking-wider font-bold">
                    <Search className="w-2.5 h-2.5" /> Focar no Mapa
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </ScrollArea>

      {(clients.length >= 1) && (
        <div className="p-3 bg-muted/20 border-t border-border flex gap-2">
          {onCalculateRoute && clients.some(c => c.latitude && c.longitude) && (
            <Button
              variant="default"
              className="flex-1 h-8 text-xs gap-2 bg-blue-600 hover:bg-blue-500 text-white"
              onClick={onCalculateRoute}
            >
              <Navigation2 className="w-3.5 h-3.5" />
              Calcular Rota
            </Button>
          )}
          <Button 
            variant="outline" 
            className="flex-1 h-8 text-xs gap-2"
            onClick={onClose}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Fechar
          </Button>
        </div>
      )}
    </motion.div>
  );
};

export default ClientDetailPanel;
