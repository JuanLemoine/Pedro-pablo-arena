import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, ArrowLeftRight, ArrowUp, ArrowDown, Mountain, Truck } from 'lucide-react';
import { toast } from 'sonner';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Movimiento {
  id: number;
  fecha: string;
  mina: string;
  silice: string;
  placa: string;
  origen: string;
  destino: string;
  notas: string;
}

const MINAS = [
  'MINA ROZO',
  'MINA MARLEN TINJACA',
  'MINA SOTO',
  'MINA TINJACA',
  'MINA GLADIS',
];

const SILICES = ['Silice A - Peña', 'Silice B - Pozo'];

const PLACAS = [
  'SAB643', 'OAJ577', 'ELJ809', 'CQN427', 'ACJ359', 'FBH108', 'SBC690', 'SWQ244',
  'WCS071', 'AAD005', 'XGJ399', 'SKH366', 'SVM306', 'SNZ091', 'XKJ180', 'ATA644',
  'IYB806', 'XKJ802', 'SNE194', 'SPM693', 'MBG720', 'XFJ040', 'SBE944', 'AQJ946'
];

const ORIGENES = ['Residuos', 'Punto de excavación'];

const DESTINOS = ['Trituradora', 'Repaso', 'Clasificadora', 'Zaranda'];

const movimientosIniciales: Movimiento[] = [
  { id: 1, fecha: '2024-01-15', mina: 'MINA ROZO', silice: 'Silice A - Peña', placa: 'SAB643', origen: 'Punto de excavación', destino: 'Trituradora', notas: 'Carga completa' },
  { id: 2, fecha: '2024-01-14', mina: 'MINA SOTO', silice: 'Silice B - Pozo', placa: 'OAJ577', origen: 'Residuos', destino: 'Clasificadora', notas: 'Entrega programada' },
  { id: 3, fecha: '2024-01-14', mina: 'MINA TINJACA', silice: 'Silice A - Peña', placa: 'ELJ809', origen: 'Punto de excavación', destino: 'Zaranda', notas: 'Reabastecimiento' },
];

const Movimientos = () => {
  const [movimientos, setMovimientos] = useState<Movimiento[]>(movimientosIniciales);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [openPlaca, setOpenPlaca] = useState(false);
  const [placaSearch, setPlacaSearch] = useState('');
  const [formData, setFormData] = useState({
    mina: '',
    silice: '',
    placa: '',
    origen: '',
    destino: '',
    notas: '',
  });

  const filteredPlacas = PLACAS.filter(placa =>
    placa.toLowerCase().includes(placaSearch.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.mina || !formData.silice || !formData.placa || !formData.origen || !formData.destino) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }

    const nuevoMovimiento: Movimiento = {
      id: movimientos.length + 1,
      fecha: new Date().toISOString().split('T')[0],
      mina: formData.mina,
      silice: formData.silice,
      placa: formData.placa,
      origen: formData.origen,
      destino: formData.destino,
      notas: formData.notas,
    };

    setMovimientos([nuevoMovimiento, ...movimientos]);
    setFormData({ mina: '', silice: '', placa: '', origen: '', destino: '', notas: '' });
    setPlacaSearch('');
    setShowForm(false);
    toast.success('Movimiento registrado exitosamente');
  };

  const filteredMovimientos = movimientos.filter(mov =>
    mov.mina.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mov.silice.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mov.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mov.origen.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mov.destino.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMinaBadge = (mina: string) => {
    const colors: Record<string, string> = {
      'MINA ROZO': 'bg-amber-100 text-amber-700 border-amber-200',
      'MINA MARLEN TINJACA': 'bg-purple-100 text-purple-700 border-purple-200',
      'MINA SOTO': 'bg-blue-100 text-blue-700 border-blue-200',
      'MINA TINJACA': 'bg-green-100 text-green-700 border-green-200',
      'MINA GLADIS': 'bg-pink-100 text-pink-700 border-pink-200',
    };
    return (
      <Badge variant="outline" className={`${colors[mina] || 'bg-gray-100 text-gray-700'} gap-1`}>
        <Mountain className="h-3 w-3" />
        {mina}
      </Badge>
    );
  };

  const getSiliceBadge = (silice: string) => {
    const isA = silice.includes('A');
    return (
      <Badge variant="outline" className={isA ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-cyan-100 text-cyan-700 border-cyan-200'}>
        {silice}
      </Badge>
    );
  };

  const getOrigenBadge = (origen: string) => {
    const isResiduos = origen === 'Residuos';
    return (
      <Badge variant="outline" className={isResiduos ? 'bg-red-100 text-red-700 border-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}>
        {origen}
      </Badge>
    );
  };

  const getDestinoBadge = (destino: string) => {
    const colors: Record<string, string> = {
      'Trituradora': 'bg-slate-100 text-slate-700 border-slate-200',
      'Repaso': 'bg-indigo-100 text-indigo-700 border-indigo-200',
      'Clasificadora': 'bg-teal-100 text-teal-700 border-teal-200',
      'Zaranda': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    };
    return (
      <Badge variant="outline" className={colors[destino] || 'bg-gray-100 text-gray-700'}>
        {destino}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Movimientos Internos</h1>
          <p className="text-muted-foreground mt-1">Registra movimientos de material entre áreas</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Movimiento
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-card bg-amber-50 border-amber-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Mountain className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-amber-700">Minas Activas</p>
              <p className="text-2xl font-bold text-amber-800">{MINAS.length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-card bg-blue-50 border-blue-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Truck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-700">Volquetas Registradas</p>
              <p className="text-2xl font-bold text-blue-800">{PLACAS.length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-card bg-green-50 border-green-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <ArrowLeftRight className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-green-700">Movimientos Hoy</p>
              <p className="text-2xl font-bold text-green-800">{movimientos.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="shadow-card animate-slide-up border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Registrar Movimiento</CardTitle>
            <CardDescription>Complete los datos del movimiento interno</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mina">Mina *</Label>
                <Select
                  value={formData.mina}
                  onValueChange={(value) => setFormData({ ...formData, mina: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione mina" />
                  </SelectTrigger>
                  <SelectContent>
                    {MINAS.map((mina) => (
                      <SelectItem key={mina} value={mina}>{mina}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="silice">Sílice *</Label>
                <Select
                  value={formData.silice}
                  onValueChange={(value) => setFormData({ ...formData, silice: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione sílice" />
                  </SelectTrigger>
                  <SelectContent>
                    {SILICES.map((silice) => (
                      <SelectItem key={silice} value={silice}>{silice}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="placa">Placa *</Label>
                <Popover open={openPlaca} onOpenChange={setOpenPlaca}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openPlaca}
                      className="w-full justify-between font-normal"
                    >
                      {formData.placa || "Seleccione placa..."}
                      <Truck className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 bg-popover border shadow-lg" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Buscar placa..." 
                        value={placaSearch}
                        onValueChange={setPlacaSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No se encontró la placa.</CommandEmpty>
                        <CommandGroup>
                          {filteredPlacas.map((placa) => (
                            <CommandItem
                              key={placa}
                              value={placa}
                              onSelect={() => {
                                setFormData({ ...formData, placa });
                                setOpenPlaca(false);
                                setPlacaSearch('');
                              }}
                              className="cursor-pointer"
                            >
                              <Truck className="mr-2 h-4 w-4" />
                              {placa}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="origen">Origen *</Label>
                <Select
                  value={formData.origen}
                  onValueChange={(value) => setFormData({ ...formData, origen: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORIGENES.map((origen) => (
                      <SelectItem key={origen} value={origen}>{origen}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="destino">Destino *</Label>
                <Select
                  value={formData.destino}
                  onValueChange={(value) => setFormData({ ...formData, destino: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {DESTINOS.map((destino) => (
                      <SelectItem key={destino} value={destino}>{destino}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notas">Notas adicionales</Label>
                <Textarea
                  id="notas"
                  placeholder="Observaciones..."
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  rows={2}
                />
              </div>
              
              <div className="md:col-span-2 lg:col-span-3 flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Guardar Movimiento</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-primary" />
                Historial de Movimientos
              </CardTitle>
              <CardDescription>{filteredMovimientos.length} registros encontrados</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar movimientos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mina</TableHead>
                  <TableHead>Sílice</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Destino</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovimientos.map((mov) => (
                  <TableRow key={mov.id} className="hover:bg-muted/30">
                    <TableCell>{getMinaBadge(mov.mina)}</TableCell>
                    <TableCell>{getSiliceBadge(mov.silice)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200 gap-1">
                        <Truck className="h-3 w-3" />
                        {mov.placa}
                      </Badge>
                    </TableCell>
                    <TableCell>{getOrigenBadge(mov.origen)}</TableCell>
                    <TableCell>{getDestinoBadge(mov.destino)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Movimientos;
