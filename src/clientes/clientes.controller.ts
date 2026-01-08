import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ClientesService } from './clientes.service';
import { CreateClienteDto, CreateNotaClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../auth/schemas/usuario.schema';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('Admin - Clientes')
@ApiBearerAuth('JWT-auth')
@Controller('clientes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN)
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  // ==================== CRUD BÁSICO ====================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear cliente' })
  create(@Body() createClienteDto: CreateClienteDto) {
    return this.clientesService.create(createClienteDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los clientes' })
  findAll() {
    return this.clientesService.findAll();
  }

  @Get('buscar')
  @ApiOperation({ summary: 'Búsqueda avanzada con filtros y paginación' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nombre o teléfono' })
  @ApiQuery({ name: 'scoreMin', required: false, description: 'Score mínimo' })
  @ApiQuery({ name: 'scoreMax', required: false, description: 'Score máximo' })
  @ApiQuery({ name: 'conDeuda', required: false, description: 'Filtrar por deuda (true/false)' })
  @ApiQuery({ name: 'bloqueados', required: false, description: 'Filtrar bloqueados (true/false)' })
  @ApiQuery({ name: 'page', required: false, description: 'Página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items por página (default: 20)' })
  findWithFilters(
    @Query('search') search?: string,
    @Query('scoreMin') scoreMin?: string,
    @Query('scoreMax') scoreMax?: string,
    @Query('conDeuda') conDeuda?: string,
    @Query('bloqueados') bloqueados?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.clientesService.findWithFilters({
      search,
      scoreMin: scoreMin ? parseInt(scoreMin) : undefined,
      scoreMax: scoreMax ? parseInt(scoreMax) : undefined,
      conDeuda: conDeuda !== undefined ? conDeuda === 'true' : undefined,
      bloqueados: bloqueados !== undefined ? bloqueados === 'true' : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('estadisticas')
  @ApiOperation({ summary: 'Obtener estadísticas de clientes' })
  getEstadisticas() {
    return this.clientesService.getEstadisticas();
  }

  @Get('score')
  @ApiOperation({ summary: 'Filtrar por rango de score' })
  findByScore(
    @Query('min') min: string,
    @Query('max') max: string,
  ) {
    const minScore = parseInt(min) || 0;
    const maxScore = parseInt(max) || 100;
    return this.clientesService.findByScore(minScore, maxScore);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cliente por ID' })
  findOne(@Param('id') id: string) {
    return this.clientesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar cliente' })
  update(@Param('id') id: string, @Body() updateClienteDto: UpdateClienteDto) {
    return this.clientesService.update(id, updateClienteDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar cliente (soft delete)' })
  remove(@Param('id') id: string) {
    return this.clientesService.remove(id);
  }

  // ==================== GESTIÓN DE CRÉDITO ====================

  @Get(':id/credito')
  @ApiOperation({ summary: 'Verificar crédito disponible del cliente' })
  @ApiQuery({ name: 'monto', required: true, description: 'Monto a solicitar' })
  verificarCredito(
    @Param('id') id: string,
    @Query('monto') monto: string,
  ) {
    return this.clientesService.verificarCreditoDisponible(id, parseFloat(monto) || 0);
  }

  @Post(':id/bloquear')
  @ApiOperation({ summary: 'Bloquear cliente por mora' })
  bloquearCliente(
    @Param('id') id: string,
    @Body('motivo') motivo: string,
  ) {
    return this.clientesService.bloquearPorMora(id, motivo);
  }

  @Post(':id/desbloquear')
  @ApiOperation({ summary: 'Desbloquear cliente' })
  desbloquearCliente(@Param('id') id: string) {
    return this.clientesService.desbloquear(id);
  }

  // ==================== NOTAS/HISTORIAL ====================

  @Get(':id/notas')
  @ApiOperation({ summary: 'Obtener notas del cliente' })
  obtenerNotas(@Param('id') id: string) {
    return this.clientesService.obtenerNotas(id);
  }

  @Post(':id/notas')
  @ApiOperation({ summary: 'Agregar nota al cliente' })
  agregarNota(
    @Param('id') id: string,
    @Body() nota: CreateNotaClienteDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.clientesService.agregarNota(id, nota, user.id);
  }
}