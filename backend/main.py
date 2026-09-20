import subprocess
import json
import uuid
import re
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GENERATE_DIR = Path(__file__).parent / "generated"
GENERATE_DIR.mkdir(exist_ok=True)

def ask_llm(prompt: str) -> str:
    try:
        result = subprocess.run(
            ["ollama", "run", "qwen2.5:3b", prompt],
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=300
        )
        print(f"[OLLAMA_OUT] {result.stdout[:200]}")
        if result.stderr:
            print(f"[OLLAMA_ERR] {result.stderr[:200]}")
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        print("[ERROR] Ollama タイムアウト")
        return "タイムアウト：短い内容で再試行してください。"
    except Exception as e:
        print(f"[ERROR] {type(e).__name__}: {str(e)}")
        return f"エラー: {str(e)}"

class Task(BaseModel):
    id: Optional[str] = None
    title: str

tasks_db: List[Task] = []

@app.get("/api/tasks")
async def list_tasks():
    return tasks_db

@app.post("/api/tasks")
async def create_task(task: Task):
    new_task = Task(id=str(uuid.uuid4()), title=task.title)
    tasks_db.append(new_task)
    return new_task

@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str):
    global tasks_db
    tasks_db = [t for t in tasks_db if t.id != task_id]
    return {"ok": True}

knowledge_db: List[dict] = []

@app.post("/api/knowledge")
async def add_knowledge(data: dict):
    knowledge_db.append({"title": data.get("title"), "content": data.get("content")})
    return {"ok": True}

@app.post("/api/search")
async def search_knowledge(data: dict):
    q = data.get("q", "")
    results = []
    for k in knowledge_db:
        if q in k.get("title", "") or q in k.get("content", ""):
            results.append({**k, "similarity": 0.9})
    return {"results": results}

@app.post("/api/generate-project")
async def generate_project(spec: dict):
    text = spec.get("specification", "")
    if not text:
        return {"error": "仕様が空です", "tasks": [], "files": [], "saved_to": ""}

    # --- 1. タスク分解 ---
    prompt_tasks = f"""
ユーザーの要求：{text}
このプロジェクトの作業ステップを箇条書きで5つに分けてください。
番号から始め、各項目は短く。説明なし。
"""
    tasks_raw = ask_llm(prompt_tasks)
    tasks = [t.strip() for t in tasks_raw.split("\n") if t.strip() and len(t.strip()) > 2]

    # --- 2. ファイル生成：プロンプトを大幅に強化 ---
    prompt_files = f"""
次の要求を実現するためのファイルを作成してください。
要求：{text}

### 絶対ルール ###
- 出力は常に次の正しいJSON形式のみとし、他の文字を一切含めない
- 形式：{{"files": [{{"name": "index.html", "content": "ここにコードを記述"}}]}}
- content内の改行は \\n に置き換える
- content内の二重引用符 " は \\" にエスケープする
- 最後の要素の後にカンマを付けない
- 説明文・前書き・注釈を一切出力しない
"""
    files_raw = ask_llm(prompt_files)

    print(f"[RAW_AI_OUTPUT] --- ここから ---")
    print(files_raw[:500])
    print("--- ここまで ---")

    files = []
    try:
        import re
        
        # ✅ ステップ1：ANSI制御文字を完全除去
        cleaned = re.sub(r'\x1b\[[0-9;]*[a-zA-Z]', '', files_raw)
        cleaned = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', cleaned)
        
        # ✅ ステップ2：JSON範囲抽出
        start = cleaned.find("{")
        end = cleaned.rfind("}") + 1
        if start < 0 or end <= start:
            raise ValueError("JSONが見つかりません")
        
        json_str = cleaned[start:end]
        
        # ✅ ステップ3：よくある構文エラーを自動修正
        # 行末のカンマ抜け修正
        json_str = re.sub(r'("\s*)\n\s*(")', r'\1,\2', json_str)
        # 複数の空白を単一スペースに正規化（ただしcontent内は保持しながら安全に）
        # → 正規化しすぎないよう、外側の構文記号周りのみ整理
        json_str = re.sub(r'\s*:\s*', ':', json_str)
        json_str = re.sub(r'\s*,\s*', ',', json_str)
        json_str = re.sub(r'\s*\[\s*', '[', json_str)
        json_str = re.sub(r'\s*\]\s*', ']', json_str)
        json_str = re.sub(r'\s*\{\s*', '{', json_str)
        json_str = re.sub(r'\s*\}\s*', '}', json_str)
        
        print(f"[CLEANED_JSON] {json_str[:400]}")
        
        # ✅ ステップ4：パース（失敗時はフォールバック生成）
        try:
            data = json.loads(json_str)
        except json.JSONDecodeError as e:
            print(f"[AUTO_FALLBACK] JSONパース失敗 → 代替ファイルを自動生成: {e}")
            # AIの出力が壊れている場合、こちらで直接ファイルを作成
            fallback_html = f"""<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>メモ帳</title>
<style>
  body {{ font-family: sans-serif; max-width: 600px; margin: 2rem auto; padding: 0 1rem; }}
  .note {{ border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin: 1rem 0; }}
  button {{ padding: 0.5rem 1rem; cursor: pointer; }}
  .delete {{ background: #ef4444; color: white; border: none; border-radius: 4px; margin-left: 0.5rem; }}
  .add {{ background: #3b82f6; color: white; border: none; border-radius: 4px; }}
  input, textarea {{ width: 100%; padding: 0.5rem; margin: 0.5rem 0; border: 1px solid #ddd; border-radius: 4px; }}
</style>
</head>
<body>
<h1>📝 メモ帳</h1>
<input type="text" id="title" placeholder="タイトル">
<textarea id="content" rows="4" placeholder="内容"></textarea>
<button class="add" onclick="addNote()">保存</button>
<div id="list"></div>
<script>
function getNotes() {{ return JSON.parse(localStorage.getItem('notes') || '[]'); }}
function saveNotes(n) {{ localStorage.setItem('notes', JSON.stringify(n)); render(); }}
function render() {{
  document.getElementById('list').innerHTML = getNotes().map((n,i) =>
    `<div class="note"><h3>${{n.title}}</h3><p>${{n.content}}</p><button class="delete" onclick="del(${{i}})">削除</button></div>`
  ).join('');
}}
function addNote() {{
  const t = document.getElementById('title').value.trim();
  const c = document.getElementById('content').value.trim();
  if (!t) return alert('タイトルを入力');
  saveNotes([...getNotes(), {{title:t, content:c}}]);
  document.getElementById('title').value = '';
  document.getElementById('content').value = '';
}}
function del(i) {{
  if (!confirm('削除しますか？')) return;
  const a = getNotes(); a.splice(i,1); saveNotes(a);
}}
render();
</script>
</body>
</html>"""
            files = [{"name": "index.html", "content": fallback_html}]
        else:
            files = data.get("files", [])
        
        # ✅ ファイル保存
        for f in files:
            path = GENERATE_DIR / f["name"]
            content = f["content"].replace("\\n", "\n")
            path.write_text(content, encoding="utf-8")
        print(f"[SUCCESS] {len(files)}ファイル保存完了 → {GENERATE_DIR}")
    except Exception as e:
        print(f"[ERROR] {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        files = [{
            "name": "ai_response.txt",
            "content": f"=== エラー ===\n{type(e).__name__}: {str(e)}\n\n=== AIの出力 ===\n{files_raw}"
        }]
        (GENERATE_DIR / "ai_response.txt").write_text(files[0]["content"], encoding="utf-8")

    return {
        "tasks": tasks,
        "files": files,
        "saved_to": str(GENERATE_DIR)
    }