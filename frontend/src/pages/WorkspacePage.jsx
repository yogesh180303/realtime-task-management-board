
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, LayoutGrid, ArrowLeft } from "lucide-react";
import api from "../services/api";

function WorkspacePage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();

  const [workspace, setWorkspace] = useState(null);
  const [boards, setBoards] = useState([]);
  const [boardName, setBoardName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadWorkspace() {
      try {
        const [workspaceResponse, boardResponse] = await Promise.all([
          api.get("workspaces/"),
          api.get("boards/"),
        ]);

        const workspaces =
          workspaceResponse.data.results || workspaceResponse.data;

        const allBoards =
          boardResponse.data.results || boardResponse.data;

        const currentWorkspace = workspaces.find(
          (item) => item.id === Number(workspaceId)
        );

        if (!currentWorkspace) {
          setError("Workspace not found or you do not have access.");
          return;
        }

        setWorkspace(currentWorkspace);

        setBoards(
          allBoards.filter(
            (board) => board.workspace === Number(workspaceId)
          )
        );
      } catch (err) {
        setError(
          err.response?.data?.detail || "Unable to load workspace."
        );
      } finally {
        setLoading(false);
      }
    }

    loadWorkspace();
  }, [workspaceId]);

  async function handleCreateBoard(event) {
    event.preventDefault();

    if (!boardName.trim()) return;

    setCreating(true);
    setError("");

    try {
      const response = await api.post("boards/", {
        workspace: Number(workspaceId),
        name: boardName.trim(),
        description: description.trim(),
      });

      setBoards((previous) => [...previous, response.data]);
      setBoardName("");
      setDescription("");

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        JSON.stringify(err.response?.data) ||
        "Unable to create board."
      );
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading workspace...
      </div>
    );
  }

  if (error && !workspace) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => navigate("/dashboard")}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-white"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl">

        <button
          onClick={() => navigate("/dashboard")}
          className="mb-8 flex items-center gap-2 text-slate-600 hover:text-indigo-600"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900">
            {workspace?.name}
          </h1>

          <p className="mt-2 text-slate-500">
            {workspace?.description || "Manage your workspace boards."}
          </p>
        </div>

        <div className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-800">
            Create a New Board
          </h2>

          <form onSubmit={handleCreateBoard} className="space-y-4">
            <input
              type="text"
              placeholder="Board name"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
            />

            <textarea
              placeholder="Board description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
            />

            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              <Plus size={18} />
              {creating ? "Creating..." : "Create Board"}
            </button>
          </form>

          {error && (
            <p className="mt-4 text-sm text-red-600">{error}</p>
          )}
        </div>

        <div>
          <h2 className="mb-5 text-xl font-semibold text-slate-800">
            Your Boards
          </h2>

          {boards.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
              No boards yet. Create your first board above.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {boards.map((board) => (
                <button
                  key={board.id}
                  onClick={() => navigate(`/board/${board.id}`)}
                  className="rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md"
                >
                  <LayoutGrid
                    size={25}
                    className="mb-4 text-indigo-600"
                  />

                  <h3 className="font-semibold text-slate-900">
                    {board.name}
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    {board.description || "No description provided."}
                  </p>

                  <p className="mt-5 text-sm font-medium text-indigo-600">
                    Open Board →
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default WorkspacePage;
