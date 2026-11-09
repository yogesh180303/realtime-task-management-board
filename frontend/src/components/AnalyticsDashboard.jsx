
import { useEffect, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  ListTodo,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import api from "../services/api";

const summaryCards = [
  {
    key: "total_tasks",
    label: "Total Tasks",
    icon: ListTodo,
    color: "bg-blue-100 text-blue-600",
  },
  {
    key: "completed_tasks",
    label: "Completed",
    icon: CheckCircle2,
    color: "bg-green-100 text-green-600",
  },
  {
    key: "pending_tasks",
    label: "Pending",
    icon: Clock3,
    color: "bg-yellow-100 text-yellow-700",
  },
  {
    key: "in_progress_tasks",
    label: "In Progress",
    icon: TrendingUp,
    color: "bg-purple-100 text-purple-600",
  },
  {
    key: "overdue_tasks",
    label: "Overdue",
    icon: AlertTriangle,
    color: "bg-red-100 text-red-600",
  },
];

const priorityColors = {
  LOW: "bg-green-500",
  MEDIUM: "bg-yellow-500",
  HIGH: "bg-orange-500",
  URGENT: "bg-red-500",
};

export default function AnalyticsDashboard({ workspaceId }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          `analytics/workspaces/${workspaceId}/`
        );

        if (isActive) {
          setAnalytics(response.data);
        }
      } catch (err) {
        if (isActive) {
          setError(
            err.response?.data?.detail ||
              "Unable to load workspace analytics."
          );
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    if (workspaceId) {
      fetchAnalytics();
    }

    return () => {
      isActive = false;
    };
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">
        Loading workspace analytics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const maxPriorityCount = Math.max(
    1,
    ...analytics.priority_distribution.map((item) => item.count)
  );

  const maxStatusCount = Math.max(
    1,
    ...analytics.status_distribution.map((item) => item.count)
  );

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-indigo-100 p-3 text-indigo-600">
          <BarChart3 size={22} />
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Workspace Analytics
          </h2>
          <p className="text-sm text-gray-500">
            An overview of your workspace tasks and progress.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.key}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">
                  {card.label}
                </span>

                <div className={`rounded-xl p-2 ${card.color}`}>
                  <Icon size={19} />
                </div>
              </div>

              <p className="mt-4 text-3xl font-bold text-gray-900">
                {analytics[card.key]}
              </p>
            </div>
          );
        })}
      </div>

      {/* Distribution charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Priority distribution */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900">
            Tasks by Priority
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Distribution of tasks across priority levels.
          </p>

          <div className="mt-6 space-y-5">
            {analytics.priority_distribution.length === 0 ? (
              <p className="text-sm text-gray-500">
                No priority data available.
              </p>
            ) : (
              analytics.priority_distribution.map((item) => (
                <div key={item.priority}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-gray-700">
                      {item.priority}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {item.count}
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${
                        priorityColors[item.priority] || "bg-indigo-500"
                      }`}
                      style={{
                        width: `${
                          (item.count / maxPriorityCount) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Status distribution */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900">
            Tasks by Status
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Distribution of tasks across board columns.
          </p>

          <div className="mt-6 space-y-5">
            {analytics.status_distribution.length === 0 ? (
              <p className="text-sm text-gray-500">
                No status data available.
              </p>
            ) : (
              analytics.status_distribution.map((item) => (
                <div key={item.column__name}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-gray-700">
                      {item.column__name}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {item.count}
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{
                        width: `${
                          (item.count / maxStatusCount) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
