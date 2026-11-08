from django.contrib import admin
from .models import ActivityLog


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "workspace",
        "actor",
        "action",
        "description",
        "created_at",
    )
    list_filter = ("action", "created_at")
    search_fields = (
        "description",
        "actor__username",
        "workspace__name",
    )
    readonly_fields = ("created_at",)