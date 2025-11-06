import React, { useEffect, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import todoService from "../services/todoService";
import TodoItem from "../components/TodoItem";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

export default function TodoPage() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [lastMovedId, setLastMovedId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor)
  );

  const normalizeTodos = (items) => {
    const deduped = Array.from(new Map(items.map((t) => [t.id, t])).values());
    return deduped.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  };

  async function loadPage(pageNumber = 1) {
    setLoading(true);
    setError("");
    try {
      const resp = await todoService.getTodosPage({
        page: pageNumber,
        limit: pageLimit,
      });

      const items = (resp.items || []).map((t) => ({
        ...t,
        order: t.order ?? t.orderIndex ?? 0,
      }));

      setTodos(normalizeTodos(items));
      setPage(resp.page);
      setTotalPages(resp.totalPages ?? 1);
    } catch (err) {
      console.error(err);
      setError("Failed to load todos");
    } finally {
      setLoading(false);
    }
  }

  // initial load
  useEffect(() => {
    loadPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function findAndOpenPageForId(id, limit) {
    if (!id) {
      await loadPage(1);
      return;
    }

    try {
      let p = 1;
      while (true) {
        const resp = await todoService.getTodosPage({ page: p, limit });
        const items = (resp.items || []).map((t) => ({ ...t, order: t.order ?? t.orderIndex ?? 0 }));
        const found = items.find((t) => String(t.id) === String(id));
        if (found) {
          setTodos(normalizeTodos(items));
          setPage(resp.page);
          setTotalPages(resp.totalPages ?? 1);
          return;
        }

        const tp = resp.totalPages ?? 1;
        if (p >= tp) break;
        p++;
      }

      // fallback to first page if not found
      await loadPage(1);
    } catch (err) {
      console.error(err);
      await loadPage(1);
    }
  }

  function handleChangePageLimit(e) {
    const newLimit = Number(e.target.value) || 10;
    const focusId = lastMovedId ?? (todos[0] && todos[0].id) ?? null;
    setPageLimit(newLimit);
    findAndOpenPageForId(focusId, newLimit);
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || !active || active.id === over.id) return;

    const oldIndex = todos.findIndex((t) => String(t.id) === String(active.id));
    const newIndex = todos.findIndex((t) => String(t.id) === String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const newTodos = arrayMove(todos, oldIndex, newIndex);
    setTodos(newTodos);

    try {
      const moved = newTodos[newIndex];
      const prev = newTodos[newIndex - 1];
      const next = newTodos[newIndex + 1];

      let newOrder;
      if (!prev && !next) {
        newOrder = 1024;
      } else if (!prev) {
        newOrder = (next.order ?? 0) - 1024;
      } else if (!next) {
        newOrder = (prev.order ?? 0) + 1024;
      } else {
        newOrder = Math.floor((Number(prev.order ?? 0) + Number(next.order ?? 0)) / 2);
      }

      moved.order = newOrder;
      await todoService.reorder([{ id: moved.id, order: newOrder }]);
      setLastMovedId(moved.id);

      setTodos((prev) =>
        prev.map((t) => (t.id === moved.id ? { ...t, order: newOrder } : t))
      );
    } catch (err) {
      console.error("Reorder failed", err);
      setError("Failed to save order. Reverting.");
      setTodos([...todos]); 
    }
  }
  async function handleAdd(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await todoService.createTodo({ title: newTitle, isCompleted: false });
      setNewTitle("");
      await loadPage(page);
    } catch (err) {
      console.error(err);
      setError("Failed to create todo");
    }
  }
  async function handleToggle(item) {
    try {
      const updated = await todoService.updateTodo({
        ...item,
        isCompleted: !item.isCompleted,
      });
      setTodos((prev) =>
        prev.map((t) =>
          t.id === updated.id
            ? { ...updated, order: updated.order ?? t.order ?? t.orderIndex }
            : t
        )
      );
    } catch (err) {
      console.error(err);
      setError("Failed to update todo");
    }
  }

  async function handleDelete(id) {
    try {
      await todoService.deleteTodo(id);
      await loadPage(page);
    } catch (err) {
      console.error(err);
      setError("Failed to delete todo");
    }
  }

  async function handleEdit(updatedItem) {
    try {
      const updated = await todoService.updateTodo(updatedItem);
      setTodos((prev) =>
        prev.map((t) =>
          t.id === updated.id
            ? { ...updated, order: updated.order ?? t.order ?? t.orderIndex }
            : t
        )
      );
    } catch (err) {
      console.error(err);
      setError("Failed to update todo");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-6 md:mb-8 relative">
          <div
            onClick={() => (window.location.href = "/")}
            className="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-gray-900 transition-colors"
            title="Back to Login"
          >
            <FaArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline font-medium">Back</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 text-center flex-1">
            To-Do List
          </h1>
        </header>

        <form
          onSubmit={handleAdd}
          className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-3"
        >
          <div className="flex-1 flex gap-3">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Add a new task"
              className="w-full px-4 py-3 border rounded-md bg-white text-gray-800 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button className="bg-[#0f172a] text-white px-4 py-3 rounded-md flex items-center justify-center gap-2 hover:bg-[#1e293b] transition-colors">
              Add
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Items / page:</label>
            <select
              value={pageLimit}
              onChange={handleChangePageLimit}
              className="border rounded px-2 py-1"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={100}>100</option>
            </select>
          </div>
        </form>

        {error && <div className="text-red-600 mb-4 text-center">{error}</div>}

        {loading ? (
          <div className="flex justify-center mt-6">
            <div className="spinner" />
          </div>
        ) : (
          <>
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <SortableContext
                items={todos.map((t) => String(t.id))}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-4 w-full">
                  {todos.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onToggle={() => handleToggle(todo)}
                      onDelete={() => handleDelete(todo.id)}
                      onEdit={handleEdit}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>

            {/* Pagination */}
            <div className="flex justify-center mt-4 gap-2 flex-wrap">
              <button
                disabled={page <= 1}
                onClick={() => loadPage(page - 1)}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => loadPage(i + 1)}
                  className={`px-3 py-1 border rounded ${
                    page === i + 1 ? "bg-gray-300" : ""
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                disabled={page >= totalPages}
                onClick={() => loadPage(page + 1)}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
