from django.contrib import admin

from .models import Task, TaskComment


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "workspace",
        "column",
        "assigned_to",
        "priority",
        "due_date",
    )

    list_filter = ("priority", "column")
    search_fields = ("title", "description")


@admin.register(TaskComment)
class TaskCommentAdmin(admin.ModelAdmin):
    list_display = ("id", "task", "author", "created_at")
    search_fields = ("task__title", "author__username")