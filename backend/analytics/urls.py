
from django.urls import path

from .views import WorkspaceAnalyticsView

urlpatterns = [
    path(
        "workspaces/<int:workspace_id>/",
        WorkspaceAnalyticsView.as_view(),
        name="workspace-analytics",
    ),
]
