"use client";

import { useState, useRef } from "react";
import { MockTask, TaskStatus, coders } from "@/lib/mock-data";

interface TaskListProps {
  tasks: MockTask[];
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

function StatusPill({ status }: { status: TaskStatus }) {
  const base = "text-[11px] font-mono px-2 py-0.5 rounded-md";
  const styles: Record<TaskStatus, string> = {
    todo: "text-text-muted bg-surface-muted",
    in_progress: "text-text-primary bg-surface-muted",
    done: "text-text-muted bg-surface-muted",
  };
  return (
    <span className={`${base} ${styles[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export default function TaskList({ tasks: initialTasks }: TaskListProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === "done" ? "todo" : ("done" as TaskStatus) }
          : t
      )
    );
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

    const newTask: MockTask = {
      id: `t-new-${Date.now()}`,
      title,
      assigneeId: "",
      status: "todo",
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    };

    setTasks((prev) => [...prev, newTask]);
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

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {tasks.map((task, i) => {
        const assignee = coders.find((c) => c.id === task.assigneeId);
        const isDone = task.status === "done";

        return (
          <div
            key={task.id}
            className={`flex items-center gap-3 px-4 py-3 ${
              i < tasks.length - 1 ? "border-b border-border" : ""
            }`}
          >
            {/* Checkbox */}
            <button
              onClick={() => toggleTask(task.id)}
              className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors duration-150 cursor-pointer ${
                isDone
                  ? "bg-text-primary border-text-primary"
                  : "border-border-hover bg-background hover:border-text-muted"
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
                  ? "text-text-muted line-through decoration-text-muted/50"
                  : "text-text-primary"
              }`}
            >
              {task.title}
            </span>

            {/* Assignee avatar */}
            {assignee && (
              <img
                src={assignee.avatarUrl}
                alt={assignee.displayName}
                title={assignee.displayName}
                className="w-5 h-5 rounded object-cover flex-shrink-0"
              />
            )}

            {/* Status pill */}
            <StatusPill status={task.status} />

            {/* Due date */}
            <span className="text-[11px] font-mono text-text-muted flex-shrink-0 w-16 text-right">
              {new Date(task.dueDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        );
      })}

      {/* Add task row */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-t border-border"
      >
        {isAdding ? (
          <>
            <div className="w-4 h-4 rounded border border-border-hover bg-background flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleAddSubmit}
              placeholder="Task title..."
              className="flex-1 text-[13px] text-text-primary placeholder:text-text-muted bg-transparent outline-none"
            />
            <span className="text-[11px] font-mono text-text-muted">
              Enter to add
            </span>
          </>
        ) : (
          <button
            onClick={handleAddClick}
            className="flex items-center gap-3 w-full cursor-pointer hover:opacity-70 transition-opacity duration-150"
          >
            <div className="w-4 h-4 flex items-center justify-center text-text-muted">
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
            <span className="text-[13px] text-text-muted">Add task</span>
          </button>
        )}
      </div>
    </div>
  );
}
