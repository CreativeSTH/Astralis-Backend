# Payments Module - Sistema de Pagos

Sistema de procesamiento de pagos con múltiples proveedores para e-commerce.

## Estructura

```
src/payments/
├── interfaces/
│   └── payment-provider.interface.ts   # Contrato para proveedores
├── providers/
│   ├── wompi.provider.ts               # Integración Wompi
│   └── cash-on-delivery.provider.ts    # Contra entrega
├── dto/
│   ├── create-payment.dto.ts
│   └── index.ts
├── schemas/
│   └── transaction.schema.ts
├── payments.controller.ts
├── payments.service.ts
└── payments.module.ts
```

## Proveedores de Pago

### Disponibles

| Proveedor | Código | Estado |
|-----------|--------|--------|
| Wompi | `WOMPI` | Implementado |
| Contra Entrega | `CASH_ON_DELIVERY` | Implementado |

### Pendientes de Implementación

| Proveedor | Código | Notas |
|-----------|--------|-------|
| ePayco | `EPAYCO` | Estructura lista, falta integración API |
| Addi | `ADDI` | Para compras a cuotas |
| Sistecrédito | `SISTECREDITO` | Para compras a cuotas |

## Schema de Transacción

```typescript
interface Transaction {
  _id: Types.ObjectId;
  orderId: Types.ObjectId;            // Orden asociada
  provider: PaymentProvider;          // WOMPI, EPAYCO, etc.
  providerTransactionId?: string;     // ID en el proveedor
  reference: string;                  // Referencia interna única
  amount: number;                     // Monto en pesos
  currency: string;                   // COP
  status: PaymentStatus;              // Estado actual
  statusHistory: StatusChange[];      // Historial de cambios
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  customerDocument?: string;
  customerDocumentType?: string;
  paymentUrl?: string;                // URL para pagar (Wompi)
  paymentMethod?: string;             // Tarjeta, PSE, etc.
  metadata?: Record<string, any>;     // Datos adicionales
  errorMessage?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

## Estados de Pago

```typescript
enum PaymentStatus {
  PENDING = 'PENDING',           // Creada, pendiente de pago
  PROCESSING = 'PROCESSING',     // En proceso de verificación
  APPROVED = 'APPROVED',         // Pago exitoso
  DECLINED = 'DECLINED',         // Rechazado
  VOIDED = 'VOIDED',            // Anulado
  REFUNDED = 'REFUNDED',        // Reembolsado
  ERROR = 'ERROR',              // Error en procesamiento
  EXPIRED = 'EXPIRED',          // Expirado sin pagar
}
```

## Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/payments` | Crear transacción de pago |
| GET | `/api/payments/providers` | Listar proveedores disponibles |
| GET | `/api/payments/:id` | Obtener transacción por ID |
| GET | `/api/payments/reference/:ref` | Obtener por referencia |
| GET | `/api/payments/order/:orderId` | Transacciones de una orden |
| POST | `/api/payments/:id/verify` | Verificar estado con proveedor |
| POST | `/api/payments/webhook/:provider` | Recibir notificaciones |
| POST | `/api/payments/:id/confirm-cod` | Confirmar contra entrega |

## Integración Wompi

### Variables de Entorno

```env
WOMPI_PUBLIC_KEY=pub_test_xxxxxxxxxx
WOMPI_PRIVATE_KEY=prv_test_xxxxxxxxxx
WOMPI_EVENTS_KEY=events_xxxxxxxxxx
WOMPI_INTEGRITY_KEY=test_integrity_xxxxxxxxxx
```

### Crear Pago con Wompi

```bash
POST /api/payments
Content-Type: application/json

{
  "orderId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "provider": "WOMPI",
  "amount": 240000,
  "customerEmail": "cliente@email.com",
  "customerName": "Juan Pérez",
  "customerPhone": "3001234567",
  "customerDocument": "1234567890",
  "customerDocumentType": "CC",
  "description": "Pedido AST-240115-ABC1",
  "redirectUrl": "https://tienda.com/confirmacion"
}
```

**Respuesta:**
```json
{
  "_id": "64a1b2c3d4e5f6g7h8i9j0k2",
  "orderId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "provider": "WOMPI",
  "providerTransactionId": "12345-67890-abcdef",
  "reference": "AST-240115-ABC1",
  "amount": 240000,
  "currency": "COP",
  "status": "PENDING",
  "paymentUrl": "https://checkout.wompi.co/l/12345-67890-abcdef",
  "customerEmail": "cliente@email.com",
  "customerName": "Juan Pérez",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

El frontend debe redirigir al usuario a `paymentUrl` para completar el pago.

### Webhook de Wompi

Wompi enviará notificaciones a:
```
POST /api/payments/webhook/wompi
```

El webhook procesa:
1. Valida firma de integridad
2. Actualiza estado de la transacción
3. Si es `APPROVED`, actualiza la orden

```typescript
// Payload del webhook
{
  "event": "transaction.updated",
  "data": {
    "transaction": {
      "id": "12345-67890-abcdef",
      "reference": "AST-240115-ABC1",
      "status": "APPROVED",
      "amount_in_cents": 24000000,
      ...
    }
  },
  "timestamp": 1705312200,
  "signature": {
    "properties": ["transaction.id", "transaction.status"],
    "checksum": "abc123..."
  }
}
```

### Verificación Manual

Si el webhook falla, se puede verificar manualmente:

```bash
POST /api/payments/64a1b2c3d4e5f6g7h8i9j0k2/verify
```

Consulta el estado directamente en Wompi y actualiza la transacción.

## Contra Entrega (COD)

### Crear Pago COD

```bash
POST /api/payments
Content-Type: application/json

{
  "orderId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "provider": "CASH_ON_DELIVERY",
  "amount": 240000,
  "customerEmail": "cliente@email.com",
  "customerName": "Juan Pérez"
}
```

La transacción se crea en estado `PENDING`.

### Confirmar Pago COD

Cuando el repartidor entrega y recibe el dinero:

```bash
POST /api/payments/64a1b2c3d4e5f6g7h8i9j0k2/confirm-cod
Content-Type: application/json

{
  "collectedBy": "Repartidor Juan",
  "notes": "Pago en efectivo, cliente satisfecho"
}
```

## Link de Pago Wompi

Para una integración más sencilla, se puede crear un link de pago:

```typescript
// En wompi.provider.ts
async createPaymentLink(data: CreatePaymentData): Promise<PaymentResult>
```

El link:
- Expira en 24 horas
- Es de un solo uso
- No requiere tokenización de tarjetas
- Soporta múltiples métodos (tarjeta, PSE, Nequi, etc.)

## Interface de Proveedor

Todos los proveedores implementan esta interface:

```typescript
interface PaymentProvider {
  readonly providerName: string;
  readonly providerCode: string;

  createPayment(data: CreatePaymentData): Promise<PaymentResult>;
  verifyPayment(providerTransactionId: string): Promise<PaymentResult>;
  processWebhook(payload: WebhookPayload): Promise<WebhookResult>;
  refund(data: RefundData): Promise<RefundResult>;
  isAvailable(): Promise<boolean>;
}
```

Para agregar un nuevo proveedor (ej. ePayco):
1. Crear `src/payments/providers/epayco.provider.ts`
2. Implementar `PaymentProvider`
3. Registrar en `PaymentsModule`
4. Agregar al enum `PaymentProvider`

## Seguridad

### Firma de Integridad (Wompi)

Todas las transacciones incluyen una firma SHA-256:
```
signature = SHA256(reference + amount_in_cents + currency + integrity_key)
```

### Validación de Webhook

```typescript
validateWebhookSignature(payload: any, signature: string): boolean
```

Valida que el webhook viene de Wompi verificando el checksum.

## Flujo Completo

```
1. Frontend crea orden con paymentMethod: 'WOMPI'
2. Backend crea orden y transacción
3. Backend retorna paymentUrl
4. Frontend redirige a Wompi
5. Usuario paga en Wompi
6. Wompi envía webhook
7. Backend actualiza transacción
8. Backend confirma pago de orden
9. Se crea venta y descuenta stock
10. Usuario recibe confirmación
```

## Índices de Base de Datos

```typescript
TransactionSchema.index({ orderId: 1 });
TransactionSchema.index({ reference: 1 }, { unique: true });
TransactionSchema.index({ providerTransactionId: 1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ createdAt: -1 });
```
