import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Venta, VentaDocument, EstadoVenta, Cuota } from './schemas/venta.schema';
import { CreateVentaDto } from './dto/create-venta.dto';
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
    // Validar cliente
    const cliente = await this.clientesService.findOne(createVentaDto.clienteId);

    // Validar y calcular productos
    let totalVenta = 0;
    const productosVenta: ProductoVentaDetalle[] = [];

    for (const item of createVentaDto.productos) {
      const producto = await this.productosService.findOne(item.productoId);
      
      // Validar stock
      if (producto.stock < item.cantidad) {
        throw new BadRequestException(
          `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}`
        );
      }

      const subtotal = producto.precioVenta * item.cantidad;
      totalVenta += subtotal;

      productosVenta.push({
        productoId: producto._id,
        nombreProducto: producto.nombre,
        cantidad: item.cantidad,
        precioUnitario: producto.precioVenta,
        subtotal,
      });

      // Actualizar stock
      await this.productosService.actualizarStock(
        item.productoId,
        item.cantidad
      );

      // AGREGAR ESTA LÍNEA: Incrementar contador de vendidos
      await this.productosService.incrementarVendido(
        item.productoId,
        item.cantidad
      );
    }

    // Calcular cuotas
    const montoCuota = totalVenta / createVentaDto.numeroCuotas;
    const cuotas = this.generarCuotas(
      createVentaDto.fechaPrimerPago,
      createVentaDto.numeroCuotas,
      montoCuota
    );

    // Crear venta
    const nuevaVenta = new this.ventaModel({
      clienteId: cliente._id,
      nombreCliente: cliente.nombreCompleto,
      productos: productosVenta,
      totalVenta,
      numeroCuotas: createVentaDto.numeroCuotas,
      montoCuota,
      fechaPrimerPago: createVentaDto.fechaPrimerPago,
      cuotas,
      totalPendiente: totalVenta,
    });

    const ventaGuardada = await nuevaVenta.save();

    // Crear registros de cobro
    await this.cobrosService.crearCobrosDesdeVenta(ventaGuardada);

    // Actualizar contador de créditos del cliente
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
        pagada: false,
        pagoTardio: false,
      });

      // Calcular siguiente quincena
      fecha = this.calcularSiguienteQuincena(fecha);
    }

    return cuotas;
  }

  private calcularSiguienteQuincena(fecha: Date): Date {
    const nuevaFecha = new Date(fecha);
    const dia = nuevaFecha.getDate();

    if (dia <= 15) {
      // Si estamos en la primera quincena, ir al 30
      nuevaFecha.setDate(30);
      // Si el mes no tiene 30 días, ajustar al último día
      if (nuevaFecha.getMonth() !== fecha.getMonth()) {
        nuevaFecha.setDate(0); // Último día del mes anterior
      }
    } else {
      // Si estamos en la segunda quincena, ir al 15 del siguiente mes
      nuevaFecha.setMonth(nuevaFecha.getMonth() + 1);
      nuevaFecha.setDate(15);
    }

    return nuevaFecha;
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

    if (cuota.pagada) {
      throw new BadRequestException(`La cuota ${numeroCuota} ya está pagada`);
    }

    // Verificar si el pago es tardío
    const pagoTardio = fechaPago > cuota.fechaVencimiento;
    
    cuota.pagada = true;
    cuota.fechaPago = fechaPago;
    cuota.pagoTardio = pagoTardio;

    venta.cuotasPagadas += 1;
    venta.totalPagado += cuota.monto;
    venta.totalPendiente -= cuota.monto;

    // Verificar si se completó el crédito
    if (venta.cuotasPagadas === venta.numeroCuotas) {
      venta.estado = EstadoVenta.COMPLETADA;
      await this.clientesService.decrementarCreditosActivos(
        venta.clienteId.toString()
      );
    }

    // Actualizar score del cliente
    await this.clientesService.actualizarScore(
      venta.clienteId.toString(),
      !pagoTardio
    );

    const ventaActualizada = await this.ventaModel
      .findByIdAndUpdate(ventaId, venta.toObject(), { new: true })
      .exec();

    if (!ventaActualizada) {
      throw new NotFoundException(`Venta con ID ${ventaId} no encontrada`);
    }

    return ventaActualizada;
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