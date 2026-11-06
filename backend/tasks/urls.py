
from django.urls import path

from .views import (
    TaskListCreateView,
    TaskDetailView,
    TaskCommentListCreateView,
    TaskCommentDetailView,
)


urlpatterns = [
    # List and create tasks
    path(
        "",
        TaskListCreateView.as_view(),
        name="task-list-create",
    ),

    # Retrieve, update and delete a task
    path(
        "<int:pk>/",
        TaskDetailView.as_view(),
        name="task-detail",
    ),

    # List and create task comments
    path(
        "<int:task_id>/comments/",
        TaskCommentListCreateView.as_view(),
        name="task-comment-list-create",
    ),

    # Retrieve, update and delete a comment
    path(
        "<int:task_id>/comments/<int:pk>/",
        TaskCommentDetailView.as_view(),
        name="task-comment-detail",
    ),
]
