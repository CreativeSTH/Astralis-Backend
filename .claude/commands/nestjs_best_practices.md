# Convenciones de Código NestJS/TypeScript

Aplica estas convenciones al escribir o modificar código en este proyecto NestJS.

---

## Nomenclatura de Archivos

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

---

## Nomenclatura de Clases y Variables

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

---

## Estructura de Módulos

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

---

## Estructura de Controladores

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

---

## Estructura de Servicios

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

---

## Estructura de Schemas (Mongoose)

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

---

## Estructura de DTOs

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

---

## Reglas de Imports

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

---

## Manejo de Errores

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

---

## Tipos y Retornos

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

---

## Conversión de ObjectId

```typescript
// Convertir string a ObjectId para referencias
import { Types } from 'mongoose';

const objectId = new Types.ObjectId(stringId);

// En queries
await this.model.find({ campoRef: new Types.ObjectId(id) });
```

---

## Queries de Mongoose

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

---

## Inyección de Dependencias Circulares

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
