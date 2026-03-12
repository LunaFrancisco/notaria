/**
 * CLI-compatible contract data type.
 * Mirror of cli/src/tramites/vehiculos/compraventa/types.ts
 */

export interface CompraventaVehiculoData {
  vendedor: {
    nombre: string | null;
    rut: string | null;
    estado_civil: string | null;
    domicilio: string | null;
    telefono: string | null;
    nacionalidad: string | null;
  };
  comprador: {
    nombre: string | null;
    rut: string | null;
    estado_civil: string | null;
    domicilio: string | null;
    telefono: string | null;
    correo: string | null;
    nacionalidad: string | null;
  };
  vehiculo: {
    inscripcion: string | null;
    tipo: string | null;
    anio: string | null;
    marca: string | null;
    modelo: string | null;
    nro_motor: string | null;
    nro_chasis: string | null;
    color: string | null;
  };
  negocio: {
    precio_numero: string | null;
    precio_palabras: string | null;
    modalidad_pago: string | null;
  };
  tramite: {
    ciudad: string | null;
    dia: string | null;
    mes: string | null;
    anio: string | null;
    repertorio: string | null;
    fecha_certificado_dominio: string | null;
    comuna_permiso_circulacion: string | null;
  };
  deuda: {
    vendedor_sin_deuda: boolean | null;
    comprador_sin_deuda: boolean | null;
    fecha_consulta_vendedor: string | null;
    fecha_consulta_comprador: string | null;
  };
}

export function emptyCompraventaData(): CompraventaVehiculoData {
  return {
    vendedor: {
      nombre: null, rut: null, estado_civil: null,
      domicilio: null, telefono: null, nacionalidad: null,
    },
    comprador: {
      nombre: null, rut: null, estado_civil: null,
      domicilio: null, telefono: null, correo: null, nacionalidad: null,
    },
    vehiculo: {
      inscripcion: null, tipo: null, anio: null, marca: null,
      modelo: null, nro_motor: null, nro_chasis: null, color: null,
    },
    negocio: {
      precio_numero: null, precio_palabras: null, modalidad_pago: null,
    },
    tramite: {
      ciudad: null, dia: null, mes: null, anio: null,
      repertorio: null, fecha_certificado_dominio: null,
      comuna_permiso_circulacion: null,
    },
    deuda: {
      vendedor_sin_deuda: null, comprador_sin_deuda: null,
      fecha_consulta_vendedor: null, fecha_consulta_comprador: null,
    },
  };
}
