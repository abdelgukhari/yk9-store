# YK9 ERD

Legend: 1—N one-to-many, M:N many-to-many, 1—1 one-to-one.

## Identity & Access
```
Role 1—N User M—N Permission (via UserRole/UserPermission or M2M)
User: id, email(UQ), role, is_email_verified, failed_login_attempts, locked_until
Address 1—N User: full_name, phone, whatsapp, governorate FK, city FK, area, detail, landmark, notes
```
RBAC roles: owner, admin, customer_support, inventory_manager, payment_reviewer, content_manager, customer.

## Catalog
```
Governorate 1—N City
Governorate 1—N ShippingRate (price, free_shipping_threshold, estimated_delivery_days)
Category (self 1—N): name_ar, name_en, slug, image, active, seo
Brand: name, slug, logo, description
Product 1—N ProductImage (image, alt, sort)
Product 1—N ProductVariant: color, sku, price, compare_at_price, stock(→Inventory), active
Product 1—N ProductSpecification: key, value, unit
Product: name_ar, name_en, slug, brand FK, category FK, description, specs flags
  (battery_life_hours, charging_type, bluetooth_version, water_resistance, noise_cancellation),
  warranty_months, box_contents, is_featured, is_best_seller, status, seo
Inventory 1—1 ProductVariant: quantity, low_stock_threshold, reserved_quantity
InventoryReservation N—1 Order: variant FK, quantity, reserved_until, status
```

## Cart
```
Cart 1—N CartItem: variant FK, quantity, coupon_code
Wishlist M:N User—Product
```

## Orders
```
Order: order_number(UQ), user FK(null for guest), status, payment_method(COD|VODAFONE_CASH),
  subtotal, discount, shipping_fee, total, coupon FK, delivery estimate,
  Address snapshot fields (full_name, phone, whatsapp, governorate, city, area, detail, landmark, notes),
  inventory_policy, created_at
Order 1—N OrderItem (SNAPSHOT): product_name, sku, variant, color, unit_price, discount, quantity, total
Order 1—N OrderStatusHistory: prev_status, new_status, changed_by FK, reason, at
Order 1—1 Payment: method, status(PENDING|PAID|REJECTED), amount, verified_by, verified_at, decision_reason
Payment 1—N VodafoneCashProof: sender_number, reference, proof_image, note, submitted_at
Order 1—1 Shipment: governorate, city, address, shipping_fee, estimated_delivery_days, status
Coupon: code(UQ), type(FIXED|PERCENT), value, min_subtotal, max_discount, usage_limit, used_count, active, valid_from, valid_until
```

Status machine (orders): Pending → AwaitingConfirmation → Confirmed → Processing → Shipped → Delivered;
COD/VC → PaymentVerificationPending → PaymentRejected → (resubmit) → PaymentVerificationPending → Paid;
any pre-shipping → Cancelled; Delivered → Returned → Refunded.

## WhatsApp
```
WhatsAppSettings (singleton): number, welcome_message, templates(json: inquiry, order_confirmation,
  cod_confirmation, vodafone_cash, support)
```

## AI Center
```
AIProvider: name, kind(openai|ollama|mock), base_url, api_key_enc, model, active, online
AIModel: provider FK, model_id, label
AIAgent: name, description, system_instructions, provider FK, model FK, temperature, max_tokens, active, role, tools M2M, kb M2M
AIAgent 1—N AIAgentVersion: instructions, temperature, max_tokens, created_at (restorable)
AIAgentTool: name, description, allowed FK/Action
KnowledgeDocument: title, slug, content(md) or file, file_type, category, tags, status(indexed|pending|error),
  index_error, indexed_at, updated_at, agents M2M
KnowledgeDocument 1—N KnowledgeChunk: seq, content, tsvector indexed
ChatSession: user FK(null), agent FK, status, product_links, created_at, masked
ChatSession 1—N ChatMessage: role, content, sources(json), rating, flagged
AIUsageLog: agent FK, provider FK, prompt_tokens, completion_tokens, latency_ms, cost_est, error, at
AgentEvaluation: message FK, rating, notes
AuditLog: actor, action, target_type, target_id, detail, ip, at
```

## Seed
Demo products: Soundcore Life P3, Samsung Galaxy Buds3, Samsung Galaxy Buds3 Pro, Soundcore AeroFit Pro — with color variants. All seed rows flagged `is_demo=True` for dashboard visibility.