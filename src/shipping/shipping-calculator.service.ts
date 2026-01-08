import { Injectable, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

import { ShippingService } from './shipping.service';
import { GeographyService } from '../geography/geography.service';
import {
  MetodoEnvioDocument,
  TipoCosto,
} from './schemas/metodo-envio.schema';
import { CalcularEnvioDto, ProductoCarritoDto } from './dto';

export interface ResultadoCalculoEnvio {
  metodoId: string;
  metodoNombre: string;
  metodoCodigo: string;
  transportadora: {
    nombre: string;
    tiempoEstimadoMin: number;
    tiempoEstimadoMax: number;
  } | null;
  costoOriginal: number;
  costoFinal: number;
  esGratis: boolean;
  razonGratis: string | null;
  reglasAplicadas: string[];
  restricciones: string[];
  disponible: boolean;
}

export interface ResumenCalculoEnvio {
  ciudadId: string;
  ciudadNombre: string;
  departamentoNombre: string;
  subtotalCarrito: number;
  cantidadProductos: number;
  pesoTotal: number;
  metodosDisponibles: ResultadoCalculoEnvio[];
  metodoRecomendado: ResultadoCalculoEnvio | null;
}

interface DatosCarrito {
  subtotal: number;
  cantidadProductos: number;
  pesoTotal: number;
  productos: ProductoCarritoDto[];
}

@Injectable()
export class ShippingCalculatorService {
  constructor(
    private shippingService: ShippingService,
    private geographyService: GeographyService,
  ) {}

  async calcularEnvio(dto: CalcularEnvioDto): Promise<ResumenCalculoEnvio> {
    // 1. Validar ciudad y obtener datos
    const ciudad = await this.geographyService.findCiudadById(dto.ciudadId);

    // 2. Calcular datos del carrito
    const datosCarrito = this.calcularDatosCarrito(dto);

    // 3. Obtener métodos de envío disponibles para la ciudad
    const metodos = await this.shippingService.findMetodosEnvioByCiudad(
      dto.ciudadId,
    );

    // 4. Filtrar métodos vigentes
    const metodosVigentes = this.filtrarMetodosVigentes(metodos);

    // 5. Calcular costo para cada método
    const resultados: ResultadoCalculoEnvio[] = [];

    for (const metodo of metodosVigentes) {
      const resultado = await this.calcularCostoMetodo(metodo, datosCarrito);
      resultados.push(resultado);
    }

    // 6. Ordenar por disponibilidad y costo
    resultados.sort((a, b) => {
      if (a.disponible !== b.disponible) {
        return a.disponible ? -1 : 1;
      }
      return a.costoFinal - b.costoFinal;
    });

    // 7. Seleccionar método recomendado (el más barato disponible)
    const metodoRecomendado =
      resultados.find((r) => r.disponible && r.esGratis) ||
      resultados.find((r) => r.disponible) ||
      null;

    return {
      ciudadId: dto.ciudadId,
      ciudadNombre: ciudad.nombre,
      departamentoNombre: ciudad.departamentoNombre,
      subtotalCarrito: datosCarrito.subtotal,
      cantidadProductos: datosCarrito.cantidadProductos,
      pesoTotal: datosCarrito.pesoTotal,
      metodosDisponibles: resultados,
      metodoRecomendado,
    };
  }

  private calcularDatosCarrito(dto: CalcularEnvioDto): DatosCarrito {
    const subtotal =
      dto.subtotal ??
      dto.productos.reduce(
        (sum, p) => sum + p.precioUnitario * p.cantidad,
        0,
      );

    const cantidadProductos = dto.productos.reduce(
      (sum, p) => sum + p.cantidad,
      0,
    );

    const pesoTotal = dto.productos.reduce(
      (sum, p) => sum + (p.peso || 0) * p.cantidad,
      0,
    );

    return {
      subtotal,
      cantidadProductos,
      pesoTotal,
      productos: dto.productos,
    };
  }

  private filtrarMetodosVigentes(
    metodos: MetodoEnvioDocument[],
  ): MetodoEnvioDocument[] {
    const ahora = new Date();
    const diaSemana = ahora.getDay();

    return metodos.filter((metodo) => {
      if (!metodo.vigencia) return true;

      const { fechaInicio, fechaFin, diasSemana } = metodo.vigencia;

      // Verificar fecha inicio
      if (fechaInicio && ahora < fechaInicio) return false;

      // Verificar fecha fin
      if (fechaFin && ahora > fechaFin) return false;

      // Verificar día de la semana
      if (diasSemana && diasSemana.length > 0) {
        if (!diasSemana.includes(diaSemana)) return false;
      }

      return true;
    });
  }

  private async calcularCostoMetodo(
    metodo: MetodoEnvioDocument,
    datosCarrito: DatosCarrito,
  ): Promise<ResultadoCalculoEnvio> {
    const reglasAplicadas: string[] = [];
    const restricciones: string[] = [];
    let disponible = true;

    // Verificar restricciones
    const restriccionesResult = this.verificarRestricciones(
      metodo,
      datosCarrito,
    );
    disponible = restriccionesResult.disponible;
    restricciones.push(...restriccionesResult.restricciones);

    // Calcular costo base
    let costoOriginal = this.calcularCostoBase(
      metodo,
      datosCarrito,
      reglasAplicadas,
    );

    // Verificar condiciones de envío gratis
    const condicionesGratis = this.verificarCondicionesGratis(
      metodo,
      datosCarrito,
    );

    let costoFinal = costoOriginal;
    let esGratis = false;
    let razonGratis: string | null = null;

    if (condicionesGratis.esGratis) {
      costoFinal = 0;
      esGratis = true;
      razonGratis = condicionesGratis.razon;
      reglasAplicadas.push(condicionesGratis.razon);
    }

    // Agregar costo de seguro si aplica
    if (
      metodo.restricciones?.valorRequiereSeguro &&
      datosCarrito.subtotal > metodo.restricciones.valorRequiereSeguro
    ) {
      const costoSeguro =
        (datosCarrito.subtotal *
          (metodo.restricciones.porcentajeSeguro || 0)) /
        100;
      if (costoSeguro > 0) {
        costoFinal += costoSeguro;
        reglasAplicadas.push(
          `Seguro obligatorio: $${costoSeguro.toLocaleString()}`,
        );
      }
    }

    // Obtener datos de transportadora
    let transportadora: {
      nombre: string;
      tiempoEstimadoMin: number;
      tiempoEstimadoMax: number;
    } | null = null;
    if (metodo.transportadoraId) {
      try {
        const trans = await this.shippingService.findTransportadoraById(
          metodo.transportadoraId.toString(),
        );
        transportadora = {
          nombre: trans.nombre,
          tiempoEstimadoMin:
            metodo.tiempoEstimadoMinDias ?? trans.tiempoEstimado?.minDias ?? 0,
          tiempoEstimadoMax:
            metodo.tiempoEstimadoMaxDias ?? trans.tiempoEstimado?.maxDias ?? 0,
        };
      } catch {
        // Transportadora no encontrada, usar datos del método
        transportadora = {
          nombre: metodo.transportadoraNombre || 'Sin especificar',
          tiempoEstimadoMin: metodo.tiempoEstimadoMinDias || 0,
          tiempoEstimadoMax: metodo.tiempoEstimadoMaxDias || 0,
        };
      }
    }

    return {
      metodoId: metodo._id.toString(),
      metodoNombre: metodo.nombre,
      metodoCodigo: metodo.codigo,
      transportadora,
      costoOriginal,
      costoFinal,
      esGratis,
      razonGratis,
      reglasAplicadas,
      restricciones,
      disponible,
    };
  }

  private calcularCostoBase(
    metodo: MetodoEnvioDocument,
    datosCarrito: DatosCarrito,
    reglasAplicadas: string[],
  ): number {
    const config = metodo.configuracionCosto;

    switch (metodo.tipoCosto) {
      case TipoCosto.FIJO:
        reglasAplicadas.push(`Costo fijo: $${config.costoBase?.toLocaleString() || 0}`);
        return config.costoBase || 0;

      case TipoCosto.POR_PESO:
        const costoPeso =
          (config.costoBase || 0) +
          datosCarrito.pesoTotal * (config.costoPorKg || 0);
        reglasAplicadas.push(
          `Costo por peso: $${config.costoBase?.toLocaleString() || 0} + ${datosCarrito.pesoTotal}kg × $${config.costoPorKg?.toLocaleString() || 0}/kg`,
        );
        return costoPeso;

      case TipoCosto.POR_VOLUMEN:
        // Simplificado - en producción calcularías el volumen real
        const costoVolumen =
          (config.costoBase || 0) +
          datosCarrito.pesoTotal * (config.costoPorM3 || 0);
        reglasAplicadas.push(`Costo por volumen`);
        return costoVolumen;

      case TipoCosto.ESCALONADO:
        return this.calcularCostoEscalonado(
          config,
          datosCarrito.pesoTotal,
          reglasAplicadas,
        );

      default:
        return config.costoBase || 0;
    }
  }

  private calcularCostoEscalonado(
    config: any,
    pesoTotal: number,
    reglasAplicadas: string[],
  ): number {
    if (!config.escalonado || config.escalonado.length === 0) {
      return config.costoBase || 0;
    }

    // Ordenar escalones por peso
    const escalones = [...config.escalonado].sort(
      (a, b) => a.hastaKg - b.hastaKg,
    );

    // Buscar el escalón aplicable
    for (const escalon of escalones) {
      if (pesoTotal <= escalon.hastaKg) {
        reglasAplicadas.push(
          `Costo escalonado (hasta ${escalon.hastaKg}kg): $${escalon.costo.toLocaleString()}`,
        );
        return escalon.costo;
      }
    }

    // Si supera todos los escalones, usar el último + costo adicional
    const ultimoEscalon = escalones[escalones.length - 1];
    const pesoAdicional = pesoTotal - ultimoEscalon.hastaKg;
    const costoAdicional = pesoAdicional * (config.costoKgAdicional || 0);
    const costoTotal = ultimoEscalon.costo + costoAdicional;

    reglasAplicadas.push(
      `Costo escalonado: $${ultimoEscalon.costo.toLocaleString()} + ${pesoAdicional.toFixed(2)}kg adicionales × $${config.costoKgAdicional?.toLocaleString() || 0}/kg`,
    );

    return costoTotal;
  }

  private verificarCondicionesGratis(
    metodo: MetodoEnvioDocument,
    datosCarrito: DatosCarrito,
  ): { esGratis: boolean; razon: string } {
    const condiciones = metodo.condiciones;

    if (!condiciones) {
      return { esGratis: false, razon: '' };
    }

    // Verificar monto mínimo para envío gratis
    if (
      condiciones.montoMinimoGratis &&
      datosCarrito.subtotal >= condiciones.montoMinimoGratis
    ) {
      return {
        esGratis: true,
        razon: `Envío gratis por compra superior a $${condiciones.montoMinimoGratis.toLocaleString()}`,
      };
    }

    // Verificar cantidad mínima de productos
    if (
      condiciones.cantidadMinimaGratis &&
      datosCarrito.cantidadProductos >= condiciones.cantidadMinimaGratis
    ) {
      return {
        esGratis: true,
        razon: `Envío gratis por ${condiciones.cantidadMinimaGratis}+ productos`,
      };
    }

    return { esGratis: false, razon: '' };
  }

  private verificarRestricciones(
    metodo: MetodoEnvioDocument,
    datosCarrito: DatosCarrito,
  ): { disponible: boolean; restricciones: string[] } {
    const restricciones: string[] = [];
    let disponible = true;

    const condiciones = metodo.condiciones;
    const restriccionesMetodo = metodo.restricciones;

    // Verificar peso máximo
    if (condiciones?.pesoMaximo && datosCarrito.pesoTotal > condiciones.pesoMaximo) {
      disponible = false;
      restricciones.push(
        `Peso máximo permitido: ${condiciones.pesoMaximo}kg (carrito: ${datosCarrito.pesoTotal.toFixed(2)}kg)`,
      );
    }

    // Verificar valor máximo
    if (condiciones?.valorMaximo && datosCarrito.subtotal > condiciones.valorMaximo) {
      disponible = false;
      restricciones.push(
        `Valor máximo permitido: $${condiciones.valorMaximo.toLocaleString()}`,
      );
    }

    // Verificar productos excluidos
    if (restriccionesMetodo?.productosExcluidos?.length) {
      const productosExcluidosIds = restriccionesMetodo.productosExcluidos.map(
        (id) => id.toString(),
      );
      const productosCarritoIds = datosCarrito.productos.map((p) => p.productoId);

      const productosConflicto = productosCarritoIds.filter((id) =>
        productosExcluidosIds.includes(id),
      );

      if (productosConflicto.length > 0) {
        disponible = false;
        restricciones.push(
          `${productosConflicto.length} producto(s) no pueden enviarse con este método`,
        );
      }
    }

    // Verificar categorías excluidas
    if (restriccionesMetodo?.categoriasExcluidas?.length) {
      const categoriasCarrito = datosCarrito.productos
        .filter((p): p is ProductoCarritoDto & { categoria: string } => !!p.categoria)
        .map((p) => p.categoria);

      const categoriasConflicto = categoriasCarrito.filter((cat) =>
        restriccionesMetodo.categoriasExcluidas.includes(cat),
      );

      if (categoriasConflicto.length > 0) {
        disponible = false;
        restricciones.push(
          `Categorías no permitidas: ${categoriasConflicto.join(', ')}`,
        );
      }
    }

    return { disponible, restricciones };
  }

  // Método auxiliar para obtener resumen de envío sin calcular (solo disponibilidad)
  async verificarDisponibilidadEnvio(ciudadId: string): Promise<{
    disponible: boolean;
    metodosCount: number;
    ciudadNombre: string;
    departamentoNombre: string;
  }> {
    const ciudad = await this.geographyService.findCiudadById(ciudadId);
    const metodos = await this.shippingService.findMetodosEnvioByCiudad(ciudadId);

    return {
      disponible: metodos.length > 0,
      metodosCount: metodos.length,
      ciudadNombre: ciudad.nombre,
      departamentoNombre: ciudad.departamentoNombre,
    };
  }
}