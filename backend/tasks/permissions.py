
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsCommentAuthorOrReadOnly(BasePermission):
    """
    Workspace members can read comments.
    Only the comment author can update or delete them.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True

        return obj.author == request.user
