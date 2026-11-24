import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, X, Search, PackageCheck, Loader2, Pencil } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAcopios, useConfirmarAcopio, useUpdateAcopio } from '@/hooks/useAcopios';
import { CAPACIDAD_M3_ACOPIO } from '@/lib/volquetas';

const AcopioConfirmacion = () => {
  const { data: acopios = [], isLoading, error } = useAcopios();
  const confirmarAcopio = useConfirmarAcopio();
  const updateAcopio = useUpdateAcopio();

  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente' | 'confirmado'>('pendiente');
  const [filterSilice, setFilterSilice] = useState('all');
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoViajes, setEditandoViajes] = useState('');

  const handleStartEditViajes = (id: string, valorActual: number) => {
    setEditandoId(id);
    setEditandoViajes(String(valorActual));
  };

  const handleSaveViajes = (acopio: (typeof acopios)[0]) => {
    const nuevo = parseInt(editandoViajes, 10);
    setEditandoId(null);
    if (isNaN(nuevo) || nuevo < 1 || nuevo === acopio.cantidad_viajes) return;
    updateAcopio.mutate({
      id: acopio.id,
      acopio: {
        fecha: acopio.fecha,
        fuente: acopio.fuente,
        silice: acopio.silice,
        placa: acopio.placa,
        cantidad_viajes: nuevo,
        confirmado: acopio.confirmado,
      },
    });
  };

  const handleToggleConfirmado = (id: string, actual: boolean | null) => {
    setConfirmandoId(id);
    confirmarAcopio.mutate(
      { id, confirmado: !actual },
      { onSettled: () => setConfirmandoId(null) }
    );
  };

  const filtrados = acopios.filter(a => {
    const estadoOk =
      filtroEstado === 'todos' ||
      (filtroEstado === 'pendiente' && !a.confirmado) ||
      (filtroEstado === 'confirmado' && !!a.confirmado);
    const siliceOk = filterSilice === 'all' || a.silice === filterSilice;
    const textOk =
      !searchTerm ||
      a.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.fuente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.silice.toLowerCase().includes(searchTerm.toLowerCase());
    return estadoOk && siliceOk && textOk;
  });

  const pendientes = acopios.filter(a => !a.confirmado).length;
  const confirmados = acopios.filter(a => !!a.confirmado).length;

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
        No se pudieron cargar los registros de acopio: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <PackageCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold font-display">Confirmación de llegada</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Volquetas registradas como enviadas al acopio. Confirma las que ya llegaron.
        </p>
      </div>

      {/* Contadores */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Pendientes</p>
          <p className="text-2xl font-bold text-amber-600">{pendientes}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Confirmados</p>
          <p className="text-2xl font-bold text-green-600">{confirmados}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{acopios.length}</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registros de acopio</CardTitle>
          <CardDescription>
            Cada fila es un envío registrado. Usa el botón de la última columna para confirmar
            que esa volqueta llegó con la cantidad indicada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar placa, fuente, sílice…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filtroEstado} onValueChange={v => setFiltroEstado(v as typeof filtroEstado)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="confirmado">Confirmados</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSilice} onValueChange={setFilterSilice}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="Silice A - Peña">Sílice A - Peña</SelectItem>
                <SelectItem value="Silice B - Pozo">Sílice B - Pozo</SelectItem>
                <SelectItem value="Silice C - Arena Fina">Sílice C - Arena Fina</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtrados.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No hay registros que coincidan con los filtros.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Fuente</TableHead>
                    <TableHead>Sílice</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead className="text-right">Viajes</TableHead>
                    <TableHead className="text-right">m³</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-center">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map(a => {
                    const m3 = CAPACIDAD_M3_ACOPIO * a.cantidad_viajes;
                    const estaConfirmado = !!a.confirmado;
                    const cargando = confirmandoId === a.id;
                    return (
                      <TableRow
                        key={a.id}
                        className={cn(estaConfirmado && 'bg-green-50/50 dark:bg-green-950/20')}
                      >
                        <TableCell className="whitespace-nowrap">
                          {a.fecha ? format(parseISO(a.fecha), "d MMM yyyy", { locale: es }) : '—'}
                        </TableCell>
                        <TableCell className="max-w-36 truncate text-xs text-muted-foreground">
                          {a.fuente}
                        </TableCell>
                        <TableCell className="text-xs">
                          {(a.silice ?? '').replace('Silice A - ', '').replace('Silice B - ', '').replace('Silice C - ', '')}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{a.placa}</TableCell>
                        <TableCell className="text-right">
                          {editandoId === a.id ? (
                            <input
                              type="number"
                              min={1}
                              value={editandoViajes}
                              onChange={e => setEditandoViajes(e.target.value)}
                              onBlur={() => handleSaveViajes(a)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveViajes(a);
                                if (e.key === 'Escape') setEditandoId(null);
                              }}
                              autoFocus
                              className="w-16 rounded border border-primary px-1 py-0.5 text-right tabular-nums text-sm focus:outline-none"
                            />
                          ) : (
                            <button
                              onClick={() => handleStartEditViajes(a.id, a.cantidad_viajes)}
                              className="inline-flex items-center gap-1 tabular-nums hover:text-primary"
                              title="Editar cantidad de viajes"
                            >
                              <span>{a.cantidad_viajes}</span>
                              <Pencil className="h-3 w-3 opacity-40" />
                            </button>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {m3.toLocaleString('es-CO')} m³
                        </TableCell>
                        <TableCell className="text-center">
                          {estaConfirmado ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                              <Check className="h-3 w-3 mr-1" />
                              Llegó
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-700 border-amber-300">
                              Pendiente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant={estaConfirmado ? 'outline' : 'default'}
                            className={cn(
                              'h-8 px-3 text-xs',
                              estaConfirmado
                                ? 'text-muted-foreground hover:text-destructive hover:border-destructive'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            )}
                            disabled={cargando}
                            onClick={() => handleToggleConfirmado(a.id, a.confirmado)}
                          >
                            {cargando ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : estaConfirmado ? (
                              <><X className="h-3 w-3 mr-1" />Deshacer</>
                            ) : (
                              <><Check className="h-3 w-3 mr-1" />Confirmar</>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcopioConfirmacion;
