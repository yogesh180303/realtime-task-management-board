import hashlib
import secrets
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from tasks.models import WebSocketTicket
from workspaces.models import WorkspaceMembership


class WebSocketTicketCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        workspace_id = request.data.get("workspace")

        try:
            workspace_id = int(workspace_id)
            if workspace_id < 1:
                raise ValueError
        except (TypeError, ValueError):
            return Response(
                {"workspace": "A valid workspace ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_member = WorkspaceMembership.objects.filter(
            workspace_id=workspace_id,
            user=request.user,
        ).exists()

        if not is_member:
            return Response(
                {"detail": "You are not a member of this workspace."},
                status=status.HTTP_403_FORBIDDEN,
            )

        raw_ticket = secrets.token_urlsafe(32)

        key_hash = hashlib.sha256(
            raw_ticket.encode("utf-8")
        ).hexdigest()

        WebSocketTicket.objects.create(
            key_hash=key_hash,
            user=request.user,
            workspace_id=workspace_id,
            expires_at=timezone.now() + timedelta(seconds=60),
        )

        return Response(
            {
                "ticket": raw_ticket,
                "expires_in": 60,
            },
            status=status.HTTP_201_CREATED,
        )