/**
 * Contract HTML template for "Compraventa de Vehículo Motorizado".
 *
 * Each placeholder uses a <span> with class="contract-placeholder"
 * and data-field="section.field" for DOM binding.
 *
 * The template is rendered via dangerouslySetInnerHTML initially,
 * then updated via DOM refs for performance (US-007).
 */

function placeholder(field: string, label: string): string {
  return `<span class="contract-placeholder" data-field="${field}" data-filled="false" data-confidence="low" data-source="manual" tabindex="0">[${label}]</span>`;
}

export function getContractTemplate(): string {
  const p = placeholder;

  return `
<div class="contract-content" style="font-family: Arial, Helvetica, sans-serif; line-height: 2; color: #1a1a1a;">

  <h2 style="text-align: center; font-size: 1.25rem; font-weight: bold; margin-bottom: 0.5rem;">
    CONTRATO DE COMPRAVENTA DE VEHÍCULO MOTORIZADO
  </h2>

  <p style="text-align: center; margin-bottom: 2rem; font-style: italic;">
    Repertorio N° ${p('tramite.repertorio', 'N° Repertorio')}
  </p>

  <p>
    En ${p('tramite.ciudad', 'Ciudad')}, a ${p('tramite.dia', 'Día')} de ${p('tramite.mes', 'Mes')} de ${p('tramite.anio', 'Año')},
    ante mí, Notario Público, comparecen:
  </p>

  <h3 style="font-size: 1.1rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">
    VENDEDOR
  </h3>

  <p>
    Don/Doña ${p('vendedor.nombre', 'Nombre vendedor')},
    ${p('vendedor.nacionalidad', 'Nacionalidad')},
    ${p('vendedor.estado_civil', 'Estado civil')},
    cédula de identidad N° ${p('vendedor.rut', 'RUT vendedor')},
    domiciliado/a en ${p('vendedor.domicilio', 'Domicilio vendedor')},
    teléfono ${p('vendedor.telefono', 'Teléfono vendedor')},
    en adelante <strong>"el Vendedor"</strong>;
  </p>

  <h3 style="font-size: 1.1rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">
    COMPRADOR
  </h3>

  <p>
    Don/Doña ${p('comprador.nombre', 'Nombre comprador')},
    ${p('comprador.nacionalidad', 'Nacionalidad')},
    ${p('comprador.estado_civil', 'Estado civil')},
    cédula de identidad N° ${p('comprador.rut', 'RUT comprador')},
    domiciliado/a en ${p('comprador.domicilio', 'Domicilio comprador')},
    teléfono ${p('comprador.telefono', 'Teléfono comprador')},
    correo electrónico ${p('comprador.correo', 'Correo comprador')},
    en adelante <strong>"el Comprador"</strong>;
  </p>

  <p style="margin-top: 1.5rem;">
    Quienes exponen que han convenido en celebrar el siguiente contrato de compraventa:
  </p>

  <h3 style="font-size: 1.1rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">
    PRIMERO: ANTECEDENTES DEL VEHÍCULO
  </h3>

  <p>
    El Vendedor es dueño del vehículo motorizado, individualizado como sigue:
  </p>

  <ul style="list-style: none; padding-left: 1.5rem; margin: 0.5rem 0;">
    <li><strong>Patente:</strong> ${p('vehiculo.patente', 'Patente')}</li>
    <li><strong>Inscripción:</strong> ${p('vehiculo.inscripcion', 'Inscripción')}</li>
    <li><strong>Tipo:</strong> ${p('vehiculo.tipo', 'Tipo vehículo')}</li>
    <li><strong>Marca:</strong> ${p('vehiculo.marca', 'Marca')}</li>
    <li><strong>Modelo:</strong> ${p('vehiculo.modelo', 'Modelo')}</li>
    <li><strong>Año:</strong> ${p('vehiculo.anio', 'Año')}</li>
    <li><strong>Color:</strong> ${p('vehiculo.color', 'Color')}</li>
    <li><strong>N° Motor:</strong> ${p('vehiculo.nro_motor', 'N° Motor')}</li>
    <li><strong>N° Chasis:</strong> ${p('vehiculo.nro_chasis', 'N° Chasis')}</li>
    <li><strong>Propietario inscrito:</strong> ${p('vehiculo.propietario', 'Propietario')}</li>
  </ul>

  <p>
    Según consta en el Certificado de Inscripción y Anotaciones Vigentes del Registro Nacional de Vehículos
    Motorizados, de fecha ${p('tramite.fecha_certificado_dominio', 'Fecha certificado')}.
  </p>

  <h3 style="font-size: 1.1rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">
    SEGUNDO: COMPRAVENTA
  </h3>

  <p>
    Por el presente instrumento, el Vendedor vende, cede y transfiere al Comprador, quien compra y acepta
    para sí, el vehículo motorizado antes individualizado, en el precio y forma de pago que se indica a continuación.
  </p>

  <h3 style="font-size: 1.1rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">
    TERCERO: PRECIO Y FORMA DE PAGO
  </h3>

  <p>
    El precio de la compraventa es la suma de <strong>$${p('negocio.precio_numero', 'Precio')}</strong>
    (${p('negocio.precio_palabras', 'Precio en palabras')} pesos),
    que se pagará mediante ${p('negocio.modalidad_pago', 'Modalidad de pago')}.
  </p>

  <h3 style="font-size: 1.1rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">
    CUARTO: DECLARACIONES
  </h3>

  <p>
    El Vendedor declara que el vehículo se encuentra libre de todo gravamen, prohibición, embargo y litigio pendiente.
  </p>

  <p>
    El permiso de circulación se encuentra vigente, emitido en la comuna de
    ${p('tramite.comuna_permiso_circulacion', 'Comuna')}, período ${p('tramite.permiso_periodo', 'Período')},
    con vigencia ${p('tramite.permiso_vigencia', 'Vigencia')}.
  </p>

  <h3 style="font-size: 1.1rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">
    QUINTO: CERTIFICADOS DE DEUDA ALIMENTARIA
  </h3>

  <p>
    De conformidad con lo dispuesto en la Ley N° 21.389, se ha verificado que:
  </p>

  <ul style="list-style: disc; padding-left: 2rem; margin: 0.5rem 0;">
    <li>
      El Vendedor (${p('vendedor.rut', 'RUT vendedor')}):
      ${p('deuda.vendedor_sin_deuda', 'Sin deuda alimentaria')}
      — consultado el ${p('deuda.fecha_consulta_vendedor', 'Fecha consulta')}.
    </li>
    <li>
      El Comprador (${p('comprador.rut', 'RUT comprador')}):
      ${p('deuda.comprador_sin_deuda', 'Sin deuda alimentaria')}
      — consultado el ${p('deuda.fecha_consulta_comprador', 'Fecha consulta')}.
    </li>
  </ul>

  <h3 style="font-size: 1.1rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">
    SEXTO: CLÁUSULA FINAL
  </h3>

  <p>
    Las partes firman el presente contrato en señal de conformidad, previa lectura y ratificación.
  </p>

  <div style="display: flex; justify-content: space-between; margin-top: 3rem; padding: 0 2rem;">
    <div style="text-align: center;">
      <div style="border-top: 1px solid #333; width: 200px; margin: 0 auto;"></div>
      <p style="margin-top: 0.5rem;"><strong>EL VENDEDOR</strong></p>
      <p>${p('vendedor.nombre', 'Nombre vendedor')}</p>
      <p>RUT: ${p('vendedor.rut', 'RUT vendedor')}</p>
    </div>
    <div style="text-align: center;">
      <div style="border-top: 1px solid #333; width: 200px; margin: 0 auto;"></div>
      <p style="margin-top: 0.5rem;"><strong>EL COMPRADOR</strong></p>
      <p>${p('comprador.nombre', 'Nombre comprador')}</p>
      <p>RUT: ${p('comprador.rut', 'RUT comprador')}</p>
    </div>
  </div>

</div>
`;
}

/**
 * All unique field paths referenced in the template.
 * Used to validate field bindings and ensure no orphan placeholders.
 */
export const TEMPLATE_FIELD_PATHS: string[] = [
  'tramite.repertorio',
  'tramite.ciudad',
  'tramite.dia',
  'tramite.mes',
  'tramite.anio',
  'vendedor.nombre',
  'vendedor.nacionalidad',
  'vendedor.estado_civil',
  'vendedor.rut',
  'vendedor.domicilio',
  'vendedor.telefono',
  'comprador.nombre',
  'comprador.nacionalidad',
  'comprador.estado_civil',
  'comprador.rut',
  'comprador.domicilio',
  'comprador.telefono',
  'comprador.correo',
  'vehiculo.patente',
  'vehiculo.inscripcion',
  'vehiculo.tipo',
  'vehiculo.marca',
  'vehiculo.modelo',
  'vehiculo.anio',
  'vehiculo.color',
  'vehiculo.nro_motor',
  'vehiculo.nro_chasis',
  'vehiculo.propietario',
  'tramite.fecha_certificado_dominio',
  'negocio.precio_numero',
  'negocio.precio_palabras',
  'negocio.modalidad_pago',
  'tramite.comuna_permiso_circulacion',
  'tramite.permiso_periodo',
  'tramite.permiso_vigencia',
  'deuda.vendedor_sin_deuda',
  'deuda.comprador_sin_deuda',
  'deuda.fecha_consulta_vendedor',
  'deuda.fecha_consulta_comprador',
];
