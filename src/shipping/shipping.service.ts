import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Transportadora,
  TransportadoraDocument,
} from './schemas/transportadora.schema';
import {
  MetodoEnvio,
  MetodoEnvioDocument,
} from './schemas/metodo-envio.schema';

import {
  CreateTransportadoraDto,
  UpdateTransportadoraDto,
  CreateMetodoEnvioDto,
  UpdateMetodoEnvioDto,
} from './dto';

import { GeographyService } from '../geography/geography.service';

@Injectable()
export class ShippingService {
  constructor(
    @InjectModel(Transportadora.name)
    private transportadoraModel: Model<TransportadoraDocument>,
    @InjectModel(MetodoEnvio.name)
    private metodoEnvioModel: Model<MetodoEnvioDocument>,
    private geographyService: GeographyService,
  ) {}

  // ==================== TRANSPORTADORAS ====================

  async createTransportadora(
    dto: CreateTransportadoraDto,
  ): Promise<TransportadoraDocument> {
    const existente = await this.transportadoraModel
      .findOne({
        $or: [{ nombre: dto.nombre }, { codigo: dto.codigo }],
      })
      .exec();

    if (existente) {
      throw new ConflictException(
        `Ya existe una transportadora con ese nombre o código`,
      );
    }

    const nueva = new this.transportadoraModel(dto);
    return nueva.save();
  }

  async findAllTransportadoras(): Promise<TransportadoraDocument[]> {
    return this.transportadoraModel
      .find({ activo: true })
      .sort({ nombre: 1 })
      .exec();
  }

  async findTransportadoraById(id: string): Promise<TransportadoraDocument> {
    const transportadora = await this.transportadoraModel.findById(id).exec();
    if (!transportadora) {
      throw new NotFoundException(`Transportadora con ID ${id} no encontrada`);
    }
    return transportadora;
  }

  async updateTransportadora(
    id: string,
    dto: UpdateTransportadoraDto,
  ): Promise<TransportadoraDocument> {
    const actualizada = await this.transportadoraModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();

    if (!actualizada) {
      throw new NotFoundException(`Transportadora con ID ${id} no encontrada`);
    }
    return actualizada;
  }

  async removeTransportadora(id: string): Promise<void> {
    const resultado = await this.transportadoraModel
      .findByIdAndUpdate(id, { activo: false })
      .exec();

    if (!resultado) {
      throw new NotFoundException(`Transportadora con ID ${id} no encontrada`);
    }
  }

  // ==================== MÉTODOS DE ENVÍO ====================

  async createMetodoEnvio(
    dto: CreateMetodoEnvioDto,
  ): Promise<MetodoEnvioDocument> {
    const existente = await this.metodoEnvioModel
      .findOne({
        $or: [{ nombre: dto.nombre }, { codigo: dto.codigo }],
      })
      .exec();

    if (existente) {
      throw new ConflictException(
        `Ya existe un método de envío con ese nombre o código`,
      );
    }

    const metodoData: any = { ...dto };

    // Validar y obtener nombre de transportadora
    if (dto.transportadoraId) {
      const transportadora = await this.findTransportadoraById(
        dto.transportadoraId,
      );
      metodoData.transportadoraId = new Types.ObjectId(dto.transportadoraId);
      metodoData.transportadoraNombre = transportadora.nombre;
    }

    // Convertir IDs de zonas de envío
    if (dto.cobertura?.zonasEnvioIds) {
      metodoData.cobertura = {
        ...dto.cobertura,
        zonasEnvioIds: dto.cobertura.zonasEnvioIds.map(
          (id) => new Types.ObjectId(id),
        ),
      };

      // Validar que las zonas existan
      for (const zonaId of dto.cobertura.zonasEnvioIds) {
        await this.geographyService.findZonaEnvioById(zonaId);
      }
    }

    // Convertir IDs de productos excluidos
    if (dto.restricciones?.productosExcluidos) {
      metodoData.restricciones = {
        ...dto.restricciones,
        productosExcluidos: dto.restricciones.productosExcluidos.map(
          (id) => new Types.ObjectId(id),
        ),
      };
    }

    const nuevo = new this.metodoEnvioModel(metodoData);
    return nuevo.save();
  }

  async findAllMetodosEnvio(): Promise<MetodoEnvioDocument[]> {
    return this.metodoEnvioModel
      .find({ activo: true })
      .sort({ prioridad: -1, nombre: 1 })
      .exec();
  }

  async findMetodoEnvioById(id: string): Promise<MetodoEnvioDocument> {
    const metodo = await this.metodoEnvioModel.findById(id).exec();
    if (!metodo) {
      throw new NotFoundException(`Método de envío con ID ${id} no encontrado`);
    }
    return metodo;
  }

  async findMetodoEnvioByCodigo(codigo: string): Promise<MetodoEnvioDocument> {
    const metodo = await this.metodoEnvioModel
      .findOne({ codigo, activo: true })
      .exec();
    if (!metodo) {
      throw new NotFoundException(
        `Método de envío con código ${codigo} no encontrado`,
      );
    }
    return metodo;
  }

  async findMetodosEnvioByZona(
    zonaEnvioId: string,
  ): Promise<MetodoEnvioDocument[]> {
    return this.metodoEnvioModel
      .find({
        activo: true,
        $or: [
          { 'cobertura.nacional': true },
          { 'cobertura.zonasEnvioIds': new Types.ObjectId(zonaEnvioId) },
        ],
      })
      .sort({ prioridad: -1 })
      .exec();
  }

  async findMetodosEnvioByCiudad(
    ciudadId: string,
  ): Promise<MetodoEnvioDocument[]> {
    // Obtener las zonas que cubren esta ciudad
    const zonas = await this.geographyService.findZonasEnvioByCiudad(ciudadId);
    const zonasIds = zonas.map((z) => z._id);

    // Obtener métodos de envío que cubran estas zonas o sean nacionales
    return this.metodoEnvioModel
      .find({
        activo: true,
        $or: [
          { 'cobertura.nacional': true },
          { 'cobertura.zonasEnvioIds': { $in: zonasIds } },
        ],
      })
      .sort({ prioridad: -1 })
      .exec();
  }

  async findMetodosEnvioVigentes(): Promise<MetodoEnvioDocument[]> {
    const ahora = new Date();
    const diaSemana = ahora.getDay();

    return this.metodoEnvioModel
      .find({
        activo: true,
        $or: [
          { vigencia: { $exists: false } },
          { 'vigencia.fechaInicio': { $exists: false } },
          {
            $and: [
              {
                $or: [
                  { 'vigencia.fechaInicio': { $lte: ahora } },
                  { 'vigencia.fechaInicio': { $exists: false } },
                ],
              },
              {
                $or: [
                  { 'vigencia.fechaFin': { $gte: ahora } },
                  { 'vigencia.fechaFin': { $exists: false } },
                ],
              },
              {
                $or: [
                  { 'vigencia.diasSemana': diaSemana },
                  { 'vigencia.diasSemana': { $size: 0 } },
                  { 'vigencia.diasSemana': { $exists: false } },
                ],
              },
            ],
          },
        ],
      })
      .sort({ prioridad: -1 })
      .exec();
  }

  async updateMetodoEnvio(
    id: string,
    dto: UpdateMetodoEnvioDto,
  ): Promise<MetodoEnvioDocument> {
    const updateData: any = { ...dto };

    if (dto.transportadoraId) {
      const transportadora = await this.findTransportadoraById(
        dto.transportadoraId,
      );
      updateData.transportadoraId = new Types.ObjectId(dto.transportadoraId);
      updateData.transportadoraNombre = transportadora.nombre;
    }

    if (dto.cobertura?.zonasEnvioIds) {
      updateData.cobertura = {
        ...dto.cobertura,
        zonasEnvioIds: dto.cobertura.zonasEnvioIds.map(
          (id) => new Types.ObjectId(id),
        ),
      };
    }

    if (dto.restricciones?.productosExcluidos) {
      updateData.restricciones = {
        ...dto.restricciones,
        productosExcluidos: dto.restricciones.productosExcluidos.map(
          (id) => new Types.ObjectId(id),
        ),
      };
    }

    const actualizado = await this.metodoEnvioModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!actualizado) {
      throw new NotFoundException(`Método de envío con ID ${id} no encontrado`);
    }
    return actualizado;
  }

  async removeMetodoEnvio(id: string): Promise<void> {
    const resultado = await this.metodoEnvioModel
      .findByIdAndUpdate(id, { activo: false })
      .exec();

    if (!resultado) {
      throw new NotFoundException(`Método de envío con ID ${id} no encontrado`);
    }
  }
}