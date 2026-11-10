
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


User = get_user_model()


class AccountAuthenticationTests(APITestCase):

    def test_user_registration(self):
        response = self.client.post(
            "/api/accounts/register/",
            {
                "username": "automated_test_user",
                "email": "automated@example.com",
                "password": "StrongTestPassword123!",
                "password2": "StrongTestPassword123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            User.objects.filter(
                username="automated_test_user"
            ).exists()
        )

    def test_user_login(self):
        User.objects.create_user(
            username="login_test_user",
            email="login@example.com",
            password="StrongTestPassword123!",
        )

        response = self.client.post(
            "/api/accounts/login/",
            {
                "username": "login_test_user",
                "password": "StrongTestPassword123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)

    def test_unauthenticated_profile_access(self):
        response = self.client.get("/api/accounts/profile/")

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
