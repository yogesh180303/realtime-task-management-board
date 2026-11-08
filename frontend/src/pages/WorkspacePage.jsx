
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Plus,
  LayoutGrid,
  ArrowLeft,
  ArrowUpRight,
  Layers,
  Sparkles,
  FolderKanban,
  Users,
  UserPlus,
  Shield,
  Trash2,
  Activity,
  Clock,
} from "lucide-react";
import api from "../services/api";

function WorkspacePage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();

  const [workspace, setWorkspace] = useState(null);
  const [boards, setBoards] = useState([]);
  const [members, setMembers] = useState([]);
  const [activities, setActivities] = useState([]);

  const [boardName, setBoardName] = useState("");
  const [description, setDescription] = useState("");

  const [memberUsername, setMemberUsername] = useState("");
  const [memberRole, setMemberRole] = useState("MEMBER");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [updatingMember, setUpdatingMember] = useState(null);
  const [removingMember, setRemovingMember] = useState(null);

  const [error, setError] = useState("");
  const [memberError, setMemberError] = useState("");
  const [memberSuccess, setMemberSuccess] = useState("");
  const [activityError, setActivityError] = useState("");

  const currentUser = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const ownMembership = members.find(
    (member) => member.username === currentUser.username
  );

  const isOwner =
    workspace?.owner === currentUser.username ||
    ownMembership?.role === "OWNER";

  const isAdmin = ownMembership?.role === "ADMIN";

  const canManageMembers = isOwner || isAdmin;

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

        try {
          const memberResponse = await api.get(
            `workspaces/${workspaceId}/members/`
          );

          const memberData =
            memberResponse.data.results || memberResponse.data;

          setMembers(memberData);
        } catch (memberErr) {
          setMemberError(
            memberErr.response?.data?.detail ||
              "Unable to load workspace members."
          );
        }

        // Load workspace activity history.
        try {
          const activityResponse = await api.get(
            `activity/workspaces/${workspaceId}/`
          );

          const activityData =
            activityResponse.data.results || activityResponse.data;

          setActivities(activityData);
          setActivityError("");
        } catch (activityErr) {
          setActivityError(
            activityErr.response?.data?.detail ||
              "Unable to load activity history."
          );
        }
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

  async function handleAddMember(event) {
    event.preventDefault();

    if (!memberUsername.trim()) return;

    setAddingMember(true);
    setMemberError("");
    setMemberSuccess("");

    try {
      const response = await api.post(
        `workspaces/${workspaceId}/members/`,
        {
          username: memberUsername.trim(),
          role: memberRole,
        }
      );

      setMembers((previous) => [...previous, response.data]);
      setMemberUsername("");
      setMemberRole("MEMBER");
      setMemberSuccess(
        `${response.data.username} was added to the workspace.`
      );
    } catch (err) {
      const data = err.response?.data;

      setMemberError(
        data?.detail ||
          data?.username ||
          data?.role ||
          "Unable to add this member."
      );
    } finally {
      setAddingMember(false);
    }
  }

  async function handleChangeRole(member, newRole) {
    if (newRole === member.role) return;

    setUpdatingMember(member.id);
    setMemberError("");
    setMemberSuccess("");

    try {
      const response = await api.patch(
        `workspaces/${workspaceId}/members/${member.id}/`,
        { role: newRole }
      );

      setMembers((previous) =>
        previous.map((item) =>
          item.id === member.id ? response.data : item
        )
      );

      setMemberSuccess(
        `${member.username}'s role was updated to ${newRole}.`
      );
    } catch (err) {
      setMemberError(
        err.response?.data?.detail ||
          "Unable to update this member's role."
      );
    } finally {
      setUpdatingMember(null);
    }
  }

  async function handleRemoveMember(member) {
    const confirmed = window.confirm(
      `Are you sure you want to remove ${member.username} from this workspace?`
    );

    if (!confirmed) return;

    setRemovingMember(member.id);
    setMemberError("");
    setMemberSuccess("");

    try {
      await api.delete(
        `workspaces/${workspaceId}/members/${member.id}/`
      );

      setMembers((previous) =>
        previous.filter((item) => item.id !== member.id)
      );

      setMemberSuccess(
        `${member.username} was removed from the workspace.`
      );
    } catch (err) {
      setMemberError(
        err.response?.data?.detail ||
          "Unable to remove this member."
      );
    } finally {
      setRemovingMember(null);
    }
  }

  function canRemoveMember(member) {
    if (member.role === "OWNER") return false;

    if (isOwner) return true;

    return isAdmin && member.role === "MEMBER";
  }

  function formatActivityDate(date) {
    if (!date) return "Recently";

    return new Date(date).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
          <p className="text-sm font-medium text-slate-500">
            Loading workspace...
          </p>
        </div>
      </div>
    );
  }

  if (error && !workspace) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6">
        <div className="rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <p className="font-medium text-red-600">{error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="group flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
              <Layers size={21} />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              TaskFlow
            </span>
          </button>

          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-5 py-9 md:px-8 md:py-12">
        {/* Workspace overview */}
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
            <Sparkles size={15} />
            Workspace overview
          </div>

          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <h1 className="break-words text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {workspace?.name}
              </h1>
              <p className="mt-3 text-base leading-7 text-slate-500">
                {workspace?.description ||
                  "Organize your work, create boards, and keep your team moving forward."}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <LayoutGrid size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {boards.length}
                </p>
                <p className="text-xs font-medium text-slate-500">
                  {boards.length === 1 ? "Board" : "Boards"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Workspace members */}
        <section className="mb-12 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Users size={23} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Workspace members
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Manage your team and their workspace permissions.
                </p>
              </div>
            </div>

            <span className="w-fit rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
              {members.length}{" "}
              {members.length === 1 ? "Member" : "Members"}
            </span>
          </div>

          {/* Add member form */}
          {canManageMembers && (
            <form
              onSubmit={handleAddMember}
              className="mb-7 rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <div className="mb-4 flex items-center gap-2">
                <UserPlus size={18} className="text-indigo-600" />
                <h3 className="font-semibold text-slate-800">
                  Add a team member
                </h3>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_180px_auto]">
                <div>
                  <label
                    htmlFor="memberUsername"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Username
                  </label>
                  <input
                    id="memberUsername"
                    type="text"
                    placeholder="Enter existing username"
                    value={memberUsername}
                    onChange={(event) =>
                      setMemberUsername(event.target.value)
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="memberRole"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Workspace role
                  </label>
                  <select
                    id="memberRole"
                    value={memberRole}
                    onChange={(event) =>
                      setMemberRole(event.target.value)
                    }
                    disabled={isAdmin && !isOwner}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 disabled:bg-slate-100"
                  >
                    <option value="MEMBER">Member</option>
                    {isOwner && (
                      <option value="ADMIN">Admin</option>
                    )}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={addingMember || !memberUsername.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
                  >
                    <Plus size={17} />
                    {addingMember ? "Adding..." : "Add member"}
                  </button>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-400">
                Users must already have a TaskFlow account. Admins can add
                regular members; owners can also assign the Admin role.
              </p>
            </form>
          )}

          {/* Member messages */}
          {memberError && (
            <p
              role="alert"
              className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              {memberError}
            </p>
          )}

          {memberSuccess && (
            <p
              role="status"
              className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
            >
              {memberSuccess}
            </p>
          )}

          {/* Member list */}
          {members.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center">
              <Users
                size={28}
                className="mx-auto mb-3 text-slate-400"
              />
              <p className="font-semibold text-slate-700">
                No members found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Workspace members will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="hidden grid-cols-[1fr_150px_170px] gap-4 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 sm:grid">
                <span>Member</span>
                <span>Role</span>
                <span className="text-right">Actions</span>
              </div>

              <div className="divide-y divide-slate-100">
                {members.map((member) => {
                  const isCurrentUser =
                    member.username === currentUser.username;

                  return (
                    <div
                      key={member.id}
                      className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_150px_170px] sm:items-center sm:gap-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
                          {member.username?.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {member.username}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs font-medium text-slate-400">
                                (You)
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            Joined{" "}
                            {member.joined_at
                              ? new Date(
                                  member.joined_at
                                ).toLocaleDateString()
                              : "Recently"}
                          </p>
                        </div>
                      </div>

                      <div>
                        {isOwner && member.role !== "OWNER" ? (
                          <select
                            aria-label={`Change ${member.username}'s role`}
                            value={member.role}
                            disabled={updatingMember === member.id}
                            onChange={(event) =>
                              handleChangeRole(
                                member,
                                event.target.value
                              )
                            }
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 disabled:opacity-50"
                          >
                            <option value="MEMBER">Member</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                              member.role === "OWNER"
                                ? "bg-amber-50 text-amber-700"
                                : member.role === "ADMIN"
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {member.role === "OWNER" && (
                              <Shield size={12} />
                            )}
                            {member.role}
                          </span>
                        )}
                      </div>

                      <div className="flex justify-start sm:justify-end">
                        {canManageMembers &&
                          canRemoveMember(member) && (
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveMember(member)
                              }
                              disabled={
                                removingMember === member.id ||
                                updatingMember === member.id
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Trash2 size={14} />
                              {removingMember === member.id
                                ? "Removing..."
                                : "Remove"}
                            </button>
                          )}

                        {member.role === "OWNER" && (
                          <span className="text-xs font-medium text-slate-400">
                            Workspace owner
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!canManageMembers && (
            <p className="mt-4 text-xs text-slate-400">
              You can view workspace members. Only workspace owners and
              admins can manage membership.
            </p>
          )}
        </section>

        {/* Activity History */}
        <section className="mb-12 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <Activity size={23} />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Activity History
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Keep track of important actions in this workspace.
                </p>
              </div>
            </div>

            <span className="w-fit rounded-full bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700">
              {activities.length}{" "}
              {activities.length === 1 ? "Activity" : "Activities"}
            </span>
          </div>

          {activityError ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-100 bg-red-50 px-5 py-6 text-center"
            >
              <p className="text-sm font-medium text-red-600">
                {activityError}
              </p>
            </div>
          ) : activities.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center">
              <Clock
                size={28}
                className="mx-auto mb-3 text-slate-400"
              />
              <p className="font-semibold text-slate-700">
                No activity yet
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Workspace actions will appear here as your team works.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activities.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 py-5 first:pt-0 last:pb-0"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <Activity size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium leading-6 text-slate-800">
                      {item.description}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                      <span className="font-semibold text-slate-500">
                        {item.actor_username || "Unknown user"}
                      </span>

                      <span className="hidden sm:inline">•</span>

                      <span>
                        {formatActivityDate(item.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Create board */}
        <section className="mb-12 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Plus size={23} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Create a new board
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Start organizing tasks with a dedicated project board.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateBoard} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="boardName"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Board name
                </label>
                <input
                  id="boardName"
                  type="text"
                  placeholder="e.g. Website Redesign"
                  value={boardName}
                  onChange={(event) =>
                    setBoardName(event.target.value)
                  }
                  required
                  maxLength={150}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                />
              </div>

              <div>
                <label
                  htmlFor="boardDescription"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Description
                  <span className="ml-2 font-normal text-slate-400">
                    Optional
                  </span>
                </label>
                <input
                  id="boardDescription"
                  type="text"
                  placeholder="What is this board for?"
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                />
              </div>
            </div>

            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <p className="text-xs text-slate-400">
                You can add and organize tasks after opening your board.
              </p>
              <button
                type="submit"
                disabled={creating || !boardName.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <Plus size={17} />
                {creating ? "Creating board..." : "Create board"}
              </button>
            </div>
          </form>

          {error && (
            <p role="alert" className="mt-4 text-sm text-red-600">
              {error}
            </p>
          )}
        </section>

        {/* Boards */}
        <section>
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Project space
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Your boards
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Open a board to view and manage its tasks.
              </p>
            </div>
            <span className="text-sm font-medium text-slate-400">
              {boards.length} {boards.length === 1 ? "board" : "boards"}
            </span>
          </div>

          {boards.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
                <FolderKanban size={27} />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">
                No boards yet
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Create your first board above to start organizing tasks
                in this workspace.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {boards.map((board) => (
                <button
                  key={board.id}
                  onClick={() => navigate(`/board/${board.id}`)}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/60 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500 opacity-0 transition group-hover:opacity-100" />

                  <div className="mb-5 flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                      <LayoutGrid size={23} />
                    </div>
                    <ArrowUpRight
                      size={19}
                      className="text-slate-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-indigo-600"
                    />
                  </div>

                  <h3 className="break-words text-lg font-bold text-slate-900">
                    {board.name}
                  </h3>
                  <p className="mt-2 min-h-10 text-sm leading-5 text-slate-500">
                    {board.description || "No description provided."}
                  </p>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-xs font-semibold text-indigo-600">
                      Open board
                    </span>
                    <span className="text-xs text-slate-400">
                      View tasks
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default WorkspacePage;
