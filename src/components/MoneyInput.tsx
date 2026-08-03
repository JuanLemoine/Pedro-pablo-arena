import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Deja solo dígitos: "1.0a00" → "1000" */
export const soloDigitos = (valor: string): string => valor.replace(/\D/g, '');

/**
 * Agrupa en miles con punto: "10000" → "10.000".
 * El valor que escribe el usuario nunca trae separadores (onChange los quita),
 * pero un valor cargado desde la base puede venir como "410000.00": se toma
 * solo la parte entera para no convertirla en "41.000.000".
 */
export const formatearMiles = (valor: string): string => {
  const [entero] = String(valor ?? '').split(/[.,]/);
  const limpio = soloDigitos(entero).replace(/^0+(?=\d)/, '');
  if (!limpio) return '';
  return limpio.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

interface MoneyInputProps {
  /** Valor crudo, solo dígitos (ej. "10000") */
  value: string;
  /** Devuelve el valor crudo, sin puntos */
  onChange: (valor: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

/**
 * Campo para importes en pesos. Muestra el número agrupado en miles mientras se
 * escribe (10000 → 10.000) pero entrega siempre el valor crudo, para que quien
 * lo use siga guardando un número limpio.
 *
 * Es type="text" a propósito: un input numérico no permite mostrar los puntos.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onChange, placeholder = '0', className, id }, ref) => (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        $
      </span>
      <Input
        ref={ref}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={formatearMiles(value)}
        onChange={(e) => onChange(soloDigitos(e.target.value))}
        className={cn('pl-6', className)}
      />
    </div>
  )
);

MoneyInput.displayName = 'MoneyInput';

export default MoneyInput;
