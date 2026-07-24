package jobtracker

import (
	"fmt"
	"time"

	"github.com/anyshake/observer/pkg/logger"
)

func (t *Tracker) Get() *Job {
	t.mu.Lock()
	defer t.mu.Unlock()

	return cloneJob(t.job)
}

func (t *Tracker) Start(now time.Time, kind string, fn func() error) *Job {
	t.mu.Lock()
	if t.job.Status == JobStatusRunning {
		defer t.mu.Unlock()
		return cloneJob(t.job)
	}

	t.job = Job{
		ID:         fmt.Sprintf("%d", now.UnixMilli()),
		Kind:       kind,
		Status:     JobStatusRunning,
		_startedAt: time.Now(),
		StartedAt:  &now,
	}
	job := cloneJob(t.job)
	t.mu.Unlock()

	go func() {
		if err := fn(); err != nil {
			logger.GetLogger("job_tracker").Errorf("failed to run %s job %s: %v", job.Kind, job.ID, err)
			t.finish(JobStatusFailed, err)
			return
		}

		t.finish(JobStatusSucceeded, nil)
	}()

	return job
}

func (t *Tracker) finish(status JobStatus, err error) {
	t.mu.Lock()
	defer t.mu.Unlock()

	elapsed := time.Since(t.job._startedAt)
	finishedAt := t.job.StartedAt.Add(elapsed)

	t.job.Status = status
	t.job.FinishedAt = &finishedAt
	if err != nil {
		t.job.Error = err
	}
}
