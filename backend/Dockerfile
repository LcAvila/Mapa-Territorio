# STAGE 1: Base
FROM node:20-slim AS base
RUN apt-get update && apt-get install -y openssl libssl-dev curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# STAGE 2: Dev (Hot Reload)
FROM base AS dev
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
# Inicialização com migrações e rodando em modo dev
CMD npx prisma migrate deploy && npm run dev

# STAGE 3: Build (Produção)
FROM base AS build
COPY package*.json ./
RUN npm install --only=production
COPY . .
RUN npx prisma generate
RUN npm run build

# STAGE 4: Final Production
FROM base AS prod
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/prisma ./prisma
EXPOSE 3001
CMD npx prisma migrate deploy && node dist/server.js
