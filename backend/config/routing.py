from django.urls import re_path

from tasks.consumers import TaskBoardConsumer


websocket_urlpatterns = [
    re_path(
        r"^ws/workspaces/(?P<workspace_id>\d+)/tasks/$",
        TaskBoardConsumer.as_asgi(),
    ),
]