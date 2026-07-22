package integration

import (
	"context"
	"testing"
	"time"

	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/config"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/database"
)

func TestDatabaseHealthHarness(t *testing.T) {
	cfg, err := config.Load()
	if err != nil {
		t.Skipf("integration database not configured: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	db, err := database.Open(ctx, cfg.DatabaseURL, 1)
	if err != nil {
		t.Fatalf("database.Open() error = %v", err)
	}
	defer db.Close()
	if err := db.Ping(ctx); err != nil {
		t.Fatalf("db.Ping() error = %v", err)
	}
}
