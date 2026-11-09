
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone

from channels.layers import get_channel_layer

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import OrderingFilter, SearchFilter

from activity.services import log_activity
from notifications.models import Notification

from .models import Task, TaskComment
from .serializers import TaskSerializer, TaskCommentSerializer
from .permissions import (
    IsCommentAuthorOrReadOnly,
    IsTaskEditorOrReadOnly,
)


def broadcast_task_event(workspace_id, event_type, task_data):
    channel_layer = get_channel_layer()

    transaction.on_commit(
        lambda: transaction_on_commit_broadcast(
            channel_layer,
            workspace_id,
            event_type,
            task_data,
        )
    )


def transaction_on_commit_broadcast(
    channel_layer,
    workspace_id,
    event_type,
    task_data,
):
    from asgiref.sync import async_to_sync

    async_to_sync(channel_layer.group_send)(
        f"workspace_{workspace_id}",
        {
            "type": "task_update",
            "event": event_type,
            "data": task_data,
        },
    )


# TASK LIST AND CREATE API
class TaskListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    # Support search and ordering together.
    filter_backends = [SearchFilter, OrderingFilter]

    # Search task titles and descriptions.
    search_fields = [
        "title",
        "description",
    ]

    ordering_fields = [
        "position",
        "created_at",
        "due_date",
        "priority",
    ]

    ordering = ["position", "-created_at"]

    def get_queryset(self):
        # Only show tasks belonging to workspaces
        # where the current user is a member.
        queryset = Task.objects.filter(
            workspace__memberships__user=self.request.user
        ).distinct()

        # Read query parameters.
        workspace_id = self.request.query_params.get("workspace")
        column_id = self.request.query_params.get("column")
        priority = self.request.query_params.get("priority")
        priorities = self.request.query_params.get("priorities")
        assigned_to = self.request.query_params.get("assigned_to")
        due_before = self.request.query_params.get("due_before")
        due_after = self.request.query_params.get("due_after")
        overdue = self.request.query_params.get("overdue")

        # Filter by workspace.
        if workspace_id:
            queryset = queryset.filter(
                workspace_id=workspace_id
            )

        # Filter by board column.
        if column_id:
            queryset = queryset.filter(
                column_id=column_id
            )

        # Filter by multiple priorities.
        # Example: ?priorities=HIGH,URGENT
        if priorities:
            priority_list = [
                item.strip().upper()
                for item in priorities.split(",")
                if item.strip()
            ]

            if priority_list:
                queryset = queryset.filter(
                    priority__in=priority_list
                )

        # Support the existing single-priority filter.
        elif priority:
            queryset = queryset.filter(
                priority=priority.upper()
            )

        # Filter by assigned user.
        if assigned_to:
            queryset = queryset.filter(
                assigned_to_id=assigned_to
            )

        # Filter tasks due before a specified date.
        if due_before:
            queryset = queryset.filter(
                due_date__lte=due_before
            )

        # Filter tasks due after a specified date.
        if due_after:
            queryset = queryset.filter(
                due_date__gte=due_after
            )

        # Filter overdue tasks.
        # Completed tasks in the Done column are excluded.
        if overdue and overdue.lower() == "true":
            queryset = queryset.filter(
                due_date__lt=timezone.now()
            ).exclude(
                column__name__iexact="Done"
            )

        return queryset

    def perform_create(self, serializer):
        task = serializer.save(
            created_by=self.request.user
        )

        # Record task creation in the Activity Log.
        log_activity(
            workspace=task.workspace,
            actor=self.request.user,
            action="TASK_CREATED",
            description=f"Created task: {task.title}",
            task=task,
        )

        # Create notification for the assigned user.
        if task.assigned_to:
            Notification.objects.create(
                recipient=task.assigned_to,
                message=(
                    f"You have been assigned the task: "
                    f"{task.title}"
                ),
                notification_type=(
                    Notification.NotificationType.TASK_ASSIGNED
                ),
                task=task,
            )

        # Preserve the existing real-time task broadcast.
        broadcast_task_event(
            task.workspace_id,
            "task_created",
            TaskSerializer(task).data,
        )


# TASK DETAIL, UPDATE AND DELETE API
class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TaskSerializer

    permission_classes = [
        IsAuthenticated,
        IsTaskEditorOrReadOnly,
    ]

    def get_queryset(self):
        return Task.objects.filter(
            workspace__memberships__user=self.request.user
        ).distinct()

    def perform_update(self, serializer):
        task = serializer.save()

        # Record task update in the Activity Log.
        log_activity(
            workspace=task.workspace,
            actor=self.request.user,
            action="TASK_UPDATED",
            description=f"Updated task: {task.title}",
            task=task,
        )

        # Preserve the existing real-time task broadcast.
        broadcast_task_event(
            task.workspace_id,
            "task_updated",
            TaskSerializer(task).data,
        )

    def perform_destroy(self, instance):
        workspace = instance.workspace
        workspace_id = instance.workspace_id
        task_id = instance.id
        task_title = instance.title

        # Record deletion before deleting the task.
        log_activity(
            workspace=workspace,
            actor=self.request.user,
            action="TASK_DELETED",
            description=f"Deleted task: {task_title}",
            task=None,
        )

        instance.delete()

        # Preserve the existing real-time task broadcast.
        broadcast_task_event(
            workspace_id,
            "task_deleted",
            {"id": task_id},
        )


# TASK COMMENT LIST AND CREATE API
class TaskCommentListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskCommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TaskComment.objects.filter(
            task_id=self.kwargs["task_id"],
            task__workspace__memberships__user=self.request.user,
        ).distinct()

    def perform_create(self, serializer):
        task = get_object_or_404(
            Task,
            id=self.kwargs["task_id"],
            workspace__memberships__user=self.request.user,
        )

        comment = serializer.save(
            task=task,
            author=self.request.user,
        )

        # Record comment creation in the Activity Log.
        log_activity(
            workspace=task.workspace,
            actor=self.request.user,
            action="COMMENT_ADDED",
            description=f"Added a comment to task: {task.title}",
            task=task,
        )


# TASK COMMENT DETAIL, UPDATE AND DELETE API
class TaskCommentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TaskCommentSerializer

    permission_classes = [
        IsAuthenticated,
        IsCommentAuthorOrReadOnly,
    ]

    def get_queryset(self):
        return TaskComment.objects.filter(
            task_id=self.kwargs["task_id"],
            task__workspace__memberships__user=self.request.user,
        ).distinct()
