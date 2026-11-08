from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated

from workspaces.models import WorkspaceMembership
from .models import ActivityLog
from .serializers import ActivityLogSerializer


class WorkspaceActivityListView(generics.ListAPIView):
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        workspace_id = self.kwargs["workspace_id"]

        is_member = WorkspaceMembership.objects.filter(
            workspace_id=workspace_id,
            user=self.request.user,
        ).exists()

        if not is_member:
            raise PermissionDenied(
                "You must be a workspace member to view its activity."
            )

        return ActivityLog.objects.filter(
            workspace_id=workspace_id
        ).select_related("actor", "task", "workspace")