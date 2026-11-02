from django.contrib import admin

from .models import Board, BoardColumn


@admin.register(Board)
class BoardAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "workspace", "created_by", "created_at")
    search_fields = ("name", "workspace__name")


@admin.register(BoardColumn)
class BoardColumnAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "board", "position")
    list_filter = ("board",)
    search_fields = ("name", "board__name")