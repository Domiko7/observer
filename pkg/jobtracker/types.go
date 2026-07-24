package jobtracker

type JobStatus string

const (
	JobStatusIdle      JobStatus = "IDLE"
	JobStatusRunning   JobStatus = "RUNNING"
	JobStatusSucceeded JobStatus = "SUCCEEDED"
	JobStatusFailed    JobStatus = "FAILED"
)
