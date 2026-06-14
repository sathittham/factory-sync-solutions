FROM golang:1.26.4-alpine AS builder

WORKDIR /app
RUN apk --no-cache add build-base
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go run github.com/swaggo/swag/cmd/swag init -g main.go -o docs/v1 --parseDependency --parseInternal
RUN CGO_ENABLED=1 go build -o server .

FROM alpine:3.21
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/server .
COPY --from=builder /app/config ./config

EXPOSE 8080
CMD ["./server"]
