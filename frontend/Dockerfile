FROM node:22-alpine AS dev
WORKDIR /srv/frontend
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM dev AS build
# Baked into the bundle at build time. "/api" = same-origin, proxied by
# nginx below; auth UI stays off unless VITE_ENABLE_AUTH=1.
ARG VITE_API_URL=/api
ARG VITE_ENABLE_AUTH=
ENV VITE_API_URL=$VITE_API_URL VITE_ENABLE_AUTH=$VITE_ENABLE_AUTH
RUN npm run build

FROM nginx:alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /srv/frontend/dist /usr/share/nginx/html
EXPOSE 80
