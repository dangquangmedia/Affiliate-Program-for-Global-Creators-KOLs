package main

import (
	"context"
	"log/slog"
	"os"

	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/config"
	appseed "github.com/dangquangmedia/affiliate-global/apps/api-go/internal/seed"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	databaseURL, err := config.DatabaseURL()
	if err != nil {
		logger.Error("seed_config_invalid", "error", err)
		os.Exit(1)
	}

	seedName := "demo.sql"
	if len(os.Args) > 1 {
		seedName = os.Args[1]
	}
	path, err := appseed.ResolvePath(os.Getenv("SEEDS_PATH"), seedName)
	if err != nil {
		logger.Error("seed_path_invalid", "error", err)
		os.Exit(1)
	}
	if err := appseed.Apply(context.Background(), databaseURL, path); err != nil {
		logger.Error("seed_failed", "error", err)
		os.Exit(1)
	}
	logger.Info("seed_complete", "seed", seedName)
}
