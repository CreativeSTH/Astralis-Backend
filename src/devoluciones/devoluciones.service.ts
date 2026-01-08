import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Devolucion,
  DevolucionDocument,
  EstadoDevolucion,
  TipoReembolso,
} from './schemas/devolucion.schema';
import { CreateDevolucionDto } from './dto/create-devolucion.dto';
import { AprobarDevolucionDto } from './dto/aprobar-devolucion.dto';
import { RechazarDevolucionDto } from './dto/rechazar-devolucion.dto';
import { VentasService } from '../ventas/ventas.service';
import { ProductosService } from '../productos/productos.service';
import { ClientesService } from '../clientes/clientes.service';

export interface DevolucionFilters {
  estado?: EstadoDevolucion;
  clienteId?: string;
  ventaId?: string;
  desde?: Date;
  hasta?: Date;
  page?: number;
  limit?: number;
}

export interface PaginatedDevoluciones {
  data: DevolucionDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class DevolucionesService {
  constructor(
    @InjectModel(Devolucion.name)
    private devolucionModel: Model<DevolucionDocument>,
    private ventasService: VentasService,
    private productosService: ProductosService,
    private clientesService: ClientesService,
  ) {}

  // ==================== CREAR DEVOLUCIÓN ====================

  async create(
    createDevolucionDto: CreateDevolucionDto,
    usuarioId?: string,
  ): Promise<DevolucionDocument> {
    // Obtener la venta
    const venta = await this.ventasService.findOne(createDevolucionDto.ventaId);

    // Validar que la venta no esté cancelada
    if (venta.estado === 'CANCELADA') {
      throw new BadRequestException('No se puede crear devolución de una venta cancelada');
    }

    // Validar productos y cantidades
    const productosDevolucion: Array<{
      productoId: Types.ObjectId;
      nombreProducto: string;
      cantidad: number;
      precioUnitario: number;
      subtotal: number;
      motivo?: string;
    }> = [];
    let montoTotal = 0;

    for (const item of createDevolucionDto.productos) {
      // Buscar el producto en la venta
      const productoVenta = venta.productos.find(
        (p) => p.productoId.toString() === item.productoId,
      );

      if (!productoVenta) {
        throw new BadRequestException(
          `El producto ${item.productoId} no existe en la venta`,
        );
      }

      // Validar cantidad
      if (item.cantidad > productoVenta.cantidad) {
        throw new BadRequestException(
          `La cantidad a devolver (${item.cantidad}) excede la cantidad vendida (${productoVenta.cantidad}) para ${productoVenta.nombreProducto}`,
        );
      }

      // Verificar devoluciones previas del mismo producto
      const devolucionesAnteriores = await this.devolucionModel
        .find({
          ventaId: new Types.ObjectId(createDevolucionDto.ventaId),
          estado: { $nin: [EstadoDevolucion.RECHAZADA, EstadoDevolucion.CANCELADA] },
          'productos.productoId': new Types.ObjectId(item.productoId),
        })
        .exec();

      let cantidadYaDevuelta = 0;
      for (const dev of devolucionesAnteriores) {
        const prodDev = dev.productos.find(
          (p) => p.productoId.toString() === item.productoId,
        );
        if (prodDev) {
          cantidadYaDevuelta += prodDev.cantidad;
        }
      }

      const cantidadDisponible = productoVenta.cantidad - cantidadYaDevuelta;
      if (item.cantidad > cantidadDisponible) {
        throw new BadRequestException(
          `Solo quedan ${cantidadDisponible} unidades disponibles para devolver de ${productoVenta.nombreProducto} (ya se devolvieron ${cantidadYaDevuelta})`,
        );
      }

      const subtotal = productoVenta.precioUnitario * item.cantidad;
      montoTotal += subtotal;

      productosDevolucion.push({
        productoId: new Types.ObjectId(item.productoId),
        nombreProducto: productoVenta.nombreProducto,
        cantidad: item.cantidad,
        precioUnitario: productoVenta.precioUnitario,
        subtotal,
        motivo: item.motivo,
      });
    }

    // Crear la devolución
    const devolucion = new this.devolucionModel({
      ventaId: new Types.ObjectId(createDevolucionDto.ventaId),
      numeroVenta: venta._id.toString().slice(-8).toUpperCase(),
      clienteId: venta.clienteId,
      nombreCliente: venta.nombreCliente,
      productos: productosDevolucion,
      motivo: createDevolucionDto.motivo,
      descripcionMotivo: createDevolucionDto.descripcionMotivo,
      montoTotal,
      tipoReembolso: createDevolucionDto.tipoReembolso,
      devolverStock: createDevolucionDto.devolverStock ?? true,
      afectaDeuda: createDevolucionDto.afectaDeuda ?? true,
      solicitadaPor: usuarioId,
      fechaSolicitud: new Date(),
      notas: createDevolucionDto.notas,
      historial: [
        {
          estado: EstadoDevolucion.PENDIENTE,
          fecha: new Date(),
          usuarioId,
          comentario: 'Solicitud de devolución creada',
        },
      ],
    });

    return devolucion.save();
  }

  // ==================== CONSULTAS ====================

  async findAll(): Promise<DevolucionDocument[]> {
    return this.devolucionModel
      .find({ activo: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<DevolucionDocument> {
    const devolucion = await this.devolucionModel.findById(id).exec();
    if (!devolucion) {
      throw new NotFoundException(`Devolución con ID ${id} no encontrada`);
    }
    return devolucion;
  }

  async findPendientes(): Promise<DevolucionDocument[]> {
    return this.devolucionModel
      .find({ estado: EstadoDevolucion.PENDIENTE, activo: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAprobadas(): Promise<DevolucionDocument[]> {
    return this.devolucionModel
      .find({ estado: EstadoDevolucion.APROBADA, activo: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByVenta(ventaId: string): Promise<DevolucionDocument[]> {
    return this.devolucionModel
      .find({ ventaId: new Types.ObjectId(ventaId), activo: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByCliente(clienteId: string): Promise<DevolucionDocument[]> {
    return this.devolucionModel
      .find({ clienteId: new Types.ObjectId(clienteId), activo: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findWithFilters(filters: DevolucionFilters): Promise<PaginatedDevoluciones> {
    const {
      estado,
      clienteId,
      ventaId,
      desde,
      hasta,
      page = 1,
      limit = 20,
    } = filters;

    const query: any = { activo: true };

    if (estado) query.estado = estado;
    if (clienteId) query.clienteId = new Types.ObjectId(clienteId);
    if (ventaId) query.ventaId = new Types.ObjectId(ventaId);
    if (desde || hasta) {
      query.createdAt = {};
      if (desde) query.createdAt.$gte = desde;
      if (hasta) query.createdAt.$lte = hasta;
    }

    const total = await this.devolucionModel.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const data = await this.devolucionModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return { data, total, page, limit, totalPages };
  }

  // ==================== APROBAR ====================

  async aprobar(
    id: string,
    aprobarDto: AprobarDevolucionDto,
    usuarioId?: string,
  ): Promise<DevolucionDocument> {
    const devolucion = await this.findOne(id);

    if (devolucion.estado !== EstadoDevolucion.PENDIENTE) {
      throw new BadRequestException(
        `Solo se pueden aprobar devoluciones en estado PENDIENTE. Estado actual: ${devolucion.estado}`,
      );
    }

    const montoReembolso = aprobarDto.montoReembolso ?? devolucion.montoTotal;

    devolucion.estado = EstadoDevolucion.APROBADA;
    devolucion.tipoReembolso = aprobarDto.tipoReembolso;
    devolucion.montoReembolsado = montoReembolso;
    devolucion.devolverStock = aprobarDto.devolverStock ?? devolucion.devolverStock;
    devolucion.afectaDeuda = aprobarDto.afectaDeuda ?? devolucion.afectaDeuda;
    devolucion.aprobadaPor = usuarioId;
    devolucion.fechaAprobacion = new Date();

    devolucion.historial.push({
      estado: EstadoDevolucion.APROBADA,
      fecha: new Date(),
      usuarioId,
      comentario: aprobarDto.comentario || 'Devolución aprobada',
    });

    return devolucion.save();
  }

  // ==================== RECHAZAR ====================

  async rechazar(
    id: string,
    rechazarDto: RechazarDevolucionDto,
    usuarioId?: string,
  ): Promise<DevolucionDocument> {
    const devolucion = await this.findOne(id);

    if (devolucion.estado !== EstadoDevolucion.PENDIENTE) {
      throw new BadRequestException(
        `Solo se pueden rechazar devoluciones en estado PENDIENTE. Estado actual: ${devolucion.estado}`,
      );
    }

    devolucion.estado = EstadoDevolucion.RECHAZADA;
    devolucion.rechazadaPor = usuarioId;
    devolucion.fechaRechazo = new Date();
    devolucion.motivoRechazo = rechazarDto.motivoRechazo;

    devolucion.historial.push({
      estado: EstadoDevolucion.RECHAZADA,
      fecha: new Date(),
      usuarioId,
      comentario: rechazarDto.motivoRechazo,
    });

    return devolucion.save();
  }

  // ==================== PROCESAR ====================

  async procesar(id: string, usuarioId?: string): Promise<DevolucionDocument> {
    const devolucion = await this.findOne(id);

    if (devolucion.estado !== EstadoDevolucion.APROBADA) {
      throw new BadRequestException(
        `Solo se pueden procesar devoluciones en estado APROBADA. Estado actual: ${devolucion.estado}`,
      );
    }

    // 1. Devolver stock si aplica
    if (devolucion.devolverStock && !devolucion.stockDevuelto) {
      for (const producto of devolucion.productos) {
        const prod = await this.productosService.findOne(producto.productoId.toString());

        // Agregar stock directamente (sin cambiar precio)
        await this.productosService.addStock(producto.productoId.toString(), {
          cantidad: producto.cantidad,
          precioCompra: prod.precioCompra, // Mantener el precio actual
        });
      }
      devolucion.stockDevuelto = true;
    }

    // 2. Ajustar deuda del cliente si aplica
    if (devolucion.afectaDeuda && !devolucion.deudaAjustada) {
      if (
        devolucion.tipoReembolso === TipoReembolso.DESCUENTO_DEUDA ||
        devolucion.tipoReembolso === TipoReembolso.CREDITO_TIENDA
      ) {
        await this.clientesService.decrementarDeuda(
          devolucion.clienteId.toString(),
          devolucion.montoReembolsado,
        );
      }
      devolucion.deudaAjustada = true;
    }

    // 3. Actualizar estado
    devolucion.estado = EstadoDevolucion.PROCESADA;
    devolucion.procesadaPor = usuarioId;
    devolucion.fechaProcesamiento = new Date();

    devolucion.historial.push({
      estado: EstadoDevolucion.PROCESADA,
      fecha: new Date(),
      usuarioId,
      comentario: `Devolución procesada. Stock devuelto: ${devolucion.stockDevuelto}. Deuda ajustada: ${devolucion.deudaAjustada}.`,
    });

    return devolucion.save();
  }

  // ==================== CANCELAR ====================

  async cancelar(id: string, usuarioId?: string): Promise<DevolucionDocument> {
    const devolucion = await this.findOne(id);

    if (devolucion.estado === EstadoDevolucion.PROCESADA) {
      throw new BadRequestException(
        'No se puede cancelar una devolución ya procesada',
      );
    }

    devolucion.estado = EstadoDevolucion.CANCELADA;

    devolucion.historial.push({
      estado: EstadoDevolucion.CANCELADA,
      fecha: new Date(),
      usuarioId,
      comentario: 'Devolución cancelada',
    });

    return devolucion.save();
  }

  // ==================== ESTADÍSTICAS ====================

  async getEstadisticas(): Promise<any> {
    const [
      total,
      pendientes,
      aprobadas,
      procesadas,
      rechazadas,
    ] = await Promise.all([
      this.devolucionModel.countDocuments({ activo: true }),
      this.devolucionModel.countDocuments({ estado: EstadoDevolucion.PENDIENTE, activo: true }),
      this.devolucionModel.countDocuments({ estado: EstadoDevolucion.APROBADA, activo: true }),
      this.devolucionModel.countDocuments({ estado: EstadoDevolucion.PROCESADA, activo: true }),
      this.devolucionModel.countDocuments({ estado: EstadoDevolucion.RECHAZADA, activo: true }),
    ]);

    const montoTotalProcesado = await this.devolucionModel.aggregate([
      { $match: { estado: EstadoDevolucion.PROCESADA, activo: true } },
      { $group: { _id: null, total: { $sum: '$montoReembolsado' } } },
    ]);

    const montoPendienteAprobado = await this.devolucionModel.aggregate([
      { $match: { estado: EstadoDevolucion.APROBADA, activo: true } },
      { $group: { _id: null, total: { $sum: '$montoReembolsado' } } },
    ]);

    return {
      total,
      porEstado: {
        pendientes,
        aprobadas,
        procesadas,
        rechazadas,
      },
      montos: {
        procesado: montoTotalProcesado[0]?.total || 0,
        pendienteAprobado: montoPendienteAprobado[0]?.total || 0,
      },
    };
  }
}
