
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, X } from "lucide-react";
import api from "../services/api";

function BoardPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();

  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    due_date: "",
  });

  const [saving, setSaving] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const loadBoardData = async () => {
      try {
        setLoading(true);
        setError("");

        const boardResponse = await api.get(`boards/${boardId}/`);
        const workspaceId = boardResponse.data.workspace;

        const [columnsResponse, tasksResponse] = await Promise.all([
          api.get(`boards/${boardId}/columns/`),
          api.get(`tasks/?workspace=${workspaceId}`),
        ]);

        setBoard(boardResponse.data);

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
        console.error("Board loading error:", err.response?.data || err);
        setError("Unable to load board. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadBoardData();
  }, [boardId]);

  const openCreateForm = (column) => {
    setSelectedColumn(column);
    setEditingTask(null);

    setTaskForm({
      title: "",
      description: "",
      priority: "MEDIUM",
      due_date: "",
    });

    setFormError("");
    setShowTaskForm(true);
  };

  const openEditForm = (task) => {
    setEditingTask(task);
    setSelectedColumn(null);

    setTaskForm({
      title: task.title || "",
      description: task.description || "",
      priority: task.priority || "MEDIUM",
      due_date: task.due_date ? task.due_date.slice(0, 10) : "",
    });

    setFormError("");
    setShowTaskForm(true);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setTaskForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleTaskSubmit = async (event) => {
    event.preventDefault();

    if (!taskForm.title.trim()) {
      setFormError("Task title is required.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const payload = {
        title: taskForm.title.trim(),
        description: taskForm.description,
        priority: taskForm.priority,
        due_date: taskForm.due_date
          ? `${taskForm.due_date}T23:59:00`
          : null,
      };

      if (editingTask) {
        const response = await api.patch(
          `tasks/${editingTask.id}/`,
          payload
        );

        setTasks((previous) =>
          previous.map((task) =>
            task.id === editingTask.id ? response.data : task
          )
        );
      } else {
        const response = await api.post("tasks/", {
          ...payload,
          column: selectedColumn.id,
          workspace: board.workspace,
        });

        setTasks((previous) => [...previous, response.data]);
      }

      setShowTaskForm(false);
      setEditingTask(null);
      setSelectedColumn(null);
    } catch (err) {
      console.error("Task save error:", err.response?.data || err);

      setFormError(
        err.response?.data?.detail ||
          "Unable to save task. Please check your permissions and try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (task) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${task.title}"?`
    );

    if (!confirmed) return;

    try {
      setDeletingTaskId(task.id);
      setError("");

      await api.delete(`tasks/${task.id}/`);

      setTasks((previous) =>
        previous.filter((item) => item.id !== task.id)
      );
    } catch (err) {
      console.error("Task delete error:", err.response?.data || err);

      setError(
        err.response?.data?.detail ||
          "Unable to delete task. You may not have permission."
      );
    } finally {
      setDeletingTaskId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        Loading board...
      </div>
    );
  }

  if (error && !board) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 text-white">
        <p className="text-red-400">{error}</p>

        <button
          onClick={() => navigate(-1)}
          className="mt-4 text-indigo-400"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white sm:p-8">
      <div className="mx-auto max-w-7xl">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            {board?.name || "Task Board"}
          </h1>

          <p className="mt-2 text-slate-400">
            {board?.description || "Manage your workspace tasks."}
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-300">
            {error}
          </div>
        )}

        <div className="flex gap-5 overflow-x-auto pb-6">
          {columns.map((column) => {
            const columnTasks = tasks.filter(
              (task) => task.column === column.id
            );

            return (
              <div
                key={column.id}
                className="w-80 min-w-80 shrink-0 rounded-xl border border-slate-800 bg-slate-900 p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-semibold">{column.name}</h2>

                  <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {columnTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-lg border border-slate-700 bg-slate-950 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium">{task.title}</h3>

                        <div className="flex shrink-0 gap-2">
                          <button
                            onClick={() => openEditForm(task)}
                            title="Edit task"
                            aria-label={`Edit ${task.title}`}
                            className="text-slate-400 hover:text-indigo-400"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            onClick={() => handleDeleteTask(task)}
                            disabled={deletingTaskId === task.id}
                            title="Delete task"
                            aria-label={`Delete ${task.title}`}
                            className="text-slate-400 hover:text-red-400 disabled:opacity-40"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {task.description && (
                        <p className="mt-2 text-sm text-slate-400">
                          {task.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            task.priority === "URGENT"
                              ? "bg-red-500/20 text-red-300"
                              : task.priority === "HIGH"
                              ? "bg-orange-500/20 text-orange-300"
                              : task.priority === "MEDIUM"
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-slate-700 text-slate-300"
                          }`}
                        >
                          {task.priority}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-slate-500">
                        <p>
                          Assigned:{" "}
                          {task.assigned_to_username || "Unassigned"}
                        </p>

                        <p>
                          Due:{" "}
                          {task.due_date
                            ? new Date(task.due_date).toLocaleDateString()
                            : "No due date"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => openCreateForm(column)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 py-2 text-sm text-slate-400 hover:border-indigo-500 hover:text-indigo-400"
                >
                  <Plus size={16} />
                  Add Task
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {showTaskForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingTask ? "Edit Task" : "Create New Task"}
              </h2>

              <button
                onClick={() => setShowTaskForm(false)}
                className="text-slate-400 hover:text-white"
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  Task Title
                </label>

                <input
                  name="title"
                  value={taskForm.title}
                  onChange={handleFormChange}
                  required
                  maxLength={200}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-500"
                  placeholder="Enter task title"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  Description
                </label>

                <textarea
                  name="description"
                  value={taskForm.description}
                  onChange={handleFormChange}
                  rows={3}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-500"
                  placeholder="Describe the task"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  Priority
                </label>

                <select
                  name="priority"
                  value={taskForm.priority}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  Due Date
                </label>

                <input
                  type="date"
                  name="due_date"
                  value={taskForm.due_date}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>

              {formError && (
                <p className="text-sm text-red-400">{formError}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTaskForm(false)}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-5 py-2 font-medium hover:bg-indigo-500 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingTask
                    ? "Save Changes"
                    : "Create Task"}
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
