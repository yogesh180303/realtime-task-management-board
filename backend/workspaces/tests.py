
from django.contrib.auth.models import User
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from workspaces.models import Workspace, WorkspaceMembership


class WorkspaceAPITests(APITestCase):

    def setUp(self):
        self.owner = User.objects.create_user(
            username="workspace_owner",
            password="TestPassword123!",
        )

        self.admin = User.objects.create_user(
            username="workspace_admin",
            password="TestPassword123!",
        )

        self.member = User.objects.create_user(
            username="workspace_member",
            password="TestPassword123!",
        )

        self.outsider = User.objects.create_user(
            username="workspace_outsider",
            password="TestPassword123!",
        )

        self.new_user = User.objects.create_user(
            username="workspace_new_user",
            password="TestPassword123!",
        )

        self.workspace = Workspace.objects.create(
            name="Workspace Test",
            description="Workspace for automated testing",
            owner=self.owner,
        )

        self.owner_membership = WorkspaceMembership.objects.create(
            workspace=self.workspace,
            user=self.owner,
            role=WorkspaceMembership.Role.OWNER,
        )

        self.admin_membership = WorkspaceMembership.objects.create(
            workspace=self.workspace,
            user=self.admin,
            role=WorkspaceMembership.Role.ADMIN,
        )

        self.member_membership = WorkspaceMembership.objects.create(
            workspace=self.workspace,
            user=self.member,
            role=WorkspaceMembership.Role.MEMBER,
        )

        self.workspace_list_url = reverse(
            "workspace-list-create"
        )

        self.member_list_url = reverse(
            "workspace-member-list-create",
            kwargs={"workspace_id": self.workspace.id},
        )

        self.owner_detail_url = reverse(
            "workspace-member-detail",
            kwargs={
                "workspace_id": self.workspace.id,
                "pk": self.owner_membership.id,
            },
        )

        self.admin_detail_url = reverse(
            "workspace-member-detail",
            kwargs={
                "workspace_id": self.workspace.id,
                "pk": self.admin_membership.id,
            },
        )

        self.member_detail_url = reverse(
            "workspace-member-detail",
            kwargs={
                "workspace_id": self.workspace.id,
                "pk": self.member_membership.id,
            },
        )

    # ------------------------------------------
    # WORKSPACE CREATION AND LISTING
    # ------------------------------------------

    def test_authenticated_user_can_create_workspace(self):
        self.client.force_authenticate(user=self.new_user)

        response = self.client.post(
            self.workspace_list_url,
            {
                "name": "New Workspace",
                "description": "Created through API",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        workspace = Workspace.objects.get(
            name="New Workspace"
        )

        self.assertEqual(workspace.owner, self.new_user)

        self.assertTrue(
            WorkspaceMembership.objects.filter(
                workspace=workspace,
                user=self.new_user,
                role=WorkspaceMembership.Role.OWNER,
            ).exists()
        )

    def test_workspace_owner_can_view_workspace(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(self.workspace_list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(response.data["count"], 1)

    def test_workspace_member_can_view_workspace(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.get(self.workspace_list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(response.data["count"], 1)

    def test_non_member_cannot_view_workspace(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.get(self.workspace_list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(response.data["count"], 0)

    # ------------------------------------------
    # WORKSPACE MEMBER LISTING
    # ------------------------------------------

    def test_owner_can_view_member_list(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(self.member_list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(response.data["count"], 3)

    def test_admin_can_view_member_list(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.member_list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(response.data["count"], 3)

    def test_member_can_view_member_list(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.get(self.member_list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

    def test_non_member_cannot_view_member_list(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.get(self.member_list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    # ------------------------------------------
    # ADD WORKSPACE MEMBERS
    # ------------------------------------------

    def test_owner_can_add_member(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.member_list_url,
            {
                "username": self.new_user.username,
                "role": WorkspaceMembership.Role.MEMBER,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertTrue(
            WorkspaceMembership.objects.filter(
                workspace=self.workspace,
                user=self.new_user,
                role=WorkspaceMembership.Role.MEMBER,
            ).exists()
        )

    def test_owner_can_add_admin(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.member_list_url,
            {
                "username": self.new_user.username,
                "role": WorkspaceMembership.Role.ADMIN,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

    def test_admin_can_add_regular_member(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.member_list_url,
            {
                "username": self.new_user.username,
                "role": WorkspaceMembership.Role.MEMBER,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

    def test_admin_cannot_add_another_admin(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.member_list_url,
            {
                "username": self.new_user.username,
                "role": WorkspaceMembership.Role.ADMIN,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_regular_member_cannot_add_member(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.post(
            self.member_list_url,
            {
                "username": self.new_user.username,
                "role": WorkspaceMembership.Role.MEMBER,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_adding_nonexistent_user_returns_404(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.member_list_url,
            {
                "username": "user_does_not_exist",
                "role": WorkspaceMembership.Role.MEMBER,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_adding_existing_member_returns_400(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.member_list_url,
            {
                "username": self.member.username,
                "role": WorkspaceMembership.Role.MEMBER,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    # ------------------------------------------
    # CHANGE MEMBER ROLES
    # ------------------------------------------

    def test_owner_can_promote_member_to_admin(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.patch(
            self.member_detail_url,
            {
                "role": WorkspaceMembership.Role.ADMIN,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.member_membership.refresh_from_db()

        self.assertEqual(
            self.member_membership.role,
            WorkspaceMembership.Role.ADMIN,
        )

    def test_owner_can_demote_admin_to_member(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.patch(
            self.admin_detail_url,
            {
                "role": WorkspaceMembership.Role.MEMBER,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.admin_membership.refresh_from_db()

        self.assertEqual(
            self.admin_membership.role,
            WorkspaceMembership.Role.MEMBER,
        )

    def test_admin_cannot_promote_member(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            self.member_detail_url,
            {
                "role": WorkspaceMembership.Role.ADMIN,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_member_cannot_change_member_role(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.patch(
            self.admin_detail_url,
            {
                "role": WorkspaceMembership.Role.MEMBER,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_owner_role_cannot_be_changed(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.patch(
            self.owner_detail_url,
            {
                "role": WorkspaceMembership.Role.ADMIN,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    # ------------------------------------------
    # REMOVE WORKSPACE MEMBERS
    # ------------------------------------------

    def test_owner_can_remove_member(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.delete(
            self.member_detail_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        self.assertFalse(
            WorkspaceMembership.objects.filter(
                id=self.member_membership.id
            ).exists()
        )

    def test_admin_can_remove_regular_member(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.delete(
            self.member_detail_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

    def test_admin_cannot_remove_another_admin(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.delete(
            self.admin_detail_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_member_cannot_remove_another_member(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.delete(
            self.admin_detail_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_workspace_owner_cannot_be_removed(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.delete(
            self.owner_detail_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )
