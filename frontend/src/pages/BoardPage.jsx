import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  Calendar,
  GripVertical,
  LoaderCircle,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import api from "../services/api";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const priorityStyles = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

function getAssigneeName(task) {
  const assignee = task.assigned_to;

  if (!assignee) return "Unassigned";

  if (typeof assignee === "object") {
    return assignee.username || assignee.email || "Assigned";
  }

  return `User #${assignee}`;
}

function TaskCard({
  task,
  onEdit,
  onDelete,
  onComments,
  isOverlay = false,
  disableDrag = false,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "Task", task },
    disabled: isOverlay || disableDrag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md ${
        isOverlay ? "rotate-2 shadow-xl" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab touch-none rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
          aria-label="Drag task"
          title="Drag to move task"
        >
          <GripVertical size={17} />
        </button>

        <div className="min-w-0 flex-1">
          <h3 className="break-words font-semibold text-slate-800">
            {task.title}
          </h3>

          {task.description && (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-500">
              {task.description}
            </p>
          )}
        </div>

        {!isOverlay && (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
              aria-label="Edit task"
              title="Edit task"
            >
              <Pencil size={16} />
            </button>

            <button
              type="button"
              onClick={() => onComments(task)}
              className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
              aria-label="View comments"
              title="View comments"
            >
              <MessageCircle size={16} />
            </button>

            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
              aria-label="Delete task"
              title="Delete task"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 pl-8">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            priorityStyles[task.priority] || priorityStyles.MEDIUM
          }`}
        >
          {task.priority || "MEDIUM"}
        </span>

        <span className="text-xs text-slate-500">
          {getAssigneeName(task)}
        </span>

        {task.due_date && (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Calendar size={13} />
            {String(task.due_date).slice(0, 10)}
          </span>
        )}
      </div>
    </article>
  );
}

function BoardColumn({
  column,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onCommentsTask,
  disableDrag = false,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: { type: "Column", column },
  });

  return (
    <section
      ref={setNodeRef}
      className={`flex w-[320px] min-w-[320px] flex-col rounded-2xl border p-3.5 shadow-sm transition-all duration-200 ${
        isOver
          ? "border-indigo-300 bg-indigo-50/80 shadow-md shadow-indigo-100/70"
          : "border-slate-200/80 bg-slate-100/90"
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-2 px-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-sm font-bold tracking-wide text-slate-800">
            {column.name}
          </h2>

          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-600">
            {tasks.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onAddTask(column.id)}
          className="rounded-xl border border-transparent p-2 text-slate-500 transition hover:border-indigo-100 hover:bg-white hover:text-indigo-600"
          title="Add task"
          aria-label={`Add task to ${column.name}`}
        >
          <Plus size={18} />
        </button>
      </div>

      <SortableContext
        items={tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex min-h-40 flex-1 flex-col gap-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onComments={onCommentsTask}
              disableDrag={disableDrag}
            />
          ))}

          {tasks.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-3 py-10 text-center text-sm text-slate-400">
              Drop a task here
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

function TaskComments({ task, onClose }) {
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState("");
  const [editingComment, setEditingComment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const currentUser = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const commentsUrl = `tasks/${task.id}/comments/`;

  const loadComments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(commentsUrl);

      setComments(
        Array.isArray(response.data)
          ? response.data
          : response.data.results || []
      );
    } catch (err) {
      console.error("Failed to load comments:", err);
      setError("Unable to load comments. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [commentsUrl]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!content.trim()) return;

    setSaving(true);
    setError("");

    try {
      if (editingComment) {
        await api.patch(
          `${commentsUrl}${editingComment.id}/`,
          { content: content.trim() }
        );
      } else {
        await api.post(commentsUrl, {
          content: content.trim(),
        });
      }

      setContent("");
      setEditingComment(null);
      await loadComments();
    } catch (err) {
      console.error("Failed to save comment:", err);

      setError(
        err.response?.status === 403
          ? "You do not have permission to edit this comment."
          : "Unable to save comment. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(commentId) {
    if (!window.confirm("Delete this comment?")) return;

    setError("");

    try {
      await api.delete(`${commentsUrl}${commentId}/`);
      await loadComments();
    } catch (err) {
      console.error("Failed to delete comment:", err);

      setError(
        err.response?.status === 403
          ? "Only the comment author can delete this comment."
          : "Unable to delete comment. Please try again."
      );
    }
  }

  function startEditing(comment) {
    setEditingComment(comment);
    setContent(comment.content);
  }

  function cancelEditing() {
    setEditingComment(null);
    setContent("");
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-slate-950/50 backdrop-blur-sm">
      <section
        className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Task comments"
      >
        <header className="flex items-center justify-between border-b border-slate-200 p-5">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">
              Task comments
            </h2>

            <p className="mt-1 truncate text-sm text-slate-500">
              {task.title}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close comments"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <LoaderCircle size={18} className="animate-spin" />
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div className="py-12 text-center">
              <MessageCircle
                size={32}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 font-medium text-slate-700">
                No comments yet
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Start the discussion on this task.
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <article
                key={comment.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-800">
                    {comment.author || "Workspace member"}
                  </span>

                  <span className="text-xs text-slate-400">
                    {comment.created_at
                      ? new Date(comment.created_at).toLocaleString()
                      : ""}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">
                  {comment.content}
                </p>

                {currentUser?.username === comment.author && (
                  <div className="mt-3 flex gap-3">
                    <button
                      type="button"
                      onClick={() => startEditing(comment)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      className="text-xs font-semibold text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </article>
            ))
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-3 border-t border-slate-200 p-5"
        >
          <label className="block text-sm font-semibold text-slate-700">
            {editingComment ? "Edit your comment" : "Add a comment"}
          </label>

          <textarea
            rows={3}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Write something..."
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
          />

          <div className="flex justify-end gap-2">
            {editingComment && (
              <button
                type="button"
                onClick={cancelEditing}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={saving || !content.trim()}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && (
                <LoaderCircle size={16} className="animate-spin" />
              )}

              {editingComment ? "Save changes" : "Post comment"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function BoardPage() {
  const { boardId } = useParams();

  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [commentTask, setCommentTask] = useState(null);

  // Advanced task search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPriorities, setSelectedPriorities] = useState([]);
  const [assignedToFilter, setAssignedToFilter] = useState("");
  const [dueAfterFilter, setDueAfterFilter] = useState("");
  const [dueBeforeFilter, setDueBeforeFilter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedColumn, setSelectedColumn] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    due_date: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const boardResponse = await api.get(`boards/${boardId}/`);
      const boardData = boardResponse.data;

      setBoard(boardData);

      const workspaceId =
        typeof boardData.workspace === "object"
          ? boardData.workspace.id
          : boardData.workspace;

      const [columnsResponse, tasksResponse] = await Promise.all([
        api.get(`boards/${boardId}/columns/`),
        api.get(`tasks/?workspace=${workspaceId}`),
      ]);

      setColumns(
        Array.isArray(columnsResponse.data)
          ? columnsResponse.data
          : columnsResponse.data.results || []
      );

      setTasks(
        Array.isArray(tasksResponse.data)
          ? tasksResponse.data
          : tasksResponse.data.results || []
      );
    } catch (err) {
      console.error("Failed to load board:", err);
      setError("Unable to load this board. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  // Real-time WebSocket connection using a short-lived, single-use ticket
  useEffect(() => {
    if (!board) return;

    const workspaceId =
      typeof board.workspace === "object"
        ? board.workspace.id
        : board.workspace;

    if (!workspaceId) return;

    let cancelled = false;
    let socket = null;

    async function connectWebSocket() {
      try {
        // Request a short-lived ticket using the authenticated REST API.
        const ticketResponse = await api.post("tasks/websocket-ticket/", {
          workspace: workspaceId,
        });

        if (cancelled) return;

        const ticket = ticketResponse.data?.ticket;

        if (!ticket) {
          throw new Error("The server did not return a WebSocket ticket.");
        }

        socket = new WebSocket(
          `ws://127.0.0.1:8000/ws/workspaces/${workspaceId}/tasks/?ticket=${encodeURIComponent(ticket)}`
        );

        socket.onopen = () => {
          if (cancelled) return;
          setIsConnected(true);
          console.log("WebSocket connected");
        };

        socket.onclose = () => {
          if (cancelled) return;
          setIsConnected(false);
          console.log("WebSocket disconnected");
        };

        socket.onerror = (event) => {
          if (cancelled) return;
          console.error("WebSocket error:", event);
          setIsConnected(false);
        };

        socket.onmessage = (event) => {
          if (cancelled) return;

          try {
            const message = JSON.parse(event.data);
            const task = message.data;

            if (message.type === "task_created" && task) {
              setTasks((current) => {
                const exists = current.some(
                  (item) => String(item.id) === String(task.id)
                );

                if (exists) return current;

                return [...current, task];
              });
            }

            if (message.type === "task_updated" && task) {
              setTasks((current) => {
                const exists = current.some(
                  (item) => String(item.id) === String(task.id)
                );

                if (!exists) return [...current, task];

                return current.map((item) =>
                  String(item.id) === String(task.id) ? task : item
                );
              });
            }

            if (message.type === "task_deleted" && task) {
              setTasks((current) =>
                current.filter(
                  (item) => String(item.id) !== String(task.id)
                )
              );
            }
          } catch (err) {
            console.error("Could not process WebSocket message:", err);
          }
        };
      } catch (err) {
        if (cancelled) return;

        console.error("Failed to establish WebSocket connection:", err);
        setIsConnected(false);
      }
    }

    connectWebSocket();

    return () => {
      cancelled = true;

      if (socket) {
        socket.close();
      }
    };
  }, [board]);

  const filtersActive = Boolean(
    searchQuery.trim() ||
      selectedPriorities.length > 0 ||
      assignedToFilter ||
      dueAfterFilter ||
      dueBeforeFilter ||
      overdueOnly
  );

  const assigneeOptions = useMemo(() => {
    const uniqueAssignees = new Map();

    tasks.forEach((task) => {
      if (task.assigned_to === null || task.assigned_to === undefined) {
        return;
      }

      const assigneeId =
        typeof task.assigned_to === "object"
          ? task.assigned_to.id
          : task.assigned_to;

      if (assigneeId === null || assigneeId === undefined) return;

      const assigneeName =
        task.assigned_to_username ||
        (typeof task.assigned_to === "object"
          ? task.assigned_to.username || task.assigned_to.email
          : null) ||
        `User #${assigneeId}`;

      uniqueAssignees.set(String(assigneeId), assigneeName);
    });

    return Array.from(uniqueAssignees.entries()).sort((a, b) =>
      String(a[1]).localeCompare(String(b[1]))
    );
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const today = new Date();

    return tasks.filter((task) => {
      if (normalizedQuery) {
        const searchableText = `${task.title || ""} ${task.description || ""}`.toLowerCase();
        if (!searchableText.includes(normalizedQuery)) return false;
      }

      if (
        selectedPriorities.length > 0 &&
        !selectedPriorities.includes(task.priority)
      ) {
        return false;
      }

      if (assignedToFilter) {
        if (assignedToFilter === "unassigned") {
          if (task.assigned_to !== null && task.assigned_to !== undefined) {
            return false;
          }
        } else {
          const assigneeId =
            typeof task.assigned_to === "object"
              ? task.assigned_to?.id
              : task.assigned_to;
          if (String(assigneeId) !== String(assignedToFilter)) return false;
        }
      }

      const dueDate = task.due_date ? String(task.due_date).slice(0, 10) : "";

      if ((dueAfterFilter || dueBeforeFilter) && !dueDate) return false;
      if (dueAfterFilter && dueDate < dueAfterFilter) return false;
      if (dueBeforeFilter && dueDate > dueBeforeFilter) return false;

      if (overdueOnly) {
        if (!task.due_date || new Date(task.due_date) >= today) return false;

        const taskColumn = columns.find(
          (column) => String(column.id) === String(task.column)
        );
        if (taskColumn?.name?.toLowerCase() === "done") return false;
      }

      return true;
    });
  }, [
    tasks,
    columns,
    searchQuery,
    selectedPriorities,
    assignedToFilter,
    dueAfterFilter,
    dueBeforeFilter,
    overdueOnly,
  ]);

  const tasksByColumn = useMemo(() => {
    const grouped = {};

    columns.forEach((column) => {
      grouped[column.id] = visibleTasks
        .filter((task) => String(task.column) === String(column.id))
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    });

    return grouped;
  }, [columns, visibleTasks]);

  function clearFilters() {
    setSearchQuery("");
    setSelectedPriorities([]);
    setAssignedToFilter("");
    setDueAfterFilter("");
    setDueBeforeFilter("");
    setOverdueOnly(false);
  }

  function togglePriority(priority) {
    setSelectedPriorities((current) =>
      current.includes(priority)
        ? current.filter((item) => item !== priority)
        : [...current, priority]
    );
  }

  function openCreateModal(columnId) {
    setEditingTask(null);
    setSelectedColumn(columnId);

    setFormData({
      title: "",
      description: "",
      priority: "MEDIUM",
      due_date: "",
    });

    setModalOpen(true);
  }

  function openEditModal(task) {
    setEditingTask(task);
    setSelectedColumn(task.column);

    setFormData({
      title: task.title || "",
      description: task.description || "",
      priority: task.priority || "MEDIUM",
      due_date: task.due_date
        ? String(task.due_date).slice(0, 10)
        : "",
    });

    setModalOpen(true);
  }

  function openComments(task) {
    setCommentTask(task);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingTask(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!formData.title.trim()) return;

    setSaving(true);
    setError("");

    const workspaceId =
      typeof board.workspace === "object"
        ? board.workspace.id
        : board.workspace;

    const payload = {
      title: formData.title.trim(),
      description: formData.description,
      priority: formData.priority,
      due_date: formData.due_date
        ? `${formData.due_date}T23:59:00`
        : null,
    };

    try {
      if (editingTask) {
        await api.patch(`tasks/${editingTask.id}/`, payload);
      } else {
        await api.post("tasks/", {
          ...payload,
          column: selectedColumn,
          workspace: workspaceId,
        });
      }

      setModalOpen(false);
      setEditingTask(null);

      await loadBoard();
    } catch (err) {
      console.error("Failed to save task:", err);

      setError(
        err.response?.data
          ? JSON.stringify(err.response.data)
          : "Unable to save the task. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(taskId) {
    if (!window.confirm("Are you sure you want to delete this task?")) {
      return;
    }

    setError("");

    try {
      await api.delete(`tasks/${taskId}/`);

      setTasks((current) =>
        current.filter((task) => task.id !== taskId)
      );
    } catch (err) {
      console.error("Failed to delete task:", err);
      setError("Unable to delete this task. Please try again.");
    }
  }

  function findTask(taskId) {
    return tasks.find(
      (task) => String(task.id) === String(taskId)
    );
  }

  function findColumnForTask(taskId) {
    const task = findTask(taskId);

    return task
      ? columns.find(
          (column) => String(column.id) === String(task.column)
        )
      : null;
  }

  function handleDragStart(event) {
    const task =
      event.active.data.current?.task || findTask(event.active.id);

    setActiveTask(task || null);
  }

  async function handleDragEnd(event) {
    setActiveTask(null);

    if (filtersActive) return;

    const { active, over } = event;

    if (!over) return;

    const draggedTask = findTask(active.id);

    if (!draggedTask) return;

    let destinationColumn = null;
    const overData = over.data.current;

    if (overData?.type === "Column") {
      destinationColumn = overData.column;
    } else if (overData?.type === "Task") {
      destinationColumn = findColumnForTask(over.id);
    } else if (String(over.id).startsWith("column-")) {
      const destinationId = String(over.id).replace("column-", "");

      destinationColumn = columns.find(
        (column) => String(column.id) === destinationId
      );
    }

    if (!destinationColumn) return;

    const sourceColumnId = draggedTask.column;
    const destinationColumnId = destinationColumn.id;

    const sourceTasks = tasksByColumn[sourceColumnId] || [];
    const destinationTasks = tasksByColumn[destinationColumnId] || [];

    // Reorder tasks within the same column
    if (String(sourceColumnId) === String(destinationColumnId)) {
      const oldIndex = sourceTasks.findIndex(
        (task) => String(task.id) === String(active.id)
      );

      const newIndex = sourceTasks.findIndex(
        (task) => String(task.id) === String(over.id)
      );

      if (
        oldIndex === -1 ||
        newIndex === -1 ||
        oldIndex === newIndex
      ) {
        return;
      }

      const reordered = arrayMove(
        sourceTasks,
        oldIndex,
        newIndex
      );

      const updatedTasks = tasks.map((task) => {
        const index = reordered.findIndex(
          (item) => item.id === task.id
        );

        return index === -1
          ? task
          : { ...task, position: index };
      });

      setTasks(updatedTasks);

      try {
        await Promise.all(
          reordered.map((task, index) =>
            api.patch(`tasks/${task.id}/`, {
              position: index,
            })
          )
        );
      } catch (err) {
        console.error("Failed to save task order:", err);
        setError(
          "Could not save the new task order. Reloading the board."
        );

        await loadBoard();
      }

      return;
    }

    // Move task to another column
    const newPosition = destinationTasks.length;
    const previousTasks = tasks;

    setTasks((current) =>
      current.map((task) =>
        task.id === draggedTask.id
          ? {
              ...task,
              column: destinationColumnId,
              position: newPosition,
            }
          : task
      )
    );

    try {
      await api.patch(`tasks/${draggedTask.id}/`, {
        column: destinationColumnId,
        position: newPosition,
      });
    } catch (err) {
      console.error("Failed to move task:", err);
      setTasks(previousTasks);
      setError("Could not move the task. Please try again.");
    }
  }

  function handleDragCancel() {
    setActiveTask(null);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        <LoaderCircle className="mr-2 animate-spin" size={20} />
        Loading board...
      </div>
    );
  }

  if (!board) {
    return (
      <div className="p-8 text-center text-red-600">
        {error || "Board not found."}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/50">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-[1600px] items-center gap-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
              {board.name}
            </h1>

            {board.description && (
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
                {board.description}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-7 sm:px-6 lg:px-8">
        {/* WebSocket connection status */}
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm shadow-sm">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          />

          <span className="text-slate-600">
            {isConnected
              ? "Live updates connected"
              : "Live updates disconnected"}
          </span>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3.5 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        )}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Search and filter tasks</h2>
              <p className="mt-1 text-xs text-slate-500">
                Showing {visibleTasks.length} of {tasks.length} tasks
              </p>
            </div>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!filtersActive}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear filters
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="sm:col-span-2 xl:col-span-1">
              <label htmlFor="task-search" className="mb-1.5 block text-xs font-semibold text-slate-600">
                Search title or description
              </label>
              <input
                id="task-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search tasks..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label htmlFor="assignee-filter" className="mb-1.5 block text-xs font-semibold text-slate-600">
                Assigned to
              </label>
              <select
                id="assignee-filter"
                value={assignedToFilter}
                onChange={(event) => setAssignedToFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              >
                <option value="">All assignees</option>
                <option value="unassigned">Unassigned</option>
                {assigneeOptions.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Due date range</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  aria-label="Due date from"
                  type="date"
                  value={dueAfterFilter}
                  onChange={(event) => setDueAfterFilter(event.target.value)}
                  className="min-w-0 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2.5 text-xs outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
                <input
                  aria-label="Due date to"
                  type="date"
                  value={dueBeforeFilter}
                  onChange={(event) => setDueBeforeFilter(event.target.value)}
                  className="min-w-0 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2.5 text-xs outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Priority:</span>
              {PRIORITIES.map((priority) => (
                <label key={priority} className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={selectedPriorities.includes(priority)}
                    onChange={() => togglePriority(priority)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  {priority}
                </label>
              ))}
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(event) => setOverdueOnly(event.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Overdue only
            </label>
          </div>
        </section>

        <p className="mb-5 text-sm text-slate-500">
          {filtersActive
            ? "Clear the active filters to enable task drag-and-drop."
            : "Drag tasks by the grip icon to move them between columns or change their order."}
        </p>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex min-h-[calc(100vh-230px)] items-start gap-5 overflow-x-auto pb-8 pt-1">
            {columns.map((column) => (
              <BoardColumn
                key={column.id}
                column={column}
                tasks={tasksByColumn[column.id] || []}
                onAddTask={openCreateModal}
                onEditTask={openEditModal}
                onDeleteTask={handleDelete}
                onCommentsTask={openComments}
                disableDrag={filtersActive}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask ? (
              <TaskCard
                task={activeTask}
                onEdit={() => {}}
                onDelete={() => {}}
                onComments={() => {}}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      {commentTask && (
        <TaskComments
          task={commentTask}
          onClose={() => setCommentTask(null)}
        />
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-white/70 bg-white p-6 shadow-2xl shadow-slate-950/20 sm:p-7">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                {editingTask ? "Edit task" : "Create task"}
              </h2>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Task title
                </label>

                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      title: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  placeholder="Enter task title"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Description
                </label>

                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      description: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  placeholder="Add task details"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Priority
                </label>

                <select
                  value={formData.priority}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      priority: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Due date
                </label>

                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      due_date: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || !formData.title.trim()}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && (
                    <LoaderCircle size={16} className="animate-spin" />
                  )}

                  {editingTask ? "Save changes" : "Create task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default BoardPage;