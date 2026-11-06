
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Workspace, WorkspaceMembership
from .serializers import WorkspaceSerializer


class WorkspaceListCreateView(generics.ListCreateAPIView):
    serializer_class = WorkspaceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Workspace.objects.filter(
            memberships__user=self.request.user
        ).distinct()

    def perform_create(self, serializer):
        workspace = serializer.save(owner=self.request.user)

        WorkspaceMembership.objects.create(
            workspace=workspace,
            user=self.request.user,
            role=WorkspaceMembership.Role.OWNER,
        )
