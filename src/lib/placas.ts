/**
 * Formato de placa de volqueta: 3 letras seguidas de 3 dígitos (ej. SWR157).
 *
 * Vive aquí, y no dentro de un hook, porque lo usan tanto los formularios de
 * ventas (donde la placa se escribe libre) como los de acopios y movimientos
 * (donde se elige de una lista). El histórico importado tiene placas que no
 * cumplen —"<", "CAB 917", "SP}M693"— y esta validación es lo que evita que se
 * sigan creando.
 */
export const PLACA_REGEX = /^[A-Z]{3}[0-9]{3}$/;

export const validarPlaca = (placa: string): boolean => PLACA_REGEX.test(placa);

/**
 * Fuerza el formato mientras se escribe: mayúsculas, sin símbolos, y cada
 * posición solo acepta el tipo de carácter que le corresponde.
 */
export const formatearPlaca = (valor: string): string => {
  const limpio = valor.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const letras = limpio.slice(0, 3).replace(/[^A-Z]/g, '');
  const numeros = limpio.slice(3, 6).replace(/[^0-9]/g, '');
  return letras + numeros;
};
