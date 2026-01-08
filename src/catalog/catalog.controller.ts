import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CatalogService, PaginatedResponse, PublicProduct } from './catalog.service';
import { CatalogQueryDto } from './dto/catalog-query.dto';

@ApiTags('Catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('products')
  findAll(@Query() query: CatalogQueryDto): Promise<PaginatedResponse<PublicProduct>> {
    return this.catalogService.findAll(query);
  }

  @Get('products/featured')
  findFeatured(@Query('limit') limit?: number): Promise<PublicProduct[]> {
    return this.catalogService.findFeatured(limit);
  }

  @Get('products/best-sellers')
  findBestSellers(@Query('limit') limit?: number): Promise<PublicProduct[]> {
    return this.catalogService.findBestSellers(limit);
  }

  @Get('products/:id')
  findOne(@Param('id') id: string): Promise<PublicProduct> {
    return this.catalogService.findOne(id);
  }

  @Get('products/:id/stock')
  checkStock(
    @Param('id') id: string,
    @Query('quantity') quantity: number = 1,
  ): Promise<{ available: boolean; stock: number }> {
    return this.catalogService.checkStock(id, quantity);
  }

  @Get('brands')
  findBrands(): Promise<Array<{ id: string; name: string; logo: string }>> {
    return this.catalogService.findBrands();
  }
}
