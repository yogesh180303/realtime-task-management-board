
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Briefcase, FolderKanban } from "lucide-react";
import api from "../services/api";

function DashboardPage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const fetchWorkspaces = async () => {
    try {
      setError("");

      const response = await api.get("workspaces/");
      setWorkspaces(response.data.results || response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load workspaces. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleCreateWorkspace = async (event) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Please enter a workspace name.");
      return;
    }

    setCreating(true);
    setError("");

    try {
      await api.post("workspaces/", {
        name: name.trim(),
        description: description.trim(),
      });

      setName("");
      setDescription("");

      await fetchWorkspaces();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to create workspace. Please try again."
      );
    } finally {
      setCreating(false);
    }
  };

  const handleWorkspaceOpen = (workspaceId) => {
   navigate(`/workspace/${workspaceId}`);
  };

  const handleWorkspaceKeyDown = (event, workspaceId) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleWorkspaceOpen(workspaceId);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-600 p-2 text-white">
              <FolderKanban size={23} />
            </div>

            <h1 className="text-xl font-bold text-slate-800">
              TaskFlow
            </h1>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-800">
            My Workspaces
          </h2>

          <p className="mt-2 text-slate-500">
            Organize your projects and collaborate with your team.
          </p>
        </div>

        {/* Create Workspace Section */}
        <div className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Plus size={21} className="text-indigo-600" />
            Create New Workspace
          </h3>

          <form onSubmit={handleCreateWorkspace} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Workspace Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. College Project"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Description
              </label>

              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe your workspace..."
                rows={3}
                className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              <Plus size={18} />
              {creating ? "Creating..." : "Create Workspace"}
            </button>
          </form>
        </div>

        {/* Workspace List */}
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800">
            Your Workspaces
          </h3>

          <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">
            {workspaces.length} Workspaces
          </span>
        </div>

        {loading ? (
          <p className="py-10 text-center text-slate-500">
            Loading workspaces...
          </p>
        ) : workspaces.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white py-14 text-center">
            <Briefcase
              size={42}
              className="mx-auto mb-4 text-slate-400"
            />

            <h4 className="text-lg font-semibold text-slate-700">
              No workspaces yet
            </h4>

            <p className="mt-2 text-sm text-slate-500">
              Create your first workspace to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((workspace) => (
              <div
                key={workspace.id}
                onClick={() => handleWorkspaceOpen(workspace.id)}
                onKeyDown={(event) =>
                  handleWorkspaceKeyDown(event, workspace.id)
                }
                role="button"
                tabIndex={0}
                aria-label={`Open ${workspace.name} workspace`}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <FolderKanban size={23} />
                </div>

                <h4 className="text-lg font-semibold text-slate-800">
                  {workspace.name}
                </h4>

                <p className="mt-2 min-h-10 text-sm text-slate-500">
                  {workspace.description ||
                    "No description provided."}
                </p>

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="text-xs text-slate-400">
                    Owner: {workspace.owner}
                  </p>
                </div>

                <p className="mt-4 text-sm font-semibold text-indigo-600">
                  Open Workspace →
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default DashboardPage;
