FROM node:20-alpine

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate

USER appuser

EXPOSE 5000

CMD ["npm", "start"]
