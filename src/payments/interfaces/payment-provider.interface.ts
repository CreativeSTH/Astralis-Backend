import { TransactionDocument } from '../schemas/transaction.schema';

export interface CreatePaymentData {
  orderId: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  customerDocument?: string;
  customerDocumentType?: string;
  description?: string;
  reference: string;
  redirectUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  providerTransactionId?: string;
  status: string;
  redirectUrl?: string;
  paymentUrl?: string;
  message?: string;
  rawResponse?: any;
}

export interface WebhookPayload {
  event: string;
  data: any;
  signature?: string;
  timestamp?: string;
}

export interface WebhookResult {
  valid: boolean;
  transactionId?: string;
  status?: string;
  message?: string;
}

export interface RefundData {
  transactionId: string;
  amount?: number;
  reason?: string;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  status: string;
  message?: string;
}

export interface PaymentProvider {
  readonly providerName: string;
  readonly providerCode: string;

  /**
   * Crear una transacción de pago
   */
  createPayment(data: CreatePaymentData): Promise<PaymentResult>;

  /**
   * Verificar el estado de una transacción
   */
  verifyPayment(providerTransactionId: string): Promise<PaymentResult>;

  /**
   * Procesar webhook del proveedor
   */
  processWebhook(payload: WebhookPayload): Promise<WebhookResult>;

  /**
   * Validar firma del webhook
   */
  validateWebhookSignature(payload: any, signature: string): boolean;

  /**
   * Procesar reembolso (opcional)
   */
  refund?(data: RefundData): Promise<RefundResult>;

  /**
   * Verificar si el proveedor está disponible
   */
  isAvailable(): Promise<boolean>;
}
