import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Address, AddressDocument } from './schemas/address.schema';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { GeographyService } from '../geography/geography.service';

@Injectable()
export class AddressesService {
  constructor(
    @InjectModel(Address.name)
    private addressModel: Model<AddressDocument>,
    private geographyService: GeographyService,
  ) {}

  async create(
    userId: string,
    createAddressDto: CreateAddressDto,
  ): Promise<AddressDocument> {
    const departamento = await this.geographyService.findDepartamentoById(
      createAddressDto.departamentoId,
    );

    const ciudad = await this.geographyService.findCiudadById(
      createAddressDto.ciudadId,
    );

    if (ciudad.departamentoId.toString() !== createAddressDto.departamentoId) {
      throw new BadRequestException(
        'La ciudad no pertenece al departamento seleccionado',
      );
    }

    if (createAddressDto.isDefault) {
      await this.addressModel.updateMany(
        { userId: new Types.ObjectId(userId), isDefault: true },
        { isDefault: false },
      );
    }

    const isFirstAddress = await this.addressModel.countDocuments({
      userId: new Types.ObjectId(userId),
      activo: true,
    });

    const address = new this.addressModel({
      ...createAddressDto,
      userId: new Types.ObjectId(userId),
      departamentoId: new Types.ObjectId(createAddressDto.departamentoId),
      departamentoNombre: departamento.nombre,
      ciudadId: new Types.ObjectId(createAddressDto.ciudadId),
      ciudadNombre: ciudad.nombre,
      isDefault: createAddressDto.isDefault || isFirstAddress === 0,
    });

    return address.save();
  }

  async findAllByUser(userId: string): Promise<AddressDocument[]> {
    return this.addressModel
      .find({ userId: new Types.ObjectId(userId), activo: true })
      .sort({ isDefault: -1, createdAt: -1 })
      .exec();
  }

  async findByUserAndCity(
    userId: string,
    ciudadId: string,
  ): Promise<AddressDocument[]> {
    return this.addressModel
      .find({
        userId: new Types.ObjectId(userId),
        ciudadId: new Types.ObjectId(ciudadId),
        activo: true,
      })
      .sort({ isDefault: -1, createdAt: -1 })
      .exec();
  }

  async findOne(userId: string, addressId: string): Promise<AddressDocument> {
    const address = await this.addressModel
      .findOne({
        _id: addressId,
        userId: new Types.ObjectId(userId),
        activo: true,
      })
      .exec();

    if (!address) {
      throw new NotFoundException('Dirección no encontrada');
    }

    return address;
  }

  async findById(addressId: string): Promise<AddressDocument> {
    const address = await this.addressModel
      .findOne({ _id: addressId, activo: true })
      .exec();

    if (!address) {
      throw new NotFoundException('Dirección no encontrada');
    }

    return address;
  }

  async findDefault(userId: string): Promise<AddressDocument | null> {
    return this.addressModel
      .findOne({
        userId: new Types.ObjectId(userId),
        isDefault: true,
        activo: true,
      })
      .exec();
  }

  async update(
    userId: string,
    addressId: string,
    updateAddressDto: UpdateAddressDto,
  ): Promise<AddressDocument> {
    const address = await this.findOne(userId, addressId);

    if (updateAddressDto.departamentoId || updateAddressDto.ciudadId) {
      const deptoId =
        updateAddressDto.departamentoId ||
        address.departamentoId.toString();
      const cityId =
        updateAddressDto.ciudadId || address.ciudadId.toString();

      const departamento =
        await this.geographyService.findDepartamentoById(deptoId);
      const ciudad = await this.geographyService.findCiudadById(cityId);

      if (ciudad.departamentoId.toString() !== deptoId) {
        throw new BadRequestException(
          'La ciudad no pertenece al departamento seleccionado',
        );
      }

      updateAddressDto['departamentoNombre'] = departamento.nombre;
      updateAddressDto['ciudadNombre'] = ciudad.nombre;

      if (updateAddressDto.departamentoId) {
        updateAddressDto['departamentoId'] = new Types.ObjectId(
          updateAddressDto.departamentoId,
        ) as any;
      }
      if (updateAddressDto.ciudadId) {
        updateAddressDto['ciudadId'] = new Types.ObjectId(
          updateAddressDto.ciudadId,
        ) as any;
      }
    }

    if (updateAddressDto.isDefault) {
      await this.addressModel.updateMany(
        {
          userId: new Types.ObjectId(userId),
          isDefault: true,
          _id: { $ne: addressId },
        },
        { isDefault: false },
      );
    }

    const updated = await this.addressModel
      .findByIdAndUpdate(addressId, updateAddressDto, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Dirección no encontrada');
    }

    return updated;
  }

  async setDefault(userId: string, addressId: string): Promise<AddressDocument> {
    await this.findOne(userId, addressId);

    await this.addressModel.updateMany(
      { userId: new Types.ObjectId(userId), isDefault: true },
      { isDefault: false },
    );

    const updated = await this.addressModel
      .findByIdAndUpdate(addressId, { isDefault: true }, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Dirección no encontrada');
    }

    return updated;
  }

  async remove(userId: string, addressId: string): Promise<void> {
    const address = await this.findOne(userId, addressId);

    await this.addressModel.findByIdAndUpdate(addressId, { activo: false });

    if (address.isDefault) {
      const nextDefault = await this.addressModel
        .findOne({
          userId: new Types.ObjectId(userId),
          activo: true,
          _id: { $ne: addressId },
        })
        .sort({ createdAt: -1 })
        .exec();

      if (nextDefault) {
        await this.addressModel.findByIdAndUpdate(nextDefault._id, {
          isDefault: true,
        });
      }
    }
  }
}
