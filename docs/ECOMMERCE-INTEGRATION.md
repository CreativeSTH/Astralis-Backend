# Integración E-commerce con Sistema de Ventas

Documentación de la integración entre el flujo de órdenes del e-commerce y el sistema de ventas/inventario existente.

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────┐
│                          INVENTARIO                                 │
│                       (ProductosModule)                             │
│                    Fuente única de verdad                           │
└─────────────────────────────────────────────────────────────────────┘
                                  ▲
                                  │
                    Stock se descuenta aquí
                                  │
┌─────────────────────────────────┴───────────────────────────────────┐
│                           VENTAS                                    │
│                  (Registro financiero unificado)                    │
│                                                                     │
│   Canal: TIENDA          │           Canal: ECOMMERCE               │
│   - clienteId            │           - orderId                      │
│   - Cuotas (crédito)     │           - usuarioId                    │
│   - Score cliente        │           - Pago único (contado)         │
└─────────────────────────────────────────────────────────────────────┘
          ▲                                      ▲
          │                                      │
┌─────────┴─────────┐              ┌─────────────┴──────────────┐
│   VENTA DIRECTA   │              │          ORDERS            │
│  (Tienda física)  │              │       (E-commerce)         │
│                   │              │                            │
│  VentasController │              │  Auth → Cart → Checkout    │
└───────────────────┘              │  → Address → Shipping      │
                                   │  → Payment → Order         │
                                   └────────────────────────────┘
```

## Flujo Completo E-commerce

```
1. AUTENTICACIÓN
   └── Usuario ingresa email
   └── Recibe OTP por email
   └── Verifica código
   └── Obtiene JWT

2. NAVEGACIÓN
   └── Catalogo de productos (CatalogModule)
   └── Filtros: marca, precio, búsqueda
   └── Detalle de producto
   └── Verificar stock disponible

3. CARRITO
   └── Agregar productos (CartModule)
   └── Actualizar cantidades
   └── Validar stock
   └── Calcular subtotal

4. CHECKOUT
   └── Seleccionar dirección (AddressesModule)
       └── Usar guardada o crear nueva
       └── Filtrar por ciudad
   └── Seleccionar departamento → ciudad
   └── Calcular envío (ShippingModule)
       └── Ver métodos disponibles
       └── Ver condiciones (envío gratis, etc.)
   └── Seleccionar método de pago

5. CREAR ORDEN
   └── POST /api/orders/with-payment
   └── Valida todo el carrito
   └── Crea orden en estado PENDING
   └── Crea transacción de pago
   └── Retorna paymentUrl

6. PAGO
   └── Usuario paga en Wompi (o COD)
   └── Webhook actualiza transacción
   └── Estado cambia a PAYMENT_PENDING → PAYMENT_CONFIRMED

7. CONFIRMACIÓN DE PAGO
   └── confirmPayment() se ejecuta
   └── Crea Venta en módulo Ventas
   └── Descuenta stock de productos
   └── Incrementa totalVendido

8. PREPARACIÓN Y ENVÍO
   └── Admin cambia estado a PROCESSING
   └── Prepara el pedido
   └── Actualiza tracking
   └── Estado cambia a SHIPPED

9. ENTREGA
   └── Cliente recibe pedido
   └── Estado cambia a DELIVERED
```

## Schema de Venta para E-commerce

```typescript
interface Venta {
  // Campos para tienda física
  clienteId?: Types.ObjectId;      // Opcional para e-commerce

  // Campos para e-commerce
  orderId?: Types.ObjectId;        // Vincula con Order
  usuarioId?: Types.ObjectId;      // Usuario e-commerce
  emailComprador?: string;
  telefonoComprador?: string;

  // Común
  nombreCliente: string;
  canal: 'TIENDA' | 'ECOMMERCE';
  productos: ProductoVenta[];
  totalVenta: number;
  tipoVenta: 'CREDITO' | 'CONTADO';

  // Para e-commerce siempre es:
  // - canal: 'ECOMMERCE'
  // - tipoVenta: 'CONTADO'
  // - estado: 'COMPLETADA'
  // - Una sola cuota pagada
}
```

## Método createFromOrder

```typescript
// En ventas.service.ts
async createFromOrder(orderData: OrderDataForVenta): Promise<VentaDocument> {
  const productosVenta: ProductoVentaDetalle[] = [];

  // 1. Procesar cada item y descontar stock
  for (const item of orderData.items) {
    await this.productosService.actualizarStock(item.productoId, item.cantidad);
    await this.productosService.incrementarVendido(item.productoId, item.cantidad);

    productosVenta.push({
      productoId: new Types.ObjectId(item.productoId),
      nombreProducto: item.nombre,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      subtotal: item.subtotal,
    });
  }

  // 2. Crear venta completada
  const venta = new this.ventaModel({
    orderId: new Types.ObjectId(orderData.orderId),
    usuarioId: orderData.userId ? new Types.ObjectId(orderData.userId) : undefined,
    emailComprador: orderData.customerEmail,
    telefonoComprador: orderData.customerPhone,
    nombreCliente: orderData.customerName,
    canal: CanalVenta.ECOMMERCE,
    productos: productosVenta,
    totalVenta: orderData.total,
    tipoVenta: TipoVenta.CONTADO,
    numeroCuotas: 1,
    montoCuota: orderData.total,
    cuotas: [{
      numeroCuota: 1,
      fechaVencimiento: new Date(),
      monto: orderData.total,
      montoPagado: orderData.total,
      saldoPendiente: 0,
      pagada: true,
      fechaPago: new Date(),
    }],
    totalPagado: orderData.total,
    totalPendiente: 0,
    cuotasPagadas: 1,
    estado: EstadoVenta.COMPLETADA,
  });

  return venta.save();
}
```

## Reportes Unificados

### Ventas Totales
```typescript
const todasLasVentas = await ventaModel.find({
  createdAt: { $gte: inicioMes }
});
```

### Ventas por Canal
```typescript
// Solo e-commerce
const ventasOnline = await ventaModel.find({ canal: 'ECOMMERCE' });

// Solo tienda física
const ventasTienda = await ventaModel.find({ canal: 'TIENDA' });
```

### Estadísticas
```typescript
const stats = await ventasService.getEstadisticas({
  canal: 'ECOMMERCE',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
});

// Retorna:
{
  totalVentas: 150,
  montoTotal: 45000000,
  ventasContado: 150,
  ventasCredito: 0,
  ventasEcommerce: 150,
  ventasTienda: 0,
}
```

## Control de Inventario

El stock se descuenta en **un solo lugar**: cuando se llama `createFromOrder()`.

### Para E-commerce
```
Order creada → Pago confirmado → createFromOrder() → Stock descontado
```

### Para Tienda Física
```
Venta creada directamente → Stock descontado en create()
```

### Evitar Sobreventas

1. El carrito valida stock antes de agregar
2. La orden valida stock al crear
3. El pago debe confirmarse antes de descontar
4. `createFromOrder` descuenta en una sola transacción

## Dependencias Circulares

```typescript
// orders.module.ts
@Module({
  imports: [
    forwardRef(() => PaymentsModule),
    forwardRef(() => VentasModule),
    AddressesModule,
    ShippingModule,
    GeographyModule,
  ],
})
export class OrdersModule {}
```

```typescript
// orders.service.ts
constructor(
  @Inject(forwardRef(() => VentasService))
  private ventasService: VentasService,
) {}
```

## Consultas Comunes

### Buscar venta de una orden
```typescript
const venta = await ventasService.findByOrderId(orderId);
```

### Historial de compras de usuario e-commerce
```typescript
const compras = await ventasService.findByUsuarioId(usuarioId);
```

### Órdenes del usuario
```typescript
const ordenes = await ordersService.findByUser(userId);
```

## Variables de Entorno

```env
# Base
MONGODB_URI=mongodb+srv://...
PORT=3000

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@astralis.com

# Wompi
WOMPI_PUBLIC_KEY=pub_test_xxx
WOMPI_PRIVATE_KEY=prv_test_xxx
WOMPI_EVENTS_KEY=events_xxx
WOMPI_INTEGRITY_KEY=integrity_xxx
```

## Resumen de Módulos

| Módulo | Responsabilidad |
|--------|-----------------|
| **Auth** | Autenticación OTP, JWT |
| **Catalog** | Productos públicos |
| **Cart** | Carrito persistente |
| **Addresses** | Direcciones de usuario |
| **Geography** | Departamentos, ciudades |
| **Shipping** | Cálculo de envío |
| **Payments** | Procesamiento de pagos |
| **Orders** | Gestión de órdenes |
| **Ventas** | Registro de ventas, control de stock |
| **Productos** | Inventario (stock, precios) |
