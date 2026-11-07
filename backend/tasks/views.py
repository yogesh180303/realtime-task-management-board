
from django.shortcuts import get_object_or_404
from django.db import transaction

from channels.layers import get_channel_layer

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import OrderingFilter

from .models import Task, TaskComment
from .serializers import TaskSerializer, TaskCommentSerializer
from .permissions import (
    IsCommentAuthorOrReadOnly,
    IsTaskEditorOrReadOnly,
)

from notifications.models import Notification


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

    filter_backends = [OrderingFilter]

    ordering_fields = [
        "position",
        "created_at",
        "due_date",
        "priority",
    ]

    ordering = ["position", "-created_at"]

    def get_queryset(self):
        queryset = Task.objects.filter(
            workspace__memberships__user=self.request.user
        ).distinct()

        workspace_id = self.request.query_params.get("workspace")
        column_id = self.request.query_params.get("column")
        priority = self.request.query_params.get("priority")
        assigned_to = self.request.query_params.get("assigned_to")

        if workspace_id:
            queryset = queryset.filter(workspace_id=workspace_id)

        if column_id:
            queryset = queryset.filter(column_id=column_id)

        if priority:
            queryset = queryset.filter(priority=priority.upper())

        if assigned_to:
            queryset = queryset.filter(assigned_to_id=assigned_to)

        return queryset

    def perform_create(self, serializer):
        task = serializer.save(created_by=self.request.user)

        # Create notification for the assigned user.
        if task.assigned_to:
            Notification.objects.create(
                recipient=task.assigned_to,
                message=f"You have been assigned the task: {task.title}",
                notification_type=Notification.NotificationType.TASK_ASSIGNED,
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

        broadcast_task_event(
            task.workspace_id,
            "task_updated",
            TaskSerializer(task).data,
        )

    def perform_destroy(self, instance):
        workspace_id = instance.workspace_id
        task_id = instance.id

        instance.delete()

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

        serializer.save(
            task=task,
            author=self.request.user,
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
