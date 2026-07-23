FROM golang:1.26.5-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api \
    && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o /out/migrate ./cmd/migrate \
    && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o /out/seed ./cmd/seed \
    && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o /out/reclaim ./cmd/reclaim

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=build /out/api /app/api
COPY --from=build /out/migrate /app/migrate
COPY --from=build /out/seed /app/seed
COPY --from=build /out/reclaim /app/reclaim
COPY db/migrations /app/migrations
COPY db/seeds /app/seeds
USER nonroot:nonroot
ENV MIGRATIONS_PATH=/app/migrations
ENV SEEDS_PATH=/app/seeds
# Cloud Run injects PORT; default to its convention so the image behaves identically when run
# locally for a staging rehearsal. Cloud Run Jobs reuse this image with a different entrypoint
# (`/app/migrate`, `/app/reclaim`, `/app/seed`).
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["/app/api"]
