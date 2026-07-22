package integration

import (
	"context"
	"testing"
	"time"

	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/config"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/database"
)

func TestPostgresSchemaParity(t *testing.T) {
	cfg, err := config.Load()
	if err != nil {
		t.Skipf("integration database not configured: %v", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	db, err := database.Open(ctx, cfg.DatabaseURL, 1)
	if err != nil {
		t.Fatalf("database.Open() error = %v", err)
	}
	defer db.Close()

	var tables int
	err = db.Pool().QueryRow(ctx, `
		SELECT count(*)
		FROM information_schema.tables
		WHERE table_schema = 'public'
		  AND table_type = 'BASE TABLE'
		  AND table_name NOT IN ('_prisma_migrations', 'schema_migrations')
	`).Scan(&tables)
	if err != nil {
		t.Fatalf("count tables: %v", err)
	}
	if tables != 20 {
		t.Fatalf("application tables = %d, want 20", tables)
	}

	var enums int
	err = db.Pool().QueryRow(ctx, `
		SELECT count(*)
		FROM pg_type t
		JOIN pg_namespace n ON n.oid = t.typnamespace
		WHERE n.nspname = 'public' AND t.typtype = 'e'
	`).Scan(&enums)
	if err != nil {
		t.Fatalf("count enums: %v", err)
	}
	if enums != 15 {
		t.Fatalf("application enums = %d, want 15", enums)
	}
}
