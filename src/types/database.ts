export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string;
          email: string;
          nombre: string;
          rol: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          nombre: string;
          rol?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          nombre?: string;
          rol?: string;
          created_at?: string;
        };
      };
      ventas: {
        Row: {
          id: string;
          fecha: string;
          silice: string;
          recibo: string;
          placa: string;
          cantidad_m3: number;
          valor_total: number;
          fuente: string;
          concepto: string | null;
          tipo_transaccion: string;
          usuario_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          fecha: string;
          silice: string;
          recibo: string;
          placa: string;
          cantidad_m3: number;
          valor_total: number;
          fuente: string;
          concepto?: string | null;
          tipo_transaccion?: string;
          usuario_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          fecha?: string;
          silice?: string;
          recibo?: string;
          placa?: string;
          cantidad_m3?: number;
          valor_total?: number;
          fuente?: string;
          concepto?: string | null;
          tipo_transaccion?: string;
          usuario_id?: string | null;
          created_at?: string;
        };
      };
      acopios: {
        Row: {
          id: string;
          fecha: string;
          fuente: string;
          silice: string;
          placa: string;
          cantidad_viajes: number;
          usuario_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          fecha: string;
          fuente: string;
          silice: string;
          placa: string;
          cantidad_viajes: number;
          usuario_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          fecha?: string;
          fuente?: string;
          silice?: string;
          placa?: string;
          cantidad_viajes?: number;
          usuario_id?: string | null;
          created_at?: string;
        };
      };
      movimientos: {
        Row: {
          id: string;
          fecha: string;
          mina: string;
          silice: string;
          placa: string;
          origen: string;
          destino: string;
          cantidad_movimientos: number;
          notas: string | null;
          usuario_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          fecha: string;
          mina: string;
          silice: string;
          placa: string;
          origen: string;
          destino: string;
          cantidad_movimientos: number;
          notas?: string | null;
          usuario_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          fecha?: string;
          mina?: string;
          silice?: string;
          placa?: string;
          origen?: string;
          destino?: string;
          cantidad_movimientos?: number;
          notas?: string | null;
          usuario_id?: string | null;
          created_at?: string;
        };
      };
      volquetas: {
        Row: {
          id: string;
          placa: string;
          activa: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          placa: string;
          activa?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          placa?: string;
          activa?: boolean;
          created_at?: string;
        };
      };
    };
  };
}

// Tipos de conveniencia
export type Usuario = Database['public']['Tables']['usuarios']['Row'];
export type Venta = Database['public']['Tables']['ventas']['Row'];
export type Acopio = Database['public']['Tables']['acopios']['Row'];
export type Movimiento = Database['public']['Tables']['movimientos']['Row'];
export type Volqueta = Database['public']['Tables']['volquetas']['Row'];

export type VentaInsert = Database['public']['Tables']['ventas']['Insert'];
export type AcopioInsert = Database['public']['Tables']['acopios']['Insert'];
export type MovimientoInsert = Database['public']['Tables']['movimientos']['Insert'];

