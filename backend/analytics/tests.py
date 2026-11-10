
from datetime import timedelta

from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from boards.models import Board, BoardColumn
from tasks.models import Task
from workspaces.models import Workspace, WorkspaceMembership


class WorkspaceAnalyticsAPITests(APITestCase):

    def setUp(self):
        # Create users.
        self.owner = User.objects.create_user(
            username="analytics_owner",
            password="TestPassword123!",
        )

        self.member = User.objects.create_user(
            username="analytics_member",
            password="TestPassword123!",
        )

        self.outsider = User.objects.create_user(
            username="analytics_outsider",
            password="TestPassword123!",
        )

        # Create workspace.
        self.workspace = Workspace.objects.create(
            name="Analytics Test Workspace",
            owner=self.owner,
        )

        # Create workspace memberships.
        WorkspaceMembership.objects.create(
            workspace=self.workspace,
            user=self.owner,
            role=WorkspaceMembership.Role.OWNER,
        )

        WorkspaceMembership.objects.create(
            workspace=self.workspace,
            user=self.member,
            role=WorkspaceMembership.Role.MEMBER,
        )

        # Create board.
        self.board = Board.objects.create(
            workspace=self.workspace,
            name="Analytics Test Board",
            created_by=self.owner,
        )

        # Create board columns.
        self.todo_column = BoardColumn.objects.create(
            board=self.board,
            name="To Do",
            position=0,
        )

        self.progress_column = BoardColumn.objects.create(
            board=self.board,
            name="In Progress",
            position=1,
        )

        self.done_column = BoardColumn.objects.create(
            board=self.board,
            name="Done",
            position=2,
        )

        # Create tasks with different priorities and due dates.
        now = timezone.now()

        Task.objects.create(
            title="Overdue High Priority Task",
            workspace=self.workspace,
            column=self.todo_column,
            created_by=self.owner,
            priority=Task.Priority.HIGH,
            due_date=now - timedelta(days=2),
        )

        Task.objects.create(
            title="In Progress Medium Priority Task",
            workspace=self.workspace,
            column=self.progress_column,
            created_by=self.owner,
            priority=Task.Priority.MEDIUM,
            due_date=now + timedelta(days=2),
        )

        Task.objects.create(
            title="Completed Urgent Task",
            workspace=self.workspace,
            column=self.done_column,
            created_by=self.owner,
            priority=Task.Priority.URGENT,
            due_date=now - timedelta(days=1),
        )

        Task.objects.create(
            title="Pending High Priority Task",
            workspace=self.workspace,
            column=self.todo_column,
            created_by=self.owner,
            priority=Task.Priority.HIGH,
            due_date=now + timedelta(days=5),
        )

        self.analytics_url = reverse(
            "workspace-analytics",
            kwargs={"workspace_id": self.workspace.id},
        )

    def test_workspace_owner_can_view_analytics(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(self.analytics_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_workspace_member_can_view_analytics(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.get(self.analytics_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_non_member_cannot_view_analytics(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.get(self.analytics_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_unauthenticated_user_cannot_view_analytics(self):
        response = self.client.get(self.analytics_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_analytics_returns_correct_task_counts(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(self.analytics_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(response.data["total_tasks"], 4)
        self.assertEqual(response.data["completed_tasks"], 1)
        self.assertEqual(response.data["pending_tasks"], 2)
        self.assertEqual(response.data["in_progress_tasks"], 1)

    def test_analytics_returns_correct_overdue_task_count(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(self.analytics_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # The overdue task in To Do is counted.
        # The overdue task in Done is excluded.
        self.assertEqual(response.data["overdue_tasks"], 1)

    def test_analytics_returns_correct_priority_distribution(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(self.analytics_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        expected_distribution = [
            {"priority": "HIGH", "count": 2},
            {"priority": "MEDIUM", "count": 1},
            {"priority": "URGENT", "count": 1},
        ]

        self.assertEqual(
            response.data["priority_distribution"],
            expected_distribution,
        )

    def test_analytics_returns_correct_status_distribution(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(self.analytics_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        expected_distribution = [
            {"column__name": "Done", "count": 1},
            {"column__name": "In Progress", "count": 1},
            {"column__name": "To Do", "count": 2},
        ]

        self.assertEqual(
            response.data["status_distribution"],
            expected_distribution,
        )
