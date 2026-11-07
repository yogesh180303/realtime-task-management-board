
from rest_framework.permissions import BasePermission, SAFE_METHODS

from workspaces.models import WorkspaceMembership


class IsCommentAuthorOrReadOnly(BasePermission):
    """
    Workspace members can read comments.
    Only the comment author can update or delete them.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True

        return obj.author == request.user


class IsTaskEditorOrReadOnly(BasePermission):
    """
    Workspace members can read and edit tasks.
    Owners and admins can edit and delete all tasks.
    Members can edit tasks but can delete only their own tasks.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True

        membership = WorkspaceMembership.objects.filter(
            workspace=obj.workspace,
            user=request.user,
        ).first()

        if not membership:
            return False

        if membership.role in [
            WorkspaceMembership.Role.OWNER,
            WorkspaceMembership.Role.ADMIN,
        ]:
            return True

        if request.method == "DELETE":
            return obj.created_by == request.user

        return True
