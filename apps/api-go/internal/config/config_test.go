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

// Cloud Run connects to Cloud SQL through a unix socket, so the DSN has no TCP host at all.
func TestCloudSQLUnixSocketDSNIsAccepted(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgresql://app:secret@/affiliate_global?host=/cloudsql/proj:asia-southeast1:affiliate-pg")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.DatabaseURL != "postgresql://app:secret@/affiliate_global?host=%2Fcloudsql%2Fproj%3Aasia-southeast1%3Aaffiliate-pg&sslmode=disable" {
		t.Fatalf("DatabaseURL = %q", cfg.DatabaseURL)
	}
}

func TestDatabaseURLWithoutHostOrSocketIsRejected(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgresql:///affiliate_global")
	if _, err := Load(); err == nil {
		t.Fatal("Load() error = nil, want invalid DATABASE_URL error")
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
