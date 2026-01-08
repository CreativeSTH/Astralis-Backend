import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Review, ReviewDocument, ReviewStatus } from './schemas/review.schema';
import { CreateReviewDto, UpdateReviewDto, AdminUpdateReviewDto } from './dto';

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  verifiedPurchaseCount: number;
}

export interface PaginatedReviews {
  reviews: ReviewDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name)
    private reviewModel: Model<ReviewDocument>,
  ) {}

  async create(
    userId: string,
    userName: string,
    createReviewDto: CreateReviewDto,
  ): Promise<ReviewDocument> {
    // Verificar si el usuario ya dejó una review para este producto
    const existingReview = await this.reviewModel.findOne({
      productoId: new Types.ObjectId(createReviewDto.productoId),
      userId: new Types.ObjectId(userId),
    }).exec();

    if (existingReview) {
      throw new ConflictException('Ya has dejado una reseña para este producto');
    }

    const review = new this.reviewModel({
      ...createReviewDto,
      productoId: new Types.ObjectId(createReviewDto.productoId),
      userId: new Types.ObjectId(userId),
      userName,
      orderId: createReviewDto.orderId
        ? new Types.ObjectId(createReviewDto.orderId)
        : undefined,
      verifiedPurchase: !!createReviewDto.orderId,
    });

    return review.save();
  }

  async findByProduct(
    productoId: string,
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<PaginatedReviews> {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find({
          productoId: new Types.ObjectId(productoId),
          status: ReviewStatus.APPROVED,
          activo: true,
        })
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.reviewModel.countDocuments({
        productoId: new Types.ObjectId(productoId),
        status: ReviewStatus.APPROVED,
        activo: true,
      }),
    ]);

    return {
      reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByUser(userId: string): Promise<ReviewDocument[]> {
    return this.reviewModel
      .find({
        userId: new Types.ObjectId(userId),
        activo: true,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<ReviewDocument> {
    const review = await this.reviewModel.findById(id).exec();
    if (!review || !review.activo) {
      throw new NotFoundException(`Reseña con ID ${id} no encontrada`);
    }
    return review;
  }

  async update(
    id: string,
    userId: string,
    updateReviewDto: UpdateReviewDto,
  ): Promise<ReviewDocument> {
    const review = await this.findOne(id);

    if (review.userId.toString() !== userId) {
      throw new ForbiddenException('No puedes editar esta reseña');
    }

    Object.assign(review, updateReviewDto);
    return review.save();
  }

  async adminUpdate(
    id: string,
    updateDto: AdminUpdateReviewDto,
  ): Promise<ReviewDocument> {
    const review = await this.findOne(id);

    if (updateDto.status) {
      review.status = updateDto.status;
    }

    if (updateDto.adminResponse) {
      review.adminResponse = updateDto.adminResponse;
      review.adminResponseAt = new Date();
    }

    return review.save();
  }

  async remove(id: string, userId: string): Promise<void> {
    const review = await this.findOne(id);

    if (review.userId.toString() !== userId) {
      throw new ForbiddenException('No puedes eliminar esta reseña');
    }

    review.activo = false;
    await review.save();
  }

  async adminRemove(id: string): Promise<void> {
    const result = await this.reviewModel.findByIdAndUpdate(id, { activo: false }).exec();
    if (!result) {
      throw new NotFoundException(`Reseña con ID ${id} no encontrada`);
    }
  }

  async getProductStats(productoId: string): Promise<ReviewStats> {
    const stats = await this.reviewModel.aggregate([
      {
        $match: {
          productoId: new Types.ObjectId(productoId),
          status: ReviewStatus.APPROVED,
          activo: true,
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          verifiedPurchaseCount: {
            $sum: { $cond: ['$verifiedPurchase', 1, 0] },
          },
        },
      },
    ]);

    if (stats.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        verifiedPurchaseCount: 0,
      };
    }

    const data = stats[0];
    return {
      averageRating: Math.round(data.averageRating * 10) / 10,
      totalReviews: data.totalReviews,
      ratingDistribution: {
        1: data.rating1,
        2: data.rating2,
        3: data.rating3,
        4: data.rating4,
        5: data.rating5,
      },
      verifiedPurchaseCount: data.verifiedPurchaseCount,
    };
  }

  async markHelpful(reviewId: string, userId: string): Promise<ReviewDocument> {
    const review = await this.findOne(reviewId);

    const userObjectId = new Types.ObjectId(userId);
    const alreadyVoted = review.helpfulVotes.some(
      id => id.toString() === userId,
    );

    if (alreadyVoted) {
      // Remover voto
      review.helpfulVotes = review.helpfulVotes.filter(
        id => id.toString() !== userId,
      );
      review.helpfulCount -= 1;
    } else {
      // Agregar voto
      review.helpfulVotes.push(userObjectId);
      review.helpfulCount += 1;
    }

    return review.save();
  }

  async canUserReview(userId: string, productoId: string): Promise<boolean> {
    const existingReview = await this.reviewModel.findOne({
      productoId: new Types.ObjectId(productoId),
      userId: new Types.ObjectId(userId),
    }).exec();

    return !existingReview;
  }

  async findAllPending(page: number = 1, limit: number = 20): Promise<PaginatedReviews> {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find({ status: ReviewStatus.PENDING, activo: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.reviewModel.countDocuments({ status: ReviewStatus.PENDING, activo: true }),
    ]);

    return {
      reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
