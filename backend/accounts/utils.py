import logging
import secrets

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import EmailVerificationToken, PasswordResetToken, User

logger = logging.getLogger("accounts.auth")


def generate_token():
    return secrets.token_urlsafe(48)


def create_email_verification_token(user):
    max_age = getattr(settings, "VERIFICATION_TOKEN_MAX_AGE", 86400)
    token = generate_token()
    EmailVerificationToken.objects.update_or_create(
        user=user,
        defaults={
            "token": token,
            "expires_at": timezone.now() + timezone.timedelta(seconds=max_age),
        },
    )
    return token


def send_verification_email(user):
    token = create_email_verification_token(user)
    send_mail(
        subject="Verify your email",
        message=(
            f"Hi {user.first_name or user.email},\n\n"
            f"Please verify your email by submitting this token:\n\n{token}\n\n"
            f"It expires in {settings.VERIFICATION_TOKEN_MAX_AGE // 3600} hours."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def create_password_reset_token(user):
    max_age = 3600
    token = generate_token()
    PasswordResetToken.objects.create(
        user=user,
        token=token,
        expires_at=timezone.now() + timezone.timedelta(seconds=max_age),
    )
    return token


def send_password_reset_email(user):
    token = create_password_reset_token(user)
    send_mail(
        subject="Password reset request",
        message=(
            f"Hi {user.first_name or user.email},\n\n"
            f"Use this token to reset your password:\n\n{token}\n\n"
            f"It expires in 1 hour. If you did not request this, ignore this email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def log_auth_event(event, user_email, request, extra=None):
    logger.info(
        "auth event=%s email=%s ip=%s user_agent=%s%s",
        event,
        user_email or "-",
        request.META.get("REMOTE_ADDR", "-"),
        request.META.get("HTTP_USER_AGENT", "-"),
        f" extra={extra}" if extra else "",
    )
