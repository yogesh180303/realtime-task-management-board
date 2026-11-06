
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework.authtoken.models import Token


@database_sync_to_async
def get_user_from_token(token_key):
    try:
        token = Token.objects.select_related("user").get(
            key=token_key
        )
        return token.user

    except Token.DoesNotExist:
        return AnonymousUser()


class TokenAuthMiddleware:

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):

        query_string = scope.get(
            "query_string", b""
        ).decode("utf-8")

        query_params = parse_qs(query_string)

        token_key = query_params.get("token", [None])[0]

        user = AnonymousUser()

        if token_key:
            user = await get_user_from_token(token_key)

       

        # Pass authenticated user to the WebSocket consumer
        scope = dict(scope)
        scope["user"] = user

        return await self.app(scope, receive, send)
