CREATE EXTENSION IF NOT EXISTS vector;
CREATE DATABASE IF NOT EXISTS rag_task_db;
\c rag_task_db;
CREATE INDEX IF NOT EXISTS idx_chunk_embedding 
ON "Chunk" USING hnsw (embedding vector_cosine_ops);
