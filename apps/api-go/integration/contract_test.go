package integration

import (
	"encoding/json"
	"os"
	"path/filepath"
	"regexp"
	"testing"
)

func TestFrozenContractHasAllRoutesAndValidGoldens(t *testing.T) {
	root := repositoryRoot(t)
	openAPI := mustRead(t, filepath.Join(root, "packages", "contracts", "openapi", "current.yaml"))
	matrix := mustRead(t, filepath.Join(root, "docs", "API_CONTRACT_CURRENT.md"))

	operationPattern := regexp.MustCompile(`(?m)^    (get|post|put|patch|delete):`)
	if got := len(operationPattern.FindAll(openAPI, -1)); got != 36 {
		t.Fatalf("OpenAPI operations = %d, want 36", got)
	}
	matrixPattern := regexp.MustCompile(`(?m)^\| [0-9]+ \|`)
	if got := len(matrixPattern.FindAll(matrix, -1)); got != 36 {
		t.Fatalf("contract matrix rows = %d, want 36", got)
	}

	goldens, err := filepath.Glob(filepath.Join(root, "packages", "contracts", "golden", "*.json"))
	if err != nil {
		t.Fatal(err)
	}
	if len(goldens) < 8 {
		t.Fatalf("golden fixtures = %d, want at least 8", len(goldens))
	}
	for _, path := range goldens {
		contents := mustRead(t, path)
		var value any
		if err := json.Unmarshal(contents, &value); err != nil {
			t.Errorf("%s is invalid JSON: %v", filepath.Base(path), err)
		}
	}
}

func repositoryRoot(t *testing.T) string {
	t.Helper()
	dir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	for {
		if _, err := os.Stat(filepath.Join(dir, "pnpm-workspace.yaml")); err == nil {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			t.Fatal("repository root not found")
		}
		dir = parent
	}
}

func mustRead(t *testing.T, path string) []byte {
	t.Helper()
	contents, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	return contents
}
