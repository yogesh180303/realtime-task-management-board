
import asyncio
import json
import os

import requests
import websockets


# Read the API token from an environment variable.
TOKEN = os.getenv("API_TOKEN", "").strip()

WORKSPACE_ID = 1
COLUMN_ID = 1

API_URL = "http://127.0.0.1:8000/api/tasks/"

WS_URL = (
    f"ws://127.0.0.1:8000/"
    f"ws/workspaces/{WORKSPACE_ID}/tasks/?token={TOKEN}"
)


def get_headers():
    return {
        "Authorization": f"Token {TOKEN}",
        "Content-Type": "application/json",
    }


async def connect_websocket():
    websocket = await websockets.connect(WS_URL)

    welcome = await websocket.recv()
    print("WebSocket connected:", welcome)

    return websocket


async def receive_event(websocket, expected_type):

    event = await asyncio.wait_for(
        websocket.recv(),
        timeout=5,
    )

    event_data = json.loads(event)

    print("WebSocket event:", event_data)

    if event_data.get("type") == expected_type:
        print(f"{expected_type} broadcast test PASSED.")
        return event_data

    print("Unexpected event received.")
    return None


async def test_realtime_task_creation():

    async with await connect_websocket() as websocket:

        task_data = {
            "title": "Real-time WebSocket Test",
            "description": "Testing automatic task creation broadcast",
            "workspace": WORKSPACE_ID,
            "column": COLUMN_ID,
            "priority": "HIGH",
            "position": 0,
        }

        response = requests.post(
            API_URL,
            headers=get_headers(),
            json=task_data,
            timeout=10,
        )

        print("API status:", response.status_code)

        if response.status_code != 201:
            print("API error:", response.text)
            return None

        created_task = response.json()

        print("Created task:", created_task)

        event_data = await receive_event(
            websocket,
            "task_created",
        )

        if event_data is None:
            return None

        task_id = created_task["id"]

        print("Created task ID:", task_id)

        return task_id


async def test_realtime_task_update(task_id):

    async with await connect_websocket() as websocket:

        update_url = f"{API_URL}{task_id}/"

        update_data = {
            "title": "Real-time Task Updated",
            "priority": "URGENT",
        }

        response = requests.patch(
            update_url,
            headers=get_headers(),
            json=update_data,
            timeout=10,
        )

        print("API status:", response.status_code)

        if response.status_code != 200:
            print("API error:", response.text)
            return False

        print("Updated task:", response.json())

        event_data = await receive_event(
            websocket,
            "task_updated",
        )

        return event_data is not None


async def test_realtime_task_deletion(task_id):

    async with await connect_websocket() as websocket:

        delete_url = f"{API_URL}{task_id}/"

        response = requests.delete(
            delete_url,
            headers=get_headers(),
            timeout=10,
        )

        print("API status:", response.status_code)

        if response.status_code != 204:
            print("API error:", response.text)
            return False

        print("Task deleted successfully.")

        event_data = await receive_event(
            websocket,
            "task_deleted",
        )

        return event_data is not None


async def main():

    if not TOKEN:
        print("ERROR: API_TOKEN environment variable is not set.")
        return

    if len(TOKEN) != 40:
        print("ERROR: API token must contain exactly 40 characters.")
        return

    print("API token configured successfully.")

    print("\n========== TASK CREATION TEST ==========")

    task_id = await test_realtime_task_creation()

    if task_id is None:
        print("\nStopping tests because task creation failed.")
        return

    print("\n========== TASK UPDATE TEST ==========")

    update_passed = await test_realtime_task_update(task_id)

    if not update_passed:
        print("\nStopping tests because task update failed.")
        return

    print("\n========== TASK DELETION TEST ==========")

    deletion_passed = await test_realtime_task_deletion(task_id)

    print("\n========== FINAL TEST RESULTS ==========")

    print("Task creation: PASSED")
    print("Task update:", "PASSED" if update_passed else "FAILED")
    print("Task deletion:", "PASSED" if deletion_passed else "FAILED")


if __name__ == "__main__":
    asyncio.run(main())
