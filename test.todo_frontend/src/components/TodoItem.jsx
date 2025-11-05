import { useState, useRef, useEffect } from "react";
import { FaTrash, FaCheck } from "react-icons/fa";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export default function TodoItem({ todo, onToggle, onDelete, onEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(todo.title);

  // sortable
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: String(todo.id) });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const textRef = useRef(null);

  useEffect(() => {
    if (isEditing && textRef.current) {
      const el = textRef.current;
      // focus and move caret to end
      el.focus();
      const len = el.value.length;
      try {
        el.setSelectionRange(len, len);
      } catch (e) {}
      // adjust height
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editingTitle.trim() === "") {
      setEditingTitle(todo.title);
      setIsEditing(false);
      return;
    }
    await onEdit({ ...todo, title: editingTitle });
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center bg-white p-3 md:p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow w-full cursor-grab"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-2 flex-shrink-0 mt-1">
        <button
          onClick={onToggle}
          className={`w-7 h-7 flex items-center justify-center rounded-full border transition-colors ${
            todo.isCompleted
              ? "bg-green-500 text-white"
              : "border-gray-300 text-gray-300"
          }`}
        >
          <FaCheck className="w-3 h-3" />
        </button>

        <button
          onClick={onDelete}
          className="w-7 h-7 flex items-center justify-center rounded-full border-2 border-red-500 text-red-500 hover:bg-red-100 transition-colors"
        >
          <FaTrash className="w-3 h-3" />
        </button>
      </div>

      {/* Title */}
      <div className="flex-1 ml-3 min-w-0">
        {isEditing ? (
          <textarea
            ref={textRef}
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault(); 
                handleSave();
              }
              if (e.key === "Escape") {
                setEditingTitle(todo.title);
                setIsEditing(false);
              }
            }}
            rows={1}
            className="w-full px-1 py-1 border-b border-gray-300 focus:border-blue-500 focus:outline-none text-gray-800 resize-none overflow-hidden rounded-sm"
            style={{ height: "auto" }}
          />
        ) : (
          <span
            onClick={() => setIsEditing(true)}
            className={`cursor-pointer select-text break-words ${
              todo.isCompleted ? "line-through text-gray-400" : "text-gray-800"
            }`}
            title={todo.title}
          >
            {todo.title}
          </span>
        )}
      </div>
    </div>
  );
}
