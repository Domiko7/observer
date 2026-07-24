package jobtracker

import (
	"sync"
	"time"
)

type Job struct {
	ID         string
	Kind       string
	Status     JobStatus
	_startedAt time.Time
	StartedAt  *time.Time
	FinishedAt *time.Time
	Error      error
}

type Tracker struct {
	mu  sync.Mutex
	job Job
}

func New(kind string) *Tracker {
	return &Tracker{
		job: Job{
			ID:     "",
			Kind:   kind,
			Status: JobStatusIdle,
		},
	}
}
