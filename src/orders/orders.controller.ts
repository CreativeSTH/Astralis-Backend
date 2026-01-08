import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from './schemas/order.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../auth/schemas/usuario.schema';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Crear orden (sin pago) - Usuario autenticado
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  /**
   * Crear orden con pago - Usuario autenticado
   */
  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  checkout(
    @Body() createOrderDto: CreateOrderDto,
    @Body('redirectUrl') redirectUrl?: string,
  ) {
    return this.ordersService.createWithPayment(createOrderDto, redirectUrl);
  }

  /**
   * Mis órdenes - Usuario autenticado
   */
  @Get('my-orders')
  @UseGuards(JwtAuthGuard)
  getMyOrders(@CurrentUser() user: CurrentUserData) {
    return this.ordersService.findByUserId(user.id);
  }

  /**
   * Obtener todas las órdenes (admin)
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  findAll(
    @Query('status') status?: OrderStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.ordersService.findAll({
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  /**
   * Obtener orden por ID - Usuario autenticado (valida que sea suya o admin)
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findById(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.ordersService.findByIdForUser(id, user.id, user.rol);
  }

  /**
   * Obtener orden por número - Usuario autenticado
   */
  @Get('number/:orderNumber')
  @UseGuards(JwtAuthGuard)
  findByOrderNumber(
    @Param('orderNumber') orderNumber: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.ordersService.findByOrderNumberForUser(
      orderNumber,
      user.id,
      user.rol,
    );
  }

  /**
   * Obtener órdenes de un usuario (admin)
   */
  @Get('user/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  findByUserId(@Param('userId') userId: string) {
    return this.ordersService.findByUserId(userId);
  }

  /**
   * Obtener órdenes por email (admin)
   */
  @Get('email/:email')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  findByEmail(@Param('email') email: string) {
    return this.ordersService.findByEmail(email);
  }

  /**
   * Actualizar estado de orden (admin)
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @Body('note') note?: string,
    @CurrentUser() user?: CurrentUserData,
  ) {
    return this.ordersService.updateStatus(id, status, note, user?.email);
  }

  /**
   * Confirmar pago (admin)
   */
  @Post(':id/confirm-payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @HttpCode(HttpStatus.OK)
  confirmPayment(@Param('id') id: string) {
    return this.ordersService.confirmPayment(id);
  }

  /**
   * Actualizar tracking (admin)
   */
  @Patch(':id/tracking')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  updateTracking(
    @Param('id') id: string,
    @Body('trackingNumber') trackingNumber: string,
    @Body('trackingUrl') trackingUrl?: string,
  ) {
    return this.ordersService.updateTracking(id, trackingNumber, trackingUrl);
  }

  /**
   * Marcar como entregado (admin)
   */
  @Post(':id/delivered')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @HttpCode(HttpStatus.OK)
  markAsDelivered(@Param('id') id: string, @Body('note') note?: string) {
    return this.ordersService.markAsDelivered(id, note);
  }

  /**
   * Cancelar orden - Usuario autenticado (solo sus órdenes) o Admin
   */
  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.ordersService.cancelForUser(id, reason, user.id, user.rol);
  }
}
