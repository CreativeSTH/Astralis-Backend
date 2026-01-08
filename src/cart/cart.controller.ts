import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { CartService } from './cart.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { MergeCartDto } from './dto/merge-cart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('Cart')
@ApiBearerAuth('JWT-auth')
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser() user: CurrentUserData) {
    return this.cartService.getCart(user.id);
  }

  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  addItem(@CurrentUser() user: CurrentUserData, @Body() addItemDto: AddItemDto) {
    return this.cartService.addItem(user.id, addItemDto);
  }

  @Patch('items/:productId')
  updateItem(
    @CurrentUser() user: CurrentUserData,
    @Param('productId') productId: string,
    @Body() updateItemDto: UpdateItemDto,
  ) {
    return this.cartService.updateItem(user.id, productId, updateItemDto);
  }

  @Delete('items/:productId')
  @HttpCode(HttpStatus.OK)
  removeItem(
    @CurrentUser() user: CurrentUserData,
    @Param('productId') productId: string,
  ) {
    return this.cartService.removeItem(user.id, productId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  clearCart(@CurrentUser() user: CurrentUserData) {
    return this.cartService.clearCart(user.id);
  }

  @Post('merge')
  @HttpCode(HttpStatus.OK)
  mergeCart(@CurrentUser() user: CurrentUserData, @Body() mergeCartDto: MergeCartDto) {
    return this.cartService.mergeCart(user.id, mergeCartDto);
  }

  @Get('validate')
  validateStock(@CurrentUser() user: CurrentUserData) {
    return this.cartService.validateCartStock(user.id);
  }
}
