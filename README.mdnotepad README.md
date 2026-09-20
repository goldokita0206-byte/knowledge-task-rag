# 🧠 Knowledge-Task RAG

ローカルLLMで動作するタスク管理 × ナレッジ検索 × AIコード生成アプリ。
インターネット不要で完全オフライン稼働。

## 機能
- 📋 タスク管理
- 📄 ナレッジ登録・類似度検索
- 🤖 Ollama連携によるプロジェクト自動生成

## 環境
- Windows 10/11
- Python 3.14+
- Node.js 18+
- Ollama + qwen2.5:3b

## 起動
```bash
# バックエンド
cd backend
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
prisma db push
uvicorn main:app --reload --port 8000

# フロント
cd ../frontend
npm install
npm run dev
# → http://localhost:3000

knowledge-task-rag/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── prisma/
│   │   └── schema.prisma
│   └── .env.example
├── frontend/
│   ├── app/page.tsx
│   ├── lib/api.ts
│   ├── next.config.js
│   └── package.json
├── docs/
│   ├── openapi.yaml
│   └── SPECIFICATION.md   ← 先ほどの仕様書
├── README.md               ← 使い方・導入手順
└── .gitignore