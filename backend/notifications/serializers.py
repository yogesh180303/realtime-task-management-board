
from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    recipient = serializers.ReadOnlyField(
        source="recipient.username"
    )

    task_title = serializers.ReadOnlyField(
        source="task.title"
    )

    class Meta:
        model = Notification
        fields = [
            "id",
            "recipient",
            "message",
            "notification_type",
            "is_read",
            "task",
            "task_title",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "recipient",
            "message",
            "notification_type",
            "task",
            "task_title",
            "created_at",
        ]
