import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { Model } from 'mongoose';

import { Usuario, UsuarioDocument } from './schemas/usuario.schema';
import { OtpCode, OtpCodeDocument, TipoOtp } from './schemas/otp-code.schema';
import { EmailService } from '../email/email.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

export interface AuthResponse {
  token: string;
  usuario: {
    id: string;
    email: string;
    nombre: string;
    telefono: string;
    rol: string;
  };
}

export interface OtpResponse {
  mensaje: string;
  tipo: TipoOtp;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Usuario.name)
    private usuarioModel: Model<UsuarioDocument>,
    @InjectModel(OtpCode.name)
    private otpCodeModel: Model<OtpCodeDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async requestOtp(requestOtpDto: RequestOtpDto): Promise<OtpResponse> {
    const { email } = requestOtpDto;
    const emailNormalizado = email.toLowerCase().trim();

    // Verificar rate limiting (máximo 1 OTP por minuto)
    const otpReciente = await this.otpCodeModel
      .findOne({
        email: emailNormalizado,
        usado: false,
        createdAt: { $gte: new Date(Date.now() - 60 * 1000) },
      })
      .exec();

    if (otpReciente) {
      throw new BadRequestException(
        'Debes esperar 1 minuto antes de solicitar otro código',
      );
    }

    // Verificar si el usuario existe
    let usuario = await this.usuarioModel
      .findOne({ email: emailNormalizado })
      .exec();
    let tipo: TipoOtp;

    if (usuario) {
      if (!usuario.activo) {
        throw new BadRequestException('Esta cuenta ha sido desactivada');
      }
      tipo = TipoOtp.LOGIN;
    } else {
      // Crear usuario pendiente de verificación
      usuario = new this.usuarioModel({
        email: emailNormalizado,
        verificado: false,
      });
      await usuario.save();
      tipo = TipoOtp.REGISTRO;
    }

    // Generar código de 6 dígitos
    const codigo = this.generarCodigo();

    // Calcular expiración
    const minutosExpiracion =
      this.configService.get<number>('OTP_EXPIRATION_MINUTES') || 5;
    const expiraEn = new Date(Date.now() + minutosExpiracion * 60 * 1000);

    // Invalidar OTPs anteriores
    await this.otpCodeModel.updateMany(
      { email: emailNormalizado, usado: false },
      { usado: true },
    );

    // Crear nuevo OTP
    const nuevoOtp = new this.otpCodeModel({
      email: emailNormalizado,
      codigo,
      tipo,
      expiraEn,
    });
    await nuevoOtp.save();

    // Enviar email
    await this.emailService.sendOtpEmail(emailNormalizado, codigo);

    return {
      mensaje: 'Código enviado a tu correo electrónico',
      tipo,
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<AuthResponse> {
    const { email, codigo } = verifyOtpDto;
    const emailNormalizado = email.toLowerCase().trim();

    // Buscar OTP válido
    const otp = await this.otpCodeModel
      .findOne({
        email: emailNormalizado,
        usado: false,
      })
      .sort({ createdAt: -1 })
      .exec();

    if (!otp) {
      throw new BadRequestException('No hay código pendiente para este email');
    }

    // Verificar expiración
    if (new Date() > otp.expiraEn) {
      await this.otpCodeModel.findByIdAndUpdate(otp._id, { usado: true });
      throw new BadRequestException('El código ha expirado');
    }

    // Verificar intentos
    if (otp.intentos >= 3) {
      await this.otpCodeModel.findByIdAndUpdate(otp._id, { usado: true });
      throw new BadRequestException(
        'Has excedido el número máximo de intentos',
      );
    }

    // Verificar código
    if (otp.codigo !== codigo) {
      await this.otpCodeModel.findByIdAndUpdate(otp._id, {
        $inc: { intentos: 1 },
      });
      const intentosRestantes = 3 - (otp.intentos + 1);
      throw new BadRequestException(
        `Código incorrecto. Te quedan ${intentosRestantes} intento(s)`,
      );
    }

    // Marcar OTP como usado
    await this.otpCodeModel.findByIdAndUpdate(otp._id, { usado: true });

    // Obtener y actualizar usuario
    const usuario = await this.usuarioModel
      .findOneAndUpdate(
        { email: emailNormalizado },
        { verificado: true, ultimoAcceso: new Date() },
        { new: true },
      )
      .exec();

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Generar JWT
    const payload = {
      sub: usuario._id.toString(),
      email: usuario.email,
      rol: usuario.rol,
    };

    const token = this.jwtService.sign(payload);

    return {
      token,
      usuario: {
        id: usuario._id.toString(),
        email: usuario.email,
        nombre: usuario.nombre || '',
        telefono: usuario.telefono || '',
        rol: usuario.rol,
      },
    };
  }

  async getProfile(usuarioId: string): Promise<UsuarioDocument> {
    const usuario = await this.usuarioModel.findById(usuarioId).exec();

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return usuario;
  }

  async updateProfile(
    usuarioId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UsuarioDocument> {
    const usuario = await this.usuarioModel
      .findByIdAndUpdate(usuarioId, updateProfileDto, { new: true })
      .exec();

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return usuario;
  }

  async validateUser(usuarioId: string): Promise<UsuarioDocument | null> {
    return this.usuarioModel
      .findOne({ _id: usuarioId, activo: true })
      .exec();
  }

  private generarCodigo(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
