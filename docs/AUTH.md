# Auth Module - Autenticación OTP

Sistema de autenticación sin contraseña usando códigos OTP (One-Time Password) enviados por email.

## Estructura

```
src/auth/
├── decorators/
│   ├── current-user.decorator.ts   # @CurrentUser() - obtener usuario del JWT
│   └── roles.decorator.ts          # @Roles() - definir roles requeridos
├── guards/
│   ├── jwt-auth.guard.ts           # Proteger rutas con JWT
│   └── roles.guard.ts              # Verificar roles de usuario
├── strategies/
│   └── jwt.strategy.ts             # Passport JWT strategy
├── dto/
│   ├── request-otp.dto.ts
│   ├── verify-otp.dto.ts
│   └── update-profile.dto.ts
├── schemas/
│   ├── usuario.schema.ts           # Schema de usuario
│   └── otp-code.schema.ts          # Schema de códigos OTP
├── auth.controller.ts
├── auth.service.ts
└── auth.module.ts
```

## Schema de Usuario

```typescript
interface Usuario {
  _id: Types.ObjectId;
  email: string;              // Único, lowercase, trimmed
  nombre?: string;
  telefono?: string;
  rol: 'ADMIN' | 'USUARIO';   // Default: USUARIO
  verificado: boolean;        // true después de verificar OTP
  activo: boolean;            // Soft delete flag
  ultimoAcceso?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

## Schema de OTP

```typescript
interface OtpCode {
  _id: Types.ObjectId;
  email: string;
  codigo: string;             // 6 dígitos
  tipo: 'LOGIN' | 'REGISTRO';
  expiraEn: Date;
  usado: boolean;
  intentos: number;           // Máximo 3 intentos
  createdAt: Date;
}
```

## Endpoints

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/api/auth/request-otp` | No | Solicitar código OTP |
| POST | `/api/auth/verify-otp` | No | Verificar código y obtener JWT |
| GET | `/api/auth/profile` | Sí | Obtener perfil del usuario |
| PATCH | `/api/auth/profile` | Sí | Actualizar perfil |

## Flujo de Autenticación

```
1. Usuario ingresa email
   POST /api/auth/request-otp { email: "user@email.com" }

2. Sistema:
   - Si usuario existe → tipo: LOGIN
   - Si no existe → crea usuario, tipo: REGISTRO
   - Genera código de 6 dígitos
   - Invalida códigos anteriores
   - Envía email con código
   - Retorna: { mensaje, tipo }

3. Usuario ingresa código
   POST /api/auth/verify-otp { email: "user@email.com", codigo: "123456" }

4. Sistema:
   - Valida código y expiración
   - Verifica intentos (máx 3)
   - Marca usuario como verificado
   - Genera JWT
   - Retorna: { token, usuario }

5. Frontend guarda JWT y lo envía en headers:
   Authorization: Bearer <token>
```

## Ejemplos de Uso

### Solicitar OTP

```bash
POST /api/auth/request-otp
Content-Type: application/json

{
  "email": "cliente@email.com"
}
```

**Respuesta (usuario nuevo):**
```json
{
  "mensaje": "Código enviado a tu correo electrónico",
  "tipo": "REGISTRO"
}
```

**Respuesta (usuario existente):**
```json
{
  "mensaje": "Código enviado a tu correo electrónico",
  "tipo": "LOGIN"
}
```

### Verificar OTP

```bash
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "cliente@email.com",
  "codigo": "123456"
}
```

**Respuesta exitosa:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": "64a1b2c3d4e5f6g7h8i9j0k1",
    "email": "cliente@email.com",
    "nombre": "",
    "telefono": "",
    "rol": "USUARIO"
  }
}
```

### Obtener Perfil

```bash
GET /api/auth/profile
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
  "email": "cliente@email.com",
  "nombre": "Juan Pérez",
  "telefono": "3001234567",
  "rol": "USUARIO",
  "verificado": true,
  "activo": true,
  "ultimoAcceso": "2024-01-15T10:30:00.000Z",
  "createdAt": "2024-01-10T08:00:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### Actualizar Perfil

```bash
PATCH /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "nombre": "Juan Pérez García",
  "telefono": "3009876543"
}
```

## Seguridad

### Rate Limiting
- Máximo 1 OTP por minuto por email
- Previene spam de correos

### Intentos de Verificación
- Máximo 3 intentos por código
- Después de 3 fallos, el código se invalida

### Expiración
- Códigos expiran en 5 minutos (configurable)
- Variable: `OTP_EXPIRATION_MINUTES`

### Invalidación Automática
- Al solicitar nuevo OTP, los anteriores se marcan como usados

## Uso de Guards y Decorators

### Proteger una ruta con JWT

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('mi-recurso')
@UseGuards(JwtAuthGuard)  // Protege todo el controlador
export class MiRecursoController {
  // Todas las rutas requieren autenticación
}
```

### Obtener usuario actual

```typescript
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Get()
@UseGuards(JwtAuthGuard)
getData(@CurrentUser() user: CurrentUserData) {
  console.log(user.id);    // ID del usuario
  console.log(user.email); // Email del usuario
  console.log(user.rol);   // Rol del usuario
  return { userId: user.id };
}
```

### Restringir por rol

```typescript
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {

  @Get('stats')
  @Roles('ADMIN')  // Solo administradores
  getStats() {
    return this.adminService.getStats();
  }
}
```

## Estructura del JWT

```typescript
// Payload
{
  sub: "64a1b2c3d4e5f6g7h8i9j0k1",  // userId
  email: "cliente@email.com",
  rol: "USUARIO",
  iat: 1705312200,
  exp: 1705917000
}
```

## Variables de Entorno

```env
# JWT
JWT_SECRET=tu-clave-secreta-muy-larga-y-segura
JWT_EXPIRES_IN=7d

# OTP
OTP_EXPIRATION_MINUTES=5

# Email (para enviar OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password
EMAIL_FROM=noreply@astralis.com
```

## Email de OTP

El sistema envía un email HTML con el código:

```html
<div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
  <h1>Astralis</h1>
  <div style="background: #f9f9f9; padding: 30px; text-align: center;">
    <h2>Tu código de acceso</h2>
    <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px;">
      123456
    </div>
    <p>Este código expira en 5 minutos</p>
  </div>
</div>
```

## Errores Comunes

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | "Debes esperar 1 minuto antes de solicitar otro código" | Rate limiting |
| 400 | "Esta cuenta ha sido desactivada" | Usuario con `activo: false` |
| 400 | "No hay código pendiente para este email" | OTP no encontrado |
| 400 | "El código ha expirado" | OTP expirado |
| 400 | "Has excedido el número máximo de intentos" | 3+ intentos fallidos |
| 400 | "Código incorrecto. Te quedan X intento(s)" | Código inválido |
| 401 | "Unauthorized" | Token JWT inválido o expirado |
| 404 | "Usuario no encontrado" | ID de usuario no existe |

## Dependencias

- **@nestjs/jwt**: Generación y validación de JWT
- **@nestjs/passport**: Estrategia de autenticación
- **passport-jwt**: Passport strategy para JWT
- **EmailModule**: Envío de correos con OTP
