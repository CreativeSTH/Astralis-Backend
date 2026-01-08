# Production Ready Features

Características de seguridad, monitoreo y notificaciones implementadas para producción.

## Documentación API (Swagger/OpenAPI)

### Acceso

Swagger UI disponible en: `http://localhost:3000/docs`

### Características

- Documentación interactiva de todos los endpoints
- Autenticación JWT integrada (botón "Authorize")
- Ejemplos de request/response
- Organización por tags (Auth, Catalog, Cart, Orders, etc.)

### Configuración

```typescript
// main.ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('Astralis API')
  .setDescription('API de e-commerce para perfumería')
  .setVersion('1.0')
  .addBearerAuth(
    { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    'JWT-auth',
  )
  .addTag('Auth', 'Autenticación con OTP')
  .addTag('Catalog', 'Catálogo público de productos')
  .addTag('Cart', 'Carrito de compras')
  .addTag('Orders', 'Gestión de pedidos')
  .addTag('Payments', 'Procesamiento de pagos')
  .addTag('Coupons', 'Sistema de cupones')
  .addTag('Wishlist', 'Lista de deseos')
  .addTag('Reviews', 'Reseñas y calificaciones')
  .addTag('Geography', 'Datos geográficos')
  .addTag('Shipping', 'Métodos de envío')
  .addTag('Addresses', 'Direcciones de usuario')
  .addTag('Admin', 'Endpoints administrativos')
  .addTag('Health', 'Estado del sistema')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('docs', app, document);
```

### Plugin de Compilación

```json
// nest-cli.json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@nestjs/swagger",
        "options": {
          "classValidatorShim": true,
          "introspectComments": true
        }
      }
    ]
  }
}
```

### Uso en Controladores

```typescript
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Products')
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN)
@ApiBearerAuth('JWT-auth')
export class ProductsController {
  @Get()
  @ApiOperation({ summary: 'Listar todos los productos' })
  findAll() {
    // ...
  }
}
```

## Seguridad

### Helmet

Middleware de seguridad que configura headers HTTP para proteger contra vulnerabilidades comunes.

```typescript
// main.ts
import helmet from 'helmet';
app.use(helmet());
```

**Headers configurados:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy`

### Rate Limiting

Protección contra ataques de fuerza bruta y DoS usando `@nestjs/throttler`.

```typescript
// app.module.ts
ThrottlerModule.forRoot([
  {
    name: 'short',
    ttl: 1000,    // 1 segundo
    limit: 10,    // 10 requests
  },
  {
    name: 'medium',
    ttl: 10000,   // 10 segundos
    limit: 50,    // 50 requests
  },
  {
    name: 'long',
    ttl: 60000,   // 1 minuto
    limit: 200,   // 200 requests
  },
]),
```

**Respuesta cuando se excede el límite:**
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

### Protección de Endpoints Admin

Todos los endpoints administrativos requieren autenticación JWT y rol `ADMIN`.

**Controladores protegidos:**

| Controlador | Ruta Base | Protección |
|-------------|-----------|------------|
| ProductosController | `/api/productos` | JWT + ADMIN |
| ClientesController | `/api/clientes` | JWT + ADMIN |
| VentasController | `/api/ventas` | JWT + ADMIN |
| CobrosController | `/api/cobros` | JWT + ADMIN |
| MarcasController | `/api/marcas` | JWT + ADMIN |
| AcordesController | `/api/acordes` | JWT + ADMIN |

**Implementación:**
```typescript
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../auth/schemas/usuario.schema';

@Controller('productos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN)
export class ProductosController {
  // Todos los endpoints requieren ADMIN
}
```

**Endpoints de Orders con permisos mixtos:**

| Endpoint | Método | Acceso |
|----------|--------|--------|
| `/api/orders` | POST | Usuario autenticado |
| `/api/orders/checkout` | POST | Usuario autenticado |
| `/api/orders/my-orders` | GET | Usuario autenticado (solo sus órdenes) |
| `/api/orders/:id` | GET | Usuario (solo suya) o Admin |
| `/api/orders` | GET | Solo Admin |
| `/api/orders/:id/status` | PATCH | Solo Admin |
| `/api/orders/:id/confirm-payment` | POST | Solo Admin |
| `/api/orders/:id/tracking` | PATCH | Solo Admin |
| `/api/orders/:id/delivered` | POST | Solo Admin |
| `/api/orders/:id/cancel` | POST | Usuario (solo pendientes) o Admin |

## Health Checks

### Estructura

```
src/health/
├── health.controller.ts
└── health.module.ts
```

### Endpoints

#### GET /api/health

Verifica el estado de la aplicación y sus dependencias.

**Respuesta exitosa:**
```json
{
  "status": "ok",
  "info": {
    "mongodb": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "mongodb": {
      "status": "up"
    }
  }
}
```

**Respuesta con error:**
```json
{
  "status": "error",
  "info": {},
  "error": {
    "mongodb": {
      "status": "down",
      "message": "Connection refused"
    }
  },
  "details": {
    "mongodb": {
      "status": "down",
      "message": "Connection refused"
    }
  }
}
```

#### GET /api/health/ping

Health check simple sin verificar dependencias.

**Respuesta:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.123
}
```

### Uso con Docker/Kubernetes

```yaml
# docker-compose.yml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/api/health/ping"]
  interval: 30s
  timeout: 10s
  retries: 3
```

```yaml
# kubernetes deployment
livenessProbe:
  httpGet:
    path: /api/health/ping
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Global Exception Filter

### Estructura

```
src/common/filters/
└── http-exception.filter.ts
```

### Formato de Respuesta de Error

Todos los errores siguen un formato consistente:

```typescript
interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error?: string;
}
```

**Ejemplo de error 400:**
```json
{
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/orders",
  "method": "POST",
  "message": ["userId must be a string", "items should not be empty"],
  "error": "Bad Request"
}
```

**Ejemplo de error 404:**
```json
{
  "statusCode": 404,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/orders/invalid-id",
  "method": "GET",
  "message": "Orden con ID invalid-id no encontrada",
  "error": "Not Found"
}
```

**Ejemplo de error 500:**
```json
{
  "statusCode": 500,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/orders",
  "method": "POST",
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

### Logging Automático

- Errores 4xx: `Logger.warn()`
- Errores 5xx: `Logger.error()` con stack trace

## Logging con Winston

### Configuración

```typescript
// app.module.ts
WinstonModule.forRootAsync({
  useFactory: () => ({
    transports: [
      // Consola con colores
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          nestWinstonModuleUtilities.format.nestLike('Astralis', {
            colors: true,
            prettyPrint: true,
          }),
        ),
      }),
      // Archivo de errores
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
      // Archivo general
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    ],
  }),
}),
```

### Archivos de Log

```
logs/
├── error.log      # Solo errores (level: error)
└── combined.log   # Todos los logs
```

### Formato de Log en Archivo

```json
{
  "level": "error",
  "message": "POST /api/orders - 500",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "context": "HttpExceptionFilter"
}
```

### Uso en Servicios

```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class MiService {
  private readonly logger = new Logger(MiService.name);

  async miMetodo() {
    this.logger.log('Operación iniciada');
    this.logger.warn('Advertencia');
    this.logger.error('Error crítico', stack);
  }
}
```

## Emails Transaccionales

### Estructura

Los emails se envían automáticamente desde `OrdersService` en cada cambio de estado.

### Tipos de Email

#### 1. Confirmación de Orden

**Trigger:** Al crear una orden (`create()`)

**Contenido:**
- Resumen del pedido (productos, cantidades, precios)
- Subtotal, descuento, envío, total
- Dirección de envío

#### 2. Confirmación de Pago

**Trigger:** Al confirmar pago (`confirmPayment()`)

**Contenido:**
- Confirmación visual con checkmark
- Número de orden
- Total pagado
- Próximos pasos

#### 3. Notificación de Envío

**Trigger:** Al actualizar tracking (`updateTracking()`)

**Contenido:**
- Número de guía
- Link de rastreo (si está disponible)
- Dirección de entrega

#### 4. Confirmación de Entrega

**Trigger:** Al marcar como entregado (`markAsDelivered()`)

**Contenido:**
- Confirmación de entrega
- Invitación a dejar reseña

### Interface de Datos

```typescript
interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }>;
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  shippingAddress: {
    fullName: string;
    address: string;
    ciudadNombre: string;
    departamentoNombre: string;
  };
  trackingNumber?: string;
  trackingUrl?: string;
}
```

### Envío Asíncrono

Los emails se envían de forma asíncrona para no bloquear la respuesta:

```typescript
// No bloquea la respuesta al cliente
this.emailService.sendOrderConfirmation(emailData).catch((err) => {
  this.logger.error(`Error enviando email: ${err.message}`);
});
```

### Configuración SMTP (SMTP2GO)

```env
SMTP_HOST=mail.smtp2go.com
SMTP_PORT=2525
SMTP_USER=tu-usuario-smtp2go
SMTP_PASS=tu-api-key-smtp2go
EMAIL_FROM=Astralis <noreply@tudominio.com>
```

## Variables de Entorno

### Nuevas Variables

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `CORS_ORIGINS` | Orígenes permitidos (separados por coma) | `http://localhost:4200,https://mitienda.com` |
| `SMTP_HOST` | Servidor SMTP | `mail.smtp2go.com` |
| `SMTP_PORT` | Puerto SMTP | `2525` |
| `SMTP_USER` | Usuario SMTP2GO | `tu-usuario` |
| `SMTP_PASS` | API Key SMTP2GO | `tu-api-key` |
| `EMAIL_FROM` | Email remitente | `noreply@astralis.com` |

### Ejemplo Completo

```env
# Base
MONGODB_URI=mongodb+srv://...
PORT=3000
NODE_ENV=production

# CORS
CORS_ORIGINS=https://mitienda.com,https://admin.mitienda.com

# JWT
JWT_SECRET=clave-super-secreta-de-produccion
JWT_EXPIRES_IN=7d

# Email (SMTP2GO)
SMTP_HOST=mail.smtp2go.com
SMTP_PORT=2525
SMTP_USER=tu-usuario-smtp2go
SMTP_PASS=tu-api-key-smtp2go
EMAIL_FROM=Astralis <noreply@mitienda.com>

# Wompi
WOMPI_PUBLIC_KEY=pub_prod_xxx
WOMPI_PRIVATE_KEY=prv_prod_xxx
WOMPI_EVENTS_KEY=prod_events_xxx
WOMPI_INTEGRITY_KEY=prod_integrity_xxx
```

## Checklist de Producción

- [x] Swagger/OpenAPI documentación
- [x] Helmet configurado
- [x] Rate limiting activo
- [x] Endpoints admin protegidos
- [x] Health checks disponibles
- [x] Logging estructurado
- [x] Emails transaccionales
- [x] Exception filter global
- [x] CORS configurable
- [x] Sistema de cupones
- [x] Lista de deseos (Wishlist)
- [x] Sistema de reseñas
- [ ] HTTPS (configurar en reverse proxy)
- [ ] Variables de entorno de producción
- [ ] Backup de base de datos
- [ ] Monitoreo externo (opcional)

## Dependencias Instaladas

```json
{
  "helmet": "^7.x",
  "@nestjs/throttler": "^5.x",
  "@nestjs/terminus": "^10.x",
  "@nestjs/swagger": "^7.x",
  "swagger-ui-express": "^5.x",
  "winston": "^3.x",
  "nest-winston": "^1.x"
}
```
