import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('resumen')
  obtenerResumenGeneral() {
    return this.dashboardService.obtenerResumenGeneral();
  }

  @Get('estadisticas-mensuales')
  obtenerEstadisticasMensuales(
    @Query('mes') mes: string,
    @Query('anio') anio: string,
  ) {
    const mesNum = parseInt(mes);
    const anioNum = parseInt(anio);
    return this.dashboardService.obtenerEstadisticasMensuales(mesNum, anioNum);
  }
}