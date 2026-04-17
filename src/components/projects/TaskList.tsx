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

type ProjectMember = {
  userId: string;
  name: string;
  role: string;
};

interface TaskListProps {
  projectId: string;
  tasks: Task[];
  members?: ProjectMember[];
  onAddTask?: (title: string) => void;
  onTaskToggle?: (taskId: string, newStatus: TaskStatus) => void;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

function StatusPill({ status, onClick }: { status: TaskStatus; onClick?: () => void }) {
  const colors: Record<TaskStatus, { text: string; bg: string }> = {
    todo: { text: "#a3a3a3", bg: "#f5f5f5" },
    in_progress: { text: "#f59e0b", bg: "#f59e0b14" },
    done: { text: "#22c55e", bg: "#22c55e14" },
  };
  const c = colors[status];
  return (
    <button
      onClick={onClick}
      className="text-[10px] font-medium px-2 py-0.5 rounded-md cursor-pointer transition-colors hover:opacity-80"
      style={{ color: c.text, backgroundColor: c.bg }}
      title="Click to cycle status"
    >
      {STATUS_LABELS[status]}
    </button>
  );
}

function AssigneeButton({
  name,
  image,
  onClick,
}: {
  name?: string;
  image?: string;
  onClick: () => void;
}) {
  const displayName = name || "Assign";
  const initial = name ? name.charAt(0).toUpperCase() : "+";

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity group"
      title={name ? `Assigned to ${name}. Click to reassign.` : "Click to assign"}
    >
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium overflow-hidden flex-shrink-0 ${
          name
            ? "bg-surface-muted text-text-muted"
            : "border border-dashed border-border text-text-muted group-hover:border-border-hover"
        }`}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </div>
      <span
        className={`text-[11px] ${
          name ? "text-text-muted" : "text-text-muted italic group-hover:text-text-secondary"
        }`}
      >
        {displayName}
      </span>
    </button>
  );
}

function MemberDropdown({
  members,
  currentAssigneeId,
  onSelect,
  onClose,
}: {
  members: ProjectMember[];
  currentAssigneeId: string;
  onSelect: (userId: string | null) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-lg shadow-lg py-1 z-50 animate-[slideDown_0.15s_ease-out]"
    >
      <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-text-muted tracking-wider">
        Assign to
      </div>
      {/* Unassign option */}
      {currentAssigneeId && (
        <button
          onClick={() => onSelect(null)}
          className="w-full text-left px-3 py-2 text-[12px] text-text-muted hover:bg-surface-muted transition-colors cursor-pointer italic"
        >
          Unassign
        </button>
      )}
      {members.map((m) => (
        <button
          key={m.userId}
          onClick={() => onSelect(m.userId)}
          className={`w-full text-left px-3 py-2 text-[12px] hover:bg-surface-muted transition-colors cursor-pointer flex items-center gap-2 ${
            m.userId === currentAssigneeId ? "text-text-primary font-medium" : "text-text-secondary"
          }`}
        >
          <div className="w-5 h-5 rounded-full bg-surface-muted flex items-center justify-center text-[9px] font-medium text-text-muted flex-shrink-0">
            {m.name.charAt(0).toUpperCase()}
          </div>
          <span className="truncate">{m.name}</span>
          <span className="text-[10px] text-text-muted ml-auto">{m.role}</span>
          {m.userId === currentAssigneeId && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}

export default function TaskList({
  projectId,
  tasks: initialTasks,
  members = [],
  onAddTask,
  onTaskToggle,
}: TaskListProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [assignDropdownId, setAssignDropdownId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const cycleStatus = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const cycle: Record<TaskStatus, TaskStatus> = {
      todo: "in_progress",
      in_progress: "done",
      done: "todo",
    };
    const newStatus = cycle[task.status];

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );

    try {
      await fetch(`/api/projects/${projectId}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: id, status: newStatus }),
      });
      onTaskToggle?.(id, newStatus);
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: task.status } : t))
      );
    }
  };

  const toggleDone = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const newStatus: TaskStatus = task.status === "done" ? "todo" : "done";

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );

    try {
      await fetch(`/api/projects/${projectId}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: id, status: newStatus }),
      });
      onTaskToggle?.(id, newStatus);
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: task.status } : t))
      );
    }
  };

  const assignTask = async (taskId: string, userId: string | null) => {
    const member = userId ? members.find((m) => m.userId === userId) : null;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, assigneeId: userId || "", assigneeName: member?.name || "", assigneeImage: "" }
          : t
      )
    );
    setAssignDropdownId(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, assignedTo: userId || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, assigneeId: updated.assigneeId, assigneeName: updated.assigneeName, assigneeImage: updated.assigneeImage }
              : t
          )
        );
      }
    } catch {
      // Revert handled by next data fetch
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
      const newTask: Task = {
        id: `t-new-${Date.now()}`,
        title,
        assigneeId: "",
        status: "todo",
        dueDate: "",
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

  const displayTasks = tasks.length > 0 || initialTasks.length === 0 ? tasks : initialTasks;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {displayTasks.length === 0 && !isAdding && (
        <div className="px-4 py-8 text-center">
          <p className="text-[13px] text-text-muted font-body">No tasks yet</p>
          <p className="text-[11px] text-text-muted mt-1">Add a task to get started</p>
        </div>
      )}

      {displayTasks.map((task, i) => {
        const isDone = task.status === "done";

        return (
          <div
            key={task.id}
            className={`relative flex items-center gap-3 px-4 py-3 hover:bg-surface-muted/30 transition-colors ${
              i < displayTasks.length - 1 ? "border-b border-border" : ""
            }`}
          >
            {/* Checkbox */}
            <button
              onClick={() => toggleDone(task.id)}
              className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                isDone
                  ? "bg-[#171717] border-[#171717]"
                  : "border-border bg-white hover:border-border-hover"
              }`}
            >
              {isDone && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>

            {/* Title */}
            <span
              className={`flex-1 text-[13px] min-w-0 truncate transition-all ${
                isDone ? "text-text-muted line-through" : "text-text-primary"
              }`}
            >
              {task.title}
            </span>

            {/* Assignee - clickable to reassign */}
            <div className="relative">
              <AssigneeButton
                name={task.assigneeName}
                image={task.assigneeImage}
                onClick={() =>
                  setAssignDropdownId(assignDropdownId === task.id ? null : task.id)
                }
              />
              {assignDropdownId === task.id && members.length > 0 && (
                <MemberDropdown
                  members={members}
                  currentAssigneeId={task.assigneeId}
                  onSelect={(userId) => assignTask(task.id, userId)}
                  onClose={() => setAssignDropdownId(null)}
                />
              )}
            </div>

            {/* Status pill - clickable to cycle */}
            <StatusPill status={task.status} onClick={() => cycleStatus(task.id)} />

            {/* Due date */}
            {task.dueDate && (
              <span className="text-[11px] font-mono text-text-muted flex-shrink-0">
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
      <div className="flex items-center gap-3 px-4 py-3 border-t border-border">
        {isAdding ? (
          <>
            <div className="w-4 h-4 rounded border border-border bg-white flex-shrink-0" />
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
            <span className="text-[10px] font-mono text-text-muted">Enter to add</span>
          </>
        ) : (
          <button
            onClick={handleAddClick}
            className="flex items-center gap-3 w-full cursor-pointer hover:opacity-70 transition-opacity"
          >
            <div className="w-4 h-4 flex items-center justify-center text-text-muted">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
