package auth_jwt

import (
	"crypto/rand"
	"fmt"
)

func createJwtSecret() ([]byte, error) {
	secret := make([]byte, 32)
	if _, err := rand.Read(secret); err != nil {
		return nil, fmt.Errorf("failed to generate random JWT secret: %w", err)
	}
	return secret, nil
}
