import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import {
  PaymentProvider,
  CreatePaymentData,
  PaymentResult,
  WebhookPayload,
  WebhookResult,
  RefundData,
  RefundResult,
} from '../interfaces/payment-provider.interface';

interface WompiTransactionResponse {
  data: {
    id: string;
    created_at: string;
    amount_in_cents: number;
    reference: string;
    currency: string;
    payment_method_type: string;
    payment_method: {
      type: string;
      extra?: {
        brand?: string;
        last_four?: string;
        bank_name?: string;
      };
    };
    status: string;
    status_message?: string;
    redirect_url?: string;
    payment_link_id?: string;
  };
}

interface WompiAcceptanceToken {
  data: {
    presigned_acceptance: {
      acceptance_token: string;
      permalink: string;
      type: string;
    };
  };
}

@Injectable()
export class WompiProvider implements PaymentProvider {
  private readonly logger = new Logger(WompiProvider.name);
  readonly providerName = 'Wompi';
  readonly providerCode = 'WOMPI';

  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly eventsKey: string;
  private readonly integrityKey: string;
  private readonly baseUrl: string;
  private readonly isProduction: boolean;

  constructor(private configService: ConfigService) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    // Llaves de producción o sandbox
    this.publicKey = this.configService.get<string>('WOMPI_PUBLIC_KEY') || '';
    this.privateKey = this.configService.get<string>('WOMPI_PRIVATE_KEY') || '';
    this.eventsKey = this.configService.get<string>('WOMPI_EVENTS_KEY') || '';
    this.integrityKey = this.configService.get<string>('WOMPI_INTEGRITY_KEY') || '';

    this.baseUrl = this.isProduction
      ? 'https://production.wompi.co/v1'
      : 'https://sandbox.wompi.co/v1';
  }

  /**
   * Crear transacción de pago con Wompi
   */
  async createPayment(data: CreatePaymentData): Promise<PaymentResult> {
    try {
      // 1. Obtener token de aceptación
      const acceptanceToken = await this.getAcceptanceToken();

      // 2. Generar firma de integridad
      const amountInCents = Math.round(data.amount * 100);
      const signature = this.generateIntegritySignature(
        data.reference,
        amountInCents,
        data.currency || 'COP',
      );

      // 3. Crear transacción
      const transactionData = {
        acceptance_token: acceptanceToken,
        amount_in_cents: amountInCents,
        currency: data.currency || 'COP',
        signature,
        customer_email: data.customerEmail,
        reference: data.reference,
        customer_data: {
          phone_number: data.customerPhone,
          full_name: data.customerName,
          legal_id: data.customerDocument,
          legal_id_type: data.customerDocumentType || 'CC',
        },
        redirect_url: data.redirectUrl,
      };

      const response = await fetch(`${this.baseUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.publicKey}`,
        },
        body: JSON.stringify(transactionData),
      });

      const result: WompiTransactionResponse = await response.json();

      if (!response.ok) {
        this.logger.error('Wompi create payment error', result);
        return {
          success: false,
          status: 'ERROR',
          message: (result as any).error?.message || 'Error al crear transacción',
          rawResponse: result,
        };
      }

      return {
        success: true,
        transactionId: data.reference,
        providerTransactionId: result.data.id,
        status: this.mapWompiStatus(result.data.status),
        redirectUrl: result.data.redirect_url,
        rawResponse: result.data,
      };
    } catch (error) {
      this.logger.error('Wompi createPayment error', error);
      return {
        success: false,
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Crear link de pago (más fácil para integración web)
   */
  async createPaymentLink(data: CreatePaymentData): Promise<PaymentResult> {
    try {
      const amountInCents = Math.round(data.amount * 100);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // Expira en 24 horas

      const paymentLinkData = {
        name: data.description || `Pedido ${data.reference}`,
        description: data.description || `Pago del pedido ${data.reference}`,
        single_use: true,
        collect_shipping: false,
        currency: data.currency || 'COP',
        amount_in_cents: amountInCents,
        redirect_url: data.redirectUrl,
        expires_at: expiresAt.toISOString().replace('Z', '+00:00'),
        customer_data: {
          customer_references: [
            { label: 'Referencia', value: data.reference },
            { label: 'Email', value: data.customerEmail },
          ],
        },
      };

      const response = await fetch(`${this.baseUrl}/payment_links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.privateKey}`,
        },
        body: JSON.stringify(paymentLinkData),
      });

      const result = await response.json();

      if (!response.ok) {
        this.logger.error('Wompi create payment link error', result);
        return {
          success: false,
          status: 'ERROR',
          message: result.error?.message || 'Error al crear link de pago',
          rawResponse: result,
        };
      }

      return {
        success: true,
        transactionId: data.reference,
        providerTransactionId: result.data.id,
        status: 'PENDING',
        paymentUrl: `https://checkout.wompi.co/l/${result.data.id}`,
        rawResponse: result.data,
      };
    } catch (error) {
      this.logger.error('Wompi createPaymentLink error', error);
      return {
        success: false,
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Verificar estado de transacción
   */
  async verifyPayment(providerTransactionId: string): Promise<PaymentResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/transactions/${providerTransactionId}`,
        {
          headers: {
            Authorization: `Bearer ${this.privateKey}`,
          },
        },
      );

      const result: WompiTransactionResponse = await response.json();

      if (!response.ok) {
        return {
          success: false,
          status: 'ERROR',
          message: 'Transacción no encontrada',
          rawResponse: result,
        };
      }

      const status = this.mapWompiStatus(result.data.status);

      return {
        success: status === 'APPROVED',
        transactionId: result.data.reference,
        providerTransactionId: result.data.id,
        status,
        message: result.data.status_message,
        rawResponse: result.data,
      };
    } catch (error) {
      this.logger.error('Wompi verifyPayment error', error);
      return {
        success: false,
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Procesar webhook de Wompi
   */
  async processWebhook(payload: WebhookPayload): Promise<WebhookResult> {
    try {
      const { event, data, signature } = payload;

      // Validar firma
      if (signature && !this.validateWebhookSignature(data, signature)) {
        this.logger.warn('Invalid Wompi webhook signature');
        return {
          valid: false,
          message: 'Firma inválida',
        };
      }

      // Procesar evento
      if (event === 'transaction.updated') {
        const transaction = data.transaction;
        const status = this.mapWompiStatus(transaction.status);

        return {
          valid: true,
          transactionId: transaction.reference,
          status,
          message: transaction.status_message,
        };
      }

      return {
        valid: true,
        message: `Evento ${event} procesado`,
      };
    } catch (error) {
      this.logger.error('Wompi processWebhook error', error);
      return {
        valid: false,
        message: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Validar firma del webhook
   */
  validateWebhookSignature(payload: any, signature: string): boolean {
    try {
      const transaction = payload.transaction;
      const properties = payload.signature?.properties || [];

      // Construir string a firmar según las propiedades indicadas
      let stringToSign = '';
      for (const prop of properties) {
        const value = this.getNestedProperty(transaction, prop);
        stringToSign += value;
      }
      stringToSign += payload.timestamp;
      stringToSign += this.eventsKey;

      const calculatedSignature = crypto
        .createHash('sha256')
        .update(stringToSign)
        .digest('hex');

      return calculatedSignature === payload.signature?.checksum;
    } catch (error) {
      this.logger.error('Error validating webhook signature', error);
      return false;
    }
  }

  /**
   * Procesar reembolso
   */
  async refund(data: RefundData): Promise<RefundResult> {
    try {
      const refundData: any = {
        transaction_id: data.transactionId,
      };

      if (data.amount) {
        refundData.amount_in_cents = Math.round(data.amount * 100);
      }

      const response = await fetch(`${this.baseUrl}/refunds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.privateKey}`,
        },
        body: JSON.stringify(refundData),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          status: 'ERROR',
          message: result.error?.message || 'Error al procesar reembolso',
        };
      }

      return {
        success: true,
        refundId: result.data.id,
        status: result.data.status,
        message: 'Reembolso procesado correctamente',
      };
    } catch (error) {
      this.logger.error('Wompi refund error', error);
      return {
        success: false,
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Verificar si el proveedor está disponible
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/merchants/${this.publicKey}`, {
        headers: {
          Authorization: `Bearer ${this.publicKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Obtener token de aceptación de términos
   */
  private async getAcceptanceToken(): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/merchants/${this.publicKey}`,
    );
    const result: WompiAcceptanceToken = await response.json();
    return result.data.presigned_acceptance.acceptance_token;
  }

  /**
   * Generar firma de integridad
   */
  private generateIntegritySignature(
    reference: string,
    amountInCents: number,
    currency: string,
  ): string {
    const stringToSign = `${reference}${amountInCents}${currency}${this.integrityKey}`;
    return crypto.createHash('sha256').update(stringToSign).digest('hex');
  }

  /**
   * Mapear estado de Wompi a estado interno
   */
  private mapWompiStatus(wompiStatus: string): string {
    const statusMap: Record<string, string> = {
      PENDING: 'PENDING',
      APPROVED: 'APPROVED',
      DECLINED: 'DECLINED',
      VOIDED: 'VOIDED',
      ERROR: 'ERROR',
    };
    return statusMap[wompiStatus] || 'PENDING';
  }

  /**
   * Obtener propiedad anidada de un objeto
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}
