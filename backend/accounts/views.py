from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import EmailVerificationToken, PasswordResetToken, User
from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    ResendVerificationSerializer,
    UserSerializer,
    VerifyEmailSerializer,
)
from .utils import (
    log_auth_event,
    send_password_reset_email,
    send_verification_email,
)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        send_verification_email(user)
        log_auth_event("registration", user.email, request)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower().strip()
        password = serializer.validated_data["password"]

        user = User.objects.filter(email=email).first()
        if user is None:
            log_auth_event("login_failed", email, request, "unknown_user")
            raise AuthenticationFailed("Invalid email or password.")

        if user.is_locked:
            log_auth_event("login_locked", user.email, request)
            raise AuthenticationFailed("Account temporarily locked. Try again later.")

        if not user.check_password(password):
            user.register_failed_attempt()
            log_auth_event("login_failed", user.email, request)
            raise AuthenticationFailed("Invalid email or password.")

        user.reset_login_attempts()
        refresh = RefreshToken.for_user(user)
        log_auth_event("login_success", user.email, request)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            }
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh = request.data.get("refresh")
        if refresh:
            try:
                RefreshToken(refresh).blacklist()
            except Exception:
                pass
        log_auth_event("logout", request.user.email, request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = EmailVerificationToken.objects.filter(
            token=serializer.validated_data["token"]
        ).first()
        if token is None or not token.is_valid():
            raise ValidationError({"token": "Invalid or expired token."})
        user = token.user
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified"])
        token.delete()
        log_auth_event("email_verified", user.email, request)
        return Response({"detail": "Email verified."})


class ResendVerificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(
            email=serializer.validated_data["email"].lower().strip()
        ).first()
        if user is not None and not user.is_email_verified:
            send_verification_email(user)
            log_auth_event("verification_resent", user.email, request)
        return Response({"detail": "If the email exists, a new token was sent."})


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(
            email=serializer.validated_data["email"].lower().strip()
        ).first()
        if user is not None and user.is_active:
            send_password_reset_email(user)
            log_auth_event("password_reset_requested", user.email, request)
        return Response({"detail": "If the email exists, a reset token was sent."})


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = PasswordResetToken.objects.filter(
            token=serializer.validated_data["token"]
        ).first()
        if token is None or not token.is_valid():
            raise ValidationError({"token": "Invalid or expired token."})
        token.user.set_password(serializer.validated_data["password"])
        token.user.is_email_verified = True
        token.user.reset_login_attempts()
        token.user.save(update_fields=["password", "is_email_verified"])
        token.used = True
        token.save(update_fields=["used"])
        log_auth_event("password_reset_completed", token.user.email, request)
        return Response({"detail": "Password has been reset."})


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.reset_login_attempts()
        request.user.save(update_fields=["password"])
        log_auth_event("password_changed", request.user.email, request)
        return Response({"detail": "Password changed."})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)
