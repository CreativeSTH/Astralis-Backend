/**
 * Seed data para departamentos y ciudades de Colombia
 * Códigos basados en el sistema DANE (Departamento Administrativo Nacional de Estadística)
 */

export interface DepartamentoSeed {
  nombre: string;
  codigo: string;
  ciudades: CiudadSeed[];
}

export interface CiudadSeed {
  nombre: string;
  codigo: string;
}

export const DEPARTAMENTOS_COLOMBIA: DepartamentoSeed[] = [
  {
    nombre: 'Antioquia',
    codigo: '05',
    ciudades: [
      { nombre: 'Medellín', codigo: '05001' },
      { nombre: 'Bello', codigo: '05088' },
      { nombre: 'Itagüí', codigo: '05360' },
      { nombre: 'Envigado', codigo: '05266' },
      { nombre: 'Sabaneta', codigo: '05631' },
      { nombre: 'La Estrella', codigo: '05380' },
      { nombre: 'Caldas', codigo: '05129' },
      { nombre: 'Copacabana', codigo: '05212' },
      { nombre: 'Girardota', codigo: '05308' },
      { nombre: 'Barbosa', codigo: '05079' },
      { nombre: 'Rionegro', codigo: '05615' },
      { nombre: 'Marinilla', codigo: '05440' },
      { nombre: 'El Carmen de Viboral', codigo: '05148' },
      { nombre: 'La Ceja', codigo: '05376' },
      { nombre: 'El Retiro', codigo: '05607' },
      { nombre: 'Guatapé', codigo: '05321' },
      { nombre: 'El Peñol', codigo: '05541' },
      { nombre: 'Apartadó', codigo: '05045' },
      { nombre: 'Turbo', codigo: '05837' },
      { nombre: 'Caucasia', codigo: '05154' },
    ],
  },
  {
    nombre: 'Atlántico',
    codigo: '08',
    ciudades: [
      { nombre: 'Barranquilla', codigo: '08001' },
      { nombre: 'Soledad', codigo: '08758' },
      { nombre: 'Malambo', codigo: '08433' },
      { nombre: 'Sabanalarga', codigo: '08638' },
      { nombre: 'Puerto Colombia', codigo: '08573' },
      { nombre: 'Galapa', codigo: '08296' },
    ],
  },
  {
    nombre: 'Bogotá D.C.',
    codigo: '11',
    ciudades: [{ nombre: 'Bogotá', codigo: '11001' }],
  },
  {
    nombre: 'Bolívar',
    codigo: '13',
    ciudades: [
      { nombre: 'Cartagena', codigo: '13001' },
      { nombre: 'Magangué', codigo: '13430' },
      { nombre: 'Turbaco', codigo: '13836' },
      { nombre: 'Arjona', codigo: '13052' },
      { nombre: 'Carmen de Bolívar', codigo: '13244' },
    ],
  },
  {
    nombre: 'Boyacá',
    codigo: '15',
    ciudades: [
      { nombre: 'Tunja', codigo: '15001' },
      { nombre: 'Duitama', codigo: '15238' },
      { nombre: 'Sogamoso', codigo: '15759' },
      { nombre: 'Chiquinquirá', codigo: '15176' },
      { nombre: 'Paipa', codigo: '15516' },
      { nombre: 'Villa de Leyva', codigo: '15407' },
    ],
  },
  {
    nombre: 'Caldas',
    codigo: '17',
    ciudades: [
      { nombre: 'Manizales', codigo: '17001' },
      { nombre: 'Villamaría', codigo: '17873' },
      { nombre: 'Chinchiná', codigo: '17174' },
      { nombre: 'La Dorada', codigo: '17380' },
    ],
  },
  {
    nombre: 'Caquetá',
    codigo: '18',
    ciudades: [
      { nombre: 'Florencia', codigo: '18001' },
      { nombre: 'San Vicente del Caguán', codigo: '18753' },
    ],
  },
  {
    nombre: 'Cauca',
    codigo: '19',
    ciudades: [
      { nombre: 'Popayán', codigo: '19001' },
      { nombre: 'Santander de Quilichao', codigo: '19698' },
      { nombre: 'Puerto Tejada', codigo: '19573' },
    ],
  },
  {
    nombre: 'Cesar',
    codigo: '20',
    ciudades: [
      { nombre: 'Valledupar', codigo: '20001' },
      { nombre: 'Aguachica', codigo: '20011' },
      { nombre: 'Bosconia', codigo: '20060' },
    ],
  },
  {
    nombre: 'Córdoba',
    codigo: '23',
    ciudades: [
      { nombre: 'Montería', codigo: '23001' },
      { nombre: 'Lorica', codigo: '23417' },
      { nombre: 'Cereté', codigo: '23162' },
      { nombre: 'Sahagún', codigo: '23660' },
    ],
  },
  {
    nombre: 'Cundinamarca',
    codigo: '25',
    ciudades: [
      { nombre: 'Soacha', codigo: '25754' },
      { nombre: 'Facatativá', codigo: '25269' },
      { nombre: 'Zipaquirá', codigo: '25899' },
      { nombre: 'Chía', codigo: '25175' },
      { nombre: 'Fusagasugá', codigo: '25290' },
      { nombre: 'Madrid', codigo: '25430' },
      { nombre: 'Mosquera', codigo: '25473' },
      { nombre: 'Funza', codigo: '25286' },
      { nombre: 'Cajicá', codigo: '25126' },
      { nombre: 'Girardot', codigo: '25307' },
      { nombre: 'Cota', codigo: '25214' },
      { nombre: 'La Calera', codigo: '25377' },
      { nombre: 'Sopó', codigo: '25758' },
      { nombre: 'Tabio', codigo: '25785' },
      { nombre: 'Tenjo', codigo: '25799' },
    ],
  },
  {
    nombre: 'Huila',
    codigo: '41',
    ciudades: [
      { nombre: 'Neiva', codigo: '41001' },
      { nombre: 'Pitalito', codigo: '41551' },
      { nombre: 'Garzón', codigo: '41298' },
    ],
  },
  {
    nombre: 'La Guajira',
    codigo: '44',
    ciudades: [
      { nombre: 'Riohacha', codigo: '44001' },
      { nombre: 'Maicao', codigo: '44430' },
      { nombre: 'Uribia', codigo: '44847' },
    ],
  },
  {
    nombre: 'Magdalena',
    codigo: '47',
    ciudades: [
      { nombre: 'Santa Marta', codigo: '47001' },
      { nombre: 'Ciénaga', codigo: '47189' },
      { nombre: 'Fundación', codigo: '47288' },
    ],
  },
  {
    nombre: 'Meta',
    codigo: '50',
    ciudades: [
      { nombre: 'Villavicencio', codigo: '50001' },
      { nombre: 'Acacías', codigo: '50006' },
      { nombre: 'Granada', codigo: '50313' },
    ],
  },
  {
    nombre: 'Nariño',
    codigo: '52',
    ciudades: [
      { nombre: 'Pasto', codigo: '52001' },
      { nombre: 'Tumaco', codigo: '52835' },
      { nombre: 'Ipiales', codigo: '52356' },
    ],
  },
  {
    nombre: 'Norte de Santander',
    codigo: '54',
    ciudades: [
      { nombre: 'Cúcuta', codigo: '54001' },
      { nombre: 'Ocaña', codigo: '54498' },
      { nombre: 'Pamplona', codigo: '54518' },
      { nombre: 'Villa del Rosario', codigo: '54874' },
      { nombre: 'Los Patios', codigo: '54405' },
    ],
  },
  {
    nombre: 'Quindío',
    codigo: '63',
    ciudades: [
      { nombre: 'Armenia', codigo: '63001' },
      { nombre: 'Calarcá', codigo: '63130' },
      { nombre: 'Montenegro', codigo: '63470' },
      { nombre: 'La Tebaida', codigo: '63401' },
      { nombre: 'Circasia', codigo: '63190' },
      { nombre: 'Quimbaya', codigo: '63594' },
    ],
  },
  {
    nombre: 'Risaralda',
    codigo: '66',
    ciudades: [
      { nombre: 'Pereira', codigo: '66001' },
      { nombre: 'Dosquebradas', codigo: '66170' },
      { nombre: 'Santa Rosa de Cabal', codigo: '66682' },
      { nombre: 'La Virginia', codigo: '66400' },
    ],
  },
  {
    nombre: 'Santander',
    codigo: '68',
    ciudades: [
      { nombre: 'Bucaramanga', codigo: '68001' },
      { nombre: 'Floridablanca', codigo: '68276' },
      { nombre: 'Girón', codigo: '68307' },
      { nombre: 'Piedecuesta', codigo: '68547' },
      { nombre: 'Barrancabermeja', codigo: '68081' },
      { nombre: 'San Gil', codigo: '68679' },
    ],
  },
  {
    nombre: 'Sucre',
    codigo: '70',
    ciudades: [
      { nombre: 'Sincelejo', codigo: '70001' },
      { nombre: 'Corozal', codigo: '70215' },
      { nombre: 'San Marcos', codigo: '70708' },
    ],
  },
  {
    nombre: 'Tolima',
    codigo: '73',
    ciudades: [
      { nombre: 'Ibagué', codigo: '73001' },
      { nombre: 'Espinal', codigo: '73268' },
      { nombre: 'Melgar', codigo: '73449' },
      { nombre: 'Honda', codigo: '73349' },
    ],
  },
  {
    nombre: 'Valle del Cauca',
    codigo: '76',
    ciudades: [
      { nombre: 'Cali', codigo: '76001' },
      { nombre: 'Buenaventura', codigo: '76109' },
      { nombre: 'Palmira', codigo: '76520' },
      { nombre: 'Tuluá', codigo: '76834' },
      { nombre: 'Buga', codigo: '76111' },
      { nombre: 'Cartago', codigo: '76147' },
      { nombre: 'Jamundí', codigo: '76364' },
      { nombre: 'Yumbo', codigo: '76892' },
      { nombre: 'Candelaria', codigo: '76130' },
    ],
  },
  {
    nombre: 'Arauca',
    codigo: '81',
    ciudades: [
      { nombre: 'Arauca', codigo: '81001' },
      { nombre: 'Saravena', codigo: '81736' },
    ],
  },
  {
    nombre: 'Casanare',
    codigo: '85',
    ciudades: [
      { nombre: 'Yopal', codigo: '85001' },
      { nombre: 'Aguazul', codigo: '85010' },
      { nombre: 'Villanueva', codigo: '85440' },
    ],
  },
  {
    nombre: 'Putumayo',
    codigo: '86',
    ciudades: [
      { nombre: 'Mocoa', codigo: '86001' },
      { nombre: 'Puerto Asís', codigo: '86568' },
    ],
  },
  {
    nombre: 'San Andrés y Providencia',
    codigo: '88',
    ciudades: [
      { nombre: 'San Andrés', codigo: '88001' },
      { nombre: 'Providencia', codigo: '88564' },
    ],
  },
  {
    nombre: 'Amazonas',
    codigo: '91',
    ciudades: [{ nombre: 'Leticia', codigo: '91001' }],
  },
  {
    nombre: 'Guainía',
    codigo: '94',
    ciudades: [{ nombre: 'Inírida', codigo: '94001' }],
  },
  {
    nombre: 'Guaviare',
    codigo: '95',
    ciudades: [{ nombre: 'San José del Guaviare', codigo: '95001' }],
  },
  {
    nombre: 'Vaupés',
    codigo: '97',
    ciudades: [{ nombre: 'Mitú', codigo: '97001' }],
  },
  {
    nombre: 'Vichada',
    codigo: '99',
    ciudades: [{ nombre: 'Puerto Carreño', codigo: '99001' }],
  },
  {
    nombre: 'Chocó',
    codigo: '27',
    ciudades: [
      { nombre: 'Quibdó', codigo: '27001' },
      { nombre: 'Istmina', codigo: '27361' },
    ],
  },
];

/**
 * Zonas de envío predefinidas para Colombia
 */
export interface ZonaEnvioSeed {
  nombre: string;
  codigo: string;
  descripcion: string;
  coberturaNacional: boolean;
  departamentosCodigos?: string[];
  ciudadesCodigos?: string[];
}

export const ZONAS_ENVIO_COLOMBIA: ZonaEnvioSeed[] = [
  {
    nombre: 'Área Metropolitana Medellín',
    codigo: 'ZONA_METRO_MDE',
    descripcion: 'Medellín y municipios del Valle de Aburrá',
    coberturaNacional: false,
    ciudadesCodigos: [
      '05001', // Medellín
      '05088', // Bello
      '05360', // Itagüí
      '05266', // Envigado
      '05631', // Sabaneta
      '05380', // La Estrella
      '05129', // Caldas
      '05212', // Copacabana
      '05308', // Girardota
      '05079', // Barbosa
    ],
  },
  {
    nombre: 'Área Metropolitana Bogotá',
    codigo: 'ZONA_METRO_BOG',
    descripcion: 'Bogotá y municipios aledaños',
    coberturaNacional: false,
    ciudadesCodigos: [
      '11001', // Bogotá
      '25754', // Soacha
      '25175', // Chía
      '25473', // Mosquera
      '25286', // Funza
      '25430', // Madrid
      '25126', // Cajicá
      '25214', // Cota
      '25377', // La Calera
    ],
  },
  {
    nombre: 'Área Metropolitana Cali',
    codigo: 'ZONA_METRO_CAL',
    descripcion: 'Cali y municipios aledaños',
    coberturaNacional: false,
    ciudadesCodigos: [
      '76001', // Cali
      '76364', // Jamundí
      '76892', // Yumbo
      '76130', // Candelaria
      '76520', // Palmira
    ],
  },
  {
    nombre: 'Área Metropolitana Barranquilla',
    codigo: 'ZONA_METRO_BAQ',
    descripcion: 'Barranquilla y municipios aledaños',
    coberturaNacional: false,
    ciudadesCodigos: [
      '08001', // Barranquilla
      '08758', // Soledad
      '08433', // Malambo
      '08573', // Puerto Colombia
      '08296', // Galapa
    ],
  },
  {
    nombre: 'Área Metropolitana Bucaramanga',
    codigo: 'ZONA_METRO_BGA',
    descripcion: 'Bucaramanga y municipios aledaños',
    coberturaNacional: false,
    ciudadesCodigos: [
      '68001', // Bucaramanga
      '68276', // Floridablanca
      '68307', // Girón
      '68547', // Piedecuesta
    ],
  },
  {
    nombre: 'Eje Cafetero',
    codigo: 'ZONA_EJE_CAFETERO',
    descripcion: 'Ciudades principales del Eje Cafetero',
    coberturaNacional: false,
    ciudadesCodigos: [
      '66001', // Pereira
      '66170', // Dosquebradas
      '63001', // Armenia
      '17001', // Manizales
    ],
  },
  {
    nombre: 'Costa Caribe',
    codigo: 'ZONA_COSTA_CARIBE',
    descripcion: 'Principales ciudades de la Costa Caribe',
    coberturaNacional: false,
    departamentosCodigos: ['08', '13', '20', '23', '44', '47', '70'],
  },
  {
    nombre: 'Nacional',
    codigo: 'ZONA_NACIONAL',
    descripcion: 'Cobertura en todo el territorio nacional',
    coberturaNacional: true,
  },
];

/**
 * Transportadoras predefinidas
 */
export interface TransportadoraSeed {
  nombre: string;
  codigo: string;
  descripcion: string;
  tiempoEstimado: { minDias: number; maxDias: number };
  urlTracking?: string;
}

export const TRANSPORTADORAS_COLOMBIA: TransportadoraSeed[] = [
  {
    nombre: 'Servientrega',
    codigo: 'SERVIENTREGA',
    descripcion: 'Servicio de mensajería y paquetería',
    tiempoEstimado: { minDias: 1, maxDias: 5 },
    urlTracking: 'https://www.servientrega.com/wps/portal/rastreo-envio',
  },
  {
    nombre: 'Coordinadora',
    codigo: 'COORDINADORA',
    descripcion: 'Coordinadora Mercantil',
    tiempoEstimado: { minDias: 2, maxDias: 5 },
    urlTracking: 'https://www.coordinadora.com/portafolio-de-servicios/rastrear-guia/',
  },
  {
    nombre: 'Inter Rapidísimo',
    codigo: 'INTER_RAPIDISIMO',
    descripcion: 'Servicio de envíos rápidos',
    tiempoEstimado: { minDias: 1, maxDias: 4 },
    urlTracking: 'https://www.interrapidisimo.com/rastreo/',
  },
  {
    nombre: 'Envía',
    codigo: 'ENVIA',
    descripcion: 'Envía Colvanes',
    tiempoEstimado: { minDias: 2, maxDias: 6 },
    urlTracking: 'https://www.envia.co/rastreo',
  },
  {
    nombre: 'TCC',
    codigo: 'TCC',
    descripcion: 'Transportadora Comercial Colombia',
    tiempoEstimado: { minDias: 2, maxDias: 5 },
    urlTracking: 'https://www.tcc.com.co/rastreo',
  },
  {
    nombre: 'Deprisa',
    codigo: 'DEPRISA',
    descripcion: 'Servicio express de Avianca',
    tiempoEstimado: { minDias: 1, maxDias: 3 },
    urlTracking: 'https://www.deprisa.com/rastreo',
  },
];