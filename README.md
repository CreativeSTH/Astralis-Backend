# Astralis Backend

Sistema de gestión de ventas de perfumes con soporte para ventas a crédito, tienda online y sistema de envíos dinámico.

## Requisitos

- Node.js 18+
- npm o yarn
- MongoDB Atlas

## Instalación
```bash
npm install
cp .env.example .env
# Editar .env con tus credenciales
```

## Ejecución
```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod
```

## API Endpoints

Base URL: `http://localhost:3000/api`

### Health - Status (`/api/health`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Health check completo (MongoDB) |
| GET | `/ping` | Health check simple |

### Auth - Autenticación (`/api/auth`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/request-otp` | Solicitar código OTP por email |
| POST | `/verify-otp` | Verificar OTP y obtener JWT |
| GET | `/profile` | Obtener perfil del usuario (auth) |
| PATCH | `/profile` | Actualizar perfil (auth) |

### Catalog - Catálogo Público (`/api/catalog`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/products` | Listar productos con paginación y filtros |
| GET | `/products/featured` | Productos destacados |
| GET | `/products/best-sellers` | Productos más vendidos |
| GET | `/products/:id` | Detalle de producto |
| GET | `/products/:id/stock` | Verificar stock disponible |
| GET | `/brands` | Listar marcas |

### Cart - Carrito (`/api/cart`) - Requiere Auth
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Obtener carrito del usuario |
| POST | `/items` | Agregar producto al carrito |
| PATCH | `/items/:productId` | Actualizar cantidad |
| DELETE | `/items/:productId` | Eliminar producto |
| DELETE | `/` | Vaciar carrito |
| POST | `/merge` | Fusionar carrito anónimo |
| GET | `/validate` | Validar stock del carrito |

### Addresses - Direcciones (`/api/addresses`) - Requiere Auth
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/` | Crear nueva dirección |
| GET | `/` | Listar direcciones del usuario |
| GET | `/?ciudadId=xxx` | Filtrar direcciones por ciudad |
| GET | `/default` | Obtener dirección predeterminada |
| GET | `/:id` | Obtener dirección específica |
| PATCH | `/:id` | Actualizar dirección |
| PATCH | `/:id/default` | Marcar como predeterminada |
| DELETE | `/:id` | Eliminar dirección |

### Geography - Geografía (`/api/geography`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/departamentos` | Listar departamentos |
| GET | `/departamentos/:id/ciudades` | Ciudades por departamento |
| POST | `/departamentos` | Crear departamento |
| GET | `/ciudades` | Listar todas las ciudades |
| GET | `/ciudades/:id` | Detalle de ciudad |
| GET | `/zonas-envio` | Listar zonas de envío |
| POST | `/zonas-envio` | Crear zona de envío |
| GET | `/zonas-envio/ciudad/:ciudadId` | Zonas que cubren una ciudad |
| GET | `/verificar-cobertura/:ciudadId` | Verificar cobertura de envío |
| POST | `/seed` | Poblar datos de Colombia |
| POST | `/seed?reset=true` | Reiniciar y poblar datos |

### Shipping - Envíos (`/api/shipping`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/transportadoras` | Listar transportadoras |
| POST | `/transportadoras` | Crear transportadora |
| GET | `/metodos` | Listar métodos de envío |
| POST | `/metodos` | Crear método de envío |
| GET | `/metodos/vigentes` | Métodos vigentes actualmente |
| GET | `/metodos/ciudad/:ciudadId` | Métodos disponibles para ciudad |
| **POST** | **`/calcular`** | **Calcular costo de envío** |
| GET | `/verificar-disponibilidad/:ciudadId` | Verificar si hay envío |

### Payments - Pagos (`/api/payments`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/` | Crear transacción de pago |
| GET | `/providers` | Listar proveedores disponibles |
| GET | `/:id` | Obtener transacción por ID |
| GET | `/reference/:ref` | Obtener transacción por referencia |
| GET | `/order/:orderId` | Transacciones de una orden |
| POST | `/:id/verify` | Verificar estado con proveedor |
| POST | `/webhook/:provider` | Webhook de proveedores |
| POST | `/:id/confirm-cod` | Confirmar pago contra entrega |

### Orders - Órdenes (`/api/orders`) - Requiere Auth
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/` | Crear orden |
| POST | `/with-payment` | Crear orden y procesar pago |
| GET | `/my-orders` | Mis órdenes |
| GET | `/:id` | Detalle de orden |
| GET | `/number/:orderNumber` | Buscar por número de orden |
| PATCH | `/:id/status` | Actualizar estado |
| POST | `/:id/confirm-payment` | Confirmar pago |
| PATCH | `/:id/tracking` | Actualizar tracking |
| POST | `/:id/cancel` | Cancelar orden |

### Coupons - Cupones (`/api/coupons`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/apply` | Aplicar cupón al carrito (auth) |
| POST | `/validate` | Validar cupón sin aplicarlo (auth) |
| POST | `/` | Crear cupón (admin) |
| GET | `/` | Listar cupones (admin) |
| GET | `/:id` | Obtener cupón (admin) |
| GET | `/:id/stats` | Estadísticas de uso (admin) |
| PATCH | `/:id` | Actualizar cupón (admin) |
| DELETE | `/:id` | Eliminar cupón (admin) |

### Wishlist - Lista de Deseos (`/api/wishlist`) - Requiere Auth
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Obtener wishlist |
| GET | `/count` | Cantidad de items |
| GET | `/check/:productoId` | Verificar si producto está |
| POST | `/` | Agregar producto |
| DELETE | `/:productoId` | Eliminar producto |
| DELETE | `/` | Vaciar wishlist |

### Reviews - Reseñas (`/api/reviews`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/product/:id` | Reseñas de un producto (público) |
| GET | `/product/:id/stats` | Estadísticas de reseñas (público) |
| GET | `/:id` | Obtener reseña (público) |
| POST | `/` | Crear reseña (auth) |
| GET | `/can-review/:productoId` | Verificar si puede reseñar (auth) |
| GET | `/user/me` | Mis reseñas (auth) |
| PATCH | `/:id` | Actualizar mi reseña (auth) |
| DELETE | `/:id` | Eliminar mi reseña (auth) |
| POST | `/:id/helpful` | Marcar como útil (auth) |
| GET | `/admin/pending` | Reseñas pendientes (admin) |
| PATCH | `/admin/:id` | Moderar reseña (admin) |

### Admin - Clientes (`/api/clientes`) - Requiere Auth + ADMIN
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/` | Crear cliente |
| GET | `/` | Listar clientes |
| GET | `/buscar` | Búsqueda avanzada con filtros y paginación |
| GET | `/estadisticas` | Estadísticas de clientes |
| GET | `/score?min=X&max=Y` | Filtrar por rango de score |
| GET | `/:id` | Obtener cliente |
| GET | `/:id/credito?monto=X` | Verificar crédito disponible |
| PATCH | `/:id` | Actualizar cliente |
| DELETE | `/:id` | Eliminar cliente (soft delete) |
| POST | `/:id/bloquear` | Bloquear cliente por mora |
| POST | `/:id/desbloquear` | Desbloquear cliente |
| GET | `/:id/notas` | Obtener notas del cliente |
| POST | `/:id/notas` | Agregar nota al cliente |

### Admin - Ventas (`/api/ventas`) - Requiere Auth + ADMIN
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/` | Crear venta (valida crédito y márgenes) |
| GET | `/` | Listar todas las ventas |
| GET | `/buscar` | Búsqueda con filtros y paginación |
| GET | `/dashboard` | Dashboard completo de estadísticas |
| GET | `/estadisticas` | Estadísticas básicas |
| GET | `/activas` | Ventas activas |
| GET | `/completadas` | Ventas completadas |
| GET | `/cliente/:clienteId` | Ventas de un cliente |
| GET | `/:id` | Obtener venta |
| PATCH | `/:id/abonar-cuota` | Abonar a cuota (con auditoría) |
| POST | `/:id/cancelar` | Cancelar venta |
| POST | `/verificar-vencimientos` | Verificar y actualizar vencimientos |
| POST | `/calcular-moras` | Calcular intereses de mora |

### Admin - Cobros (`/api/cobros`) - Requiere Auth + ADMIN
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Todos los cobros (cuotas) |
| GET | `/pendientes` | Cuotas pendientes |
| GET | `/pagados` | Cuotas pagadas |
| GET | `/proxima-quincena` | Vencen próxima quincena |
| GET | `/vencidos` | Cuotas vencidas |
| GET | `/totales` | Resumen de totales |
| GET | `/cliente/:clienteId` | Cobros de un cliente |

### Admin - Productos (`/api/productos`) - Requiere Auth + ADMIN
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/` | Crear producto |
| GET | `/` | Listar productos |
| GET | `/estadisticas` | Totales y conteos |
| GET | `/con-stock` | Productos con existencia |
| GET | `/sin-stock` | Productos sin stock |
| GET | `/mas-vendidos` | Top productos vendidos |
| GET | `/:id` | Obtener producto |
| PATCH | `/:id` | Actualizar producto |
| PATCH | `/:id/add-stock` | Agregar stock (precio promedio) |
| DELETE | `/:id` | Eliminar producto |

### Admin - Devoluciones (`/api/devoluciones`) - Requiere Auth + ADMIN
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/` | Crear solicitud de devolución |
| GET | `/` | Listar todas las devoluciones |
| GET | `/buscar` | Búsqueda con filtros y paginación |
| GET | `/pendientes` | Devoluciones pendientes de aprobación |
| GET | `/aprobadas` | Devoluciones aprobadas (pendientes de procesar) |
| GET | `/estadisticas` | Estadísticas de devoluciones |
| GET | `/venta/:ventaId` | Devoluciones de una venta |
| GET | `/cliente/:clienteId` | Devoluciones de un cliente |
| GET | `/:id` | Obtener devolución por ID |
| POST | `/:id/aprobar` | Aprobar devolución |
| POST | `/:id/rechazar` | Rechazar devolución |
| POST | `/:id/procesar` | Procesar (devolver stock, ajustar deuda) |
| POST | `/:id/cancelar` | Cancelar devolución |

### Admin - Marcas y Acordes (Requieren Auth + ADMIN)
- `/api/marcas` - CRUD de marcas
- `/api/acordes` - CRUD de acordes de fragancias

### Swagger Documentation
- URL: `http://localhost:3000/docs`
- Documentación interactiva de toda la API
- Autenticación JWT integrada para probar endpoints protegidos

## Características

### Autenticación (Auth)
- Login sin contraseña mediante OTP por email
- Códigos OTP de 6 dígitos con expiración de 10 minutos
- JWT para sesiones autenticadas
- Guards y decoradores para proteger rutas
- Roles de usuario (USER, ADMIN)

### Catálogo (Catalog)
- Productos visibles en tienda (`visibleInStore: true`)
- Productos destacados (`featured: true`)
- Paginación con límite configurable
- Filtros por marca, precio, búsqueda
- Ordenamiento por precio, nombre, popularidad

### Carrito (Cart)
- Carrito persistente por usuario
- Validación de stock en tiempo real
- Merge de carrito anónimo al hacer login
- Cálculo automático de totales

### Direcciones (Addresses)
- Múltiples direcciones por usuario
- Dirección predeterminada automática
- Vinculadas a ciudades del sistema geográfico
- Filtrado por ciudad para checkout
- Datos completos: nombre, teléfono, dirección, detalles, notas

### Pagos (Payments)
- **Proveedores integrados:**
  - `WOMPI` - Pagos online (tarjetas, PSE, Nequi)
  - `CASH_ON_DELIVERY` - Contra entrega
- Sistema de transacciones con historial de estados
- Webhooks para notificaciones de pago
- Links de pago para integración web
- Firma de integridad para seguridad
- Soporte futuro: ePayco, Addi, Sistecrédito

### Órdenes (Orders)
- Flujo completo de checkout
- Estados: PENDING → PAYMENT_PENDING → PAYMENT_CONFIRMED → PROCESSING → SHIPPED → DELIVERED
- Integración automática con Ventas al confirmar pago
- Descuento de inventario automático
- Tracking de envío con número de guía
- Historial de cambios de estado
- Vinculación con direcciones guardadas

### Geografía (Geography)
- 33 departamentos de Colombia
- 150+ ciudades principales
- Códigos DANE oficiales
- Zonas de envío configurables
- Cobertura nacional o por zona

### Envíos (Shipping)
- **Tipos de costo:**
  - `FIJO` - Precio fijo
  - `POR_PESO` - Calculado por kg
  - `POR_VOLUMEN` - Calculado por m³
  - `ESCALONADO` - Por rangos de peso
- **Condiciones de envío gratis:**
  - Por monto mínimo de compra
  - Por cantidad mínima de productos
- **Vigencia temporal** para promociones
- **Restricciones** por producto o categoría
- **Transportadoras** con tiempos estimados

### Gestión de Ventas (Admin)
- **Ventas a crédito** con cuotas quincenales
- **Ventas de contado** con pago inmediato
- **Límites de crédito** por cliente (configurable)
- **Validación de márgenes** (precio venta ≥ costo)
- **Sistema de intereses/mora** por días de atraso
- **Auditoría completa de pagos** (quién, cuándo, método, referencia)
- **Cancelación de ventas** con devolución de stock

### Gestión de Clientes (Admin)
- **Score crediticio** automático basado en historial de pagos
- **Límite de crédito** con validación automática
- **Bloqueo por mora** con motivo y fecha
- **Historial de notas** (llamadas, visitas, acuerdos)
- **Búsqueda avanzada** por nombre, teléfono, score, deuda
- **Estadísticas** de cartera y morosidad

### Dashboard Administrativo
- **Estadísticas de ventas**: total, por canal, por tipo
- **Cobranza**: pendiente, vencido, mora acumulada
- **Estados de ventas**: activas, completadas, en mora, canceladas
- **Márgenes**: costo total, venta total, margen bruto
- **Filtros por fecha** para análisis temporal

### Sistema de Devoluciones (Admin)
- **Solicitud de devolución** con validación de productos vendidos
- **Flujo de aprobación**: Pendiente → Aprobada → Procesada
- **Tipos de reembolso**: Crédito tienda, efectivo, descuento de deuda
- **Devolución automática de stock** al procesar
- **Ajuste automático de deuda** del cliente
- **Historial completo** de estados y acciones
- **Validación de cantidades** (no devolver más de lo vendido)
- **Motivos predefinidos**: Defectuoso, incorrecto, no satisfecho, etc.

### Cupones (Coupons)
- **Tipos de descuento:**
  - `PERCENTAGE` - Descuento porcentual
  - `FIXED_AMOUNT` - Monto fijo
- Monto mínimo de compra
- Límite máximo de descuento
- Vigencia temporal (fecha inicio/fin)
- Límite de usos global y por usuario
- Restricción a primera compra
- Filtro por productos, categorías o marcas
- Estadísticas de uso

### Wishlist (Lista de Deseos)
- Lista persistente por usuario
- Verificación de disponibilidad de productos
- Indicador de stock en tiempo real
- Agregar/eliminar productos
- Contador de items

### Reviews (Reseñas)
- **Rating** de 1 a 5 estrellas
- Título y comentario opcionales
- Imágenes adjuntas
- Verificación de compra (`verifiedPurchase`)
- Sistema de votos "útil"
- Respuesta del administrador
- Moderación de reseñas (PENDING, APPROVED, REJECTED)
- Estadísticas por producto (promedio, distribución)
- Límite de una reseña por usuario/producto

## Estructura del Proyecto
```
src/
├── auth/                 # Autenticación OTP + JWT
│   ├── decorators/       # @CurrentUser, @Roles
│   ├── guards/           # JwtAuthGuard, RolesGuard
│   ├── strategies/       # JWT Strategy
│   ├── dto/
│   └── schemas/          # Usuario, OtpCode
│
├── catalog/              # Catálogo público
│   └── dto/              # CatalogQueryDto
│
├── cart/                 # Carrito de compras
│   ├── dto/
│   └── schemas/          # Cart
│
├── addresses/            # Direcciones de envío
│   ├── dto/
│   └── schemas/          # Address
│
├── email/                # Servicio de correos
│
├── geography/            # Gestión geográfica
│   ├── data/             # Seed data Colombia
│   ├── dto/
│   └── schemas/          # Departamento, Ciudad, ZonaEnvio
│
├── shipping/             # Sistema de envíos
│   ├── dto/
│   └── schemas/          # Transportadora, MetodoEnvio
│
├── payments/             # Sistema de pagos
│   ├── providers/        # Wompi, CashOnDelivery
│   ├── interfaces/       # PaymentProvider interface
│   ├── dto/
│   └── schemas/          # Transaction
│
├── orders/               # Órdenes de e-commerce
│   ├── dto/
│   └── schemas/          # Order
│
├── coupons/              # Sistema de cupones
│   ├── dto/
│   └── schemas/          # Coupon, CouponUsage
│
├── wishlist/             # Lista de deseos
│   ├── dto/
│   └── schemas/          # Wishlist
│
├── reviews/              # Reseñas y calificaciones
│   ├── dto/
│   └── schemas/          # Review
│
├── health/               # Health checks
│
├── common/               # Utilidades compartidas
│   └── filters/          # HttpExceptionFilter
│
├── productos/            # Gestión de productos (Admin)
├── clientes/             # Gestión de clientes (Admin)
├── ventas/               # Ventas crédito/contado (Admin)
├── cobros/               # Cobros y pagos (Admin)
├── devoluciones/         # Sistema de devoluciones (Admin)
├── marcas/               # Catálogo de marcas (Admin)
└── acordes/              # Acordes de fragancias (Admin)
```

## Ejemplos de Uso

### Autenticación
```bash
# 1. Solicitar OTP
POST /api/auth/request-otp
{ "email": "usuario@ejemplo.com" }

# 2. Verificar OTP
POST /api/auth/verify-otp
{ "email": "usuario@ejemplo.com", "code": "123456" }
# Retorna: { accessToken, user }
```

### Calcular Envío
```bash
POST /api/shipping/calcular
{
  "ciudadId": "<medellin_id>",
  "productos": [
    { "productoId": "xxx", "cantidad": 2, "precioUnitario": 120000 }
  ]
}
```

### Inicializar Datos Geográficos
```bash
POST /api/geography/seed
# Crea departamentos, ciudades, zonas y transportadoras de Colombia
```

### Crear Dirección
```bash
POST /api/addresses
Authorization: Bearer <token>
{
  "label": "Casa",
  "fullName": "Juan Pérez",
  "phone": "3001234567",
  "departamentoId": "<antioquia_id>",
  "ciudadId": "<medellin_id>",
  "address": "Cra 45 #67-89",
  "addressDetail": "Apto 301",
  "notes": "Timbre no funciona",
  "isDefault": true
}
```

### Crear Orden con Pago
```bash
POST /api/orders/with-payment
Authorization: Bearer <token>
{
  "userId": "<user_id>",
  "customerEmail": "cliente@email.com",
  "customerName": "Juan Pérez",
  "customerPhone": "3001234567",
  "addressId": "<address_id>",
  "items": [
    {
      "productoId": "<producto_id>",
      "nombre": "Perfume XYZ",
      "cantidad": 2,
      "precioUnitario": 120000
    }
  ],
  "shippingInfo": {
    "metodoEnvioId": "<metodo_id>",
    "costo": 15000,
    "esGratis": false
  },
  "paymentMethod": "WOMPI"
}
# Retorna: { order, paymentUrl }
```

## Variables de Entorno
```env
# Base
MONGODB_URI=mongodb+srv://...
PORT=3000

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Email (SMTP2GO)
SMTP_HOST=mail.smtp2go.com
SMTP_PORT=2525
SMTP_USER=tu-usuario-smtp2go
SMTP_PASS=tu-api-key-smtp2go
EMAIL_FROM=Astralis <noreply@tudominio.com>

# Wompi (Pagos)
WOMPI_PUBLIC_KEY=pub_test_xxx
WOMPI_PRIVATE_KEY=prv_test_xxx
WOMPI_EVENTS_KEY=events_xxx
WOMPI_INTEGRITY_KEY=integrity_xxx
```

## Production Ready

### Seguridad
- **Helmet**: Headers HTTP de seguridad (XSS, HSTS, CSP, etc.)
- **Rate Limiting**: Protección contra ataques de fuerza bruta
  - Short: 10 requests/segundo
  - Medium: 50 requests/10 segundos
  - Long: 200 requests/minuto
- **Protección de endpoints admin**: Requieren JWT + rol ADMIN

### Health Checks
```bash
GET /api/health      # Verifica MongoDB y dependencias
GET /api/health/ping # Health check simple
```

### Logging
- **Winston**: Logging estructurado con archivos
  - `logs/error.log` - Solo errores
  - `logs/combined.log` - Todos los logs
- Consola con colores en desarrollo

### Emails Transaccionales
- Confirmación de orden
- Confirmación de pago
- Notificación de envío (con tracking)
- Confirmación de entrega

### Global Exception Filter
Respuestas de error estandarizadas:
```json
{
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/orders",
  "method": "POST",
  "message": ["error message"],
  "error": "Bad Request"
}
```

Ver [docs/PRODUCTION-READY.md](docs/PRODUCTION-READY.md) para documentación completa.

## Tecnologías
- NestJS
- MongoDB + Mongoose
- TypeScript
- Passport + JWT
- Nodemailer
- Class Validator
- Helmet (seguridad HTTP)
- Winston (logging)
- @nestjs/throttler (rate limiting)
- @nestjs/terminus (health checks)