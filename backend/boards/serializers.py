from rest_framework import serializers

from .models import Board, BoardColumn


class BoardSerializer(serializers.ModelSerializer):
    workspace_name = serializers.ReadOnlyField(
        source="workspace.name"
    )

    created_by = serializers.ReadOnlyField(
        source="created_by.username"
    )

    class Meta:
        model = Board
        fields = [
            "id",
            "workspace",
            "workspace_name",
            "name",
            "description",
            "created_by",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "workspace_name",
            "created_by",
            "created_at",
            "updated_at",
        ]


class BoardColumnSerializer(serializers.ModelSerializer):
    board_name = serializers.ReadOnlyField(
        source="board.name"
    )

    class Meta:
        model = BoardColumn
        fields = [
            "id",
            "board",
            "board_name",
            "name",
            "position",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "board_name",
            "created_at",
        ]