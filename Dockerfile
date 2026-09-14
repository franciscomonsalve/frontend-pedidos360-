# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime (nginx con https) ----
FROM nginx:alpine
# Copiar el build de Angular (Angular 18 genera en dist/<proj>/browser)
COPY --from=build /app/dist/frontend-pedidos360/browser /usr/share/nginx/html
# Config de nginx (SPA + https)
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Generar certificado autofirmado en build (válido para la demo)
RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/certs && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/certs/selfsigned.key \
      -out /etc/nginx/certs/selfsigned.crt \
      -subj "/C=CL/ST=RM/L=Santiago/O=Pedidos360/CN=localhost"
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
