import os
from django.core.management.base import BaseCommand
from catalog.models import Product, ProductImage


class Command(BaseCommand):
    help = 'Attach downloaded product images to products'

    def handle(self, *args, **options):
        # Map product names to downloaded image filenames
        IMAGE_MAPPING = {
            'Soundcore Life P3': 'img1.webp',
            'Samsung Galaxy Buds3': 'img2.webp',
            'Samsung Galaxy Buds3 Pro': 'img3.webp',
            'Soundcore AeroFit Pro': 'img4.webp',
            'YK9 GaN 65W charger': 'img5.webp',
            'Anker PowerCore 10000': 'img6.webp',
        }

        products = Product.objects.all()

        for product in products:
            image_filename = IMAGE_MAPPING.get(product.name)
            if not image_filename:
                # Fallback: assign the first available image
                image_filename = 'img1.webp'

            image_path = f"media/products/{image_filename}"

            # Create the ProductImage entry
            ProductImage.objects.create(
                product=product,
                image=image_path,
                sort_order=0
            )
            self.stdout.write(self.style.SUCCESS(f"✅ Attached {image_filename} → {product.name}"))

        self.stdout.write(self.style.SUCCESS("\nAll product images attached successfully!"))