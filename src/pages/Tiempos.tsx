import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Trash2, Save, CalendarIcon, Loader2, Timer, TrendingUp, ArrowRight, ArrowLeft, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTiempos, useCreateTiempo, useDeleteTiempo } from '@/hooks/useTiempos';

interface TiempoForm {
  fecha: Date;
  silice: string;
  tiempo_ida: string;
  tiempo_vuelta: string;
  notas: string;
}

const getEmptyForm = (): TiempoForm => ({
  fecha: new Date(),
  silice: '',
  tiempo_ida: '',
  tiempo_vuelta: '',
  notas: '',
});

const formatMinutos = (min: number) => {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

const getSiliceBadge = (silice: string) => {
  const isA = silice.includes('A');
  return (
    <Badge variant="outline" className={isA ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-purple-100 text-purple-700 border-purple-200'}>
      {silice}
    </Badge>
  );
};

const Tiempos = () => {
  const { data: tiempos = [], isLoading, error } = useTiempos();
  const createTiempo = useCreateTiempo();
  const deleteTiempo = useDeleteTiempo();

  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [form, setForm] = useState<TiempoForm>(getEmptyForm());

  const setF = (campo: keyof TiempoForm, valor: string | Date) =>
    setForm(prev => ({ ...prev, [campo]: valor }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.silice || !form.tiempo_ida || !form.tiempo_vuelta) {
      toast.error('Por favor complete sílice, tiempo de ida y tiempo de vuelta');
      return;
    }
    const ida = parseInt(form.tiempo_ida);
    const vuelta = parseInt(form.tiempo_vuelta);
    if (isNaN(ida) || ida <= 0 || isNaN(vuelta) || vuelta <= 0) {
      toast.error('Los tiempos deben ser números positivos');
      return;
    }
    createTiempo.mutate(
      {
        fecha: format(form.fecha, 'yyyy-MM-dd'),
        silice: form.silice,
        tiempo_ida: ida,
        tiempo_vuelta: vuelta,
        notas: form.notas || null,
      },
      {
        onSuccess: () => {
          setForm(getEmptyForm());
          setShowForm(false);
        },
      }
    );
  };

  const filtered = tiempos.filter(t =>
    t.silice.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.fecha.includes(searchTerm) ||
    (t.notas || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Estadísticas rápidas
  const promedioIda = tiempos.length > 0
    ? Math.round(tiempos.reduce((s, t) => s + t.tiempo_ida, 0) / tiempos.length)
    : 0;
  const promedioVuelta = tiempos.length > 0
    ? Math.round(tiempos.reduce((s, t) => s + t.tiempo_vuelta, 0) / tiempos.length)
    : 0;
  const promedioCiclo = promedioIda + promedioVuelta;

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Error al cargar tiempos: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Tiempos de Ruta</h1>
          <p className="text-muted-foreground mt-1">Registro de tiempos de ida y vuelta por tipo de sílice</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Registro
        </Button>
      </div>

      {/* Estadísticas rápidas */}
      {tiempos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <ArrowRight className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Promedio ida</p>
                <p className="text-2xl font-bold">{formatMinutos(promedioIda)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                <ArrowLeft className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Promedio vuelta</p>
                <p className="text-2xl font-bold">{formatMinutos(promedioVuelta)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Promedio ciclo completo</p>
                <p className="text-2xl font-bold">{formatMinutos(promedioCiclo)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <Card className="shadow-card animate-slide-up border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Timer className="h-5 w-5 text-primary" />
              Registrar Tiempo de Ruta
            </CardTitle>
            <CardDescription>Los tiempos se registran en minutos</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Fecha */}
                <div className="space-y-2">
                  <Label>Fecha *</Label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start gap-2 font-normal">
                        <CalendarIcon className="h-4 w-4" />
                        {format(form.fecha, 'dd/MM/yyyy', { locale: es })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={form.fecha}
                        onSelect={(d) => { if (d) { setF('fecha', d); setCalendarOpen(false); } }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Sílice */}
                <div className="space-y-2">
                  <Label>Tipo de Sílice *</Label>
                  <Select value={form.silice} onValueChange={(v) => setF('silice', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Silice A - Peña">Sílice A — Peña</SelectItem>
                      <SelectItem value="Silice B - Pozo">Sílice B — Pozo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tiempo ida */}
                <div className="space-y-2">
                  <Label>Tiempo de Ida * <span className="text-muted-foreground text-xs">(minutos)</span></Label>
                  <div className="relative">
                    <ArrowRight className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
                    <Input
                      type="number"
                      min="1"
                      placeholder="ej. 45"
                      value={form.tiempo_ida}
                      onChange={(e) => setF('tiempo_ida', e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {form.tiempo_ida && !isNaN(parseInt(form.tiempo_ida)) && (
                    <p className="text-xs text-muted-foreground">{formatMinutos(parseInt(form.tiempo_ida))}</p>
                  )}
                </div>

                {/* Tiempo vuelta */}
                <div className="space-y-2">
                  <Label>Tiempo de Vuelta * <span className="text-muted-foreground text-xs">(minutos)</span></Label>
                  <div className="relative">
                    <ArrowLeft className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-500" />
                    <Input
                      type="number"
                      min="1"
                      placeholder="ej. 40"
                      value={form.tiempo_vuelta}
                      onChange={(e) => setF('tiempo_vuelta', e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {form.tiempo_vuelta && !isNaN(parseInt(form.tiempo_vuelta)) && (
                    <p className="text-xs text-muted-foreground">{formatMinutos(parseInt(form.tiempo_vuelta))}</p>
                  )}
                </div>
              </div>

              {/* Ciclo total preview */}
              {form.tiempo_ida && form.tiempo_vuelta &&
                !isNaN(parseInt(form.tiempo_ida)) && !isNaN(parseInt(form.tiempo_vuelta)) && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
                  <TrendingUp className="h-4 w-4 shrink-0" />
                  Ciclo completo: <span className="font-bold">
                    {formatMinutos(parseInt(form.tiempo_ida) + parseInt(form.tiempo_vuelta))}
                  </span>
                  <span className="text-green-600 text-xs">
                    ({parseInt(form.tiempo_ida) + parseInt(form.tiempo_vuelta)} min en total)
                  </span>
                </div>
              )}

              {/* Notas */}
              <div className="space-y-2">
                <Label>Notas <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input
                  placeholder="Observaciones adicionales..."
                  value={form.notas}
                  onChange={(e) => setF('notas', e.target.value)}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setForm(getEmptyForm()); }}>
                  Cancelar
                </Button>
                <Button type="submit" className="gap-2" disabled={createTiempo.isPending}>
                  {createTiempo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar Registro
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Historial */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Timer className="h-5 w-5 text-primary" />
                Historial de Tiempos
              </CardTitle>
              <CardDescription>{filtered.length} registros encontrados</CardDescription>
            </div>
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por sílice, fecha..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Sílice</TableHead>
                    <TableHead className="text-right">
                      <span className="flex items-center justify-end gap-1"><ArrowRight className="h-3.5 w-3.5 text-blue-500" />Ida</span>
                    </TableHead>
                    <TableHead className="text-right">
                      <span className="flex items-center justify-end gap-1"><ArrowLeft className="h-3.5 w-3.5 text-purple-500" />Vuelta</span>
                    </TableHead>
                    <TableHead className="text-right">
                      <span className="flex items-center justify-end gap-1"><Clock className="h-3.5 w-3.5 text-green-500" />Ciclo total</span>
                    </TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        <Timer className="h-10 w-10 mx-auto mb-2 opacity-40" />
                        <p>No hay registros de tiempos aún</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((t) => (
                      <TableRow key={t.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{t.fecha}</TableCell>
                        <TableCell>{getSiliceBadge(t.silice)}</TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium text-blue-700 tabular-nums">{formatMinutos(t.tiempo_ida)}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium text-purple-700 tabular-nums">{formatMinutos(t.tiempo_vuelta)}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 tabular-nums">
                            {formatMinutos(t.tiempo_ida + t.tiempo_vuelta)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                          {t.notas || '—'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteTiempo.mutate(t.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Tiempos;
