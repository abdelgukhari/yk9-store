import os
from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand

from accounts.models import Permission, Role, ROLE_PERMISSIONS, User
from ai.models import AIAgent, AIAgentTool, AIProvider
from catalog.models import Brand, Category, Inventory, Product, ProductImage, ProductVariant
from shipping.models import City, Governorate, ShippingRate, StoreShippingSettings
from whatsapp.models import WhatsAppSettings

GOVERNORATES = [
    ("القاهرة", "Cairo", 55, 2),
    ("الجيزة", "Giza", 55, 2),
    ("الإسكندرية", "Alexandria", 65, 2),
    ("القليوبية", "Qalyubia", 60, 2),
    ("الشرقية", "Sharqia", 65, 2),
    ("الدقهلية", "Dakahlia", 65, 2),
    ("الغربية", "Gharbia", 70, 2),
    ("المنوفية", "Monufia", 70, 2),
    ("كفر الشيخ", "Kafr El Sheikh", 70, 2),
    ("البحيرة", "Beheira", 70, 3),
    ("دمياط", "Damietta", 70, 3),
    ("بورسعيد", "Port Said", 75, 3),
    ("الإسماعيلية", "Ismailia", 75, 3),
    ("السويس", "Suez", 75, 3),
    ("الفيوم", "Faiyum", 80, 3),
    ("بني سويف", "Beni Suef", 80, 3),
    ("المنيا", "Minya", 85, 3),
    ("أسيوط", "Assiut", 85, 3),
    ("سوهاج", "Sohag", 90, 4),
    ("قنا", "Qena", 90, 4),
    ("الأقصر", "Luxor", 95, 4),
    ("أسوان", "Aswan", 100, 5),
    ("البحر الأحمر", "Red Sea", 110, 5),
    ("الوادي الجديد", "New Valley", 120, 6),
    ("مطروح", "Matruh", 120, 6),
    ("شمال سيناء", "North Sinai", 120, 6),
    ("جنوب سيناء", "South Sinai", 120, 6),
]

CITIES = {
    "القاهرة": ["مدينة نصر", "المعادي", "الزمالك", "مصر الجديدة", "العباسية", "شبرا"],
    "الجيزة": ["الدقي", "المهندسين", "الهرم", "6 أكتوبر", "العجوزة", "الشيخ زايد"],
    "الإسكندرية": ["سموحة", "العصافرة", "المنتزه", "سيدي جابر", "السيوف"],
    "القليوبية": ["شبرا الخيمة", "قليوب", "بنها", "الخانكة"],
    "الشرقية": ["الزقازيق", "العاشر من رمضان", "بلبيس", "منيا القمح"],
    "الدقهلية": ["المنصورة", "طلخا", "ميت غمر", "أجا"],
    "الغربية": ["طنطا", "المحلة الكبرى", "كفر الزيات", "زفتى"],
    "المنوفية": ["شبين الكوم", "منوف", "قويسنا", "بركة السبع"],
    "كفر الشيخ": ["كفر الشيخ", "دسوق", "بيلا", "فوه"],
    "البحيرة": ["دمنهور", "كفر الدوار", "إدكو", "رشيد"],
    "دمياط": ["دمياط", "كفر سعد", "فارسكور", "عزبة البرج"],
    "بورسعيد": ["بورسعيد", "الضواحي", "العرب"],
    "الإسماعيلية": ["الإسماعيلية", "أبو صوير", "فايد", "القنطرة"],
    "السويس": ["السويس", "فيصل", "الأربعين"],
    "الفيوم": ["الفيوم", "سنورس", "إطسا"],
    "بني سويف": ["بني سويف", "الفشن", "ناصر"],
    "المنيا": ["المنيا", "ملوي", "بني مزار", "أبو قرقاص"],
    "أسيوط": ["أسيوط", "ديروط", "أبنوب", "منفلوط"],
    "سوهاج": ["سوهاج", "أخميم", "طهطا", "البلينا"],
    "قنا": ["قنا", "قوص", "نجع حمادي"],
    "الأقصر": ["الأقصر", "إسنا", "أرمنت"],
    "أسوان": ["أسوان", "كوم أمبو", "إدفو"],
    "البحر الأحمر": ["الغردقة", "سفاجا", "رأس غارب", "مرسى علم"],
    "الوادي الجديد": ["الخارجة", "الداخلة"],
    "مطروح": ["مرسى مطروح", "العلمين", "سيوة"],
    "شمال سيناء": ["العريش", "بئر العبد", "الشيخ زويـد"],
    "جنوب سيناء": ["شرم الشيخ", "دهب", "سانت كاترين", "طابا"],
}

DEFAULT_AGENTS = [
    {
        "name": "Product Advisor",
        "role": "product_advisor",
        "description": "يوصي بالمنتجات حسب الميزانية والاستخدام من الكتالوج الفعلي فقط.",
        "instructions": (
            "أنت مساعد يوصي بمنتجات YK9 الفعلية فقط. ابحث في قاعدة المنتجات. "
            "اعرض الاسم والسعر الفعلي وأهم المميزات وسبب التوصية ورابط المنتج. "
            "لا تخترع أسعارًا أو مواصفات. إن لم تجد، قل ذلك بوضوح."
        ),
    },
    {
        "name": "Customer Support",
        "role": "customer_support",
        "description": "مساعد عام يجاوب على أي سؤال، وعارف تفاصيل متجر YK9.",
        "instructions": (
            "أنت مساعد ذكاء اصطناعي عام بالعربية المصرية، زي ChatGPT، بترد على أي سؤال "
            "يسأله المستخدم مهما كان موضوعه. لو السؤال عن متجر YK9 (منتجات، أسعار، شحن، "
            "دفع، ضمان، استرجاع) استخدم المعلومات المتاحة لك عن المتجر عشان تجاوب بدقة، "
            "ولو مفيش معلومة مؤكدة عن تفصيلة خاصة بالمتجر قول كده بوضوح واقترح التواصل "
            "واتساب. أي سؤال تاني مالوش علاقة بالمتجر، جاوب عليه بمعرفتك العامة زي أي "
            "مساعد ذكاء اصطناعي عادي."
        ),
    },
    {
        "name": "Order Assistant",
        "role": "order_assistant",
        "description": "يساعد في تتبع الطلبات بعد التحقق من هوية العميل.",
        "instructions": (
            "أنت مساعد الطلبات. اعرض حالة الطلب فقط بعد تحقق مناسب من هوية العميل. "
            "لا تكشف بيانات العميل. إن لم يصح التحقق، اطلب التواصل مع الدعم."
        ),
    },
    {
        "name": "Product Comparison",
        "role": "product_comparison",
        "description": "يقارن منتجين أو أكثر من الكتالوج.",
        "instructions": (
            "أنت مساعد المقارنة. قارن بين منتجين أو أكثر بجدول من المواصفات الفعلية والأسعار. "
            "لا تخترع مواصفات غير موجودة."
        ),
    },
    {
        "name": "FAQ Agent",
        "role": "faq",
        "description": "يجيب عن الأسئلة المتكررة.",
        "instructions": (
            "أنت مساعد الأسئلة الشائعة. أجب من مستندات الأسئلة الشائعة فقط. "
            "إن لم تجد السؤال، قل أنك لست متأكدًا واعرض التواصل مع واتساب."
        ),
    },
]

DEFAULT_TOOLS = [
    ("search_products", "البحث في الكتالوج الفعلي"),
    ("get_product", "جلب تفاصيل منتج محدد"),
    ("compare_products", "مقارنة منتجين أو أكثر"),
    ("get_policy", "جلب نص سياسة/مستند"),
    ("order_status", "عرض حالة طلب بعد التحقق"),
    ("handoff_whatsapp", "تحويل المحادثة إلى واتساب"),
]


class Command(BaseCommand):
    help = "Seed demo data: governorates, shipping, demo products, AI agents, settings."

    def handle(self, *args, **options):
        self.seed_permissions()
        self.seed_admin()
        self.seed_shipping()
        self.seed_catalog()
        self.seed_whatsapp()
        self.seed_ai()
        self.stdout.write(self.style.SUCCESS("Seed complete."))

    def seed_permissions(self):
        codes = set()
        for perms in ROLE_PERMISSIONS.values():
            codes.update(perms)
        codes.discard("*")
        for code in sorted(codes):
            Permission.objects.get_or_create(
                code=code, defaults={"name": code.replace(".", " - "), "category": code.split(".")[0]}
            )

    def seed_admin(self):
        email = os.environ.get("SEED_ADMIN_EMAIL", "admin@yk9.com")
        password = os.environ.get("SEED_ADMIN_PASSWORD", "YK9Admin@123")
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "role": Role.OWNER,
                "is_staff": True,
                "is_superuser": True,
                "first_name": "YK9",
                "is_email_verified": True,
            },
        )
        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(f"Created admin {email} / {password}")

    def seed_shipping(self):
        settings = StoreShippingSettings.get()
        settings.free_shipping_threshold = Decimal("1500")
        settings.inventory_reservation_policy = "hold"
        settings.reservation_hours = 48
        settings.save()
        for name_ar, name_en, price, days in GOVERNORATES:
            gov, _ = Governorate.objects.get_or_create(
                name_ar=name_ar, defaults={"name_en": name_en}
            )
            for city in CITIES.get(name_ar, []):
                City.objects.get_or_create(governorate=gov, name_ar=city)
            ShippingRate.objects.get_or_create(
                governorate=gov,
                defaults={
                    "price": Decimal(price),
                    "estimated_delivery_days": days,
                    "free_shipping_threshold": Decimal("1500"),
                },
            )

    def seed_catalog(self):
        wireless, _ = Category.objects.get_or_create(name_ar="سماعات لاسلكية", name_en="Wireless Audio")
        chargers, _ = Category.objects.get_or_create(name_ar="شواحن", name_en="Chargers")
        accessories, _ = Category.objects.get_or_create(name_ar="إكسسوارات موبايل", name_en="Mobile Accessories")

        soundcore, _ = Brand.objects.get_or_create(name="Soundcore")
        samsung, _ = Brand.objects.get_or_create(name="Samsung")
        anker, _ = Brand.objects.get_or_create(name="Anker")
        yk9, _ = Brand.objects.get_or_create(name="YK9")

        products = [
            {
                "name_ar": "سماعة Soundcore Life P3",
                "name_en": "Soundcore Life P3",
                "model": "Life P3",
                "brand": soundcore,
                "category": wireless,
                "description": "سماعة أذن لاسلكية مع عزل ضوضاء نشط وبطارية تدوم طويلًا.",
                "battery_life_hours": "35",
                "charging_type": "USB-C",
                "bluetooth_version": "5.2",
                "water_resistance": "IPX5",
                "noise_cancellation": True,
                "warranty_months": 18,
                "box_contents": "السماعة + علبة الشحن + كابل USB-C + كتيب",
                "colors": [("أسود", "#111111", 2100, 2600), ("أزرق داكن", "#1B2A4A", 2100, 2600)],
            },
            {
                "name_ar": "سماعة Samsung Galaxy Buds3",
                "name_en": "Samsung Galaxy Buds3",
                "model": "Galaxy Buds3",
                "brand": samsung,
                "category": wireless,
                "description": "سماعة سامسونج اللاسلكية مع جودة صوت عالية وميكروفون محسّن.",
                "battery_life_hours": "24",
                "charging_type": "USB-C / Wireless",
                "bluetooth_version": "5.4",
                "water_resistance": "IP57",
                "noise_cancellation": False,
                "warranty_months": 18,
                "box_contents": "السماعة + علبة الشحن + كابل USB-C",
                "colors": [("فضي", "#C0C0C0", 3200, 0), ("أسود", "#111111", 3200, 0)],
            },
            {
                "name_ar": "سماعة Samsung Galaxy Buds3 Pro",
                "name_en": "Samsung Galaxy Buds3 Pro",
                "model": "Galaxy Buds3 Pro",
                "brand": samsung,
                "category": wireless,
                "description": "سماعة برو مع عزل ضوضاء ذكي وجودة صوت استوديو.",
                "battery_life_hours": "26",
                "charging_type": "USB-C / Wireless",
                "bluetooth_version": "5.4",
                "water_resistance": "IP57",
                "noise_cancellation": True,
                "warranty_months": 18,
                "box_contents": "السماعة + علبة الشحن + كابل USB-C + أطراف إضافية",
                "colors": [("فضي", "#C0C0C0", 4900, 5400), ("أسود", "#111111", 4900, 5400)],
            },
            {
                "name_ar": "سماعة Soundcore AeroFit Pro",
                "name_en": "Soundcore AeroFit Pro",
                "model": "AeroFit Pro",
                "brand": soundcore,
                "category": wireless,
                "description": "سماعة مفتوحة الأذن مريحة للرياضة مع ثبات عالي وصوت غامر.",
                "battery_life_hours": "46",
                "charging_type": "USB-C",
                "bluetooth_version": "5.3",
                "water_resistance": "IPX5",
                "noise_cancellation": False,
                "warranty_months": 18,
                "box_contents": "السماعة + علبة الشحن + كابل USB-C",
                "colors": [("أسود", "#111111", 2800, 3200), ("أخضر", "#3D7A4B", 2800, 3200)],
            },
            {
                "name_ar": "شاحن YK9 GaN 65W",
                "name_en": "YK9 GaN Charger 65W",
                "model": "YC65W",
                "brand": yk9,
                "category": chargers,
                "description": "شاحن سريع تقنية GaN بمنفذين USB-C ومنفذ USB-A لشحن الأجهزة المتعددة.",
                "battery_life_hours": "",
                "charging_type": "USB-C / USB-A",
                "bluetooth_version": "",
                "water_resistance": "",
                "noise_cancellation": False,
                "warranty_months": 12,
                "box_contents": "الشاحن + كابل USB-C",
                "colors": [("أسود", "#111111", 899, 1099), ("أبيض", "#F5F5F5", 899, 1099)],
            },
            {
                "name_ar": "باور بانك Anker PowerCore 10000",
                "name_en": "Anker PowerCore 10000",
                "model": "A1223",
                "brand": anker,
                "category": chargers,
                "description": "باور بانك بسعة 10000mAh وبمنفذين لشحن هاتفك أثناء التنقل.",
                "battery_life_hours": "",
                "charging_type": "USB-A / USB-C",
                "bluetooth_version": "",
                "water_resistance": "",
                "noise_cancellation": False,
                "warranty_months": 18,
                "box_contents": "الباور بانك + كابل USB-C",
                "colors": [("أسود", "#111111", 1200, 0), ("أزرق", "#1E90FF", 1200, 0)],
            },
        ]

        for p in products:
            product, _ = Product.objects.get_or_create(
                model=p["model"],
                defaults={
                    "name_ar": p["name_ar"],
                    "name_en": p["name_en"],
                    "brand": p["brand"],
                    "category": p["category"],
                    "description": p["description"],
                    "status": Product.Status.ACTIVE,
                    "is_featured": p["model"] in ("Life P3", "Galaxy Buds3 Pro"),
                    "is_best_seller": p["model"] in ("Life P3", "AeroFit Pro"),
                    "battery_life_hours": Decimal(p["battery_life_hours"] or "0"),
                    "charging_type": p["charging_type"],
                    "bluetooth_version": p["bluetooth_version"],
                    "water_resistance": p["water_resistance"],
                    "noise_cancellation": p["noise_cancellation"],
                    "warranty_months": p["warranty_months"],
                    "box_contents": p["box_contents"],
                    "is_demo": True,
                },
            )
            for i, (color, hexv, price, compare) in enumerate(p["colors"]):
                variant, _ = ProductVariant.objects.get_or_create(
                    product=product,
                    color=color,
                    defaults={
                        "color_hex": hexv,
                        "sku": f"{p['model'].replace(' ', '')}-{i + 1}",
                        "price": Decimal(price),
                        "compare_at_price": Decimal(compare) if compare else None,
                        "is_active": True,
                    },
                )
                Inventory.objects.get_or_create(variant=variant, defaults={"quantity": 15, "low_stock_threshold": 3})

    def seed_whatsapp(self):
        wa, _ = WhatsAppSettings.objects.get_or_create(pk=1, defaults={"number": "01037839725"})
        wa.number = os.environ.get("WHATSAPP_NUMBER", "01037839725")
        wa.save()

    def seed_ai(self):
        provider_kind = os.environ.get("AI_PROVIDER", "mock")
        provider, _ = AIProvider.objects.get_or_create(
            kind=provider_kind,
            defaults={
                "name": "Primary",
                "base_url": os.environ.get("AI_BASE_URL", ""),
                "model": os.environ.get("AI_MODEL", ""),
                "is_active": True,
            },
        )
        tools = {}
        for name, desc in DEFAULT_TOOLS:
            tools[name], _ = AIAgentTool.objects.get_or_create(name=name, defaults={"description": desc})
        for agent_data in DEFAULT_AGENTS:
            agent, created = AIAgent.objects.get_or_create(
                role=agent_data["role"],
                defaults={
                    "name": agent_data["name"],
                    "description": agent_data["description"],
                    "system_instructions": agent_data["instructions"],
                    "provider": provider,
                    "is_active": True,
                    "is_default": agent_data["role"] == "customer_support",
                    "temperature": float(os.environ.get("AI_TEMPERATURE", "0.4")),
                    "max_tokens": int(os.environ.get("AI_MAX_TOKENS", "600")),
                },
            )
            if created:
                agent.tools.set(tools.values())
