import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Departamento,
  DepartamentoDocument,
} from './schemas/departamento.schema';
import { Ciudad, CiudadDocument } from './schemas/ciudad.schema';
import { ZonaEnvio, ZonaEnvioDocument } from './schemas/zona-envio.schema';

import {
  CreateDepartamentoDto,
  UpdateDepartamentoDto,
  CreateCiudadDto,
  UpdateCiudadDto,
  CreateZonaEnvioDto,
  UpdateZonaEnvioDto,
} from './dto';

@Injectable()
export class GeographyService {
  constructor(
    @InjectModel(Departamento.name)
    private departamentoModel: Model<DepartamentoDocument>,
    @InjectModel(Ciudad.name)
    private ciudadModel: Model<CiudadDocument>,
    @InjectModel(ZonaEnvio.name)
    private zonaEnvioModel: Model<ZonaEnvioDocument>,
  ) {}

  // ==================== DEPARTAMENTOS ====================

  async createDepartamento(
    dto: CreateDepartamentoDto,
  ): Promise<DepartamentoDocument> {
    const existente = await this.departamentoModel
      .findOne({
        $or: [{ nombre: dto.nombre }, { codigo: dto.codigo }],
      })
      .exec();

    if (existente) {
      throw new ConflictException(
        `Ya existe un departamento con ese nombre o código`,
      );
    }

    const nuevo = new this.departamentoModel(dto);
    return nuevo.save();
  }

  async findAllDepartamentos(): Promise<DepartamentoDocument[]> {
    return this.departamentoModel
      .find({ activo: true })
      .sort({ nombre: 1 })
      .exec();
  }

  async findDepartamentoById(id: string): Promise<DepartamentoDocument> {
    const departamento = await this.departamentoModel.findById(id).exec();
    if (!departamento) {
      throw new NotFoundException(`Departamento con ID ${id} no encontrado`);
    }
    return departamento;
  }

  async updateDepartamento(
    id: string,
    dto: UpdateDepartamentoDto,
  ): Promise<DepartamentoDocument> {
    const actualizado = await this.departamentoModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();

    if (!actualizado) {
      throw new NotFoundException(`Departamento con ID ${id} no encontrado`);
    }
    return actualizado;
  }

  async removeDepartamento(id: string): Promise<void> {
    const resultado = await this.departamentoModel
      .findByIdAndUpdate(id, { activo: false })
      .exec();

    if (!resultado) {
      throw new NotFoundException(`Departamento con ID ${id} no encontrado`);
    }
  }

  // ==================== CIUDADES ====================

  async createCiudad(dto: CreateCiudadDto): Promise<CiudadDocument> {
    const departamento = await this.findDepartamentoById(dto.departamentoId);

    const existente = await this.ciudadModel
      .findOne({
        codigo: dto.codigo,
        departamentoId: new Types.ObjectId(dto.departamentoId),
      })
      .exec();

    if (existente) {
      throw new ConflictException(
        `Ya existe una ciudad con ese código en el departamento`,
      );
    }

    const nueva = new this.ciudadModel({
      ...dto,
      departamentoId: new Types.ObjectId(dto.departamentoId),
      departamentoNombre: departamento.nombre,
    });

    return nueva.save();
  }

  async findAllCiudades(): Promise<CiudadDocument[]> {
    return this.ciudadModel.find({ activo: true }).sort({ nombre: 1 }).exec();
  }

  async findCiudadesByDepartamento(
    departamentoId: string,
  ): Promise<CiudadDocument[]> {
    return this.ciudadModel
      .find({
        departamentoId: new Types.ObjectId(departamentoId),
        activo: true,
      })
      .sort({ nombre: 1 })
      .exec();
  }

  async findCiudadById(id: string): Promise<CiudadDocument> {
    const ciudad = await this.ciudadModel.findById(id).exec();
    if (!ciudad) {
      throw new NotFoundException(`Ciudad con ID ${id} no encontrada`);
    }
    return ciudad;
  }

  async updateCiudad(
    id: string,
    dto: UpdateCiudadDto,
  ): Promise<CiudadDocument> {
    const updateData: any = { ...dto };

    if (dto.departamentoId) {
      const departamento = await this.findDepartamentoById(dto.departamentoId);
      updateData.departamentoId = new Types.ObjectId(dto.departamentoId);
      updateData.departamentoNombre = departamento.nombre;
    }

    const actualizada = await this.ciudadModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!actualizada) {
      throw new NotFoundException(`Ciudad con ID ${id} no encontrada`);
    }
    return actualizada;
  }

  async removeCiudad(id: string): Promise<void> {
    const resultado = await this.ciudadModel
      .findByIdAndUpdate(id, { activo: false })
      .exec();

    if (!resultado) {
      throw new NotFoundException(`Ciudad con ID ${id} no encontrada`);
    }
  }

  // ==================== ZONAS DE ENVÍO ====================

  async createZonaEnvio(dto: CreateZonaEnvioDto): Promise<ZonaEnvioDocument> {
    const existente = await this.zonaEnvioModel
      .findOne({
        $or: [{ nombre: dto.nombre }, { codigo: dto.codigo }],
      })
      .exec();

    if (existente) {
      throw new ConflictException(
        `Ya existe una zona de envío con ese nombre o código`,
      );
    }

    const ciudadesData: Array<{
      ciudadId: Types.ObjectId;
      ciudadNombre: string;
      departamentoNombre: string;
    }> = [];
    if (dto.ciudades && dto.ciudades.length > 0) {
      for (const ciudadDto of dto.ciudades) {
        const ciudad = await this.findCiudadById(ciudadDto.ciudadId);
        ciudadesData.push({
          ciudadId: new Types.ObjectId(ciudadDto.ciudadId),
          ciudadNombre: ciudad.nombre,
          departamentoNombre: ciudad.departamentoNombre,
        });
      }
    }

    const nueva = new this.zonaEnvioModel({
      ...dto,
      departamentosIds: dto.departamentosIds?.map(
        (id) => new Types.ObjectId(id),
      ),
      ciudades: ciudadesData,
    });

    return nueva.save();
  }

  async findAllZonasEnvio(): Promise<ZonaEnvioDocument[]> {
    return this.zonaEnvioModel
      .find({ activo: true })
      .sort({ nombre: 1 })
      .exec();
  }

  async findZonaEnvioById(id: string): Promise<ZonaEnvioDocument> {
    const zona = await this.zonaEnvioModel.findById(id).exec();
    if (!zona) {
      throw new NotFoundException(`Zona de envío con ID ${id} no encontrada`);
    }
    return zona;
  }

  async findZonaEnvioByCodigo(codigo: string): Promise<ZonaEnvioDocument> {
    const zona = await this.zonaEnvioModel.findOne({ codigo, activo: true }).exec();
    if (!zona) {
      throw new NotFoundException(
        `Zona de envío con código ${codigo} no encontrada`,
      );
    }
    return zona;
  }

  async findZonasEnvioByCiudad(ciudadId: string): Promise<ZonaEnvioDocument[]> {
    const ciudad = await this.findCiudadById(ciudadId);

    return this.zonaEnvioModel
      .find({
        activo: true,
        $or: [
          { coberturaNacional: true },
          { departamentosIds: ciudad.departamentoId },
          { 'ciudades.ciudadId': new Types.ObjectId(ciudadId) },
        ],
      })
      .sort({ nombre: 1 })
      .exec();
  }

  async updateZonaEnvio(
    id: string,
    dto: UpdateZonaEnvioDto,
  ): Promise<ZonaEnvioDocument> {
    const updateData: any = { ...dto };

    if (dto.ciudades) {
      const ciudadesData: Array<{
        ciudadId: Types.ObjectId;
        ciudadNombre: string;
        departamentoNombre: string;
      }> = [];
      for (const ciudadDto of dto.ciudades) {
        const ciudad = await this.findCiudadById(ciudadDto.ciudadId);
        ciudadesData.push({
          ciudadId: new Types.ObjectId(ciudadDto.ciudadId),
          ciudadNombre: ciudad.nombre,
          departamentoNombre: ciudad.departamentoNombre,
        });
      }
      updateData.ciudades = ciudadesData;
    }

    if (dto.departamentosIds) {
      updateData.departamentosIds = dto.departamentosIds.map(
        (id) => new Types.ObjectId(id),
      );
    }

    const actualizada = await this.zonaEnvioModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!actualizada) {
      throw new NotFoundException(`Zona de envío con ID ${id} no encontrada`);
    }
    return actualizada;
  }

  async removeZonaEnvio(id: string): Promise<void> {
    const resultado = await this.zonaEnvioModel
      .findByIdAndUpdate(id, { activo: false })
      .exec();

    if (!resultado) {
      throw new NotFoundException(`Zona de envío con ID ${id} no encontrada`);
    }
  }

  // ==================== UTILIDADES ====================

  async verificarCobertura(ciudadId: string): Promise<{
    disponible: boolean;
    zonas: ZonaEnvioDocument[];
  }> {
    const zonas = await this.findZonasEnvioByCiudad(ciudadId);
    return {
      disponible: zonas.length > 0,
      zonas,
    };
  }
}