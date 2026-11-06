
import asyncio
import os

import websockets


# Read the API token from an environment variable.
TOKEN = os.getenv("API_TOKEN", "").strip()

WORKSPACE_ID = 1

WS_URL = (
    f"ws://127.0.0.1:8000/"
    f"ws/workspaces/{WORKSPACE_ID}/tasks/?token={TOKEN}"
)


async def test_websocket():

    if not TOKEN:
        print("ERROR: API_TOKEN environment variable is not set.")
        return

    if len(TOKEN) != 40:
        print("ERROR: API token must contain exactly 40 characters.")
        return

    print("API token configured successfully.")

    try:
        async with websockets.connect(WS_URL) as websocket:

            welcome = await websocket.recv()

            print("WebSocket connection successful!")
            print("Server response:", welcome)

            await websocket.send(
                '{"type": "task_updated"}'
            )

            response = await asyncio.wait_for(
                websocket.recv(),
                timeout=5,
            )

            print("Server message:", response)

    except Exception as error:
        print("WebSocket test failed:", error)


if __name__ == "__main__":
    asyncio.run(test_websocket())
