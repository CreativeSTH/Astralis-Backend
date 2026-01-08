import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto, AdminUpdateReviewDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../auth/schemas/usuario.schema';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // ==================== ENDPOINTS PÚBLICOS ====================

  /**
   * Obtener reseñas de un producto (público)
   */
  @Get('product/:productoId')
  @ApiOperation({ summary: 'Obtener reseñas de un producto' })
  findByProduct(
    @Param('productoId') productoId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.reviewsService.findByProduct(
      productoId,
      page || 1,
      limit || 10,
      sortBy || 'createdAt',
      sortOrder || 'desc',
    );
  }

  /**
   * Obtener estadísticas de reseñas de un producto (público)
   */
  @Get('product/:productoId/stats')
  @ApiOperation({ summary: 'Obtener estadísticas de reseñas de un producto' })
  getProductStats(@Param('productoId') productoId: string) {
    return this.reviewsService.getProductStats(productoId);
  }

  /**
   * Obtener una reseña por ID (público)
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener reseña por ID' })
  findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }

  // ==================== ENDPOINTS AUTENTICADOS ====================

  /**
   * Crear una reseña (requiere auth)
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear reseña' })
  create(
    @Body() createReviewDto: CreateReviewDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    const userName = user.email.split('@')[0]; // Simple username from email
    return this.reviewsService.create(user.id, userName, createReviewDto);
  }

  /**
   * Verificar si el usuario puede dejar reseña
   */
  @Get('can-review/:productoId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Verificar si puede dejar reseña' })
  canReview(
    @Param('productoId') productoId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.reviewsService.canUserReview(user.id, productoId);
  }

  /**
   * Obtener mis reseñas
   */
  @Get('user/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener mis reseñas' })
  findMyReviews(@CurrentUser() user: CurrentUserData) {
    return this.reviewsService.findByUser(user.id);
  }

  /**
   * Actualizar mi reseña
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar mi reseña' })
  update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.reviewsService.update(id, user.id, updateReviewDto);
  }

  /**
   * Eliminar mi reseña
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar mi reseña' })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.reviewsService.remove(id, user.id);
  }

  /**
   * Marcar reseña como útil
   */
  @Post(':id/helpful')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar reseña como útil' })
  markHelpful(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.reviewsService.markHelpful(id, user.id);
  }

  // ==================== ENDPOINTS ADMIN ====================

  /**
   * Obtener reseñas pendientes (admin)
   */
  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener reseñas pendientes (Admin)' })
  findPending(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewsService.findAllPending(page || 1, limit || 20);
  }

  /**
   * Moderar reseña (admin)
   */
  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Moderar reseña (Admin)' })
  adminUpdate(
    @Param('id') id: string,
    @Body() updateDto: AdminUpdateReviewDto,
  ) {
    return this.reviewsService.adminUpdate(id, updateDto);
  }

  /**
   * Eliminar reseña (admin)
   */
  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar reseña (Admin)' })
  adminRemove(@Param('id') id: string) {
    return this.reviewsService.adminRemove(id);
  }
}
