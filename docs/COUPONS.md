# Sistema de Cupones

Sistema completo de cupones de descuento para el e-commerce Astralis.

## Tipos de Descuento

| Tipo | Descripcion |
|------|-------------|
| `PERCENTAGE` | Descuento porcentual (ej: 10% de descuento) |
| `FIXED_AMOUNT` | Monto fijo de descuento (ej: $10,000 de descuento) |

## Estados de Cupones

| Estado | Descripcion |
|--------|-------------|
| `ACTIVE` | Cupon activo y disponible para uso |
| `INACTIVE` | Cupon desactivado manualmente |
| `EXPIRED` | Cupon expirado por fecha |

## Endpoints

### Publicos

```
GET /api/coupons/validate/:code
```
Valida si un cupon es aplicable (sin aplicarlo).

### Autenticados

```
POST /api/coupons/apply
```
Aplica un cupon al carrito del usuario.

**Body:**
```json
{
  "code": "VERANO2024",
  "cartTotal": 150000,
  "productIds": ["product_id_1", "product_id_2"]
}
```

**Respuesta exitosa:**
```json
{
  "valid": true,
  "discount": 15000,
  "finalTotal": 135000,
  "message": "Cupon aplicado: 10% de descuento"
}
```

### Administracion (Solo Admin)

```
POST   /api/coupons          # Crear cupon
GET    /api/coupons          # Listar cupones
GET    /api/coupons/:id      # Obtener cupon
PATCH  /api/coupons/:id      # Actualizar cupon
DELETE /api/coupons/:id      # Eliminar cupon (soft delete)
```

## Crear un Cupon

```json
POST /api/coupons
{
  "code": "VERANO2024",
  "description": "Descuento de verano 10%",
  "discountType": "PERCENTAGE",
  "discountValue": 10,
  "minimumPurchase": 50000,
  "maximumDiscount": 30000,
  "usageLimit": 100,
  "usageLimitPerUser": 1,
  "validFrom": "2024-01-01T00:00:00Z",
  "validUntil": "2024-03-31T23:59:59Z",
  "applicableProducts": [],
  "applicableCategories": ["PERFUMES"],
  "applicableBrands": []
}
```

## Campos del Cupon

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `code` | string | Si | Codigo unico del cupon (uppercase) |
| `description` | string | No | Descripcion del cupon |
| `discountType` | enum | Si | PERCENTAGE o FIXED_AMOUNT |
| `discountValue` | number | Si | Valor del descuento |
| `minimumPurchase` | number | No | Compra minima requerida |
| `maximumDiscount` | number | No | Descuento maximo (para porcentajes) |
| `usageLimit` | number | No | Limite total de usos |
| `usageLimitPerUser` | number | No | Limite de usos por usuario |
| `validFrom` | Date | No | Fecha de inicio de validez |
| `validUntil` | Date | No | Fecha de fin de validez |
| `applicableProducts` | ObjectId[] | No | Productos especificos donde aplica |
| `applicableCategories` | string[] | No | Categorias donde aplica |
| `applicableBrands` | ObjectId[] | No | Marcas donde aplica |
| `status` | enum | No | Estado del cupon (default: ACTIVE) |

## Validaciones

El sistema valida automaticamente:

1. **Existencia**: El cupon existe y esta activo
2. **Fechas**: Esta dentro del rango de validez
3. **Limite global**: No ha excedido el limite total de usos
4. **Limite por usuario**: El usuario no ha excedido su limite
5. **Compra minima**: El total del carrito cumple el minimo
6. **Productos aplicables**: Al menos un producto aplica para el cupon
7. **Categorias/Marcas**: Filtros adicionales de aplicabilidad

## Registro de Uso

Cada uso de cupon se registra en `CouponUsage`:

```typescript
{
  couponId: ObjectId,      // Referencia al cupon
  userId: ObjectId,        // Usuario que uso el cupon
  orderId: ObjectId,       // Orden donde se aplico
  discountApplied: number, // Monto descontado
  usedAt: Date            // Fecha de uso
}
```

## Ejemplo de Uso en Frontend

```typescript
// 1. Validar cupon antes de mostrar descuento
const validation = await fetch('/api/coupons/validate/VERANO2024');
const { valid, message } = await validation.json();

if (valid) {
  // 2. Aplicar cupon al checkout
  const response = await fetch('/api/coupons/apply', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      code: 'VERANO2024',
      cartTotal: 150000,
      productIds: cartItems.map(item => item.productId)
    })
  });

  const { discount, finalTotal } = await response.json();
  // Mostrar descuento aplicado
}
```

## Esquema de Base de Datos

```typescript
// Coupon Schema
{
  code: string,              // Unico, uppercase
  description: string,
  discountType: DiscountType,
  discountValue: number,
  minimumPurchase: number,
  maximumDiscount: number,
  usageLimit: number,
  usageLimitPerUser: number,
  currentUsageCount: number, // Contador automatico
  validFrom: Date,
  validUntil: Date,
  applicableProducts: ObjectId[],
  applicableCategories: string[],
  applicableBrands: ObjectId[],
  status: CouponStatus,
  activo: boolean,           // Soft delete
  createdAt: Date,
  updatedAt: Date
}

// CouponUsage Schema
{
  couponId: ObjectId,
  userId: ObjectId,
  orderId: ObjectId,
  discountApplied: number,
  usedAt: Date
}
```
