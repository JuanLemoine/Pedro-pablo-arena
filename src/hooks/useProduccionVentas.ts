import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { calcularM3PorMovimiento } from '@/lib/volquetas';
import { format, startOfWeek, startOfMonth, parseISO, subDays, subWeeks, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

export type TipoAgrupacion = 'diario' | 'semanal' | 'mensual';
export type TipoSilice = 'todos' | 'Silice A - Peña' | 'Silice B - Pozo';

interface DataPoint {
  fecha: string;
  fechaLabel: string;
  producido: number;
  vendido: number;
}

interface ResumenPorTipo {
  tipo: string;
  producido: number;
  vendido: number;
}

interface UseProduccionVentasParams {
  agrupacion: TipoAgrupacion;
  tipoSilice: TipoSilice;
  fechaInicio?: Date;
  fechaFin?: Date;
}

interface ProduccionVentasData {
  datos: DataPoint[];
  resumenPorTipo: ResumenPorTipo[];
  totalProducido: number;
  totalVendido: number;
}

export const useProduccionVentas = ({ agrupacion, tipoSilice, fechaInicio, fechaFin }: UseProduccionVentasParams) => {
  return useQuery({
    queryKey: ['produccion-ventas', agrupacion, tipoSilice, fechaInicio?.toISOString(), fechaFin?.toISOString()],
    queryFn: async (): Promise<ProduccionVentasData> => {
      // Determinar rango de fechas
      const now = new Date();
      let inicio: Date;
      let fin: Date = fechaFin || now;

      if (fechaInicio) {
        inicio = fechaInicio;
      } else {
        switch (agrupacion) {
          case 'diario':
            inicio = subDays(now, 14);
            break;
          case 'semanal':
            inicio = subWeeks(now, 8);
            break;
          case 'mensual':
            inicio = subMonths(now, 6);
            break;
          default:
            inicio = subDays(now, 30);
        }
      }

      const inicioStr = format(inicio, 'yyyy-MM-dd');
      const finStr = format(fin, 'yyyy-MM-dd');

      // Obtener movimientos (producción) con filtro de tipo
      // Nota: No filtramos por silice directamente porque el silice resultante puede cambiar
      // (Silice B desde Zaranda se convierte en Silice A)
      const { data: allMovimientos, error: errorMov } = await supabase
        .from('movimientos')
        .select('fecha, placa, silice, origen, destino')
        .gte('fecha', inicioStr)
        .lte('fecha', finStr)
        .order('fecha', { ascending: true });

      if (errorMov) {
        console.error('Error fetching movimientos:', errorMov);
      }

      // Filtrar movimientos según el tipo de sílice RESULTANTE (no el registrado)
      const movimientos = tipoSilice === 'todos' 
        ? allMovimientos 
        : allMovimientos?.filter(mov => {
            const resultado = calcularM3PorMovimiento(mov.placa, mov.silice, mov.origen, mov.destino);
            return resultado.siliceResultante === tipoSilice;
          });

      // Obtener ventas con filtro de tipo
      let ventasQuery = supabase
        .from('ventas')
        .select('fecha, cantidad_m3, silice')
        .gte('fecha', inicioStr)
        .lte('fecha', finStr)
        .order('fecha', { ascending: true });

      if (tipoSilice !== 'todos') {
        ventasQuery = ventasQuery.eq('silice', tipoSilice);
      }

      const { data: ventas, error: errorVentas } = await ventasQuery;

      if (errorVentas) {
        console.error('Error fetching ventas:', errorVentas);
      }

      // Obtener TODOS los movimientos y ventas para el resumen por tipo (sin filtro de tipo)
      const { data: todosMovimientos } = await supabase
        .from('movimientos')
        .select('placa, silice, origen, destino')
        .gte('fecha', inicioStr)
        .lte('fecha', finStr);

      const { data: todasVentas } = await supabase
        .from('ventas')
        .select('cantidad_m3, silice')
        .gte('fecha', inicioStr)
        .lte('fecha', finStr);

      // Calcular resumen por tipo
      // Nota: El tipo de sílice RESULTANTE puede ser diferente al registrado
      // (Silice B desde Zaranda se convierte en Silice A)
      const resumenMap = new Map<string, { producido: number; vendido: number }>();
      resumenMap.set('Silice A - Peña', { producido: 0, vendido: 0 });
      resumenMap.set('Silice B - Pozo', { producido: 0, vendido: 0 });

      todosMovimientos?.forEach(mov => {
        const resultado = calcularM3PorMovimiento(mov.placa, mov.silice, mov.origen, mov.destino);
        // Usar el sílice RESULTANTE, no el registrado
        const tipoResultante = resultado.siliceResultante;
        if (resumenMap.has(tipoResultante)) {
          const existing = resumenMap.get(tipoResultante)!;
          existing.producido += resultado.m3Producidos;
          resumenMap.set(tipoResultante, existing);
        }
      });

      // Por cada venta se suma 1 m³ adicional (yapa que se regala al comprador)
      todasVentas?.forEach(venta => {
        const tipo = venta.silice;
        if (resumenMap.has(tipo)) {
          const existing = resumenMap.get(tipo)!;
          existing.vendido += Number(venta.cantidad_m3) + 1;
          resumenMap.set(tipo, existing);
        }
      });

      const resumenPorTipo: ResumenPorTipo[] = Array.from(resumenMap.entries()).map(([tipo, data]) => ({
        tipo,
        producido: Math.round(data.producido * 100) / 100,
        vendido: Math.round(data.vendido * 100) / 100
      }));

      // Agrupar datos para la gráfica
      const agrupados = new Map<string, { producido: number; vendido: number }>();

      const getGroupKey = (fechaStr: string): { key: string; label: string } => {
        const fecha = parseISO(fechaStr);
        switch (agrupacion) {
          case 'diario':
            return {
              key: fechaStr,
              label: format(fecha, 'dd MMM', { locale: es })
            };
          case 'semanal':
            const inicioSemana = startOfWeek(fecha, { weekStartsOn: 1 });
            return {
              key: format(inicioSemana, 'yyyy-MM-dd'),
              label: `Sem ${format(inicioSemana, 'dd MMM', { locale: es })}`
            };
          case 'mensual':
            const inicioMes = startOfMonth(fecha);
            return {
              key: format(inicioMes, 'yyyy-MM'),
              label: format(fecha, 'MMM yyyy', { locale: es })
            };
          default:
            return { key: fechaStr, label: fechaStr };
        }
      };

      // Procesar movimientos (producción)
      // El cálculo depende de la combinación sílice/origen/destino
      movimientos?.forEach(mov => {
        const { key } = getGroupKey(mov.fecha);
        const resultado = calcularM3PorMovimiento(mov.placa, mov.silice, mov.origen, mov.destino);
        const existing = agrupados.get(key) || { producido: 0, vendido: 0 };
        existing.producido += resultado.m3Producidos;
        agrupados.set(key, existing);
      });

      // Procesar ventas - Por cada venta se suma 1 m³ adicional (yapa que se regala al comprador)
      ventas?.forEach(venta => {
        const { key } = getGroupKey(venta.fecha);
        const existing = agrupados.get(key) || { producido: 0, vendido: 0 };
        existing.vendido += Number(venta.cantidad_m3) + 1;
        agrupados.set(key, existing);
      });

      // Convertir a array y ordenar
      const datos: DataPoint[] = [];
      const sortedKeys = Array.from(agrupados.keys()).sort();

      sortedKeys.forEach(key => {
        const data = agrupados.get(key)!;
        const { label } = getGroupKey(key);
        datos.push({
          fecha: key,
          fechaLabel: label,
          producido: Math.round(data.producido * 100) / 100,
          vendido: Math.round(data.vendido * 100) / 100
        });
      });

      // Calcular totales filtrados
      const totalProducido = datos.reduce((sum, d) => sum + d.producido, 0);
      const totalVendido = datos.reduce((sum, d) => sum + d.vendido, 0);

      return {
        datos,
        resumenPorTipo,
        totalProducido,
        totalVendido
      };
    },
    refetchInterval: 30000,
  });
};
