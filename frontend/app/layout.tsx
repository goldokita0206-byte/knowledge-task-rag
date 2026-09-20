import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Knowledge-Task RAG",
  description: "タスク管理  文書検索AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8fafc" }}>
        {children}
      </body>
    </html>
  );
}
