import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { AddStockDto } from './dto/add-stock.dto';

@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProductoDto: CreateProductoDto) {
    return this.productosService.create(createProductoDto);
  }

  @Get()
  findAll() {
    return this.productosService.findAll();
  }

  @Get('estadisticas')
  getEstadisticas() {
    return this.productosService.getEstadisticas();
  }

  @Get('con-stock')
  findConStock() {
    return this.productosService.findConStock();
  }

  @Get('sin-stock')
  findSinStock() {
    return this.productosService.findSinStock();
  }

  @Get('mas-vendidos')
  findMasVendidos() {
    return this.productosService.findMasVendidos(5);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productosService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductoDto: UpdateProductoDto) {
    return this.productosService.update(id, updateProductoDto);
  }

  @Patch(':id/add-stock')
  addStock(@Param('id') id: string, @Body() addStockDto: AddStockDto) {
    return this.productosService.addStock(id, addStockDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.productosService.remove(id);
  }
}