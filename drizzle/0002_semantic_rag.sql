CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS semantic_rag_migrations (
  id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE policy_chunks
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS embedding_provider text,
  ADD COLUMN IF NOT EXISTS embedding_model text,
  ADD COLUMN IF NOT EXISTS embedded_at timestamptz;

CREATE INDEX IF NOT EXISTS policy_chunks_embedding_hnsw_idx
  ON policy_chunks USING hnsw (embedding vector_cosine_ops);

INSERT INTO semantic_rag_migrations (id)
VALUES ('0002_semantic_rag')
ON CONFLICT (id) DO NOTHING;
