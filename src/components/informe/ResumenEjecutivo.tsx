import { BadgeDollarSign, CalendarCheck, Gauge, Mountain, Tag, Truck } from 'lucide-react';
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
      titulo="m³ excavados (Fase 1)"
      valor={formatoM3(actual.fase1, 0)}
      nota={`${actual.viajesFase1} viaje(s) al punto de zaranda`}
      icono={Mountain}
      tono="ambar"
      actual={actual.fase1}
      anterior={anterior?.fase1}
      sentido="masEsMejor"
    />
    <KpiTile
      titulo="Uso de la capacidad"
      valor={formatoPorcentaje(actual.cumplimientoCapacidad)}
      nota={`De ${formatoM3(actual.m3Optimo, 0)} posibles en los ${actual.diasOperados} día(s) operados`}
      icono={Gauge}
      tono="morado"
      actual={actual.cumplimientoCapacidad}
      anterior={anterior?.cumplimientoCapacidad}
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
      titulo="Precio por m³ entregado"
      valor={formatoMoneda(actual.precioPorM3Entregado)}
      nota={`Facturado ${formatoMoneda(actual.precioPorM3Facturado)} por m³`}
      icono={Tag}
      tono="gris"
      actual={actual.precioPorM3Entregado}
      anterior={anterior?.precioPorM3Entregado}
      sentido="masEsMejor"
    />
  </div>
);

export default ResumenEjecutivo;
