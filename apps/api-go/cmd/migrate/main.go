package main

import (
	"fmt"
	"log/slog"
	"os"

	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/config"
	appmigrations "github.com/dangquangmedia/affiliate-global/apps/api-go/internal/migrations"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	databaseURL, err := config.DatabaseURL()
	if err != nil {
		logger.Error("migration_config_invalid", "error", err)
		os.Exit(1)
	}

	command := "up"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}

	path, err := appmigrations.ResolvePath(os.Getenv("MIGRATIONS_PATH"))
	if err != nil {
		logger.Error("migration_path_invalid", "error", err)
		os.Exit(1)
	}

	switch command {
	case "up":
		if err := appmigrations.Up(databaseURL, path); err != nil {
			logger.Error("migration_failed", "error", err)
			os.Exit(1)
		}
		logger.Info("migration_complete", "path", path)
	case "version":
		version, dirty, err := appmigrations.Version(databaseURL, path)
		if err != nil {
			logger.Error("migration_version_failed", "error", err)
			os.Exit(1)
		}
		fmt.Printf("version=%d dirty=%t\n", version, dirty)
	default:
		logger.Error("migration_command_invalid", "command", command, "allowed", "up|version")
		os.Exit(2)
	}
}
