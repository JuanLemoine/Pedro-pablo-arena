import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVerificarRecibo } from '@/hooks/useRecibo';

interface ReciboInputProps {
  index: number;
  value: string;
  onChange: (valor: string) => void;
  /** Id del registro en edición, para que no se detecte a sí mismo */
  ignorarId?: string | null;
  /** true si otra fila del mismo formulario ya usa este número */
  duplicadoEnLote?: boolean;
  /** Informa al formulario si esta fila está bloqueada */
  onEstadoChange: (index: number, duplicado: boolean) => void;
}

/**
 * Campo de N° de recibo con validación de unicidad global. Avisa apenas se
 * escribe un número ya registrado y le informa al formulario que debe impedir
 * el guardado.
 */
export const ReciboInput = ({
  index,
  value,
  onChange,
  ignorarId,
  duplicadoEnLote,
  onEstadoChange,
}: ReciboInputProps) => {
  const { existente, verificando } = useVerificarRecibo(value, ignorarId);
  const duplicado = !!existente || !!duplicadoEnLote;

  useEffect(() => {
    onEstadoChange(index, duplicado);
  }, [index, duplicado, onEstadoChange]);

  // Al desmontar la fila se libera su estado para no bloquear el formulario
  useEffect(() => () => onEstadoChange(index, false), [index, onEstadoChange]);

  return (
    <div className="space-y-1">
      <Label className="text-xs">N° Recibo *</Label>
      <div className="relative">
        <Input
          placeholder="001"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          className={cn(duplicado && 'border-red-500 focus-visible:ring-red-500 pr-8')}
        />
        {verificando && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {!verificando && duplicado && (
          <AlertCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
        )}
      </div>

      {duplicadoEnLote && (
        <p className="text-[11px] text-red-600 leading-tight">
          Repetido en este mismo formulario.
        </p>
      )}

      {existente && !duplicadoEnLote && (
        <div className="rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] leading-tight text-red-700">
          <span className="font-semibold">Recibo ya registrado.</span>
          <div className="text-red-600/90">
            {new Date(existente.fecha + 'T00:00:00').toLocaleDateString('es-CO')} ·{' '}
            {existente.placa} · ${Number(existente.valor_total).toLocaleString('es-CO')}
            {existente.nombre_cliente ? ` · ${existente.nombre_cliente}` : ''}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReciboInput;
