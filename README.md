# Astralis Backend

Sistema de gestión de ventas de perfumes a crédito.

## Requisitos

- Node.js 18+
- npm o yarn
- Cuenta en MongoDB Atlas

## Instalación
```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de MongoDB
```

## Ejecución
```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod
```

## API Endpoints

La API está disponible en `http://localhost:3000/api`

### Módulos:
- `/api/productos` - Gestión de productos
- `/api/clientes` - Gestión de clientes
- `/api/ventas` - Gestión de ventas a crédito
- `/api/cobros` - Gestión de cobros
- `/api/dashboard` - Dashboard y estadísticas

## Características

- ✅ CRUD completo de productos
- ✅ CRUD completo de clientes con sistema de score
- ✅ Ventas a crédito con cuotas quincenales
- ✅ Gestión de cobros y pagos
- ✅ Dashboard con estadísticas
- ✅ Cálculo automático de fechas de pago
- ✅ Detección de pagos tardíos
- ✅ Sistema de alertas para cobros vencidos

## Tecnologías

- NestJS
- MongoDB con Mongoose
- TypeScript
- Class Validator

## Estructura de carpetas :
```
Astralis-backend/
├── src/
│   ├── clientes/
│   │   ├── dto/
│   │   │   ├── create-cliente.dto.ts
│   │   │   └── update-cliente.dto.ts
│   │   ├── schemas/
│   │   │   └── cliente.schema.ts
│   │   ├── clientes.controller.ts
│   │   ├── clientes.module.ts
│   │   └── clientes.service.ts
│   ├── cobros/
│   │   ├── dto/
│   │   │   └── registrar-pago.dto.ts
│   │   ├── schemas/
│   │   │   └── cobro.schema.ts
│   │   ├── cobros.controller.ts
│   │   ├── cobros.module.ts
│   │   └── cobros.service.ts
│   ├── dashboard/
│   │   ├── dashboard.controller.ts
│   │   ├── dashboard.module.ts
│   │   └── dashboard.service.ts
│   ├── productos/
│   │   ├── dto/
│   │   │   ├── create-producto.dto.ts
│   │   │   └── update-producto.dto.ts
│   │   ├── schemas/
│   │   │   └── producto.schema.ts
│   │   ├── productos.controller.ts
│   │   ├── productos.module.ts
│   │   └── productos.service.ts
│   ├── ventas/
│   │   ├── dto/
│   │   │   └── create-venta.dto.ts
│   │   ├── schemas/
│   │   │   └── venta.schema.ts
│   │   ├── ventas.controller.ts
│   │   ├── ventas.module.ts
│   │   └── ventas.service.ts
│   ├── app.module.ts
│   └── main.ts
├── .env
├── .gitignore
├── package.json
└── tsconfig.json