import os
import re

from django.core.exceptions import ValidationError
from django.core.files.images import get_image_dimensions

EGYPTIAN_MOBILE_RE = re.compile(r"^01[0-9]{9}$")


def validate_egyptian_mobile(value):
    value = re.sub(r"[\s\-()]", "", str(value))
    if not EGYPTIAN_MOBILE_RE.match(value):
        raise ValidationError("رقم موبايل مصري غير صحيح (مثال: 01012345678).")
    return value

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": (".jpg", ".jpeg"),
    "image/png": (".png",),
    "image/webp": (".webp",),
    "image/gif": (".gif",),
}
ALLOWED_DOC_TYPES = {
    "application/pdf": (".pdf",),
    "text/plain": (".txt",),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": (".docx",),
    "application/msword": (".doc",),
}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_DOC_SIZE = 8 * 1024 * 1024  # 8 MB


def _validate(file, allowed, max_size, kind):
    if getattr(file, "size", 0) > max_size:
        raise ValidationError(f"{kind} أكبر من الحجم المسموح ({max_size // (1024 * 1024)}MB).")
    content_type = getattr(file, "content_type", "") or ""
    ext = os.path.splitext(getattr(file, "name", ""))[1].lower()
    allowed_exts = allowed.get(content_type)
    if allowed_exts is None:
        raise ValidationError("نوع الملف غير مدعوم.")
    if ext not in allowed_exts:
        raise ValidationError("امتداد الملف غير مدعوم.")
    return content_type


def validate_uploaded_image(file):
    _validate(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE, "الصورة")
    try:
        dims = get_image_dimensions(file)
    except Exception:
        dims = None
    if dims is not None and (dims[0] < 50 or dims[1] < 50):
        raise ValidationError("الصورة صغيرة جدًا.")


def validate_uploaded_document(file):
    _validate(file, ALLOWED_DOC_TYPES, MAX_DOC_SIZE, "المستند")