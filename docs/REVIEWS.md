# Sistema de Resenas y Calificaciones

Sistema completo de resenas de productos con moderacion, votos de utilidad y estadisticas.

## Caracteristicas

- Calificaciones de 1 a 5 estrellas
- Sistema de moderacion (pendiente, aprobado, rechazado)
- Votos de "util" por otros usuarios
- Estadisticas agregadas por producto
- Verificacion de compra
- Respuestas de administrador
- Una resena por usuario/producto

## Estados de Resena

| Estado | Descripcion |
|--------|-------------|
| `PENDING` | Resena pendiente de moderacion |
| `APPROVED` | Resena aprobada y visible |
| `REJECTED` | Resena rechazada |

## Endpoints

### Publicos

```
GET /api/reviews/product/:productoId
```
Obtiene resenas aprobadas de un producto con paginacion.

**Query params:**
- `page` - Pagina (default: 1)
- `limit` - Items por pagina (default: 10)
- `sortBy` - Campo de ordenamiento (default: createdAt)
- `sortOrder` - asc | desc (default: desc)

**Respuesta:**
```json
{
  "reviews": [
    {
      "_id": "review_id",
      "productoId": "product_id",
      "userId": "user_id",
      "userName": "usuario123",
      "rating": 5,
      "title": "Excelente producto",
      "comment": "Me encanto, el aroma dura todo el dia...",
      "verifiedPurchase": true,
      "helpfulCount": 12,
      "status": "APPROVED",
      "adminResponse": "Gracias por tu resena!",
      "adminResponseAt": "2024-01-20T10:00:00Z",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

```
GET /api/reviews/product/:productoId/stats
```
Estadisticas de resenas de un producto.

**Respuesta:**
```json
{
  "averageRating": 4.3,
  "totalReviews": 25,
  "ratingDistribution": {
    "1": 1,
    "2": 2,
    "3": 3,
    "4": 8,
    "5": 11
  },
  "verifiedPurchaseCount": 18
}
```

```
GET /api/reviews/:id
```
Obtener una resena especifica.

### Autenticados

```
POST /api/reviews
```
Crear una resena.

**Body:**
```json
{
  "productoId": "product_id",
  "rating": 5,
  "title": "Excelente producto",
  "comment": "Me encanto, el aroma dura todo el dia y es exactamente como lo describen.",
  "orderId": "order_id"  // Opcional, para compra verificada
}
```

```
GET /api/reviews/can-review/:productoId
```
Verificar si el usuario puede dejar resena.

**Respuesta:**
```json
{
  "canReview": true
}
```

```
GET /api/reviews/user/me
```
Obtener mis resenas.

```
PATCH /api/reviews/:id
```
Actualizar mi resena.

**Body:**
```json
{
  "rating": 4,
  "title": "Buen producto",
  "comment": "Actualizo mi resena..."
}
```

```
DELETE /api/reviews/:id
```
Eliminar mi resena.

```
POST /api/reviews/:id/helpful
```
Marcar resena como util (toggle).

**Respuesta:**
```json
{
  "_id": "review_id",
  "helpfulCount": 13,
  "helpfulVotes": ["user_id_1", "user_id_2", ...]
}
```

### Administracion (Solo Admin)

```
GET /api/reviews/admin/pending
```
Listar resenas pendientes de moderacion.

**Query params:**
- `page` - Pagina (default: 1)
- `limit` - Items por pagina (default: 20)

```
PATCH /api/reviews/admin/:id
```
Moderar resena.

**Body:**
```json
{
  "status": "APPROVED",
  "adminResponse": "Gracias por compartir tu experiencia!"
}
```

```
DELETE /api/reviews/admin/:id
```
Eliminar resena (soft delete).

## Estructura de Datos

### Review Schema

```typescript
{
  productoId: ObjectId,       // Producto resenado
  userId: ObjectId,           // Usuario autor
  userName: string,           // Nombre visible del usuario
  orderId?: ObjectId,         // Orden de compra (opcional)

  rating: number,             // 1-5 estrellas
  title?: string,             // Titulo de la resena
  comment: string,            // Comentario (min 10 chars)

  verifiedPurchase: boolean,  // Si compro el producto

  helpfulVotes: ObjectId[],   // IDs de usuarios que votaron util
  helpfulCount: number,       // Contador de votos

  status: ReviewStatus,       // PENDING, APPROVED, REJECTED

  adminResponse?: string,     // Respuesta del admin
  adminResponseAt?: Date,     // Fecha de respuesta

  activo: boolean,            // Soft delete
  createdAt: Date,
  updatedAt: Date
}
```

## Flujo de Moderacion

```
Usuario crea resena
       |
       v
  [PENDING] -----> Admin revisa
       |                |
       |    +-----------+-----------+
       |    |                       |
       v    v                       v
  [APPROVED]                  [REJECTED]
       |
       v
  Visible en producto
```

## Ejemplo de Uso en Frontend

```typescript
// Obtener resenas con estadisticas
const getProductReviews = async (productId: string) => {
  const [reviewsRes, statsRes] = await Promise.all([
    fetch(`/api/reviews/product/${productId}?page=1&limit=10`),
    fetch(`/api/reviews/product/${productId}/stats`)
  ]);

  return {
    reviews: await reviewsRes.json(),
    stats: await statsRes.json()
  };
};

// Verificar si puede dejar resena
const canReview = async (productId: string) => {
  const response = await fetch(`/api/reviews/can-review/${productId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return (await response.json()).canReview;
};

// Crear resena
const createReview = async (productId: string, data: ReviewData) => {
  const response = await fetch('/api/reviews', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      productoId: productId,
      rating: data.rating,
      title: data.title,
      comment: data.comment,
      orderId: data.orderId  // Si tiene orden de compra
    })
  });
  return response.json();
};

// Votar resena como util
const toggleHelpful = async (reviewId: string) => {
  const response = await fetch(`/api/reviews/${reviewId}/helpful`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

## Componente de Estrellas

```typescript
// Ejemplo de renderizado de estrellas
const StarRating = ({ rating, distribution, total }) => {
  return (
    <div>
      <div className="average">
        {rating.toFixed(1)} / 5
        <span>({total} resenas)</span>
      </div>

      {[5, 4, 3, 2, 1].map(star => (
        <div key={star} className="rating-bar">
          <span>{star} estrellas</span>
          <div className="bar">
            <div
              className="fill"
              style={{ width: `${(distribution[star] / total) * 100}%` }}
            />
          </div>
          <span>{distribution[star]}</span>
        </div>
      ))}
    </div>
  );
};
```

## Validaciones

1. **Una resena por producto**: Un usuario solo puede dejar una resena por producto
2. **Rating valido**: Debe ser entre 1 y 5
3. **Comentario minimo**: Al menos 10 caracteres
4. **Propiedad**: Solo el autor puede editar/eliminar su resena
5. **Compra verificada**: Se marca automaticamente si se proporciona orderId valido

## Panel de Administracion

El admin puede:
1. Ver resenas pendientes de moderacion
2. Aprobar o rechazar resenas
3. Agregar respuestas oficiales a resenas
4. Eliminar resenas inapropiadas
