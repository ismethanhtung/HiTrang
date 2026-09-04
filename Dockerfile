# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
# Run npm install or npm ci (npm install is safer in case lock file differs)
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Build Go Backend
FROM golang:1.21-alpine AS backend-builder
WORKDIR /app
COPY backend/ ./
RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -trimpath -o /app/server .

# Stage 3: Runner
FROM alpine:latest
WORKDIR /app
RUN apk --no-cache add ca-certificates tzdata zip
# Copy built Go binary
COPY --from=backend-builder /app/server /app/server
# Copy static frontend assets
COPY --from=frontend-builder /app/dist /app/dist
# Expose HTTP port
EXPOSE 8080
# Set timezone to Vietnam
ENV TZ=Asia/Ho_Chi_Minh
# Run the server
CMD ["/app/server"]
