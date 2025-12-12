import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Marca, MarcaDocument } from './schemas/marca.schema';
import { CreateMarcaDto } from './dto/create-marca.dto';
import { UpdateMarcaDto } from './dto/update-marca.dto';

@Injectable()
export class MarcasService {
  constructor(
    @InjectModel(Marca.name)
    private marcaModel: Model<MarcaDocument>,
  ) {}

  async create(createMarcaDto: CreateMarcaDto): Promise<MarcaDocument> {
    const nuevaMarca = new this.marcaModel(createMarcaDto);
    return nuevaMarca.save();
  }

  async findAll(): Promise<MarcaDocument[]> {
    return this.marcaModel.find({ activo: true }).exec();
  }

  async findOne(id: string): Promise<MarcaDocument> {
    const marca = await this.marcaModel.findById(id).exec();
    if (!marca) {
      throw new NotFoundException(`Marca con ID ${id} no encontrada`);
    }
    return marca;
  }

  async update(id: string, updateMarcaDto: UpdateMarcaDto): Promise<MarcaDocument> {
    const marcaActualizada = await this.marcaModel
      .findByIdAndUpdate(id, updateMarcaDto, { new: true })
      .exec();
    
    if (!marcaActualizada) {
      throw new NotFoundException(`Marca con ID ${id} no encontrada`);
    }
    return marcaActualizada;
  }

  async remove(id: string): Promise<void> {
    const resultado = await this.marcaModel
      .findByIdAndUpdate(id, { activo: false }, { new: true })
      .exec();
    
    if (!resultado) {
      throw new NotFoundException(`Marca con ID ${id} no encontrada`);
    }
  }
}