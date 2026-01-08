import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Order,
  OrderDocument,
  OrderStatus,
  PaymentMethodType,
} from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { GeographyService } from '../geography/geography.service';
import { ShippingService } from '../shipping/shipping.service';
import { PaymentsService } from '../payments/payments.service';
import { PaymentProvider, PaymentStatus } from '../payments/schemas/transaction.schema';
import { AddressesService } from '../addresses/addresses.service';
import { VentasService } from '../ventas/ventas.service';
import { EmailService, OrderEmailData } from '../email/email.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
    private geographyService: GeographyService,
    private shippingService: ShippingService,
    @Inject(forwardRef(() => PaymentsService))
    private paymentsService: PaymentsService,
    private addressesService: AddressesService,
    @Inject(forwardRef(() => VentasService))
    private ventasService: VentasService,
    private emailService: EmailService,
  ) {}

  /**
   * Crear una nueva orden
   */
  async create(dto: CreateOrderDto): Promise<OrderDocument> {
    // Resolver dirección: desde addressId o desde shippingAddress inline
    let shippingAddressData: {
      fullName: string;
      phone: string;
      address: string;
      addressDetail?: string;
      ciudadId: string;
      ciudadNombre: string;
      departamentoNombre: string;
      postalCode?: string;
      notes?: string;
    };

    if (dto.addressId) {
      const savedAddress = await this.addressesService.findById(dto.addressId);
      shippingAddressData = {
        fullName: savedAddress.fullName,
        phone: savedAddress.phone,
        address: savedAddress.address,
        addressDetail: savedAddress.addressDetail,
        ciudadId: savedAddress.ciudadId.toString(),
        ciudadNombre: savedAddress.ciudadNombre,
        departamentoNombre: savedAddress.departamentoNombre,
        postalCode: savedAddress.postalCode,
        notes: savedAddress.notes,
      };
    } else if (dto.shippingAddress) {
      const ciudad = await this.geographyService.findCiudadById(dto.shippingAddress.ciudadId);
      shippingAddressData = {
        fullName: dto.shippingAddress.fullName,
        phone: dto.shippingAddress.phone,
        address: dto.shippingAddress.address,
        addressDetail: dto.shippingAddress.addressDetail,
        ciudadId: dto.shippingAddress.ciudadId,
        ciudadNombre: ciudad.nombre,
        departamentoNombre: ciudad.departamentoNombre,
        postalCode: dto.shippingAddress.postalCode,
        notes: dto.shippingAddress.notes,
      };
    } else {
      throw new BadRequestException('Debe proporcionar addressId o shippingAddress');
    }

    // Validar método de envío
    const metodoEnvio = await this.shippingService.findMetodoEnvioById(dto.shippingInfo.metodoEnvioId);

    // Calcular subtotal
    const subtotal = dto.items.reduce(
      (sum, item) => sum + item.precioUnitario * item.cantidad,
      0,
    );

    // Calcular total
    const discount = dto.discount || 0;
    const shippingCost = dto.shippingInfo.esGratis ? 0 : dto.shippingInfo.costo;
    const total = subtotal - discount + shippingCost;

    // Generar número de orden
    const orderNumber = this.generateOrderNumber();

    // Crear orden
    const order = new this.orderModel({
      orderNumber,
      userId: new Types.ObjectId(dto.userId),
      addressId: dto.addressId ? new Types.ObjectId(dto.addressId) : undefined,
      customerEmail: dto.customerEmail,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      status: OrderStatus.PENDING,
      items: dto.items.map((item) => ({
        productoId: new Types.ObjectId(item.productoId),
        nombre: item.nombre,
        imagen: item.imagen,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.precioUnitario * item.cantidad,
        peso: item.peso,
      })),
      subtotal,
      discount,
      discountCode: dto.discountCode,
      shippingCost,
      total,
      shippingAddress: {
        fullName: shippingAddressData.fullName,
        phone: shippingAddressData.phone,
        address: shippingAddressData.address,
        addressDetail: shippingAddressData.addressDetail,
        ciudadId: new Types.ObjectId(shippingAddressData.ciudadId),
        ciudadNombre: shippingAddressData.ciudadNombre,
        departamentoNombre: shippingAddressData.departamentoNombre,
        postalCode: shippingAddressData.postalCode,
        notes: shippingAddressData.notes,
      },
      shippingInfo: {
        metodoEnvioId: dto.shippingInfo.metodoEnvioId,
        metodoNombre: metodoEnvio.nombre,
        transportadora: metodoEnvio.transportadoraNombre,
        costo: shippingCost,
        esGratis: dto.shippingInfo.esGratis || false,
        tiempoEstimadoMin: metodoEnvio.tiempoEstimadoMinDias,
        tiempoEstimadoMax: metodoEnvio.tiempoEstimadoMaxDias,
      },
      paymentInfo: {
        method: dto.paymentMethod,
      },
      statusHistory: [
        {
          status: OrderStatus.PENDING,
          timestamp: new Date(),
          note: 'Orden creada',
        },
      ],
      notes: dto.notes,
    });

    await order.save();

    // Enviar email de confirmación de orden
    this.sendOrderEmail(order, 'confirmation');

    return order;
  }

  /**
   * Crear orden y procesar pago
   */
  async createWithPayment(dto: CreateOrderDto, redirectUrl?: string): Promise<{
    order: OrderDocument;
    paymentUrl?: string;
  }> {
    // Crear orden
    const order = await this.create(dto);

    try {
      // Mapear método de pago a proveedor
      const providerMap: Record<PaymentMethodType, PaymentProvider> = {
        [PaymentMethodType.WOMPI]: PaymentProvider.WOMPI,
        [PaymentMethodType.EPAYCO]: PaymentProvider.EPAYCO,
        [PaymentMethodType.CASH_ON_DELIVERY]: PaymentProvider.CASH_ON_DELIVERY,
        [PaymentMethodType.ADDI]: PaymentProvider.ADDI,
        [PaymentMethodType.SISTECREDITO]: PaymentProvider.SISTECREDITO,
      };

      // Crear transacción de pago
      const transaction = await this.paymentsService.createPayment({
        orderId: order._id.toString(),
        provider: providerMap[dto.paymentMethod],
        amount: order.total,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        description: `Pedido ${order.orderNumber}`,
        redirectUrl,
      });

      // Actualizar orden con info de pago
      order.paymentInfo.transactionId = transaction._id.toString();
      order.paymentInfo.transactionReference = transaction.reference;
      order.paymentInfo.status = transaction.status;
      order.paymentInfo.paymentUrl = transaction.paymentUrl;
      order.status = OrderStatus.PAYMENT_PENDING;

      this.addStatusHistory(order, OrderStatus.PAYMENT_PENDING, 'Esperando pago');

      await order.save();

      return {
        order,
        paymentUrl: transaction.paymentUrl,
      };
    } catch (error) {
      // En caso de error de pago, cancelar orden
      order.status = OrderStatus.CANCELLED;
      order.cancelReason = `Error al procesar pago: ${error instanceof Error ? error.message : 'Error desconocido'}`;
      order.cancelledAt = new Date();
      this.addStatusHistory(order, OrderStatus.CANCELLED, order.cancelReason);
      await order.save();

      throw error;
    }
  }

  /**
   * Obtener orden por ID
   */
  async findById(id: string): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException(`Orden con ID ${id} no encontrada`);
    }
    return order;
  }

  /**
   * Obtener orden por número
   */
  async findByOrderNumber(orderNumber: string): Promise<OrderDocument> {
    const order = await this.orderModel.findOne({ orderNumber }).exec();
    if (!order) {
      throw new NotFoundException(`Orden ${orderNumber} no encontrada`);
    }
    return order;
  }

  /**
   * Obtener órdenes de un usuario
   */
  async findByUserId(userId: string): Promise<OrderDocument[]> {
    return this.orderModel
      .find({ userId: new Types.ObjectId(userId), activo: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Obtener órdenes por email
   */
  async findByEmail(email: string): Promise<OrderDocument[]> {
    return this.orderModel
      .find({ customerEmail: email, activo: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Obtener órdenes por estado
   */
  async findByStatus(status: OrderStatus): Promise<OrderDocument[]> {
    return this.orderModel
      .find({ status, activo: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Obtener orden por ID para usuario (valida propiedad o admin)
   */
  async findByIdForUser(
    id: string,
    userId: string,
    userRole: string,
  ): Promise<OrderDocument> {
    const order = await this.findById(id);

    // Admin puede ver cualquier orden
    if (userRole === 'ADMIN') {
      return order;
    }

    // Usuario normal solo puede ver sus propias órdenes
    if (order.userId?.toString() !== userId) {
      throw new NotFoundException(`Orden con ID ${id} no encontrada`);
    }

    return order;
  }

  /**
   * Obtener orden por número para usuario (valida propiedad o admin)
   */
  async findByOrderNumberForUser(
    orderNumber: string,
    userId: string,
    userRole: string,
  ): Promise<OrderDocument> {
    const order = await this.findByOrderNumber(orderNumber);

    // Admin puede ver cualquier orden
    if (userRole === 'ADMIN') {
      return order;
    }

    // Usuario normal solo puede ver sus propias órdenes
    if (order.userId?.toString() !== userId) {
      throw new NotFoundException(`Orden ${orderNumber} no encontrada`);
    }

    return order;
  }

  /**
   * Cancelar orden para usuario (valida propiedad o admin)
   */
  async cancelForUser(
    id: string,
    reason: string,
    userId: string,
    userRole: string,
  ): Promise<OrderDocument> {
    const order = await this.findById(id);

    // Verificar permisos
    const isAdmin = userRole === 'ADMIN';
    const isOwner = order.userId?.toString() === userId;

    if (!isAdmin && !isOwner) {
      throw new NotFoundException(`Orden con ID ${id} no encontrada`);
    }

    // Usuarios normales solo pueden cancelar órdenes en estado PENDING o PAYMENT_PENDING
    if (!isAdmin && ![OrderStatus.PENDING, OrderStatus.PAYMENT_PENDING].includes(order.status)) {
      throw new BadRequestException(
        'Solo puedes cancelar órdenes que no han sido procesadas',
      );
    }

    return this.cancel(id, reason, isAdmin ? 'Admin' : 'Usuario');
  }

  /**
   * Obtener todas las órdenes (admin)
   */
  async findAll(options?: {
    status?: OrderStatus;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: OrderDocument[]; total: number }> {
    const filter: any = { activo: true };

    if (options?.status) {
      filter.status = options.status;
    }

    if (options?.startDate || options?.endDate) {
      filter.createdAt = {};
      if (options.startDate) filter.createdAt.$gte = options.startDate;
      if (options.endDate) filter.createdAt.$lte = options.endDate;
    }

    const total = await this.orderModel.countDocuments(filter);
    const orders = await this.orderModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(options?.offset || 0)
      .limit(options?.limit || 50)
      .exec();

    return { orders, total };
  }

  /**
   * Actualizar estado de orden
   */
  async updateStatus(
    id: string,
    status: OrderStatus,
    note?: string,
    updatedBy?: string,
  ): Promise<OrderDocument> {
    const order = await this.findById(id);

    // Validar transición de estado
    if (!this.isValidStatusTransition(order.status, status)) {
      throw new BadRequestException(
        `No se puede cambiar de ${order.status} a ${status}`,
      );
    }

    order.status = status;
    this.addStatusHistory(order, status, note, updatedBy);

    if (status === OrderStatus.CANCELLED) {
      order.cancelledAt = new Date();
      order.cancelReason = note;
    }

    await order.save();

    return order;
  }

  /**
   * Confirmar pago de orden
   * Este método también crea la venta en el sistema de ventas
   */
  async confirmPayment(orderId: string): Promise<OrderDocument> {
    const order = await this.findById(orderId);

    if (order.status !== OrderStatus.PAYMENT_PENDING) {
      throw new BadRequestException('La orden no está pendiente de pago');
    }

    // Verificar que no exista ya una venta para esta orden
    const ventaExistente = await this.ventasService.findByOrderId(orderId);
    if (ventaExistente) {
      throw new BadRequestException('Ya existe una venta registrada para esta orden');
    }

    // Crear venta en el sistema de ventas (descuenta stock)
    await this.ventasService.createFromOrder({
      orderId: order._id.toString(),
      userId: order.userId?.toString(),
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      items: order.items.map((item) => ({
        productoId: item.productoId.toString(),
        nombre: item.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal,
      })),
      total: order.total,
    });

    order.status = OrderStatus.PAYMENT_CONFIRMED;
    order.paymentInfo.status = 'APPROVED';
    order.paymentInfo.paidAt = new Date();
    this.addStatusHistory(order, OrderStatus.PAYMENT_CONFIRMED, 'Pago confirmado y venta registrada');

    await order.save();

    // Enviar email de confirmación de pago
    this.sendOrderEmail(order, 'payment');

    return order;
  }

  /**
   * Actualizar tracking de envío
   */
  async updateTracking(
    id: string,
    trackingNumber: string,
    trackingUrl?: string,
  ): Promise<OrderDocument> {
    const order = await this.findById(id);

    order.shippingInfo.trackingNumber = trackingNumber;
    order.shippingInfo.trackingUrl = trackingUrl;

    const wasShipped = order.status === OrderStatus.PAYMENT_CONFIRMED || order.status === OrderStatus.PROCESSING;

    if (wasShipped) {
      order.status = OrderStatus.SHIPPED;
      order.shippingInfo.shippedAt = new Date();
      this.addStatusHistory(order, OrderStatus.SHIPPED, `Enviado con guía ${trackingNumber}`);
    }

    await order.save();

    // Enviar email de notificación de envío
    if (wasShipped) {
      this.sendOrderEmail(order, 'shipping');
    }

    return order;
  }

  /**
   * Marcar como entregado
   */
  async markAsDelivered(id: string, note?: string): Promise<OrderDocument> {
    const order = await this.findById(id);

    order.status = OrderStatus.DELIVERED;
    order.shippingInfo.deliveredAt = new Date();
    this.addStatusHistory(order, OrderStatus.DELIVERED, note || 'Entregado al cliente');

    await order.save();

    // Enviar email de confirmación de entrega
    this.sendOrderEmail(order, 'delivery');

    return order;
  }

  /**
   * Cancelar orden
   */
  async cancel(id: string, reason: string, cancelledBy?: string): Promise<OrderDocument> {
    const order = await this.findById(id);

    if ([OrderStatus.DELIVERED, OrderStatus.REFUNDED].includes(order.status)) {
      throw new BadRequestException('No se puede cancelar una orden entregada o reembolsada');
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelReason = reason;
    order.cancelledAt = new Date();
    this.addStatusHistory(order, OrderStatus.CANCELLED, reason, cancelledBy);

    await order.save();

    return order;
  }

  /**
   * Generar número de orden único
   */
  private generateOrderNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `AST-${year}${month}${day}-${random}`;
  }

  /**
   * Validar transición de estado
   */
  private isValidStatusTransition(current: OrderStatus, next: OrderStatus): boolean {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PAYMENT_PENDING, OrderStatus.CANCELLED],
      [OrderStatus.PAYMENT_PENDING]: [OrderStatus.PAYMENT_CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.PAYMENT_CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
      [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUNDED]: [],
    };

    return validTransitions[current]?.includes(next) ?? false;
  }

  /**
   * Agregar entrada al historial de estados
   */
  private addStatusHistory(
    order: OrderDocument,
    status: OrderStatus,
    note?: string,
    updatedBy?: string,
  ): void {
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      note,
      updatedBy,
    });
  }

  /**
   * Enviar email de orden (async, no bloquea)
   */
  private sendOrderEmail(
    order: OrderDocument,
    type: 'confirmation' | 'payment' | 'shipping' | 'delivery',
  ): void {
    const emailData: OrderEmailData = {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      items: order.items.map((item) => ({
        nombre: item.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal,
      })),
      subtotal: order.subtotal,
      discount: order.discount,
      shippingCost: order.shippingCost,
      total: order.total,
      shippingAddress: {
        fullName: order.shippingAddress.fullName,
        address: order.shippingAddress.address,
        ciudadNombre: order.shippingAddress.ciudadNombre,
        departamentoNombre: order.shippingAddress.departamentoNombre,
      },
      trackingNumber: order.shippingInfo?.trackingNumber,
      trackingUrl: order.shippingInfo?.trackingUrl,
    };

    // Enviar email de forma asíncrona (no bloquea la respuesta)
    switch (type) {
      case 'confirmation':
        this.emailService.sendOrderConfirmation(emailData).catch((err) => {
          this.logger.error(`Error enviando email de confirmación: ${err.message}`);
        });
        break;
      case 'payment':
        this.emailService.sendPaymentConfirmation(emailData).catch((err) => {
          this.logger.error(`Error enviando email de pago: ${err.message}`);
        });
        break;
      case 'shipping':
        this.emailService.sendShippingNotification(emailData).catch((err) => {
          this.logger.error(`Error enviando email de envío: ${err.message}`);
        });
        break;
      case 'delivery':
        this.emailService.sendDeliveryConfirmation(emailData).catch((err) => {
          this.logger.error(`Error enviando email de entrega: ${err.message}`);
        });
        break;
    }
  }
}
