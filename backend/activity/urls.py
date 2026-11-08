from django.urls import path
from .views import WorkspaceActivityListView

urlpatterns = [
    path(
        "workspaces/<int:workspace_id>/",
        WorkspaceActivityListView.as_view(),
        name="workspace-activity",
    ),
]