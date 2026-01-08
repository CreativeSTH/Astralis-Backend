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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { CouponsService } from './coupons.service';
import { CreateCouponDto, UpdateCouponDto, ApplyCouponDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../auth/schemas/usuario.schema';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  // ==================== ENDPOINTS PÚBLICOS (con auth) ====================

  /**
   * Validar y aplicar un cupón al carrito
   */
  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aplicar cupón al carrito' })
  applyCoupon(
    @Body() applyDto: ApplyCouponDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.couponsService.applyCoupon(applyDto, user.id);
  }

  /**
   * Validar un cupón sin aplicarlo
   */
  @Post('validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validar cupón sin aplicarlo' })
  validateCoupon(
    @Body() applyDto: ApplyCouponDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.couponsService.validateCoupon(
      applyDto.code,
      user.id,
      applyDto.items,
      applyDto.subtotal,
    );
  }

  // ==================== ENDPOINTS ADMIN ====================

  /**
   * Crear un nuevo cupón (admin)
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear cupón (Admin)' })
  create(@Body() createCouponDto: CreateCouponDto) {
    return this.couponsService.create(createCouponDto);
  }

  /**
   * Listar todos los cupones (admin)
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar cupones (Admin)' })
  findAll() {
    return this.couponsService.findAll();
  }

  /**
   * Obtener estadísticas de uso de un cupón (admin)
   */
  @Get(':id/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Estadísticas de uso de cupón (Admin)' })
  getUsageStats(@Param('id') id: string) {
    return this.couponsService.getUsageStats(id);
  }

  /**
   * Obtener un cupón por ID (admin)
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener cupón por ID (Admin)' })
  findOne(@Param('id') id: string) {
    return this.couponsService.findOne(id);
  }

  /**
   * Actualizar un cupón (admin)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar cupón (Admin)' })
  update(@Param('id') id: string, @Body() updateCouponDto: UpdateCouponDto) {
    return this.couponsService.update(id, updateCouponDto);
  }

  /**
   * Eliminar un cupón (admin)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar cupón (Admin)' })
  remove(@Param('id') id: string) {
    return this.couponsService.remove(id);
  }

  /**
   * Actualizar cupones expirados (admin/cron)
   */
  @Post('update-expired')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar cupones expirados (Admin)' })
  updateExpired() {
    return this.couponsService.updateExpiredCoupons();
  }
}
