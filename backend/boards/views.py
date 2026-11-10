
from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated

from workspaces.models import WorkspaceMembership

from .models import Board, BoardColumn
from .serializers import BoardSerializer, BoardColumnSerializer


# SHARED WORKSPACE ROLE CHECK
def check_board_management_permission(user, workspace):
    membership = WorkspaceMembership.objects.filter(
        workspace=workspace,
        user=user,
    ).first()

    if not membership:
        raise PermissionDenied(
            "You must be a workspace member to perform this action."
        )

    if membership.role not in [
        WorkspaceMembership.Role.OWNER,
        WorkspaceMembership.Role.ADMIN,
    ]:
        raise PermissionDenied(
            "Only workspace owners and admins can manage boards and columns."
        )


# BOARD LIST AND CREATE API
class BoardListCreateView(generics.ListCreateAPIView):
    serializer_class = BoardSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Board.objects.filter(
            workspace__memberships__user=self.request.user
        ).distinct()

    @transaction.atomic
    def perform_create(self, serializer):
        workspace = serializer.validated_data["workspace"]

        # Only owners and admins can create boards.
        check_board_management_permission(
            self.request.user,
            workspace,
        )

        board = serializer.save(
            created_by=self.request.user
        )

        default_columns = [
            "To Do",
            "In Progress",
            "Done",
        ]

        BoardColumn.objects.bulk_create([
            BoardColumn(
                board=board,
                name=name,
                position=position,
            )
            for position, name in enumerate(default_columns)
        ])


# BOARD RETRIEVE, UPDATE AND DELETE API
class BoardDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BoardSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Board.objects.filter(
            workspace__memberships__user=self.request.user
        ).distinct()

    def perform_update(self, serializer):
        board = self.get_object()

        check_board_management_permission(
            self.request.user,
            board.workspace,
        )

        serializer.save()

    def perform_destroy(self, instance):
        check_board_management_permission(
            self.request.user,
            instance.workspace,
        )

        instance.delete()


# BOARD COLUMN LIST AND CREATE API
class BoardColumnListCreateView(generics.ListCreateAPIView):
    serializer_class = BoardColumnSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BoardColumn.objects.filter(
            board_id=self.kwargs["board_id"],
            board__workspace__memberships__user=self.request.user,
        ).distinct()

    def perform_create(self, serializer):
        board = get_object_or_404(
            Board,
            id=self.kwargs["board_id"],
            workspace__memberships__user=self.request.user,
        )

        check_board_management_permission(
            self.request.user,
            board.workspace,
        )

        serializer.save(board=board)


# BOARD COLUMN RETRIEVE, UPDATE AND DELETE API
class BoardColumnDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BoardColumnSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BoardColumn.objects.filter(
            board_id=self.kwargs["board_id"],
            board__workspace__memberships__user=self.request.user,
        ).distinct()

    def perform_update(self, serializer):
        column = self.get_object()

        check_board_management_permission(
            self.request.user,
            column.board.workspace,
        )

        serializer.save()

    def perform_destroy(self, instance):
        check_board_management_permission(
            self.request.user,
            instance.board.workspace,
        )

        instance.delete()
