FROM node:20-alpine

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

RUN apk add --no-cache openssl1.1-compat

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate

USER appuser

EXPOSE 5000

CMD ["npm", "start"]
