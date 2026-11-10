
import hashlib
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone

from tasks.models import WebSocketTicket


@database_sync_to_async
def get_auth_from_ticket(ticket_key):
    if not ticket_key:
        return AnonymousUser(), None

    # Hash the supplied ticket before looking it up.
    key_hash = hashlib.sha256(
        ticket_key.encode("utf-8")
    ).hexdigest()

    now = timezone.now()

    # Atomically consume the ticket.
    # Only one request can change an unused, unexpired ticket.
    updated_count = (
        WebSocketTicket.objects
        .filter(
            key_hash=key_hash,
            used_at__isnull=True,
            expires_at__gt=now,
        )
        .update(used_at=now)
    )

    if updated_count != 1:
        return AnonymousUser(), None

    # Retrieve the user and workspace after successful consumption.
    ticket = (
        WebSocketTicket.objects
        .select_related("user")
        .filter(key_hash=key_hash)
        .first()
    )

    # Reject missing tickets and inactive user accounts.
    if ticket is None or not ticket.user.is_active:
        return AnonymousUser(), None

    return ticket.user, ticket.workspace_id


class TokenAuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        query_string = scope.get(
            "query_string", b""
        ).decode("utf-8")

        query_params = parse_qs(query_string)
        ticket_key = query_params.get("ticket", [None])[0]

        user, ticket_workspace_id = (
            await get_auth_from_ticket(ticket_key)
        )

        scope = dict(scope)
        scope["user"] = user
        scope["ticket_workspace_id"] = ticket_workspace_id

        return await self.app(scope, receive, send)
