import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Transaction,
  TransactionDocument,
  PaymentStatus,
  PaymentProvider as PaymentProviderEnum,
} from './schemas/transaction.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentProvider, WebhookPayload } from './interfaces/payment-provider.interface';
import { WompiProvider } from './providers/wompi.provider';
import { CashOnDeliveryProvider } from './providers/cash-on-delivery.provider';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private providers: Map<string, PaymentProvider> = new Map();

  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    private wompiProvider: WompiProvider,
    private cashOnDeliveryProvider: CashOnDeliveryProvider,
  ) {
    // Registrar proveedores disponibles
    this.providers.set(PaymentProviderEnum.WOMPI, this.wompiProvider);
    this.providers.set(PaymentProviderEnum.CASH_ON_DELIVERY, this.cashOnDeliveryProvider);
  }

  /**
   * Crear una nueva transacción de pago
   */
  async createPayment(dto: CreatePaymentDto): Promise<TransactionDocument> {
    const provider = this.providers.get(dto.provider);

    if (!provider) {
      throw new BadRequestException(`Proveedor de pago ${dto.provider} no disponible`);
    }

    // Verificar si el proveedor está disponible
    const isAvailable = await provider.isAvailable();
    if (!isAvailable) {
      throw new BadRequestException(`Proveedor ${dto.provider} no está disponible en este momento`);
    }

    // Generar referencia única
    const reference = this.generateReference();

    // Crear transacción en BD primero
    const transaction = new this.transactionModel({
      reference,
      orderId: new Types.ObjectId(dto.orderId),
      provider: dto.provider,
      paymentMethod: dto.paymentMethod,
      status: PaymentStatus.PENDING,
      amount: dto.amount,
      currency: dto.currency || 'COP',
      description: dto.description,
      customer: {
        email: dto.customerEmail,
        fullName: dto.customerName,
        phone: dto.customerPhone,
        document: dto.customerDocument,
        documentType: dto.customerDocumentType,
      },
      metadata: dto.metadata,
      redirectUrl: dto.redirectUrl,
      statusHistory: [
        {
          status: PaymentStatus.PENDING,
          timestamp: new Date(),
          reason: 'Transacción creada',
        },
      ],
    });

    await transaction.save();

    try {
      // Crear pago con el proveedor
      let result;

      if (dto.provider === PaymentProviderEnum.WOMPI) {
        // Para Wompi, crear link de pago (más fácil para web)
        result = await (this.wompiProvider as WompiProvider).createPaymentLink({
          orderId: dto.orderId,
          amount: dto.amount,
          currency: dto.currency || 'COP',
          customerEmail: dto.customerEmail,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          customerDocument: dto.customerDocument,
          customerDocumentType: dto.customerDocumentType,
          description: dto.description,
          reference,
          redirectUrl: dto.redirectUrl,
          metadata: dto.metadata,
        });
      } else {
        result = await provider.createPayment({
          orderId: dto.orderId,
          amount: dto.amount,
          currency: dto.currency || 'COP',
          customerEmail: dto.customerEmail,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          customerDocument: dto.customerDocument,
          customerDocumentType: dto.customerDocumentType,
          description: dto.description,
          reference,
          redirectUrl: dto.redirectUrl,
          metadata: dto.metadata,
        });
      }

      // Actualizar transacción con resultado
      transaction.providerTransactionId = result.providerTransactionId;
      transaction.paymentUrl = result.paymentUrl;
      transaction.providerResponse = result.rawResponse;

      if (!result.success) {
        transaction.status = PaymentStatus.ERROR;
        transaction.errorMessage = result.message;
        this.addStatusHistory(transaction, PaymentStatus.ERROR, result.message);
      } else {
        transaction.status = this.mapStatus(result.status);
        this.addStatusHistory(transaction, transaction.status, 'Pago iniciado con proveedor');
      }

      await transaction.save();

      return transaction;
    } catch (error) {
      // En caso de error, marcar transacción como error
      transaction.status = PaymentStatus.ERROR;
      transaction.errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.addStatusHistory(transaction, PaymentStatus.ERROR, transaction.errorMessage);
      await transaction.save();

      throw error;
    }
  }

  /**
   * Obtener transacción por referencia
   */
  async findByReference(reference: string): Promise<TransactionDocument> {
    const transaction = await this.transactionModel.findOne({ reference }).exec();
    if (!transaction) {
      throw new NotFoundException(`Transacción con referencia ${reference} no encontrada`);
    }
    return transaction;
  }

  /**
   * Obtener transacción por ID
   */
  async findById(id: string): Promise<TransactionDocument> {
    const transaction = await this.transactionModel.findById(id).exec();
    if (!transaction) {
      throw new NotFoundException(`Transacción con ID ${id} no encontrada`);
    }
    return transaction;
  }

  /**
   * Obtener transacciones por orden
   */
  async findByOrderId(orderId: string): Promise<TransactionDocument[]> {
    return this.transactionModel
      .find({ orderId: new Types.ObjectId(orderId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Verificar estado de pago con el proveedor
   */
  async verifyPayment(transactionId: string): Promise<TransactionDocument> {
    const transaction = await this.findById(transactionId);
    const provider = this.providers.get(transaction.provider);

    if (!provider || !transaction.providerTransactionId) {
      return transaction;
    }

    const result = await provider.verifyPayment(transaction.providerTransactionId);

    if (result.status) {
      const newStatus = this.mapStatus(result.status);
      if (newStatus !== transaction.status) {
        transaction.status = newStatus;
        this.addStatusHistory(transaction, newStatus, result.message || 'Estado actualizado');

        if (newStatus === PaymentStatus.APPROVED) {
          transaction.processedAt = new Date();
        }
      }
      transaction.providerResponse = result.rawResponse;
      await transaction.save();
    }

    return transaction;
  }

  /**
   * Procesar webhook de proveedor
   */
  async processWebhook(
    providerCode: string,
    payload: WebhookPayload,
  ): Promise<{ success: boolean; message: string }> {
    const provider = this.providers.get(providerCode);

    if (!provider) {
      this.logger.warn(`Webhook recibido de proveedor desconocido: ${providerCode}`);
      return { success: false, message: 'Proveedor no encontrado' };
    }

    const result = await provider.processWebhook(payload);

    if (!result.valid) {
      this.logger.warn(`Webhook inválido de ${providerCode}: ${result.message}`);
      return { success: false, message: result.message || 'Webhook inválido' };
    }

    // Actualizar transacción si hay cambio de estado
    if (result.transactionId && result.status) {
      try {
        const transaction = await this.findByReference(result.transactionId);
        const newStatus = this.mapStatus(result.status);

        if (newStatus !== transaction.status) {
          transaction.status = newStatus;
          this.addStatusHistory(transaction, newStatus, result.message || 'Actualizado por webhook');

          if (newStatus === PaymentStatus.APPROVED) {
            transaction.processedAt = new Date();
          }

          await transaction.save();

          this.logger.log(
            `Transacción ${result.transactionId} actualizada a ${newStatus} por webhook`,
          );
        }
      } catch (error) {
        this.logger.error(`Error actualizando transacción desde webhook: ${error}`);
      }
    }

    return { success: true, message: 'Webhook procesado correctamente' };
  }

  /**
   * Confirmar pago contra entrega
   */
  async confirmCashOnDelivery(
    transactionId: string,
    collectedBy: string,
  ): Promise<TransactionDocument> {
    const transaction = await this.findById(transactionId);

    if (transaction.provider !== PaymentProviderEnum.CASH_ON_DELIVERY) {
      throw new BadRequestException('Esta transacción no es contra entrega');
    }

    if (transaction.status === PaymentStatus.APPROVED) {
      throw new BadRequestException('Esta transacción ya fue confirmada');
    }

    const result = await this.cashOnDeliveryProvider.confirmPaymentReceived(
      transaction.reference,
      transaction.amount,
      collectedBy,
    );

    transaction.status = PaymentStatus.APPROVED;
    transaction.processedAt = new Date();
    transaction.metadata = {
      ...transaction.metadata,
      collectedBy,
      collectedAt: new Date(),
    };
    this.addStatusHistory(
      transaction,
      PaymentStatus.APPROVED,
      `Pago recibido por ${collectedBy}`,
    );

    await transaction.save();

    return transaction;
  }

  /**
   * Marcar contra entrega como no pagada
   */
  async markCashOnDeliveryUnpaid(
    transactionId: string,
    reason: string,
  ): Promise<TransactionDocument> {
    const transaction = await this.findById(transactionId);

    if (transaction.provider !== PaymentProviderEnum.CASH_ON_DELIVERY) {
      throw new BadRequestException('Esta transacción no es contra entrega');
    }

    transaction.status = PaymentStatus.DECLINED;
    transaction.errorMessage = reason;
    this.addStatusHistory(transaction, PaymentStatus.DECLINED, reason);

    await transaction.save();

    return transaction;
  }

  /**
   * Obtener proveedores disponibles
   */
  async getAvailableProviders(): Promise<
    Array<{ code: string; name: string; available: boolean }>
  > {
    const result: Array<{ code: string; name: string; available: boolean }> = [];

    for (const [code, provider] of this.providers) {
      const available = await provider.isAvailable();
      result.push({
        code,
        name: provider.providerName,
        available,
      });
    }

    return result;
  }

  /**
   * Obtener estadísticas de pagos
   */
  async getPaymentStats(startDate?: Date, endDate?: Date): Promise<{
    total: number;
    approved: number;
    pending: number;
    declined: number;
    totalAmount: number;
    byProvider: Record<string, number>;
  }> {
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = startDate;
      if (endDate) dateFilter.createdAt.$lte = endDate;
    }

    const transactions = await this.transactionModel.find(dateFilter).exec();

    const stats = {
      total: transactions.length,
      approved: 0,
      pending: 0,
      declined: 0,
      totalAmount: 0,
      byProvider: {} as Record<string, number>,
    };

    for (const tx of transactions) {
      if (tx.status === PaymentStatus.APPROVED) {
        stats.approved++;
        stats.totalAmount += tx.amount;
      } else if (tx.status === PaymentStatus.PENDING) {
        stats.pending++;
      } else if (tx.status === PaymentStatus.DECLINED) {
        stats.declined++;
      }

      stats.byProvider[tx.provider] = (stats.byProvider[tx.provider] || 0) + 1;
    }

    return stats;
  }

  /**
   * Generar referencia única
   */
  private generateReference(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `AST-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Mapear estado del proveedor a estado interno
   */
  private mapStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      PENDING: PaymentStatus.PENDING,
      PROCESSING: PaymentStatus.PROCESSING,
      APPROVED: PaymentStatus.APPROVED,
      DECLINED: PaymentStatus.DECLINED,
      VOIDED: PaymentStatus.VOIDED,
      REFUNDED: PaymentStatus.REFUNDED,
      ERROR: PaymentStatus.ERROR,
      EXPIRED: PaymentStatus.EXPIRED,
    };
    return statusMap[status] || PaymentStatus.PENDING;
  }

  /**
   * Agregar entrada al historial de estados
   */
  private addStatusHistory(
    transaction: TransactionDocument,
    status: PaymentStatus,
    reason?: string,
  ): void {
    transaction.statusHistory.push({
      status,
      timestamp: new Date(),
      reason,
    });
  }
}
