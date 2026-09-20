const BASE_URL = "http://127.0.0.1:8000/api";

export type Task = {
  id?: string;
  title: string;
};

async function listTasks(): Promise<Task[]> {
  const res = await fetch(`${BASE_URL}/tasks`);
  if (!res.ok) throw new Error("Failed to list tasks");
  return res.json();
}

async function createTask(task: Task) {
  const res = await fetch(`${BASE_URL}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error("Failed to create task");
  return res.json();
}

async function deleteTask(id: string) {
  const res = await fetch(`${BASE_URL}/tasks/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete task");
  return res.json();
}

async function addKnowledge(data: { title: string; content: string }) {
  const res = await fetch(`${BASE_URL}/knowledge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to add knowledge");
  return res.json();
}

async function search(q: string) {
  const res = await fetch(`${BASE_URL}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q }),
  });
  if (!res.ok) throw new Error("Failed to search");
  return res.json();
}

export const api = {
  listTasks,
  createTask,
  deleteTask,
  addKnowledge,
  search,
};