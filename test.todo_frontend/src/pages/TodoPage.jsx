import { useEffect, useState } from "react";
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

  async function load() {
    setLoading(true);
    try {
      const data = await todoService.getTodos();
      // apply saved order from localStorage if present
      const saved = localStorage.getItem("todoOrder");
      if (saved) {
        try {
          const order = JSON.parse(saved);
          // create map for quick lookup
          const map = new Map(data.map((d) => [String(d.id), d]));
          const ordered = [];
          // push items in saved order if they still exist
          for (const id of order) {
            const it = map.get(String(id));
            if (it) {
              ordered.push(it);
              map.delete(String(id));
            }
          }
          // append any new items returned from server
          for (const v of data) if (map.has(String(v.id))) ordered.push(v);
          setTodos(ordered);
        } catch {
          setTodos(data);
        }
      } else {
        setTodos(data);
      }
    } catch {
      setError("Failed to load todos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor)
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;
    if (active.id !== over.id) {
      const oldIndex = todos.findIndex(
        (t) => String(t.id) === String(active.id)
      );
      const newIndex = todos.findIndex((t) => String(t.id) === String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;
      const newTodos = arrayMove(todos, oldIndex, newIndex);
      setTodos(newTodos);
      // persist order client-side so it survives navigation/reload
      try {
        localStorage.setItem(
          "todoOrder",
          JSON.stringify(newTodos.map((t) => t.id))
        );
      } catch {}
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const created = await todoService.createTodo({
        title: newTitle,
        isCompleted: false,
      });
      setTodos((prev) => {
        const next = [created, ...prev];
        try {
          localStorage.setItem(
            "todoOrder",
            JSON.stringify(next.map((t) => t.id))
          );
        } catch {}
        return next;
      });
      setNewTitle("");
    } catch {
      setError("Failed to create todo");
    }
  }

  async function handleToggle(item) {
    try {
      const updated = await todoService.updateTodo({
        ...item,
        isCompleted: !item.isCompleted,
      });
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      setError("Failed to update todo");
    }
  }

  async function handleDelete(id) {
    try {
      await todoService.deleteTodo(id);
      setTodos((prev) => {
        const next = prev.filter((t) => t.id !== id);
        try {
          localStorage.setItem(
            "todoOrder",
            JSON.stringify(next.map((t) => t.id))
          );
        } catch {}
        return next;
      });
    } catch {
      setError("Failed to delete todo");
    }
  }

  async function handleEdit(updatedItem) {
    try {
      const updated = await todoService.updateTodo(updatedItem);
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      setError("Failed to update todo");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-6 md:mb-8 relative">
          {/* Back icon */}
          <div
            onClick={() => (window.location.href = "/")}
            className="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-gray-900 transition-colors"
            title="Back to Login"
          >
            <FaArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline font-medium">Back</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 text-center flex-1">
            To-Do List
          </h1>
        </header>

        {/* Form Add Todo */}
        <form
          onSubmit={handleAdd}
          className="mb-6 flex flex-col sm:flex-row justify-center items-center gap-3"
        >
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a new task"
            className="w-full sm:w-80 md:w-96 px-4 py-3 border rounded-md bg-white text-gray-800 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button className="bg-[#0f172a] text-white px-4 py-3 rounded-md flex items-center justify-center gap-2 w-full sm:w-auto hover:bg-[#1e293b] transition-colors">
            Add
          </button>
        </form>

        {error && <div className="text-red-600 mb-4 text-center">{error}</div>}

        {loading ? (
          <div className="flex justify-center mt-6">
            <div className="spinner" />
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
