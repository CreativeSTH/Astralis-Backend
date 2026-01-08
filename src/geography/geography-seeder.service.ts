import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Departamento,
  DepartamentoDocument,
} from './schemas/departamento.schema';
import { Ciudad, CiudadDocument } from './schemas/ciudad.schema';
import { ZonaEnvio, ZonaEnvioDocument } from './schemas/zona-envio.schema';

import {
  DEPARTAMENTOS_COLOMBIA,
  ZONAS_ENVIO_COLOMBIA,
  TRANSPORTADORAS_COLOMBIA,
} from './data/colombia-seed.data';

import {
  Transportadora,
  TransportadoraDocument,
} from '../shipping/schemas/transportadora.schema';

@Injectable()
export class GeographySeederService {
  private readonly logger = new Logger(GeographySeederService.name);

  constructor(
    @InjectModel(Departamento.name)
    private departamentoModel: Model<DepartamentoDocument>,
    @InjectModel(Ciudad.name)
    private ciudadModel: Model<CiudadDocument>,
    @InjectModel(ZonaEnvio.name)
    private zonaEnvioModel: Model<ZonaEnvioDocument>,
    @InjectModel(Transportadora.name)
    private transportadoraModel: Model<TransportadoraDocument>,
  ) {}

  async seed(): Promise<void> {
    this.logger.log('Iniciando seed de datos geográficos de Colombia...');

    await this.seedDepartamentosYCiudades();
    await this.seedZonasEnvio();
    await this.seedTransportadoras();

    this.logger.log('Seed completado exitosamente');
  }

  async seedDepartamentosYCiudades(): Promise<void> {
    // Verificar si ya hay datos
    const existingCount = await this.departamentoModel.countDocuments();
    if (existingCount > 0) {
      this.logger.log(
        `Ya existen ${existingCount} departamentos. Omitiendo seed de departamentos y ciudades.`,
      );
      return;
    }

    this.logger.log('Creando departamentos y ciudades...');

    for (const deptoData of DEPARTAMENTOS_COLOMBIA) {
      // Crear departamento
      const departamento = await this.departamentoModel.create({
        nombre: deptoData.nombre,
        codigo: deptoData.codigo,
        activo: true,
      });

      // Crear ciudades del departamento
      const ciudadesData = deptoData.ciudades.map((ciudad) => ({
        nombre: ciudad.nombre,
        codigo: ciudad.codigo,
        departamentoId: departamento._id,
        departamentoNombre: departamento.nombre,
        activo: true,
      }));

      await this.ciudadModel.insertMany(ciudadesData);

      this.logger.log(
        `Departamento ${deptoData.nombre}: ${deptoData.ciudades.length} ciudades creadas`,
      );
    }

    const totalDeptos = await this.departamentoModel.countDocuments();
    const totalCiudades = await this.ciudadModel.countDocuments();
    this.logger.log(
      `Total: ${totalDeptos} departamentos, ${totalCiudades} ciudades`,
    );
  }

  async seedZonasEnvio(): Promise<void> {
    const existingCount = await this.zonaEnvioModel.countDocuments();
    if (existingCount > 0) {
      this.logger.log(
        `Ya existen ${existingCount} zonas de envío. Omitiendo seed.`,
      );
      return;
    }

    this.logger.log('Creando zonas de envío...');

    for (const zonaData of ZONAS_ENVIO_COLOMBIA) {
      const zonaDoc: any = {
        nombre: zonaData.nombre,
        codigo: zonaData.codigo,
        descripcion: zonaData.descripcion,
        coberturaNacional: zonaData.coberturaNacional,
        activo: true,
      };

      // Agregar departamentos si están definidos
      if (zonaData.departamentosCodigos?.length) {
        const deptos = await this.departamentoModel
          .find({ codigo: { $in: zonaData.departamentosCodigos } })
          .exec();
        zonaDoc.departamentosIds = deptos.map((d) => d._id);
      }

      // Agregar ciudades si están definidas
      if (zonaData.ciudadesCodigos?.length) {
        const ciudades = await this.ciudadModel
          .find({ codigo: { $in: zonaData.ciudadesCodigos } })
          .exec();
        zonaDoc.ciudades = ciudades.map((c) => ({
          ciudadId: c._id,
          ciudadNombre: c.nombre,
          departamentoNombre: c.departamentoNombre,
        }));
      }

      await this.zonaEnvioModel.create(zonaDoc);
      this.logger.log(`Zona de envío creada: ${zonaData.nombre}`);
    }
  }

  async seedTransportadoras(): Promise<void> {
    const existingCount = await this.transportadoraModel.countDocuments();
    if (existingCount > 0) {
      this.logger.log(
        `Ya existen ${existingCount} transportadoras. Omitiendo seed.`,
      );
      return;
    }

    this.logger.log('Creando transportadoras...');

    for (const transData of TRANSPORTADORAS_COLOMBIA) {
      await this.transportadoraModel.create({
        nombre: transData.nombre,
        codigo: transData.codigo,
        descripcion: transData.descripcion,
        tiempoEstimado: transData.tiempoEstimado,
        urlTracking: transData.urlTracking,
        activo: true,
      });
      this.logger.log(`Transportadora creada: ${transData.nombre}`);
    }
  }

  async reset(): Promise<void> {
    this.logger.warn('Eliminando todos los datos geográficos...');

    await this.zonaEnvioModel.deleteMany({});
    await this.ciudadModel.deleteMany({});
    await this.departamentoModel.deleteMany({});
    await this.transportadoraModel.deleteMany({});

    this.logger.log('Datos eliminados. Ejecutando seed...');
    await this.seed();
  }
}