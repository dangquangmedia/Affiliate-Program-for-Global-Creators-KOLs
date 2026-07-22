package migrations

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func ResolvePath(configured string) (string, error) {
	if strings.TrimSpace(configured) != "" {
		return filepath.Abs(configured)
	}

	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}
	for {
		candidates := []string{
			filepath.Join(dir, "db", "migrations"),
			filepath.Join(dir, "apps", "api-go", "db", "migrations"),
		}
		for _, candidate := range candidates {
			if info, err := os.Stat(candidate); err == nil && info.IsDir() {
				return filepath.Abs(candidate)
			}
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return "", errors.New("db/migrations directory not found")
}

func Up(databaseURL, path string) error {
	migration, err := open(databaseURL, path)
	if err != nil {
		return err
	}
	defer closeMigration(migration)
	if err := migration.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("apply migrations: %w", err)
	}
	return nil
}

func Version(databaseURL, path string) (uint, bool, error) {
	migration, err := open(databaseURL, path)
	if err != nil {
		return 0, false, err
	}
	defer closeMigration(migration)
	version, dirty, err := migration.Version()
	return version, dirty, err
}

func open(databaseURL, path string) (*migrate.Migrate, error) {
	sourceURL := "file://" + filepath.ToSlash(path)
	migration, err := migrate.New(sourceURL, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("open migrations: %w", err)
	}
	return migration, nil
}

func closeMigration(migration *migrate.Migrate) {
	_, _ = migration.Close()
}
