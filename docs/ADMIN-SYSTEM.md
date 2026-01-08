# Sistema de Administración - Ventas y Créditos

Documentación completa del sistema de administración para gestión de ventas en tienda, ventas a crédito, clientes y cobranza.

## Índice

1. [Módulo de Clientes](#módulo-de-clientes)
2. [Módulo de Ventas](#módulo-de-ventas)
3. [Módulo de Cobros](#módulo-de-cobros)
4. [Módulo de Devoluciones](#módulo-de-devoluciones)
5. [Dashboard y Estadísticas](#dashboard-y-estadísticas)
6. [Sistema de Mora](#sistema-de-mora)
7. [Flujos de Trabajo](#flujos-de-trabajo)

---

## Módulo de Clientes

### Schema del Cliente

```typescript
interface Cliente {
  _id: ObjectId;

  // Información básica
  nombre: string;              // Nombre completo
  telefono: string;            // Teléfono de contacto (único)
  direccion: string;           // Dirección física

  // Sistema de crédito
  limiteCredito: number;       // Límite máximo de crédito (default: 500000)
  deudaActual: number;         // Deuda actual acumulada (default: 0)
  creditoDisponible: number;   // Virtual: limiteCredito - deudaActual

  // Bloqueo por mora
  bloqueadoPorMora: boolean;   // Si está bloqueado (default: false)
  fechaBloqueo?: Date;         // Cuándo fue bloqueado
  motivoBloqueo?: string;      // Razón del bloqueo

  // Score crediticio
  score: number;               // 0-100, basado en historial de pagos

  // Notas e interacciones
  notas: NotaCliente[];        // Historial de notas

  // Auditoría
  activo: boolean;             // Soft delete flag
  createdAt: Date;
  updatedAt: Date;
}
```

### Sistema de Notas

```typescript
enum TipoNotaCliente {
  LLAMADA = 'LLAMADA',       // Llamada telefónica
  VISITA = 'VISITA',         // Visita presencial
  ACUERDO = 'ACUERDO',       // Acuerdo de pago
  COBRANZA = 'COBRANZA',     // Gestión de cobro
  OTRO = 'OTRO',             // Otro tipo
}

interface NotaCliente {
  tipo: TipoNotaCliente;
  contenido: string;          // Texto de la nota
  fecha: Date;                // Fecha de creación
  creadaPor?: string;         // ID del usuario que creó la nota
}
```

### Endpoints de Clientes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/clientes` | Crear cliente |
| GET | `/api/clientes` | Listar todos los clientes |
| GET | `/api/clientes/buscar` | Búsqueda con filtros y paginación |
| GET | `/api/clientes/estadisticas` | Estadísticas de clientes |
| GET | `/api/clientes/score?min=X&max=Y` | Filtrar por rango de score |
| GET | `/api/clientes/:id` | Obtener cliente por ID |
| GET | `/api/clientes/:id/credito?monto=X` | Verificar crédito disponible |
| PATCH | `/api/clientes/:id` | Actualizar cliente |
| DELETE | `/api/clientes/:id` | Eliminar cliente (soft delete) |
| POST | `/api/clientes/:id/bloquear` | Bloquear por mora |
| POST | `/api/clientes/:id/desbloquear` | Desbloquear cliente |
| GET | `/api/clientes/:id/notas` | Obtener notas del cliente |
| POST | `/api/clientes/:id/notas` | Agregar nota al cliente |

### Búsqueda Avanzada

```typescript
GET /api/clientes/buscar?nombre=Juan&scoreMin=50&page=1&limit=20

// Query params disponibles:
interface ClienteFilters {
  nombre?: string;           // Búsqueda parcial por nombre
  telefono?: string;         // Búsqueda parcial por teléfono
  scoreMin?: number;         // Score mínimo
  scoreMax?: number;         // Score máximo
  deudaMin?: number;         // Deuda mínima
  deudaMax?: number;         // Deuda máxima
  bloqueadoPorMora?: boolean;// Filtrar bloqueados
  page?: number;             // Página (default: 1)
  limit?: number;            // Items por página (default: 20)
}

// Respuesta:
{
  "data": [...],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

### Verificación de Crédito

```typescript
GET /api/clientes/:id/credito?monto=200000

// Respuesta exitosa:
{
  "aprobado": true,
  "limiteCredito": 500000,
  "deudaActual": 150000,
  "creditoDisponible": 350000,
  "montoSolicitado": 200000,
  "creditoRestante": 150000
}

// Respuesta rechazada:
{
  "aprobado": false,
  "limiteCredito": 500000,
  "deudaActual": 400000,
  "creditoDisponible": 100000,
  "montoSolicitado": 200000,
  "mensaje": "Crédito insuficiente. Disponible: $100,000, Solicitado: $200,000"
}
```

### Gestión de Notas

```typescript
// Agregar nota
POST /api/clientes/:id/notas
{
  "tipo": "LLAMADA",
  "contenido": "Se acordó pago para el viernes 15"
}

// Listar notas (más recientes primero)
GET /api/clientes/:id/notas

// Respuesta:
{
  "notas": [
    {
      "tipo": "LLAMADA",
      "contenido": "Se acordó pago para el viernes 15",
      "fecha": "2024-01-10T15:30:00Z",
      "creadaPor": "admin_user_id"
    }
  ],
  "total": 5
}
```

---

## Módulo de Ventas

### Schema de Venta

```typescript
interface Venta {
  _id: ObjectId;

  // Referencias
  clienteId: ObjectId;
  nombreCliente: string;       // Denormalizado para consultas

  // Tipo y canal
  tipoVenta: TipoVenta;        // CREDITO | CONTADO
  canal: CanalVenta;           // TIENDA | ECOMMERCE
  estado: EstadoVenta;

  // Productos
  productos: ProductoVenta[];

  // Totales
  total: number;               // Monto total de venta
  costoTotal: number;          // Costo total de productos
  margenBruto: number;         // total - costoTotal

  // Cuotas (para ventas a crédito)
  numeroCuotas: number;
  cuotas: Cuota[];

  // Descuento aplicado
  descuento?: DescuentoVenta;

  // Sistema de mora
  tasaInteresMora: number;     // Tasa diaria de interés (default: 0.1%)
  totalMora: number;           // Suma de mora acumulada

  // Cancelación
  canceladaPor?: string;
  motivoCancelacion?: string;
  fechaCancelacion?: Date;

  // Auditoría
  creadaPor?: string;          // Usuario que creó la venta
  createdAt: Date;
  updatedAt: Date;
}
```

### Estados de Venta

```typescript
enum EstadoVenta {
  ACTIVA = 'ACTIVA',                         // Activa, con pagos pendientes
  PARCIALMENTE_PAGADA = 'PARCIALMENTE_PAGADA', // Al menos una cuota parcialmente pagada
  COMPLETADA = 'COMPLETADA',                 // Todas las cuotas pagadas
  VENCIDA = 'VENCIDA',                       // Con cuotas vencidas
  EN_MORA = 'EN_MORA',                       // En mora con intereses
  CANCELADA = 'CANCELADA',                   // Cancelada
}

enum TipoVenta {
  CREDITO = 'CREDITO',   // Venta a crédito con cuotas
  CONTADO = 'CONTADO',   // Pago de contado
}

enum CanalVenta {
  TIENDA = 'TIENDA',       // Venta en tienda física
  ECOMMERCE = 'ECOMMERCE', // Venta online
}
```

### Sistema de Cuotas

```typescript
interface Cuota {
  numero: number;              // Número de cuota (1, 2, 3...)
  monto: number;               // Monto original de la cuota
  fechaVencimiento: Date;      // Fecha de vencimiento
  montoPagado: number;         // Monto pagado hasta ahora
  saldoPendiente: number;      // monto - montoPagado
  pagada: boolean;             // Si está completamente pagada
  fechaPago?: Date;            // Fecha del último pago

  // Sistema de mora
  diasMora: number;            // Días de mora acumulados
  interesMora: number;         // Tasa de interés aplicada
  montoMora: number;           // Monto de mora calculado
  montoTotalConMora: number;   // saldoPendiente + montoMora

  // Historial de pagos
  historialPagos: RegistroPago[];
}

interface RegistroPago {
  monto: number;               // Monto del abono
  fecha: Date;                 // Fecha del pago
  metodoPago: MetodoPago;      // Método utilizado
  referenciaPago?: string;     // Número de transferencia, voucher, etc.
  registradoPor?: string;      // Usuario que registró el pago
  notas?: string;              // Notas adicionales
}

enum MetodoPago {
  EFECTIVO = 'EFECTIVO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  TARJETA = 'TARJETA',
  NEQUI = 'NEQUI',
  DAVIPLATA = 'DAVIPLATA',
  OTRO = 'OTRO',
}
```

### Endpoints de Ventas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/ventas` | Crear venta (valida crédito y márgenes) |
| GET | `/api/ventas` | Listar todas las ventas |
| GET | `/api/ventas/buscar` | Búsqueda con filtros y paginación |
| GET | `/api/ventas/dashboard` | Dashboard completo de estadísticas |
| GET | `/api/ventas/estadisticas` | Estadísticas básicas |
| GET | `/api/ventas/activas` | Ventas activas |
| GET | `/api/ventas/completadas` | Ventas completadas |
| GET | `/api/ventas/cliente/:clienteId` | Ventas de un cliente |
| GET | `/api/ventas/:id` | Obtener venta por ID |
| PATCH | `/api/ventas/:id/abonar-cuota` | Abonar a una cuota |
| POST | `/api/ventas/:id/cancelar` | Cancelar venta |
| POST | `/api/ventas/verificar-vencimientos` | Verificar y actualizar vencimientos |
| POST | `/api/ventas/calcular-moras` | Calcular intereses de mora |

### Crear Venta

```typescript
POST /api/ventas
{
  "clienteId": "cliente_object_id",
  "productos": [
    {
      "productoId": "producto_object_id",
      "cantidad": 2,
      "precioVentaCustom": 120000  // Opcional: precio personalizado
    }
  ],
  "tipoVenta": "CREDITO",
  "numeroCuotas": 4,
  "fechaPrimerPago": "2024-02-01",
  "pagarInmediatamente": false,

  // Opcional: descuento
  "descuento": {
    "tipo": "PORCENTAJE",  // o "MONTO_FIJO"
    "valor": 10,
    "motivo": "Cliente frecuente"
  },

  // Opcional: configuración de mora
  "tasaInteresMora": 0.1,  // 0.1% diario

  // Opcional: overrides de validación (solo admin)
  "omitirValidacionCredito": false,
  "omitirValidacionMargen": false
}

// Respuesta:
{
  "_id": "venta_id",
  "nombreCliente": "Juan Pérez",
  "total": 216000,           // Con descuento aplicado
  "costoTotal": 180000,
  "margenBruto": 36000,
  "estado": "ACTIVA",
  "cuotas": [
    {
      "numero": 1,
      "monto": 54000,
      "fechaVencimiento": "2024-02-01",
      "saldoPendiente": 54000,
      "diasMora": 0,
      "montoMora": 0,
      "montoTotalConMora": 54000
    }
    // ... más cuotas
  ]
}
```

### Validaciones al Crear Venta

1. **Validación de Crédito**
   - Verifica que el cliente no esté bloqueado por mora
   - Verifica que el monto no exceda el crédito disponible
   - Se puede omitir con `omitirValidacionCredito: true`

2. **Validación de Márgenes**
   - Verifica que el precio de venta >= costo del producto
   - Advierte si el margen es menor al 10%
   - Se puede omitir con `omitirValidacionMargen: true`

3. **Validación de Stock**
   - Verifica stock disponible para cada producto
   - Descuenta stock automáticamente al crear la venta

### Abonar a Cuota

```typescript
PATCH /api/ventas/:id/abonar-cuota
{
  "numeroCuota": 1,
  "montoAbono": 30000,
  "fechaPago": "2024-02-05",
  "metodoPago": "TRANSFERENCIA",
  "referenciaPago": "TRF-12345678",
  "notas": "Pago parcial acordado",
  "incluirMora": true   // Si debe incluir mora en el cálculo
}

// Respuesta:
{
  "venta": { ... },
  "cuotaAfectada": {
    "numero": 1,
    "montoOriginal": 54000,
    "montoPagadoAntes": 0,
    "nuevoAbono": 30000,
    "saldoPendiente": 24000,
    "pagada": false
  },
  "mensaje": "Abono registrado exitosamente"
}
```

### Cancelar Venta

```typescript
POST /api/ventas/:id/cancelar
{
  "motivo": "Cliente desistió de la compra",
  "devolverStock": true
}

// Respuesta:
{
  "mensaje": "Venta cancelada exitosamente",
  "venta": {
    "estado": "CANCELADA",
    "motivoCancelacion": "Cliente desistió de la compra",
    "fechaCancelacion": "2024-01-15T10:00:00Z"
  },
  "stockDevuelto": true
}
```

### Búsqueda Avanzada

```typescript
GET /api/ventas/buscar?estado=ACTIVA&tipoVenta=CREDITO&page=1&limit=20

// Query params:
{
  estado?: EstadoVenta;
  canal?: CanalVenta;
  tipoVenta?: TipoVenta;
  clienteId?: string;
  desde?: Date;           // Fecha de creación desde
  hasta?: Date;           // Fecha de creación hasta
  page?: number;
  limit?: number;
}

// Respuesta:
{
  "data": [...],
  "total": 45,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

## Módulo de Cobros

Vista consolidada de cuotas pendientes y vencidas.

### Endpoints de Cobros

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/cobros` | Todos los cobros (cuotas) |
| GET | `/api/cobros/pendientes` | Cuotas pendientes |
| GET | `/api/cobros/pagados` | Cuotas pagadas |
| GET | `/api/cobros/proxima-quincena` | Vencen en próximos 15 días |
| GET | `/api/cobros/vencidos` | Cuotas vencidas |
| GET | `/api/cobros/totales` | Resumen de totales |
| GET | `/api/cobros/cliente/:clienteId` | Cobros de un cliente |

### Estructura de Respuesta

```typescript
GET /api/cobros/pendientes

// Respuesta:
[
  {
    "ventaId": "venta_id",
    "clienteId": "cliente_id",
    "nombreCliente": "Juan Pérez",
    "telefonoCliente": "3001234567",
    "cuota": {
      "numero": 2,
      "monto": 54000,
      "fechaVencimiento": "2024-02-15",
      "saldoPendiente": 24000,
      "diasMora": 5,
      "montoMora": 120,
      "montoTotalConMora": 24120
    }
  }
]
```

### Totales de Cobranza

```typescript
GET /api/cobros/totales

// Respuesta:
{
  "totalPendiente": 1500000,      // Total por cobrar
  "totalVencido": 350000,         // Total vencido
  "totalMora": 15000,             // Mora acumulada
  "cuotasPendientes": 45,         // Número de cuotas pendientes
  "cuotasVencidas": 8,            // Número de cuotas vencidas
  "clientesConDeuda": 25          // Clientes con deuda activa
}
```

---

## Módulo de Devoluciones

Sistema para gestionar devoluciones de productos de ventas.

### Schema de Devolución

```typescript
interface Devolucion {
  _id: ObjectId;

  // Referencias
  ventaId: ObjectId;
  numeroVenta: string;
  clienteId: ObjectId;
  nombreCliente: string;

  // Productos devueltos
  productos: ProductoDevolucion[];

  // Estado y motivo
  motivo: MotivoDevolucion;
  descripcionMotivo?: string;
  estado: EstadoDevolucion;

  // Montos
  montoTotal: number;
  montoReembolsado: number;

  // Tipo de reembolso
  tipoReembolso?: TipoReembolso;

  // Opciones
  devolverStock: boolean;
  stockDevuelto: boolean;
  afectaDeuda: boolean;
  deudaAjustada: boolean;

  // Auditoría
  solicitadaPor?: string;
  fechaSolicitud: Date;
  aprobadaPor?: string;
  fechaAprobacion?: Date;
  rechazadaPor?: string;
  fechaRechazo?: Date;
  motivoRechazo?: string;
  procesadaPor?: string;
  fechaProcesamiento?: Date;

  // Historial de cambios de estado
  historial: HistorialDevolucion[];
}
```

### Enums

```typescript
enum EstadoDevolucion {
  PENDIENTE = 'PENDIENTE',     // Esperando aprobación
  APROBADA = 'APROBADA',       // Aprobada, pendiente de procesar
  RECHAZADA = 'RECHAZADA',     // Rechazada
  PROCESADA = 'PROCESADA',     // Completada
  CANCELADA = 'CANCELADA',     // Cancelada
}

enum MotivoDevolucion {
  PRODUCTO_DEFECTUOSO = 'PRODUCTO_DEFECTUOSO',
  PRODUCTO_INCORRECTO = 'PRODUCTO_INCORRECTO',
  NO_SATISFECHO = 'NO_SATISFECHO',
  CAMBIO_OPINION = 'CAMBIO_OPINION',
  ERROR_PEDIDO = 'ERROR_PEDIDO',
  DUPLICADO = 'DUPLICADO',
  OTRO = 'OTRO',
}

enum TipoReembolso {
  CREDITO_TIENDA = 'CREDITO_TIENDA',   // Se acredita al límite de crédito
  EFECTIVO = 'EFECTIVO',               // Devolución en efectivo
  DESCUENTO_DEUDA = 'DESCUENTO_DEUDA', // Se descuenta de deuda pendiente
  SIN_REEMBOLSO = 'SIN_REEMBOLSO',     // Solo devolución de producto
}
```

### Endpoints de Devoluciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/devoluciones` | Crear solicitud de devolución |
| GET | `/api/devoluciones` | Listar todas las devoluciones |
| GET | `/api/devoluciones/buscar` | Búsqueda con filtros y paginación |
| GET | `/api/devoluciones/pendientes` | Devoluciones pendientes de aprobación |
| GET | `/api/devoluciones/aprobadas` | Devoluciones aprobadas (pendientes de procesar) |
| GET | `/api/devoluciones/estadisticas` | Estadísticas de devoluciones |
| GET | `/api/devoluciones/venta/:ventaId` | Devoluciones de una venta |
| GET | `/api/devoluciones/cliente/:clienteId` | Devoluciones de un cliente |
| GET | `/api/devoluciones/:id` | Obtener devolución por ID |
| POST | `/api/devoluciones/:id/aprobar` | Aprobar devolución |
| POST | `/api/devoluciones/:id/rechazar` | Rechazar devolución |
| POST | `/api/devoluciones/:id/procesar` | Procesar devolución |
| POST | `/api/devoluciones/:id/cancelar` | Cancelar devolución |

### Crear Devolución

```typescript
POST /api/devoluciones
{
  "ventaId": "venta_object_id",
  "productos": [
    {
      "productoId": "producto_object_id",
      "cantidad": 1,
      "motivo": "Llegó dañado"
    }
  ],
  "motivo": "PRODUCTO_DEFECTUOSO",
  "descripcionMotivo": "El perfume llegó con la tapa rota",
  "tipoReembolso": "DESCUENTO_DEUDA",
  "devolverStock": true,
  "afectaDeuda": true,
  "notas": "Cliente muy molesto, ofrecer descuento en próxima compra"
}

// Respuesta:
{
  "_id": "devolucion_id",
  "ventaId": "...",
  "nombreCliente": "Juan Pérez",
  "productos": [...],
  "montoTotal": 120000,
  "estado": "PENDIENTE",
  "fechaSolicitud": "2024-01-15T10:00:00Z"
}
```

### Aprobar Devolución

```typescript
POST /api/devoluciones/:id/aprobar
{
  "tipoReembolso": "DESCUENTO_DEUDA",
  "montoReembolso": 120000,    // Opcional, por defecto es montoTotal
  "devolverStock": true,
  "afectaDeuda": true,
  "comentario": "Aprobado por política de garantía"
}

// Respuesta:
{
  "_id": "...",
  "estado": "APROBADA",
  "tipoReembolso": "DESCUENTO_DEUDA",
  "montoReembolsado": 120000,
  "aprobadaPor": "admin_user_id",
  "fechaAprobacion": "2024-01-15T11:00:00Z"
}
```

### Rechazar Devolución

```typescript
POST /api/devoluciones/:id/rechazar
{
  "motivoRechazo": "Producto usado, no aplica garantía"
}

// Respuesta:
{
  "_id": "...",
  "estado": "RECHAZADA",
  "motivoRechazo": "Producto usado, no aplica garantía",
  "rechazadaPor": "admin_user_id",
  "fechaRechazo": "2024-01-15T11:00:00Z"
}
```

### Procesar Devolución

```typescript
POST /api/devoluciones/:id/procesar

// Este endpoint:
// 1. Devuelve el stock de los productos (si devolverStock=true)
// 2. Ajusta la deuda del cliente (si afectaDeuda=true y tipoReembolso lo requiere)
// 3. Cambia estado a PROCESADA

// Respuesta:
{
  "_id": "...",
  "estado": "PROCESADA",
  "stockDevuelto": true,
  "deudaAjustada": true,
  "procesadaPor": "admin_user_id",
  "fechaProcesamiento": "2024-01-15T12:00:00Z"
}
```

### Flujo de Devolución

```
1. Cliente solicita devolución
2. Admin crea solicitud
   POST /api/devoluciones
   - Valida productos y cantidades
   - Estado: PENDIENTE
3. Admin revisa y decide:
   - POST /:id/aprobar → Estado: APROBADA
   - POST /:id/rechazar → Estado: RECHAZADA
4. Si aprobada, admin procesa:
   POST /:id/procesar
   - Devuelve stock
   - Ajusta deuda del cliente
   - Estado: PROCESADA
```

### Estadísticas de Devoluciones

```typescript
GET /api/devoluciones/estadisticas

// Respuesta:
{
  "total": 50,
  "porEstado": {
    "pendientes": 5,
    "aprobadas": 3,
    "procesadas": 40,
    "rechazadas": 2
  },
  "montos": {
    "procesado": 2500000,
    "pendienteAprobado": 350000
  }
}
```

---

## Dashboard y Estadísticas

### Dashboard Completo

```typescript
GET /api/ventas/dashboard?desde=2024-01-01&hasta=2024-01-31

// Respuesta:
{
  "periodo": {
    "desde": "2024-01-01",
    "hasta": "2024-01-31"
  },
  "ventas": {
    "total": 15000000,
    "porCanal": {
      "TIENDA": 10000000,
      "ECOMMERCE": 5000000
    },
    "porTipo": {
      "CREDITO": 12000000,
      "CONTADO": 3000000
    },
    "ventasActivas": 35
  },
  "cobranza": {
    "montoPendiente": 8500000,
    "montoVencido": 1200000,
    "moraAcumulada": 45000,
    "cuotasPendientes": 120,
    "cuotasVencidas": 18
  },
  "estados": {
    "activas": 35,
    "parcialmentePagadas": 12,
    "completadas": 45,
    "vencidas": 8,
    "enMora": 5,
    "canceladas": 3
  },
  "margen": {
    "costoTotal": 10000000,
    "ventaTotal": 15000000,
    "margenBruto": 5000000,
    "porcentajeMargen": 33.33
  }
}
```

### Estadísticas de Clientes

```typescript
GET /api/clientes/estadisticas

// Respuesta:
{
  "total": 150,
  "activos": 145,
  "bloqueados": 5,
  "conDeuda": 45,
  "deudaTotal": 12500000,
  "promedioScore": 72,
  "distribucionScore": {
    "excelente": 45,    // 80-100
    "bueno": 60,        // 60-79
    "regular": 30,      // 40-59
    "malo": 15          // 0-39
  }
}
```

---

## Sistema de Mora

### Cálculo Automático de Mora

```typescript
POST /api/ventas/calcular-moras

// Este endpoint recalcula la mora en todas las cuotas vencidas

// Fórmula:
// diasMora = días desde fechaVencimiento hasta hoy
// montoMora = saldoPendiente × tasaInteresMora × diasMora
// montoTotalConMora = saldoPendiente + montoMora

// Ejemplo:
// - Cuota: $54,000
// - Saldo pendiente: $24,000
// - Tasa mora: 0.1% diario
// - Días vencida: 15 días
// - Mora: $24,000 × 0.001 × 15 = $360
// - Total a pagar: $24,360
```

### Verificación de Vencimientos

```typescript
POST /api/ventas/verificar-vencimientos

// Este endpoint:
// 1. Busca ventas con cuotas vencidas
// 2. Actualiza estado a VENCIDA o EN_MORA según corresponda
// 3. Retorna resumen de ventas actualizadas

// Respuesta:
{
  "ventasActualizadas": 8,
  "nuevasVencidas": 3,
  "nuevasEnMora": 2
}
```

### Bloqueo Automático por Mora

Cuando una venta entra en estado `EN_MORA`, se puede bloquear automáticamente al cliente:

```typescript
// En el servicio de clientes:
await this.clientesService.bloquearPorMora(
  clienteId,
  `Mora en venta ${ventaId} - ${diasMora} días de atraso`
);
```

---

## Flujos de Trabajo

### 1. Flujo de Venta a Crédito

```
1. Cliente solicita productos
2. Admin verifica crédito disponible
   GET /api/clientes/:id/credito?monto=X
3. Si aprobado, crear venta
   POST /api/ventas
   - Se descuenta stock
   - Se incrementa deuda del cliente
   - Se generan cuotas
4. Cliente recibe productos
5. En cada fecha de pago:
   - Verificar si cuota está pagada
   - Si hay abono: PATCH /api/ventas/:id/abonar-cuota
   - Se actualiza deuda del cliente
6. Al completar todas las cuotas:
   - Estado cambia a COMPLETADA
   - Score del cliente mejora
```

### 2. Flujo de Cobranza

```
1. Diariamente: verificar vencimientos
   POST /api/ventas/verificar-vencimientos
2. Obtener cuotas próximas a vencer
   GET /api/cobros/proxima-quincena
3. Contactar clientes (agregar notas)
   POST /api/clientes/:id/notas
4. Si hay mora, calcular intereses
   POST /api/ventas/calcular-moras
5. Registrar pagos recibidos
   PATCH /api/ventas/:id/abonar-cuota
6. Si cliente no paga, bloquear
   POST /api/clientes/:id/bloquear
```

### 3. Flujo de Cancelación

```
1. Cliente solicita cancelación
2. Admin evalúa si procede
3. Cancelar venta
   POST /api/ventas/:id/cancelar
   - Se devuelve stock (opcional)
   - Se actualiza deuda del cliente
4. Registrar nota en cliente
   POST /api/clientes/:id/notas
```

---

## Ejemplos de Código

### Crear Venta con Descuento

```bash
curl -X POST http://localhost:3000/api/ventas \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clienteId": "65a1b2c3d4e5f6g7h8i9j0k1",
    "productos": [
      { "productoId": "65a1b2c3d4e5f6g7h8i9j0k2", "cantidad": 2 }
    ],
    "tipoVenta": "CREDITO",
    "numeroCuotas": 4,
    "fechaPrimerPago": "2024-02-01",
    "descuento": {
      "tipo": "PORCENTAJE",
      "valor": 10,
      "motivo": "Promoción de enero"
    }
  }'
```

### Registrar Pago Parcial

```bash
curl -X PATCH http://localhost:3000/api/ventas/65a.../abonar-cuota \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "numeroCuota": 1,
    "montoAbono": 30000,
    "fechaPago": "2024-02-05",
    "metodoPago": "NEQUI",
    "referenciaPago": "NEQUI-987654321",
    "incluirMora": true
  }'
```

### Consultar Dashboard

```bash
curl -X GET "http://localhost:3000/api/ventas/dashboard?desde=2024-01-01&hasta=2024-01-31" \
  -H "Authorization: Bearer <token>"
```

---

## Consideraciones de Seguridad

1. **Todos los endpoints requieren autenticación** (JWT)
2. **Todos los endpoints requieren rol ADMIN**
3. **Las validaciones de crédito/margen solo pueden omitirse por ADMIN**
4. **Historial de pagos es inmutable** (solo se agregan registros)
5. **Cancelaciones registran quién y cuándo**

## Tareas de Mantenimiento

| Tarea | Frecuencia | Endpoint |
|-------|------------|----------|
| Verificar vencimientos | Diario | POST /api/ventas/verificar-vencimientos |
| Calcular moras | Diario | POST /api/ventas/calcular-moras |
| Revisar clientes bloqueados | Semanal | GET /api/clientes/buscar?bloqueadoPorMora=true |
| Actualizar scores | Mensual | (Automático al registrar pagos) |
