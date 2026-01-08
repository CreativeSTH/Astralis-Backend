import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cliente, ClienteDocument, TipoNotaCliente } from './schemas/cliente.schema';
import { CreateClienteDto, CreateNotaClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

export interface PaginatedClientes {
  clientes: ClienteDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ClienteFilters {
  search?: string;
  scoreMin?: number;
  scoreMax?: number;
  conDeuda?: boolean;
  bloqueados?: boolean;
  page?: number;
  limit?: number;
}

@Injectable()
export class ClientesService {
  constructor(
    @InjectModel(Cliente.name)
    private clienteModel: Model<ClienteDocument>,
  ) {}

  async create(createClienteDto: CreateClienteDto): Promise<ClienteDocument> {
    // Verificar unicidad de teléfono
    const existente = await this.clienteModel.findOne({
      telefono: createClienteDto.telefono
    }).exec();

    if (existente) {
      throw new ConflictException(`Ya existe un cliente con el teléfono ${createClienteDto.telefono}`);
    }

    const nuevoCliente = new this.clienteModel(createClienteDto);
    return nuevoCliente.save();
  }

  async findAll(): Promise<ClienteDocument[]> {
    return this.clienteModel.find({ activo: true }).exec();
  }

  // === BÚSQUEDA AVANZADA CON PAGINACIÓN ===
  async findWithFilters(filters: ClienteFilters): Promise<PaginatedClientes> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = { activo: true };

    // Búsqueda por texto (nombre o teléfono)
    if (filters.search) {
      query.$or = [
        { nombreCompleto: { $regex: filters.search, $options: 'i' } },
        { telefono: { $regex: filters.search, $options: 'i' } },
      ];
    }

    // Filtro por score
    if (filters.scoreMin !== undefined || filters.scoreMax !== undefined) {
      query.score = {};
      if (filters.scoreMin !== undefined) query.score.$gte = filters.scoreMin;
      if (filters.scoreMax !== undefined) query.score.$lte = filters.scoreMax;
    }

    // Filtro por deuda
    if (filters.conDeuda === true) {
      query.deudaActual = { $gt: 0 };
    } else if (filters.conDeuda === false) {
      query.deudaActual = 0;
    }

    // Filtro por bloqueo
    if (filters.bloqueados !== undefined) {
      query.bloqueadoPorMora = filters.bloqueados;
    }

    const [clientes, total] = await Promise.all([
      this.clienteModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.clienteModel.countDocuments(query),
    ]);

    return {
      clientes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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

  // === GESTIÓN DE CRÉDITO ===

  /**
   * Verifica si el cliente puede recibir un nuevo crédito
   */
  async verificarCreditoDisponible(id: string, montoSolicitado: number): Promise<{
    aprobado: boolean;
    creditoDisponible: number;
    motivo?: string;
  }> {
    const cliente = await this.findOne(id);
    const creditoDisponible = cliente.limiteCredito - cliente.deudaActual;

    if (cliente.bloqueadoPorMora) {
      return {
        aprobado: false,
        creditoDisponible,
        motivo: `Cliente bloqueado por mora desde ${cliente.fechaBloqueo?.toLocaleDateString()}. ${cliente.motivoBloqueo || ''}`,
      };
    }

    if (montoSolicitado > creditoDisponible) {
      return {
        aprobado: false,
        creditoDisponible,
        motivo: `Crédito insuficiente. Disponible: $${creditoDisponible.toLocaleString()}, Solicitado: $${montoSolicitado.toLocaleString()}`,
      };
    }

    return {
      aprobado: true,
      creditoDisponible,
    };
  }

  /**
   * Incrementa la deuda del cliente
   */
  async incrementarDeuda(id: string, monto: number): Promise<void> {
    await this.clienteModel
      .findByIdAndUpdate(id, { $inc: { deudaActual: monto } })
      .exec();
  }

  /**
   * Decrementa la deuda del cliente
   */
  async decrementarDeuda(id: string, monto: number): Promise<void> {
    await this.clienteModel
      .findByIdAndUpdate(id, { $inc: { deudaActual: -monto } })
      .exec();
  }

  /**
   * Bloquea un cliente por mora
   */
  async bloquearPorMora(id: string, motivo: string): Promise<ClienteDocument> {
    const cliente = await this.clienteModel
      .findByIdAndUpdate(
        id,
        {
          bloqueadoPorMora: true,
          fechaBloqueo: new Date(),
          motivoBloqueo: motivo,
        },
        { new: true }
      )
      .exec();

    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    return cliente;
  }

  /**
   * Desbloquea un cliente
   */
  async desbloquear(id: string): Promise<ClienteDocument> {
    const cliente = await this.clienteModel
      .findByIdAndUpdate(
        id,
        {
          bloqueadoPorMora: false,
          $unset: { fechaBloqueo: 1, motivoBloqueo: 1 },
        },
        { new: true }
      )
      .exec();

    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    return cliente;
  }

  // === NOTAS/HISTORIAL ===

  /**
   * Agrega una nota al historial del cliente
   */
  async agregarNota(
    clienteId: string,
    nota: CreateNotaClienteDto,
    usuarioId?: string,
  ): Promise<ClienteDocument> {
    const cliente = await this.findOne(clienteId);

    const nuevaNota = {
      texto: nota.texto,
      tipo: nota.tipo || TipoNotaCliente.OTRO,
      creadoPor: usuarioId ? new Types.ObjectId(usuarioId) : undefined,
      creadoAt: new Date(),
    };

    cliente.notas.push(nuevaNota);
    return cliente.save();
  }

  /**
   * Obtiene las notas de un cliente
   */
  async obtenerNotas(clienteId: string): Promise<ClienteDocument['notas']> {
    const cliente = await this.findOne(clienteId);
    return cliente.notas.sort((a, b) =>
      new Date(b.creadoAt).getTime() - new Date(a.creadoAt).getTime()
    );
  }

  // === SCORE Y ESTADÍSTICAS ===

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

  // === ESTADÍSTICAS ===

  async getEstadisticas(): Promise<{
    totalClientes: number;
    clientesActivos: number;
    clientesConDeuda: number;
    clientesBloqueados: number;
    deudaTotal: number;
    promedioScore: number;
  }> {
    const stats = await this.clienteModel.aggregate([
      { $match: { activo: true } },
      {
        $group: {
          _id: null,
          totalClientes: { $sum: 1 },
          clientesConDeuda: { $sum: { $cond: [{ $gt: ['$deudaActual', 0] }, 1, 0] } },
          clientesBloqueados: { $sum: { $cond: ['$bloqueadoPorMora', 1, 0] } },
          deudaTotal: { $sum: '$deudaActual' },
          promedioScore: { $avg: '$score' },
        },
      },
    ]);

    if (stats.length === 0) {
      return {
        totalClientes: 0,
        clientesActivos: 0,
        clientesConDeuda: 0,
        clientesBloqueados: 0,
        deudaTotal: 0,
        promedioScore: 0,
      };
    }

    const data = stats[0];
    return {
      totalClientes: data.totalClientes,
      clientesActivos: data.totalClientes,
      clientesConDeuda: data.clientesConDeuda,
      clientesBloqueados: data.clientesBloqueados,
      deudaTotal: data.deudaTotal,
      promedioScore: Math.round(data.promedioScore * 10) / 10,
    };
  }
}