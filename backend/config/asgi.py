import os

from django.core.asgi import get_asgi_application

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "config.settings"
)

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter

from config.routing import websocket_urlpatterns
from config.websocket_auth import TokenAuthMiddleware


application = ProtocolTypeRouter({
    "http": django_asgi_app,

    "websocket": TokenAuthMiddleware(
        URLRouter(websocket_urlpatterns)
    ),
})