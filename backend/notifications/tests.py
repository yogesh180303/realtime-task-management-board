
from django.contrib.auth.models import User
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from notifications.models import Notification


class NotificationAPITests(APITestCase):

    def setUp(self):
        self.user1 = User.objects.create_user(
            username="notification_user1",
            password="TestPassword123!",
        )

        self.user2 = User.objects.create_user(
            username="notification_user2",
            password="TestPassword123!",
        )

        self.notification1 = Notification.objects.create(
            recipient=self.user1,
            message="You have been assigned a task.",
            notification_type=(
                Notification.NotificationType.TASK_ASSIGNED
            ),
        )

        self.notification2 = Notification.objects.create(
            recipient=self.user2,
            message="Another user's notification.",
            notification_type=(
                Notification.NotificationType.TASK_ASSIGNED
            ),
        )

        self.notification_list_url = reverse(
            "notification-list"
        )

        self.notification_detail_url = reverse(
            "notification-detail",
            kwargs={"pk": self.notification1.id},
        )

        self.other_notification_detail_url = reverse(
            "notification-detail",
            kwargs={"pk": self.notification2.id},
        )

    # ------------------------------------------
    # NOTIFICATION LIST TESTS
    # ------------------------------------------

    def test_authenticated_user_can_view_notifications(self):
        self.client.force_authenticate(user=self.user1)

        response = self.client.get(
            self.notification_list_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(response.data["count"], 1)

        self.assertEqual(
            response.data["results"][0]["message"],
            "You have been assigned a task.",
        )

    def test_user_can_only_view_own_notifications(self):
        self.client.force_authenticate(user=self.user1)

        response = self.client.get(
            self.notification_list_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        notification_ids = [
            item["id"]
            for item in response.data["results"]
        ]

        self.assertIn(
            self.notification1.id,
            notification_ids,
        )

        self.assertNotIn(
            self.notification2.id,
            notification_ids,
        )

    def test_user_with_no_notifications_gets_empty_list(self):
        new_user = User.objects.create_user(
            username="notification_empty_user",
            password="TestPassword123!",
        )

        self.client.force_authenticate(user=new_user)

        response = self.client.get(
            self.notification_list_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(response.data["count"], 0)

    # ------------------------------------------
    # NOTIFICATION DETAIL TESTS
    # ------------------------------------------

    def test_user_can_view_own_notification(self):
        self.client.force_authenticate(user=self.user1)

        response = self.client.get(
            self.notification_detail_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["id"],
            self.notification1.id,
        )

    def test_user_cannot_view_another_users_notification(self):
        self.client.force_authenticate(user=self.user1)

        response = self.client.get(
            self.other_notification_detail_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    # ------------------------------------------
    # MARK NOTIFICATION AS READ
    # ------------------------------------------

    def test_user_can_mark_own_notification_as_read(self):
        self.client.force_authenticate(user=self.user1)

        response = self.client.patch(
            self.notification_detail_url,
            {"is_read": True},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.notification1.refresh_from_db()

        self.assertTrue(self.notification1.is_read)

    def test_user_can_mark_own_notification_as_unread(self):
        self.notification1.is_read = True
        self.notification1.save()

        self.client.force_authenticate(user=self.user1)

        response = self.client.patch(
            self.notification_detail_url,
            {"is_read": False},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.notification1.refresh_from_db()

        self.assertFalse(self.notification1.is_read)

    def test_user_cannot_mark_another_users_notification_as_read(self):
        self.client.force_authenticate(user=self.user1)

        response = self.client.patch(
            self.other_notification_detail_url,
            {"is_read": True},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

        self.notification2.refresh_from_db()

        self.assertFalse(self.notification2.is_read)

    # ------------------------------------------
    # READ-ONLY FIELD TESTS
    # ------------------------------------------

    def test_user_cannot_change_notification_message(self):
        self.client.force_authenticate(user=self.user1)

        response = self.client.patch(
            self.notification_detail_url,
            {
                "message": "Changed notification message",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.notification1.refresh_from_db()

        self.assertEqual(
            self.notification1.message,
            "You have been assigned a task.",
        )

    def test_user_cannot_change_notification_recipient(self):
        self.client.force_authenticate(user=self.user1)

        response = self.client.patch(
            self.notification_detail_url,
            {
                "recipient": self.user2.id,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.notification1.refresh_from_db()

        self.assertEqual(
            self.notification1.recipient,
            self.user1,
        )

    # ------------------------------------------
    # HTTP METHOD RESTRICTION TESTS
    # ------------------------------------------

    def test_put_method_is_not_allowed(self):
        self.client.force_authenticate(user=self.user1)

        response = self.client.put(
            self.notification_detail_url,
            {"is_read": True},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def test_delete_method_is_not_allowed(self):
        self.client.force_authenticate(user=self.user1)

        response = self.client.delete(
            self.notification_detail_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )

        self.assertTrue(
            Notification.objects.filter(
                id=self.notification1.id
            ).exists()
        )

    # ------------------------------------------
    # AUTHENTICATION TESTS
    # ------------------------------------------

    def test_unauthenticated_user_cannot_view_notifications(self):
        response = self.client.get(
            self.notification_list_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_unauthenticated_user_cannot_view_notification_detail(self):
        response = self.client.get(
            self.notification_detail_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_unauthenticated_user_cannot_update_notification(self):
        response = self.client.patch(
            self.notification_detail_url,
            {"is_read": True},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
