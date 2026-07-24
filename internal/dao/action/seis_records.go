package action

import (
	"errors"
	"fmt"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/anyshake/observer/internal/dao/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"gorm.io/sharding"
)

var ErrCleanupRunning = errors.New("cleanup task is already running")

func (h *Handler) SeisRecordsGetQueryWindow() time.Duration {
	return time.Hour
}

func (h *Handler) SeisRecordsCreate(records ...model.SeisRecord) error {
	if h.daoObj == nil {
		return errors.New("database is not opened")
	}

	groupedRecords := make(map[int][]model.SeisRecord)

	for _, record := range records {
		t := time.UnixMilli(record.RecordTime).UTC().YearDay()
		groupedRecords[t] = append(groupedRecords[t], record)
	}

	for day, group := range groupedRecords {
		tableName := fmt.Sprintf("%sseis_records_%d", h.daoObj.GetPrefix(), day%model.SEIS_RECORD_SHARDS)

		if err := h.daoObj.Database.Table(tableName).Create(&group).Error; err != nil {
			return fmt.Errorf("failed to insert records for day %d: %w", day, err)
		}
	}

	return nil
}

func (h *Handler) SeisRecordsQuery(startTime, endTime time.Time) ([]model.SeisRecord, error) {
	if h.daoObj == nil {
		return nil, errors.New("database is not opened")
	}

	if startTime.After(endTime) {
		return nil, errors.New("start time is after end time")
	}

	queryWindowLimit := h.SeisRecordsGetQueryWindow()
	if endTime.Sub(startTime) > queryWindowLimit {
		return nil, fmt.Errorf("duration between start time and end time exceeds %.0f minutes limit", queryWindowLimit.Minutes())
	}

	var records []model.SeisRecord
	for currentDay := startTime.UTC().YearDay(); currentDay <= endTime.UTC().YearDay(); currentDay++ {
		tableName := fmt.Sprintf("%sseis_records_%d", h.daoObj.GetPrefix(), currentDay%model.SEIS_RECORD_SHARDS)

		var tempRecords []model.SeisRecord
		err := h.daoObj.Database.
			Table(tableName).
			Where("record_time >= ? AND record_time <= ?", startTime.UnixMilli(), endTime.UnixMilli()).
			Order("record_time ASC").
			Find(&tempRecords).
			Error
		if err != nil {
			return nil, fmt.Errorf("failed to query seismic waveform records in table %s: %w", tableName, err)
		}

		records = append(records, tempRecords...)
	}

	return records, nil
}

func (h *Handler) SeisRecordsPurge(startTime, endTime time.Time) error {
	if h.daoObj == nil {
		return errors.New("database is not opened")
	}

	if startTime.After(endTime) {
		return errors.New("start time is after end time")
	}

	return h.CleanupExclusive(func() error {
		return h.seisRecordsPurgeRange(startTime, endTime)
	})
}

func (h *Handler) SeisRecordsPurgeAll() error {
	if h.daoObj == nil {
		return errors.New("database is not opened")
	}

	return h.CleanupExclusive(func() error {
		return h.seisRecordsForEachShard(func(tableName string) error {
			if err := h.seisRecordsEnsureTable(tableName); err != nil {
				return fmt.Errorf("failed to ensure seismic waveform records table %s: %w", tableName, err)
			}

			if err := h.seisRecordsDeleteAll(tableName); err != nil {
				return fmt.Errorf("failed to purge seismic waveform records table %s: %w", tableName, err)
			}

			return nil
		})
	})
}

func (h *Handler) seisRecordsEnsureTable(tableName string) error {
	tx := h.daoObj.Database.
		Session(&gorm.Session{}).
		Set(sharding.ShardingIgnoreStoreKey, nil).
		Table(tableName)

	if shardingDialector, ok := tx.Dialector.(sharding.ShardingDialector); ok {
		tx.Config.Dialector = shardingDialector.Dialector
	}

	return tx.AutoMigrate(&model.SeisRecord{})
}

func (h *Handler) seisRecordsDeleteAll(tableName string) error {
	quotedTableName, err := h.quoteSQLIdentifier(tableName)
	if err != nil {
		return err
	}

	return h.daoObj.Database.
		Session(&gorm.Session{}).
		Set(sharding.ShardingIgnoreStoreKey, nil).
		Exec(fmt.Sprintf("DELETE FROM %s", quotedTableName)).
		Error
}

func (h *Handler) seisRecordsPurgeRange(startTime, endTime time.Time) error {
	return h.seisRecordsForEachShard(func(tableName string) error {
		if err := h.seisRecordsEnsureTable(tableName); err != nil {
			return fmt.Errorf("failed to ensure seismic waveform records table %s: %w", tableName, err)
		}

		err := h.daoObj.Database.
			Session(&gorm.Session{}).
			Set(sharding.ShardingIgnoreStoreKey, nil).
			Table(tableName).
			Where("record_time >= ? AND record_time <= ?", startTime.UnixMilli(), endTime.UnixMilli()).
			Delete(model.SeisRecord{}).
			Error
		if err != nil {
			return fmt.Errorf("failed to purge seismic waveform records in table %s: %w", tableName, err)
		}

		return nil
	})
}

func (h *Handler) quoteSQLIdentifier(identifier string) (string, error) {
	if identifier == "" {
		return "", errors.New("identifier is empty")
	}

	for _, ch := range identifier {
		if ch >= 'a' && ch <= 'z' {
			continue
		}
		if ch >= 'A' && ch <= 'Z' {
			continue
		}
		if ch >= '0' && ch <= '9' {
			continue
		}
		if ch == '_' {
			continue
		}
		return "", fmt.Errorf("identifier %q contains unsupported character %q", identifier, ch)
	}

	var quoted strings.Builder
	stmt := &gorm.Statement{DB: h.daoObj.Database}
	stmt.QuoteTo(&quoted, clause.Table{Name: identifier})
	return quoted.String(), nil
}

func (h *Handler) seisRecordsForEachShard(fn func(tableName string) error) error {
	sem := make(chan struct{}, h.seisRecordsPurgeConcurrency())
	errs := make(chan error, model.SEIS_RECORD_SHARDS)

	var wg sync.WaitGroup
	for i := 0; i < model.SEIS_RECORD_SHARDS; i++ {
		tableName := fmt.Sprintf("%sseis_records_%d", h.daoObj.GetPrefix(), i)

		sem <- struct{}{}
		wg.Add(1)
		go func() {
			defer wg.Done()
			defer func() { <-sem }()

			if err := fn(tableName); err != nil {
				errs <- err
			}
		}()
	}
	wg.Wait()
	close(errs)

	var joinedErr error
	for err := range errs {
		joinedErr = errors.Join(joinedErr, err)
	}
	return joinedErr
}

func (h *Handler) seisRecordsPurgeConcurrency() int {
	if h.daoObj == nil || h.daoObj.Database == nil {
		return 1
	}

	sqlDB, err := h.daoObj.Database.DB()
	if err != nil {
		return 1
	}

	maxOpenConnections := sqlDB.Stats().MaxOpenConnections
	if maxOpenConnections == 1 {
		return 1
	}

	maxConcurrency := min(runtime.NumCPU(), 8)
	if maxOpenConnections > 1 {
		maxConcurrency = min(maxConcurrency, maxOpenConnections)
	}
	if maxConcurrency < 1 {
		return 1
	}

	return maxConcurrency
}
