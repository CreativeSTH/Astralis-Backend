import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import * as nodemailer from 'nodemailer';

export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }>;
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  shippingAddress: {
    fullName: string;
    address: string;
    ciudadNombre: string;
    departamentoNombre: string;
  };
  trackingNumber?: string;
  trackingUrl?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private from: string;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
    this.from = this.configService.get<string>('EMAIL_FROM') || 'noreply@astralis.com';
  }

  /**
   * Enviar email de código OTP
   */
  async sendOtpEmail(email: string, codigo: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"Astralis" <${this.from}>`,
        to: email,
        subject: 'Tu código de acceso - Astralis',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; text-align: center;">Astralis</h1>
            <div style="background-color: #f9f9f9; border-radius: 10px; padding: 30px; text-align: center;">
              <h2 style="color: #666; margin-bottom: 10px;">Tu código de acceso</h2>
              <div style="font-size: 36px; font-weight: bold; color: #333; letter-spacing: 8px; margin: 20px 0;">
                ${codigo}
              </div>
              <p style="color: #888; font-size: 14px;">
                Este código expira en 5 minutos
              </p>
            </div>
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
              Si no solicitaste este código, puedes ignorar este correo.
            </p>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error(`Error enviando OTP a ${email}:`, error);
      throw error;
    }
  }

  /**
   * Enviar confirmación de orden creada
   */
  async sendOrderConfirmation(data: OrderEmailData): Promise<void> {
    try {
      const itemsHtml = data.items
        .map(
          (item) => `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.nombre}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.cantidad}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.precioUnitario.toLocaleString()}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.subtotal.toLocaleString()}</td>
          </tr>
        `,
        )
        .join('');

      await this.transporter.sendMail({
        from: `"Astralis" <${this.from}>`,
        to: data.customerEmail,
        subject: `Orden ${data.orderNumber} - Confirmación de pedido`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; text-align: center;">Astralis</h1>
            <div style="background-color: #f9f9f9; border-radius: 10px; padding: 30px;">
              <h2 style="color: #333; margin-bottom: 20px;">¡Gracias por tu pedido, ${data.customerName}!</h2>
              <p style="color: #666;">Tu orden <strong>${data.orderNumber}</strong> ha sido recibida y está siendo procesada.</p>

              <h3 style="color: #333; margin-top: 30px;">Resumen del pedido</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #333; color: white;">
                    <th style="padding: 10px; text-align: left;">Producto</th>
                    <th style="padding: 10px; text-align: center;">Cant.</th>
                    <th style="padding: 10px; text-align: right;">Precio</th>
                    <th style="padding: 10px; text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <div style="margin-top: 20px; text-align: right;">
                <p style="margin: 5px 0;">Subtotal: <strong>$${data.subtotal.toLocaleString()}</strong></p>
                ${data.discount > 0 ? `<p style="margin: 5px 0; color: #27ae60;">Descuento: <strong>-$${data.discount.toLocaleString()}</strong></p>` : ''}
                <p style="margin: 5px 0;">Envío: <strong>${data.shippingCost === 0 ? 'Gratis' : '$' + data.shippingCost.toLocaleString()}</strong></p>
                <p style="margin: 10px 0; font-size: 18px; border-top: 2px solid #333; padding-top: 10px;">
                  Total: <strong>$${data.total.toLocaleString()}</strong>
                </p>
              </div>

              <h3 style="color: #333; margin-top: 30px;">Dirección de envío</h3>
              <p style="color: #666; margin: 5px 0;">${data.shippingAddress.fullName}</p>
              <p style="color: #666; margin: 5px 0;">${data.shippingAddress.address}</p>
              <p style="color: #666; margin: 5px 0;">${data.shippingAddress.ciudadNombre}, ${data.shippingAddress.departamentoNombre}</p>
            </div>

            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
              ¿Tienes preguntas? Contáctanos respondiendo a este correo.
            </p>
          </div>
        `,
      });
      this.logger.log(`Email de confirmación de orden enviado a ${data.customerEmail}`);
    } catch (error) {
      this.logger.error(`Error enviando confirmación de orden a ${data.customerEmail}:`, error);
    }
  }

  /**
   * Enviar confirmación de pago
   */
  async sendPaymentConfirmation(data: OrderEmailData): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"Astralis" <${this.from}>`,
        to: data.customerEmail,
        subject: `Pago confirmado - Orden ${data.orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; text-align: center;">Astralis</h1>
            <div style="background-color: #f9f9f9; border-radius: 10px; padding: 30px; text-align: center;">
              <div style="font-size: 60px; margin-bottom: 20px;">✓</div>
              <h2 style="color: #27ae60; margin-bottom: 20px;">¡Pago confirmado!</h2>
              <p style="color: #666;">
                Hola ${data.customerName}, tu pago de <strong>$${data.total.toLocaleString()}</strong>
                para la orden <strong>${data.orderNumber}</strong> ha sido procesado exitosamente.
              </p>
              <p style="color: #666; margin-top: 20px;">
                Estamos preparando tu pedido y te notificaremos cuando sea enviado.
              </p>
            </div>

            <div style="margin-top: 30px; padding: 20px; background-color: #fff; border: 1px solid #eee; border-radius: 10px;">
              <h3 style="color: #333; margin-bottom: 15px;">Detalles del pedido</h3>
              <p style="margin: 5px 0;"><strong>Número de orden:</strong> ${data.orderNumber}</p>
              <p style="margin: 5px 0;"><strong>Total pagado:</strong> $${data.total.toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>Envío a:</strong> ${data.shippingAddress.ciudadNombre}, ${data.shippingAddress.departamentoNombre}</p>
            </div>

            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
              Gracias por comprar en Astralis.
            </p>
          </div>
        `,
      });
      this.logger.log(`Email de confirmación de pago enviado a ${data.customerEmail}`);
    } catch (error) {
      this.logger.error(`Error enviando confirmación de pago a ${data.customerEmail}:`, error);
    }
  }

  /**
   * Enviar notificación de envío
   */
  async sendShippingNotification(data: OrderEmailData): Promise<void> {
    try {
      const trackingSection = data.trackingUrl
        ? `<a href="${data.trackingUrl}" style="display: inline-block; background-color: #333; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px;">Rastrear mi pedido</a>`
        : data.trackingNumber
          ? `<p style="margin-top: 15px;"><strong>Número de guía:</strong> ${data.trackingNumber}</p>`
          : '';

      await this.transporter.sendMail({
        from: `"Astralis" <${this.from}>`,
        to: data.customerEmail,
        subject: `¡Tu pedido está en camino! - Orden ${data.orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; text-align: center;">Astralis</h1>
            <div style="background-color: #f9f9f9; border-radius: 10px; padding: 30px; text-align: center;">
              <div style="font-size: 60px; margin-bottom: 20px;">📦</div>
              <h2 style="color: #333; margin-bottom: 20px;">¡Tu pedido está en camino!</h2>
              <p style="color: #666;">
                Hola ${data.customerName}, tu orden <strong>${data.orderNumber}</strong> ha sido despachada.
              </p>
              ${trackingSection}
            </div>

            <div style="margin-top: 30px; padding: 20px; background-color: #fff; border: 1px solid #eee; border-radius: 10px;">
              <h3 style="color: #333; margin-bottom: 15px;">Dirección de entrega</h3>
              <p style="margin: 5px 0;">${data.shippingAddress.fullName}</p>
              <p style="margin: 5px 0;">${data.shippingAddress.address}</p>
              <p style="margin: 5px 0;">${data.shippingAddress.ciudadNombre}, ${data.shippingAddress.departamentoNombre}</p>
            </div>

            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
              Si tienes alguna pregunta sobre tu envío, contáctanos.
            </p>
          </div>
        `,
      });
      this.logger.log(`Email de notificación de envío enviado a ${data.customerEmail}`);
    } catch (error) {
      this.logger.error(`Error enviando notificación de envío a ${data.customerEmail}:`, error);
    }
  }

  /**
   * Enviar confirmación de entrega
   */
  async sendDeliveryConfirmation(data: OrderEmailData): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"Astralis" <${this.from}>`,
        to: data.customerEmail,
        subject: `Pedido entregado - Orden ${data.orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; text-align: center;">Astralis</h1>
            <div style="background-color: #f9f9f9; border-radius: 10px; padding: 30px; text-align: center;">
              <div style="font-size: 60px; margin-bottom: 20px;">🎉</div>
              <h2 style="color: #27ae60; margin-bottom: 20px;">¡Pedido entregado!</h2>
              <p style="color: #666;">
                Hola ${data.customerName}, tu orden <strong>${data.orderNumber}</strong> ha sido entregada.
              </p>
              <p style="color: #666; margin-top: 20px;">
                ¡Esperamos que disfrutes tu compra!
              </p>
            </div>

            <div style="margin-top: 30px; text-align: center;">
              <p style="color: #666;">
                ¿Te gustó tu experiencia de compra? Nos encantaría conocer tu opinión.
              </p>
            </div>

            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
              Gracias por comprar en Astralis. ¡Vuelve pronto!
            </p>
          </div>
        `,
      });
      this.logger.log(`Email de confirmación de entrega enviado a ${data.customerEmail}`);
    } catch (error) {
      this.logger.error(`Error enviando confirmación de entrega a ${data.customerEmail}:`, error);
    }
  }
}
