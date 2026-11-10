
from rest_framework import serializers

from .models import Task, TaskComment


class TaskFilterSerializer(serializers.Serializer):
    workspace = serializers.IntegerField(
        required=False,
        min_value=1,
    )

    column = serializers.IntegerField(
        required=False,
        min_value=1,
    )

    priority = serializers.ChoiceField(
        choices=Task.Priority.choices,
        required=False,
    )

    priorities = serializers.CharField(
        required=False,
    )

    assigned_to = serializers.IntegerField(
        required=False,
        min_value=1,
    )

    due_before = serializers.DateTimeField(
        required=False,
    )

    due_after = serializers.DateTimeField(
        required=False,
    )

    overdue = serializers.BooleanField(
        required=False,
    )

    def validate_priorities(self, value):
        priority_list = [
            item.strip().upper()
            for item in value.split(",")
            if item.strip()
        ]

        if not priority_list:
            raise serializers.ValidationError(
                "Provide at least one valid priority."
            )

        valid_priorities = [
            choice[0]
            for choice in Task.Priority.choices
        ]

        invalid_priorities = [
            item
            for item in priority_list
            if item not in valid_priorities
        ]

        if invalid_priorities:
            raise serializers.ValidationError(
                f"Invalid priorities: {', '.join(invalid_priorities)}. "
                f"Allowed values: {', '.join(valid_priorities)}."
            )

        return list(dict.fromkeys(priority_list))

    def validate(self, attrs):
        due_after = attrs.get("due_after")
        due_before = attrs.get("due_before")

        if (
            due_after is not None
            and due_before is not None
            and due_after > due_before
        ):
            raise serializers.ValidationError({
                "due_after": (
                    "The start date must be earlier than "
                    "or equal to the end date."
                )
            })

        return attrs


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

        if workspace and column:
            if column.board.workspace_id != workspace.id:
                raise serializers.ValidationError(
                    "The selected column must belong to the selected workspace."
                )

        if workspace and request and request.user.is_authenticated:
            is_member = workspace.memberships.filter(
                user=request.user
            ).exists()

            if not is_member:
                raise serializers.ValidationError(
                    "You are not a member of this workspace."
                )

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
            "task",
            "author",
            "created_at",
            "updated_at",
        ]
