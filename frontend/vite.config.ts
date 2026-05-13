import { defineConfig, ViteDevServer } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import pc from "picocolors";

const customLogPlugin = () => ({
  name: 'custom-log-plugin',
  configureServer(server: ViteDevServer) {
    const _print = server.printUrls;
    server.printUrls = () => {
      console.clear();
      console.log(pc.cyan("──────────────────────────────────────────────────"));
      console.log(pc.bold(pc.yellow("✨ MAPA TERRITÓRIO - FRONTEND")));
      console.log(pc.cyan("──────────────────────────────────────────────────"));
      console.log(`${pc.blue("📡 Status:")} ${pc.green("Online")}`);
      console.log(`${pc.blue("🔗 URL Local:")} ${pc.underline(pc.white(`http://localhost:${server.config.server.port}`))}`);
      console.log(`${pc.blue("📂 Ambiente:")} ${pc.magenta("development")}`);
      console.log(`${pc.blue("⚡ Engine:")} ${pc.yellow("Vite + React")}`);
      console.log(pc.cyan("──────────────────────────────────────────────────"));
      console.log(pc.gray("Aguardando conexões...\n"));
    };
  }
});

export default defineConfig(({ mode }) => ({
  envDir: "../",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    customLogPlugin()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
