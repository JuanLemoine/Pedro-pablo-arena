import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calculator, Clock, Truck, TrendingUp, DollarSign } from 'lucide-react';
import {
  simularHomogenea,
  simularMixta,
  type TipoProducto,
  type ResiduosPozo,
} from '@/lib/simulador';

const fmtSeg = (s: number) => {
  if (!isFinite(s) || isNaN(s)) return '—';
  const sign = s < 0 ? '-' : '';
  const abs = Math.abs(Math.round(s));
  if (abs < 60) return `${sign}${abs}s`;
  const m = Math.floor(abs / 60);
  const r = abs % 60;
  return r === 0 ? `${sign}${m}min` : `${sign}${m}min ${r}s`;
};
const fmtM3 = (n: number) => (isFinite(n) ? n.toLocaleString('es-CO', { maximumFractionDigits: 2 }) : '—');
const fmtCOP = (n: number) =>
  isFinite(n) ? `$${Math.round(n).toLocaleString('es-CO')}` : '—';
const fmtNum = (n: number, d = 2) =>
  isFinite(n) ? n.toLocaleString('es-CO', { maximumFractionDigits: d }) : '—';

const StatRow = ({ label, value, hint, highlight }: { label: string; value: string; hint?: string; highlight?: boolean }) => (
  <div className={`flex justify-between items-baseline py-1.5 border-b border-slate-100 last:border-0 ${highlight ? 'font-semibold' : ''}`}>
    <span className="text-sm text-slate-600">{label}</span>
    <span className={`text-sm ${highlight ? 'text-primary' : 'text-slate-800'}`}>
      {value}
      {hint && <span className="text-xs text-slate-400 ml-1">{hint}</span>}
    </span>
  </div>
);

// ─── Hoja 1: Volquetas Homogéneas ───────────────────────────────────────────
const SimHomogenea = () => {
  const [tamano, setTamano] = useState<'7m3' | '14m3'>('7m3');
  const [tIda, setTIda] = useState(129);
  const [tVuelta, setTVuelta] = useState(88);
  const [diasLV, setDiasLV] = useState(22);
  const [diasS, setDiasS] = useState(4);
  const [W, setW] = useState(2);
  const [producto, setProducto] = useState<TipoProducto>('Pozo');
  const [residuosPozo, setResiduosPozo] = useState<ResiduosPozo>('Peña');

  const r = useMemo(
    () =>
      simularHomogenea({
        tamano,
        tIda: Number(tIda) || 0,
        tVuelta: Number(tVuelta) || 0,
        diasLV: Number(diasLV) || 0,
        diasS: Number(diasS) || 0,
        W: Number(W) || 1,
        producto,
        residuosPozo,
      }),
    [tamano, tIda, tVuelta, diasLV, diasS, W, producto, residuosPozo]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Inputs */}
      <Card className="lg:col-span-1 shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" /> Parámetros
          </CardTitle>
          <CardDescription>Valores a digitar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Tamaño de volquetas</Label>
            <Select value={tamano} onValueChange={v => setTamano(v as '7m3' | '14m3')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7m3">7 m³</SelectItem>
                <SelectItem value="14m3">14 m³</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Transporte ida a Zaranda (seg)</Label>
            <Input type="number" value={tIda} onChange={e => setTIda(+e.target.value)} />
          </div>
          <div>
            <Label>Transporte de vuelta (seg)</Label>
            <Input type="number" value={tVuelta} onChange={e => setTVuelta(+e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Días L-V/mes</Label>
              <Input type="number" value={diasLV} onChange={e => setDiasLV(+e.target.value)} />
            </div>
            <div>
              <Label>Días S/mes</Label>
              <Input type="number" value={diasS} onChange={e => setDiasS(+e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Cantidad de volquetas (W)</Label>
            <Input type="number" min={1} value={W} onChange={e => setW(+e.target.value)} />
          </div>
          <div>
            <Label>Producto a producir</Label>
            <Select value={producto} onValueChange={v => setProducto(v as TipoProducto)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Peña">Peña</SelectItem>
                <SelectItem value="Pozo">Pozo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {producto === 'Pozo' && (
            <div>
              <Label>Residuos de Pozo se producen cómo</Label>
              <Select value={residuosPozo} onValueChange={v => setResiduosPozo(v as ResiduosPozo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Peña">Peña</SelectItem>
                  <SelectItem value="Pozo">Pozo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultados */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Análisis inicial del ciclo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatRow label="T_carga (ocupación excavadora)" value={fmtSeg(r.Tcarga)} />
            <StatRow label="T_descarga" value={fmtSeg(r.Tdescarga)} />
            <StatRow label="T_total (ciclo individual)" value={fmtSeg(r.Ttotal)} />
            <StatRow label="Rb (tasa mínima = 1/T_carga)" value={fmtNum(r.Rb, 6)} />
            <StatRow
              label="Wo — volquetas óptimas"
              value={fmtNum(r.Wo, 3)}
              hint="(0 espera / 0 desperdicio)"
              highlight
            />
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900">
              Sugerido: <b>{r.WUp}</b> volquetas → espera {fmtSeg(r.TesperaUp)} &nbsp;·&nbsp;
              <b>{r.WDn}</b> volquetas → tiempo libre excavador {fmtSeg(-r.TesperaDn)}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Reporte de gestión con W = {W}
            </CardTitle>
            <CardDescription>Viajes, m³ fase 1 y producto final por día</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Métrica</TableHead>
                  <TableHead className="text-right">L-V</TableHead>
                  <TableHead className="text-right">Sábado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Viajes / día</TableCell>
                  <TableCell className="text-right font-semibold">{r.viajesLV}</TableCell>
                  <TableCell className="text-right font-semibold">{r.viajesS}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>m³ fase 1 (desde excavación)</TableCell>
                  <TableCell className="text-right">{fmtM3(r.m3Fase1LV)}</TableCell>
                  <TableCell className="text-right">{fmtM3(r.m3Fase1S)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Producto final en zaranda (67%)</TableCell>
                  <TableCell className="text-right">{fmtM3(r.productoFinalZarandaLV)}</TableCell>
                  <TableCell className="text-right">{fmtM3(r.productoFinalZarandaS)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Producto final en residuos (70%)</TableCell>
                  <TableCell className="text-right">{fmtM3(r.productoEnResiduosLV)}</TableCell>
                  <TableCell className="text-right">{fmtM3(r.productoEnResiduosS)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Granzón</TableCell>
                  <TableCell className="text-right">{fmtM3(r.granzonLV)}</TableCell>
                  <TableCell className="text-right">{fmtM3(r.granzonS)}</TableCell>
                </TableRow>
                <TableRow className="bg-slate-50">
                  <TableCell className="font-semibold">Producto final total ({producto})</TableCell>
                  <TableCell className="text-right font-bold text-primary">{fmtM3(r.productoFinalTotalLV)}</TableCell>
                  <TableCell className="text-right font-bold text-primary">{fmtM3(r.productoFinalTotalS)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" /> Análisis financiero
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatRow label="Ingreso diario L-V" value={fmtCOP(r.ingresoDiarioLV)} />
            <StatRow label="Ingreso diario Sábado" value={fmtCOP(r.ingresoDiarioS)} />
            <StatRow label={`Ingreso mensual — Producto (${producto})`} value={fmtCOP(r.ingresoMensualProducto)} />
            <StatRow label="Ingreso mensual — Granzón" value={fmtCOP(r.ingresoMensualGranzon)} />
            <StatRow label="Ingreso mensual TOTAL" value={fmtCOP(r.ingresoMensualTotal)} highlight />
            <div className="h-3" />
            <StatRow label={`Costo diario operación (${W} volq)`} value={fmtCOP(r.costoDiarioOperacion)} />
            <StatRow label="Costo por m³ (fase 1)" value={fmtCOP(r.costoPorM3)} highlight />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Costo de oportunidad — Tabla comparativa</CardTitle>
            <CardDescription>Costo por m³ variando la cantidad de volquetas (L-V)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cant. volquetas</TableHead>
                  <TableHead className="text-right">Total m³/día</TableHead>
                  <TableHead className="text-right">Costo/m³</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.tablaCostos.map(f => (
                  <TableRow key={f.cantVolq} className={f.cantVolq === W ? 'bg-primary/5' : ''}>
                    <TableCell>
                      {f.cantVolq}
                      {f.cantVolq === W && <Badge variant="outline" className="ml-2">Actual</Badge>}
                    </TableCell>
                    <TableCell className="text-right">{fmtM3(f.totalM3)}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtCOP(f.costoPorM3)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ─── Hoja 2: Volquetas Mixtas ───────────────────────────────────────────────
const SimMixta = () => {
  const [tIda, setTIda] = useState(133);
  const [tVuelta, setTVuelta] = useState(118);
  const [diasLV, setDiasLV] = useState(22);
  const [diasS, setDiasS] = useState(4);
  const [cantVolq7, setCantVolq7] = useState(1);
  const [producto, setProducto] = useState<TipoProducto>('Pozo');
  const [residuosPozo, setResiduosPozo] = useState<ResiduosPozo>('Pozo');

  const r = useMemo(
    () =>
      simularMixta({
        tIda: Number(tIda) || 0,
        tVuelta: Number(tVuelta) || 0,
        diasLV: Number(diasLV) || 0,
        diasS: Number(diasS) || 0,
        cantVolq7: Number(cantVolq7) || 0,
        producto,
        residuosPozo,
      }),
    [tIda, tVuelta, diasLV, diasS, cantVolq7, producto, residuosPozo]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-1 shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" /> Parámetros
          </CardTitle>
          <CardDescription>1 volqueta 14m³ + N volquetas 7m³</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Transporte ida a Zaranda (seg)</Label>
            <Input type="number" value={tIda} onChange={e => setTIda(+e.target.value)} />
          </div>
          <div>
            <Label>Transporte de vuelta (seg)</Label>
            <Input type="number" value={tVuelta} onChange={e => setTVuelta(+e.target.value)} />
          </div>
          <div>
            <Label>Cantidad de volq 7m³ (adicionales a la 14m³)</Label>
            <Input type="number" min={0} value={cantVolq7} onChange={e => setCantVolq7(+e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Días L-V/mes</Label>
              <Input type="number" value={diasLV} onChange={e => setDiasLV(+e.target.value)} />
            </div>
            <div>
              <Label>Días S/mes</Label>
              <Input type="number" value={diasS} onChange={e => setDiasS(+e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Producto a producir</Label>
            <Select value={producto} onValueChange={v => setProducto(v as TipoProducto)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Peña">Peña</SelectItem>
                <SelectItem value="Pozo">Pozo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {producto === 'Pozo' && (
            <div>
              <Label>Residuos de Pozo se producen cómo</Label>
              <Select value={residuosPozo} onValueChange={v => setResiduosPozo(v as ResiduosPozo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Peña">Peña</SelectItem>
                  <SelectItem value="Pozo">Pozo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="lg:col-span-2 space-y-4">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Análisis del ciclo conjunto
            </CardTitle>
            <CardDescription>
              Principio: mientras el transporte de la 14m³ ≥ carga total de 7m³ no hay espera.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StatRow label="T_total individual 14m³" value={fmtSeg(r.Ttotal14)} />
            <StatRow label="T_transporte 14m³ (descarga + ida + vuelta)" value={fmtSeg(r.tTransporte14)} />
            <StatRow label={`T_carga total 7m³ (${cantVolq7} × 313s)`} value={fmtSeg(r.tCargaTotal7)} />
            <StatRow label="Ciclo conjunto" value={fmtSeg(r.cicloConjunto)} highlight />
            <StatRow label="Tiempo de espera 14m³" value={fmtSeg(r.tEspera14)} />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Reporte de gestión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Métrica</TableHead>
                  <TableHead className="text-right">L-V</TableHead>
                  <TableHead className="text-right">Sábado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Viajes 14m³</TableCell>
                  <TableCell className="text-right">{r.viajesLV14}</TableCell>
                  <TableCell className="text-right">{r.viajesS14}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Viajes 7m³ (total flota)</TableCell>
                  <TableCell className="text-right">{r.viajesLV7}</TableCell>
                  <TableCell className="text-right">{r.viajesS7}</TableCell>
                </TableRow>
                <TableRow className="bg-slate-50">
                  <TableCell className="font-semibold">Viajes totales</TableCell>
                  <TableCell className="text-right font-semibold">{r.viajesTotalLV}</TableCell>
                  <TableCell className="text-right font-semibold">{r.viajesTotalS}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>m³ fase 1 (desde excavación)</TableCell>
                  <TableCell className="text-right">{fmtM3(r.m3Fase1LV)}</TableCell>
                  <TableCell className="text-right">{fmtM3(r.m3Fase1S)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Producto final en zaranda (67%)</TableCell>
                  <TableCell className="text-right">{fmtM3(r.productoFinalZarandaLV)}</TableCell>
                  <TableCell className="text-right">{fmtM3(r.productoFinalZarandaS)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Producto final en residuos</TableCell>
                  <TableCell className="text-right">{fmtM3(r.productoEnResiduosLV)}</TableCell>
                  <TableCell className="text-right">{fmtM3(r.productoEnResiduosS)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Granzón</TableCell>
                  <TableCell className="text-right">{fmtM3(r.granzonLV)}</TableCell>
                  <TableCell className="text-right">{fmtM3(r.granzonS)}</TableCell>
                </TableRow>
                <TableRow className="bg-slate-50">
                  <TableCell className="font-semibold">Producto final total ({producto})</TableCell>
                  <TableCell className="text-right font-bold text-primary">{fmtM3(r.productoFinalTotalLV)}</TableCell>
                  <TableCell className="text-right font-bold text-primary">{fmtM3(r.productoFinalTotalS)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" /> Análisis financiero
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatRow label="Ingreso diario L-V" value={fmtCOP(r.ingresoDiarioLV)} />
            <StatRow label="Ingreso diario Sábado" value={fmtCOP(r.ingresoDiarioS)} />
            <StatRow label={`Ingreso mensual — Producto (${producto})`} value={fmtCOP(r.ingresoMensualProducto)} />
            <StatRow label="Ingreso mensual — Granzón" value={fmtCOP(r.ingresoMensualGranzon)} />
            <StatRow label="Ingreso mensual TOTAL" value={fmtCOP(r.ingresoMensualTotal)} highlight />
            <div className="h-3" />
            <StatRow
              label={`Costo diario operación (1×14m³ + ${cantVolq7}×7m³)`}
              value={fmtCOP(r.costoDiarioOperacion)}
            />
            <StatRow label="Costo por m³ (fase 1)" value={fmtCOP(r.costoPorM3)} highlight />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ─── Página principal ───────────────────────────────────────────────────────
const Simulador = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" /> Simulador de producción
        </h1>
        <p className="text-sm text-muted-foreground">
          Simulador oficial (Excel) — ajusta parámetros para comparar escenarios
        </p>
      </div>

      <Tabs defaultValue="homogenea" className="w-full">
        <TabsList>
          <TabsTrigger value="homogenea">Volquetas homogéneas</TabsTrigger>
          <TabsTrigger value="mixta">Volquetas mixtas (1×14m³ + N×7m³)</TabsTrigger>
        </TabsList>
        <TabsContent value="homogenea" className="mt-4">
          <SimHomogenea />
        </TabsContent>
        <TabsContent value="mixta" className="mt-4">
          <SimMixta />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Simulador;
