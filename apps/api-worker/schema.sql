CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    token_id INTEGER NOT NULL,
    arweave_id TEXT,
    song_arweave_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    fulfilled_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_token_id ON orders(token_id);
CREATE INDEX IF NOT EXISTS idx_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_created_at ON orders(created_at);