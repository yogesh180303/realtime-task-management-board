
from rest_framework import serializers

from .models import Task, TaskComment


class TaskSerializer(serializers.ModelSerializer):
    column_name = serializers.ReadOnlyField(
        source="column.name"
    )

    workspace_name = serializers.ReadOnlyField(
        source="workspace.name"
    )

    assigned_to_username = serializers.ReadOnlyField(
        source="assigned_to.username"
    )

    created_by = serializers.ReadOnlyField(
        source="created_by.username"
    )

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "column",
            "column_name",
            "workspace",
            "workspace_name",
            "assigned_to",
            "assigned_to_username",
            "created_by",
            "priority",
            "due_date",
            "position",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "column_name",
            "workspace_name",
            "assigned_to_username",
            "created_by",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        workspace = attrs.get(
            "workspace",
            getattr(self.instance, "workspace", None)
        )

        column = attrs.get(
            "column",
            getattr(self.instance, "column", None)
        )

        assigned_to = attrs.get(
            "assigned_to",
            getattr(self.instance, "assigned_to", None)
        )

        request = self.context.get("request")

        # Check that the column belongs to the workspace.
        if workspace and column:
            if column.board.workspace_id != workspace.id:
                raise serializers.ValidationError(
                    "The selected column must belong to the selected workspace."
                )

        # Check that the requesting user belongs to the workspace.
        if workspace and request and request.user.is_authenticated:
            is_member = workspace.memberships.filter(
                user=request.user
            ).exists()

            if not is_member:
                raise serializers.ValidationError(
                    "You are not a member of this workspace."
                )

        # Check that the assigned user belongs to the workspace.
        if workspace and assigned_to:
            is_assignee_member = workspace.memberships.filter(
                user=assigned_to
            ).exists()

            if not is_assignee_member:
                raise serializers.ValidationError(
                    "The assigned user must be a member of this workspace."
                )

        return attrs


class TaskCommentSerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(
        source="author.username"
    )

    class Meta:
        model = TaskComment
        fields = [
            "id",
            "task",
            "author",
            "content",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "author",
            "created_at",
            "updated_at",
        ]
