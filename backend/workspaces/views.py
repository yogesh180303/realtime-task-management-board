
from django.contrib.auth.models import User
from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Workspace, WorkspaceMembership
from .serializers import (
    WorkspaceSerializer,
    WorkspaceMembershipSerializer,
)


class WorkspaceListCreateView(generics.ListCreateAPIView):
    serializer_class = WorkspaceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Workspace.objects.filter(
            memberships__user=self.request.user
        ).distinct()

    @transaction.atomic
    def perform_create(self, serializer):
        workspace = serializer.save(owner=self.request.user)

        WorkspaceMembership.objects.create(
            workspace=workspace,
            user=self.request.user,
            role=WorkspaceMembership.Role.OWNER,
        )


class WorkspaceMemberListCreateView(generics.ListCreateAPIView):
    serializer_class = WorkspaceMembershipSerializer
    permission_classes = [IsAuthenticated]

    def get_workspace(self):
        return get_object_or_404(
            Workspace,
            id=self.kwargs["workspace_id"],
        )

    def get_user_membership(self, workspace):
        return WorkspaceMembership.objects.filter(
            workspace=workspace,
            user=self.request.user,
        ).first()

    def get_queryset(self):
        workspace = self.get_workspace()
        membership = self.get_user_membership(workspace)

        if not membership and workspace.owner_id != self.request.user.id:
            raise PermissionDenied(
                "You are not a member of this workspace."
            )

        return WorkspaceMembership.objects.filter(
            workspace=workspace
        ).select_related("user", "workspace")

    def create(self, request, *args, **kwargs):
        workspace = self.get_workspace()
        membership = self.get_user_membership(workspace)

        is_owner = workspace.owner_id == request.user.id
        is_admin = (
            membership is not None
            and membership.role == WorkspaceMembership.Role.ADMIN
        )

        if not is_owner and not is_admin:
            return Response(
                {"detail": "You do not have permission to add members."},
                status=status.HTTP_403_FORBIDDEN,
            )

        username = request.data.get("username")
        role = request.data.get(
            "role",
            WorkspaceMembership.Role.MEMBER,
        )

        if not username:
            return Response(
                {"username": "This field is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if role not in [
            WorkspaceMembership.Role.MEMBER,
            WorkspaceMembership.Role.ADMIN,
        ]:
            return Response(
                {"role": "Invalid role."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if is_admin and role != WorkspaceMembership.Role.MEMBER:
            return Response(
                {
                    "detail": (
                        "Admins can only add members with the Member role."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        user = User.objects.filter(username=username).first()

        if not user:
            return Response(
                {"username": "User does not exist."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if WorkspaceMembership.objects.filter(
            workspace=workspace,
            user=user,
        ).exists():
            return Response(
                {"detail": "This user is already a workspace member."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_membership = WorkspaceMembership.objects.create(
            workspace=workspace,
            user=user,
            role=role,
        )

        serializer = self.get_serializer(new_membership)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )


class WorkspaceMemberDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = WorkspaceMembershipSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return WorkspaceMembership.objects.filter(
            workspace_id=self.kwargs["workspace_id"],
            workspace__memberships__user=self.request.user,
        ).select_related("user", "workspace").distinct()

    def get_actor_permissions(self, member):
        workspace = member.workspace

        is_owner = workspace.owner_id == self.request.user.id

        actor_membership = WorkspaceMembership.objects.filter(
            workspace=workspace,
            user=self.request.user,
        ).first()

        is_admin = (
            actor_membership is not None
            and actor_membership.role == WorkspaceMembership.Role.ADMIN
        )

        return is_owner, is_admin

    def update(self, request, *args, **kwargs):
        member = self.get_object()

        is_owner, is_admin = self.get_actor_permissions(member)

        if member.role == WorkspaceMembership.Role.OWNER:
            return Response(
                {
                    "detail": (
                        "The workspace owner's role cannot be changed."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if not is_owner and not is_admin:
            return Response(
                {
                    "detail": (
                        "You do not have permission to change member roles."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        new_role = request.data.get("role")

        if new_role not in [
            WorkspaceMembership.Role.MEMBER,
            WorkspaceMembership.Role.ADMIN,
        ]:
            return Response(
                {"role": "Invalid role."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if is_admin and (
            member.role != WorkspaceMembership.Role.MEMBER
            or new_role != WorkspaceMembership.Role.MEMBER
        ):
            return Response(
                {
                    "detail": (
                        "Admins can only manage members with the Member role."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(
            member,
            data=request.data,
            partial=True,
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        member = self.get_object()

        is_owner, is_admin = self.get_actor_permissions(member)

        if member.role == WorkspaceMembership.Role.OWNER:
            return Response(
                {
                    "detail": (
                        "The workspace owner cannot be removed."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if not is_owner and not is_admin:
            return Response(
                {
                    "detail": (
                        "You do not have permission to remove members."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if is_admin and member.role != WorkspaceMembership.Role.MEMBER:
            return Response(
                {
                    "detail": (
                        "Admins can only remove regular members."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        member.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)
