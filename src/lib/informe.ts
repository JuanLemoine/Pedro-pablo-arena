/**
 * Cálculo del Informe de Gestión.
 *
 * Todo aquí es una función pura: la UI y el export a Excel consumen los mismos
 * resultados. Las fórmulas siguen las definiciones del reporte de gestión que
 * presenta la empresa (fases, manejo de residuos, capacidad instalada).
 */
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import {
  getCapacidadVolqueta,
  calcularM3PorMovimiento,
  esDestinoAlmacenamiento,
  DESTINO_ALMACEN_GRANZON,
  PF_EXCAVACION_ZARANDA,
  PF_ZARANDA_DESTINO,
  PF_GRANZON,
} from '@/lib/volquetas';
import { jornadaSegundosParaFecha, JORNADA_SAB } from '@/lib/simulador';
import { PRECIO_M3 } from '@/hooks/useDashboardResumen';
import type { OptimoPorDia } from '@/hooks/useOptimoDiario';
import { dividir, porcentaje } from '@/lib/formato';

// ── Fracciones del proceso ────────────────────────────────────────────────────
/**
 * Lo que la zaranda NO convierte en producto directo y queda como residuo.
 * Los modelos de producción se construyeron con 40 %; el seguimiento real lo
 * ubicó en 32 %, y el modelo del aplicativo usa 33 % (1 − 67 %).
 */
export const FRACCION_RESIDUO = 1 - PF_EXCAVACION_ZARANDA; // 0,33

/**
 * Intensidad de reproceso = m³ movidos en Fase 2 ÷ m³ movidos en Fase 1.
 * Mide cuánto se reprocesa por cada m³ excavado. Es el indicador que separa a
 * Peña (que sí mueve Fase 2) de Pozo (que históricamente no la mueve).
 * No se puede leer como "% del residuo aprovechado": un mismo m³ puede pasar
 * por varias etapas (trituradora, clasificadora, repaso, revolvedora) y cada
 * paso se registra como un movimiento distinto.
 */
export const INTENSIDAD_MINIMA = 20;
export const INTENSIDAD_BUENA = 40;

/** Volquetas por ruta consideradas óptimas: más que esto es desperdicio. */
export const VOLQUETAS_OPTIMAS_POR_RUTA = 2;

/**
 * Sobre qué días se acumula la capacidad con la que se compara lo producido:
 *
 *  · `habiles`  — todos los días hábiles (L-S). Responde "¿produjimos lo que
 *                 la operación podía dar?" y castiga los días sin operar.
 *  · `operados` — solo los días con actividad. Responde "los días que sí
 *                 trabajamos, ¿rendimos?", aislando el problema de asistencia.
 */
export type BaseCapacidad = 'habiles' | 'operados';

/**
 * Conversión de m³ brutos excavados a m³ de PRODUCTO, que es la unidad en la
 * que habla el informe para que producción, capacidad y ventas sean
 * comparables entre sí:
 *
 *   Fase 1 → 67 % sale directo de la zaranda como arena lista.
 *   Fase 2 → del 33 % de residuo se recupera el 70 %, o sea 23,1 % adicional.
 *
 * El granzón (9,9 %) queda por fuera de la capacidad de producto: se vende,
 * pero a un precio muy inferior y por decisión del negocio no cuenta aquí.
 */
export const RENDIMIENTO_PRODUCTO_F1 = PF_EXCAVACION_ZARANDA;              // 0,67
export const RENDIMIENTO_PRODUCTO_F2 = PF_ZARANDA_DESTINO;                 // 0,231

// ── Filas crudas ──────────────────────────────────────────────────────────────
export interface VentaRow {
  fecha: string;
  silice: string;
  placa: string;
  cantidad_m3: number;
  valor_total: number;
  fuente: string | null;
  tipo_transaccion: string | null;
  nombre_cliente: string | null;
  nit_cliente: string | null;
  descuenta_anticipo: boolean | null;
}

export interface AcopioRow {
  fecha: string;
  silice: string;
  fuente: string;
  placa: string;
  cantidad_viajes: number;
}

export interface MovimientoRow {
  fecha: string;
  mina: string | null;
  silice: string;
  placa: string;
  origen: string;
  destino: string;
  cantidad_movimientos: number;
}

// ── Resultados ────────────────────────────────────────────────────────────────
export interface MetricasSilice {
  silice: string;
  fase1: number;
  productoZaranda: number;
  residuoGenerado: number;
  fase2: number;
  productoFase2: number;
  intensidadReproceso: number;
  m3Entregados: number;
  ingreso: number;
  // Producción vs capacidad, en m³ de producto
  productoFase1: number;
  capacidadProductoF1: number;
  capacidadProductoF2: number;
  cumplimientoF1: number;
  cumplimientoF2: number;
}

export interface ClienteInforme {
  clave: string;
  nombre: string;
  nit: string | null;
  compras: number;
  m3Facturados: number;
  m3Entregados: number;
  ingreso: number;
  silices: string[];
}

export interface DiaInforme {
  fecha: string;
  esHabil: boolean;
  operado: boolean;
  fase1Real: number;
  m3FlotaAsignada: number;
  m3Optimo: number;
  cumplimiento: number;
  volquetasReales: number;
  volquetasOptimas: number;
}

export interface RendimientoPlaca {
  placa: string;
  capacidad: number;
  diasActivos: number;
  viajes: number;
  m3Fase1: number;
  m3PorDia: number;
}

export interface PrecioReferencia {
  silice: string;
  referencia: number;
  ventas: number;
  m3: number;
  ventasBajoReferencia: number;
  m3BajoReferencia: number;
  valorNoPercibido: number;
}

export interface MetricasPeriodo {
  inicio: string;
  fin: string;
  diasCalendario: number;
  /** Sobre qué días se acumuló la capacidad de este cálculo. */
  baseCapacidad: BaseCapacidad;

  // Producción
  fase1: number;
  fase2: number;
  productoZaranda: number;
  residuoGenerado: number;
  residuoRecuperable: number;
  granzon: number;
  intensidadReproceso: number;
  productoFase1: number;
  productoFase2: number;
  aporteFase2: number;
  /** m³ realmente llevados al patio de granzón (medido, no estimado). */
  m3AlmacenGranzon: number;
  viajesAlmacenGranzon: number;
  /** m³ realmente llevados al patio de tierra. */
  m3AlmacenTierra: number;
  viajesAlmacenTierra: number;
  productoFinalTotal: number;
  viajesFase1: number;
  viajesFase2: number;

  // Capacidad instalada
  m3FlotaAsignada: number;
  m3Optimo: number;
  cumplimientoFlota: number;
  cumplimientoCapacidad: number;

  /**
   * El bloque que encabeza el informe: lo producido en cada fase frente a lo
   * que se debió producir dada la capacidad, todo en m³ de producto.
   */
  capacidadProductoF1: number;
  capacidadProductoF2: number;
  /** Suma de ambas: el producto total alcanzable si las dos fases rindieran. */
  capacidadProductoTotal: number;
  cumplimientoF1: number;
  cumplimientoF2: number;
  cumplimientoTotal: number;
  /** Producto que se dejó de generar en cada fase frente a su capacidad. */
  brechaF1: number;
  brechaF2: number;

  // Sábados (se analizan aparte: la jornada es de 4 h y no de 7,5 h)
  sabadosHabiles: number;
  sabadosOperados: number;
  capacidadProductoSabados: number;
  productoSabados: number;
  cumplimientoSabados: number;

  // Calendario
  diasHabiles: number;
  diasOperados: number;
  diasSinOperar: number;
  m3PerdidosSinOperar: number;
  productoPerdidoSinOperar: number;
  valorPerdidoSinOperar: number;

  // Comercial
  ventasRegistros: number;
  m3Facturados: number;
  m3Entregados: number;
  ingresoVentas: number;
  viajesAcopio: number;
  m3Acopio: number;
  ingresoAcopio: number;
  ingresoTotal: number;
  precioPorM3Facturado: number;
  precioPorM3Entregado: number;
  m3Yapa: number;
  valorYapa: number;
  coberturaVentas: number;
  preciosReferencia: PrecioReferencia[];
  valorNoPercibido: number;

  // Estabilidad
  m3PromedioDia: number;
  desviacion: number;
  coefVariacion: number;

  // Flota
  diasExcesoFlota: number;
  porPlaca: RendimientoPlaca[];
  /** Placas con algún registro en el período (movimiento o acopio), en mayúsculas. */
  placasConActividad: string[];

  // Clientes
  clientes: ClienteInforme[];
  concentracionTop3: number;
  concentracionTop5: number;

  porSilice: MetricasSilice[];
  serieDiaria: DiaInforme[];
}

// ── Períodos ──────────────────────────────────────────────────────────────────

/**
 * Período inmediatamente anterior, de la misma cantidad de días y contiguo.
 * Ej.: 1–12 ago → 20–31 jul.
 */
export const calcularPeriodoAnterior = (
  inicio: string,
  fin: string
): { inicio: string; fin: string } => {
  const d0 = parseISO(inicio);
  const d1 = parseISO(fin);
  const dias = Math.max(1, differenceInCalendarDays(d1, d0) + 1);
  const finAnterior = addDays(d0, -1);
  const inicioAnterior = addDays(finAnterior, -(dias - 1));
  return {
    inicio: format(inicioAnterior, 'yyyy-MM-dd'),
    fin: format(finAnterior, 'yyyy-MM-dd'),
  };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Llevar material a un patio de residuos no es ni Fase 1 (no entra a zaranda)
 * ni Fase 2 (no se reprocesa): es manejo de residuo y se contabiliza aparte.
 * Si se contara como Fase 2 inflaría la intensidad de reproceso.
 */
const esFase1 = (m: MovimientoRow) =>
  m.origen === 'Punto de excavación' && !esDestinoAlmacenamiento(m.destino);
const esFase2 = (m: MovimientoRow) =>
  m.origen === 'Zaranda' && !esDestinoAlmacenamiento(m.destino);

/** m³ brutos transportados por un movimiento: capacidad de la volqueta × viajes. */
const m3Brutos = (m: MovimientoRow) =>
  getCapacidadVolqueta(m.placa) * (Number(m.cantidad_movimientos) || 0);

const desviacionEstandar = (valores: number[]): number => {
  if (valores.length < 2) return 0;
  const media = valores.reduce((s, v) => s + v, 0) / valores.length;
  const varianza =
    valores.reduce((s, v) => s + (v - media) ** 2, 0) / (valores.length - 1);
  return Math.sqrt(varianza);
};

const mediana = (valores: number[]): number => {
  if (!valores.length) return 0;
  const orden = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(orden.length / 2);
  return orden.length % 2 ? orden[medio] : (orden[medio - 1] + orden[medio]) / 2;
};

/** Los consumos contra anticipo ya se cobraron antes: no son ingreso nuevo. */
const generaIngreso = (v: VentaRow) => !v.descuenta_anticipo;

/** Clave estable de cliente: el nombre si existe, si no la placa. */
export const claveCliente = (v: VentaRow): string =>
  (v.nombre_cliente || '').trim().toUpperCase() || `PLACA:${(v.placa || '').toUpperCase()}`;

// ── Cálculo principal ─────────────────────────────────────────────────────────

export const calcularMetricasPeriodo = (
  inicio: string,
  fin: string,
  ventas: VentaRow[],
  acopios: AcopioRow[],
  movimientos: MovimientoRow[],
  optimoPorDia: Map<string, OptimoPorDia>,
  baseCapacidad: BaseCapacidad = 'habiles'
): MetricasPeriodo => {
  const diasCalendario = Math.max(
    1,
    differenceInCalendarDays(parseISO(fin), parseISO(inicio)) + 1
  );

  // ── Producción por fases ────────────────────────────────────────────────
  let fase1 = 0;
  let fase2 = 0;
  let viajesFase1 = 0;
  let viajesFase2 = 0;
  let productoFinalTotal = 0;
  let productoFase1 = 0;
  let productoFase2 = 0;
  let m3AlmacenGranzon = 0;
  let viajesAlmacenGranzon = 0;
  let m3AlmacenTierra = 0;
  let viajesAlmacenTierra = 0;

  const fase1PorDia = new Map<string, number>();
  const fase1PorSilice = new Map<string, number>();
  const fase2PorSilice = new Map<string, number>();
  const productoFase1PorSilice = new Map<string, number>();
  const productoFase2PorSilice = new Map<string, number>();
  const placasPorDiaSilice = new Map<string, Set<string>>();
  const placaAcum = new Map<string, { viajes: number; m3: number; dias: Set<string> }>();
  const placasConActividad = new Set<string>();

  movimientos.forEach(m => {
    placasConActividad.add(m.placa.toUpperCase());
    const viajes = Number(m.cantidad_movimientos) || 0;
    const bruto = m3Brutos(m);
    const producto =
      calcularM3PorMovimiento(m.placa, m.silice, m.origen, m.destino).m3Producidos * viajes;
    productoFinalTotal += producto;

    if (esDestinoAlmacenamiento(m.destino)) {
      // Manejo de residuo: se mide el volumen movido, no produce arena.
      if (m.destino === DESTINO_ALMACEN_GRANZON) {
        m3AlmacenGranzon += bruto;
        viajesAlmacenGranzon += viajes;
      } else {
        m3AlmacenTierra += bruto;
        viajesAlmacenTierra += viajes;
      }
    } else if (esFase1(m)) {
      fase1 += bruto;
      productoFase1 += producto;
      viajesFase1 += viajes;
      fase1PorDia.set(m.fecha, (fase1PorDia.get(m.fecha) || 0) + bruto);
      fase1PorSilice.set(m.silice, (fase1PorSilice.get(m.silice) || 0) + bruto);
      productoFase1PorSilice.set(m.silice, (productoFase1PorSilice.get(m.silice) || 0) + producto);

      const claveDiaSilice = `${m.fecha}|${m.silice}`;
      if (!placasPorDiaSilice.has(claveDiaSilice)) placasPorDiaSilice.set(claveDiaSilice, new Set());
      placasPorDiaSilice.get(claveDiaSilice)!.add(m.placa.toUpperCase());

      const p = placaAcum.get(m.placa.toUpperCase()) || { viajes: 0, m3: 0, dias: new Set<string>() };
      p.viajes += viajes;
      p.m3 += bruto;
      p.dias.add(m.fecha);
      placaAcum.set(m.placa.toUpperCase(), p);
    } else if (esFase2(m)) {
      fase2 += bruto;
      productoFase2 += producto;
      viajesFase2 += viajes;
      fase2PorSilice.set(m.silice, (fase2PorSilice.get(m.silice) || 0) + bruto);
      productoFase2PorSilice.set(
        m.silice,
        (productoFase2PorSilice.get(m.silice) || 0) + producto
      );
    }
  });

  const productoZaranda = fase1 * PF_EXCAVACION_ZARANDA;
  const residuoGenerado = fase1 * FRACCION_RESIDUO;
  const residuoRecuperable = fase1 * PF_ZARANDA_DESTINO;
  const granzon = fase1 * PF_GRANZON;
  const intensidadReproceso = porcentaje(fase2, fase1);
  const aporteFase2 = porcentaje(productoFase2, productoFinalTotal);

  // ── Calendario y capacidad instalada ────────────────────────────────────
  const serieDiaria: DiaInforme[] = [];
  let m3FlotaAsignada = 0;
  let m3Optimo = 0;
  let diasHabiles = 0;
  let diasOperados = 0;
  // Para estimar lo que se dejó de producir los días sin operar.
  let segundosOperados = 0;
  const diasSinOperarSegundos: number[] = [];
  // Capacidad bruta acumulada por sílice, sobre todos los días hábiles
  const capacidadBrutaPorSilice = new Map<string, number>();
  let sabadosHabiles = 0;
  let sabadosOperados = 0;
  let capacidadBrutaSabados = 0;
  let brutoSabados = 0;

  for (let i = 0; i < diasCalendario; i++) {
    const fecha = format(addDays(parseISO(inicio), i), 'yyyy-MM-dd');
    const jornada = jornadaSegundosParaFecha(fecha);
    const esHabil = jornada > 0;
    const opt = optimoPorDia.get(fecha);
    const fase1Real = fase1PorDia.get(fecha) || 0;
    const operado = fase1Real > 0;

    if (esHabil) diasHabiles++;
    if (esHabil && operado) {
      diasOperados++;
      segundosOperados += jornada;
    }
    if (esHabil && !operado) diasSinOperarSegundos.push(jornada);

    // El óptimo solo tiene sentido en días hábiles. Según la base elegida se
    // cuentan todos los hábiles o solo aquellos en que hubo operación.
    const cuenta = esHabil && (baseCapacidad === 'habiles' || operado);
    const optimoDia = cuenta ? opt?.m3Optimo || 0 : 0;
    const flotaDia = esHabil ? opt?.m3Actual || 0 : 0;

    m3Optimo += optimoDia;
    m3FlotaAsignada += flotaDia;

    if (cuenta && opt?.m3OptimoPorSilice) {
      Object.entries(opt.m3OptimoPorSilice).forEach(([sil, v]) => {
        capacidadBrutaPorSilice.set(sil, (capacidadBrutaPorSilice.get(sil) || 0) + v);
      });
    }

    // Sábado: jornada de 4 h en vez de 7,5 h, se analiza por separado.
    if (esHabil && jornada === JORNADA_SAB) {
      sabadosHabiles++;
      capacidadBrutaSabados += optimoDia;
      if (operado) {
        sabadosOperados++;
        brutoSabados += fase1Real;
      }
    }

    serieDiaria.push({
      fecha,
      esHabil,
      operado,
      fase1Real: Math.round(fase1Real * 100) / 100,
      m3FlotaAsignada: flotaDia,
      m3Optimo: optimoDia,
      cumplimiento: porcentaje(fase1Real, optimoDia),
      volquetasReales: opt?.wActual || 0,
      volquetasOptimas: opt?.woRound || 0,
    });
  }

  /**
   * Un día sin operar no tiene tiempos ni volquetas registradas, así que su
   * producción potencial no se puede calcular directamente. Se estima con el
   * ritmo REAL por segundo de jornada de los días que sí operaron —no con el
   * óptimo teórico, que inflaría la cifra— escalado por la jornada del día (el
   * sábado son 4 h y no 7,5 h). Sin días operados no hay base para estimar.
   */
  const m3RealPorSegundo = dividir(fase1, segundosOperados);
  const m3PerdidosSinOperar = diasSinOperarSegundos.reduce(
    (s, jornada) => s + m3RealPorSegundo * jornada,
    0
  );

  const cumplimientoFlota = porcentaje(fase1, m3FlotaAsignada);
  const cumplimientoCapacidad = porcentaje(fase1, m3Optimo);

  // ── Producción vs capacidad, en m³ de producto ──────────────────────────
  const capacidadProductoF1 = m3Optimo * RENDIMIENTO_PRODUCTO_F1;
  const capacidadProductoF2 = m3Optimo * RENDIMIENTO_PRODUCTO_F2;
  const capacidadProductoTotal = capacidadProductoF1 + capacidadProductoF2;
  const cumplimientoF1 = porcentaje(productoFase1, capacidadProductoF1);
  const cumplimientoF2 = porcentaje(productoFase2, capacidadProductoF2);
  const cumplimientoTotal = porcentaje(productoFinalTotal, capacidadProductoTotal);

  const capacidadProductoSabados = capacidadBrutaSabados * RENDIMIENTO_PRODUCTO_F1;
  const productoSabados = brutoSabados * RENDIMIENTO_PRODUCTO_F1;

  // ── Estabilidad (sobre días efectivamente operados) ─────────────────────
  const m3DiasOperados = serieDiaria.filter(d => d.operado).map(d => d.fase1Real);
  const m3PromedioDia = m3DiasOperados.length
    ? m3DiasOperados.reduce((s, v) => s + v, 0) / m3DiasOperados.length
    : 0;
  const desviacion = desviacionEstandar(m3DiasOperados);
  const coefVariacion = porcentaje(desviacion, m3PromedioDia);

  // ── Flota ───────────────────────────────────────────────────────────────
  let diasExcesoFlota = 0;
  placasPorDiaSilice.forEach(placas => {
    if (placas.size > VOLQUETAS_OPTIMAS_POR_RUTA) diasExcesoFlota++;
  });

  const porPlaca: RendimientoPlaca[] = Array.from(placaAcum.entries())
    .map(([placa, p]) => ({
      placa,
      capacidad: getCapacidadVolqueta(placa),
      diasActivos: p.dias.size,
      viajes: p.viajes,
      m3Fase1: Math.round(p.m3 * 100) / 100,
      m3PorDia: Math.round(dividir(p.m3, p.dias.size) * 100) / 100,
    }))
    .sort((a, b) => b.m3Fase1 - a.m3Fase1);

  // ── Ventas ──────────────────────────────────────────────────────────────
  let m3Facturados = 0;
  let ingresoVentas = 0;
  const ventasFacturables = ventas.filter(v => v.tipo_transaccion !== 'Donación');
  const clienteMap = new Map<string, ClienteInforme>();
  const m3EntregadosPorSilice = new Map<string, number>();
  const ingresoPorSilice = new Map<string, number>();
  const preciosPorSilice = new Map<string, number[]>();

  ventas.forEach(v => {
    const m3 = Number(v.cantidad_m3) || 0;
    const valor = Number(v.valor_total) || 0;
    const aporta = generaIngreso(v);

    m3Facturados += m3;
    if (aporta) ingresoVentas += valor;

    m3EntregadosPorSilice.set(v.silice, (m3EntregadosPorSilice.get(v.silice) || 0) + m3 + 1);
    if (aporta) ingresoPorSilice.set(v.silice, (ingresoPorSilice.get(v.silice) || 0) + valor);

    if (v.tipo_transaccion !== 'Donación' && m3 > 0) {
      if (!preciosPorSilice.has(v.silice)) preciosPorSilice.set(v.silice, []);
      preciosPorSilice.get(v.silice)!.push(valor / m3);
    }

    const clave = claveCliente(v);
    const c = clienteMap.get(clave) || {
      clave,
      nombre: (v.nombre_cliente || '').trim() || v.placa,
      nit: v.nit_cliente,
      compras: 0,
      m3Facturados: 0,
      m3Entregados: 0,
      ingreso: 0,
      silices: [] as string[],
    };
    if (v.nombre_cliente && !c.nombre.startsWith('PLACA')) c.nombre = v.nombre_cliente.trim();
    if (v.nit_cliente && !c.nit) c.nit = v.nit_cliente;
    c.compras += 1;
    c.m3Facturados += m3;
    c.m3Entregados += m3 + 1;
    if (aporta) c.ingreso += valor;
    if (!c.silices.includes(v.silice)) c.silices.push(v.silice);
    clienteMap.set(clave, c);
  });

  const ventasRegistros = ventas.length;
  const m3Entregados = m3Facturados + ventasRegistros;
  const m3Yapa = ventasRegistros; // 1 m³ regalado por venta

  /**
   * Precio de referencia por sílice: la mediana del precio realmente cobrado en
   * el período. Se calcula desde los datos y no desde una constante, porque el
   * precio de venta (≈85.000 Peña / 95.000 Pozo) es distinto del precio neto
   * con el que se valora el acopio en PRECIO_M3.
   */
  const preciosReferencia: PrecioReferencia[] = Array.from(preciosPorSilice.entries())
    .map(([silice, precios]) => {
      const referencia = mediana(precios);
      const bajo = ventasFacturables.filter(v => {
        const m3 = Number(v.cantidad_m3) || 0;
        if (v.silice !== silice || m3 <= 0) return false;
        return Number(v.valor_total) / m3 < referencia * 0.98; // 2% de tolerancia
      });
      const valorNoPercibido = bajo.reduce((s, v) => {
        const m3 = Number(v.cantidad_m3) || 0;
        return s + (referencia - Number(v.valor_total) / m3) * m3;
      }, 0);
      return {
        silice,
        referencia: Math.round(referencia),
        ventas: precios.length,
        m3: Math.round(
          ventasFacturables
            .filter(v => v.silice === silice)
            .reduce((s, v) => s + (Number(v.cantidad_m3) || 0), 0) * 100
        ) / 100,
        ventasBajoReferencia: bajo.length,
        m3BajoReferencia:
          Math.round(bajo.reduce((s, v) => s + (Number(v.cantidad_m3) || 0), 0) * 100) / 100,
        valorNoPercibido: Math.round(valorNoPercibido),
      };
    })
    .sort((a, b) => b.m3 - a.m3);

  const valorNoPercibido = preciosReferencia.reduce((s, p) => s + p.valorNoPercibido, 0);

  // Valor de la yapa: 1 m³ por venta al precio de referencia de su sílice.
  const referenciaPorSilice = new Map(preciosReferencia.map(p => [p.silice, p.referencia]));
  const valorYapa = ventasFacturables.reduce(
    (s, v) => s + (referenciaPorSilice.get(v.silice) || 0),
    0
  );

  // ── Acopio ──────────────────────────────────────────────────────────────
  let viajesAcopio = 0;
  let m3Acopio = 0;
  let ingresoAcopio = 0;
  acopios.forEach(a => {
    placasConActividad.add(a.placa.toUpperCase());
    const viajes = Number(a.cantidad_viajes) || 0;
    const m3 = getCapacidadVolqueta(a.placa) * viajes;
    viajesAcopio += viajes;
    m3Acopio += m3;
    ingresoAcopio += m3 * (PRECIO_M3[a.silice] ?? 0);
  });

  // ── Clientes ────────────────────────────────────────────────────────────
  const clientes = Array.from(clienteMap.values())
    .map(c => ({
      ...c,
      m3Facturados: Math.round(c.m3Facturados * 100) / 100,
      m3Entregados: Math.round(c.m3Entregados * 100) / 100,
      ingreso: Math.round(c.ingreso),
    }))
    .sort((a, b) => b.ingreso - a.ingreso);

  const acumuladoTop = (n: number) =>
    porcentaje(
      clientes.slice(0, n).reduce((s, c) => s + c.ingreso, 0),
      ingresoVentas
    );

  // ── Desglose por sílice ─────────────────────────────────────────────────
  const silices = Array.from(
    new Set([
      ...fase1PorSilice.keys(),
      ...fase2PorSilice.keys(),
      ...m3EntregadosPorSilice.keys(),
    ])
  ).sort();

  const porSilice: MetricasSilice[] = silices.map(silice => {
    const f1 = fase1PorSilice.get(silice) || 0;
    const f2 = fase2PorSilice.get(silice) || 0;
    const residuo = f1 * FRACCION_RESIDUO;
    const capBruta = capacidadBrutaPorSilice.get(silice) || 0;
    const capF1 = capBruta * RENDIMIENTO_PRODUCTO_F1;
    const capF2 = capBruta * RENDIMIENTO_PRODUCTO_F2;
    const prodF1 = productoFase1PorSilice.get(silice) || 0;
    const prodF2 = productoFase2PorSilice.get(silice) || 0;
    return {
      silice,
      fase1: Math.round(f1 * 100) / 100,
      productoZaranda: Math.round(f1 * PF_EXCAVACION_ZARANDA * 100) / 100,
      residuoGenerado: Math.round(residuo * 100) / 100,
      fase2: Math.round(f2 * 100) / 100,
      productoFase2: Math.round((productoFase2PorSilice.get(silice) || 0) * 100) / 100,
      intensidadReproceso: porcentaje(f2, f1),
      m3Entregados: Math.round((m3EntregadosPorSilice.get(silice) || 0) * 100) / 100,
      ingreso: Math.round(ingresoPorSilice.get(silice) || 0),
      productoFase1: Math.round(prodF1 * 100) / 100,
      capacidadProductoF1: Math.round(capF1 * 100) / 100,
      capacidadProductoF2: Math.round(capF2 * 100) / 100,
      cumplimientoF1: porcentaje(prodF1, capF1),
      cumplimientoF2: porcentaje(prodF2, capF2),
    };
  });

  // Valor del material que no se produjo los días sin operar: se convierte a
  // producto (67%) y se valora al precio de referencia promedio del período.
  const productoPerdidoSinOperar = m3PerdidosSinOperar * PF_EXCAVACION_ZARANDA;
  const precioReferenciaPromedio = preciosReferencia.length
    ? preciosReferencia.reduce((s, p) => s + p.referencia * p.m3, 0) /
      Math.max(1, preciosReferencia.reduce((s, p) => s + p.m3, 0))
    : 0;

  return {
    inicio,
    fin,
    diasCalendario,
    baseCapacidad,

    fase1: Math.round(fase1 * 100) / 100,
    fase2: Math.round(fase2 * 100) / 100,
    productoZaranda: Math.round(productoZaranda * 100) / 100,
    residuoGenerado: Math.round(residuoGenerado * 100) / 100,
    residuoRecuperable: Math.round(residuoRecuperable * 100) / 100,
    granzon: Math.round(granzon * 100) / 100,
    intensidadReproceso,
    productoFase1: Math.round(productoFase1 * 100) / 100,
    productoFase2: Math.round(productoFase2 * 100) / 100,
    aporteFase2,
    m3AlmacenGranzon: Math.round(m3AlmacenGranzon * 100) / 100,
    viajesAlmacenGranzon,
    m3AlmacenTierra: Math.round(m3AlmacenTierra * 100) / 100,
    viajesAlmacenTierra,
    productoFinalTotal: Math.round(productoFinalTotal * 100) / 100,
    viajesFase1,
    viajesFase2,

    m3FlotaAsignada: Math.round(m3FlotaAsignada * 100) / 100,
    m3Optimo: Math.round(m3Optimo * 100) / 100,
    cumplimientoFlota,
    cumplimientoCapacidad,

    capacidadProductoF1: Math.round(capacidadProductoF1 * 100) / 100,
    capacidadProductoF2: Math.round(capacidadProductoF2 * 100) / 100,
    capacidadProductoTotal: Math.round(capacidadProductoTotal * 100) / 100,
    cumplimientoF1,
    cumplimientoF2,
    cumplimientoTotal,
    brechaF1: Math.round(Math.max(0, capacidadProductoF1 - productoFase1) * 100) / 100,
    brechaF2: Math.round(Math.max(0, capacidadProductoF2 - productoFase2) * 100) / 100,

    sabadosHabiles,
    sabadosOperados,
    capacidadProductoSabados: Math.round(capacidadProductoSabados * 100) / 100,
    productoSabados: Math.round(productoSabados * 100) / 100,
    cumplimientoSabados: porcentaje(productoSabados, capacidadProductoSabados),

    diasHabiles,
    diasOperados,
    diasSinOperar: diasHabiles - diasOperados,
    m3PerdidosSinOperar: Math.round(m3PerdidosSinOperar * 100) / 100,
    productoPerdidoSinOperar: Math.round(productoPerdidoSinOperar * 100) / 100,
    valorPerdidoSinOperar: Math.round(productoPerdidoSinOperar * precioReferenciaPromedio),

    ventasRegistros,
    m3Facturados: Math.round(m3Facturados * 100) / 100,
    m3Entregados: Math.round(m3Entregados * 100) / 100,
    ingresoVentas: Math.round(ingresoVentas),
    viajesAcopio,
    m3Acopio: Math.round(m3Acopio * 100) / 100,
    ingresoAcopio: Math.round(ingresoAcopio),
    ingresoTotal: Math.round(ingresoVentas + ingresoAcopio),
    precioPorM3Facturado: Math.round(dividir(ingresoVentas, m3Facturados)),
    precioPorM3Entregado: Math.round(dividir(ingresoVentas, m3Entregados)),
    m3Yapa,
    valorYapa: Math.round(valorYapa),
    coberturaVentas: porcentaje(productoFinalTotal, m3Entregados),
    preciosReferencia,
    valorNoPercibido,

    m3PromedioDia: Math.round(m3PromedioDia * 100) / 100,
    desviacion: Math.round(desviacion * 100) / 100,
    coefVariacion,

    diasExcesoFlota,
    porPlaca,
    placasConActividad: Array.from(placasConActividad).sort(),

    clientes,
    concentracionTop3: acumuladoTop(3),
    concentracionTop5: acumuladoTop(5),

    porSilice,
    serieDiaria,
  };
};

// ── Conclusiones ──────────────────────────────────────────────────────────────

export type Severidad = 'critico' | 'atencion' | 'bien';

export interface Conclusion {
  id: string;
  severidad: Severidad;
  titulo: string;
  detalle: string;
  accion: string;
}

const pct = (n: number, dec = 1) =>
  `${n.toLocaleString('es-CO', { maximumFractionDigits: dec })} %`;
const m3 = (n: number) =>
  `${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })} m³`;
const cop = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

const nombreCorto = (silice: string) => silice.replace('Silice ', '').replace(/^[AB] - /, '');

/**
 * Traduce las métricas a hallazgos accionables, ordenados por severidad.
 * Cada regla dispara solo si supera su umbral, de modo que un período sano
 * produce una lista corta.
 */
export const generarConclusiones = (
  actual: MetricasPeriodo,
  anterior: MetricasPeriodo | null
): Conclusion[] => {
  const out: Conclusion[] = [];

  // Ingresos
  if (anterior && anterior.ingresoTotal > 0) {
    const delta = ((actual.ingresoTotal - anterior.ingresoTotal) / anterior.ingresoTotal) * 100;
    if (delta < -15) {
      out.push({
        id: 'ingresos-caida',
        severidad: delta < -30 ? 'critico' : 'atencion',
        titulo: `Los ingresos cayeron ${pct(Math.abs(delta))} frente al período anterior`,
        detalle: `Se pasó de ${cop(anterior.ingresoTotal)} a ${cop(actual.ingresoTotal)}. Los m³ entregados pasaron de ${m3(anterior.m3Entregados)} a ${m3(actual.m3Entregados)}.`,
        accion: 'Revisar si la caída es de demanda o de capacidad de entrega: si hay producto disponible, el problema es comercial.',
      });
    } else if (delta > 15) {
      out.push({
        id: 'ingresos-alza',
        severidad: 'bien',
        titulo: `Los ingresos subieron ${pct(delta)} frente al período anterior`,
        detalle: `Se pasó de ${cop(anterior.ingresoTotal)} a ${cop(actual.ingresoTotal)}.`,
        accion: 'Verificar que la producción pueda sostener el ritmo de entregas.',
      });
    }
  }

  // Días sin operar
  if (actual.diasSinOperar > 0) {
    const costo =
      actual.m3PerdidosSinOperar > 0
        ? `Los ${actual.diasSinOperar} días sin operación equivalen a unos ${m3(actual.m3PerdidosSinOperar)} que no entraron a zaranda (≈ ${m3(actual.productoPerdidoSinOperar)} de producto, ${cop(actual.valorPerdidoSinOperar)}), estimados con el ritmo de los días que sí se trabajaron.`
        : `No hubo ningún día operado en el período, así que no hay base para estimar cuánto se dejó de producir.`;
    out.push({
      id: 'dias-sin-operar',
      severidad: actual.diasSinOperar >= 3 ? 'critico' : 'atencion',
      titulo: `Se operaron ${actual.diasOperados} de ${actual.diasHabiles} días hábiles`,
      detalle: `${costo} La nómina y los equipos se pagan igual esos días.`,
      accion: 'Documentar en la bitácora la causa de cada día sin operación (falla, clima, decisión) para poder atacarla.',
    });
  }

  // Fase 1 contra su capacidad
  if (actual.capacidadProductoF1 > 0 && actual.cumplimientoF1 < 75) {
    out.push({
      id: 'fase1-capacidad',
      severidad: actual.cumplimientoF1 < 55 ? 'critico' : 'atencion',
      titulo: `Fase 1 produjo el ${pct(actual.cumplimientoF1)} de lo que debía`,
      detalle: `Se generaron ${m3(actual.productoFase1)} de arena directa de zaranda frente a los ${m3(actual.capacidadProductoF1)} que la operación podía dar en los días hábiles del período. Se dejaron de producir ${m3(actual.brechaF1)}.`,
      accion: 'Revisar si la brecha viene de días sin operar, de volquetas sin asignar o de bajo rendimiento por volqueta.',
    });
  }

  // Fase 2 contra su capacidad
  if (actual.capacidadProductoF2 > 0 && actual.cumplimientoF2 < 60) {
    out.push({
      id: 'fase2-capacidad',
      severidad: actual.cumplimientoF2 < 35 ? 'critico' : 'atencion',
      titulo: `Fase 2 produjo el ${pct(actual.cumplimientoF2)} de lo que debía`,
      detalle: `El reproceso del residuo aportó ${m3(actual.productoFase2)} de los ${m3(actual.capacidadProductoF2)} recuperables. Son ${m3(actual.brechaF2)} de producto terminado que se quedaron en el piso.`,
      accion: 'Asignar volquetas fijas al reproceso y retomar la automatización de Fase 2.',
    });
  }

  // Sábados
  if (actual.sabadosHabiles > 0 && actual.sabadosOperados < actual.sabadosHabiles) {
    out.push({
      id: 'sabados',
      severidad: actual.sabadosOperados === 0 ? 'critico' : 'atencion',
      titulo: `Se operaron ${actual.sabadosOperados} de ${actual.sabadosHabiles} sábados`,
      detalle: `Los sábados aportan ${m3(actual.capacidadProductoSabados)} de capacidad con su jornada de 4 horas, y se produjeron ${m3(actual.productoSabados)}.`,
      accion: 'Definir si el sábado entra o no en la planeación: hoy se paga la disponibilidad y no se aprovecha.',
    });
  }

  // Rendimiento de la flota asignada
  if (actual.m3FlotaAsignada > 0 && actual.cumplimientoFlota < 80) {
    out.push({
      id: 'flota-rendimiento',
      severidad: actual.cumplimientoFlota < 60 ? 'critico' : 'atencion',
      titulo: `Las volquetas asignadas rindieron el ${pct(actual.cumplimientoFlota)} de su potencial`,
      detalle: `Con las volquetas que efectivamente trabajaron se podían mover ${m3(actual.m3FlotaAsignada)} y se movieron ${m3(actual.fase1)}. El problema no es cuántas volquetas hay, sino cuánto rinde cada una.`,
      accion: 'Revisar tiempos muertos: hora real de arranque, esperas en cargue y paradas no registradas.',
    });
  }

  // Fase 2 — intensidad de reproceso general
  if (actual.fase1 > 0) {
    if (actual.intensidadReproceso < INTENSIDAD_MINIMA) {
      out.push({
        id: 'reproceso-bajo',
        severidad: 'critico',
        titulo: `Por cada m³ excavado solo se reprocesaron ${pct(actual.intensidadReproceso)} en Fase 2`,
        detalle: `Fase 1 movió ${m3(actual.fase1)} y Fase 2 apenas ${m3(actual.fase2)}. El residuo generado (${m3(actual.residuoGenerado)}) se está quedando en el piso en vez de volverse producto.`,
        accion: 'Asignar volquetas fijas al reproceso y retomar la automatización de Fase 2 (banda trituradora–clasificadora).',
      });
    } else if (actual.intensidadReproceso >= INTENSIDAD_BUENA) {
      out.push({
        id: 'reproceso-ok',
        severidad: 'bien',
        titulo: `Fase 2 movió ${pct(actual.intensidadReproceso)} de lo excavado en Fase 1`,
        detalle: `El reproceso aportó ${m3(actual.productoFase2)} de producto, el ${pct(actual.aporteFase2)} del producto final del período.`,
        accion: 'Mantener la asignación de volquetas al reproceso.',
      });
    }
  }

  // Sílices que no están moviendo Fase 2 (el hallazgo histórico de Pozo)
  actual.porSilice
    .filter(s => s.fase1 > 0 && s.intensidadReproceso < INTENSIDAD_MINIMA)
    .forEach(s => {
      const nada = s.fase2 === 0;
      out.push({
        id: `reproceso-silice-${s.silice}`,
        severidad: 'critico',
        titulo: nada
          ? `${nombreCorto(s.silice)} no movió nada en Fase 2`
          : `${nombreCorto(s.silice)} apenas reprocesó el ${pct(s.intensidadReproceso)} de lo que excavó`,
        detalle: `Se excavaron ${m3(s.fase1)} de ${nombreCorto(s.silice)}, que generaron ${m3(s.residuoGenerado)} de residuo, y Fase 2 movió ${m3(s.fase2)}.`,
        accion: nada
          ? 'Confirmar si el reproceso no se hizo o si no se está registrando: cada caso se corrige distinto.'
          : 'Revisar por qué el frente no está reprocesando: es producto terminado que se está dejando de generar.',
      });
    });

  // Comparación entre frentes: uno reprocesa y el otro no
  const conFase1 = actual.porSilice.filter(s => s.fase1 > 0);
  if (conFase1.length >= 2) {
    const orden = [...conFase1].sort((a, b) => b.intensidadReproceso - a.intensidadReproceso);
    const mejor = orden[0];
    const peor = orden[orden.length - 1];
    if (mejor.intensidadReproceso - peor.intensidadReproceso > 30) {
      out.push({
        id: 'reproceso-desbalance',
        severidad: 'atencion',
        titulo: `${nombreCorto(mejor.silice)} reprocesa ${pct(mejor.intensidadReproceso)} y ${nombreCorto(peor.silice)} solo ${pct(peor.intensidadReproceso)}`,
        detalle: 'Los dos frentes generan residuo en la misma proporción, pero solo uno lo está convirtiendo en producto.',
        accion: `Replicar en ${nombreCorto(peor.silice)} la operación de reproceso que ya funciona en ${nombreCorto(mejor.silice)}.`,
      });
    }
  }

  // Cobertura: se entrega más de lo que se produce
  if (actual.m3Entregados > 0 && actual.productoFinalTotal > 0 && actual.coberturaVentas < 100) {
    out.push({
      id: 'cobertura',
      severidad: actual.coberturaVentas < 70 ? 'critico' : 'atencion',
      titulo: `La producción cubrió el ${pct(actual.coberturaVentas)} de lo entregado`,
      detalle: `Se produjeron ${m3(actual.productoFinalTotal)} y se entregaron ${m3(actual.m3Entregados)}. La diferencia sale del inventario acumulado.`,
      accion: 'Si el patrón se repite, el inventario se agota: hay que subir producción o moderar el compromiso comercial.',
    });
  }

  // Estabilidad
  if (actual.diasOperados >= 3 && actual.coefVariacion > 35) {
    const comparacion =
      anterior && anterior.coefVariacion > 0
        ? actual.coefVariacion > anterior.coefVariacion
          ? ` Empeoró frente al período anterior (${pct(anterior.coefVariacion)}).`
          : ` Mejoró frente al período anterior (${pct(anterior.coefVariacion)}).`
        : '';
    out.push({
      id: 'estabilidad',
      severidad: actual.coefVariacion > 55 ? 'critico' : 'atencion',
      titulo: `La producción diaria varía ${pct(actual.coefVariacion)} alrededor del promedio`,
      detalle: `Promedio de ${m3(actual.m3PromedioDia)} por día operado con una desviación de ${m3(actual.desviacion)}.${comparacion} Sin estabilidad no se puede planear con metas.`,
      accion: 'Fijar una meta diaria por ruta y registrar la causa cada vez que un día se aleje del promedio.',
    });
  }

  // Exceso de volquetas por ruta
  if (actual.diasExcesoFlota > 0) {
    out.push({
      id: 'exceso-flota',
      severidad: 'atencion',
      titulo: `${actual.diasExcesoFlota} jornada(s) con más de ${VOLQUETAS_OPTIMAS_POR_RUTA} volquetas en la misma ruta`,
      detalle: `Con más de ${VOLQUETAS_OPTIMAS_POR_RUTA} volquetas por ruta la excavadora se satura y el tiempo extra se va en espera, no en producción.`,
      accion: 'Redistribuir las volquetas sobrantes a la otra ruta o a Fase 2 en vez de acumularlas en un mismo frente.',
    });
  }

  // La yapa
  if (actual.m3Yapa > 0 && actual.valorYapa > 0) {
    const pesoYapa = porcentaje(actual.valorYapa, actual.ingresoVentas);
    out.push({
      id: 'yapa',
      severidad: pesoYapa > 12 ? 'atencion' : 'bien',
      titulo: `La yapa entregada equivale a ${cop(actual.valorYapa)} (${pct(pesoYapa)} de las ventas)`,
      detalle: `Se facturaron ${m3(actual.m3Facturados)} y se entregaron ${m3(actual.m3Entregados)}: ${m3(actual.m3Yapa)} de más, un m³ por cada uno de los ${actual.ventasRegistros} despachos.`,
      accion: 'Decidir si la yapa es política comercial o costumbre. Si es política, incorporarla al precio.',
    });
  }

  // Precio por debajo de la referencia
  if (actual.valorNoPercibido > 0) {
    const peso = porcentaje(actual.valorNoPercibido, actual.ingresoVentas);
    if (peso > 3) {
      out.push({
        id: 'precio',
        severidad: peso > 8 ? 'atencion' : 'bien',
        titulo: `${cop(actual.valorNoPercibido)} vendidos por debajo del precio de referencia`,
        detalle: `Equivale al ${pct(peso)} de las ventas del período. La referencia es la mediana del precio cobrado por cada tipo de arena en estos mismos días.`,
        accion: 'Revisar a qué clientes se les está cobrando por debajo y si corresponde a un acuerdo vigente.',
      });
    }
  }

  // Concentración de clientes
  if (actual.clientes.length >= 3 && actual.concentracionTop3 > 50) {
    out.push({
      id: 'concentracion',
      severidad: actual.concentracionTop3 > 70 ? 'atencion' : 'bien',
      titulo: `Los 3 clientes principales concentran el ${pct(actual.concentracionTop3)} del ingreso`,
      detalle: `${actual.clientes.length} clientes compraron en el período. Los 5 mayores suman el ${pct(actual.concentracionTop5)}.`,
      accion: 'Perder uno de esos clientes tendría impacto directo en caja: vale la pena ampliar la base.',
    });
  }

  // Clientes que dejaron de comprar
  if (anterior) {
    const actuales = new Set(actual.clientes.map(c => c.clave));
    const perdidos = anterior.clientes
      .filter(c => c.ingreso > 0 && !actuales.has(c.clave))
      .sort((a, b) => b.ingreso - a.ingreso);
    if (perdidos.length > 0) {
      const top = perdidos.slice(0, 3).map(c => c.nombre).join(', ');
      out.push({
        id: 'clientes-perdidos',
        severidad: perdidos.length >= 5 ? 'atencion' : 'bien',
        titulo: `${perdidos.length} cliente(s) del período anterior no compraron en este`,
        detalle: `Representaban ${cop(perdidos.reduce((s, c) => s + c.ingreso, 0))} el período pasado. Los mayores: ${top}.`,
        accion: 'Contactarlos antes de que la ausencia se vuelva permanente.',
      });
    }
  }

  if (out.length === 0) {
    out.push({
      id: 'sin-alertas',
      severidad: 'bien',
      titulo: 'Sin alertas en el período',
      detalle: 'Ninguno de los indicadores de producción, capacidad, residuos ni comerciales superó su umbral de atención.',
      accion: 'Mantener el registro diario para que la comparación del próximo período sea confiable.',
    });
  }

  const orden: Record<Severidad, number> = { critico: 0, atencion: 1, bien: 2 };
  return out.sort((a, b) => orden[a.severidad] - orden[b.severidad]);
};
