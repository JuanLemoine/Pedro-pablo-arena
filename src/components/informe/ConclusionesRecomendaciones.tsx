import { AlertTriangle, CheckCircle2, CircleAlert, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Conclusion, Severidad } from '@/lib/informe';

interface Props {
  conclusiones: Conclusion[];
}

const ESTILOS: Record<
  Severidad,
  { icono: typeof AlertTriangle; borde: string; fondo: string; texto: string; etiqueta: string }
> = {
  critico: {
    icono: AlertTriangle,
    borde: 'border-red-200',
    fondo: 'bg-red-50/60',
    texto: 'text-red-700',
    etiqueta: 'Crítico',
  },
  atencion: {
    icono: CircleAlert,
    borde: 'border-amber-200',
    fondo: 'bg-amber-50/60',
    texto: 'text-amber-700',
    etiqueta: 'Atención',
  },
  bien: {
    icono: CheckCircle2,
    borde: 'border-green-200',
    fondo: 'bg-green-50/60',
    texto: 'text-green-700',
    etiqueta: 'En orden',
  },
};

const ConclusionesRecomendaciones = ({ conclusiones }: Props) => (
  <div className="space-y-3">
    {conclusiones.map(c => {
      const e = ESTILOS[c.severidad];
      const Icono = e.icono;
      return (
        <div
          key={c.id}
          className={cn('evitar-corte rounded-lg border p-4', e.borde, e.fondo)}
        >
          <div className="flex items-start gap-3">
            <Icono className={cn('mt-0.5 h-5 w-5 shrink-0', e.texto)} />
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-baseline gap-2">
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                    e.texto,
                    'bg-white/70'
                  )}
                >
                  {e.etiqueta}
                </span>
                <h4 className="font-semibold leading-snug text-foreground">{c.titulo}</h4>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{c.detalle}</p>
              <p className="flex items-start gap-1.5 text-sm font-medium leading-relaxed text-foreground">
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                {c.accion}
              </p>
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

export default ConclusionesRecomendaciones;
