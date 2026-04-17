"use client";

import { useState, useEffect, useRef } from "react";

type TaskStatus = "todo" | "in_progress" | "done";

type Task = {
  id: string;
  title: string;
  assigneeId: string;
  assigneeName?: string;
  assigneeImage?: string;
  status: TaskStatus;
  dueDate: string;
};

interface TaskListProps {
  projectId: string;
  tasks: Task[];
  onAddTask?: (title: string) => void;
  onTaskToggle?: (taskId: string, newStatus: TaskStatus) => void;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

function StatusPill({ status }: { status: TaskStatus }) {
  const base = "text-[11px] font-mono px-2 py-0.5 rounded-md";
  const styles: Record<TaskStatus, string> = {
    todo: "text-neutral-500 bg-neutral-100",
    in_progress: "text-[#0a0a0a] bg-neutral-100",
    done: "text-neutral-500 bg-neutral-100",
  };
  return (
    <span className={`${base} ${styles[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function AssigneeAvatar({ name, image }: { name?: string; image?: string }) {
  const displayName = name || "Unassigned";
  const initial = name ? name.charAt(0).toUpperCase() : "?";

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-[10px] font-medium text-neutral-500 overflow-hidden flex-shrink-0">
        {image ? (
          <img src={image} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </div>
      <span className={`text-[11px] ${name ? "text-[#a3a3a3]" : "text-[#a3a3a3] italic"}`}>
        {displayName}
      </span>
    </div>
  );
}

export default function TaskList({ projectId, tasks: initialTasks, onAddTask, onTaskToggle }: TaskListProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with parent when props change
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const toggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const newStatus: TaskStatus = task.status === "done" ? "todo" : "done";

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: newStatus } : t
      )
    );

    // Persist to API
    try {
      await fetch(`/api/projects/${projectId}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: id, status: newStatus }),
      });
      onTaskToggle?.(id, newStatus);
    } catch {
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, status: task.status } : t
        )
      );
    }
  };

  const handleAddClick = () => {
    setIsAdding(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleAddSubmit = () => {
    const title = newTitle.trim();
    if (!title) {
      setIsAdding(false);
      return;
    }

    if (onAddTask) {
      onAddTask(title);
    } else {
      // Local-only fallback
      const newTask: Task = {
        id: `t-new-${Date.now()}`,
        title,
        assigneeId: "",
        status: "todo",
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      };
      setTasks((prev) => [...prev, newTask]);
    }

    setNewTitle("");
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSubmit();
    }
    if (e.key === "Escape") {
      setNewTitle("");
      setIsAdding(false);
    }
  };

  // Use initialTasks if they changed (e.g. from API refetch)
  const displayTasks = tasks.length > 0 || initialTasks.length === 0 ? tasks : initialTasks;

  return (
    <div className="border border-[#e5e5e5] rounded-lg overflow-hidden">
      {displayTasks.length === 0 && !isAdding && (
        <div className="px-4 py-8 text-center">
          <p className="text-[13px] text-neutral-500 font-body">
            No tasks yet
          </p>
        </div>
      )}

      {displayTasks.map((task, i) => {
        const isDone = task.status === "done";

        return (
          <div
            key={task.id}
            className={`flex items-center gap-3 px-4 py-3 ${
              i < displayTasks.length - 1 ? "border-b border-[#e5e5e5]" : ""
            }`}
          >
            {/* Checkbox */}
            <button
              onClick={() => toggleTask(task.id)}
              className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors duration-150 cursor-pointer ${
                isDone
                  ? "bg-[#0a0a0a] border-[#0a0a0a]"
                  : "border-neutral-300 bg-white hover:border-neutral-500"
              }`}
            >
              {isDone && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>

            {/* Title */}
            <span
              className={`flex-1 text-[13px] transition-all duration-200 ${
                isDone
                  ? "text-neutral-400 line-through decoration-neutral-300"
                  : "text-[#0a0a0a]"
              }`}
            >
              {task.title}
            </span>

            {/* Assignee */}
            <AssigneeAvatar name={task.assigneeName} image={task.assigneeImage} />

            {/* Status pill */}
            <StatusPill status={task.status} />

            {/* Due date */}
            {task.dueDate && (
              <span className="text-[11px] font-mono text-neutral-500 flex-shrink-0 w-16 text-right">
                {new Date(task.dueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        );
      })}

      {/* Add task row */}
      <div className="flex items-center gap-3 px-4 py-3 border-t border-[#e5e5e5]">
        {isAdding ? (
          <>
            <div className="w-4 h-4 rounded border border-neutral-300 bg-white flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleAddSubmit}
              placeholder="Task title..."
              className="flex-1 text-[13px] text-[#0a0a0a] placeholder:text-neutral-400 bg-transparent outline-none"
            />
            <span className="text-[11px] font-mono text-neutral-400">
              Enter to add
            </span>
          </>
        ) : (
          <button
            onClick={handleAddClick}
            className="flex items-center gap-3 w-full cursor-pointer hover:opacity-70 transition-opacity duration-150"
          >
            <div className="w-4 h-4 flex items-center justify-center text-neutral-400">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <span className="text-[13px] text-neutral-400">Add task</span>
          </button>
        )}
      </div>
    </div>
  );
}
