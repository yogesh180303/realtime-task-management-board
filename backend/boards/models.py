
from django.contrib.auth.models import User
from django.db import models
from django.db.models import Max

from workspaces.models import Workspace


class Board(models.Model):
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="boards",
    )

    name = models.CharField(max_length=150)

    description = models.TextField(blank=True)

    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="created_boards",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.workspace.name} - {self.name}"


class BoardColumn(models.Model):
    board = models.ForeignKey(
        Board,
        on_delete=models.CASCADE,
        related_name="columns",
    )

    name = models.CharField(max_length=100)

    position = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["position"]
        constraints = [
            models.UniqueConstraint(
                fields=["board", "position"],
                name="unique_board_column_position",
            )
        ]

    def save(self, *args, **kwargs):
        if self._state.adding and self.position == 0:
            max_position = BoardColumn.objects.filter(
                board=self.board
            ).aggregate(
                max_position=Max("position")
            )["max_position"]

            self.position = (
                max_position + 1 if max_position is not None else 0
            )

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.board.name} - {self.name}"
