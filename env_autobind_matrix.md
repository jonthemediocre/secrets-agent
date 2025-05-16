# 🔐 Secrets Agent – AI DevStack .env Binding Matrix

---

## 🧠 AI + MODEL ROUTERS

| Provider      | CLI Command                   | Keys Required                   |
|---------------|-------------------------------|----------------------------------|
| OpenAI        | vanta ai route openai         | OPENAI_API_KEY                   |
| Anthropic     | vanta ai route claude         | CLAUDE_API_KEY                   |
| HuggingFace   | vanta ai route hf             | HUGGINGFACE_TOKEN                |
| Replicate     | vanta ai route replicate      | REPLICATE_API_TOKEN              |
| Ollama (local)| vanta ai route ollama         | N/A                              |

---

## 🧠 VECTOR STORES

| Provider      | CLI Command                    | Keys Required                   |
|---------------|--------------------------------|----------------------------------|
| Pinecone       | vanta vector bind pinecone     | PINECONE_API_KEY, PINECONE_ENV  |
| Chroma         | vanta vector bind chroma       | CHROMA_DB_PATH or CHROMA_HOST   |
| Qdrant         | vanta vector bind qdrant       | QDRANT_HOST, QDRANT_API_KEY     |
| Weaviate       | vanta vector bind weaviate     | WEAVIATE_HOST, WEAVIATE_API_KEY |
| Milvus         | vanta vector bind milvus       | MILVUS_HOST, MILVUS_PORT        |

---

## 🔢 DATABASES

| Provider      | CLI Command                    | Keys Required                     |
|---------------|--------------------------------|------------------------------------|
| PostgreSQL     | vanta db bind postgres         | DATABASE_URL                       |
| Neon.tech      | vanta db bind neon             | NEON_POSTGRES_URL                  |
| PlanetScale    | vanta db bind planetscale      | PLANETSCALE_DB_URL, TOKEN          |

---

## 📊 ANALYTICS / MONITORING

| Provider      | CLI Command                    | Keys Required                   |
|---------------|--------------------------------|----------------------------------|
| LangSmith      | vanta trace bind langsmith     | LANGCHAIN_API_KEY, PROJECT       |
| PostHog        | vanta metrics bind posthog     | POSTHOG_API_KEY, POSTHOG_HOST    |
| Sentry         | vanta monitor bind sentry      | SENTRY_DSN                       |

---

## 🔁 QUEUES / BROKERS

| Provider      | CLI Command                    | Keys Required                     |
|---------------|--------------------------------|------------------------------------|
| Redis          | vanta queue bind redis         | REDIS_URL                          |
| Celery         | vanta queue bind celery        | CELERY_BROKER_URL                  |

---

## 💾 STORAGE / MEDIA

| Provider      | CLI Command                    | Keys Required                     |
|---------------|--------------------------------|------------------------------------|
| Cloudinary     | vanta asset bind cloudinary    | CLOUDINARY_CLOUD_NAME, KEY, SECRET|
| imgix          | vanta asset bind imgix         | IMGIX_DOMAIN, IMGIX_TOKEN          |

---

## 🔌 AGENT INFRA + CLOUD

| Provider      | CLI Command                    | Keys Required                     |
|---------------|--------------------------------|------------------------------------|
| LangGraph      | vanta agent bind langgraph     | LANGGRAPH_API_KEY                  |
| Modal.com      | vanta agent bind modal         | MODAL_TOKEN_ID, MODAL_TOKEN_SECRET |
| Render         | vanta deploy bind render       | RENDER_TOKEN                       |
| Railway        | vanta deploy bind railway      | RAILWAY_TOKEN                      |
| Val Town       | vanta script bind valtown      | VALTOWN_API_KEY                    |

---