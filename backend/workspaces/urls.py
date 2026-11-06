from django.urls import path

from .views import WorkspaceListCreateView


urlpatterns = [
    path(
        "",
        WorkspaceListCreateView.as_view(),
        name="workspace-list-create",
    ),
]