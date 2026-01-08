import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { GeographyService } from './geography.service';
import { GeographySeederService } from './geography-seeder.service';
import {
  CreateDepartamentoDto,
  UpdateDepartamentoDto,
  CreateCiudadDto,
  UpdateCiudadDto,
  CreateZonaEnvioDto,
  UpdateZonaEnvioDto,
} from './dto';

@ApiTags('Geography')
@Controller('geography')
export class GeographyController {
  constructor(
    private readonly geographyService: GeographyService,
    private readonly seederService: GeographySeederService,
  ) {}

  // ==================== DEPARTAMENTOS ====================

  @Post('departamentos')
  @HttpCode(HttpStatus.CREATED)
  createDepartamento(@Body() dto: CreateDepartamentoDto) {
    return this.geographyService.createDepartamento(dto);
  }

  @Get('departamentos')
  findAllDepartamentos() {
    return this.geographyService.findAllDepartamentos();
  }

  @Get('departamentos/:id')
  findDepartamentoById(@Param('id') id: string) {
    return this.geographyService.findDepartamentoById(id);
  }

  @Get('departamentos/:id/ciudades')
  findCiudadesByDepartamento(@Param('id') id: string) {
    return this.geographyService.findCiudadesByDepartamento(id);
  }

  @Patch('departamentos/:id')
  updateDepartamento(
    @Param('id') id: string,
    @Body() dto: UpdateDepartamentoDto,
  ) {
    return this.geographyService.updateDepartamento(id, dto);
  }

  @Delete('departamentos/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeDepartamento(@Param('id') id: string) {
    return this.geographyService.removeDepartamento(id);
  }

  // ==================== CIUDADES ====================

  @Post('ciudades')
  @HttpCode(HttpStatus.CREATED)
  createCiudad(@Body() dto: CreateCiudadDto) {
    return this.geographyService.createCiudad(dto);
  }

  @Get('ciudades')
  findAllCiudades() {
    return this.geographyService.findAllCiudades();
  }

  @Get('ciudades/:id')
  findCiudadById(@Param('id') id: string) {
    return this.geographyService.findCiudadById(id);
  }

  @Patch('ciudades/:id')
  updateCiudad(@Param('id') id: string, @Body() dto: UpdateCiudadDto) {
    return this.geographyService.updateCiudad(id, dto);
  }

  @Delete('ciudades/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCiudad(@Param('id') id: string) {
    return this.geographyService.removeCiudad(id);
  }

  // ==================== ZONAS DE ENVÍO ====================

  @Post('zonas-envio')
  @HttpCode(HttpStatus.CREATED)
  createZonaEnvio(@Body() dto: CreateZonaEnvioDto) {
    return this.geographyService.createZonaEnvio(dto);
  }

  @Get('zonas-envio')
  findAllZonasEnvio() {
    return this.geographyService.findAllZonasEnvio();
  }

  @Get('zonas-envio/:id')
  findZonaEnvioById(@Param('id') id: string) {
    return this.geographyService.findZonaEnvioById(id);
  }

  @Get('zonas-envio/codigo/:codigo')
  findZonaEnvioByCodigo(@Param('codigo') codigo: string) {
    return this.geographyService.findZonaEnvioByCodigo(codigo);
  }

  @Get('zonas-envio/ciudad/:ciudadId')
  findZonasEnvioByCiudad(@Param('ciudadId') ciudadId: string) {
    return this.geographyService.findZonasEnvioByCiudad(ciudadId);
  }

  @Patch('zonas-envio/:id')
  updateZonaEnvio(@Param('id') id: string, @Body() dto: UpdateZonaEnvioDto) {
    return this.geographyService.updateZonaEnvio(id, dto);
  }

  @Delete('zonas-envio/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeZonaEnvio(@Param('id') id: string) {
    return this.geographyService.removeZonaEnvio(id);
  }

  // ==================== UTILIDADES ====================

  @Get('verificar-cobertura/:ciudadId')
  verificarCobertura(@Param('ciudadId') ciudadId: string) {
    return this.geographyService.verificarCobertura(ciudadId);
  }

  // ==================== SEED ====================

  @Post('seed')
  async seed(@Query('reset') reset?: string) {
    if (reset === 'true') {
      await this.seederService.reset();
      return { message: 'Datos reiniciados y seed ejecutado correctamente' };
    }
    await this.seederService.seed();
    return { message: 'Seed ejecutado correctamente' };
  }
}