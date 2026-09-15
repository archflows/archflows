CREATE TABLE IF NOT EXISTS api_keys (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  secret TEXT NOT NULL UNIQUE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS api_keys_active_hash_idx ON api_keys (key_hash) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS api_keys_role_idx ON api_keys (role);

CREATE TABLE IF NOT EXISTS docs_users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'partner', 'viewer')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS docs_users_active_idx ON docs_users (username) WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS locks (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('lock', 'vest')),
  token TEXT NOT NULL,
  beneficiary TEXT NOT NULL,
  creator TEXT NOT NULL,
  amount TEXT NOT NULL,
  claimed TEXT NOT NULL DEFAULT '0',
  start_at BIGINT NOT NULL,
  cliff_at BIGINT NOT NULL,
  end_at BIGINT NOT NULL,
  fee_usdc TEXT NOT NULL DEFAULT '10000000',
  tx_hash TEXT,
  unlock_tx_hash TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS locks_creator_idx ON locks (creator);
CREATE INDEX IF NOT EXISTS locks_beneficiary_idx ON locks (beneficiary);
CREATE INDEX IF NOT EXISTS locks_token_idx ON locks (token);
CREATE INDEX IF NOT EXISTS locks_kind_idx ON locks (kind);
CREATE INDEX IF NOT EXISTS locks_created_at_idx ON locks (created_at DESC);

ALTER TABLE locks ADD COLUMN IF NOT EXISTS unlock_tx_hash TEXT;

UPDATE locks
SET unlock_tx_hash = tx_hash
WHERE unlock_tx_hash IS NULL
  AND tx_hash IS NOT NULL
  AND claimed IS NOT NULL
  AND claimed <> '0';

CREATE TABLE IF NOT EXISTS streams (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL,
  amount TEXT NOT NULL,
  withdrawn TEXT NOT NULL DEFAULT '0',
  start_at BIGINT NOT NULL,
  cliff_at BIGINT NOT NULL,
  end_at BIGINT NOT NULL,
  period INTEGER NOT NULL DEFAULT 1,
  cancelable BOOLEAN NOT NULL DEFAULT TRUE,
  transferable BOOLEAN NOT NULL DEFAULT TRUE,
  can_topup BOOLEAN NOT NULL DEFAULT TRUE,
  canceled BOOLEAN NOT NULL DEFAULT FALSE,
  tx_hash TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS streams_sender_idx ON streams (sender);
CREATE INDEX IF NOT EXISTS streams_recipient_idx ON streams (recipient);
CREATE INDEX IF NOT EXISTS streams_token_idx ON streams (token);
CREATE INDEX IF NOT EXISTS streams_created_at_idx ON streams (created_at DESC);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  funder TEXT NOT NULL,
  merkle_root TEXT NOT NULL,
  deposited TEXT NOT NULL,
  claimed TEXT NOT NULL DEFAULT '0',
  claim_start BIGINT NOT NULL,
  claim_end BIGINT NOT NULL,
  vest_duration BIGINT NOT NULL DEFAULT 0,
  vest_cliff_delay BIGINT NOT NULL DEFAULT 0,
  canceled BOOLEAN NOT NULL DEFAULT FALSE,
  tx_hash TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS campaigns_funder_idx ON campaigns (funder);
CREATE INDEX IF NOT EXISTS campaigns_token_idx ON campaigns (token);
CREATE INDEX IF NOT EXISTS campaigns_created_at_idx ON campaigns (created_at DESC);

CREATE TABLE IF NOT EXISTS campaign_claims (
  campaign_id TEXT NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  claim_index TEXT NOT NULL,
  account TEXT NOT NULL,
  receiver TEXT NOT NULL,
  amount TEXT NOT NULL,
  stream_id TEXT,
  tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (campaign_id, claim_index)
);

CREATE INDEX IF NOT EXISTS campaign_claims_account_idx ON campaign_claims (account);
CREATE INDEX IF NOT EXISTS campaign_claims_created_at_idx ON campaign_claims (created_at DESC);

CREATE TABLE IF NOT EXISTS escrow_deals (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  buyer TEXT NOT NULL,
  seller TEXT NOT NULL,
  amount TEXT NOT NULL,
  unlock_at BIGINT NOT NULL,
  terms_hash TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'released', 'refunded')),
  tx_hash TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS escrow_buyer_idx ON escrow_deals (buyer);
CREATE INDEX IF NOT EXISTS escrow_seller_idx ON escrow_deals (seller);
CREATE INDEX IF NOT EXISTS escrow_token_idx ON escrow_deals (token);
CREATE INDEX IF NOT EXISTS escrow_status_idx ON escrow_deals (status);
CREATE INDEX IF NOT EXISTS escrow_created_at_idx ON escrow_deals (created_at DESC);

CREATE TABLE IF NOT EXISTS staking_pools (
  id TEXT PRIMARY KEY,
  stake_token TEXT NOT NULL,
  reward_token TEXT NOT NULL,
  owner TEXT NOT NULL,
  min_lock BIGINT NOT NULL DEFAULT 0,
  total_staked TEXT NOT NULL DEFAULT '0',
  cap TEXT,
  expires_at BIGINT,
  paused BOOLEAN NOT NULL DEFAULT FALSE,
  tx_hash TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS staking_pools_owner_idx ON staking_pools (owner);
CREATE INDEX IF NOT EXISTS staking_pools_stake_token_idx ON staking_pools (stake_token);
CREATE INDEX IF NOT EXISTS staking_pools_created_at_idx ON staking_pools (created_at DESC);

CREATE TABLE IF NOT EXISTS stakes (
  pool_id TEXT NOT NULL REFERENCES staking_pools (id) ON DELETE CASCADE,
  account TEXT NOT NULL,
  amount TEXT NOT NULL DEFAULT '0',
  unlock_at BIGINT NOT NULL DEFAULT 0,
  rewards TEXT NOT NULL DEFAULT '0',
  tx_hash TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (pool_id, account)
);

CREATE INDEX IF NOT EXISTS stakes_account_idx ON stakes (account);

CREATE INDEX IF NOT EXISTS locks_tx_hash_idx ON locks (tx_hash);
CREATE INDEX IF NOT EXISTS locks_unlock_tx_hash_idx ON locks (unlock_tx_hash);
CREATE INDEX IF NOT EXISTS streams_tx_hash_idx ON streams (tx_hash);
CREATE INDEX IF NOT EXISTS campaigns_tx_hash_idx ON campaigns (tx_hash);
CREATE INDEX IF NOT EXISTS escrow_tx_hash_idx ON escrow_deals (tx_hash);
CREATE INDEX IF NOT EXISTS staking_pools_tx_hash_idx ON staking_pools (tx_hash);
