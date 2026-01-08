import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Venta, VentaDocument } from '../ventas/schemas/venta.schema';

// DTO para la respuesta de cobros (vista virtual)
export interface CobroVirtual {
  _id: string; // Combina ventaId + numeroCuota para tener un ID único
  ventaId: string;
  clienteId: string;
  nombreCliente: string;
  numeroCuota: number;
  monto: number;
  montoPagado: number;
  saldoPendiente: number;
  fechaVencimiento: Date;
  fechaPago?: Date;
  pagado: boolean;
  pagoTardio: boolean;
}

@Injectable()
export class CobrosService {
  constructor(
    @InjectModel(Venta.name)
    private ventaModel: Model<VentaDocument>,
  ) {}

  /**
   * Convierte las cuotas de ventas en objetos "Cobro" virtuales
   */
  private ventaToCobros(venta: VentaDocument): CobroVirtual[] {
    return venta.cuotas.map(cuota => ({
      _id: `${venta._id}_${cuota.numeroCuota}`, // ID único compuesto
      ventaId: venta._id.toString(),
      clienteId: venta.clienteId?.toString() || '',
      nombreCliente: venta.nombreCliente,
      numeroCuota: cuota.numeroCuota,
      monto: cuota.monto,
      montoPagado: cuota.montoPagado || 0,
      saldoPendiente: cuota.saldoPendiente || cuota.monto,
      fechaVencimiento: cuota.fechaVencimiento,
      fechaPago: cuota.fechaPago,
      pagado: cuota.pagada,
      pagoTardio: cuota.pagoTardio,
    }));
  }

  /**
   * Obtener todos los cobros (todas las cuotas de todas las ventas activas)
   */
  async findAll(): Promise<CobroVirtual[]> {
    const ventas = await this.ventaModel
      .find()
      .populate('clienteId', 'nombreCompleto telefono score')
      .sort({ createdAt: -1 })
      .exec();

    const cobros: CobroVirtual[] = [];
    for (const venta of ventas) {
      cobros.push(...this.ventaToCobros(venta));
    }

    return cobros.sort((a, b) => 
      new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()
    );
  }

  /**
   * Obtener cobros pendientes (cuotas no pagadas)
   */
  async findPendientes(): Promise<CobroVirtual[]> {
    const ventas = await this.ventaModel
      .find({
        'cuotas.pagada': false // Ventas que tienen al menos una cuota pendiente
      })
      .populate('clienteId', 'nombreCompleto telefono score')
      .exec();

    const cobros: CobroVirtual[] = [];
    for (const venta of ventas) {
      const cuotasPendientes = this.ventaToCobros(venta)
        .filter(cobro => !cobro.pagado);
      cobros.push(...cuotasPendientes);
    }

    return cobros.sort((a, b) => 
      new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()
    );
  }

  /**
   * Obtener cobros pagados
   */
  async findPagados(): Promise<CobroVirtual[]> {
    const ventas = await this.ventaModel
      .find({
        'cuotas.pagada': true
      })
      .populate('clienteId', 'nombreCompleto telefono')
      .exec();

    const cobros: CobroVirtual[] = [];
    for (const venta of ventas) {
      const cuotasPagadas = this.ventaToCobros(venta)
        .filter(cobro => cobro.pagado);
      cobros.push(...cuotasPagadas);
    }

    return cobros.sort((a, b) => {
      const fechaA = a.fechaPago ? new Date(a.fechaPago).getTime() : 0;
      const fechaB = b.fechaPago ? new Date(b.fechaPago).getTime() : 0;
      return fechaB - fechaA;
    });
  }

  /**
   * Obtener cobros de la próxima quincena
   */
  async findProximaQuincena(): Promise<CobroVirtual[]> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const finQuincena = this.calcularFinQuincena(hoy);

    const ventas = await this.ventaModel
      .find({
        'cuotas.pagada': false,
        'cuotas.fechaVencimiento': {
          $gte: hoy,
          $lte: finQuincena,
        }
      })
      .populate('clienteId', 'nombreCompleto telefono direccion score')
      .exec();

    const cobros: CobroVirtual[] = [];
    for (const venta of ventas) {
      const cuotasQuincena = this.ventaToCobros(venta)
        .filter(cobro => 
          !cobro.pagado &&
          new Date(cobro.fechaVencimiento) >= hoy &&
          new Date(cobro.fechaVencimiento) <= finQuincena
        );
      cobros.push(...cuotasQuincena);
    }

    return cobros.sort((a, b) => 
      new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()
    );
  }

  /**
   * Obtener cobros vencidos
   */
  async findVencidos(): Promise<CobroVirtual[]> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const ventas = await this.ventaModel
      .find({
        'cuotas.pagada': false,
        'cuotas.fechaVencimiento': { $lt: hoy }
      })
      .populate('clienteId', 'nombreCompleto telefono')
      .exec();

    const cobros: CobroVirtual[] = [];
    for (const venta of ventas) {
      const cuotasVencidas = this.ventaToCobros(venta)
        .filter(cobro => 
          !cobro.pagado &&
          new Date(cobro.fechaVencimiento) < hoy
        );
      cobros.push(...cuotasVencidas);
    }

    return cobros.sort((a, b) => 
      new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()
    );
  }

  /**
   * Obtener cobros por cliente
   */
  async findByCliente(clienteId: string): Promise<CobroVirtual[]> {
    const ventas = await this.ventaModel
      .find({ clienteId })
      .sort({ createdAt: -1 })
      .exec();

    const cobros: CobroVirtual[] = [];
    for (const venta of ventas) {
      cobros.push(...this.ventaToCobros(venta));
    }

    return cobros.sort((a, b) => 
      new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()
    );
  }

  /**
   * Obtener totales para el dashboard
   */
  async obtenerTotales() {
    const pendientes = await this.findPendientes();
    const proximaQuincena = await this.findProximaQuincena();

    const totalPendiente = pendientes.reduce((sum, cobro) => sum + cobro.saldoPendiente, 0);
    const totalProximaQuincena = proximaQuincena.reduce((sum, cobro) => sum + cobro.saldoPendiente, 0);

    return {
      totalPendiente,
      cantidadPendiente: pendientes.length,
      totalProximaQuincena,
      cantidadProximaQuincena: proximaQuincena.length,
    };
  }

  private calcularFinQuincena(fecha: Date): Date {
    const finQuincena = new Date(fecha);
    const dia = fecha.getDate();

    if (dia <= 15) {
      finQuincena.setDate(15);
    } else {
      finQuincena.setMonth(finQuincena.getMonth() + 1, 0);
    }

    finQuincena.setHours(23, 59, 59, 999);
    return finQuincena;
  }
}