import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { WishlistService } from './wishlist.service';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('Wishlist')
@ApiBearerAuth('JWT-auth')
@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  /**
   * Obtener la lista de deseos del usuario
   */
  @Get()
  @ApiOperation({ summary: 'Obtener lista de deseos' })
  getWishlist(@CurrentUser() user: CurrentUserData) {
    return this.wishlistService.getWishlist(user.id);
  }

  /**
   * Obtener cantidad de items en la wishlist
   */
  @Get('count')
  @ApiOperation({ summary: 'Obtener cantidad de items' })
  getCount(@CurrentUser() user: CurrentUserData) {
    return this.wishlistService.getWishlistCount(user.id);
  }

  /**
   * Verificar si un producto está en la wishlist
   */
  @Get('check/:productoId')
  @ApiOperation({ summary: 'Verificar si producto está en wishlist' })
  checkProduct(
    @CurrentUser() user: CurrentUserData,
    @Param('productoId') productoId: string,
  ) {
    return this.wishlistService.isInWishlist(user.id, productoId);
  }

  /**
   * Agregar producto a la lista de deseos
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Agregar producto a wishlist' })
  addItem(
    @CurrentUser() user: CurrentUserData,
    @Body() addToWishlistDto: AddToWishlistDto,
  ) {
    return this.wishlistService.addItem(user.id, addToWishlistDto.productoId);
  }

  /**
   * Eliminar producto de la lista de deseos
   */
  @Delete(':productoId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar producto de wishlist' })
  removeItem(
    @CurrentUser() user: CurrentUserData,
    @Param('productoId') productoId: string,
  ) {
    return this.wishlistService.removeItem(user.id, productoId);
  }

  /**
   * Vaciar la lista de deseos
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vaciar wishlist' })
  clearWishlist(@CurrentUser() user: CurrentUserData) {
    return this.wishlistService.clearWishlist(user.id);
  }
}
