from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/catalog/", include("catalog.urls")),
    path("api/shipping/", include("shipping.urls")),
    path("api/", include("orders.urls")),
    path("api/whatsapp/", include("whatsapp.urls")),
    path("api/ai/", include("ai.urls")),
    path("api/admin/", include("adminapi.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)