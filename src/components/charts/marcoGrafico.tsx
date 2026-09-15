import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PiezaProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Las gráficas viven en dos sitios: sueltas en el dashboard, donde necesitan su
 * propia tarjeta, e incrustadas en una sección del informe, donde la tarjeta
 * sobra porque la sección ya pone el marco. Estas piezas se intercambian para
 * no duplicar el contenido de cada gráfica.
 *
 * Se definen a nivel de módulo a propósito: si se crearan dentro del render,
 * React vería un tipo de componente nuevo en cada pasada y remontaría la
 * gráfica entera.
 */
const MarcoLlano = ({ className, children }: PiezaProps) => (
  <div className={cn('space-y-3', className)}>{children}</div>
);
const EncabezadoLlano = ({ className, children }: PiezaProps) => (
  <div className={cn('space-y-1', className)}>{children}</div>
);
const CuerpoLlano = ({ className, children }: PiezaProps) => (
  <div className={className}>{children}</div>
);
const TituloLlano = ({ className, children }: PiezaProps) => (
  <p className={cn('text-sm font-semibold text-foreground', className)}>{children}</p>
);
const DescripcionLlano = ({ className, children }: PiezaProps) => (
  <p className={cn('text-xs text-muted-foreground', className)}>{children}</p>
);

const CON_TARJETA = {
  Marco: Card,
  Encabezado: CardHeader,
  Cuerpo: CardContent,
  Titulo: CardTitle,
  Descripcion: CardDescription,
};

const SIN_TARJETA = {
  Marco: MarcoLlano,
  Encabezado: EncabezadoLlano,
  Cuerpo: CuerpoLlano,
  Titulo: TituloLlano,
  Descripcion: DescripcionLlano,
};

export const piezasGrafico = (sinTarjeta?: boolean) => (sinTarjeta ? SIN_TARJETA : CON_TARJETA);
