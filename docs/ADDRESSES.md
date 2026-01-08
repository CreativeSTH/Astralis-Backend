# Addresses Module - Sistema de Direcciones

Sistema de gestión de direcciones de envío para usuarios autenticados.

## Estructura

```
src/addresses/
├── schemas/
│   └── address.schema.ts
├── dto/
│   ├── create-address.dto.ts
│   ├── update-address.dto.ts
│   └── index.ts
├── addresses.controller.ts
├── addresses.service.ts
└── addresses.module.ts
```

## Schema

```typescript
interface Address {
  _id: Types.ObjectId;
  userId: Types.ObjectId;           // Usuario propietario
  label: string;                    // "Casa", "Oficina", "Trabajo"
  fullName: string;                 // Nombre de quien recibe
  phone: string;                    // Teléfono de contacto
  departamentoId: Types.ObjectId;   // Referencia a Departamento
  departamentoNombre: string;       // Nombre denormalizado
  ciudadId: Types.ObjectId;         // Referencia a Ciudad
  ciudadNombre: string;             // Nombre denormalizado
  address: string;                  // Dirección principal
  addressDetail?: string;           // Apto, piso, torre, etc.
  postalCode?: string;              // Código postal
  notes?: string;                   // Instrucciones de entrega
  isDefault: boolean;               // Dirección predeterminada
  activo: boolean;                  // Soft delete flag
  createdAt: Date;
  updatedAt: Date;
}
```

## Endpoints

Todos los endpoints requieren autenticación JWT.

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/addresses` | Crear nueva dirección |
| GET | `/api/addresses` | Listar todas las direcciones |
| GET | `/api/addresses?ciudadId=xxx` | Filtrar por ciudad |
| GET | `/api/addresses/default` | Obtener dirección predeterminada |
| GET | `/api/addresses/:id` | Obtener dirección específica |
| PATCH | `/api/addresses/:id` | Actualizar dirección |
| PATCH | `/api/addresses/:id/default` | Marcar como predeterminada |
| DELETE | `/api/addresses/:id` | Eliminar dirección (soft delete) |

## Ejemplos de Uso

### Crear Dirección

```bash
POST /api/addresses
Authorization: Bearer <token>
Content-Type: application/json

{
  "label": "Casa",
  "fullName": "Juan Pérez García",
  "phone": "3001234567",
  "departamentoId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "ciudadId": "64a1b2c3d4e5f6g7h8i9j0k2",
  "address": "Carrera 45 #67-89",
  "addressDetail": "Apartamento 301, Torre A",
  "postalCode": "050001",
  "notes": "Timbre no funciona, llamar al llegar",
  "isDefault": true
}
```

**Respuesta:**
```json
{
  "_id": "64a1b2c3d4e5f6g7h8i9j0k3",
  "userId": "64a1b2c3d4e5f6g7h8i9j0k0",
  "label": "Casa",
  "fullName": "Juan Pérez García",
  "phone": "3001234567",
  "departamentoId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "departamentoNombre": "Antioquia",
  "ciudadId": "64a1b2c3d4e5f6g7h8i9j0k2",
  "ciudadNombre": "Medellín",
  "address": "Carrera 45 #67-89",
  "addressDetail": "Apartamento 301, Torre A",
  "postalCode": "050001",
  "notes": "Timbre no funciona, llamar al llegar",
  "isDefault": true,
  "activo": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### Listar Direcciones

```bash
GET /api/addresses
Authorization: Bearer <token>
```

**Respuesta:**
```json
[
  {
    "_id": "64a1b2c3d4e5f6g7h8i9j0k3",
    "label": "Casa",
    "fullName": "Juan Pérez García",
    "ciudadNombre": "Medellín",
    "departamentoNombre": "Antioquia",
    "isDefault": true,
    ...
  },
  {
    "_id": "64a1b2c3d4e5f6g7h8i9j0k4",
    "label": "Oficina",
    "fullName": "Juan Pérez García",
    "ciudadNombre": "Medellín",
    "departamentoNombre": "Antioquia",
    "isDefault": false,
    ...
  }
]
```

### Filtrar por Ciudad

Útil durante el checkout para mostrar solo direcciones de la ciudad seleccionada:

```bash
GET /api/addresses?ciudadId=64a1b2c3d4e5f6g7h8i9j0k2
Authorization: Bearer <token>
```

### Marcar como Predeterminada

```bash
PATCH /api/addresses/64a1b2c3d4e5f6g7h8i9j0k4/default
Authorization: Bearer <token>
```

Automáticamente quita el flag `isDefault` de otras direcciones del usuario.

## Validaciones

### CreateAddressDto

| Campo | Validación |
|-------|------------|
| label | String, 2-50 caracteres |
| fullName | String, 3-100 caracteres |
| phone | String, 7-20 caracteres |
| departamentoId | MongoId válido |
| ciudadId | MongoId válido, debe pertenecer al departamento |
| address | String, 5-200 caracteres |
| addressDetail | Opcional, String, max 100 caracteres |
| postalCode | Opcional, String, max 10 caracteres |
| notes | Opcional, String, max 200 caracteres |
| isDefault | Opcional, Boolean |

## Comportamiento Automático

1. **Primera dirección**: Se marca como predeterminada automáticamente.
2. **Nueva predeterminada**: Al marcar una dirección como predeterminada, las demás se desmarcan.
3. **Eliminar predeterminada**: Si se elimina la dirección predeterminada, la más reciente se convierte en predeterminada.
4. **Denormalización**: Los nombres de departamento y ciudad se guardan automáticamente al crear/actualizar.

## Integración con Checkout

En el proceso de checkout, el frontend puede:

1. Listar direcciones del usuario
2. Filtrar por ciudad seleccionada
3. Mostrar opción de crear nueva dirección
4. Enviar `addressId` al crear la orden (en lugar de `shippingAddress` inline)

```typescript
// En CreateOrderDto
{
  "addressId": "64a1b2c3d4e5f6g7h8i9j0k3",  // Usar dirección guardada
  // O
  "shippingAddress": { ... }  // Crear inline (sin guardar)
}
```

## Índices de Base de Datos

```typescript
AddressSchema.index({ userId: 1 });
AddressSchema.index({ userId: 1, ciudadId: 1 });
AddressSchema.index({ userId: 1, isDefault: 1 });
```

## Dependencias

- **GeographyModule**: Para validar departamentos y ciudades
- **AuthModule**: Para obtener el usuario actual del JWT
