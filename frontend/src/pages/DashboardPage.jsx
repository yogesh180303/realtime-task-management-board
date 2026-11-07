
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  FolderKanban,
  LogOut,
  Sparkles,
  Layers,
  ArrowUpRight,
  ArrowRight,
} from "lucide-react";
import api from "../services/api";

function DashboardPage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const fetchWorkspaces = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-indigo-600 p-3 text-white shadow-lg shadow-indigo-200">
              <FolderKanban size={25} />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                TaskFlow
              </h1>
              <p className="text-sm text-slate-500">
                Workspace management
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
          >
            <LogOut size={19} />
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Page introduction */}
        <section className="mb-10">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-xs font-semibold tracking-wide text-indigo-600">
            <Sparkles size={17} />
            YOUR PROJECT HUB
          </div>

          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">
                My Workspaces
              </h2>

              <p className="mt-3 text-lg text-slate-500">
                Bring your projects together, organize your work, and
                collaborate with your team.
              </p>
            </div>

            <div className="flex min-w-44 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                <Layers size={27} />
              </div>

              <div>
                <p className="text-3xl font-bold text-slate-900">
                  {workspaces.length}
                </p>
                <p className="text-sm text-slate-500">
                  {workspaces.length === 1 ? "Workspace" : "Workspaces"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Create workspace */}
        <section className="mb-12 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-4 border-b border-slate-100 px-8 py-6">
            <div className="rounded-xl bg-indigo-600 p-3 text-white">
              <Plus size={27} />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Create a workspace
              </h3>
              <p className="mt-1 text-slate-500">
                Start a new space for your next project.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleCreateWorkspace}
            className="space-y-5 p-8"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="workspace-name"
                  className="mb-3 block text-sm font-semibold text-slate-700"
                >
                  Workspace name
                </label>

                <input
                  id="workspace-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. College Project"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                />
              </div>

              <div>
                <label
                  htmlFor="workspace-description"
                  className="mb-3 block text-sm font-semibold text-slate-700"
                >
                  Description
                </label>

                <input
                  id="workspace-description"
                  type="text"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What is this project about?"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                />
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-3 rounded-2xl bg-indigo-600 px-7 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={21} />
              {creating ? "Creating..." : "Create Workspace"}
            </button>
          </form>
        </section>

        {/* Workspace cards */}
        <section>
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-slate-900">
              Your Projects
            </h3>
            <p className="mt-2 text-slate-500">
              Select a workspace to continue working.
            </p>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-500">
              Loading workspaces...
            </div>
          ) : workspaces.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
                <FolderKanban size={32} />
              </div>

              <h4 className="text-xl font-bold text-slate-800">
                No workspaces yet
              </h4>

              <p className="mt-2 text-sm text-slate-500">
                Create your first workspace to get started.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {workspaces.map((workspace) => (
                <article
                  key={workspace.id}
                  onClick={() => handleWorkspaceOpen(workspace.id)}
                  onKeyDown={(event) =>
                    handleWorkspaceKeyDown(event, workspace.id)
                  }
                  role="button"
                  tabIndex={0}
                  aria-label={`Open ${workspace.name} workspace`}
                  className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-slate-200/60 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                >
                  <div className="mb-8 flex items-center justify-between">
                    <div className="rounded-2xl bg-indigo-50 p-4 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                      <FolderKanban size={29} />
                    </div>

                    <ArrowUpRight
                      size={24}
                      className="text-slate-300 transition group-hover:text-indigo-600"
                    />
                  </div>

                  <h4 className="text-xl font-bold text-slate-900">
                    {workspace.name}
                  </h4>

                  <p className="mt-4 min-h-12 text-sm leading-6 text-slate-500">
                    {workspace.description ||
                      "No description provided."}
                  </p>

                  <div className="my-6 border-t border-slate-100" />

                  <p className="text-sm text-slate-400">
                    Workspace owner
                  </p>

                  <p className="mt-2 font-medium text-slate-800">
                    {workspace.owner}
                  </p>

                  <div className="mt-8 flex items-center justify-between font-semibold text-indigo-600">
                    <span>Open workspace</span>
                    <ArrowRight
                      size={20}
                      className="transition group-hover:translate-x-1"
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default DashboardPage;
