package app

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/audit"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/auth"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/campaign"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/config"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/content"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/country"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/database"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/earnings"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/httpapi"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/kyc"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/payout"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/reconciliation"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store/sqlcgen"
)

type Application struct {
	server          *http.Server
	db              *database.DB
	logger          *slog.Logger
	shutdownTimeout time.Duration
}

func New(ctx context.Context, cfg config.Config, logger *slog.Logger) (*Application, error) {
	db, err := database.Open(ctx, cfg.DatabaseURL, cfg.DBMaxConns)
	if err != nil {
		return nil, err
	}
	queries := sqlcgen.New(db.Pool())
	txManager := store.NewTxManager(db.Pool())
	countryService := country.NewService(queries)
	authService := auth.NewService(queries)
	auditService := audit.NewService(queries)
	services := &httpapi.Services{
		Auth:           authService,
		Countries:      countryService,
		KYC:            kyc.NewService(queries, txManager, countryService),
		Campaigns:      campaign.NewService(queries, txManager, countryService),
		Content:        content.NewService(queries, txManager, countryService),
		Earnings:       earnings.NewService(queries, countryService),
		Audit:          auditService,
		Reconciliation: reconciliation.NewService(queries, txManager, countryService),
		Payout:         payout.NewService(queries, txManager, countryService),
	}

	router := httpapi.NewRouter(httpapi.RouterConfig{
		WebOrigin:     cfg.WebOrigin,
		Health:        db,
		Logger:        logger,
		HealthTimeout: cfg.RequestTimeout,
		Services:      services,
	})

	return &Application{
		server: &http.Server{
			Addr:              "0.0.0.0:" + cfg.Port,
			Handler:           router,
			ReadHeaderTimeout: 5_000_000_000,
			ReadTimeout:       cfg.RequestTimeout,
			WriteTimeout:      cfg.RequestTimeout,
			IdleTimeout:       60_000_000_000,
		},
		db:              db,
		logger:          logger,
		shutdownTimeout: cfg.ShutdownTimeout,
	}, nil
}

func (application *Application) Run(ctx context.Context) error {
	errCh := make(chan error, 1)
	go func() {
		application.logger.Info("api_started", "address", application.server.Addr)
		errCh <- application.server.ListenAndServe()
	}()

	select {
	case err := <-errCh:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return fmt.Errorf("serve HTTP: %w", err)
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), application.shutdownTimeout)
		defer cancel()
		if err := application.server.Shutdown(shutdownCtx); err != nil {
			return fmt.Errorf("graceful shutdown: %w", err)
		}
		application.logger.Info("api_stopped")
		return nil
	}
}

func (application *Application) Close() {
	application.db.Close()
}
