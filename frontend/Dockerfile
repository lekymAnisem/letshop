FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# ✅ ADD THIS (IMPORTANT)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# build must happen AFTER env is set
RUN npm run build


FROM nginx:alpine

RUN apk upgrade --no-cache

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]