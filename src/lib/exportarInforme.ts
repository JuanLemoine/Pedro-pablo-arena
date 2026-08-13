import * as XLSX from 'xlsx';
import { calcularVariacion } from '@/lib/formato';
import type { InformeGerencial } from '@/hooks/useInformeGerencial';
import type { MetricasPeriodo } from '@/lib/informe';

const r1 = (n: number) => Math.round(n * 10) / 10;
const r0 = (n: number) => Math.round(n);

const ETIQUETA_SEVERIDAD: Record<string, string> = {
  critico: 'Crítico',
  atencion: 'Atención',
  bien: 'En orden',
};

interface FilaMetrica {
  clave: string;
  valor: (m: MetricasPeriodo) => number;
  unidad: string;
}

const METRICAS: FilaMetrica[] = [
  { clave: 'Ingreso total', valor: m => m.ingresoTotal, unidad: '$' },
  { clave: 'Ingreso por ventas', valor: m => m.ingresoVentas, unidad: '$' },
  { clave: 'Ingreso por acopio', valor: m => m.ingresoAcopio, unidad: '$' },
  { clave: 'm³ facturados', valor: m => m.m3Facturados, unidad: 'm³' },
  { clave: 'm³ entregados (con yapa)', valor: m => m.m3Entregados, unidad: 'm³' },
  { clave: 'Despachos', valor: m => m.ventasRegistros, unidad: 'nº' },
  { clave: 'Precio por m³ facturado', valor: m => m.precioPorM3Facturado, unidad: '$' },
  { clave: 'Precio por m³ entregado', valor: m => m.precioPorM3Entregado, unidad: '$' },
  { clave: 'Valor de la yapa entregada', valor: m => m.valorYapa, unidad: '$' },
  { clave: 'Fase 1 — producto generado', valor: m => m.productoFase1, unidad: 'm³' },
  { clave: 'Fase 1 — capacidad', valor: m => m.capacidadProductoF1, unidad: 'm³' },
  { clave: 'Fase 1 — cumplimiento', valor: m => m.cumplimientoF1, unidad: '%' },
  { clave: 'Fase 2 — producto generado', valor: m => m.productoFase2, unidad: 'm³' },
  { clave: 'Fase 2 — capacidad', valor: m => m.capacidadProductoF2, unidad: 'm³' },
  { clave: 'Fase 2 — cumplimiento', valor: m => m.cumplimientoF2, unidad: '%' },
  { clave: 'Producción total — cumplimiento', valor: m => m.cumplimientoTotal, unidad: '%' },
  { clave: 'Sábados operados', valor: m => m.sabadosOperados, unidad: 'nº' },
  { clave: 'Sábados — capacidad', valor: m => m.capacidadProductoSabados, unidad: 'm³' },
  { clave: 'Sábados — producido', valor: m => m.productoSabados, unidad: 'm³' },
  { clave: 'm³ excavados (Fase 1, bruto)', valor: m => m.fase1, unidad: 'm³' },
  { clave: 'Producto directo de zaranda', valor: m => m.productoZaranda, unidad: 'm³' },
  { clave: 'Residuo generado', valor: m => m.residuoGenerado, unidad: 'm³' },
  { clave: 'm³ movidos en Fase 2', valor: m => m.fase2, unidad: 'm³' },
  { clave: 'Intensidad de reproceso (Fase 2 / Fase 1)', valor: m => m.intensidadReproceso, unidad: '%' },
  { clave: 'Producto recuperado en Fase 2', valor: m => m.productoFase2, unidad: 'm³' },
  { clave: 'Aporte de Fase 2 al producto final', valor: m => m.aporteFase2, unidad: '%' },
  { clave: 'Granzón llevado a patio (medido)', valor: m => m.m3AlmacenGranzon, unidad: 'm³' },
  { clave: 'Tierra llevada a patio (medido)', valor: m => m.m3AlmacenTierra, unidad: 'm³' },
  { clave: 'Producto final total', valor: m => m.productoFinalTotal, unidad: 'm³' },
  { clave: 'Cobertura de ventas', valor: m => m.coberturaVentas, unidad: '%' },
  { clave: 'Capacidad óptima del período', valor: m => m.m3Optimo, unidad: 'm³' },
  { clave: 'Uso de la capacidad instalada', valor: m => m.cumplimientoCapacidad, unidad: '%' },
  { clave: 'Rendimiento de la flota asignada', valor: m => m.cumplimientoFlota, unidad: '%' },
  { clave: 'Días hábiles', valor: m => m.diasHabiles, unidad: 'nº' },
  { clave: 'Días operados', valor: m => m.diasOperados, unidad: 'nº' },
  { clave: 'Días hábiles sin operar', valor: m => m.diasSinOperar, unidad: 'nº' },
  { clave: 'm³ no producidos por días sin operar', valor: m => m.m3PerdidosSinOperar, unidad: 'm³' },
  { clave: 'Promedio de m³ por día operado', valor: m => m.m3PromedioDia, unidad: 'm³' },
  { clave: 'Desviación estándar diaria', valor: m => m.desviacion, unidad: 'm³' },
  { clave: 'Coeficiente de variación', valor: m => m.coefVariacion, unidad: '%' },
  { clave: 'Jornadas con exceso de flota', valor: m => m.diasExcesoFlota, unidad: 'nº' },
  { clave: 'Concentración top 3 clientes', valor: m => m.concentracionTop3, unidad: '%' },
];

/**
 * Exporta el Informe de Gestión a un .xlsx de 6 hojas, siguiendo el mismo
 * formato de los reportes de Facturación y Minas del dashboard.
 */
export const exportarInformeExcel = (informe: InformeGerencial) => {
  const { actual, anterior, conclusiones, rangoAnterior } = informe;
  const wb = XLSX.utils.book_new();

  // ── 1. Resumen ejecutivo ────────────────────────────────────────────────
  const filasResumen = METRICAS.map(m => {
    const va = m.valor(actual);
    const vp = anterior ? m.valor(anterior) : 0;
    const variacion = anterior ? calcularVariacion(va, vp) : null;
    return {
      Indicador: m.clave,
      Unidad: m.unidad,
      [`Período actual (${actual.inicio} a ${actual.fin})`]: r1(va),
      [`Período anterior (${rangoAnterior.inicio} a ${rangoAnterior.fin})`]: anterior ? r1(vp) : '—',
      'Variación %': variacion?.pct === null || !variacion ? '—' : r1(variacion.pct),
    };
  });
  const wsResumen = XLSX.utils.json_to_sheet(filasResumen);
  wsResumen['!cols'] = [{ wch: 38 }, { wch: 8 }, { wch: 28 }, { wch: 28 }, { wch: 13 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen ejecutivo');

  // ── 2. Cumplimiento diario ──────────────────────────────────────────────
  const filasDias = actual.serieDiaria.map(d => ({
    Fecha: d.fecha,
    Hábil: d.esHabil ? 'Sí' : 'No',
    Operado: d.operado ? 'Sí' : 'No',
    'm³ excavados': r1(d.fase1Real),
    'm³ posibles con la flota asignada': r1(d.m3FlotaAsignada),
    'm³ posibles con la flota óptima': r1(d.m3Optimo),
    'Cumplimiento %': r1(d.cumplimiento),
    'Volquetas reales': d.volquetasReales,
    'Volquetas óptimas': d.volquetasOptimas,
  }));
  const wsDias = XLSX.utils.json_to_sheet(filasDias);
  wsDias['!cols'] = [
    { wch: 12 }, { wch: 7 }, { wch: 9 }, { wch: 14 },
    { wch: 30 }, { wch: 28 }, { wch: 15 }, { wch: 16 }, { wch: 17 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDias, 'Cumplimiento diario');

  // ── 3. Fases y residuos ─────────────────────────────────────────────────
  const filasFases = actual.porSilice.map(s => ({
    'Tipo de arena': s.silice,
    'Fase 1 — m³ excavados': r1(s.fase1),
    'Producto directo de zaranda (67%)': r1(s.productoZaranda),
    'Residuo generado (33%)': r1(s.residuoGenerado),
    'Fase 2 — m³ movidos': r1(s.fase2),
    'Fase 2 — producto recuperado': r1(s.productoFase2),
    'Intensidad de reproceso %': r1(s.intensidadReproceso),
    'Fase 1 producto': r1(s.productoFase1),
    'Fase 1 capacidad': r1(s.capacidadProductoF1),
    'Fase 1 cumplimiento %': r1(s.cumplimientoF1),
    'Fase 2 capacidad': r1(s.capacidadProductoF2),
    'Fase 2 cumplimiento %': r1(s.cumplimientoF2),
    'm³ entregados': r1(s.m3Entregados),
    'Ingreso ($)': r0(s.ingreso),
  }));
  filasFases.push({
    'Tipo de arena': 'TOTAL',
    'Fase 1 — m³ excavados': r1(actual.fase1),
    'Producto directo de zaranda (67%)': r1(actual.productoZaranda),
    'Residuo generado (33%)': r1(actual.residuoGenerado),
    'Fase 2 — m³ movidos': r1(actual.fase2),
    'Fase 2 — producto recuperado': r1(actual.productoFase2),
    'Intensidad de reproceso %': r1(actual.intensidadReproceso),
    'Fase 1 producto': r1(actual.productoFase1),
    'Fase 1 capacidad': r1(actual.capacidadProductoF1),
    'Fase 1 cumplimiento %': r1(actual.cumplimientoF1),
    'Fase 2 capacidad': r1(actual.capacidadProductoF2),
    'Fase 2 cumplimiento %': r1(actual.cumplimientoF2),
    'm³ entregados': r1(actual.m3Entregados),
    'Ingreso ($)': r0(actual.ingresoVentas),
  });
  const wsFases = XLSX.utils.json_to_sheet(filasFases);
  wsFases['!cols'] = [
    { wch: 22 }, { wch: 22 }, { wch: 30 }, { wch: 22 },
    { wch: 20 }, { wch: 28 }, { wch: 24 }, { wch: 15 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsFases, 'Fases y residuos');

  // ── 4. Rendimiento por volqueta ─────────────────────────────────────────
  const filasFlota = actual.porPlaca.map(p => ({
    Placa: p.placa,
    'Capacidad (m³)': p.capacidad,
    'Días activos': p.diasActivos,
    Viajes: p.viajes,
    'm³ excavados': r1(p.m3Fase1),
    'm³ por día activo': r1(p.m3PorDia),
  }));
  const wsFlota = XLSX.utils.json_to_sheet(filasFlota);
  wsFlota['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 13 }, { wch: 9 }, { wch: 14 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsFlota, 'Rendimiento por volqueta');

  // ── 5. Comercial por cliente ────────────────────────────────────────────
  const clavesActuales = new Set(actual.clientes.map(c => c.clave));
  const filasClientes: Record<string, string | number>[] = actual.clientes.map(c => ({
    Cliente: c.nombre,
    NIT: c.nit || '—',
    Estado: anterior?.clientes.some(a => a.clave === c.clave) ? 'Recurrente' : 'Nuevo',
    Despachos: c.compras,
    'm³ facturados': r1(c.m3Facturados),
    'm³ entregados': r1(c.m3Entregados),
    'Ingreso ($)': r0(c.ingreso),
    'Tipos de arena': c.silices.join(' / '),
  }));

  (anterior?.clientes ?? [])
    .filter(c => c.ingreso > 0 && !clavesActuales.has(c.clave))
    .sort((a, b) => b.ingreso - a.ingreso)
    .forEach(c => {
      filasClientes.push({
        Cliente: c.nombre,
        NIT: c.nit || '—',
        Estado: 'No compró en este período',
        Despachos: 0,
        'm³ facturados': 0,
        'm³ entregados': 0,
        'Ingreso ($)': 0,
        'Tipos de arena': c.silices.join(' / '),
      });
    });

  const wsClientes = XLSX.utils.json_to_sheet(filasClientes);
  wsClientes['!cols'] = [
    { wch: 34 }, { wch: 14 }, { wch: 26 }, { wch: 11 },
    { wch: 15 }, { wch: 15 }, { wch: 16 }, { wch: 26 },
  ];
  XLSX.utils.book_append_sheet(wb, wsClientes, 'Comercial por cliente');

  // ── 6. Conclusiones ─────────────────────────────────────────────────────
  const filasConclusiones = conclusiones.map(c => ({
    Severidad: ETIQUETA_SEVERIDAD[c.severidad] ?? c.severidad,
    Hallazgo: c.titulo,
    Detalle: c.detalle,
    'Acción sugerida': c.accion,
  }));
  const wsConclusiones = XLSX.utils.json_to_sheet(filasConclusiones);
  wsConclusiones['!cols'] = [{ wch: 12 }, { wch: 56 }, { wch: 80 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsConclusiones, 'Conclusiones');

  XLSX.writeFile(wb, `informe_gestion_${actual.inicio}_${actual.fin}.xlsx`);
};
