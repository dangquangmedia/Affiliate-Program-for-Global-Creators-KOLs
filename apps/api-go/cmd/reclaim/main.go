package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/campaign"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/config"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/country"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/database"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store/sqlcgen"
)

// Cloud Run Job entrypoint: perform exactly one finite sweep and exit. Scheduling belongs to
// Cloud Scheduler/Cloud Run Jobs, not to an in-process timer inside the API instance.
func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	cfg, err := config.Load()
	if err != nil {
		logger.Error("reclaim_config_invalid", "error", err)
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	db, err := database.Open(ctx, cfg.DatabaseURL, cfg.DBMaxConns)
	if err != nil {
		logger.Error("reclaim_database_failed", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	queries := sqlcgen.New(db.Pool())
	service := campaign.NewService(queries, store.NewTxManager(db.Pool()), country.NewService(queries))
	result, err := service.ReclaimExpired(ctx, time.Now())
	if err != nil {
		logger.Error("reclaim_sweep_failed", "error", err)
		os.Exit(1)
	}
	logger.Info("reclaim_sweep_complete", "reclaimed", result.Reclaimed, "promoted", result.Promoted)
}
