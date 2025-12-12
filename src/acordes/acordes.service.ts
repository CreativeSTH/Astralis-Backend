import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Acorde, AcordeDocument } from './schemas/acorde.schema';
import { CreateAcordeDto } from './dto/create-acorde.dto';
import { UpdateAcordeDto } from './dto/update-acorde.dto';

@Injectable()
export class AcordesService {
  constructor(
    @InjectModel(Acorde.name)
    private acordeModel: Model<AcordeDocument>,
  ) {}

  async create(createAcordeDto: CreateAcordeDto): Promise<AcordeDocument> {
    const nuevoAcorde = new this.acordeModel(createAcordeDto);
    return nuevoAcorde.save();
  }

  async findAll(): Promise<AcordeDocument[]> {
    return this.acordeModel.find({ activo: true }).exec();
  }

  async findOne(id: string): Promise<AcordeDocument> {
    const acorde = await this.acordeModel.findById(id).exec();
    if (!acorde) {
      throw new NotFoundException(`Acorde con ID ${id} no encontrado`);
    }
    return acorde;
  }

  async update(id: string, updateAcordeDto: UpdateAcordeDto): Promise<AcordeDocument> {
    const acordeActualizado = await this.acordeModel
      .findByIdAndUpdate(id, updateAcordeDto, { new: true })
      .exec();
    
    if (!acordeActualizado) {
      throw new NotFoundException(`Acorde con ID ${id} no encontrado`);
    }
    return acordeActualizado;
  }

  async remove(id: string): Promise<void> {
    const resultado = await this.acordeModel
      .findByIdAndUpdate(id, { activo: false }, { new: true })
      .exec();
    
    if (!resultado) {
      throw new NotFoundException(`Acorde con ID ${id} no encontrado`);
    }
  }
}