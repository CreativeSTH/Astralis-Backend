import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Headers,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';

import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Crear una nueva transacción de pago
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.createPayment(createPaymentDto);
  }

  /**
   * Obtener proveedores de pago disponibles
   */
  @Get('providers')
  getProviders() {
    return this.paymentsService.getAvailableProviders();
  }

  /**
   * Obtener estadísticas de pagos
   */
  @Get('stats')
  getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.paymentsService.getPaymentStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  /**
   * Obtener transacción por ID
   */
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.paymentsService.findById(id);
  }

  /**
   * Obtener transacción por referencia
   */
  @Get('reference/:reference')
  findByReference(@Param('reference') reference: string) {
    return this.paymentsService.findByReference(reference);
  }

  /**
   * Obtener transacciones de una orden
   */
  @Get('order/:orderId')
  findByOrderId(@Param('orderId') orderId: string) {
    return this.paymentsService.findByOrderId(orderId);
  }

  /**
   * Verificar estado de pago con el proveedor
   */
  @Post(':id/verify')
  @HttpCode(HttpStatus.OK)
  verifyPayment(@Param('id') id: string) {
    return this.paymentsService.verifyPayment(id);
  }

  /**
   * Confirmar pago contra entrega
   */
  @Post(':id/confirm-cod')
  @HttpCode(HttpStatus.OK)
  confirmCashOnDelivery(
    @Param('id') id: string,
    @Body('collectedBy') collectedBy: string,
  ) {
    return this.paymentsService.confirmCashOnDelivery(id, collectedBy);
  }

  /**
   * Marcar contra entrega como no pagada
   */
  @Post(':id/decline-cod')
  @HttpCode(HttpStatus.OK)
  declineCashOnDelivery(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.paymentsService.markCashOnDeliveryUnpaid(id, reason);
  }

  // ==================== WEBHOOKS ====================

  /**
   * Webhook de Wompi
   */
  @Post('webhooks/wompi')
  @HttpCode(HttpStatus.OK)
  async wompiWebhook(
    @Body() body: any,
    @Headers('x-event-checksum') checksum: string,
  ) {
    const payload = {
      event: body.event,
      data: body.data,
      signature: body.signature,
      timestamp: body.timestamp,
    };

    const result = await this.paymentsService.processWebhook('WOMPI', payload);

    return result;
  }

  /**
   * Webhook de ePayco (preparado para futuro)
   */
  @Post('webhooks/epayco')
  @HttpCode(HttpStatus.OK)
  async epaycoWebhook(@Body() body: any) {
    // TODO: Implementar cuando se agregue ePayco
    return { success: true, message: 'ePayco webhook endpoint ready' };
  }
}
