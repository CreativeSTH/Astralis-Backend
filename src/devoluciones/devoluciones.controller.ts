import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { DevolucionesService } from './devoluciones.service';
import { CreateDevolucionDto } from './dto/create-devolucion.dto';
import { AprobarDevolucionDto } from './dto/aprobar-devolucion.dto';
import { RechazarDevolucionDto } from './dto/rechazar-devolucion.dto';
import { EstadoDevolucion } from './schemas/devolucion.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../auth/schemas/usuario.schema';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('Admin - Devoluciones')
@ApiBearerAuth('JWT-auth')
@Controller('devoluciones')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN)
export class DevolucionesController {
  constructor(private readonly devolucionesService: DevolucionesService) {}

  // ==================== CRUD BÁSICO ====================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear solicitud de devolución' })
  create(
    @Body() createDevolucionDto: CreateDevolucionDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.devolucionesService.create(createDevolucionDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las devoluciones' })
  findAll() {
    return this.devolucionesService.findAll();
  }

  @Get('buscar')
  @ApiOperation({ summary: 'Búsqueda avanzada con filtros y paginación' })
  @ApiQuery({ name: 'estado', required: false, enum: EstadoDevolucion })
  @ApiQuery({ name: 'clienteId', required: false })
  @ApiQuery({ name: 'ventaId', required: false })
  @ApiQuery({ name: 'desde', required: false, description: 'Fecha inicio (ISO)' })
  @ApiQuery({ name: 'hasta', required: false, description: 'Fecha fin (ISO)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findWithFilters(
    @Query('estado') estado?: EstadoDevolucion,
    @Query('clienteId') clienteId?: string,
    @Query('ventaId') ventaId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.devolucionesService.findWithFilters({
      estado,
      clienteId,
      ventaId,
      desde: desde ? new Date(desde) : undefined,
      hasta: hasta ? new Date(hasta) : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  // ==================== FILTROS RÁPIDOS ====================

  @Get('pendientes')
  @ApiOperation({ summary: 'Listar devoluciones pendientes de aprobación' })
  findPendientes() {
    return this.devolucionesService.findPendientes();
  }

  @Get('aprobadas')
  @ApiOperation({ summary: 'Listar devoluciones aprobadas (pendientes de procesar)' })
  findAprobadas() {
    return this.devolucionesService.findAprobadas();
  }

  @Get('estadisticas')
  @ApiOperation({ summary: 'Estadísticas de devoluciones' })
  getEstadisticas() {
    return this.devolucionesService.getEstadisticas();
  }

  @Get('venta/:ventaId')
  @ApiOperation({ summary: 'Devoluciones de una venta' })
  findByVenta(@Param('ventaId') ventaId: string) {
    return this.devolucionesService.findByVenta(ventaId);
  }

  @Get('cliente/:clienteId')
  @ApiOperation({ summary: 'Devoluciones de un cliente' })
  findByCliente(@Param('clienteId') clienteId: string) {
    return this.devolucionesService.findByCliente(clienteId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener devolución por ID' })
  findOne(@Param('id') id: string) {
    return this.devolucionesService.findOne(id);
  }

  // ==================== ACCIONES ====================

  @Post(':id/aprobar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aprobar devolución' })
  aprobar(
    @Param('id') id: string,
    @Body() aprobarDto: AprobarDevolucionDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.devolucionesService.aprobar(id, aprobarDto, user.id);
  }

  @Post(':id/rechazar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rechazar devolución' })
  rechazar(
    @Param('id') id: string,
    @Body() rechazarDto: RechazarDevolucionDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.devolucionesService.rechazar(id, rechazarDto, user.id);
  }

  @Post(':id/procesar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Procesar devolución (devolver stock, ajustar deuda)' })
  procesar(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.devolucionesService.procesar(id, user.id);
  }

  @Post(':id/cancelar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar devolución' })
  cancelar(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.devolucionesService.cancelar(id, user.id);
  }
}
