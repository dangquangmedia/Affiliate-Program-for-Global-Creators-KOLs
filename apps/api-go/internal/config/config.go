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
	if err != nil || parsed.Scheme == "" {
		return "", errors.New("DATABASE_URL must be a valid PostgreSQL URL")
	}
	query := parsed.Query()
	// Cloud Run reaches Cloud SQL over a unix socket, so the DSN carries no TCP host:
	// `postgresql://user:pass@/db?host=/cloudsql/PROJECT:REGION:INSTANCE`. Accept that shape and
	// reject only a URL that names neither a TCP host nor a socket directory.
	socketDir := query.Get("host")
	if parsed.Host == "" && !strings.HasPrefix(socketDir, "/") {
		return "", errors.New("DATABASE_URL must be a valid PostgreSQL URL")
	}
	if schema := query.Get("schema"); schema != "" {
		query.Del("schema")
		if query.Get("search_path") == "" {
			query.Set("search_path", schema)
		}
	}
	// TLS is meaningless on a unix socket; anywhere else keep the operator's choice untouched so a
	// remote database is never silently downgraded.
	if query.Get("sslmode") == "" && (isLoopback(parsed.Hostname()) || (parsed.Host == "" && socketDir != "")) {
		query.Set("sslmode", "disable")
	}
	parsed.RawQuery = query.Encode()
	return parsed.String(), nil
}

func isLoopback(host string) bool {
	return host == "localhost" || host == "127.0.0.1" || host == "::1"
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
