package config

import (
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

const (
	defaultPort            = "3001"
	defaultWebOrigin       = "http://localhost:3000"
	defaultShutdownTimeout = 10 * time.Second
	defaultRequestTimeout  = 30 * time.Second
	defaultDBMaxConns      = int32(5)
)

type Config struct {
	Port            string
	WebOrigin       string
	DatabaseURL     string
	ShutdownTimeout time.Duration
	RequestTimeout  time.Duration
	DBMaxConns      int32
}

func Load() (Config, error) {
	loadLocalEnv()

	databaseURL, err := normalizeDatabaseURL(strings.TrimSpace(os.Getenv("DATABASE_URL")))
	if err != nil {
		return Config{}, err
	}

	port := firstNonEmpty(os.Getenv("PORT"), os.Getenv("API_PORT"), defaultPort)
	if _, err := strconv.ParseUint(port, 10, 16); err != nil {
		return Config{}, fmt.Errorf("PORT must be a valid TCP port: %w", err)
	}

	maxConns, err := int32Env("DB_MAX_CONNS", defaultDBMaxConns)
	if err != nil || maxConns < 1 {
		return Config{}, errors.New("DB_MAX_CONNS must be a positive integer")
	}

	return Config{
		Port:            port,
		WebOrigin:       firstNonEmpty(os.Getenv("WEB_ORIGIN"), defaultWebOrigin),
		DatabaseURL:     databaseURL,
		ShutdownTimeout: durationEnv("SHUTDOWN_TIMEOUT", defaultShutdownTimeout),
		RequestTimeout:  durationEnv("REQUEST_TIMEOUT", defaultRequestTimeout),
		DBMaxConns:      maxConns,
	}, nil
}

func DatabaseURL() (string, error) {
	loadLocalEnv()
	return normalizeDatabaseURL(strings.TrimSpace(os.Getenv("DATABASE_URL")))
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func durationEnv(key string, fallback time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(value)
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}

func int32Env(key string, fallback int32) (int32, error) {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback, nil
	}
	parsed, err := strconv.ParseInt(value, 10, 32)
	return int32(parsed), err
}

// Prisma's `schema=public` query parameter is not a PostgreSQL connection parameter. pgx/libpq
// correctly support the equivalent `search_path=public`, so translate it at the process boundary
// and keep the shared repository .env unchanged during the parallel rewrite.
func normalizeDatabaseURL(raw string) (string, error) {
	if raw == "" {
		return "", errors.New("DATABASE_URL is required")
	}
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return "", errors.New("DATABASE_URL must be a valid PostgreSQL URL")
	}
	query := parsed.Query()
	if schema := query.Get("schema"); schema != "" {
		query.Del("schema")
		if query.Get("search_path") == "" {
			query.Set("search_path", schema)
		}
	}
	if query.Get("sslmode") == "" && (parsed.Hostname() == "localhost" || parsed.Hostname() == "127.0.0.1" || parsed.Hostname() == "::1") {
		query.Set("sslmode", "disable")
	}
	parsed.RawQuery = query.Encode()
	return parsed.String(), nil
}

// Local development walks upward and loads the repository .env file.
// Injected platform variables keep precedence because godotenv.Load never overwrites them.
func loadLocalEnv() {
	dir, err := os.Getwd()
	if err != nil {
		return
	}
	for {
		path := filepath.Join(dir, ".env")
		if _, err := os.Stat(path); err == nil {
			_ = godotenv.Load(path)
			return
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return
		}
		dir = parent
	}
}
