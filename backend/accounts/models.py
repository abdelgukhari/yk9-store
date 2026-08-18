from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone


class Role(models.TextChoices):
    OWNER = "owner", "Owner"
    ADMIN = "admin", "Admin"
    CUSTOMER_SUPPORT = "customer_support", "Customer Support"
    INVENTORY_MANAGER = "inventory_manager", "Inventory Manager"
    PAYMENT_REVIEWER = "payment_reviewer", "Payment Reviewer"
    CONTENT_MANAGER = "content_manager", "Content Manager"
    CUSTOMER = "customer", "Customer"


ROLE_PERMISSIONS = {
    Role.OWNER: {"*"},
    Role.ADMIN: {
        "products.manage",
        "products.view",
        "categories.manage",
        "brands.manage",
        "inventory.manage",
        "orders.manage",
        "orders.view",
        "payments.review",
        "customers.manage",
        "shipping.manage",
        "coupons.manage",
        "reviews.moderate",
        "content.manage",
        "whatsapp.manage",
        "ai.manage",
        "ai.view",
        "users.manage",
        "audit.view",
        "settings.manage",
    },
    Role.CUSTOMER_SUPPORT: {
        "orders.view",
        "orders.manage",
        "payments.review",
        "customers.manage",
        "reviews.moderate",
        "ai.view",
        "audit.view",
    },
    Role.INVENTORY_MANAGER: {
        "products.manage",
        "products.view",
        "categories.manage",
        "brands.manage",
        "inventory.manage",
    },
    Role.PAYMENT_REVIEWER: {
        "orders.view",
        "payments.review",
    },
    Role.CONTENT_MANAGER: {
        "products.view",
        "categories.manage",
        "brands.manage",
        "content.manage",
        "whatsapp.manage",
        "reviews.moderate",
    },
    Role.CUSTOMER: set(),
}


class Permission(models.Model):
    code = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=128)
    category = models.CharField(max_length=64, default="general")

    class Meta:
        ordering = ("code",)

    def __str__(self):
        return self.code


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", Role.ADMIN)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    username = None

    email = models.EmailField("email address", unique=True, db_index=True)
    role = models.CharField(
        max_length=20, choices=Role.choices, default=Role.CUSTOMER, db_index=True
    )
    permissions = models.ManyToManyField(
        Permission, blank=True, related_name="users"
    )
    is_email_verified = models.BooleanField(default=False)
    failed_login_attempts = models.PositiveIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        ordering = ("email",)
        verbose_name = "user"
        verbose_name_plural = "users"

    def __str__(self):
        return self.email

    @property
    def is_locked(self):
        if self.locked_until is None:
            return False
        return self.locked_until > timezone.now()

    @property
    def role_permissions(self):
        return set(ROLE_PERMISSIONS.get(self.role, ()))

    def has_permission(self, code):
        role_perms = self.role_permissions
        if "*" in role_perms:
            return True
        return code in role_perms or code in set(
            self.permissions.values_list("code", flat=True)
        )

    def reset_login_attempts(self):
        self.failed_login_attempts = 0
        self.locked_until = None
        self.save(update_fields=["failed_login_attempts", "locked_until"])

    def register_failed_attempt(self):
        threshold = getattr(settings, "ACCOUNT_LOCKOUT_THRESHOLD", 5)
        lockout_seconds = getattr(settings, "ACCOUNT_LOCKOUT_SECONDS", 300)
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= threshold:
            self.locked_until = timezone.now() + timedelta(seconds=lockout_seconds)
        self.save(update_fields=["failed_login_attempts", "locked_until"])


class EmailVerificationToken(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_verification_token",
    )
    token = models.CharField(max_length=128, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def is_valid(self):
        return self.expires_at > timezone.now()


class PasswordResetToken(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="password_reset_tokens",
    )
    token = models.CharField(max_length=128, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    def is_valid(self):
        return not self.used and self.expires_at > timezone.now()
