import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Venta, VentaDocument, EstadoVenta, Cuota, TipoVenta } from './schemas/venta.schema';
import { CreateVentaDto } from './dto/create-venta.dto';
import { AbonarCuotaDto } from './dto/abonar-cuota.dto';
import { ProductosService } from '../productos/productos.service';
import { ClientesService } from '../clientes/clientes.service';
import { CobrosService } from '../cobros/cobros.service';

interface ProductoVentaDetalle {
  productoId: Types.ObjectId;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

@Injectable()
export class VentasService {
  constructor(
    @InjectModel(Venta.name)
    private ventaModel: Model<VentaDocument>,
    private productosService: ProductosService,
    private clientesService: ClientesService,
    private cobrosService: CobrosService,
  ) {}

  async create(createVentaDto: CreateVentaDto): Promise<VentaDocument> {
    const cliente = await this.clientesService.findOne(createVentaDto.clienteId);

    let totalVenta = 0;
    const productosVenta: ProductoVentaDetalle[] = [];

    for (const item of createVentaDto.productos) {
      const producto = await this.productosService.findOne(item.productoId);
      
      if (producto.stock < item.cantidad) {
        throw new BadRequestException(
          `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}`
        );
      }

      // Usar precio personalizado si se proporciona, sino usar precio del producto
      const precioUnitario = item.precioVentaCustom || producto.precioVenta;
      const subtotal = precioUnitario * item.cantidad;
      totalVenta += subtotal;

      productosVenta.push({
        productoId: producto._id,
        nombreProducto: producto.nombre,
        cantidad: item.cantidad,
        precioUnitario: precioUnitario,
        subtotal,
      });

      await this.productosService.actualizarStock(item.productoId, item.cantidad);
      await this.productosService.incrementarVendido(item.productoId, item.cantidad);
    }

    const tipoVenta = createVentaDto.tipoVenta || TipoVenta.CREDITO;
    const montoCuota = totalVenta / createVentaDto.numeroCuotas;
    const cuotas = this.generarCuotas(
      createVentaDto.fechaPrimerPago,
      createVentaDto.numeroCuotas,
      montoCuota
    );

    // Inicializar saldoPendiente en cada cuota
    cuotas.forEach(cuota => {
      cuota.saldoPendiente = cuota.monto;
    });

    const nuevaVenta = new this.ventaModel({
      clienteId: cliente._id,
      nombreCliente: cliente.nombreCompleto,
      productos: productosVenta,
      totalVenta,
      tipoVenta,
      numeroCuotas: createVentaDto.numeroCuotas,
      montoCuota,
      fechaPrimerPago: createVentaDto.fechaPrimerPago,
      cuotas,
      totalPendiente: totalVenta,
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

    // Si es venta de contado y se paga inmediatamente, marcar todas las cuotas como pagadas
    if (tipoVenta === TipoVenta.CONTADO && createVentaDto.pagarInmediatamente) {
      nuevaVenta.cuotas.forEach(cuota => {
        cuota.pagada = true;
        cuota.fechaPago = new Date();
        cuota.montoPagado = cuota.monto;
        cuota.saldoPendiente = 0;
      });
      nuevaVenta.totalPendiente = 0;
    }

    const ventaGuardada = await nuevaVenta.save();

    // Solo crear cobros si no es venta de contado pagada inmediatamente
    if (!(tipoVenta === TipoVenta.CONTADO && createVentaDto.pagarInmediatamente)) {
      await this.cobrosService.crearCobrosDesdeVenta(ventaGuardada);
    }

    await this.clientesService.incrementarCreditosActivos(cliente._id.toString());

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

  async abonarCuota(ventaId: string, abonarCuotaDto: AbonarCuotaDto): Promise<VentaDocument> {
    const venta = await this.findOne(ventaId);
    
    const cuota = venta.cuotas.find(c => c.numeroCuota === abonarCuotaDto.numeroCuota);
    if (!cuota) {
      throw new NotFoundException(`Cuota ${abonarCuotaDto.numeroCuota} no encontrada`);
    }

    if (cuota.pagada) {
      throw new BadRequestException(`La cuota ${abonarCuotaDto.numeroCuota} ya está completamente pagada`);
    }

    // Validar que el abono no exceda el saldo pendiente
    if (abonarCuotaDto.montoAbono > cuota.saldoPendiente) {
      throw new BadRequestException(
        `El abono (${abonarCuotaDto.montoAbono}) excede el saldo pendiente (${cuota.saldoPendiente})`
      );
    }

    const pagoTardio = abonarCuotaDto.fechaPago > cuota.fechaVencimiento;
    
    // Actualizar monto pagado y saldo pendiente
    cuota.montoPagado += abonarCuotaDto.montoAbono;
    cuota.saldoPendiente -= abonarCuotaDto.montoAbono;
    
    // Agregar fecha de pago al historial
    if (!cuota.fechasPagosAbonos) {
      cuota.fechasPagosAbonos = [];
    }
    cuota.fechasPagosAbonos.push(abonarCuotaDto.fechaPago);

    // Si se pagó completo, marcar como pagada
    if (cuota.saldoPendiente <= 0) {
      cuota.pagada = true;
      cuota.fechaPago = abonarCuotaDto.fechaPago;
      cuota.pagoTardio = pagoTardio;
      venta.cuotasPagadas += 1;

      // Actualizar score del cliente solo cuando se completa la cuota
      await this.clientesService.actualizarScore(
        venta.clienteId.toString(),
        !pagoTardio
      );
    }

    venta.totalPagado += abonarCuotaDto.montoAbono;
    venta.totalPendiente -= abonarCuotaDto.montoAbono;

    // Verificar si se completó el crédito
    if (venta.cuotasPagadas === venta.numeroCuotas) {
      venta.estado = EstadoVenta.COMPLETADA;
      await this.clientesService.decrementarCreditosActivos(
        venta.clienteId.toString()
      );
    }

    const ventaActualizada = await this.ventaModel
      .findByIdAndUpdate(ventaId, venta.toObject(), { new: true })
      .exec();

    if (!ventaActualizada) {
      throw new NotFoundException(`Venta con ID ${ventaId} no encontrada`);
    }

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

    // Usar el nuevo método de abono con el monto completo
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
}