import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  Target, 
  Truck, 
  Zap, 
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  BarChart3,
  Calculator,
  FileSpreadsheet
} from 'lucide-react';
import { useProyeccionProduccion } from '@/hooks/useProyeccionProduccion';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

const ProyeccionProduccion = () => {
  const { data, isLoading, error } = useProyeccionProduccion();

  if (error) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            Error al cargar proyecciones: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRitmoColor = (ritmo: 'bajo' | 'normal' | 'alto' | undefined) => {
    switch (ritmo) {
      case 'bajo':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'alto':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'normal':
      default:
        return 'text-amber-600 bg-amber-100 border-amber-200';
    }
  };

  const getRitmoIcon = (ritmo: 'bajo' | 'normal' | 'alto' | undefined) => {
    switch (ritmo) {
      case 'bajo':
        return <AlertTriangle className="h-4 w-4" />;
      case 'alto':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'normal':
      default:
        return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getRitmoTexto = (ritmo: 'bajo' | 'normal' | 'alto' | undefined) => {
    switch (ritmo) {
      case 'bajo':
        return 'Por debajo del esperado';
      case 'alto':
        return 'Excelente ritmo';
      case 'normal':
      default:
        return 'Ritmo normal';
    }
  };

  // Función para exportar a Excel
  const exportarModeloExcel = () => {
    if (!data) return;

    const fechaExport = format(new Date(), 'yyyy-MM-dd');
    const mesActual = format(new Date(), 'MMMM yyyy');

    // Hoja 1: Resumen Ejecutivo
    const resumenData = [
      { 'Concepto': 'RESUMEN EJECUTIVO - MODELO DE PRODUCCIÓN', 'Valor': '', 'Unidad': '' },
      { 'Concepto': `Mes analizado: ${mesActual}`, 'Valor': '', 'Unidad': '' },
      { 'Concepto': '', 'Valor': '', 'Unidad': '' },
      { 'Concepto': '--- PRODUCCIÓN REAL ---', 'Valor': '', 'Unidad': '' },
      { 'Concepto': 'm³ Producidos (real)', 'Valor': data.m3ProducidosReal, 'Unidad': 'm³' },
      { 'Concepto': 'Viajes realizados', 'Valor': data.viajesReales, 'Unidad': 'viajes' },
      { 'Concepto': 'Días transcurridos', 'Valor': data.diasTranscurridos, 'Unidad': 'días' },
      { 'Concepto': 'Promedio m³/día', 'Valor': data.proyeccion.promedioM3PorDia, 'Unidad': 'm³/día' },
      { 'Concepto': 'Promedio viajes/día', 'Valor': data.proyeccion.promedioViajesPorDia, 'Unidad': 'viajes/día' },
      { 'Concepto': '', 'Valor': '', 'Unidad': '' },
      { 'Concepto': '--- PROYECCIÓN MES (al ritmo actual) ---', 'Valor': '', 'Unidad': '' },
      { 'Concepto': 'm³ proyectados mes', 'Valor': data.proyeccion.m3ProyectadoMes, 'Unidad': 'm³' },
      { 'Concepto': 'Viajes proyectados mes', 'Valor': data.proyeccion.viajesProyectadosMes, 'Unidad': 'viajes' },
      { 'Concepto': 'Ritmo de producción', 'Valor': getRitmoTexto(data.proyeccion.ritmoActual), 'Unidad': '' },
      { 'Concepto': '', 'Valor': '', 'Unidad': '' },
      { 'Concepto': '--- PRODUCCIÓN ÓPTIMA (según modelo) ---', 'Valor': '', 'Unidad': '' },
      { 'Concepto': 'm³ óptimos por turno', 'Valor': data.produccionOptima.m3PorTurno, 'Unidad': 'm³' },
      { 'Concepto': 'm³ óptimos por día', 'Valor': data.produccionOptima.m3PorDia, 'Unidad': 'm³' },
      { 'Concepto': 'm³ óptimos por mes', 'Valor': data.produccionOptima.m3PorMes, 'Unidad': 'm³' },
      { 'Concepto': 'Viajes óptimos por mes', 'Valor': data.produccionOptima.viajesPorMes, 'Unidad': 'viajes' },
      { 'Concepto': 'Eficiencia del modelo', 'Valor': data.produccionOptima.eficiencia, 'Unidad': '%' },
      { 'Concepto': '', 'Valor': '', 'Unidad': '' },
      { 'Concepto': '--- COMPARACIÓN ---', 'Valor': '', 'Unidad': '' },
      { 'Concepto': 'Real vs Óptimo', 'Valor': data.comparacion.realVsOptimo, 'Unidad': '%' },
      { 'Concepto': 'Proyección vs Óptimo', 'Valor': data.comparacion.proyeccionVsOptimo, 'Unidad': '%' },
      { 'Concepto': 'Potencial de mejora', 'Valor': data.comparacion.potencialMejora, 'Unidad': 'm³ adicionales/mes' },
    ];

    // Hoja 2: Métricas de Eficiencia
    const metricasData = [
      { 'Métrica': 'MÉTRICAS DE EFICIENCIA', 'Valor': '', 'Descripción': '' },
      { 'Métrica': '', 'Valor': '', 'Descripción': '' },
      { 'Métrica': 'Eficiencia de producción', 'Valor': `${data.metricas.eficienciaProduccion}%`, 'Descripción': 'Porcentaje de producción real vs esperada' },
      { 'Métrica': 'Eficiencia de viajes', 'Valor': `${data.metricas.eficienciaViajes}%`, 'Descripción': 'Porcentaje de viajes reales vs esperados' },
      { 'Métrica': 'Brecha de m³', 'Valor': data.metricas.brechaM3, 'Descripción': 'm³ faltantes para alcanzar el esperado' },
      { 'Métrica': 'Brecha de viajes', 'Valor': data.metricas.brechaViajes, 'Descripción': 'Viajes faltantes para alcanzar el esperado' },
      { 'Métrica': '', 'Valor': '', 'Descripción': '' },
      { 'Métrica': 'Recomendación', 'Valor': data.metricas.recomendacion, 'Descripción': '' },
    ];

    // Hoja 3: Configuración de Flota e Inventario
    const flotaData = [
      { 'Configuración': 'INVENTARIO DE VOLQUETAS DISPONIBLES', 'Actual': '', 'Óptima': '', 'Disponibles': '' },
      { 'Configuración': '', 'Actual': '', 'Óptima': '', 'Disponibles': '' },
      { 'Configuración': 'Volquetas pequeñas (5.5 m³)', 'Actual': data.configuracionActual.numVolquetasPequenas, 'Óptima': data.configuracionOptima.numVolquetasPequenas, 'Disponibles': data.inventario.totalPequenas },
      { 'Configuración': 'Volquetas grandes (13 m³)', 'Actual': data.configuracionActual.numVolquetasGrandes, 'Óptima': data.configuracionOptima.numVolquetasGrandes, 'Disponibles': data.inventario.totalGrandes },
      { 'Configuración': 'Total volquetas', 'Actual': data.configuracionActual.numVolquetasPequenas + data.configuracionActual.numVolquetasGrandes, 'Óptima': data.configuracionOptima.numVolquetasPequenas + data.configuracionOptima.numVolquetasGrandes, 'Disponibles': data.inventario.total },
      { 'Configuración': '', 'Actual': '', 'Óptima': '', 'Disponibles': '' },
      { 'Configuración': 'NOTA: La configuración óptima se calcula SOLO con las volquetas disponibles en el inventario', 'Actual': '', 'Óptima': '', 'Disponibles': '' },
      { 'Configuración': '', 'Actual': '', 'Óptima': '', 'Disponibles': '' },
      { 'Configuración': 'PARÁMETROS DE OPERACIÓN', 'Actual': '', 'Óptima': '', 'Disponibles': '' },
      { 'Configuración': 'Horas operación/día', 'Actual': data.configuracionActual.horasOperacionDia, 'Óptima': data.configuracionOptima.horasOperacionDia, 'Disponibles': '' },
      { 'Configuración': 'Días por mes', 'Actual': data.configuracionActual.diasMes, 'Óptima': data.configuracionOptima.diasMes, 'Disponibles': '' },
      { 'Configuración': 'Turnos por día', 'Actual': data.configuracionActual.turnosPorDia, 'Óptima': data.configuracionOptima.turnosPorDia, 'Disponibles': '' },
      { 'Configuración': '', 'Actual': '', 'Óptima': '', 'Disponibles': '' },
      { 'Configuración': 'RESULTADOS ESPERADOS', 'Actual': '', 'Óptima': '', 'Disponibles': '' },
      { 'Configuración': 'Producción esperada (m³/mes)', 'Actual': data.produccionConfigActual.m3PorMes, 'Óptima': data.produccionOptima.m3PorMes, 'Disponibles': '' },
      { 'Configuración': 'Viajes esperados (mes)', 'Actual': data.produccionConfigActual.viajesPorMes, 'Óptima': data.produccionOptima.viajesPorMes, 'Disponibles': '' },
    ];

    // Hoja 4: Análisis de Brechas
    const brechasData = [
      { 'Análisis': 'ANÁLISIS DE BRECHAS Y OPORTUNIDADES', 'Valor': '' },
      { 'Análisis': '', 'Valor': '' },
      { 'Análisis': 'Inventario total de volquetas', 'Valor': `${data.inventario.total} volquetas (${data.inventario.totalPequenas} pequeñas + ${data.inventario.totalGrandes} grandes)` },
      { 'Análisis': '', 'Valor': '' },
      { 'Análisis': 'Producción actual proyectada', 'Valor': `${data.proyeccion.m3ProyectadoMes} m³/mes` },
      { 'Análisis': 'Producción óptima posible (con inventario actual)', 'Valor': `${data.produccionOptima.m3PorMes} m³/mes` },
      { 'Análisis': 'Brecha de producción', 'Valor': `${data.comparacion.potencialMejora} m³/mes` },
      { 'Análisis': '', 'Valor': '' },
      { 'Análisis': 'Porcentaje de aprovechamiento actual', 'Valor': `${data.comparacion.proyeccionVsOptimo}%` },
      { 'Análisis': 'Porcentaje de mejora posible', 'Valor': `${(100 - data.comparacion.proyeccionVsOptimo).toFixed(1)}%` },
      { 'Análisis': '', 'Valor': '' },
      { 'Análisis': 'RECOMENDACIONES (basadas en el inventario disponible):', 'Valor': '' },
      { 'Análisis': data.metricas.recomendacion, 'Valor': '' },
      { 'Análisis': '', 'Valor': '' },
      { 'Análisis': 'Para alcanzar la producción óptima con tu inventario actual:', 'Valor': '' },
      { 'Análisis': `- Usar ${data.configuracionOptima.numVolquetasGrandes} de las ${data.inventario.totalGrandes} volquetas grandes (13 m³) disponibles`, 'Valor': '' },
      { 'Análisis': `- Usar ${data.configuracionOptima.numVolquetasPequenas} de las ${data.inventario.totalPequenas} volquetas pequeñas (5.5 m³) disponibles`, 'Valor': '' },
      { 'Análisis': `- Operar ${data.configuracionOptima.turnosPorDia} turno(s) de ${data.configuracionOptima.horasOperacionDia} horas`, 'Valor': '' },
    ];

    // Crear workbook
    const wb = XLSX.utils.book_new();
    
    const ws1 = XLSX.utils.json_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen Ejecutivo');
    
    const ws2 = XLSX.utils.json_to_sheet(metricasData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Métricas Eficiencia');
    
    const ws3 = XLSX.utils.json_to_sheet(flotaData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Configuración Flota');
    
    const ws4 = XLSX.utils.json_to_sheet(brechasData);
    XLSX.utils.book_append_sheet(wb, ws4, 'Análisis Brechas');

    // Descargar archivo
    XLSX.writeFile(wb, `modelo_produccion_${fechaExport}.xlsx`);
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Proyección de Producción (Modelo de Optimización)
            </CardTitle>
            <CardDescription>
              Pronóstico de producción mensual basado en el ritmo actual vs producción óptima según el modelo
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportarModeloExcel}
            disabled={!data || isLoading}
            className="gap-2 flex-shrink-0"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Modelo
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Resumen del mes actual */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-1 text-blue-600 text-xs mb-1">
                  <BarChart3 className="h-3 w-3" />
                  m³ Producidos
                </div>
                <p className="text-xl font-bold text-blue-800">
                  {data.m3ProducidosReal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-blue-600">
                  en {data.diasTranscurridos} días
                </p>
              </div>

              <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                <div className="flex items-center gap-1 text-purple-600 text-xs mb-1">
                  <Truck className="h-3 w-3" />
                  Viajes Realizados
                </div>
                <p className="text-xl font-bold text-purple-800">
                  {data.viajesReales}
                </p>
                <p className="text-xs text-purple-600">
                  {data.proyeccion.promedioViajesPorDia} /día prom.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-1 text-amber-600 text-xs mb-1">
                  <TrendingUp className="h-3 w-3" />
                  Proyección Mes
                </div>
                <p className="text-xl font-bold text-amber-800">
                  {data.proyeccion.m3ProyectadoMes.toLocaleString(undefined, { maximumFractionDigits: 0 })} m³
                </p>
                <p className="text-xs text-amber-600">
                  al ritmo actual
                </p>
              </div>

              <div className={cn(
                "p-3 rounded-lg border",
                getRitmoColor(data.proyeccion.ritmoActual)
              )}>
                <div className="flex items-center gap-1 text-xs mb-1">
                  {getRitmoIcon(data.proyeccion.ritmoActual)}
                  Ritmo de Producción
                </div>
                <p className="text-lg font-bold">
                  {data.proyeccion.promedioM3PorDia.toLocaleString(undefined, { maximumFractionDigits: 0 })} m³/día
                </p>
                <p className="text-xs">
                  {getRitmoTexto(data.proyeccion.ritmoActual)}
                </p>
              </div>
            </div>

            {/* Comparación Proyección vs Óptimo */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-slate-600" />
                  <span className="font-semibold text-slate-700">Proyección vs Producción Óptima</span>
                </div>
                <Badge variant="outline" className="bg-white">
                  {data.comparacion.proyeccionVsOptimo.toFixed(1)}% del óptimo
                </Badge>
              </div>

              <div className="space-y-4">
                {/* Barra de progreso: Proyección actual */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Tu proyección mensual</span>
                    <span className="font-semibold text-blue-600">
                      {data.proyeccion.m3ProyectadoMes.toLocaleString(undefined, { maximumFractionDigits: 0 })} m³
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(data.comparacion.proyeccionVsOptimo, 100)} 
                    className="h-3 bg-slate-200"
                  />
                </div>

                {/* Barra de progreso: Óptimo */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Producción óptima (modelo)</span>
                    <span className="font-semibold text-green-600">
                      {data.produccionOptima.m3PorMes.toLocaleString(undefined, { maximumFractionDigits: 0 })} m³
                    </span>
                  </div>
                  <Progress 
                    value={100} 
                    className="h-3 bg-green-200"
                  />
                </div>

                {/* Potencial de mejora */}
                {data.comparacion.potencialMejora > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-green-200">
                    <ArrowUpRight className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-700">
                        Potencial de mejora: +{data.comparacion.potencialMejora.toLocaleString(undefined, { maximumFractionDigits: 0 })} m³/mes
                      </p>
                      <p className="text-xs text-green-600">
                        Con configuración óptima: {data.configuracionOptima.numVolquetasGrandes} volquetas grandes + {data.configuracionOptima.numVolquetasPequenas} pequeñas
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Métricas de eficiencia */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Eficiencia actual */}
              <div className="p-4 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-5 w-5 text-amber-500" />
                  <span className="font-semibold text-slate-700">Eficiencia Actual</span>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-500">Eficiencia de producción</span>
                      <span className={cn(
                        "font-semibold",
                        data.metricas.eficienciaProduccion >= 80 ? "text-green-600" :
                        data.metricas.eficienciaProduccion >= 60 ? "text-amber-600" : "text-red-600"
                      )}>
                        {data.metricas.eficienciaProduccion}%
                      </span>
                    </div>
                    <Progress 
                      value={data.metricas.eficienciaProduccion} 
                      className="h-2"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-500">Eficiencia de viajes</span>
                      <span className={cn(
                        "font-semibold",
                        data.metricas.eficienciaViajes >= 80 ? "text-green-600" :
                        data.metricas.eficienciaViajes >= 60 ? "text-amber-600" : "text-red-600"
                      )}>
                        {data.metricas.eficienciaViajes}%
                      </span>
                    </div>
                    <Progress 
                      value={data.metricas.eficienciaViajes} 
                      className="h-2"
                    />
                  </div>
                </div>
              </div>

              {/* Recomendación */}
              <div className={cn(
                "p-4 rounded-xl border",
                data.metricas.eficienciaProduccion >= 80 
                  ? "bg-green-50 border-green-200" 
                  : data.metricas.eficienciaProduccion >= 60 
                    ? "bg-amber-50 border-amber-200"
                    : "bg-red-50 border-red-200"
              )}>
                <div className="flex items-center gap-2 mb-3">
                  {data.metricas.eficienciaProduccion >= 80 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : data.metricas.eficienciaProduccion >= 60 ? (
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  )}
                  <span className="font-semibold">Recomendación</span>
                </div>
                <p className="text-sm">
                  {data.metricas.recomendacion}
                </p>
                
                {data.metricas.brechaM3 > 0 && (
                  <div className="mt-3 pt-3 border-t border-current/20">
                    <p className="text-xs">
                      <span className="font-medium">Brecha actual:</span> {data.metricas.brechaM3.toLocaleString(undefined, { maximumFractionDigits: 0 })} m³ 
                      ({data.metricas.brechaViajes} viajes)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Inventario de Volquetas Disponibles */}
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
              <h4 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Inventario de Volquetas Disponibles
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-blue-600">Pequeñas (5.5m³)</p>
                  <p className="text-2xl font-bold text-blue-800">{data.inventario.totalPequenas}</p>
                </div>
                <div className="text-center">
                  <p className="text-blue-600">Grandes (13m³)</p>
                  <p className="text-2xl font-bold text-blue-800">{data.inventario.totalGrandes}</p>
                </div>
                <div className="text-center">
                  <p className="text-blue-600">Total</p>
                  <p className="text-2xl font-bold text-blue-800">{data.inventario.total}</p>
                </div>
              </div>
            </div>

            {/* Configuración detectada vs óptima */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Configuración Actual (en uso)
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Volquetas pequeñas (5.5m³)</span>
                    <Badge variant="secondary">{data.configuracionActual.numVolquetasPequenas}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Volquetas grandes (13m³)</span>
                    <Badge variant="secondary">{data.configuracionActual.numVolquetasGrandes}</Badge>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-slate-600 font-medium">Producción esperada</span>
                    <span className="font-bold text-slate-800">
                      {data.produccionConfigActual.m3PorMes.toLocaleString()} m³/mes
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Configuración Óptima (con inventario actual)
                </h4>
                <p className="text-xs text-green-600 mb-2">
                  Mejor combinación posible con las {data.inventario.total} volquetas disponibles
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-600">Volquetas pequeñas (5.5m³)</span>
                    <Badge className="bg-green-200 text-green-800">
                      {data.configuracionOptima.numVolquetasPequenas} de {data.inventario.totalPequenas}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">Volquetas grandes (13m³)</span>
                    <Badge className="bg-green-200 text-green-800">
                      {data.configuracionOptima.numVolquetasGrandes} de {data.inventario.totalGrandes}
                    </Badge>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-green-200">
                    <span className="text-green-700 font-medium">Producción óptima</span>
                    <span className="font-bold text-green-800">
                      {data.produccionOptima.m3PorMes.toLocaleString()} m³/mes
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Calculator className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Cargando proyecciones...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProyeccionProduccion;
