import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cliente, ClienteDocument } from './schemas/cliente.schema';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    @InjectModel(Cliente.name)
    private clienteModel: Model<ClienteDocument>,
  ) {}

  async create(createClienteDto: CreateClienteDto): Promise<ClienteDocument> {
    const nuevoCliente = new this.clienteModel(createClienteDto);
    return nuevoCliente.save();
  }

  async findAll(): Promise<ClienteDocument[]> {
    return this.clienteModel.find({ activo: true }).exec();
  }

  async findByScore(minScore: number, maxScore: number): Promise<ClienteDocument[]> {
    return this.clienteModel
      .find({
        activo: true,
        score: { $gte: minScore, $lte: maxScore },
      })
      .exec();
  }

  async findOne(id: string): Promise<ClienteDocument> {
    const cliente = await this.clienteModel.findById(id).exec();
    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }
    return cliente;
  }

  async update(
    id: string,
    updateClienteDto: UpdateClienteDto,
  ): Promise<ClienteDocument> {
    const clienteActualizado = await this.clienteModel
      .findByIdAndUpdate(id, updateClienteDto, { new: true })
      .exec();
    
    if (!clienteActualizado) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }
    return clienteActualizado;
  }

  async remove(id: string): Promise<void> {
    const resultado = await this.clienteModel
      .findByIdAndUpdate(id, { activo: false }, { new: true })
      .exec();
    
    if (!resultado) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }
  }

  async actualizarScore(id: string, pagoATiempo: boolean): Promise<void> {
    const cliente = await this.findOne(id);
    
    // Calcular nuevo score basado en historial
    const factorNuevoPago = pagoATiempo ? 10 : -5;
    const totalPagos = cliente.totalCreditosCompletados + 1;
    const nuevoScore = Math.max(
      0,
      Math.min(100, cliente.score + factorNuevoPago / totalPagos)
    );

    await this.clienteModel
      .findByIdAndUpdate(id, { score: nuevoScore })
      .exec();
  }

  async incrementarCreditosActivos(id: string): Promise<void> {
    await this.clienteModel
      .findByIdAndUpdate(id, { $inc: { totalCreditosActivos: 1 } })
      .exec();
  }

  async decrementarCreditosActivos(id: string): Promise<void> {
    await this.clienteModel
      .findByIdAndUpdate(id, { 
        $inc: { 
          totalCreditosActivos: -1,
          totalCreditosCompletados: 1 
        } 
      })
      .exec();
  }
}