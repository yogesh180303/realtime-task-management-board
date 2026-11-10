from django.contrib import admin
from django.urls import path, include

from config.health import health_check

urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("admin/", admin.site.urls),
    path("api/accounts/", include("accounts.urls")),
    path("api/workspaces/", include("workspaces.urls")),
    path("api/boards/", include("boards.urls")),
    path("api/tasks/", include("tasks.urls")),
    path("api/notifications/", include("notifications.urls")),
    path("api/activity/", include("activity.urls")),
    path("api/analytics/", include("analytics.urls")),
]