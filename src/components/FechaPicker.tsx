import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  /** Fecha en formato yyyy-MM-dd. */
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

/** Selector de fecha compacto, compartido por los filtros y el comparador. */
const FechaPicker = ({ label, value, onChange, className }: Props) => {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(value + 'T00:00:00') : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'justify-start gap-2 text-left font-normal min-w-[130px]',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
          {date ? format(date, 'dd MMM yyyy', { locale: es }) : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={d => {
            if (d) {
              onChange(format(d, 'yyyy-MM-dd'));
              setOpen(false);
            }
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};

export default FechaPicker;
