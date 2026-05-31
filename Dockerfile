# syntax=docker/dockerfile:1

# ---- build the static SPA ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# Public URL of the deployment (same origin as the frontend). The client derives
# the WebSocket URL from it (https -> wss). Passed from docker-compose.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ---- serve via Caddy (static SPA + reverse proxy to the Go backend) ----
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 80 443
