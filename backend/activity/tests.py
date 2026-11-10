
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from activity.models import ActivityLog
from workspaces.models import Workspace, WorkspaceMembership


class WorkspaceActivityAPITests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="activity_owner",
            password="TestPassword123!",
        )
        self.member = User.objects.create_user(
            username="activity_member",
            password="TestPassword123!",
        )
        self.outsider = User.objects.create_user(
            username="activity_outsider",
            password="TestPassword123!",
        )

        self.workspace = Workspace.objects.create(
            name="Activity Test Workspace",
            owner=self.owner,
        )

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

        self.activity = ActivityLog.objects.create(
            workspace=self.workspace,
            actor=self.owner,
            action=ActivityLog.ActionType.TASK_CREATED,
            description="Created a test task.",
        )

        self.activity_url = reverse(
            "workspace-activity",
            kwargs={"workspace_id": self.workspace.id},
        )

    def test_workspace_owner_can_view_activity(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(self.activity_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_workspace_member_can_view_activity(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.get(self.activity_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_non_member_cannot_view_activity(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.get(self.activity_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_user_cannot_view_activity(self):
        response = self.client.get(self.activity_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_nonexistent_workspace_returns_403(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse(
            "workspace-activity",
            kwargs={"workspace_id": 99999},
        )

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_activity_contains_correct_description(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(self.activity_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["results"][0]["description"],
            "Created a test task.",
        )

    def test_activity_contains_correct_action(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(self.activity_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["results"][0]["action"],
            ActivityLog.ActionType.TASK_CREATED,
        )

    def test_activity_contains_correct_actor(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(self.activity_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["results"][0]["actor"],
            self.owner.id,
        )

    def test_user_cannot_view_another_workspace_activity(self):
        other_workspace = Workspace.objects.create(
            name="Another Activity Workspace",
            owner=self.outsider,
        )

        WorkspaceMembership.objects.create(
            workspace=other_workspace,
            user=self.outsider,
            role=WorkspaceMembership.Role.OWNER,
        )

        ActivityLog.objects.create(
            workspace=other_workspace,
            actor=self.outsider,
            action=ActivityLog.ActionType.TASK_CREATED,
            description="Private workspace activity.",
        )

        self.client.force_authenticate(user=self.owner)

        response = self.client.get(self.activity_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

        descriptions = [
            item["description"]
            for item in response.data["results"]
        ]

        self.assertNotIn("Private workspace activity.", descriptions)
