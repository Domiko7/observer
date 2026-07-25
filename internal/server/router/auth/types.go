package auth

import (
	"sync"
	"time"

	"github.com/alphadose/haxmap"
	"github.com/anyshake/observer/internal/dao/action"
	lru "github.com/hashicorp/golang-lru/v2"
)

const LOG_PREFIX = "restful_api_auth"

// maxPendingChallenges caps in-flight PoW challenges to avoid unbounded memory growth.
const maxPendingChallenges = 256

// sharedKeyPairTTL controls how long a reused RSA key pair remains valid.
// This avoids generating a 2048-bit key on every preauth request.
const sharedKeyPairTTL = 5 * time.Minute

type auth struct {
	actionHandler     *action.Handler                     // action handler for accessing the database
	nonceCache        *lru.Cache[string, time.Time]       // key: nonce, value: time.Time
	keyPairDataPool   *haxmap.Map[string, *keyPair]       // key: SHA-512 hash of the public key, value: keyPair
	authChallengePool *haxmap.Map[string, *authChallenge] // key: Random string as ID, value: authChallenge
	keyPairMu         sync.Mutex
}
