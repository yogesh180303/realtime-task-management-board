
from django.urls import path

from .views import (
    WorkspaceListCreateView,
    WorkspaceMemberListCreateView,
    WorkspaceMemberDetailView,
)


urlpatterns = [
    path(
        "",
        WorkspaceListCreateView.as_view(),
        name="workspace-list-create",
    ),
    path(
        "<int:workspace_id>/members/",
        WorkspaceMemberListCreateView.as_view(),
        name="workspace-member-list-create",
    ),
    path(
        "<int:workspace_id>/members/<int:pk>/",
        WorkspaceMemberDetailView.as_view(),
        name="workspace-member-detail",
    ),
]
