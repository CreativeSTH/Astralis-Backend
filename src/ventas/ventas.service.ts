import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Venta, VentaDocument, EstadoVenta, Cuota, TipoVenta, CanalVenta, MetodoPago, RegistroPago } from './schemas/venta.schema';
import { CreateVentaDto } from './dto/create-venta.dto';
import { AbonarCuotaDto } from './dto/abonar-cuota.dto';
import { ProductosService } from '../productos/productos.service';
import { ClientesService } from '../clientes/clientes.service';

interface ProductoVentaDetalle {
  productoId: Types.ObjectId;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  costoUnitario?: number;
}

export interface VentaFilters {
  estado?: EstadoVenta;
  canal?: CanalVenta;
  tipoVenta?: TipoVenta;
  clienteId?: string;
  desde?: Date;
  hasta?: Date;
  page?: number;
  limit?: number;
}

export interface PaginatedVentas {
  ventas: VentaDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OrderDataForVenta {
  orderId: string;
  userId?: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  items: Array<{
    productoId: string;
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }>;
  total: number;
}

@Injectable()
export class VentasService {
  constructor(
    @InjectModel(Venta.name)
    private ventaModel: Model<VentaDocument>,
    private productosService: ProductosService,
    private clientesService: ClientesService,
    // Ya no necesitamos CobrosService
  ) {}

  async create(createVentaDto: CreateVentaDto, usuarioId?: string): Promise<VentaDocument> {
    const cliente = await this.clientesService.findOne(createVentaDto.clienteId);

    let totalVenta = 0;
    let costoTotal = 0;
    const productosVenta: ProductoVentaDetalle[] = [];

    // === PROCESAR PRODUCTOS ===
    for (const item of createVentaDto.productos) {
      const producto = await this.productosService.findOne(item.productoId);

      // Validar stock
      if (producto.stock < item.cantidad) {
        throw new BadRequestException(
          `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}`
        );
      }

      const precioUnitario = item.precioVentaCustom || producto.precioVenta;
      const subtotal = precioUnitario * item.cantidad;
      const costoSubtotal = producto.precioCompra * item.cantidad;

      // === VALIDAR MARGEN ===
      if (!createVentaDto.omitirValidacionMargen && precioUnitario < producto.precioCompra) {
        throw new BadRequestException(
          `El precio de venta ($${precioUnitario.toLocaleString()}) es menor al costo ($${producto.precioCompra.toLocaleString()}) para ${producto.nombre}. ` +
          `Use omitirValidacionMargen: true para ventas promocionales.`
        );
      }

      totalVenta += subtotal;
      costoTotal += costoSubtotal;

      productosVenta.push({
        productoId: producto._id,
        nombreProducto: producto.nombre,
        cantidad: item.cantidad,
        precioUnitario: precioUnitario,
        subtotal,
        costoUnitario: producto.precioCompra,
      });
    }

    // === APLICAR DESCUENTO ===
    let montoDescontado = 0;
    if (createVentaDto.descuento) {
      if (createVentaDto.descuento.tipo === 'PORCENTAJE') {
        montoDescontado = totalVenta * (createVentaDto.descuento.valor / 100);
      } else {
        montoDescontado = createVentaDto.descuento.valor;
      }
      totalVenta -= montoDescontado;
    }

    // === VALIDAR CRÉDITO DISPONIBLE (solo para crédito) ===
    const tipoVenta = createVentaDto.tipoVenta || TipoVenta.CREDITO;
    if (tipoVenta === TipoVenta.CREDITO && !createVentaDto.omitirValidacionCredito) {
      const verificacion = await this.clientesService.verificarCreditoDisponible(
        cliente._id.toString(),
        totalVenta
      );

      if (!verificacion.aprobado) {
        throw new BadRequestException(verificacion.motivo);
      }
    }

    // === GENERAR CUOTAS ===
    const montoCuota = totalVenta / createVentaDto.numeroCuotas;
    const cuotas = this.generarCuotas(
      createVentaDto.fechaPrimerPago,
      createVentaDto.numeroCuotas,
      montoCuota
    );

    // === CALCULAR MARGEN ===
    const margenBruto = totalVenta - costoTotal;

    // === CREAR VENTA ===
    const nuevaVenta = new this.ventaModel({
      clienteId: cliente._id,
      nombreCliente: cliente.nombreCompleto,
      productos: productosVenta,
      totalVenta,
      costoTotal,
      margenBruto,
      descuento: createVentaDto.descuento ? {
        ...createVentaDto.descuento,
        montoDescontado,
      } : undefined,
      tipoVenta,
      numeroCuotas: createVentaDto.numeroCuotas,
      montoCuota,
      fechaPrimerPago: createVentaDto.fechaPrimerPago,
      cuotas,
      totalPendiente: totalVenta,
      tasaInteresMora: createVentaDto.tasaInteresMora || 0,
      creadaPor: usuarioId ? new Types.ObjectId(usuarioId) : undefined,
      estado: tipoVenta === TipoVenta.CONTADO && createVentaDto.pagarInmediatamente
        ? EstadoVenta.COMPLETADA
        : EstadoVenta.ACTIVA,
      totalPagado: tipoVenta === TipoVenta.CONTADO && createVentaDto.pagarInmediatamente
        ? totalVenta
        : 0,
      cuotasPagadas: tipoVenta === TipoVenta.CONTADO && createVentaDto.pagarInmediatamente
        ? createVentaDto.numeroCuotas
        : 0,
    });

    // === SI ES CONTADO Y PAGA INMEDIATAMENTE ===
    if (tipoVenta === TipoVenta.CONTADO && createVentaDto.pagarInmediatamente) {
      nuevaVenta.cuotas.forEach(cuota => {
        cuota.pagada = true;
        cuota.fechaPago = new Date();
        cuota.montoPagado = cuota.monto;
        cuota.saldoPendiente = 0;
        cuota.historialPagos = [{
          monto: cuota.monto,
          fecha: new Date(),
          metodoPago: MetodoPago.EFECTIVO,
          registradoPor: usuarioId ? new Types.ObjectId(usuarioId) : undefined,
        }];
      });
      nuevaVenta.totalPendiente = 0;
    }

    // === ACTUALIZAR STOCK ===
    for (const item of createVentaDto.productos) {
      await this.productosService.actualizarStock(item.productoId, item.cantidad);
      await this.productosService.incrementarVendido(item.productoId, item.cantidad);
    }

    const ventaGuardada = await nuevaVenta.save();

    // === ACTUALIZAR CLIENTE ===
    await this.clientesService.incrementarCreditosActivos(cliente._id.toString());

    // Solo incrementar deuda si es crédito y no se pagó inmediatamente
    if (tipoVenta === TipoVenta.CREDITO || !createVentaDto.pagarInmediatamente) {
      await this.clientesService.incrementarDeuda(cliente._id.toString(), totalVenta);
    }

    return ventaGuardada;
  }

  private generarCuotas(fechaInicio: Date, numeroCuotas: number, montoCuota: number): Cuota[] {
    const cuotas: Cuota[] = [];
    let fecha = new Date(fechaInicio);

    for (let i = 1; i <= numeroCuotas; i++) {
      cuotas.push({
        numeroCuota: i,
        fechaVencimiento: new Date(fecha),
        monto: montoCuota,
        montoPagado: 0,
        saldoPendiente: montoCuota,
        pagada: false,
        pagoTardio: false,
        // Campos de mora
        diasMora: 0,
        interesMora: 0,
        montoMora: 0,
        montoTotalConMora: montoCuota,
        // Historial
        historialPagos: [],
        fechasPagosAbonos: []
      });

      fecha = this.calcularSiguienteQuincena(fecha);
    }

    return cuotas;
  }

  private calcularSiguienteQuincena(fecha: Date): Date {
    const nuevaFecha = new Date(fecha);
    const dia = nuevaFecha.getDate();

    if (dia <= 15) {
      nuevaFecha.setDate(30);
      if (nuevaFecha.getMonth() !== fecha.getMonth()) {
        nuevaFecha.setDate(0);
      }
    } else {
      nuevaFecha.setMonth(nuevaFecha.getMonth() + 1);
      nuevaFecha.setDate(15);
    }

    return nuevaFecha;
  }

  /**
   * MÉTODO PRINCIPAL: Abonar a una cuota
   * Este es el único método que modifica cuotas - usado por venta-detalle Y cobros
   */
  async abonarCuota(ventaId: string, abonarCuotaDto: AbonarCuotaDto, usuarioId?: string): Promise<VentaDocument> {
    const venta = await this.findOne(ventaId);

    const cuota = venta.cuotas.find(c => c.numeroCuota === abonarCuotaDto.numeroCuota);
    if (!cuota) {
      throw new NotFoundException(`Cuota ${abonarCuotaDto.numeroCuota} no encontrada`);
    }

    if (cuota.pagada) {
      throw new BadRequestException(`La cuota ${abonarCuotaDto.numeroCuota} ya está completamente pagada`);
    }

    // === CALCULAR MORA SI APLICA ===
    const hoy = new Date(abonarCuotaDto.fechaPago);
    const fechaVencimiento = new Date(cuota.fechaVencimiento);
    const pagoTardio = hoy > fechaVencimiento;
    let montoMoraCuota = 0;

    if (pagoTardio && venta.tasaInteresMora > 0) {
      const diasMora = Math.floor((hoy.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24));
      cuota.diasMora = diasMora;
      cuota.interesMora = venta.tasaInteresMora;
      montoMoraCuota = cuota.monto * (venta.tasaInteresMora / 100) * diasMora;
      cuota.montoMora = montoMoraCuota;
      cuota.montoTotalConMora = cuota.monto + montoMoraCuota;
    }

    // === DETERMINAR MONTO TOTAL A PAGAR ===
    const montoTotalCuota = abonarCuotaDto.incluirMora
      ? cuota.montoTotalConMora || cuota.monto
      : cuota.monto;
    const saldoPendienteReal = montoTotalCuota - cuota.montoPagado;

    // Validar que el abono no exceda el saldo pendiente
    if (abonarCuotaDto.montoAbono > saldoPendienteReal + 0.01) { // Tolerancia de 1 centavo
      throw new BadRequestException(
        `El abono ($${abonarCuotaDto.montoAbono.toLocaleString()}) excede el saldo pendiente ($${saldoPendienteReal.toLocaleString()})`
      );
    }

    // === REGISTRAR PAGO CON AUDITORÍA ===
    const registroPago: RegistroPago = {
      monto: abonarCuotaDto.montoAbono,
      fecha: abonarCuotaDto.fechaPago,
      metodoPago: abonarCuotaDto.metodoPago || MetodoPago.EFECTIVO,
      referenciaPago: abonarCuotaDto.referenciaPago,
      registradoPor: usuarioId ? new Types.ObjectId(usuarioId) : undefined,
      notas: abonarCuotaDto.notas,
    };

    if (!cuota.historialPagos) {
      cuota.historialPagos = [];
    }
    cuota.historialPagos.push(registroPago);

    // Actualizar monto pagado y saldo pendiente
    cuota.montoPagado += abonarCuotaDto.montoAbono;
    cuota.saldoPendiente = saldoPendienteReal - abonarCuotaDto.montoAbono;

    // Legacy: mantener fechasPagosAbonos
    if (!cuota.fechasPagosAbonos) {
      cuota.fechasPagosAbonos = [];
    }
    cuota.fechasPagosAbonos.push(abonarCuotaDto.fechaPago);

    // Si se pagó completo, marcar como pagada
    if (cuota.saldoPendiente <= 0.01) { // Tolerancia de 1 centavo
      cuota.pagada = true;
      cuota.fechaPago = abonarCuotaDto.fechaPago;
      cuota.pagoTardio = pagoTardio;
      cuota.saldoPendiente = 0;
      venta.cuotasPagadas += 1;

      // Actualizar score del cliente
      if (venta.clienteId) {
        await this.clientesService.actualizarScore(
          venta.clienteId.toString(),
          !pagoTardio
        );
      }
    }

    // === ACTUALIZAR TOTALES DE VENTA ===
    venta.totalPagado += abonarCuotaDto.montoAbono;
    venta.totalPendiente -= abonarCuotaDto.montoAbono;
    if (montoMoraCuota > 0) {
      venta.totalMora += montoMoraCuota;
    }

    // === ACTUALIZAR DEUDA DEL CLIENTE ===
    if (venta.clienteId) {
      await this.clientesService.decrementarDeuda(
        venta.clienteId.toString(),
        abonarCuotaDto.montoAbono
      );
    }

    // === ACTUALIZAR ESTADO DE VENTA ===
    if (venta.cuotasPagadas === venta.numeroCuotas) {
      venta.estado = EstadoVenta.COMPLETADA;
      if (venta.clienteId) {
        await this.clientesService.decrementarCreditosActivos(
          venta.clienteId.toString()
        );
      }
    } else if (venta.cuotasPagadas > 0) {
      venta.estado = EstadoVenta.PARCIALMENTE_PAGADA;
    }

    // Guardar con mark modified
    venta.markModified('cuotas');
    const ventaActualizada = await venta.save();

    return ventaActualizada;
  }

  // Mantener el método antiguo por compatibilidad
  async registrarPagoCuota(
    ventaId: string,
    numeroCuota: number,
    fechaPago: Date
  ): Promise<VentaDocument> {
    const venta = await this.findOne(ventaId);
    const cuota = venta.cuotas.find(c => c.numeroCuota === numeroCuota);
    
    if (!cuota) {
      throw new NotFoundException(`Cuota ${numeroCuota} no encontrada`);
    }

    return this.abonarCuota(ventaId, {
      numeroCuota,
      montoAbono: cuota.saldoPendiente,
      fechaPago
    });
  }

  async findAll(): Promise<VentaDocument[]> {
    return this.ventaModel
      .find()
      .populate('clienteId', 'nombreCompleto telefono')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findActivas(): Promise<VentaDocument[]> {
    return this.ventaModel
      .find({ estado: EstadoVenta.ACTIVA })
      .populate('clienteId', 'nombreCompleto telefono score')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findCompletadas(): Promise<VentaDocument[]> {
    return this.ventaModel
      .find({ estado: EstadoVenta.COMPLETADA })
      .populate('clienteId', 'nombreCompleto telefono')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findByCliente(clienteId: string): Promise<VentaDocument[]> {
    return this.ventaModel
      .find({ clienteId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<VentaDocument> {
    const venta = await this.ventaModel
      .findById(id)
      .exec();
    
    if (!venta) {
      throw new NotFoundException(`Venta con ID ${id} no encontrada`);
    }
    return venta;
  }

  async verificarVencimientos(): Promise<void> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const ventasActivas = await this.findActivas();

    for (const venta of ventasActivas) {
      let tieneVencidas = false;

      for (const cuota of venta.cuotas) {
        if (!cuota.pagada && cuota.fechaVencimiento < hoy) {
          tieneVencidas = true;
          break;
        }
      }

      if (tieneVencidas && venta.estado !== EstadoVenta.VENCIDA) {
        await this.ventaModel
          .findByIdAndUpdate(venta._id, { estado: EstadoVenta.VENCIDA })
          .exec();
      }
    }
  }

  /**
   * Crear venta desde una orden de e-commerce confirmada
   * Este método descuenta el stock y registra la venta
   */
  async createFromOrder(orderData: OrderDataForVenta): Promise<VentaDocument> {
    const productosVenta: ProductoVentaDetalle[] = [];

    for (const item of orderData.items) {
      await this.productosService.actualizarStock(item.productoId, item.cantidad);
      await this.productosService.incrementarVendido(item.productoId, item.cantidad);

      productosVenta.push({
        productoId: new Types.ObjectId(item.productoId),
        nombreProducto: item.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal,
      });
    }

    const ahora = new Date();

    const venta = new this.ventaModel({
      orderId: new Types.ObjectId(orderData.orderId),
      usuarioId: orderData.userId
        ? new Types.ObjectId(orderData.userId)
        : undefined,
      emailComprador: orderData.customerEmail,
      telefonoComprador: orderData.customerPhone,
      nombreCliente: orderData.customerName,
      canal: CanalVenta.ECOMMERCE,
      productos: productosVenta,
      totalVenta: orderData.total,
      tipoVenta: TipoVenta.CONTADO,
      numeroCuotas: 1,
      montoCuota: orderData.total,
      fechaPrimerPago: ahora,
      cuotas: [
        {
          numeroCuota: 1,
          fechaVencimiento: ahora,
          monto: orderData.total,
          montoPagado: orderData.total,
          saldoPendiente: 0,
          pagada: true,
          fechaPago: ahora,
          pagoTardio: false,
          fechasPagosAbonos: [ahora],
        },
      ],
      totalPagado: orderData.total,
      totalPendiente: 0,
      cuotasPagadas: 1,
      estado: EstadoVenta.COMPLETADA,
    });

    return venta.save();
  }

  async findByOrderId(orderId: string): Promise<VentaDocument | null> {
    return this.ventaModel
      .findOne({ orderId: new Types.ObjectId(orderId) })
      .exec();
  }

  async findByUsuarioId(usuarioId: string): Promise<VentaDocument[]> {
    return this.ventaModel
      .find({ usuarioId: new Types.ObjectId(usuarioId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByCanal(canal: CanalVenta): Promise<VentaDocument[]> {
    return this.ventaModel
      .find({ canal })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getEstadisticas(options?: {
    canal?: CanalVenta;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalVentas: number;
    montoTotal: number;
    ventasContado: number;
    ventasCredito: number;
    ventasEcommerce: number;
    ventasTienda: number;
  }> {
    const filter: any = {};

    if (options?.canal) {
      filter.canal = options.canal;
    }

    if (options?.startDate || options?.endDate) {
      filter.createdAt = {};
      if (options.startDate) filter.createdAt.$gte = options.startDate;
      if (options.endDate) filter.createdAt.$lte = options.endDate;
    }

    const ventas = await this.ventaModel.find(filter).exec();

    return {
      totalVentas: ventas.length,
      montoTotal: ventas.reduce((sum, v) => sum + v.totalVenta, 0),
      ventasContado: ventas.filter((v) => v.tipoVenta === TipoVenta.CONTADO).length,
      ventasCredito: ventas.filter((v) => v.tipoVenta === TipoVenta.CREDITO).length,
      ventasEcommerce: ventas.filter((v) => v.canal === CanalVenta.ECOMMERCE).length,
      ventasTienda: ventas.filter((v) => v.canal === CanalVenta.TIENDA).length,
    };
  }

  // ==================== NUEVOS MÉTODOS ====================

  /**
   * Búsqueda avanzada con filtros y paginación
   */
  async findWithFilters(filters: VentaFilters): Promise<PaginatedVentas> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (filters.estado) {
      query.estado = filters.estado;
    }

    if (filters.canal) {
      query.canal = filters.canal;
    }

    if (filters.tipoVenta) {
      query.tipoVenta = filters.tipoVenta;
    }

    if (filters.clienteId) {
      query.clienteId = new Types.ObjectId(filters.clienteId);
    }

    if (filters.desde || filters.hasta) {
      query.createdAt = {};
      if (filters.desde) query.createdAt.$gte = filters.desde;
      if (filters.hasta) query.createdAt.$lte = filters.hasta;
    }

    const [ventas, total] = await Promise.all([
      this.ventaModel
        .find(query)
        .populate('clienteId', 'nombreCompleto telefono score')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.ventaModel.countDocuments(query),
    ]);

    return {
      ventas,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Cancelar una venta
   */
  async cancelarVenta(
    ventaId: string,
    motivo: string,
    usuarioId?: string,
    devolverStock: boolean = true,
  ): Promise<VentaDocument> {
    const venta = await this.findOne(ventaId);

    if (venta.estado === EstadoVenta.CANCELADA) {
      throw new BadRequestException('Esta venta ya está cancelada');
    }

    if (venta.estado === EstadoVenta.COMPLETADA) {
      throw new BadRequestException('No se puede cancelar una venta completada');
    }

    // Devolver stock si aplica
    if (devolverStock) {
      for (const producto of venta.productos) {
        await this.productosService.actualizarStock(
          producto.productoId.toString(),
          -producto.cantidad // Negativo para sumar stock
        );
      }
    }

    // Actualizar deuda del cliente
    if (venta.clienteId && venta.totalPendiente > 0) {
      await this.clientesService.decrementarDeuda(
        venta.clienteId.toString(),
        venta.totalPendiente
      );
      await this.clientesService.decrementarCreditosActivos(
        venta.clienteId.toString()
      );
    }

    // Marcar como cancelada
    venta.estado = EstadoVenta.CANCELADA;
    venta.motivoCancelacion = motivo;
    venta.fechaCancelacion = new Date();
    venta.canceladaPor = usuarioId ? new Types.ObjectId(usuarioId) : undefined;

    return venta.save();
  }

  /**
   * Calcular y actualizar mora de cuotas vencidas
   */
  async calcularMorasCuotasVencidas(): Promise<{
    ventasActualizadas: number;
    totalMoraCalculada: number;
  }> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const ventasConCuotasVencidas = await this.ventaModel.find({
      estado: { $in: [EstadoVenta.ACTIVA, EstadoVenta.PARCIALMENTE_PAGADA, EstadoVenta.VENCIDA, EstadoVenta.EN_MORA] },
      tasaInteresMora: { $gt: 0 },
      'cuotas.pagada': false,
      'cuotas.fechaVencimiento': { $lt: hoy },
    }).exec();

    let ventasActualizadas = 0;
    let totalMoraCalculada = 0;

    for (const venta of ventasConCuotasVencidas) {
      let ventaModificada = false;
      let totalMoraVenta = 0;

      for (const cuota of venta.cuotas) {
        if (!cuota.pagada && cuota.fechaVencimiento < hoy) {
          const diasMora = Math.floor(
            (hoy.getTime() - new Date(cuota.fechaVencimiento).getTime()) / (1000 * 60 * 60 * 24)
          );

          if (diasMora !== cuota.diasMora) {
            cuota.diasMora = diasMora;
            cuota.interesMora = venta.tasaInteresMora;
            cuota.montoMora = cuota.monto * (venta.tasaInteresMora / 100) * diasMora;
            cuota.montoTotalConMora = cuota.monto + cuota.montoMora;
            totalMoraVenta += cuota.montoMora;
            ventaModificada = true;
          }
        }
      }

      if (ventaModificada) {
        venta.totalMora = totalMoraVenta;

        // Actualizar estado si tiene mora
        if (venta.estado !== EstadoVenta.EN_MORA && totalMoraVenta > 0) {
          venta.estado = EstadoVenta.EN_MORA;
        }

        venta.markModified('cuotas');
        await venta.save();
        ventasActualizadas++;
        totalMoraCalculada += totalMoraVenta;
      }
    }

    return { ventasActualizadas, totalMoraCalculada };
  }

  /**
   * Estadísticas completas para dashboard admin
   */
  async getDashboardStats(options?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    ventas: {
      total: number;
      monto: number;
      credito: number;
      contado: number;
      ecommerce: number;
      tienda: number;
    };
    cobranza: {
      totalPendiente: number;
      totalVencido: number;
      totalMora: number;
      cuotasPendientes: number;
      cuotasVencidas: number;
    };
    estados: {
      activas: number;
      parcialmentePagadas: number;
      completadas: number;
      vencidas: number;
      enMora: number;
      canceladas: number;
    };
    margen: {
      costoTotal: number;
      ventaTotal: number;
      margenBruto: number;
      porcentajeMargen: number;
    };
  }> {
    const filter: any = {};

    if (options?.startDate || options?.endDate) {
      filter.createdAt = {};
      if (options.startDate) filter.createdAt.$gte = options.startDate;
      if (options.endDate) filter.createdAt.$lte = options.endDate;
    }

    const stats = await this.ventaModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          monto: { $sum: '$totalVenta' },
          credito: { $sum: { $cond: [{ $eq: ['$tipoVenta', TipoVenta.CREDITO] }, 1, 0] } },
          contado: { $sum: { $cond: [{ $eq: ['$tipoVenta', TipoVenta.CONTADO] }, 1, 0] } },
          ecommerce: { $sum: { $cond: [{ $eq: ['$canal', CanalVenta.ECOMMERCE] }, 1, 0] } },
          tienda: { $sum: { $cond: [{ $eq: ['$canal', CanalVenta.TIENDA] }, 1, 0] } },
          totalPendiente: { $sum: '$totalPendiente' },
          totalMora: { $sum: '$totalMora' },
          costoTotal: { $sum: '$costoTotal' },
          margenBruto: { $sum: '$margenBruto' },
          activas: { $sum: { $cond: [{ $eq: ['$estado', EstadoVenta.ACTIVA] }, 1, 0] } },
          parcialmentePagadas: { $sum: { $cond: [{ $eq: ['$estado', EstadoVenta.PARCIALMENTE_PAGADA] }, 1, 0] } },
          completadas: { $sum: { $cond: [{ $eq: ['$estado', EstadoVenta.COMPLETADA] }, 1, 0] } },
          vencidas: { $sum: { $cond: [{ $eq: ['$estado', EstadoVenta.VENCIDA] }, 1, 0] } },
          enMora: { $sum: { $cond: [{ $eq: ['$estado', EstadoVenta.EN_MORA] }, 1, 0] } },
          canceladas: { $sum: { $cond: [{ $eq: ['$estado', EstadoVenta.CANCELADA] }, 1, 0] } },
        },
      },
    ]);

    // Calcular cuotas vencidas
    const hoy = new Date();
    const cuotasStats = await this.ventaModel.aggregate([
      { $match: { ...filter, estado: { $nin: [EstadoVenta.COMPLETADA, EstadoVenta.CANCELADA] } } },
      { $unwind: '$cuotas' },
      {
        $group: {
          _id: null,
          cuotasPendientes: { $sum: { $cond: [{ $eq: ['$cuotas.pagada', false] }, 1, 0] } },
          cuotasVencidas: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$cuotas.pagada', false] }, { $lt: ['$cuotas.fechaVencimiento', hoy] }] },
                1,
                0
              ]
            }
          },
          totalVencido: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$cuotas.pagada', false] }, { $lt: ['$cuotas.fechaVencimiento', hoy] }] },
                '$cuotas.saldoPendiente',
                0
              ]
            }
          },
        },
      },
    ]);

    const data = stats[0] || {};
    const cuotasData = cuotasStats[0] || {};

    return {
      ventas: {
        total: data.total || 0,
        monto: data.monto || 0,
        credito: data.credito || 0,
        contado: data.contado || 0,
        ecommerce: data.ecommerce || 0,
        tienda: data.tienda || 0,
      },
      cobranza: {
        totalPendiente: data.totalPendiente || 0,
        totalVencido: cuotasData.totalVencido || 0,
        totalMora: data.totalMora || 0,
        cuotasPendientes: cuotasData.cuotasPendientes || 0,
        cuotasVencidas: cuotasData.cuotasVencidas || 0,
      },
      estados: {
        activas: data.activas || 0,
        parcialmentePagadas: data.parcialmentePagadas || 0,
        completadas: data.completadas || 0,
        vencidas: data.vencidas || 0,
        enMora: data.enMora || 0,
        canceladas: data.canceladas || 0,
      },
      margen: {
        costoTotal: data.costoTotal || 0,
        ventaTotal: data.monto || 0,
        margenBruto: data.margenBruto || 0,
        porcentajeMargen: data.monto ? Math.round((data.margenBruto / data.monto) * 100 * 10) / 10 : 0,
      },
    };
  }
}