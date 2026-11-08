from rest_framework import serializers
from .models import ActivityLog


class ActivityLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(
        source="actor.username",
        read_only=True,
    )

    task_title = serializers.CharField(
        source="task.title",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = ActivityLog
        fields = [
            "id",
            "workspace",
            "actor",
            "actor_username",
            "task",
            "task_title",
            "action",
            "description",
            "created_at",
        ]
        read_only_fields = fields