
from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Board, BoardColumn
from .serializers import BoardSerializer, BoardColumnSerializer


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
