# STAGE 1: Base
FROM node:20-slim AS base
WORKDIR /app

# STAGE 2: Dev
FROM base AS dev
COPY package*.json ./
RUN npm install
COPY . .
# O Vite precisa de --host para aceitar conexões externas ao container
CMD ["npm", "run", "dev", "--", "--host"]

# STAGE 3: Build
FROM base AS build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# STAGE 4: Production (Nginx)
FROM nginx:alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
# Configuração padrão do Nginx para SPA (Single Page Application)
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
