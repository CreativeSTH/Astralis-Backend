# Catalog Module - Catálogo Público

API pública para consultar productos visibles en la tienda online.

## Estructura

```
src/catalog/
├── dto/
│   └── catalog-query.dto.ts    # Filtros de búsqueda
├── catalog.controller.ts
├── catalog.service.ts
└── catalog.module.ts
```

## Características

- **Público**: No requiere autenticación
- **Solo productos visibles**: `visibleInStore: true` y `activo: true`
- **Paginación**: Configurable con límite máximo
- **Filtros**: Por marca, precio, tipo, búsqueda
- **Ordenamiento**: Por precio, nombre, popularidad, fecha

## Endpoints

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/api/catalog/products` | No | Listar productos con filtros |
| GET | `/api/catalog/products/featured` | No | Productos destacados |
| GET | `/api/catalog/products/best-sellers` | No | Más vendidos |
| GET | `/api/catalog/products/:id` | No | Detalle de producto |
| GET | `/api/catalog/products/:id/stock` | No | Verificar stock |
| GET | `/api/catalog/brands` | No | Listar marcas |

## Formato de Producto Público

```typescript
interface PublicProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  type: string;                    // PERFUME, LOCION, etc.
  brandId: string | null;
  brandName: string;
  image: string;
  acordes: Array<{
    name: string;
    percentage: number;
  }>;
  featured: boolean;
  inStock: boolean;
}
```

## Ejemplos de Uso

### Listar Productos

```bash
GET /api/catalog/products
```

**Con filtros:**
```bash
GET /api/catalog/products?search=chanel&brandId=xxx&minPrice=50000&maxPrice=200000&type=PERFUME&page=1&limit=12&sortBy=price&sortOrder=asc
```

**Parámetros de Query:**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| search | string | - | Busca en nombre, descripción, marca |
| brandId | string | - | Filtrar por marca (MongoId) |
| type | string | - | Filtrar por tipo (PERFUME, LOCION) |
| minPrice | number | - | Precio mínimo |
| maxPrice | number | - | Precio máximo |
| page | number | 1 | Página actual |
| limit | number | 12 | Items por página |
| sortBy | string | createdAt | Campo de ordenamiento |
| sortOrder | string | desc | asc o desc |

**Valores de sortBy:**
- `price` - Por precio de venta
- `name` - Por nombre alfabético
- `createdAt` - Por fecha de creación
- `totalVendido` - Por popularidad (más vendidos)

**Respuesta:**
```json
{
  "data": [
    {
      "id": "64a1b2c3d4e5f6g7h8i9j0k1",
      "name": "Perfume Chanel No. 5",
      "description": "Fragancia floral clásica",
      "price": 120000,
      "stock": 15,
      "type": "PERFUME",
      "brandId": "64a1b2c3d4e5f6g7h8i9j0k2",
      "brandName": "Chanel",
      "image": "https://...",
      "acordes": [
        { "name": "Floral", "percentage": 40 },
        { "name": "Aldehídico", "percentage": 30 }
      ],
      "featured": true,
      "inStock": true
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 12,
    "totalPages": 13,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Productos Destacados

```bash
GET /api/catalog/products/featured
GET /api/catalog/products/featured?limit=4
```

**Respuesta:** Array de `PublicProduct[]` con productos que tienen `featured: true`.

### Productos Más Vendidos

```bash
GET /api/catalog/products/best-sellers
GET /api/catalog/products/best-sellers?limit=8
```

**Respuesta:** Array de `PublicProduct[]` ordenados por `totalVendido` descendente.

### Detalle de Producto

```bash
GET /api/catalog/products/64a1b2c3d4e5f6g7h8i9j0k1
```

**Respuesta:** Un `PublicProduct` con toda la información.

### Verificar Stock

```bash
GET /api/catalog/products/64a1b2c3d4e5f6g7h8i9j0k1/stock?quantity=3
```

**Respuesta:**
```json
{
  "available": true,
  "stock": 15
}
```

```json
{
  "available": false,
  "stock": 2
}
```

### Listar Marcas

```bash
GET /api/catalog/brands
```

**Respuesta:**
```json
[
  {
    "id": "64a1b2c3d4e5f6g7h8i9j0k2",
    "name": "Chanel",
    "logo": "https://..."
  },
  {
    "id": "64a1b2c3d4e5f6g7h8i9j0k3",
    "name": "Dior",
    "logo": "https://..."
  }
]
```

**Nota:** Solo retorna marcas que tienen al menos un producto visible en la tienda.

## Filtros de Búsqueda

### Búsqueda por Texto (search)

Busca con regex case-insensitive en:
- `nombre` - Nombre del producto
- `descripcion` - Descripción
- `nombreMarca` - Nombre de la marca

```javascript
filter.$or = [
  { nombre: { $regex: search, $options: 'i' } },
  { descripcion: { $regex: search, $options: 'i' } },
  { nombreMarca: { $regex: search, $options: 'i' } },
];
```

### Rango de Precios

```bash
GET /api/catalog/products?minPrice=50000&maxPrice=150000
```

### Combinar Filtros

```bash
GET /api/catalog/products?brandId=xxx&minPrice=100000&sortBy=price&sortOrder=asc&limit=20
```

## Condiciones Base

Todos los endpoints aplican automáticamente:

```javascript
const filter = {
  activo: true,           // No eliminados
  visibleInStore: true,   // Visibles en tienda
};
```

## Paginación

### Respuesta de Paginación

```typescript
interface Pagination {
  total: number;        // Total de productos que coinciden
  page: number;         // Página actual
  limit: number;        // Items por página
  totalPages: number;   // Total de páginas
  hasNextPage: boolean; // ¿Hay página siguiente?
  hasPrevPage: boolean; // ¿Hay página anterior?
}
```

### Navegación en Frontend

```typescript
// Primera página
GET /api/catalog/products?page=1&limit=12

// Página siguiente
if (response.pagination.hasNextPage) {
  GET /api/catalog/products?page=2&limit=12
}

// Ir a página específica
GET /api/catalog/products?page=5&limit=12
```

## Mapeo de Campos

El catálogo transforma el producto interno al formato público:

| Campo Interno | Campo Público |
|--------------|---------------|
| _id | id |
| nombre | name |
| descripcion | description |
| precioVenta | price |
| stock | stock |
| tipo | type |
| marcaId | brandId |
| nombreMarca | brandName |
| imagen | image |
| acordes | acordes (mapeado) |
| featured | featured |
| stock > 0 | inStock |

## Casos de Uso

### Home Page

```typescript
// Destacados para hero/slider
const featured = await api.get('/catalog/products/featured?limit=4');

// Más vendidos
const bestSellers = await api.get('/catalog/products/best-sellers?limit=8');

// Últimos productos
const latest = await api.get('/catalog/products?limit=8&sortBy=createdAt');
```

### Página de Categoría

```typescript
// Productos de una marca
const products = await api.get('/catalog/products?brandId=xxx');

// Con paginación
const page2 = await api.get('/catalog/products?brandId=xxx&page=2');
```

### Búsqueda

```typescript
// Barra de búsqueda
const results = await api.get('/catalog/products?search=chanel');

// Con filtros adicionales
const filtered = await api.get('/catalog/products?search=perfume&minPrice=50000&maxPrice=100000');
```

### Página de Producto

```typescript
// Detalle
const product = await api.get('/catalog/products/xxx');

// Verificar stock antes de agregar al carrito
const stock = await api.get('/catalog/products/xxx/stock?quantity=2');
if (stock.available) {
  // Agregar al carrito
}
```

## Errores Comunes

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | "Product not found" | Producto no existe, no activo, o no visible |

## Dependencias

- **ProductosModule**: Acceso a productos
- **MarcasModule**: Acceso a marcas
