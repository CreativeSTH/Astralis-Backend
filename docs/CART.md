# Cart Module - Carrito de Compras

Sistema de carrito de compras persistente para usuarios autenticados.

## Estructura

```
src/cart/
├── dto/
│   ├── add-item.dto.ts
│   ├── update-item.dto.ts
│   └── merge-cart.dto.ts
├── schemas/
│   └── cart.schema.ts
├── cart.controller.ts
├── cart.service.ts
└── cart.module.ts
```

## Schema

### Cart

```typescript
interface Cart {
  _id: Types.ObjectId;
  userId: Types.ObjectId;       // Usuario propietario (único)
  items: CartItem[];            // Productos en el carrito
  total: number;                // Total calculado
  itemCount: number;            // Cantidad total de items
  createdAt: Date;
  updatedAt: Date;
}
```

### CartItem

```typescript
interface CartItem {
  productId: Types.ObjectId;    // Referencia al producto
  productName: string;          // Nombre denormalizado
  quantity: number;             // Cantidad
  unitPrice: number;            // Precio unitario al agregar
  subtotal: number;             // quantity × unitPrice
  image: string;                // URL de imagen
}
```

## Endpoints

Todos los endpoints requieren autenticación JWT.

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/cart` | Obtener carrito del usuario |
| POST | `/api/cart/items` | Agregar producto al carrito |
| PATCH | `/api/cart/items/:productId` | Actualizar cantidad |
| DELETE | `/api/cart/items/:productId` | Eliminar producto |
| DELETE | `/api/cart` | Vaciar carrito |
| POST | `/api/cart/merge` | Fusionar carrito anónimo |
| GET | `/api/cart/validate` | Validar stock de items |

## Ejemplos de Uso

### Obtener Carrito

```bash
GET /api/cart
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
  "userId": "64a1b2c3d4e5f6g7h8i9j0k0",
  "items": [
    {
      "productId": "64a1b2c3d4e5f6g7h8i9j0k2",
      "productName": "Perfume Chanel No. 5",
      "quantity": 2,
      "unitPrice": 120000,
      "subtotal": 240000,
      "image": "https://..."
    },
    {
      "productId": "64a1b2c3d4e5f6g7h8i9j0k3",
      "productName": "Perfume Dior Sauvage",
      "quantity": 1,
      "unitPrice": 150000,
      "subtotal": 150000,
      "image": "https://..."
    }
  ],
  "total": 390000,
  "itemCount": 3,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Carrito vacío (se crea automáticamente):**
```json
{
  "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
  "userId": "64a1b2c3d4e5f6g7h8i9j0k0",
  "items": [],
  "total": 0,
  "itemCount": 0
}
```

### Agregar Producto

```bash
POST /api/cart/items
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "64a1b2c3d4e5f6g7h8i9j0k2",
  "quantity": 2
}
```

**Respuesta:** Carrito actualizado completo.

**Comportamiento:**
- Si el producto ya existe, suma la cantidad
- Valida stock antes de agregar
- Solo permite productos con `visibleInStore: true`

### Actualizar Cantidad

```bash
PATCH /api/cart/items/64a1b2c3d4e5f6g7h8i9j0k2
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 3
}
```

**Respuesta:** Carrito actualizado completo.

**Comportamiento:**
- Reemplaza la cantidad (no suma)
- Valida stock disponible
- Actualiza precio unitario si cambió

### Eliminar Producto

```bash
DELETE /api/cart/items/64a1b2c3d4e5f6g7h8i9j0k2
Authorization: Bearer <token>
```

**Respuesta:** Carrito actualizado sin el producto.

### Vaciar Carrito

```bash
DELETE /api/cart
Authorization: Bearer <token>
```

**Respuesta:** Carrito vacío.

### Fusionar Carrito Anónimo (Merge)

Cuando un usuario navega sin autenticar, el frontend puede guardar el carrito en localStorage. Al hacer login, se fusiona con el carrito del servidor:

```bash
POST /api/cart/merge
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    { "productId": "64a1b2c3d4e5f6g7h8i9j0k2", "quantity": 1 },
    { "productId": "64a1b2c3d4e5f6g7h8i9j0k3", "quantity": 2 }
  ]
}
```

**Comportamiento:**
- Suma cantidades si el producto ya existe
- Limita a stock disponible
- Ignora productos inactivos o sin stock
- No falla si algún producto es inválido

### Validar Stock

Verifica que todos los items del carrito tengan stock suficiente:

```bash
GET /api/cart/validate
Authorization: Bearer <token>
```

**Respuesta válida:**
```json
{
  "valid": true,
  "invalidItems": []
}
```

**Respuesta con problemas:**
```json
{
  "valid": false,
  "invalidItems": [
    {
      "productId": "64a1b2c3d4e5f6g7h8i9j0k2",
      "productName": "Perfume Chanel No. 5",
      "requested": 5,
      "available": 2
    }
  ]
}
```

## Validaciones

### AddItemDto

```typescript
{
  productId: string;   // MongoId válido, requerido
  quantity: number;    // Mínimo 1, requerido
}
```

### UpdateItemDto

```typescript
{
  quantity: number;    // Mínimo 1, requerido
}
```

### MergeCartDto

```typescript
{
  items: Array<{
    productId: string;  // MongoId válido
    quantity: number;   // Mínimo 1
  }>;
}
```

## Comportamiento Automático

### Carrito Lazy
- Se crea automáticamente al primer GET si no existe
- Vinculado al `userId` del JWT

### Recálculo de Totales
Después de cada operación se recalculan:
```typescript
cart.total = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
cart.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
```

### Denormalización
Se guardan datos del producto para evitar joins:
- `productName`
- `unitPrice`
- `image`

## Flujo de Checkout

```
1. Usuario navega catálogo (puede estar sin auth)
2. Agrega productos a localStorage (frontend)
3. Hace login con OTP
4. POST /api/cart/merge (fusiona localStorage)
5. GET /api/cart/validate (verifica stock)
6. Si valid: continúa a seleccionar dirección y envío
7. Si invalid: muestra productos con problema
```

## Carrito Híbrido (Frontend)

El frontend debe implementar:

```typescript
// Sin auth: guardar en localStorage
const localCart = {
  items: [
    { productId: "xxx", quantity: 2 },
  ]
};
localStorage.setItem('cart', JSON.stringify(localCart));

// Al hacer login: fusionar
const localCart = JSON.parse(localStorage.getItem('cart'));
if (localCart?.items?.length) {
  await api.post('/cart/merge', localCart);
  localStorage.removeItem('cart');
}

// Con auth: usar API
const cart = await api.get('/cart');
```

## Errores Comunes

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | "Insufficient stock. Available: X" | Stock insuficiente |
| 400 | "Insufficient stock. Available: X, In cart: Y" | Al agregar más de lo disponible |
| 404 | "Product not found" | Producto no existe o no visible |
| 404 | "Cart not found" | Carrito no existe (raro) |
| 404 | "Item not found in cart" | Producto no está en carrito |

## Índices de Base de Datos

```typescript
// userId es único por carrito
@Prop({ type: Types.ObjectId, ref: 'Usuario', required: true, unique: true })
userId: Types.ObjectId;
```

## Dependencias

- **ProductosModule**: Para validar productos y stock
- **AuthModule**: Para obtener el usuario actual del JWT
