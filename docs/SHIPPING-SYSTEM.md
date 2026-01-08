# Sistema de Envíos Dinámico - Astralis Backend

Sistema completo de cálculo de envíos con soporte para zonas geográficas, múltiples transportadoras, condiciones de envío gratis y reglas configurables.

## Arquitectura

```
src/
├── geography/                    # Módulo de Geografía
│   ├── schemas/
│   │   ├── departamento.schema.ts
│   │   ├── ciudad.schema.ts
│   │   └── zona-envio.schema.ts
│   ├── dto/
│   ├── data/
│   │   └── colombia-seed.data.ts # Seed con 33 dptos, 150+ ciudades
│   ├── geography.service.ts
│   ├── geography-seeder.service.ts
│   └── geography.controller.ts
│
└── shipping/                     # Módulo de Envíos
    ├── schemas/
    │   ├── transportadora.schema.ts
    │   └── metodo-envio.schema.ts
    ├── dto/
    │   ├── calcular-envio.dto.ts
    │   ├── create-metodo-envio.dto.ts
    │   └── create-transportadora.dto.ts
    ├── shipping.service.ts
    ├── shipping-calculator.service.ts  # Lógica de cálculo
    └── shipping.controller.ts
```

## Endpoints de Geografía

Base URL: `/api/geography`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/departamentos` | Listar 33 departamentos de Colombia |
| GET | `/departamentos/:id` | Detalle de departamento |
| GET | `/departamentos/:id/ciudades` | Ciudades de un departamento |
| POST | `/departamentos` | Crear departamento |
| PATCH | `/departamentos/:id` | Actualizar departamento |
| DELETE | `/departamentos/:id` | Eliminar departamento (soft delete) |
| GET | `/ciudades` | Listar todas las ciudades |
| GET | `/ciudades/:id` | Detalle de ciudad |
| POST | `/ciudades` | Crear ciudad |
| PATCH | `/ciudades/:id` | Actualizar ciudad |
| DELETE | `/ciudades/:id` | Eliminar ciudad (soft delete) |
| GET | `/zonas-envio` | Listar zonas de envío |
| GET | `/zonas-envio/:id` | Detalle de zona |
| GET | `/zonas-envio/codigo/:codigo` | Buscar zona por código |
| GET | `/zonas-envio/ciudad/:ciudadId` | Zonas que cubren una ciudad |
| POST | `/zonas-envio` | Crear zona de envío |
| PATCH | `/zonas-envio/:id` | Actualizar zona |
| DELETE | `/zonas-envio/:id` | Eliminar zona (soft delete) |
| GET | `/verificar-cobertura/:ciudadId` | Verificar si hay cobertura |
| POST | `/seed` | Poblar datos de Colombia |
| POST | `/seed?reset=true` | Reiniciar y poblar datos |

## Endpoints de Envíos

Base URL: `/api/shipping`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/transportadoras` | Listar transportadoras |
| GET | `/transportadoras/:id` | Detalle de transportadora |
| POST | `/transportadoras` | Crear transportadora |
| PATCH | `/transportadoras/:id` | Actualizar transportadora |
| DELETE | `/transportadoras/:id` | Eliminar transportadora |
| GET | `/metodos` | Listar métodos de envío |
| GET | `/metodos/:id` | Detalle de método |
| GET | `/metodos/vigentes` | Métodos vigentes actualmente |
| GET | `/metodos/ciudad/:ciudadId` | Métodos disponibles para ciudad |
| POST | `/metodos` | Crear método de envío |
| PATCH | `/metodos/:id` | Actualizar método |
| DELETE | `/metodos/:id` | Eliminar método |
| **POST** | **`/calcular`** | **Calcular costo de envío** |
| GET | `/verificar-disponibilidad/:ciudadId` | Verificar disponibilidad |

## Flujo de Cálculo de Envío

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│  POST /calcular  │────▶│  Calculator     │
│  (ciudadId +    │     │                  │     │  Service        │
│   productos)    │     └──────────────────┘     └────────┬────────┘
└─────────────────┘                                       │
                                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. Validar ciudad existe                                        │
│ 2. Calcular datos carrito (subtotal, cantidad, peso)            │
│ 3. Obtener métodos de envío disponibles para la ciudad          │
│ 4. Filtrar por vigencia temporal (fechas, días semana)          │
│ 5. Para cada método:                                            │
│    - Verificar restricciones (peso máx, productos excluidos)    │
│    - Calcular costo base según tipo (FIJO, POR_PESO, etc.)      │
│    - Verificar condiciones de envío gratis                      │
│    - Agregar costo de seguro si aplica                          │
│ 6. Ordenar por disponibilidad y costo                           │
│ 7. Seleccionar método recomendado (gratis > más barato)         │
└─────────────────────────────────────────────────────────────────┘
```

## Tipos de Costo

```typescript
enum TipoCosto {
  FIJO = 'FIJO',           // Precio fijo sin importar peso/cantidad
  POR_PESO = 'POR_PESO',   // costoBase + (peso × costoPorKg)
  POR_VOLUMEN = 'POR_VOLUMEN', // costoBase + (volumen × costoPorM3)
  ESCALONADO = 'ESCALONADO',   // Por rangos de peso
}
```

### Ejemplo Costo Escalonado
```json
{
  "tipoCosto": "ESCALONADO",
  "configuracionCosto": {
    "escalonado": [
      { "hastaKg": 1, "costo": 8000 },
      { "hastaKg": 3, "costo": 12000 },
      { "hastaKg": 5, "costo": 18000 }
    ],
    "costoKgAdicional": 3000
  }
}
```

## Condiciones de Envío Gratis

```typescript
interface CondicionesEnvio {
  montoMinimoGratis?: number;    // Ej: 200000 = gratis si compra > $200k
  cantidadMinimaGratis?: number; // Ej: 3 = gratis si compra 3+ productos
  pesoMaximo?: number;           // Restricción de peso máximo
  valorMaximo?: number;          // Restricción de valor máximo
}
```

## Zonas de Envío

Las zonas permiten agrupar ciudades para aplicar métodos de envío específicos:

| Zona | Código | Descripción |
|------|--------|-------------|
| Área Metro Medellín | `ZONA_METRO_MDE` | Medellín, Bello, Itagüí, Envigado, Sabaneta, etc. |
| Área Metro Bogotá | `ZONA_METRO_BOG` | Bogotá, Soacha, Chía, Madrid, Mosquera, etc. |
| Área Metro Cali | `ZONA_METRO_CAL` | Cali, Palmira, Jamundí, Yumbo |
| Área Metro Barranquilla | `ZONA_METRO_BAQ` | Barranquilla, Soledad, Malambo |
| Área Metro Bucaramanga | `ZONA_METRO_BGA` | Bucaramanga, Floridablanca, Girón, Piedecuesta |
| Eje Cafetero | `ZONA_EJE_CAFETERO` | Manizales, Armenia, Pereira, Dosquebradas |
| Costa Caribe | `ZONA_COSTA_CARIBE` | Departamentos costeros |
| Nacional | `ZONA_NACIONAL` | Todo el territorio (coberturaNacional: true) |

## Ejemplos de Uso

### 1. Calcular Envío (Request)

```bash
POST /api/shipping/calcular
Content-Type: application/json

{
  "ciudadId": "695ea76f292bece463c40baa",
  "productos": [
    {
      "productoId": "prod1",
      "cantidad": 2,
      "precioUnitario": 125000,
      "peso": 0.3
    }
  ]
}
```

### 2. Respuesta del Cálculo

```json
{
  "ciudadId": "695ea76f292bece463c40baa",
  "ciudadNombre": "Medellín",
  "departamentoNombre": "Antioquia",
  "subtotalCarrito": 250000,
  "cantidadProductos": 2,
  "pesoTotal": 0.6,
  "metodosDisponibles": [
    {
      "metodoId": "695ea894292bece463c40d21",
      "metodoNombre": "Envio Express Area Metro Medellin",
      "metodoCodigo": "EXPRESS_METRO_MDE",
      "transportadora": {
        "nombre": "Servientrega",
        "tiempoEstimadoMin": 1,
        "tiempoEstimadoMax": 2
      },
      "costoOriginal": 15000,
      "costoFinal": 0,
      "esGratis": true,
      "razonGratis": "Envío gratis por compra superior a $200.000",
      "reglasAplicadas": [
        "Costo fijo: $15.000",
        "Envío gratis por compra superior a $200.000"
      ],
      "restricciones": [],
      "disponible": true
    },
    {
      "metodoId": "695ea8ae292bece463c40d2c",
      "metodoNombre": "Envio Estandar Nacional",
      "metodoCodigo": "ESTANDAR_NAC",
      "transportadora": {
        "nombre": "Coordinadora",
        "tiempoEstimadoMin": 3,
        "tiempoEstimadoMax": 7
      },
      "costoOriginal": 13500,
      "costoFinal": 13500,
      "esGratis": false,
      "razonGratis": null,
      "reglasAplicadas": [
        "Costo por peso: $12.000 + 0.6kg × $2.500/kg"
      ],
      "restricciones": [],
      "disponible": true
    }
  ],
  "metodoRecomendado": {
    "metodoId": "695ea894292bece463c40d21",
    "metodoNombre": "Envio Express Area Metro Medellin",
    "costoFinal": 0,
    "esGratis": true
  }
}
```

### 3. Crear Método de Envío

```bash
POST /api/shipping/metodos
Content-Type: application/json

{
  "nombre": "Envío Express Área Metro Medellín",
  "codigo": "EXPRESS_METRO_MDE",
  "descripcion": "Envío rápido para el Área Metropolitana de Medellín",
  "transportadoraId": "<servientrega_id>",
  "tipoCosto": "FIJO",
  "configuracionCosto": {
    "costoBase": 15000
  },
  "condiciones": {
    "montoMinimoGratis": 200000
  },
  "cobertura": {
    "zonasEnvioIds": ["<zona_metro_mde_id>"]
  },
  "tiempoEstimadoMinDias": 1,
  "tiempoEstimadoMaxDias": 2,
  "prioridad": 1
}
```

### 4. Crear Método Nacional por Peso

```bash
POST /api/shipping/metodos
Content-Type: application/json

{
  "nombre": "Envío Estándar Nacional",
  "codigo": "ESTANDAR_NAC",
  "descripcion": "Envío estándar a todo el país",
  "transportadoraId": "<coordinadora_id>",
  "tipoCosto": "POR_PESO",
  "configuracionCosto": {
    "costoBase": 12000,
    "costoPorKg": 2500
  },
  "condiciones": {
    "montoMinimoGratis": 350000,
    "pesoMaximo": 50
  },
  "cobertura": {
    "nacional": true
  },
  "tiempoEstimadoMinDias": 3,
  "tiempoEstimadoMaxDias": 7,
  "prioridad": 10
}
```

## Flujo del Frontend

```typescript
// 1. Cargar departamentos al iniciar
const departamentos = await fetch('/api/geography/departamentos');

// 2. Cuando usuario selecciona departamento, cargar ciudades
const ciudades = await fetch(`/api/geography/departamentos/${deptoId}/ciudades`);

// 3. Cuando usuario selecciona ciudad, calcular envío
const envio = await fetch('/api/shipping/calcular', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ciudadId: selectedCiudadId,
    productos: cartItems.map(item => ({
      productoId: item.id,
      cantidad: item.quantity,
      precioUnitario: item.price,
      peso: item.weight || 0.2
    }))
  })
});

// 4. Mostrar opciones de envío al usuario
const { metodosDisponibles, metodoRecomendado } = await envio.json();
```

## Pruebas Realizadas

| Escenario | Ciudad | Subtotal | Resultado |
|-----------|--------|----------|-----------|
| Compra bajo umbral | Medellín | $150,000 | $15,000 Metro MDE / $13,500 Nacional |
| Compra > $200k | Medellín | $250,000 | **GRATIS** Metro MDE / $13,500 Nacional |
| Ciudad zona metro | Itagüí | $150,000 | Ambos métodos disponibles |
| Ciudad fuera zona | Bogotá | $150,000 | Solo método Nacional disponible |

## Vigencia Temporal

Los métodos de envío pueden tener vigencia temporal para promociones:

```json
{
  "vigencia": {
    "fechaInicio": "2024-12-01T00:00:00Z",
    "fechaFin": "2024-12-31T23:59:59Z",
    "diasSemana": [1, 2, 3, 4, 5]  // Lunes a Viernes (0=Domingo)
  }
}
```

## Restricciones

```json
{
  "restricciones": {
    "productosExcluidos": ["<producto_id_1>", "<producto_id_2>"],
    "categoriasExcluidas": ["fragancias_premium"],
    "valorRequiereSeguro": 500000,
    "porcentajeSeguro": 2
  }
}
```

## Transportadoras Disponibles

| Transportadora | Código | Tiempo Estimado |
|----------------|--------|-----------------|
| Servientrega | `SERVIENTREGA` | 1-5 días |
| Coordinadora | `COORDINADORA` | 2-5 días |
| Inter Rapidísimo | `INTER_RAPIDISIMO` | 1-4 días |
| Envía | `ENVIA` | 2-6 días |
| TCC | `TCC` | 2-5 días |
| Deprisa | `DEPRISA` | 1-3 días |

## Inicialización de Datos

Para poblar la base de datos con departamentos, ciudades, zonas y transportadoras de Colombia:

```bash
# Primera vez o para agregar datos faltantes
POST /api/geography/seed

# Para reiniciar completamente los datos
POST /api/geography/seed?reset=true
```

## Configuración Recomendada

Para el caso de uso de Astralis (perfumes):

1. **Área Metro Medellín**: $15,000 fijo, gratis > $200,000
2. **Área Metro Bogotá**: $18,000 fijo, gratis > $250,000
3. **Nacional Estándar**: $12,000 + $2,500/kg, gratis > $350,000
4. **Express Nacional**: $25,000 fijo, sin gratis, 1-3 días