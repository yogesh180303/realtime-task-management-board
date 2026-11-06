from django.contrib import admin
from django.urls import include, path


urlpatterns = [
    path("admin/", admin.site.urls),

    path("api/accounts/", include("accounts.urls")),

    path("api/workspaces/", include("workspaces.urls")),

    path("api/boards/", include("boards.urls")),

    path("api/tasks/", include("tasks.urls")),
]