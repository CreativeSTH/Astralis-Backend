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
} from '@nestjs/common';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { AbonarCuotaDto } from './dto/abonar-cuota.dto';

@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createVentaDto: CreateVentaDto) {
    return this.ventasService.create(createVentaDto);
  }

  @Get()
  findAll() {
    return this.ventasService.findAll();
  }

  @Get('activas')
  findActivas() {
    return this.ventasService.findActivas();
  }

  @Get('completadas')
  findCompletadas() {
    return this.ventasService.findCompletadas();
  }

  @Get('cliente/:clienteId')
  findByCliente(@Param('clienteId') clienteId: string) {
    return this.ventasService.findByCliente(clienteId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ventasService.findOne(id);
  }

  @Patch(':id/pagar-cuota')
  pagarCuota(
    @Param('id') id: string,
    @Body('numeroCuota') numeroCuota: number,
    @Body('fechaPago') fechaPago: Date,
  ) {
    return this.ventasService.registrarPagoCuota(id, numeroCuota, fechaPago);
  }

  @Patch(':id/abonar-cuota')
  abonarCuota(
    @Param('id') id: string,
    @Body() abonarCuotaDto: AbonarCuotaDto,
  ) {
    return this.ventasService.abonarCuota(id, abonarCuotaDto);
  }

  @Post('verificar-vencimientos')
  @HttpCode(HttpStatus.OK)
  verificarVencimientos() {
    return this.ventasService.verificarVencimientos();
  }
}