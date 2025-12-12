import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Venta, VentaDocument, EstadoVenta } from '../ventas/schemas/venta.schema';
import { Cobro, CobroDocument } from 'src/cobros/schemas/cobro.schema';
import { Producto, ProductoDocument } from '../productos/schemas/producto.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Venta.name)
    private ventaModel: Model<VentaDocument>,
    @InjectModel(Cobro.name)
    private cobroModel: Model<CobroDocument>,
    @InjectModel(Producto.name)
    private productoModel: Model<ProductoDocument>,
  ) {}

  async obtenerResumenGeneral() {
    const [
      totalInvertido,
      ventasActivas,
      cobrosProximaQuincena,
      cobrosVencidos,
      productosStockBajo,
    ] = await Promise.all([
      this.calcularTotalInvertido(),
      this.ventaModel.find({ estado: EstadoVenta.ACTIVA }).exec(),
      this.obtenerCobrosProximaQuincena(),
      this.obtenerCobrosVencidos(),
      this.productoModel.find({ stock: { $lt: 5 }, activo: true }).exec(),
    ]);

    const totalRecaudado = ventasActivas.reduce(
      (sum, venta) => sum + venta.totalPagado,
      0
    );

    const totalPendiente = ventasActivas.reduce(
      (sum, venta) => sum + venta.totalPendiente,
      0
    );

    const utilidadQuincenaActual = cobrosProximaQuincena.reduce(
      (sum, cobro) => cobro.pagado ? sum + cobro.monto : sum,
      0
    );

    const gananciaEsperada = await this.calcularGananciaEsperada();

    return {
      totalInvertido,
      totalRecaudado,
      totalPendiente,
      utilidadQuincenaActual,
      gananciaEsperada,
      creditosActivos: ventasActivas.length,
      cobrosProximaQuincena: {
        cantidad: cobrosProximaQuincena.length,
        monto: cobrosProximaQuincena.reduce((sum, c) => sum + c.monto, 0),
      },
      alertas: {
        cobrosVencidos: cobrosVencidos.length,
        productosStockBajo: productosStockBajo.length,
        creditosVencidos: ventasActivas.filter(
          v => v.estado === EstadoVenta.VENCIDA
        ).length,
      },
    };
  }

  private async calcularTotalInvertido(): Promise<number> {
    const productos = await this.productoModel.find({ activo: true }).exec();
    return productos.reduce(
      (sum, producto) => sum + (producto.inversionTotal || 0),
      0
    );
  }

  private async calcularGananciaEsperada(): Promise<number> {
    const ventas = await this.ventaModel
      .find({ estado: { $in: [EstadoVenta.ACTIVA, EstadoVenta.VENCIDA] } })
      .populate('productos.productoId')
      .exec();

    let gananciaTotal = 0;

    for (const venta of ventas) {
      for (const item of venta.productos) {
        const producto = await this.productoModel.findById(item.productoId).exec();
        if (producto) {
          const costoTotal = producto.precioCompra * item.cantidad;
          gananciaTotal += (item.subtotal - costoTotal);
        }
      }
    }

    return gananciaTotal;
  }

  private async obtenerCobrosProximaQuincena(): Promise<Cobro[]> {
    const hoy = new Date();
    const finQuincena = this.calcularFinQuincena(hoy);

    return this.cobroModel
      .find({
        fechaVencimiento: {
          $gte: hoy,
          $lte: finQuincena,
        },
      })
      .exec();
  }

  private async obtenerCobrosVencidos(): Promise<Cobro[]> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return this.cobroModel
      .find({
        pagado: false,
        fechaVencimiento: { $lt: hoy },
      })
      .exec();
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

  async obtenerEstadisticasMensuales(mes: number, anio: number) {
    const inicioMes = new Date(anio, mes - 1, 1);
    const finMes = new Date(anio, mes, 0, 23, 59, 59);

    const [ventasMes, cobrosMes] = await Promise.all([
      this.ventaModel
        .find({
          createdAt: {
            $gte: inicioMes,
            $lte: finMes,
          },
        })
        .exec(),
      this.cobroModel
        .find({
          pagado: true,
          fechaPago: {
            $gte: inicioMes,
            $lte: finMes,
          },
        })
        .exec(),
    ]);

    const totalVendido = ventasMes.reduce((sum, v) => sum + v.totalVenta, 0);
    const totalRecaudado = cobrosMes.reduce((sum, c) => sum + c.monto, 0);

    return {
      mes,
      anio,
      totalVentas: ventasMes.length,
      totalVendido,
      totalRecaudado,
      pagosPuntuales: cobrosMes.filter(c => !c.pagoTardio).length,
      pagosTardios: cobrosMes.filter(c => c.pagoTardio).length,
    };
  }
}