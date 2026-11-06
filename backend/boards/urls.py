from django.urls import path

from .views import (
    BoardListCreateView,
    BoardDetailView,
    BoardColumnListCreateView,
    BoardColumnDetailView,
)


urlpatterns = [
    # List and create boards
    path(
        "",
        BoardListCreateView.as_view(),
        name="board-list-create",
    ),

    # Retrieve, update and delete a board
    path(
        "<int:pk>/",
        BoardDetailView.as_view(),
        name="board-detail",
    ),

    # List and create board columns
    path(
        "<int:board_id>/columns/",
        BoardColumnListCreateView.as_view(),
        name="board-column-list-create",
    ),

    # Retrieve, update and delete a board column
    path(
        "<int:board_id>/columns/<int:pk>/",
        BoardColumnDetailView.as_view(),
        name="board-column-detail",
    ),
]