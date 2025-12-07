import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cobro, CobroDocument } from './schemas/cobro.schema';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { VentaDocument } from '../ventas/schemas/venta.schema';

@Injectable()
export class CobrosService {
  constructor(
    @InjectModel(Cobro.name)
    private cobroModel: Model<CobroDocument>,
  ) {}

  async crearCobrosDesdeVenta(venta: VentaDocument): Promise<void> {
    const cobros = venta.cuotas.map(cuota => ({
      ventaId: venta._id,
      clienteId: venta.clienteId,
      nombreCliente: venta.nombreCliente,
      numeroCuota: cuota.numeroCuota,
      monto: cuota.monto,
      fechaVencimiento: cuota.fechaVencimiento,
      pagado: false,
      pagoTardio: false,
    }));

    await this.cobroModel.insertMany(cobros);
  }

  async findAll(): Promise<CobroDocument[]> {
    return this.cobroModel
      .find()
      .populate('clienteId', 'nombreCompleto telefono score')
      .populate('ventaId', 'totalVenta')
      .sort({ fechaVencimiento: 1 })
      .exec();
  }

  async findPendientes(): Promise<CobroDocument[]> {
    return this.cobroModel
      .find({ pagado: false })
      .populate('clienteId', 'nombreCompleto telefono score')
      .sort({ fechaVencimiento: 1 })
      .exec();
  }

  async findPagados(): Promise<CobroDocument[]> {
    return this.cobroModel
      .find({ pagado: true })
      .populate('clienteId', 'nombreCompleto telefono')
      .sort({ fechaPago: -1 })
      .exec();
  }

  async findProximaQuincena(): Promise<CobroDocument[]> {
    const hoy = new Date();
    const finQuincena = this.calcularFinQuincena(hoy);

    return this.cobroModel
      .find({
        pagado: false,
        fechaVencimiento: {
          $gte: hoy,
          $lte: finQuincena,
        },
      })
      .populate('clienteId', 'nombreCompleto telefono direccion score')
      .sort({ fechaVencimiento: 1 })
      .exec();
  }

  private calcularFinQuincena(fecha: Date): Date {
    const finQuincena = new Date(fecha);
    const dia = fecha.getDate();

    if (dia <= 15) {
      finQuincena.setDate(15);
    } else {
      finQuincena.setMonth(finQuincena.getMonth() + 1, 0); // Último día del mes
    }

    finQuincena.setHours(23, 59, 59, 999);
    return finQuincena;
  }

  async findByCliente(clienteId: string): Promise<CobroDocument[]> {
    return this.cobroModel
      .find({ clienteId })
      .populate('ventaId', 'totalVenta productos')
      .sort({ fechaVencimiento: 1 })
      .exec();
  }

  async findVencidos(): Promise<CobroDocument[]> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return this.cobroModel
      .find({
        pagado: false,
        fechaVencimiento: { $lt: hoy },
      })
      .populate('clienteId', 'nombreCompleto telefono')
      .sort({ fechaVencimiento: 1 })
      .exec();
  }

  async registrarPago(
    id: string,
    registrarPagoDto: RegistrarPagoDto
  ): Promise<CobroDocument> {
    const cobro = await this.cobroModel.findById(id).exec();
    
    if (!cobro) {
      throw new NotFoundException(`Cobro con ID ${id} no encontrado`);
    }

    const pagoTardio = registrarPagoDto.fechaPago > cobro.fechaVencimiento;

    const cobroActualizado = await this.cobroModel
      .findByIdAndUpdate(
        id,
        {
          pagado: true,
          fechaPago: registrarPagoDto.fechaPago,
          pagoTardio,
          notas: registrarPagoDto.notas,
        },
        { new: true }
      )
      .exec();

    if (!cobroActualizado) {
      throw new NotFoundException(`Cobro con ID ${id} no encontrado`);
    }

    return cobroActualizado;
  }

  async obtenerTotales() {
    const pendientes = await this.cobroModel
      .find({ pagado: false })
      .exec();

    const proximaQuincena = await this.findProximaQuincena();

    const totalPendiente = pendientes.reduce((sum, cobro) => sum + cobro.monto, 0);
    const totalProximaQuincena = proximaQuincena.reduce((sum, cobro) => sum + cobro.monto, 0);

    return {
      totalPendiente,
      cantidadPendiente: pendientes.length,
      totalProximaQuincena,
      cantidadProximaQuincena: proximaQuincena.length,
    };
  }
}