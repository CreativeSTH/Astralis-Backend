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
import { AcordesService } from './acordes.service';
import { CreateAcordeDto } from './dto/create-acorde.dto';
import { UpdateAcordeDto } from './dto/update-acorde.dto';

@Controller('acordes')
export class AcordesController {
  constructor(private readonly acordesService: AcordesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createAcordeDto: CreateAcordeDto) {
    return this.acordesService.create(createAcordeDto);
  }

  @Get()
  findAll() {
    return this.acordesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.acordesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAcordeDto: UpdateAcordeDto) {
    return this.acordesService.update(id, updateAcordeDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.acordesService.remove(id);
  }
}