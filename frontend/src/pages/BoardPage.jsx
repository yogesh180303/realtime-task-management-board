
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

function TaskCard({ task, onEdit, onDelete, isOverlay = false }) {
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
    disabled: isOverlay,
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
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${
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
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: { type: "Column", column },
  });

  return (
    <section
      ref={setNodeRef}
      className={`flex w-80 min-w-80 flex-col rounded-2xl border p-3 transition-colors ${
        isOver
          ? "border-blue-400 bg-blue-50/70"
          : "border-slate-200 bg-slate-100/80"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate font-semibold text-slate-800">
            {column.name}
          </h2>

          <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">
            {tasks.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onAddTask(column.id)}
          className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-blue-600"
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
        <div className="flex min-h-32 flex-1 flex-col gap-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}

          {tasks.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 px-3 py-8 text-center text-sm text-slate-400">
              Drop a task here
            </div>
          )}
        </div>
      </SortableContext>
    </section>
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

  // Real-time WebSocket connection
  useEffect(() => {
    if (!board) return;

    const workspaceId =
      typeof board.workspace === "object"
        ? board.workspace.id
        : board.workspace;

    const token = localStorage.getItem("accessToken");

    if (!workspaceId || !token) return;

    const socket = new WebSocket(
      `ws://127.0.0.1:8000/ws/workspaces/${workspaceId}/tasks/?token=${encodeURIComponent(token)}`
    );

    socket.onopen = () => {
      setIsConnected(true);
      console.log("WebSocket connected");
    };

    socket.onclose = () => {
      setIsConnected(false);
      console.log("WebSocket disconnected");
    };

    socket.onerror = (event) => {
      console.error("WebSocket error:", event);
      setIsConnected(false);
    };

    socket.onmessage = (event) => {
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

    return () => {
      socket.close();
    };
  }, [board]);

  const tasksByColumn = useMemo(() => {
    const grouped = {};

    columns.forEach((column) => {
      grouped[column.id] = tasks
        .filter(
          (task) => String(task.column) === String(column.id)
        )
        .sort(
          (a, b) => (a.position ?? 0) - (b.position ?? 0)
        );
    });

    return grouped;
  }, [columns, tasks]);

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
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {board.name}
            </h1>

            {board.description && (
              <p className="mt-1 text-sm text-slate-500">
                {board.description}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        {/* WebSocket connection status */}
        <div className="mb-4 flex items-center gap-2 text-sm">
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
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <p className="mb-4 text-sm text-slate-500">
          Drag tasks by the grip icon to move them between columns or
          change their order.
        </p>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex items-start gap-4 overflow-x-auto pb-6">
            {columns.map((column) => (
              <BoardColumn
                key={column.id}
                column={column}
                tasks={tasksByColumn[column.id] || []}
                onAddTask={openCreateModal}
                onEditTask={openEditModal}
                onDeleteTask={handleDelete}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask ? (
              <TaskCard
                task={activeTask}
                onEdit={() => {}}
                onDelete={() => {}}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {editingTask ? "Edit task" : "Create task"}
              </h2>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
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
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
