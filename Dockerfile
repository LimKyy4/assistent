FROM node:22-alpine

WORKDIR /app

# Bot dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Server dependencies
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

# Dashboard dependencies + build
COPY dashboard/package.json dashboard/package-lock.json ./dashboard/
RUN cd dashboard && npm ci --omit=dev

# Copy source code
COPY . .

# Build dashboard
RUN cd dashboard && npm run build

EXPOSE 3000 3001

# Start all 3 services via a simple script
CMD node index.js & cd server && node index.js & cd dashboard && npm start
