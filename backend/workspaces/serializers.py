
from rest_framework import serializers

from .models import Workspace, WorkspaceMembership


class WorkspaceSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")

    class Meta:
        model = Workspace
        fields = [
            "id",
            "name",
            "description",
            "owner",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "owner",
            "created_at",
            "updated_at",
        ]


class WorkspaceMembershipSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source="user.username")
    workspace_name = serializers.ReadOnlyField(
        source="workspace.name"
    )

    class Meta:
        model = WorkspaceMembership
        fields = [
            "id",
            "workspace",
            "workspace_name",
            "user",
            "username",
            "role",
            "joined_at",
        ]

        read_only_fields = [
            "id",
            "workspace",
            "user",
            "workspace_name",
            "username",
            "joined_at",
        ]
