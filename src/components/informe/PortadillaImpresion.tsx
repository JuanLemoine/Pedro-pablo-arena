/**
 * Lámina separadora, como las del reporte de gestión en PowerPoint: una hoja
 * con el nombre del bloque y lo que se va a responder en él. Solo existe al
 * imprimir; en pantalla el informe va corrido.
 */
const PortadillaImpresion = ({
  numero,
  titulo,
  bajada,
}: {
  numero: string;
  titulo: string;
  bajada: string;
}) => (
  <div className="solo-impresion lamina-separadora">
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">{numero}</p>
      <h2 className="mt-3 font-display text-5xl font-bold leading-tight text-white">{titulo}</h2>
      <p className="mt-4 max-w-3xl text-lg leading-relaxed text-white/70">{bajada}</p>
    </div>
  </div>
);

export default PortadillaImpresion;
