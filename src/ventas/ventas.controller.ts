import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { AbonarCuotaDto } from './dto/abonar-cuota.dto';
import { EstadoVenta, CanalVenta, TipoVenta } from './schemas/venta.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../auth/schemas/usuario.schema';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('Admin - Ventas')
@ApiBearerAuth('JWT-auth')
@Controller('ventas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN)
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  // ==================== CRUD BÁSICO ====================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear venta (con validación de crédito y márgenes)' })
  create(
    @Body() createVentaDto: CreateVentaDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.ventasService.create(createVentaDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las ventas' })
  findAll() {
    return this.ventasService.findAll();
  }

  @Get('buscar')
  @ApiOperation({ summary: 'Búsqueda avanzada con filtros y paginación' })
  @ApiQuery({ name: 'estado', required: false, enum: EstadoVenta })
  @ApiQuery({ name: 'canal', required: false, enum: CanalVenta })
  @ApiQuery({ name: 'tipoVenta', required: false, enum: TipoVenta })
  @ApiQuery({ name: 'clienteId', required: false })
  @ApiQuery({ name: 'desde', required: false, description: 'Fecha inicio (ISO)' })
  @ApiQuery({ name: 'hasta', required: false, description: 'Fecha fin (ISO)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findWithFilters(
    @Query('estado') estado?: EstadoVenta,
    @Query('canal') canal?: CanalVenta,
    @Query('tipoVenta') tipoVenta?: TipoVenta,
    @Query('clienteId') clienteId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ventasService.findWithFilters({
      estado,
      canal,
      tipoVenta,
      clienteId,
      desde: desde ? new Date(desde) : undefined,
      hasta: hasta ? new Date(hasta) : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  // ==================== ESTADÍSTICAS ====================

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard completo de estadísticas' })
  @ApiQuery({ name: 'desde', required: false })
  @ApiQuery({ name: 'hasta', required: false })
  getDashboard(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.ventasService.getDashboardStats({
      startDate: desde ? new Date(desde) : undefined,
      endDate: hasta ? new Date(hasta) : undefined,
    });
  }

  @Get('estadisticas')
  @ApiOperation({ summary: 'Estadísticas básicas de ventas' })
  getEstadisticas(
    @Query('canal') canal?: CanalVenta,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.ventasService.getEstadisticas({
      canal,
      startDate: desde ? new Date(desde) : undefined,
      endDate: hasta ? new Date(hasta) : undefined,
    });
  }

  // ==================== FILTROS RÁPIDOS ====================

  @Get('activas')
  @ApiOperation({ summary: 'Listar ventas activas' })
  findActivas() {
    return this.ventasService.findActivas();
  }

  @Get('completadas')
  @ApiOperation({ summary: 'Listar ventas completadas' })
  findCompletadas() {
    return this.ventasService.findCompletadas();
  }

  @Get('cliente/:clienteId')
  @ApiOperation({ summary: 'Ventas de un cliente' })
  findByCliente(@Param('clienteId') clienteId: string) {
    return this.ventasService.findByCliente(clienteId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener venta por ID' })
  findOne(@Param('id') id: string) {
    return this.ventasService.findOne(id);
  }

  // ==================== PAGOS ====================

  @Patch(':id/pagar-cuota')
  @ApiOperation({ summary: 'Pagar cuota completa (legacy)' })
  pagarCuota(
    @Param('id') id: string,
    @Body('numeroCuota') numeroCuota: number,
    @Body('fechaPago') fechaPago: Date,
  ) {
    return this.ventasService.registrarPagoCuota(id, numeroCuota, fechaPago);
  }

  @Patch(':id/abonar-cuota')
  @ApiOperation({ summary: 'Abonar a cuota (con auditoría completa)' })
  abonarCuota(
    @Param('id') id: string,
    @Body() abonarCuotaDto: AbonarCuotaDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.ventasService.abonarCuota(id, abonarCuotaDto, user.id);
  }

  // ==================== ACCIONES ====================

  @Post(':id/cancelar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar venta' })
  cancelarVenta(
    @Param('id') id: string,
    @Body('motivo') motivo: string,
    @Body('devolverStock') devolverStock: boolean = true,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.ventasService.cancelarVenta(id, motivo, user.id, devolverStock);
  }

  // ==================== TAREAS DE MANTENIMIENTO ====================

  @Post('verificar-vencimientos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar y actualizar estados de vencimiento' })
  verificarVencimientos() {
    return this.ventasService.verificarVencimientos();
  }

  @Post('calcular-moras')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calcular intereses de mora en cuotas vencidas' })
  calcularMoras() {
    return this.ventasService.calcularMorasCuotasVencidas();
  }
}