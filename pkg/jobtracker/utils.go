package jobtracker

import (
	"time"
)

func cloneTime(val *time.Time) *time.Time {
	if val == nil {
		return nil
	}

	cloned := *val
	return &cloned
}

func cloneJob(job Job) *Job {
	return &Job{
		ID:         job.ID,
		Kind:       job.Kind,
		Status:     job.Status,
		StartedAt:  cloneTime(job.StartedAt),
		FinishedAt: cloneTime(job.FinishedAt),
		Error:      job.Error,
	}
}
