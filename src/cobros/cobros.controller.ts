import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CobrosService, CobroVirtual } from './cobros.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../auth/schemas/usuario.schema';

@ApiTags('Admin - Cobros')
@ApiBearerAuth('JWT-auth')
@Controller('cobros')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN)
export class CobrosController {
  constructor(private readonly cobrosService: CobrosService) {}

  @Get()
  findAll(): Promise<CobroVirtual[]> {
    return this.cobrosService.findAll();
  }

  @Get('pendientes')
  findPendientes(): Promise<CobroVirtual[]> {
    return this.cobrosService.findPendientes();
  }

  @Get('pagados')
  findPagados(): Promise<CobroVirtual[]> {
    return this.cobrosService.findPagados();
  }

  @Get('proxima-quincena')
  findProximaQuincena(): Promise<CobroVirtual[]> {
    return this.cobrosService.findProximaQuincena();
  }

  @Get('vencidos')
  findVencidos(): Promise<CobroVirtual[]> {
    return this.cobrosService.findVencidos();
  }

  @Get('totales')
  obtenerTotales() {
    return this.cobrosService.obtenerTotales();
  }

  @Get('cliente/:clienteId')
  findByCliente(@Param('clienteId') clienteId: string): Promise<CobroVirtual[]> {
    return this.cobrosService.findByCliente(clienteId);
  }

  // YA NO NECESITAMOS EL ENDPOINT DE REGISTRAR PAGO
  // Los pagos se hacen a través de /ventas/:id/abonar-cuota
}