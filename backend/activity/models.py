from django.conf import settings
from django.db import models


class ActivityLog(models.Model):
    class ActionType(models.TextChoices):
        TASK_CREATED = "TASK_CREATED", "Task Created"
        TASK_UPDATED = "TASK_UPDATED", "Task Updated"
        TASK_DELETED = "TASK_DELETED", "Task Deleted"
        COMMENT_ADDED = "COMMENT_ADDED", "Comment Added"
        MEMBER_ADDED = "MEMBER_ADDED", "Member Added"
        MEMBER_REMOVED = "MEMBER_REMOVED", "Member Removed"
        MEMBER_ROLE_CHANGED = "MEMBER_ROLE_CHANGED", "Member Role Changed"

    workspace = models.ForeignKey(
        "workspaces.Workspace",
        on_delete=models.CASCADE,
        related_name="activity_logs",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activity_logs",
    )
    task = models.ForeignKey(
        "tasks.Task",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activity_logs",
    )
    action = models.CharField(
        max_length=30,
        choices=ActionType.choices,
    )
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["workspace", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.action} - {self.workspace}"