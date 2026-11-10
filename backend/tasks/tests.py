
from datetime import timedelta

from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from boards.models import Board, BoardColumn
from tasks.models import Task, TaskComment
from workspaces.models import Workspace, WorkspaceMembership


class TaskAPITests(APITestCase):

    def setUp(self):
        # Create users.
        self.owner = User.objects.create_user(
            username="task_owner",
            password="TestPassword123!",
        )

        self.admin = User.objects.create_user(
            username="task_admin",
            password="TestPassword123!",
        )

        self.member = User.objects.create_user(
            username="task_member",
            password="TestPassword123!",
        )

        self.outsider = User.objects.create_user(
            username="task_outsider",
            password="TestPassword123!",
        )

        # Create workspace.
        self.workspace = Workspace.objects.create(
            name="Task Test Workspace",
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
            user=self.admin,
            role=WorkspaceMembership.Role.ADMIN,
        )

        WorkspaceMembership.objects.create(
            workspace=self.workspace,
            user=self.member,
            role=WorkspaceMembership.Role.MEMBER,
        )

        # Create board.
        self.board = Board.objects.create(
            workspace=self.workspace,
            name="Task Test Board",
            created_by=self.owner,
        )

        # Create columns.
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

        # Create an initial task.
        self.task = Task.objects.create(
            title="Initial Test Task",
            description="Task used for API testing",
            workspace=self.workspace,
            column=self.todo_column,
            created_by=self.owner,
            assigned_to=self.member,
            priority=Task.Priority.MEDIUM,
        )

        # API URLs.
        self.task_list_url = reverse("task-list-create")

        self.task_detail_url = reverse(
            "task-detail",
            kwargs={"pk": self.task.id},
        )

        self.comment_list_url = reverse(
            "task-comment-list-create",
            kwargs={"task_id": self.task.id},
        )

        # Create an initial comment.
        self.comment = TaskComment.objects.create(
            task=self.task,
            author=self.owner,
            content="Initial test comment",
        )

        self.comment_detail_url = reverse(
            "task-comment-detail",
            kwargs={
                "task_id": self.task.id,
                "pk": self.comment.id,
            },
        )

    # --------------------------------------------------
    # TASK CREATION TESTS
    # --------------------------------------------------

    def test_workspace_member_can_create_task(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.post(
            self.task_list_url,
            {
                "title": "Member Created Task",
                "description": "Created by workspace member",
                "workspace": self.workspace.id,
                "column": self.todo_column.id,
                "priority": "HIGH",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertTrue(
            Task.objects.filter(
                title="Member Created Task",
                created_by=self.member,
            ).exists()
        )

    def test_non_member_cannot_create_task(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.post(
            self.task_list_url,
            {
                "title": "Outsider Task",
                "workspace": self.workspace.id,
                "column": self.todo_column.id,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_task_cannot_use_column_from_another_workspace(self):
        another_workspace = Workspace.objects.create(
            name="Another Test Workspace",
            owner=self.owner,
        )

        another_board = Board.objects.create(
            workspace=another_workspace,
            name="Another Board",
            created_by=self.owner,
        )

        another_column = BoardColumn.objects.create(
            board=another_board,
            name="Another Column",
            position=0,
        )

        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.task_list_url,
            {
                "title": "Invalid Workspace Task",
                "workspace": self.workspace.id,
                "column": another_column.id,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_task_cannot_be_assigned_to_non_member(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.task_list_url,
            {
                "title": "Invalid Assignment Task",
                "workspace": self.workspace.id,
                "column": self.todo_column.id,
                "assigned_to": self.outsider.id,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    # --------------------------------------------------
    # TASK VISIBILITY TESTS
    # --------------------------------------------------

    def test_workspace_member_can_view_tasks(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.get(self.task_list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(response.data["count"], 1)

    def test_non_member_cannot_view_workspace_tasks(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.get(
            self.task_list_url,
            {"workspace": self.workspace.id},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(response.data["count"], 0)

    def test_non_member_cannot_view_task_detail(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.get(self.task_detail_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_removed_member_cannot_update_task(self):
        self.client.force_authenticate(user=self.member)

        # Remove the user from the workspace.
        WorkspaceMembership.objects.filter(
            workspace=self.workspace,
            user=self.member,
        ).delete()

        response = self.client.patch(
            self.task_detail_url,
            {"title": "Unauthorized Update"},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

        # Confirm that the task was not changed.
        self.task.refresh_from_db()

        self.assertEqual(
            self.task.title,
            "Initial Test Task",
        )

    # --------------------------------------------------
    # TASK UPDATE AND DELETE PERMISSION TESTS
    # --------------------------------------------------

    def test_workspace_member_can_update_task(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.patch(
            self.task_detail_url,
            {"title": "Updated Task Title"},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.task.refresh_from_db()

        self.assertEqual(
            self.task.title,
            "Updated Task Title",
        )

    def test_member_cannot_delete_task_created_by_owner(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.delete(self.task_detail_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertTrue(
            Task.objects.filter(id=self.task.id).exists()
        )

    def test_member_can_delete_own_task(self):
        own_task = Task.objects.create(
            title="Member Own Task",
            workspace=self.workspace,
            column=self.todo_column,
            created_by=self.member,
        )

        self.client.force_authenticate(user=self.member)

        response = self.client.delete(
            reverse(
                "task-detail",
                kwargs={"pk": own_task.id},
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        self.assertFalse(
            Task.objects.filter(id=own_task.id).exists()
        )

    def test_admin_can_delete_any_task(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.delete(self.task_detail_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        self.assertFalse(
            Task.objects.filter(id=self.task.id).exists()
        )

    def test_owner_can_delete_any_task(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.delete(self.task_detail_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        self.assertFalse(
            Task.objects.filter(id=self.task.id).exists()
        )

    # --------------------------------------------------
    # TASK FILTERING TESTS
    # --------------------------------------------------

    def test_filter_tasks_by_priority(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(
            self.task_list_url,
            {"priority": "MEDIUM"},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(response.data["count"], 1)

    def test_filter_tasks_by_multiple_priorities(self):
        Task.objects.create(
            title="Urgent Test Task",
            workspace=self.workspace,
            column=self.todo_column,
            created_by=self.owner,
            priority=Task.Priority.URGENT,
        )

        self.client.force_authenticate(user=self.owner)

        response = self.client.get(
            self.task_list_url,
            {"priorities": "HIGH,URGENT"},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(response.data["count"], 1)

    def test_filter_tasks_by_assigned_user(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(
            self.task_list_url,
            {"assigned_to": self.member.id},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(response.data["count"], 1)

    def test_search_tasks_by_title(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(
            self.task_list_url,
            {"search": "Initial Test"},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(response.data["count"], 1)

    def test_invalid_priority_filter_returns_400(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(
            self.task_list_url,
            {"priority": "INVALID"},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_invalid_multiple_priority_filter_returns_400(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(
            self.task_list_url,
            {"priorities": "HIGH,INVALID"},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_invalid_workspace_filter_returns_400(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(
            self.task_list_url,
            {"workspace": "invalid"},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_due_after_filter(self):
        Task.objects.create(
            title="Future Due Task",
            workspace=self.workspace,
            column=self.todo_column,
            created_by=self.owner,
            due_date=timezone.now() + timedelta(days=10),
        )

        self.client.force_authenticate(user=self.owner)

        response = self.client.get(
            self.task_list_url,
            {
                "due_after": (
                    timezone.now() + timedelta(days=5)
                ).isoformat()
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(response.data["count"], 1)

    def test_due_before_filter(self):
        Task.objects.create(
            title="Past Due Task",
            workspace=self.workspace,
            column=self.todo_column,
            created_by=self.owner,
            due_date=timezone.now() - timedelta(days=5),
        )

        self.client.force_authenticate(user=self.owner)

        response = self.client.get(
            self.task_list_url,
            {
                "due_before": (
                    timezone.now() - timedelta(days=2)
                ).isoformat()
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(response.data["count"], 1)

    def test_overdue_filter_excludes_completed_tasks(self):
        Task.objects.create(
            title="Overdue Open Task",
            workspace=self.workspace,
            column=self.todo_column,
            created_by=self.owner,
            due_date=timezone.now() - timedelta(days=2),
        )

        Task.objects.create(
            title="Overdue Completed Task",
            workspace=self.workspace,
            column=self.done_column,
            created_by=self.owner,
            due_date=timezone.now() - timedelta(days=2),
        )

        self.client.force_authenticate(user=self.owner)

        response = self.client.get(
            self.task_list_url,
            {"overdue": "true"},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(response.data["count"], 1)

    # --------------------------------------------------
    # TASK COMMENT TESTS
    # --------------------------------------------------

    def test_workspace_member_can_view_comments(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.get(self.comment_list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(response.data["count"], 1)

    def test_workspace_member_can_create_comment(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.post(
            self.comment_list_url,
            {
                "content": "Comment created by member",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertTrue(
            TaskComment.objects.filter(
                task=self.task,
                author=self.member,
                content="Comment created by member",
            ).exists()
        )

    def test_non_member_cannot_view_comments(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.get(self.comment_list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(response.data["count"], 0)

    def test_comment_author_can_update_comment(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.patch(
            self.comment_detail_url,
            {"content": "Updated comment"},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.comment.refresh_from_db()

        self.assertEqual(
            self.comment.content,
            "Updated comment",
        )

    def test_non_author_cannot_update_comment(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.patch(
            self.comment_detail_url,
            {"content": "Unauthorized update"},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_comment_author_can_delete_comment(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.delete(self.comment_detail_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        self.assertFalse(
            TaskComment.objects.filter(
                id=self.comment.id
            ).exists()
        )

    def test_non_author_cannot_delete_comment(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.delete(self.comment_detail_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertTrue(
            TaskComment.objects.filter(
                id=self.comment.id
            ).exists()
        )
