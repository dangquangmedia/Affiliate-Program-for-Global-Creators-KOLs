package config

import (
	"testing"
)

func TestPortPrecedence(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgresql://example")
	t.Setenv("PORT", "8080")
	t.Setenv("API_PORT", "3001")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.Port != "8080" {
		t.Fatalf("Port = %q, want 8080", cfg.Port)
	}
}

func TestDatabaseURLRequired(t *testing.T) {
	t.Setenv("DATABASE_URL", "")
	if _, err := Load(); err == nil {
		t.Fatal("Load() error = nil, want DATABASE_URL error")
	}
}

func TestPrismaSchemaParameterBecomesSearchPath(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgresql://user:pass@localhost:5433/app?schema=public")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.DatabaseURL != "postgresql://user:pass@localhost:5433/app?search_path=public&sslmode=disable" {
		t.Fatalf("DatabaseURL = %q", cfg.DatabaseURL)
	}
}

func TestRemoteDatabaseDoesNotDisableTLS(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgresql://user:pass@10.1.2.3:5432/app?schema=public")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.DatabaseURL != "postgresql://user:pass@10.1.2.3:5432/app?search_path=public" {
		t.Fatalf("DatabaseURL = %q", cfg.DatabaseURL)
	}
}
