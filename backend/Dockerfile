# Stage 1: Build Go Backend
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod tidy
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server .

# Stage 2: Runner
FROM alpine:latest
WORKDIR /app
RUN apk --no-cache add ca-certificates tzdata zip
# Copy built Go binary
COPY --from=builder /app/server /app/server
# Expose HTTP port
EXPOSE 8080
# Set timezone to Vietnam
ENV TZ=Asia/Ho_Chi_Minh
# Run the server
CMD ["/app/server"]
