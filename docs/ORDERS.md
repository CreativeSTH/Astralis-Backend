# Orders Module - Sistema de Órdenes

Sistema de gestión de órdenes para e-commerce con integración de pagos y envíos.

## Estructura

```
src/orders/
├── dto/
│   ├── create-order.dto.ts
│   └── index.ts
├── schemas/
│   └── order.schema.ts
├── orders.controller.ts
├── orders.service.ts
└── orders.module.ts
```

## Schema de Orden

```typescript
interface Order {
  _id: Types.ObjectId;
  orderNumber: string;              // Único: AST-240115-XXXX
  userId: Types.ObjectId;           // Usuario (obligatorio)
  addressId?: Types.ObjectId;       // Dirección guardada usada
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  discountCode?: string;
  shippingCost: number;
  total: number;
  shippingAddress: ShippingAddress;
  shippingInfo: ShippingInfo;
  paymentInfo: PaymentInfo;
  statusHistory: StatusHistory[];
  metadata?: Record<string, any>;
  notes?: string;
  cancelReason?: string;
  cancelledAt?: Date;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## Estados de Orden

```typescript
enum OrderStatus {
  PENDING = 'PENDING',                    // Creada, sin pago iniciado
  PAYMENT_PENDING = 'PAYMENT_PENDING',    // Esperando pago
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED', // Pago confirmado
  PROCESSING = 'PROCESSING',              // En preparación
  SHIPPED = 'SHIPPED',                    // Enviado
  DELIVERED = 'DELIVERED',                // Entregado
  CANCELLED = 'CANCELLED',                // Cancelado
  REFUNDED = 'REFUNDED',                  // Reembolsado
}
```

## Flujo de Estados

```
PENDING → PAYMENT_PENDING → PAYMENT_CONFIRMED → PROCESSING → SHIPPED → DELIVERED
                    ↓                ↓
                CANCELLED        CANCELLED
                                     ↓
                                 REFUNDED
```

## Métodos de Pago

```typescript
enum PaymentMethodType {
  WOMPI = 'WOMPI',
  EPAYCO = 'EPAYCO',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  ADDI = 'ADDI',
  SISTECREDITO = 'SISTECREDITO',
}
```

## Endpoints

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/api/orders` | Sí | Crear orden |
| POST | `/api/orders/with-payment` | Sí | Crear orden y procesar pago |
| GET | `/api/orders/my-orders` | Sí | Mis órdenes |
| GET | `/api/orders/:id` | Sí | Detalle de orden |
| GET | `/api/orders/number/:orderNumber` | Sí | Buscar por número |
| PATCH | `/api/orders/:id/status` | Admin | Actualizar estado |
| POST | `/api/orders/:id/confirm-payment` | Admin | Confirmar pago |
| PATCH | `/api/orders/:id/tracking` | Admin | Actualizar tracking |
| POST | `/api/orders/:id/cancel` | Sí | Cancelar orden |

## Crear Orden con Pago

Endpoint principal para el checkout:

```bash
POST /api/orders/with-payment
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "64a1b2c3d4e5f6g7h8i9j0k0",
  "customerEmail": "cliente@email.com",
  "customerName": "Juan Pérez",
  "customerPhone": "3001234567",
  "addressId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "items": [
    {
      "productoId": "64a1b2c3d4e5f6g7h8i9j0k2",
      "nombre": "Perfume Chanel No. 5",
      "imagen": "https://...",
      "cantidad": 2,
      "precioUnitario": 120000,
      "peso": 0.3
    },
    {
      "productoId": "64a1b2c3d4e5f6g7h8i9j0k3",
      "nombre": "Perfume Dior Sauvage",
      "cantidad": 1,
      "precioUnitario": 150000,
      "peso": 0.35
    }
  ],
  "discount": 10000,
  "discountCode": "DESC10",
  "shippingInfo": {
    "metodoEnvioId": "64a1b2c3d4e5f6g7h8i9j0k4",
    "costo": 15000,
    "esGratis": false
  },
  "paymentMethod": "WOMPI",
  "notes": "Entregar en horario de oficina"
}
```

**Respuesta:**
```json
{
  "order": {
    "_id": "64a1b2c3d4e5f6g7h8i9j0k5",
    "orderNumber": "AST-240115-A1B2",
    "status": "PAYMENT_PENDING",
    "total": 395000,
    "paymentInfo": {
      "method": "WOMPI",
      "transactionReference": "64a1b2c3d4e5f6g7h8i9j0k6"
    },
    ...
  },
  "paymentUrl": "https://checkout.wompi.co/l/12345-67890"
}
```

## Usando Dirección Guardada vs Inline

### Con addressId (recomendado)

```json
{
  "addressId": "64a1b2c3d4e5f6g7h8i9j0k1",
  ...
}
```

La dirección se carga automáticamente desde AddressesModule.

### Con shippingAddress inline

```json
{
  "shippingAddress": {
    "fullName": "Juan Pérez",
    "phone": "3001234567",
    "address": "Cra 45 #67-89",
    "addressDetail": "Apto 301",
    "ciudadId": "64a1b2c3d4e5f6g7h8i9j0k7",
    "postalCode": "050001",
    "notes": "Llamar al llegar"
  },
  ...
}
```

## Actualizar Estado

```bash
PATCH /api/orders/64a1b2c3d4e5f6g7h8i9j0k5/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "PROCESSING",
  "note": "Pedido en preparación"
}
```

## Actualizar Tracking

```bash
PATCH /api/orders/64a1b2c3d4e5f6g7h8i9j0k5/tracking
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "trackingNumber": "SER123456789",
  "trackingUrl": "https://servientrega.com/tracking/SER123456789"
}
```

Automáticamente cambia el estado a `SHIPPED`.

## Confirmar Pago

Se llama automáticamente desde webhook de pagos, o manualmente:

```bash
POST /api/orders/64a1b2c3d4e5f6g7h8i9j0k5/confirm-payment
Authorization: Bearer <admin_token>
```

Este endpoint:
1. Valida que la orden esté en `PAYMENT_PENDING`
2. Crea una Venta en el módulo de Ventas
3. Descuenta stock de productos
4. Actualiza `totalVendido` de productos
5. Cambia estado a `PAYMENT_CONFIRMED`

## Cancelar Orden

```bash
POST /api/orders/64a1b2c3d4e5f6g7h8i9j0k5/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Cliente cambió de opinión"
}
```

Solo se puede cancelar en estados:
- `PENDING`
- `PAYMENT_PENDING`

## Mis Órdenes

```bash
GET /api/orders/my-orders
Authorization: Bearer <token>
```

Retorna todas las órdenes del usuario autenticado, ordenadas por fecha descendente.

## Integración con Ventas

Cuando se confirma el pago (`confirmPayment`):

```typescript
// En orders.service.ts
await this.ventasService.createFromOrder({
  orderId: order._id.toString(),
  userId: order.userId?.toString(),
  customerEmail: order.customerEmail,
  customerName: order.customerName,
  customerPhone: order.customerPhone,
  items: order.items.map((item) => ({
    productoId: item.productoId.toString(),
    nombre: item.nombre,
    cantidad: item.cantidad,
    precioUnitario: item.precioUnitario,
    subtotal: item.subtotal,
  })),
  total: order.total,
});
```

Esto crea una venta con:
- `canal: 'ECOMMERCE'`
- `tipoVenta: 'CONTADO'`
- `estado: 'COMPLETADA'`
- Stock descontado
- Vinculada a la orden por `orderId`

## Historial de Estados

Cada cambio de estado se registra:

```typescript
interface StatusHistory {
  status: OrderStatus;
  timestamp: Date;
  note?: string;
  updatedBy?: string;
}
```

## Sub-Documentos

### OrderItem

```typescript
interface OrderItem {
  productoId: Types.ObjectId;
  nombre: string;
  imagen?: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  peso?: number;
}
```

### ShippingAddress

```typescript
interface ShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  addressDetail?: string;
  ciudadId: Types.ObjectId;
  ciudadNombre: string;
  departamentoNombre: string;
  postalCode?: string;
  notes?: string;
}
```

### ShippingInfo

```typescript
interface ShippingInfo {
  metodoEnvioId: string;
  metodoNombre: string;
  transportadora?: string;
  costo: number;
  esGratis: boolean;
  tiempoEstimadoMin?: number;
  tiempoEstimadoMax?: number;
  trackingNumber?: string;
  trackingUrl?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
}
```

### PaymentInfo

```typescript
interface PaymentInfo {
  method: PaymentMethodType;
  transactionId?: string;
  transactionReference?: string;
  status?: string;
  paidAt?: Date;
  paymentUrl?: string;
}
```

## Índices de Base de Datos

```typescript
OrderSchema.index({ orderNumber: 1 }, { unique: true });
OrderSchema.index({ userId: 1 });
OrderSchema.index({ customerEmail: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ 'paymentInfo.transactionReference': 1 });
```

## Dependencias

- **GeographyModule**: Validar ciudades
- **ShippingModule**: Validar métodos de envío
- **PaymentsModule**: Procesar pagos
- **AddressesModule**: Resolver direcciones guardadas
- **VentasModule**: Crear ventas al confirmar pago
