import re
from unittest import mock

from django.core import mail
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.throttling import SimpleRateThrottle

from .models import EmailVerificationToken, Role, User


def extract_token(body):
    match = re.search(r"\b([A-Za-z0-9_-]{20,})\b", body)
    return match.group(1)


LOCMEM_EMAIL = override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend"
)

HIGH_LOGIN_RATES = {
    "anon": "1000/min",
    "auth": "1000/min",
    "login": "1000/min",
}


class HighLoginRateMixin:
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._throttle_patch = mock.patch.object(
            SimpleRateThrottle, "THROTTLE_RATES", HIGH_LOGIN_RATES
        )
        cls._throttle_patch.start()

    @classmethod
    def tearDownClass(cls):
        cls._throttle_patch.stop()
        super().tearDownClass()


@LOCMEM_EMAIL
class RegistrationTests(APITestCase):
    def test_register_creates_unverified_user_and_sends_email(self):
        mail.outbox = []
        response = self.client.post(
            reverse("register"),
            {"email": "Alice@Example.com", "password": "StrongPass123!", "first_name": "Alice"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="alice@example.com")
        self.assertFalse(user.is_email_verified)
        self.assertEqual(user.role, Role.CUSTOMER)
        self.assertTrue(user.check_password("StrongPass123!"))
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("alice@example.com", mail.outbox[0].to)

    def test_register_rejects_duplicate_email(self):
        User.objects.create_user(email="bob@example.com", password="StrongPass123!")
        response = self.client.post(
            reverse("register"),
            {"email": "bob@example.com", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_rejects_weak_password(self):
        response = self.client.post(
            reverse("register"),
            {"email": "carol@example.com", "password": "123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginTests(HighLoginRateMixin, APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="login@example.com", password="StrongPass123!"
        )

    def test_login_returns_tokens(self):
        response = self.client.post(
            reverse("login"),
            {"email": "login@example.com", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "login@example.com")

    def test_login_invalid_credentials_fails(self):
        response = self.client.post(
            reverse("login"),
            {"email": "login@example.com", "password": "wrong"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_account_locks_after_repeated_failures(self):
        for _ in range(5):
            self.client.post(
                reverse("login"),
                {"email": "login@example.com", "password": "wrong"},
                format="json",
            )
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_locked)
        response = self.client.post(
            reverse("login"),
            {"email": "login@example.com", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("locked", response.data["detail"].lower())

    def test_successful_login_resets_failed_attempts(self):
        for _ in range(2):
            self.client.post(
                reverse("login"),
                {"email": "login@example.com", "password": "wrong"},
                format="json",
            )
        response = self.client.post(
            reverse("login"),
            {"email": "login@example.com", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.failed_login_attempts, 0)


class EmailVerificationTests(APITestCase):
    def test_verify_email_with_token(self):
        response = self.client.post(
            reverse("register"),
            {"email": "verify@example.com", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="verify@example.com")
        token = EmailVerificationToken.objects.get(user=user).token
        response = self.client.post(reverse("verify_email"), {"token": token}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.is_email_verified)

    def test_verify_email_invalid_token_fails(self):
        response = self.client.post(
            reverse("verify_email"), {"token": "nope"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


@LOCMEM_EMAIL
class PasswordResetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="reset@example.com", password="StrongPass123!"
        )

    def test_password_reset_flow(self):
        mail.outbox = []
        response = self.client.post(
            reverse("password_reset"), {"email": "reset@example.com"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        token = extract_token(mail.outbox[0].body)
        response = self.client.post(
            reverse("password_reset_confirm"),
            {"token": token, "password": "NewStrongPass456!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewStrongPass456!"))


class AuthenticatedEndpointTests(HighLoginRateMixin, APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="me@example.com", password="StrongPass123!"
        )
        login = self.client.post(
            reverse("login"),
            {"email": "me@example.com", "password": "StrongPass123!"},
            format="json",
        )
        self.access = login.data["access"]
        self.refresh = login.data["refresh"]

    def authenticate(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access}")

    def test_me_requires_auth(self):
        response = self.client.get(reverse("me"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_profile(self):
        self.authenticate()
        response = self.client.get(reverse("me"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "me@example.com")

    def test_change_password(self):
        self.authenticate()
        response = self.client.post(
            reverse("change_password"),
            {"old_password": "StrongPass123!", "new_password": "ChangedPass789!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("ChangedPass789!"))

    def test_logout_blacklists_refresh_token(self):
        self.authenticate()
        response = self.client.post(
            reverse("logout"), {"refresh": self.refresh}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        from rest_framework_simplejwt.tokens import RefreshToken

        with self.assertRaises(Exception):
            RefreshToken(self.refresh).verify()
