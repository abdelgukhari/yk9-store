from .models import AuditLog


def get_client_ip(request):
    if request is None:
        return None
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def audit_log(request, actor, action, target_type="", target_id="", detail=None):
    detail = detail or {}
    safe_detail = {
        k: (v if not isinstance(v, str) else v[:2000])
        for k, v in detail.items()
        if not _is_secret_key(k)
    }
    return AuditLog.objects.create(
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        actor_email=getattr(actor, "email", "") if actor else "",
        action=action,
        target_type=target_type,
        target_id=str(target_id) if target_id else "",
        detail=safe_detail,
        ip=get_client_ip(request),
    )


def _is_secret_key(key):
    key = str(key).lower()
    return any(s in key for s in ("password", "secret", "token", "api_key", "key"))