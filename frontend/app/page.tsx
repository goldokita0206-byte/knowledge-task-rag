"use client";
import { useEffect, useState } from "react";
import { api, type Task } from "@/lib/api";

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [knTitle, setKnTitle] = useState("");
  const [knContent, setKnContent] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [specText, setSpecText] = useState("");
  const [decomposedTasks, setDecomposedTasks] = useState<string[]>([]);
  const [generatedFiles, setGeneratedFiles] = useState<any[]>([]);
  const [savePath, setSavePath] = useState("");
  const [activeTab, setActiveTab] = useState<"tasks" | "knowledge" | "search" | "ai">("tasks");

  useEffect(() => { loadTasks(); }, []);

  async function loadTasks() {
    try { setTasks(await api.listTasks()); }
    catch (e) { alert("バックエンド起動を確認してください"); }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setLoading(true);
    try {
      await api.createTask({ title: newTitle });
      setNewTitle("");
      await loadTasks();
    } finally { setLoading(false); }
  }

  async function delTask(id: string) {
    if (!confirm("削除しますか？")) return;
    await api.deleteTask(id);
    await loadTasks();
  }

  async function addKnowledge(e: React.FormEvent) {
    e.preventDefault();
    if (!knTitle.trim() || !knContent.trim()) return;
    setLoading(true);
    try {
      await api.addKnowledge({ title: knTitle, content: knContent });
      alert("登録完了！");
      setKnTitle("");
      setKnContent("");
    } finally { setLoading(false); }
  }

  async function doSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQ.trim()) return;
    setLoading(true);
    setSearchResults([]);
    try {
      const res = await api.search(searchQ);
      setSearchResults(res.results);
    } finally { setLoading(false); }
  }

  async function doDecompose(e: React.FormEvent) {
    e.preventDefault();
    if (!specText.trim()) return;
    setLoading(true);
    setDecomposedTasks([]);
    setGeneratedFiles([]);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/generate-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specification: specText })
      });
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const data = await res.json();
      setDecomposedTasks(data.tasks || []);
      setGeneratedFiles(data.files || []);
      setSavePath(data.saved_to || "");
    } catch (e) {
      console.error(e);
      alert("生成に失敗しました。バックエンド/Ollama起動を確認してください");
    } finally { setLoading(false); }
  }

  async function bulkAddTasks() {
    if (decomposedTasks.length === 0) return;
    for (const t of decomposedTasks) {
      await api.createTask({ title: t });
    }
    alert(`${decomposedTasks.length}件のタスクを一括追加しました`);
    setDecomposedTasks([]);
    setGeneratedFiles([]);
    setSpecText("");
    await loadTasks();
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ fontSize: "1.8rem", color: "#1e293b", marginBottom: "1.5rem" }}>
        🧠 Knowledge-Task RAG
      </h1>
      
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid #e2e8f0", flexWrap: "wrap" }}>
        {(["tasks", "knowledge", "search", "ai"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "0.75rem 1rem",
              border: "none",
              background: activeTab === tab ? "#eff6ff" : "transparent",
              color: activeTab === tab ? "#2563eb" : "#64748b",
              borderBottom: activeTab === tab ? "2px solid #2563eb" : "2px solid transparent",
              cursor: "pointer",
              fontWeight: activeTab === tab ? 600 : 400,
            }}
          >
            {tab === "tasks" && "📋 タスク"}
            {tab === "knowledge" && "📄 ナレッジ"}
            {tab === "search" && "🔍 検索"}
            {tab === "ai" && "🤖 AI生成"}
          </button>
        ))}
      </div>

      {activeTab === "tasks" && (
        <>
          <section style={{ background: "white", padding: "1.5rem", borderRadius: "0.75rem", marginBottom: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>新規タスク追加</h2>
            <form onSubmit={addTask} style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="タスク名を入力..."
                style={{ flex: 1, padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "0.5rem", fontSize: "1rem" }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{ padding: "0.75rem 1.25rem", background: "#3b82f6", color: "white", border: "none", borderRadius: "0.5rem", cursor: "pointer" }}
              >
                追加
              </button>
            </form>
          </section>
          
          <section style={{ background: "white", padding: "1.5rem", borderRadius: "0.75rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>タスク一覧 ({tasks.length})</h2>
            {tasks.length === 0 ? (
              <p style={{ color: "#64748b" }}>タスクがありません。上から追加してください。</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, marginTop: "0.5rem" }}>
                {tasks.map((t) => (
                  <li key={t.id} style={{ padding: "0.75rem 0", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{t.title}</span>
                    <button onClick={() => delTask(t.id)} style={{ color: "#ef4444", border: "none", background: "none", cursor: "pointer" }}>削除</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {activeTab === "knowledge" && (
        <section style={{ background: "white", padding: "1.5rem", borderRadius: "0.75rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>📄 ナレッジ登録</h2>
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>登録内容は自動的にベクトル化され、検索に利用されます。</p>
          <form onSubmit={addKnowledge} style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <input
              value={knTitle}
              onChange={(e) => setKnTitle(e.target.value)}
              placeholder="タイトル"
              style={{ padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "0.5rem", fontSize: "1rem" }}
            />
            <textarea
              value={knContent}
              onChange={(e) => setKnContent(e.target.value)}
              placeholder="本文を入力..."
              rows={8}
              style={{ padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "0.5rem", fontSize: "1rem", resize: "vertical" }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{ padding: "0.75rem 1.5rem", background: "#10b981", color: "white", border: "none", borderRadius: "0.5rem", cursor: "pointer", alignSelf: "flex-start" }}
            >
              ナレッジを登録
            </button>
          </form>
        </section>
      )}

      {activeTab === "search" && (
        <>
          <section style={{ background: "white", padding: "1.5rem", borderRadius: "0.75rem", marginBottom: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>🔍 類似度検索</h2>
            <form onSubmit={doSearch} style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="キーワードを入力..."
                style={{ flex: 1, padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "0.5rem", fontSize: "1rem" }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{ padding: "0.75rem 1.25rem", background: "#8b5cf6", color: "white", border: "none", borderRadius: "0.5rem", cursor: "pointer" }}
              >
                検索
              </button>
            </form>
          </section>
          
          {searchResults.length > 0 && (
            <section style={{ background: "white", padding: "1.5rem", borderRadius: "0.75rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h3 style={{ fontSize: "1rem", marginTop: 0 }}>検索結果 ({searchResults.length}件)</h3>
              <ul style={{ listStyle: "none", padding: 0, marginTop: "0.5rem" }}>
                {searchResults.map((r, i) => (
                  <li key={i} style={{ padding: "1rem 0", borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <strong>{r.title || "タイトルなし"}</strong>
                      <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                        類似度: {r.similarity ? `${(r.similarity * 100).toFixed(1)}%` : "—"}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem" }}>
                      {(r.content || "").slice(0, 100)}...
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {activeTab === "ai" && (
        <>
          <section style={{ background: "white", padding: "1.5rem", borderRadius: "0.75rem", marginBottom: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>🤖 AI プロジェクト生成</h2>
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>作りたいものを入力 → タスク分解＆ファイル自動作成！</p>
            <form onSubmit={doDecompose} style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <textarea
                value={specText}
                onChange={(e) => setSpecText(e.target.value)}
                placeholder="例：簡単なメモ帳HTML。入力して保存・削除。"
                rows={6}
                style={{ padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "0.5rem", fontSize: "1rem", resize: "vertical" }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{ padding: "0.75rem 1.5rem", background: "#f59e0b", color: "white", border: "none", borderRadius: "0.5rem", cursor: "pointer", alignSelf: "flex-start" }}
              >
                🚀 生成実行
              </button>
            </form>
          </section>
          
          {decomposedTasks.length > 0 && (
            <section style={{ background: "white", padding: "1.5rem", borderRadius: "0.75rem", marginBottom: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h3 style={{ fontSize: "1rem", marginTop: 0 }}>📋 作業ステップ</h3>
              <ul style={{ listStyle: "none", padding: 0, marginTop: "0.75rem" }}>
                {decomposedTasks.map((t, i) => (
                  <li key={i} style={{ padding: "0.5rem 0", borderBottom: "1px solid #e2e8f0" }}>
                    {t}
                  </li>
                ))}
              </ul>
              <button
                onClick={bulkAddTasks}
                style={{ marginTop: "1rem", padding: "0.75rem 1.5rem", background: "#3b82f6", color: "white", border: "none", borderRadius: "0.5rem", cursor: "pointer" }}
              >
                一括タスク追加
              </button>
            </section>
          )}
          
          {generatedFiles.length > 0 && (
            <section style={{ background: "white", padding: "1.5rem", borderRadius: "0.75rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h3 style={{ fontSize: "1rem", marginTop: 0 }}>📁 生成されたファイル</h3>
              <p style={{ color: "#10b981", fontSize: "0.9rem" }}>✅ {savePath} に保存済み</p>
              <ul style={{ listStyle: "none", padding: 0, marginTop: "0.75rem" }}>
                {generatedFiles.map((f, i) => (
                  <li key={i} style={{ padding: "0.5rem 0", borderBottom: "1px solid #e2e8f0" }}>
                    📄 <strong>{f.name}</strong>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}