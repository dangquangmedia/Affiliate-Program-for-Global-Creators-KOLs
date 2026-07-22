package seed

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/jackc/pgx/v5"
)

func ResolvePath(configuredDir, seedName string) (string, error) {
	if filepath.Base(seedName) != seedName || !strings.HasSuffix(seedName, ".sql") {
		return "", errors.New("seed name must be a .sql filename")
	}
	if strings.TrimSpace(configuredDir) != "" {
		return existing(filepath.Join(configuredDir, seedName))
	}

	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}
	for {
		for _, candidate := range []string{
			filepath.Join(dir, "db", "seeds", seedName),
			filepath.Join(dir, "apps", "api-go", "db", "seeds", seedName),
		} {
			if path, err := existing(candidate); err == nil {
				return path, nil
			}
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return "", fmt.Errorf("seed %q not found", seedName)
}

func Apply(ctx context.Context, databaseURL, path string) error {
	contents, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read seed: %w", err)
	}
	conn, err := pgx.Connect(ctx, databaseURL)
	if err != nil {
		return fmt.Errorf("connect for seed: %w", err)
	}
	defer func() { _ = conn.Close(ctx) }()
	if _, err := conn.Exec(ctx, string(contents)); err != nil {
		return fmt.Errorf("execute seed: %w", err)
	}
	return nil
}

func existing(path string) (string, error) {
	absolute, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}
	info, err := os.Stat(absolute)
	if err != nil || info.IsDir() {
		return "", errors.New("seed file not found")
	}
	return absolute, nil
}
