# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
# Install dependencies
npm install

# Development
npm run start:dev       # Start with hot-reload
npm run start:debug     # Start with debugging enabled

# Production
npm run build           # Compile TypeScript to dist/
npm run start:prod      # Run compiled app

# Testing
npm test                # Run unit tests
npm run test:watch      # Run tests in watch mode
npm run test:cov        # Run tests with coverage
npm run test:e2e        # Run end-to-end tests

# Run a single test file
npx jest src/path/to/file.spec.ts

# Code Quality
npm run lint            # ESLint with auto-fix
npm run format          # Prettier formatting
```

## Environment Configuration

Requires a `.env` file with:
- `MONGODB_URI` - MongoDB connection string
- `PORT` - Server port (defaults to 3000)

## Architecture Overview

This is a **NestJS** backend for a sales/inventory management system using **MongoDB** with Mongoose.

### API Structure
- Global prefix: `/api`
- CORS enabled for localhost:4200 and localhost:4201
- Global ValidationPipe with whitelist, transform, and implicit conversion enabled

### Module Structure

Each domain follows the NestJS module pattern:
```
src/{domain}/
├── {domain}.module.ts      # Module definition
├── {domain}.controller.ts  # REST endpoints
├── {domain}.service.ts     # Business logic
├── schemas/                # Mongoose schemas
│   └── {entity}.schema.ts
└── dto/                    # Data transfer objects
    ├── create-{entity}.dto.ts
    └── update-{entity}.dto.ts
```

### Domain Modules

| Module | Purpose | Key Dependencies |
|--------|---------|-----------------|
| **Auth** | OTP-based authentication with JWT | EmailModule |
| **Email** | Email service (OTP, notifications) | - |
| **Catalog** | Public product catalog for store | ProductosModule, MarcasModule |
| **Cart** | Shopping cart management | ProductosModule, AuthModule |
| **Addresses** | User shipping addresses | GeographyModule, AuthModule |
| **Geography** | Departments, cities, shipping zones | - |
| **Shipping** | Shipping methods and cost calculation | GeographyModule |
| **Payments** | Payment processing (Wompi, COD) | - |
| **Orders** | E-commerce order management | GeographyModule, ShippingModule, PaymentsModule, AddressesModule, VentasModule |
| **Coupons** | Discount coupons system | - |
| **Wishlist** | User wishlist/favorites | ProductosModule |
| **Reviews** | Product ratings and reviews | - |
| **Health** | Health checks (MongoDB) | @nestjs/terminus |
| **Productos** | Product inventory management | MarcasModule, AcordesModule |
| **Ventas** | Sales (credit/cash) with installment tracking | ProductosModule, ClientesModule, CobrosModule |
| **Cobros** | Payment collection and tracking | VentasModule (circular ref with forwardRef) |
| **Clientes** | Customer management | - |
| **Devoluciones** | Product returns from sales | VentasModule, ProductosModule, ClientesModule |
| **Marcas** | Brand catalog | - |
| **Acordes** | Product agreements/partnerships | - |

### Key Patterns

**Circular Dependencies**: VentasModule and CobrosModule use `forwardRef()` to handle circular imports.

**Schema Denormalization**: Related entity names are stored alongside ObjectId references (e.g., `clienteId` + `nombreCliente`) for query optimization.

**Soft Deletes**: Entities use `activo: boolean` flag instead of hard deletes.

**DTO Validation**: Uses class-validator decorators. Update DTOs typically extend PartialType from @nestjs/mapped-types.

### Sales (Ventas) Domain

Sales support two types:
- `CREDITO` - Credit sales with installment plans (cuotas)
- `CONTADO` - Cash sales

Sales have two channels:
- `TIENDA` - Physical store sales (requires clienteId)
- `ECOMMERCE` - Online store sales (requires orderId, usuarioId optional)

**Sale States:**
```typescript
enum EstadoVenta {
  ACTIVA = 'ACTIVA',                    // Active, payments pending
  PARCIALMENTE_PAGADA = 'PARCIALMENTE_PAGADA',  // Some payments made
  COMPLETADA = 'COMPLETADA',            // Fully paid
  VENCIDA = 'VENCIDA',                  // Overdue
  EN_MORA = 'EN_MORA',                  // In arrears (with interest)
  CANCELADA = 'CANCELADA',              // Cancelled
}
```

**Payment Methods:**
```typescript
enum MetodoPago {
  EFECTIVO = 'EFECTIVO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  TARJETA = 'TARJETA',
  NEQUI = 'NEQUI',
  DAVIPLATA = 'DAVIPLATA',
  OTRO = 'OTRO',
}
```

**Installments (Cuotas) track:**
- `monto` - Original amount
- `fechaVencimiento` - Due date
- `montoPagado` - Amount paid
- `saldoPendiente` - Pending balance
- `diasMora` - Days overdue
- `interesMora` - Interest rate applied
- `montoMora` - Interest amount
- `montoTotalConMora` - Total with interest
- `historialPagos` - Payment history with audit trail (who, when, method, reference)

**Credit Validation**: Sales automatically validate client's credit limit before creation. Override with `omitirValidacionCredito: true`.

**Margin Validation**: Sales validate that sale price ≥ cost. Override with `omitirValidacionMargen: true`.

**E-commerce Integration**: When an order payment is confirmed, a sale is automatically created with `canal: ECOMMERCE`, stock is decremented, and `totalVendido` is updated.

### Clientes Domain

Customer management with credit limit system.

**Schema fields:**
```typescript
interface Cliente {
  // Basic info
  nombre: string;
  telefono: string;
  direccion: string;

  // Credit management
  limiteCredito: number;         // Credit limit (default: 500000)
  deudaActual: number;           // Current debt
  creditoDisponible: number;     // Virtual: limiteCredito - deudaActual

  // Blocking
  bloqueadoPorMora: boolean;
  fechaBloqueo?: Date;
  motivoBloqueo?: string;

  // Credit score
  score: number;                 // 0-100, calculated from payment history

  // Notes system
  notas: NotaCliente[];          // History of interactions
}
```

**Client Notes:**
```typescript
enum TipoNotaCliente {
  LLAMADA = 'LLAMADA',
  VISITA = 'VISITA',
  ACUERDO = 'ACUERDO',
  COBRANZA = 'COBRANZA',
  OTRO = 'OTRO',
}

interface NotaCliente {
  tipo: TipoNotaCliente;
  contenido: string;
  fecha: Date;
  creadaPor?: string;
}
```

**Key Service Methods:**
- `verificarCreditoDisponible(id, monto)` - Check if client has enough credit
- `incrementarDeuda(id, monto)` - Increase debt (when sale created)
- `decrementarDeuda(id, monto)` - Decrease debt (when payment received)
- `bloquearPorMora(id, motivo)` - Block client for arrears
- `desbloquear(id)` - Unblock client
- `agregarNota(clienteId, nota)` - Add interaction note
- `findWithFilters(filters)` - Search with pagination

### Dashboard (Statistics)

The `getDashboardStats()` method provides comprehensive analytics:

```typescript
interface DashboardStats {
  // Period info
  periodo: { desde: Date; hasta: Date };

  // Sales summary
  ventas: {
    total: number;
    porCanal: { TIENDA: number; ECOMMERCE: number };
    porTipo: { CREDITO: number; CONTADO: number };
    ventasActivas: number;
  };

  // Collections
  cobranza: {
    montoPendiente: number;
    montoVencido: number;
    moraAcumulada: number;
    cuotasPendientes: number;
    cuotasVencidas: number;
  };

  // Status breakdown
  estados: {
    activas: number;
    parcialmentePagadas: number;
    completadas: number;
    vencidas: number;
    enMora: number;
    canceladas: number;
  };

  // Margins
  margen: {
    costoTotal: number;
    ventaTotal: number;
    margenBruto: number;
    porcentajeMargen: number;
  };
}

### Devoluciones Domain

System for handling product returns from sales.

**Return States:**
```typescript
enum EstadoDevolucion {
  PENDIENTE = 'PENDIENTE',     // Awaiting approval
  APROBADA = 'APROBADA',       // Approved, pending processing
  RECHAZADA = 'RECHAZADA',     // Rejected
  PROCESADA = 'PROCESADA',     // Completed (stock returned, debt adjusted)
  CANCELADA = 'CANCELADA',     // Cancelled by requester
}
```

**Refund Types:**
```typescript
enum TipoReembolso {
  CREDITO_TIENDA = 'CREDITO_TIENDA',   // Credit to client's limit
  EFECTIVO = 'EFECTIVO',               // Cash refund
  DESCUENTO_DEUDA = 'DESCUENTO_DEUDA', // Deduct from pending debt
  SIN_REEMBOLSO = 'SIN_REEMBOLSO',     // Product return only
}
```

**Return Reasons:**
```typescript
enum MotivoDevolucion {
  PRODUCTO_DEFECTUOSO = 'PRODUCTO_DEFECTUOSO',
  PRODUCTO_INCORRECTO = 'PRODUCTO_INCORRECTO',
  NO_SATISFECHO = 'NO_SATISFECHO',
  CAMBIO_OPINION = 'CAMBIO_OPINION',
  ERROR_PEDIDO = 'ERROR_PEDIDO',
  DUPLICADO = 'DUPLICADO',
  OTRO = 'OTRO',
}
```

**Key validations:**
- Validates that products exist in the original sale
- Validates quantities don't exceed what was sold
- Tracks previous returns to prevent over-returning
- Complete audit trail with user and timestamps

**Service flow:**
1. `create()` - Create return request (validates products/quantities)
2. `aprobar()` - Approve return (set refund type, amounts)
3. `procesar()` - Process return (return stock, adjust client debt)

## Convenciones de Código NestJS/TypeScript

### Nomenclatura de Archivos

| Tipo | Formato | Ejemplo |
|------|---------|---------|
| Módulo | `{nombre}.module.ts` | `productos.module.ts` |
| Controlador | `{nombre}.controller.ts` | `productos.controller.ts` |
| Servicio | `{nombre}.service.ts` | `productos.service.ts` |
| Schema | `{entidad}.schema.ts` | `producto.schema.ts` |
| DTO Create | `create-{entidad}.dto.ts` | `create-producto.dto.ts` |
| DTO Update | `update-{entidad}.dto.ts` | `update-producto.dto.ts` |
| Test unitario | `{nombre}.spec.ts` | `productos.service.spec.ts` |
| Test e2e | `{nombre}.e2e-spec.ts` | `productos.e2e-spec.ts` |

### Nomenclatura de Clases y Variables

```typescript
// Clases: PascalCase
export class ProductosService {}
export class CreateProductoDto {}
export class Producto {}

// Métodos y variables: camelCase
async findAll(): Promise<Producto[]> {}
const productoActualizado = await this.productoModel.findById(id);

// Constantes y Enums valores: UPPER_SNAKE_CASE
export enum EstadoVenta {
  ACTIVA = 'ACTIVA',
  COMPLETADA = 'COMPLETADA',
  VENCIDA = 'VENCIDA',
}

// Interfaces: PascalCase con prefijo opcional "I"
export interface ProductoDocument extends Document {}
export type VentaDocument = Venta & Document;
```

### Estructura de Módulos

```typescript
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    // 1. Primero MongooseModule.forFeature
    MongooseModule.forFeature([
      { name: Entidad.name, schema: EntidadSchema },
    ]),
    // 2. Luego otros módulos
    OtroModule,
    // 3. forwardRef para dependencias circulares
    forwardRef(() => ModuloCircular),
  ],
  controllers: [EntidadController],
  providers: [EntidadService],
  exports: [EntidadService], // Exportar solo lo necesario
})
export class EntidadModule {}
```

### Estructura de Controladores

```typescript
import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';

@Controller('entidades') // Plural, kebab-case
export class EntidadesController {
  constructor(private readonly entidadesService: EntidadesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createEntidadDto: CreateEntidadDto) {
    return this.entidadesService.create(createEntidadDto);
  }

  @Get()
  findAll() {
    return this.entidadesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.entidadesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEntidadDto: UpdateEntidadDto) {
    return this.entidadesService.update(id, updateEntidadDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.entidadesService.remove(id);
  }
}
```

### Estructura de Servicios

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

@Injectable()
export class EntidadesService {
  constructor(
    @InjectModel(Entidad.name)
    private entidadModel: Model<EntidadDocument>,
    // Inyectar otros servicios después del modelo
    private otroService: OtroService,
  ) {}

  // Métodos CRUD en orden: create, findAll, findOne, update, remove
  async create(createDto: CreateEntidadDto): Promise<EntidadDocument> {
    const nueva = new this.entidadModel(createDto);
    return nueva.save();
  }

  async findAll(): Promise<EntidadDocument[]> {
    return this.entidadModel.find({ activo: true }).exec();
  }

  async findOne(id: string): Promise<EntidadDocument> {
    const entidad = await this.entidadModel.findById(id).exec();
    if (!entidad) {
      throw new NotFoundException(`Entidad con ID ${id} no encontrada`);
    }
    return entidad;
  }

  async update(id: string, updateDto: UpdateEntidadDto): Promise<EntidadDocument> {
    const actualizada = await this.entidadModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();
    if (!actualizada) {
      throw new NotFoundException(`Entidad con ID ${id} no encontrada`);
    }
    return actualizada;
  }

  async remove(id: string): Promise<void> {
    // Soft delete
    const resultado = await this.entidadModel
      .findByIdAndUpdate(id, { activo: false })
      .exec();
    if (!resultado) {
      throw new NotFoundException(`Entidad con ID ${id} no encontrada`);
    }
  }
}
```

### Estructura de Schemas (Mongoose)

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EntidadDocument = Entidad & Document;

// Enums relacionados al schema van en el mismo archivo
export enum EstadoEntidad {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
}

// Sub-documentos como clases separadas
@Schema()
export class SubDocumento {
  @Prop({ required: true })
  campo: string;
}

const SubDocumentoSchema = SchemaFactory.createForClass(SubDocumento);

@Schema({ timestamps: true }) // Agrega createdAt y updatedAt
export class Entidad {
  // _id opcional para tipado
  _id?: Types.ObjectId;

  // Referencias a otros documentos
  @Prop({ type: Types.ObjectId, ref: 'OtraEntidad', required: true })
  otraEntidadId: Types.ObjectId;

  // Nombre denormalizado para optimización
  @Prop({ required: true })
  nombreOtraEntidad: string;

  // Campos requeridos
  @Prop({ required: true })
  nombre: string;

  // Campos opcionales con default
  @Prop({ default: 0 })
  contador: number;

  // Campos con enum
  @Prop({ type: String, enum: EstadoEntidad, default: EstadoEntidad.ACTIVO })
  estado: EstadoEntidad;

  // Arrays de sub-documentos
  @Prop({ type: [SubDocumentoSchema], default: [] })
  subDocumentos: SubDocumento[];

  // Soft delete flag
  @Prop({ default: true })
  activo: boolean;
}

export const EntidadSchema = SchemaFactory.createForClass(Entidad);
```

### Estructura de DTOs

```typescript
// create-entidad.dto.ts
import { IsString, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

// DTOs anidados primero
export class SubItemDto {
  @IsString()
  campo: string;

  @IsNumber()
  @Min(0)
  valor: number;
}

export class CreateEntidadDto {
  // Campos requeridos primero
  @IsString()
  nombre: string;

  @IsNumber()
  @Min(0)
  precio: number;

  // Campos opcionales después
  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsEnum(TipoEntidad)
  tipo?: TipoEntidad;

  // Arrays con validación anidada
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubItemDto)
  items?: SubItemDto[];
}

// update-entidad.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateEntidadDto } from './create-entidad.dto';

export class UpdateEntidadDto extends PartialType(CreateEntidadDto) {}
```

### Reglas de Imports

Ordenar imports en este orden, separados por línea en blanco:

```typescript
// 1. Módulos de NestJS
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

// 2. Librerías externas
import { Model, Types } from 'mongoose';

// 3. Módulos/archivos internos del proyecto
import { Producto, ProductoDocument } from './schemas/producto.schema';
import { CreateProductoDto } from './dto/create-producto.dto';
import { OtroService } from '../otro/otro.service';
```

### Manejo de Errores

```typescript
// Usar excepciones HTTP de NestJS
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

// No encontrado
throw new NotFoundException(`Producto con ID ${id} no encontrado`);

// Validación de negocio
throw new BadRequestException('Stock insuficiente para realizar la venta');

// Conflicto de datos
throw new ConflictException('Ya existe un producto con ese código');
```

### Tipos y Retornos

```typescript
// SIEMPRE tipar retornos de métodos async
async findAll(): Promise<ProductoDocument[]> {
  return this.productoModel.find().exec();
}

async findOne(id: string): Promise<ProductoDocument> {
  // ...
}

async create(dto: CreateProductoDto): Promise<ProductoDocument> {
  // ...
}

async remove(id: string): Promise<void> {
  // ...
}

// Para estadísticas o respuestas complejas, definir interface
interface EstadisticasProducto {
  total: number;
  conStock: number;
  sinStock: number;
}

async getEstadisticas(): Promise<EstadisticasProducto> {
  // ...
}
```

### Conversión de ObjectId

```typescript
// Convertir string a ObjectId para referencias
import { Types } from 'mongoose';

const objectId = new Types.ObjectId(stringId);

// En queries
await this.model.find({ campoRef: new Types.ObjectId(id) });
```

### Queries de Mongoose

```typescript
// Usar .exec() al final de queries
await this.model.find().exec();
await this.model.findById(id).exec();
await this.model.findByIdAndUpdate(id, data, { new: true }).exec();

// Populate para relaciones
await this.model.find().populate('campoRef', 'campo1 campo2').exec();

// Filtrar por activos
await this.model.find({ activo: true }).exec();

// Ordenamiento
await this.model.find().sort({ createdAt: -1 }).exec();

// Paginación
await this.model.find().skip(offset).limit(limit).exec();
```

### Inyección de Dependencias Circulares

```typescript
// En el módulo
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [forwardRef(() => OtroModule)],
})

// En el servicio
import { Inject, forwardRef } from '@nestjs/common';

@Injectable()
export class MiService {
  constructor(
    @Inject(forwardRef(() => OtroService))
    private otroService: OtroService,
  ) {}
}
```

## Módulos de Tienda Online

### Auth Module - Autenticación OTP

Sistema de autenticación sin contraseña usando códigos OTP por email.

**Estructura:**
```
src/auth/
├── decorators/
│   ├── current-user.decorator.ts   # @CurrentUser() para obtener usuario actual
│   └── roles.decorator.ts          # @Roles() para definir roles requeridos
├── guards/
│   ├── jwt-auth.guard.ts           # Guard para rutas protegidas
│   └── roles.guard.ts              # Guard para verificar roles
├── strategies/
│   └── jwt.strategy.ts             # Passport JWT strategy
├── dto/
│   ├── request-otp.dto.ts
│   ├── verify-otp.dto.ts
│   └── update-profile.dto.ts
├── schemas/
│   ├── usuario.schema.ts           # Usuario con roles
│   └── otp-code.schema.ts          # Códigos OTP temporales
├── auth.controller.ts
├── auth.service.ts
└── auth.module.ts
```

**Endpoints:**
- `POST /api/auth/request-otp` - Solicita OTP (crea usuario si no existe)
- `POST /api/auth/verify-otp` - Verifica OTP y retorna JWT
- `GET /api/auth/profile` - Obtiene perfil (requiere auth)
- `PATCH /api/auth/profile` - Actualiza perfil (requiere auth)

**Uso de Guards:**
```typescript
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('protected')
@UseGuards(JwtAuthGuard)
export class ProtectedController {
  @Get()
  getData(@CurrentUser() user: CurrentUserData) {
    return { userId: user.id, email: user.email };
  }
}
```

### Email Module - Servicio de Correos

Servicio para envío de emails usando Nodemailer.

**Estructura:**
```
src/email/
├── email.service.ts
└── email.module.ts
```

**Variables de entorno requeridas:**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-app-password
```

### Catalog Module - Catálogo Público

API pública para consultar productos visibles en la tienda.

**Estructura:**
```
src/catalog/
├── dto/
│   └── catalog-query.dto.ts    # Filtros de búsqueda
├── catalog.controller.ts
├── catalog.service.ts
└── catalog.module.ts
```

**Endpoints:**
- `GET /api/catalog/products` - Lista con paginación y filtros
- `GET /api/catalog/products/featured` - Productos destacados
- `GET /api/catalog/products/best-sellers` - Más vendidos
- `GET /api/catalog/products/:id` - Detalle de producto
- `GET /api/catalog/products/:id/stock` - Verificar stock
- `GET /api/catalog/brands` - Lista de marcas

**Filtros disponibles:**
```typescript
interface CatalogQueryDto {
  page?: number;          // Página (default: 1)
  limit?: number;         // Items por página (default: 12)
  search?: string;        // Búsqueda por nombre
  marcaId?: string;       // Filtrar por marca
  minPrice?: number;      // Precio mínimo
  maxPrice?: number;      // Precio máximo
  sortBy?: string;        // Campo de ordenamiento
  sortOrder?: 'asc' | 'desc';
}
```

### Cart Module - Carrito de Compras

Carrito persistente para usuarios autenticados.

**Estructura:**
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

**Endpoints (todos requieren auth):**
- `GET /api/cart` - Obtener carrito
- `POST /api/cart/items` - Agregar producto
- `PATCH /api/cart/items/:productId` - Actualizar cantidad
- `DELETE /api/cart/items/:productId` - Eliminar producto
- `DELETE /api/cart` - Vaciar carrito
- `POST /api/cart/merge` - Fusionar carrito anónimo
- `GET /api/cart/validate` - Validar stock de items

## Sistema de Envíos

### Geography Module - Gestión Geográfica

Manejo de departamentos, ciudades y zonas de envío de Colombia.

**Estructura:**
```
src/geography/
├── data/
│   └── colombia-seed.data.ts   # Datos de Colombia (33 dptos, 150+ ciudades)
├── dto/
│   ├── create-departamento.dto.ts
│   ├── create-ciudad.dto.ts
│   ├── create-zona-envio.dto.ts
│   └── index.ts
├── schemas/
│   ├── departamento.schema.ts
│   ├── ciudad.schema.ts
│   └── zona-envio.schema.ts
├── geography.controller.ts
├── geography.service.ts
├── geography-seeder.service.ts
└── geography.module.ts
```

**Endpoints principales:**
- `GET /api/geography/departamentos` - Lista departamentos
- `GET /api/geography/departamentos/:id/ciudades` - Ciudades por departamento
- `GET /api/geography/zonas-envio` - Lista zonas de envío
- `GET /api/geography/zonas-envio/ciudad/:ciudadId` - Zonas para una ciudad
- `GET /api/geography/verificar-cobertura/:ciudadId` - Verificar si hay envío
- `POST /api/geography/seed` - Poblar datos de Colombia

**Zonas predefinidas en seed:**
- Área Metropolitana Medellín
- Área Metropolitana Bogotá
- Área Metropolitana Cali
- Área Metropolitana Barranquilla
- Área Metropolitana Bucaramanga
- Eje Cafetero
- Costa Caribe
- Nacional (todo el país)

### Shipping Module - Sistema de Envíos

Cálculo dinámico de costos de envío con reglas configurables.

**Estructura:**
```
src/shipping/
├── dto/
│   ├── create-transportadora.dto.ts
│   ├── create-metodo-envio.dto.ts
│   ├── calcular-envio.dto.ts
│   └── index.ts
├── schemas/
│   ├── transportadora.schema.ts
│   └── metodo-envio.schema.ts
├── shipping.controller.ts
├── shipping.service.ts
├── shipping-calculator.service.ts   # Lógica de cálculo
└── shipping.module.ts
```

**Enums de MetodoEnvio:**
```typescript
enum TipoCosto {
  FIJO = 'FIJO',              // Precio fijo
  POR_PESO = 'POR_PESO',      // Costo base + (peso × costoPorKg)
  POR_VOLUMEN = 'POR_VOLUMEN', // Costo base + (volumen × costoPorM3)
  ESCALONADO = 'ESCALONADO',   // Por rangos de peso
}

enum TipoAplicacion {
  EXCLUSIVA = 'EXCLUSIVA',    // Solo aplica una regla
  COMBINABLE = 'COMBINABLE',  // Se pueden combinar reglas
}
```

**Crear método de envío:**
```typescript
POST /api/shipping/metodos
{
  "nombre": "Envío Área Metropolitana",
  "codigo": "ENVIO_METRO_MDE",
  "tipoCosto": "FIJO",
  "configuracionCosto": {
    "costoBase": 15000
  },
  "condiciones": {
    "montoMinimoGratis": 200000,    // Gratis si compra > 200k
    "cantidadMinimaGratis": 5,      // Gratis si > 5 productos
    "pesoMaximo": 20                // Máximo 20kg
  },
  "cobertura": {
    "nacional": false,
    "zonasEnvioIds": ["<zona_id>"]
  },
  "transportadoraId": "<transportadora_id>",
  "tiempoEstimadoMinDias": 1,
  "tiempoEstimadoMaxDias": 3,
  "vigencia": {                     // Opcional: promoción temporal
    "fechaInicio": "2024-01-01",
    "fechaFin": "2024-01-31",
    "diasSemana": [1, 2, 3, 4, 5]   // Solo Lunes a Viernes
  },
  "restricciones": {
    "productosExcluidos": [],
    "categoriasExcluidas": ["FRAGIL"],
    "valorRequiereSeguro": 500000,
    "porcentajeSeguro": 2
  },
  "prioridad": 10
}
```

**Calcular envío:**
```typescript
POST /api/shipping/calcular
{
  "ciudadId": "<medellin_id>",
  "productos": [
    {
      "productoId": "xxx",
      "cantidad": 2,
      "precioUnitario": 120000,
      "peso": 0.5,
      "categoria": "PERFUME"
    }
  ],
  "subtotal": 240000  // Opcional, se calcula si no se envía
}

// Respuesta:
{
  "ciudadId": "...",
  "ciudadNombre": "Medellín",
  "departamentoNombre": "Antioquia",
  "subtotalCarrito": 240000,
  "cantidadProductos": 2,
  "pesoTotal": 1,
  "metodosDisponibles": [
    {
      "metodoId": "...",
      "metodoNombre": "Envío Área Metropolitana",
      "metodoCodigo": "ENVIO_METRO_MDE",
      "transportadora": {
        "nombre": "Servientrega",
        "tiempoEstimadoMin": 1,
        "tiempoEstimadoMax": 3
      },
      "costoOriginal": 15000,
      "costoFinal": 0,
      "esGratis": true,
      "razonGratis": "Envío gratis por compra superior a $200,000",
      "reglasAplicadas": ["Costo fijo: $15,000", "Envío gratis por compra superior a $200,000"],
      "restricciones": [],
      "disponible": true
    }
  ],
  "metodoRecomendado": { ... }
}
```

**Transportadoras en seed:**
- Servientrega
- Coordinadora
- Inter Rapidísimo
- Envía
- TCC
- Deprisa

## Addresses Module - Direcciones de Usuario

Sistema de direcciones guardadas para usuarios autenticados.

**Estructura:**
```
src/addresses/
├── dto/
│   ├── create-address.dto.ts
│   ├── update-address.dto.ts
│   └── index.ts
├── schemas/
│   └── address.schema.ts
├── addresses.controller.ts
├── addresses.service.ts
└── addresses.module.ts
```

**Endpoints (todos requieren auth):**
- `POST /api/addresses` - Crear dirección
- `GET /api/addresses` - Listar direcciones
- `GET /api/addresses?ciudadId=xxx` - Filtrar por ciudad
- `GET /api/addresses/default` - Obtener predeterminada
- `GET /api/addresses/:id` - Obtener una
- `PATCH /api/addresses/:id` - Actualizar
- `PATCH /api/addresses/:id/default` - Marcar como predeterminada
- `DELETE /api/addresses/:id` - Eliminar (soft delete)

**Schema:**
```typescript
interface Address {
  userId: Types.ObjectId;           // Usuario propietario
  label: string;                    // "Casa", "Oficina"
  fullName: string;                 // Nombre de quien recibe
  phone: string;
  departamentoId: Types.ObjectId;
  departamentoNombre: string;
  ciudadId: Types.ObjectId;
  ciudadNombre: string;
  address: string;                  // Dirección principal
  addressDetail?: string;           // Apto, piso, etc.
  postalCode?: string;
  notes?: string;                   // Instrucciones de entrega
  isDefault: boolean;               // Dirección predeterminada
  activo: boolean;
}
```

## Payments Module - Sistema de Pagos

Sistema de procesamiento de pagos con múltiples proveedores.

**Estructura:**
```
src/payments/
├── interfaces/
│   └── payment-provider.interface.ts  # Contrato para proveedores
├── providers/
│   ├── wompi.provider.ts              # Integración Wompi
│   └── cash-on-delivery.provider.ts   # Contra entrega
├── dto/
│   ├── create-payment.dto.ts
│   └── index.ts
├── schemas/
│   └── transaction.schema.ts
├── payments.controller.ts
├── payments.service.ts
└── payments.module.ts
```

**Proveedores disponibles:**
```typescript
enum PaymentProvider {
  WOMPI = 'WOMPI',
  EPAYCO = 'EPAYCO',           // Pendiente implementación
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  ADDI = 'ADDI',               // Pendiente implementación
  SISTECREDITO = 'SISTECREDITO' // Pendiente implementación
}
```

**Estados de transacción:**
```typescript
enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  VOIDED = 'VOIDED',
  REFUNDED = 'REFUNDED',
  ERROR = 'ERROR',
  EXPIRED = 'EXPIRED',
}
```

**Variables de entorno Wompi:**
```env
WOMPI_PUBLIC_KEY=pub_test_xxx
WOMPI_PRIVATE_KEY=prv_test_xxx
WOMPI_EVENTS_KEY=events_xxx
WOMPI_INTEGRITY_KEY=integrity_xxx
```

**Crear pago:**
```typescript
POST /api/payments
{
  "orderId": "<order_id>",
  "provider": "WOMPI",
  "amount": 240000,
  "customerEmail": "cliente@email.com",
  "customerName": "Juan Pérez",
  "customerPhone": "3001234567",
  "description": "Pedido AST-240101-XXXX",
  "redirectUrl": "https://tienda.com/confirmacion"
}
// Retorna: transaction con paymentUrl para redirigir al usuario
```

## Orders Module - Órdenes de E-commerce

Sistema de gestión de órdenes para tienda online.

**Estructura:**
```
src/orders/
├── dto/
│   ├── create-order.dto.ts
│   └── index.ts
├── schemas/
│   └── order.schema.ts
├── orders.controller.ts
├── orders.service.ts
└── orders.module.ts
```

**Estados de orden:**
```typescript
enum OrderStatus {
  PENDING = 'PENDING',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}
```

**Métodos de pago:**
```typescript
enum PaymentMethodType {
  WOMPI = 'WOMPI',
  EPAYCO = 'EPAYCO',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  ADDI = 'ADDI',
  SISTECREDITO = 'SISTECREDITO',
}
```

**Crear orden con pago:**
```typescript
POST /api/orders/with-payment
{
  "userId": "<user_id>",           // Obligatorio
  "customerEmail": "cliente@email.com",
  "customerName": "Juan Pérez",
  "customerPhone": "3001234567",
  "addressId": "<address_id>",     // O shippingAddress inline
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
// Retorna: { order, paymentUrl }
```

**Flujo de checkout:**
```
1. Usuario autenticado (OTP)
2. Carrito con productos
3. Selecciona/crea dirección (AddressesModule)
4. Selecciona método de envío (ShippingModule)
5. Crea orden con pago (OrdersModule + PaymentsModule)
6. Usuario paga en Wompi
7. Webhook actualiza estado de pago
8. confirmPayment() crea Venta y descuenta stock
9. Orden lista para preparación y envío
```

**Integración Orders → Ventas:**
Cuando se llama `confirmPayment(orderId)`:
1. Verifica que no exista venta duplicada
2. Llama a `ventasService.createFromOrder()`
3. Se descuenta stock de cada producto
4. Se incrementa `totalVendido`
5. Se crea venta con `canal: ECOMMERCE`, `estado: COMPLETADA`
6. Orden cambia a `PAYMENT_CONFIRMED`

## Production Ready Features

### Seguridad

**Helmet:** Headers de seguridad HTTP configurados en `main.ts`.

**Rate Limiting:** Configurado con `@nestjs/throttler`:
- Short: 10 requests/segundo
- Medium: 50 requests/10 segundos
- Long: 200 requests/minuto

**Protección de Endpoints Admin:**
Los siguientes controladores requieren `@UseGuards(JwtAuthGuard, RolesGuard)` y `@Roles(RolUsuario.ADMIN)`:
- ProductosController
- ClientesController
- VentasController
- CobrosController
- MarcasController
- AcordesController

### Health Checks

**Estructura:**
```
src/health/
├── health.controller.ts
└── health.module.ts
```

**Endpoints:**
- `GET /api/health` - Verifica MongoDB y dependencias
- `GET /api/health/ping` - Health check simple

### Global Exception Filter

**Estructura:**
```
src/common/filters/
└── http-exception.filter.ts
```

Todas las respuestas de error siguen el formato:
```typescript
{
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error?: string;
}
```

### Logging con Winston

**Archivos de log:**
```
logs/
├── error.log      # Solo errores
└── combined.log   # Todos los logs
```

**Uso en servicios:**
```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class MiService {
  private readonly logger = new Logger(MiService.name);

  async miMetodo() {
    this.logger.log('Info');
    this.logger.warn('Warning');
    this.logger.error('Error', stack);
  }
}
```

### Emails Transaccionales

El `EmailService` tiene métodos para enviar notificaciones automáticas:

| Método | Trigger | Contenido |
|--------|---------|-----------|
| `sendOrderConfirmation()` | Crear orden | Resumen del pedido |
| `sendPaymentConfirmation()` | Confirmar pago | Confirmación visual |
| `sendShippingNotification()` | Actualizar tracking | Guía y link de rastreo |
| `sendDeliveryConfirmation()` | Marcar entregado | Confirmación de entrega |

Los emails se envían de forma asíncrona (no bloquean la respuesta).

### Variables de Entorno Adicionales

```env
# CORS (separados por coma)
CORS_ORIGINS=http://localhost:4200,https://mitienda.com

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password
EMAIL_FROM=noreply@astralis.com
```

### Dependencias de Producción

```json
{
  "helmet": "^7.x",
  "@nestjs/throttler": "^5.x",
  "@nestjs/terminus": "^10.x",
  "winston": "^3.x",
  "nest-winston": "^1.x",
  "@nestjs/swagger": "^7.x"
}
```

## Swagger / OpenAPI

Documentación interactiva disponible en `http://localhost:3000/docs`.

**Configuración en `main.ts`:**
```typescript
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('Astralis API')
  .setVersion('1.0')
  .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT-auth')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('docs', app, document);
```

**Plugin CLI (`nest-cli.json`):**
```json
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

**Decoradores en controladores:**
```typescript
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Products')
@ApiBearerAuth('JWT-auth')
@Controller('products')
export class ProductsController {
  @ApiOperation({ summary: 'List all products' })
  @Get()
  findAll() {}
}
```

## Coupons Module - Sistema de Cupones

Sistema de descuentos por código promocional.

**Estructura:**
```
src/coupons/
├── dto/
│   ├── create-coupon.dto.ts
│   ├── update-coupon.dto.ts
│   ├── apply-coupon.dto.ts
│   └── index.ts
├── schemas/
│   ├── coupon.schema.ts
│   └── coupon-usage.schema.ts
├── coupons.controller.ts
├── coupons.service.ts
└── coupons.module.ts
```

**Tipos de descuento:**
```typescript
enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',     // Descuento porcentual
  FIXED_AMOUNT = 'FIXED_AMOUNT', // Monto fijo
}

enum CouponStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
}
```

**Schema del Cupón:**
```typescript
interface Coupon {
  code: string;                    // Código único (uppercase)
  description: string;
  discountType: DiscountType;
  discountValue: number;           // Porcentaje o monto
  minPurchaseAmount?: number;      // Monto mínimo de compra
  maxDiscountAmount?: number;      // Límite de descuento
  startDate: Date;
  endDate: Date;
  usageLimit?: number;             // Límite global de usos
  usageCount: number;              // Usos actuales
  usageLimitPerUser?: number;      // Límite por usuario
  applicableProducts: ObjectId[];  // Productos aplicables
  applicableCategories: string[];  // Categorías aplicables
  applicableBrands: ObjectId[];    // Marcas aplicables
  firstPurchaseOnly: boolean;      // Solo primera compra
  status: CouponStatus;
}
```

**Endpoints:**
- `POST /api/coupons/apply` - Aplicar cupón (auth)
- `POST /api/coupons/validate` - Validar cupón (auth)
- `POST /api/coupons` - Crear cupón (admin)
- `GET /api/coupons` - Listar cupones (admin)
- `GET /api/coupons/:id/stats` - Estadísticas de uso (admin)
- `PATCH /api/coupons/:id` - Actualizar (admin)
- `DELETE /api/coupons/:id` - Eliminar (admin)

**Aplicar cupón:**
```typescript
POST /api/coupons/apply
{
  "code": "DESCUENTO20",
  "items": [
    { "productoId": "xxx", "cantidad": 2, "precioUnitario": 120000 }
  ],
  "subtotal": 240000
}

// Respuesta:
{
  "code": "DESCUENTO20",
  "discountType": "PERCENTAGE",
  "discountValue": 20,
  "discountAmount": 48000,
  "applicableItems": ["xxx"]
}
```

## Wishlist Module - Lista de Deseos

Lista de productos favoritos para usuarios autenticados.

**Estructura:**
```
src/wishlist/
├── dto/
│   └── add-to-wishlist.dto.ts
├── schemas/
│   └── wishlist.schema.ts
├── wishlist.controller.ts
├── wishlist.service.ts
└── wishlist.module.ts
```

**Schema:**
```typescript
interface Wishlist {
  userId: ObjectId;
  items: WishlistItem[];
}

interface WishlistItem {
  productoId: ObjectId;
  nombre: string;
  imagen: string;
  precio: number;
  addedAt: Date;
}
```

**Endpoints (todos requieren auth):**
- `GET /api/wishlist` - Obtener lista
- `GET /api/wishlist/count` - Cantidad de items
- `GET /api/wishlist/check/:productoId` - Verificar si está en lista
- `POST /api/wishlist` - Agregar producto
- `DELETE /api/wishlist/:productoId` - Eliminar producto
- `DELETE /api/wishlist` - Vaciar lista

**Respuesta con stock actualizado:**
```typescript
{
  "items": [
    {
      "productoId": "xxx",
      "nombre": "Perfume XYZ",
      "imagen": "https://...",
      "precio": 120000,
      "addedAt": "2024-01-15T10:00:00Z",
      "inStock": true
    }
  ],
  "total": 1
}
```

## Reviews Module - Reseñas y Calificaciones

Sistema de reseñas de productos con moderación.

**Estructura:**
```
src/reviews/
├── dto/
│   ├── create-review.dto.ts
│   ├── update-review.dto.ts
│   └── index.ts
├── schemas/
│   └── review.schema.ts
├── reviews.controller.ts
├── reviews.service.ts
└── reviews.module.ts
```

**Estados de reseña:**
```typescript
enum ReviewStatus {
  PENDING = 'PENDING',     // Pendiente de moderación
  APPROVED = 'APPROVED',   // Aprobada y visible
  REJECTED = 'REJECTED',   // Rechazada
}
```

**Schema:**
```typescript
interface Review {
  productoId: ObjectId;
  userId: ObjectId;
  userName: string;
  orderId?: ObjectId;           // Para verificar compra
  rating: number;               // 1-5 estrellas
  title?: string;
  comment?: string;
  images: string[];
  verifiedPurchase: boolean;    // Compra verificada
  status: ReviewStatus;
  helpfulCount: number;         // Votos "útil"
  helpfulVotes: ObjectId[];     // Usuarios que votaron
  adminResponse?: string;       // Respuesta del admin
  adminResponseAt?: Date;
}
```

**Endpoints públicos:**
- `GET /api/reviews/product/:productoId` - Reseñas de producto
- `GET /api/reviews/product/:productoId/stats` - Estadísticas
- `GET /api/reviews/:id` - Obtener reseña

**Endpoints autenticados:**
- `POST /api/reviews` - Crear reseña
- `GET /api/reviews/can-review/:productoId` - Verificar si puede
- `GET /api/reviews/user/me` - Mis reseñas
- `PATCH /api/reviews/:id` - Actualizar mi reseña
- `DELETE /api/reviews/:id` - Eliminar mi reseña
- `POST /api/reviews/:id/helpful` - Marcar como útil

**Endpoints admin:**
- `GET /api/reviews/admin/pending` - Reseñas pendientes
- `PATCH /api/reviews/admin/:id` - Moderar reseña
- `DELETE /api/reviews/admin/:id` - Eliminar reseña

**Estadísticas de producto:**
```typescript
GET /api/reviews/product/:id/stats

{
  "averageRating": 4.2,
  "totalReviews": 15,
  "ratingDistribution": {
    "1": 1,
    "2": 0,
    "3": 2,
    "4": 5,
    "5": 7
  },
  "verifiedPurchaseCount": 12
}
```

**Crear reseña:**
```typescript
POST /api/reviews
{
  "productoId": "xxx",
  "rating": 5,
  "title": "Excelente producto",
  "comment": "Muy buena calidad y fragancia duradera",
  "images": ["https://..."],
  "orderId": "xxx"  // Opcional, para verificar compra
}
```
