FROM node:20-bullseye-slim

WORKDIR /app

RUN groupadd -r appgroup && useradd -r -g appgroup appuser

RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate

USER appuser

EXPOSE 5000

CMD npx prisma db push --accept-data-loss 2>/dev/null || true && npm start
