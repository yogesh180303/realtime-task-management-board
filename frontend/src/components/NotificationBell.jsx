
import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, LoaderCircle } from "lucide-react";
import api from "../services/api";

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("notifications/");
      setNotifications(response.data.results || response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
  let isActive = true;

  api
    .get("notifications/")
    .then((response) => {
      if (isActive) {
        setNotifications(response.data.results || response.data);
      }
    })
    .catch((err) => {
      if (isActive) {
        setError(
          err.response?.data?.detail ||
            "Unable to load notifications."
        );
      }
    })
    .finally(() => {
      if (isActive) {
        setLoading(false);
      }
    });

  return () => {
    isActive = false;
  };
}, []);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.patch(`notifications/${notificationId}/`, {
        is_read: true,
      });

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch {
      setError("Unable to update notification.");
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          const nextState = !isOpen;
          setIsOpen(nextState);

          if (nextState) {
            fetchNotifications();
          }
        }}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={isOpen}
        className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
      >
        <Bell size={21} />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-14 z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="font-bold text-slate-900">
                Notifications
              </h3>
              <p className="text-xs text-slate-500">
                {unreadCount} unread notifications
              </p>
            </div>

            <button
              type="button"
              onClick={fetchNotifications}
              disabled={loading}
              aria-label="Refresh notifications"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
            >
              <LoaderCircle
                size={18}
                className={loading ? "animate-spin" : ""}
              />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {error && (
              <p className="px-5 py-4 text-sm text-red-600">
                {error}
              </p>
            )}

            {loading && notifications.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                Loading notifications...
              </p>
            ) : notifications.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                You're all caught up!
              </p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border-b border-slate-100 px-5 py-4 ${
                    notification.is_read ? "bg-white" : "bg-indigo-50/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {notification.message}
                      </p>

                      {notification.task_title && (
                        <p className="mt-1 text-xs text-slate-500">
                          Task: {notification.task_title}
                        </p>
                      )}

                      <p className="mt-2 text-xs text-slate-400">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>

                    {!notification.is_read && (
                      <button
                        type="button"
                        onClick={() =>
                          handleMarkAsRead(notification.id)
                        }
                        aria-label="Mark notification as read"
                        title="Mark as read"
                        className="shrink-0 rounded-lg p-2 text-indigo-600 transition hover:bg-indigo-100"
                      >
                        <CheckCheck size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
