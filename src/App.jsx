import { useState, useEffect, useMemo, useRef } from "react";
import { ListTodo, Plus, Trash2, X, Check, ClipboardList } from "lucide-react";

const STORAGE_KEY = "todo-app:todos";

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function GlassCard({ className = "", children }) {
  return (
    <div className={`rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md shadow-lg ${className}`}>
      {children}
    </div>
  );
}

const FILTERS = [
  { key: "all", label: "전체" },
  { key: "active", label: "진행중" },
  { key: "done", label: "완료" },
];

export default function TodoApp() {
  const [todos, setTodos] = useState(loadTodos);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const editInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    if (editingId !== null) editInputRef.current?.focus();
  }, [editingId]);

  const remaining = useMemo(() => todos.filter((t) => !t.done).length, [todos]);
  const hasDone = useMemo(() => todos.some((t) => t.done), [todos]);

  const visibleTodos = useMemo(() => {
    if (filter === "active") return todos.filter((t) => !t.done);
    if (filter === "done") return todos.filter((t) => t.done);
    return todos;
  }, [todos, filter]);

  function addTodo(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setTodos((prev) => [
      { id: crypto.randomUUID(), text, done: false, createdAt: Date.now() },
      ...prev,
    ]);
    setInput("");
  }

  function toggleTodo(id) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function deleteTodo(id) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  function clearCompleted() {
    setTodos((prev) => prev.filter((t) => !t.done));
  }

  function startEdit(todo) {
    setEditingId(todo.id);
    setEditingText(todo.text);
  }

  function commitEdit() {
    const text = editingText.trim();
    if (!text) {
      deleteTodo(editingId);
    } else {
      setTodos((prev) => prev.map((t) => (t.id === editingId ? { ...t, text } : t)));
    }
    setEditingId(null);
    setEditingText("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingText("");
  }

  return (
    <div
      className="min-h-screen w-full flex items-start md:items-center justify-center px-4 py-10 md:py-16"
      style={{ background: "linear-gradient(160deg, #1E2A52 0%, #0B1233 60%, #14192B 100%)" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        .font-body { font-family: 'Inter', sans-serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="w-full max-w-lg font-body">
        <div className="flex items-center gap-2 text-white mb-6 px-1">
          <ListTodo className="w-5 h-5" />
          <span className="font-display text-lg font-semibold tracking-tight">할 일</span>
        </div>

        <GlassCard className="p-5 md:p-6">
          <form onSubmit={addTodo} className="flex items-center gap-2 mb-5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="할 일을 입력하세요..."
              className="flex-1 min-w-0 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-white/40 transition"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="shrink-0 rounded-xl bg-white/90 text-slate-900 px-4 py-2.5 text-sm font-medium flex items-center gap-1.5 hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              추가
            </button>
          </form>

          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 p-1">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition ${
                    filter === f.key ? "bg-white/90 text-slate-900" : "text-white/60 hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <span className="text-white/45 text-xs font-medium">{remaining}개 남음</span>
          </div>

          <div className="flex flex-col gap-1.5 max-h-[420px] overflow-y-auto no-scrollbar">
            {visibleTodos.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-14 text-white/35">
                <ClipboardList className="w-8 h-8" strokeWidth={1.5} />
                <span className="text-sm">
                  {filter === "done" ? "완료한 할 일이 없습니다" : filter === "active" ? "진행중인 할 일이 없습니다" : "할 일을 추가해보세요"}
                </span>
              </div>
            )}

            {visibleTodos.map((todo) => (
              <div
                key={todo.id}
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 transition"
              >
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className={`shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition ${
                    todo.done ? "bg-emerald-400/90 border-emerald-400/90" : "border-white/30 hover:border-white/60"
                  }`}
                  aria-label="완료 토글"
                >
                  {todo.done && <Check className="w-3.5 h-3.5 text-slate-900" strokeWidth={3} />}
                </button>

                {editingId === todo.id ? (
                  <input
                    ref={editInputRef}
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit();
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="flex-1 min-w-0 rounded-lg border border-white/25 bg-white/10 px-2 py-1 text-sm text-white outline-none focus:ring-2 focus:ring-white/40"
                  />
                ) : (
                  <span
                    onDoubleClick={() => startEdit(todo)}
                    className={`flex-1 min-w-0 truncate text-sm cursor-text ${
                      todo.done ? "text-white/35 line-through" : "text-white/90"
                    }`}
                    title="더블클릭하여 수정"
                  >
                    {todo.text}
                  </span>
                )}

                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-300 transition"
                  aria-label="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {hasDone && (
            <div className="flex justify-end mt-3 pt-3 border-t border-white/10">
              <button
                onClick={clearCompleted}
                className="flex items-center gap-1 text-white/40 hover:text-white/80 text-xs transition"
              >
                <X className="w-3.5 h-3.5" />
                완료 항목 지우기
              </button>
            </div>
          )}
        </GlassCard>

        <div className="text-center text-white/25 text-[11px] mt-6">
          더블클릭으로 수정 · 데이터는 브라우저에 저장됩니다
        </div>
      </div>
    </div>
  );
}
