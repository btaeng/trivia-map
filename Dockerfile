FROM node:18-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY server.js ./

COPY ne_50m_admin_0_countries ./ne_50m_admin_0_countries

COPY --from=build-stage /app/dist ./dist

EXPOSE 3001

CMD ["node", "server.js"]