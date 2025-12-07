import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CobrosService } from './cobros.service';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';

@Controller('cobros')
export class CobrosController {
  constructor(private readonly cobrosService: CobrosService) {}

  @Get()
  findAll() {
    return this.cobrosService.findAll();
  }

  @Get('pendientes')
  findPendientes() {
    return this.cobrosService.findPendientes();
  }

  @Get('pagados')
  findPagados() {
    return this.cobrosService.findPagados();
  }

  @Get('proxima-quincena')
  findProximaQuincena() {
    return this.cobrosService.findProximaQuincena();
  }

  @Get('vencidos')
  findVencidos() {
    return this.cobrosService.findVencidos();
  }

  @Get('totales')
  obtenerTotales() {
    return this.cobrosService.obtenerTotales();
  }

  @Get('cliente/:clienteId')
  findByCliente(@Param('clienteId') clienteId: string) {
    return this.cobrosService.findByCliente(clienteId);
  }

  @Patch(':id/pagar')
  @HttpCode(HttpStatus.OK)
  registrarPago(
    @Param('id') id: string,
    @Body() registrarPagoDto: RegistrarPagoDto,
  ) {
    return this.cobrosService.registrarPago(id, registrarPagoDto);
  }
}