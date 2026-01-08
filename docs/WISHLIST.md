# Sistema de Lista de Deseos (Wishlist)

Sistema de lista de deseos persistente para usuarios autenticados.

## Caracteristicas

- Lista unica por usuario
- Verificacion de disponibilidad de stock en tiempo real
- Snapshot de producto al agregar (precio, imagen, nombre)
- Deteccion de productos no disponibles

## Endpoints

Todos los endpoints requieren autenticacion JWT.

### Obtener Wishlist

```
GET /api/wishlist
```

**Respuesta:**
```json
{
  "_id": "wishlist_id",
  "userId": "user_id",
  "items": [
    {
      "productoId": "product_id",
      "addedAt": "2024-01-15T10:30:00Z",
      "productSnapshot": {
        "nombre": "Perfume XYZ",
        "precio": 150000,
        "imagen": "https://..."
      }
    }
  ],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Agregar Producto

```
POST /api/wishlist/items
```

**Body:**
```json
{
  "productoId": "product_id"
}
```

**Respuesta:** Wishlist actualizada

### Eliminar Producto

```
DELETE /api/wishlist/items/:productoId
```

**Respuesta:** 204 No Content

### Vaciar Wishlist

```
DELETE /api/wishlist
```

**Respuesta:** 204 No Content

### Verificar si Producto esta en Wishlist

```
GET /api/wishlist/check/:productoId
```

**Respuesta:**
```json
{
  "inWishlist": true
}
```

### Verificar Disponibilidad

```
GET /api/wishlist/availability
```

Verifica el stock actual de todos los productos en la wishlist.

**Respuesta:**
```json
{
  "items": [
    {
      "productoId": "product_id_1",
      "nombre": "Perfume ABC",
      "disponible": true,
      "stockActual": 5,
      "precioActual": 150000,
      "precioAlAgregar": 145000,
      "precioCambio": true
    },
    {
      "productoId": "product_id_2",
      "nombre": "Perfume XYZ",
      "disponible": false,
      "stockActual": 0,
      "precioActual": null,
      "precioAlAgregar": 200000,
      "precioCambio": false,
      "razon": "Producto sin stock"
    }
  ],
  "totalItems": 2,
  "disponibles": 1,
  "noDisponibles": 1
}
```

## Estructura de Datos

### Wishlist Schema

```typescript
{
  userId: ObjectId,          // Usuario propietario (unico)
  items: WishlistItem[],     // Array de productos
  createdAt: Date,
  updatedAt: Date
}
```

### WishlistItem (Subdocumento)

```typescript
{
  productoId: ObjectId,      // Referencia al producto
  addedAt: Date,             // Fecha de agregado
  productSnapshot: {         // Snapshot al momento de agregar
    nombre: string,
    precio: number,
    imagen: string
  }
}
```

## Ejemplo de Uso en Frontend

```typescript
// Verificar si producto esta en wishlist
const checkWishlist = async (productId: string) => {
  const response = await fetch(`/api/wishlist/check/${productId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const { inWishlist } = await response.json();
  return inWishlist;
};

// Toggle wishlist (agregar/quitar)
const toggleWishlist = async (productId: string) => {
  const inWishlist = await checkWishlist(productId);

  if (inWishlist) {
    await fetch(`/api/wishlist/items/${productId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  } else {
    await fetch('/api/wishlist/items', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ productoId: productId })
    });
  }
};

// Obtener wishlist con verificacion de disponibilidad
const getWishlistWithAvailability = async () => {
  const [wishlist, availability] = await Promise.all([
    fetch('/api/wishlist', { headers: { 'Authorization': `Bearer ${token}` } }),
    fetch('/api/wishlist/availability', { headers: { 'Authorization': `Bearer ${token}` } })
  ]);

  return {
    items: await wishlist.json(),
    availability: await availability.json()
  };
};
```

## Notas de Implementacion

1. **Producto Unico**: Un producto solo puede estar una vez en la wishlist
2. **Snapshot**: Al agregar un producto, se guarda un snapshot del nombre, precio e imagen actual
3. **Verificacion de Stock**: El endpoint `/availability` consulta el stock actual vs el snapshot
4. **Cambio de Precio**: Se detecta si el precio cambio desde que se agrego a la wishlist
5. **Soft Reference**: Si un producto se elimina, el item permanece en wishlist pero se marca como no disponible
