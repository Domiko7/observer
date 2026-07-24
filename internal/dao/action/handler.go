package action

import (
	"sync"

	"github.com/anyshake/observer/internal/dao"
)

type Handler struct {
	daoObj    *dao.DAO
	cleanupMu sync.Mutex
}

func NewHandler(daoObj *dao.DAO) *Handler {
	return &Handler{daoObj: daoObj}
}

func (h *Handler) CleanupExclusive(fn func() error) error {
	if !h.cleanupMu.TryLock() {
		return ErrCleanupRunning
	}
	defer h.cleanupMu.Unlock()

	return fn()
}
