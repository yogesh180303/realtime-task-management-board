
from django.utils import timezone
from django.db.models import Count

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from tasks.models import Task
from workspaces.models import WorkspaceMembership


class WorkspaceAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, workspace_id):
        # Verify that the requesting user belongs to the workspace.
        membership = WorkspaceMembership.objects.filter(
            workspace_id=workspace_id,
            user=request.user,
        ).first()

        if not membership:
            raise PermissionDenied(
                "You are not a member of this workspace."
            )

        # Get all tasks belonging to the workspace.
        tasks = Task.objects.filter(
            workspace_id=workspace_id
        )

        # Total task count.
        total_tasks = tasks.count()

        # Tasks grouped by their column names.
        completed_tasks = tasks.filter(
            column__name__iexact="Done"
        ).count()

        pending_tasks = tasks.filter(
            column__name__iexact="To Do"
        ).count()

        in_progress_tasks = tasks.filter(
            column__name__iexact="In Progress"
        ).count()

        # Overdue tasks exclude completed tasks.
        overdue_tasks = tasks.exclude(
            column__name__iexact="Done"
        ).filter(
            due_date__lt=timezone.now()
        ).count()

        # Task distribution by priority.
        priority_distribution = list(
            tasks.values("priority")
            .annotate(count=Count("id"))
            .order_by("priority")
        )

        # Task distribution by board column.
        status_distribution = list(
            tasks.values("column__name")
            .annotate(count=Count("id"))
            .order_by("column__name")
        )

        return Response({
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "pending_tasks": pending_tasks,
            "in_progress_tasks": in_progress_tasks,
            "overdue_tasks": overdue_tasks,
            "priority_distribution": priority_distribution,
            "status_distribution": status_distribution,
        })
