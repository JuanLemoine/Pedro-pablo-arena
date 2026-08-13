import { BadgeDollarSign, CalendarCheck, Layers, Mountain, Truck, Gauge } from 'lucide-react';
import KpiTile from './KpiTile';
import { formatoM3, formatoMoneda, formatoMonedaCorta, formatoPorcentaje } from '@/lib/formato';
import type { MetricasPeriodo } from '@/lib/informe';

interface Props {
  actual: MetricasPeriodo;
  anterior: MetricasPeriodo | null;
}

const ResumenEjecutivo = ({ actual, anterior }: Props) => (
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
    <KpiTile
      titulo="Ingreso total"
      valor={formatoMonedaCorta(actual.ingresoTotal)}
      nota={`Ventas ${formatoMonedaCorta(actual.ingresoVentas)} + acopio ${formatoMonedaCorta(actual.ingresoAcopio)}`}
      icono={BadgeDollarSign}
      tono="verde"
      actual={actual.ingresoTotal}
      anterior={anterior?.ingresoTotal}
      sentido="masEsMejor"
    />
    <KpiTile
      titulo="m³ entregados"
      valor={formatoM3(actual.m3Entregados, 0)}
      nota={`${actual.ventasRegistros} despacho(s), incluye la yapa`}
      icono={Truck}
      tono="azul"
      actual={actual.m3Entregados}
      anterior={anterior?.m3Entregados}
      sentido="masEsMejor"
    />
    <KpiTile
      titulo="Fase 1: cumplimiento"
      valor={formatoPorcentaje(actual.cumplimientoF1, 0)}
      nota={`${formatoM3(actual.productoFase1, 0)} de ${formatoM3(actual.capacidadProductoF1, 0)} posibles`}
      icono={Mountain}
      tono="ambar"
      actual={actual.cumplimientoF1}
      anterior={anterior?.cumplimientoF1}
      sentido="masEsMejor"
    />
    <KpiTile
      titulo="Fase 2: cumplimiento"
      valor={formatoPorcentaje(actual.cumplimientoF2, 0)}
      nota={`${formatoM3(actual.productoFase2, 0)} de ${formatoM3(actual.capacidadProductoF2, 0)} posibles`}
      icono={Layers}
      tono="verde"
      actual={actual.cumplimientoF2}
      anterior={anterior?.cumplimientoF2}
      sentido="masEsMejor"
    />
    <KpiTile
      titulo="Días operados"
      valor={`${actual.diasOperados} / ${actual.diasHabiles}`}
      nota={
        actual.diasSinOperar > 0
          ? `${actual.diasSinOperar} día(s) hábiles sin operación`
          : 'Se operaron todos los días hábiles'
      }
      icono={CalendarCheck}
      tono="teal"
      actual={actual.diasOperados}
      anterior={anterior?.diasOperados}
      sentido="masEsMejor"
    />
    <KpiTile
      titulo="Producción total"
      valor={formatoPorcentaje(actual.cumplimientoTotal, 0)}
      nota={`${formatoM3(actual.productoFinalTotal, 0)} de ${formatoM3(actual.capacidadProductoTotal, 0)} · precio ${formatoMoneda(actual.precioPorM3Entregado)}/m³`}
      icono={Gauge}
      tono="morado"
      actual={actual.cumplimientoTotal}
      anterior={anterior?.cumplimientoTotal}
      sentido="masEsMejor"
    />
  </div>
);

export default ResumenEjecutivo;
