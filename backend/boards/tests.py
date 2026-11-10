
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from boards.models import Board, BoardColumn
from workspaces.models import Workspace, WorkspaceMembership


class BoardPermissionTests(APITestCase):

    def setUp(self):
        self.owner = User.objects.create_user(
            username="board_owner",
            password="TestPassword123!",
        )
        self.admin = User.objects.create_user(
            username="board_admin",
            password="TestPassword123!",
        )
        self.member = User.objects.create_user(
            username="board_member",
            password="TestPassword123!",
        )
        self.outsider = User.objects.create_user(
            username="board_outsider",
            password="TestPassword123!",
        )

        self.workspace = Workspace.objects.create(
            name="Board Test Workspace",
            owner=self.owner,
        )

        WorkspaceMembership.objects.create(
            workspace=self.workspace,
            user=self.owner,
            role=WorkspaceMembership.Role.OWNER,
        )
        WorkspaceMembership.objects.create(
            workspace=self.workspace,
            user=self.admin,
            role=WorkspaceMembership.Role.ADMIN,
        )
        WorkspaceMembership.objects.create(
            workspace=self.workspace,
            user=self.member,
            role=WorkspaceMembership.Role.MEMBER,
        )

        self.board = Board.objects.create(
            workspace=self.workspace,
            name="Test Board",
            created_by=self.owner,
        )

        self.column = BoardColumn.objects.create(
            board=self.board,
            name="To Do",
            position=0,
        )

        self.board_list_url = reverse("board-list-create")

        self.board_detail_url = reverse(
            "board-detail",
            kwargs={"pk": self.board.id},
        )

        self.column_list_url = reverse(
            "board-column-list-create",
            kwargs={"board_id": self.board.id},
        )

        self.column_detail_url = reverse(
            "board-column-detail",
            kwargs={
                "board_id": self.board.id,
                "pk": self.column.id,
            },
        )

    def test_owner_can_create_board(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.board_list_url,
            {
                "workspace": self.workspace.id,
                "name": "Owner Board",
                "description": "Created by owner",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )
        self.assertTrue(
            Board.objects.filter(name="Owner Board").exists()
        )

    def test_admin_can_create_board(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.board_list_url,
            {
                "workspace": self.workspace.id,
                "name": "Admin Board",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

    def test_member_cannot_create_board(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.post(
            self.board_list_url,
            {
                "workspace": self.workspace.id,
                "name": "Member Board",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_member_can_view_board(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.get(self.board_detail_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

    def test_member_cannot_update_board(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.patch(
            self.board_detail_url,
            {"name": "Changed Board"},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_member_cannot_delete_board(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.delete(self.board_detail_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_member_cannot_create_column(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.post(
            self.column_list_url,
            {"name": "New Column"},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_member_can_view_columns(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.get(self.column_list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

    def test_member_cannot_update_column(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.patch(
            self.column_detail_url,
            {"name": "Changed Column"},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_member_cannot_delete_column(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.delete(self.column_detail_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_outsider_cannot_view_board(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.get(self.board_detail_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )
