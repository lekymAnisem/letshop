FROM node:20-bookworm-slim

WORKDIR /app

RUN groupadd -r appgroup && useradd -r -g appgroup appuser

RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate

USER appuser

EXPOSE 5000

CMD ["npm", "start"]
