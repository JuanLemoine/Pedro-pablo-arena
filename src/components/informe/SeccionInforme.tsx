import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  numero: number;
  titulo: string;
  /** La pregunta de negocio que responde la sección, en español llano. */
  pregunta: string;
  icono: LucideIcon;
  children: ReactNode;
  className?: string;
}

const SeccionInforme = ({ numero, titulo, pregunta, icono: Icono, children, className }: Props) => (
  <section className={cn('rounded-xl border border-border bg-card p-5 shadow-card', className)}>
    <header className="mb-4 flex items-start gap-3 border-b border-border/60 pb-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icono className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <h3 className="font-display text-lg font-bold leading-tight text-foreground">
          <span className="text-muted-foreground">{numero}.</span> {titulo}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{pregunta}</p>
      </div>
    </header>
    {children}
  </section>
);

export default SeccionInforme;
