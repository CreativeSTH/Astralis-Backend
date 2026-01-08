import { Injectable, Logger } from '@nestjs/common';

import {
  PaymentProvider,
  CreatePaymentData,
  PaymentResult,
  WebhookPayload,
  WebhookResult,
} from '../interfaces/payment-provider.interface';

@Injectable()
export class CashOnDeliveryProvider implements PaymentProvider {
  private readonly logger = new Logger(CashOnDeliveryProvider.name);
  readonly providerName = 'Contra Entrega';
  readonly providerCode = 'CASH_ON_DELIVERY';

  /**
   * Crear "transacción" de contra entrega
   * No hay pago real hasta la entrega
   */
  async createPayment(data: CreatePaymentData): Promise<PaymentResult> {
    this.logger.log(`Contra entrega registrada para orden ${data.orderId}`);

    return {
      success: true,
      transactionId: data.reference,
      providerTransactionId: `COD-${data.reference}`,
      status: 'PENDING',
      message: 'Pago contra entrega registrado. Se cobrará al momento de la entrega.',
    };
  }

  /**
   * Verificar estado (siempre pendiente hasta confirmación manual)
   */
  async verifyPayment(providerTransactionId: string): Promise<PaymentResult> {
    return {
      success: true,
      providerTransactionId,
      status: 'PENDING',
      message: 'Pendiente de cobro en la entrega',
    };
  }

  /**
   * Procesar webhook (no aplica para contra entrega)
   */
  async processWebhook(payload: WebhookPayload): Promise<WebhookResult> {
    return {
      valid: true,
      message: 'Contra entrega no requiere webhooks',
    };
  }

  /**
   * Validar firma (no aplica)
   */
  validateWebhookSignature(_payload: any, _signature: string): boolean {
    return true;
  }

  /**
   * Siempre disponible
   */
  async isAvailable(): Promise<boolean> {
    return true;
  }

  /**
   * Confirmar pago recibido (llamado manualmente cuando el repartidor cobra)
   */
  async confirmPaymentReceived(
    reference: string,
    amount: number,
    collectedBy: string,
  ): Promise<PaymentResult> {
    this.logger.log(
      `Pago contra entrega confirmado: ${reference}, $${amount} por ${collectedBy}`,
    );

    return {
      success: true,
      transactionId: reference,
      providerTransactionId: `COD-${reference}`,
      status: 'APPROVED',
      message: `Pago de $${amount.toLocaleString()} recibido por ${collectedBy}`,
    };
  }

  /**
   * Marcar como no pagado (cliente rechazó o no estaba)
   */
  async markAsUnpaid(
    reference: string,
    reason: string,
  ): Promise<PaymentResult> {
    this.logger.log(`Pago contra entrega fallido: ${reference}, razón: ${reason}`);

    return {
      success: false,
      transactionId: reference,
      providerTransactionId: `COD-${reference}`,
      status: 'DECLINED',
      message: reason,
    };
  }
}
