import os
import json
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
import prisma

load_dotenv()

model = SentenceTransformer(os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2"))
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 512))

prisma_client = prisma.Prisma()

def split_text(text: str, chunk_size: int = CHUNK_SIZE) -> list[str]:
    return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]

def generate_embedding(text: str) -> list[float]:
    return model.encode(text).tolist()

def cosine_similarity(a, b):
    dot = sum(x*y for x,y in zip(a,b))
    mag_a = sum(x*x for x in a) ** 0.5
    mag_b = sum(x*x for x in b) ** 0.5
    return dot / (mag_a * mag_b) if mag_a and mag_b else 0

async def store_knowledge(title: str, content: str, source: str = "upload"):
    knowledge = await prisma_client.knowledge.create(
        data={"title": title, "content": content, "source": source}
    )
    chunks = split_text(content)
    for chunk in chunks:
        embedding = generate_embedding(chunk)
        await prisma_client.chunk.create(
            data={
                "knowledgeId": knowledge.id,
                "content": chunk,
                "embedding": json.dumps(embedding),
            }
        )
    return knowledge.id

async def search_similar(query: str, limit: int = 5):
    query_vec = generate_embedding(query)
    all_chunks = await prisma_client.chunk.find_many(include={"knowledge": True})
    scored = []
    for c in all_chunks:
        emb = json.loads(c.embedding)
        sim = cosine_similarity(query_vec, emb)
        scored.append({
            "id": c.id,
            "content": c.content,
            "title": c.knowledge.title,
            "source": c.knowledge.source,
            "similarity": round(sim, 4)
        })
    scored.sort(key=lambda x: x["similarity"], reverse=True)
    return scored[:limit]