FROM node:22-alpine AS dev
WORKDIR /srv/frontend
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM dev AS build
RUN npm run build

FROM nginx:alpine AS prod
COPY --from=build /srv/frontend/dist /usr/share/nginx/html
EXPOSE 80
