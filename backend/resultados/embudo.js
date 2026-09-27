// Embudo de participación a partir de los eventos del recorrido (docs/PLAN, 8.7).
// Solo para el control de Juli. Son conteos aproximados: ver el plan.

/**
 * @param {object} encuesta
 * @param {{ evento: string, pregunta: string | null, n: number }[]} conteos - eventos agrupados
 * @param {number} completaron - filas guardadas en la tabla de respuestas
 */
export function embudo(encuesta, conteos, completaron) {
  const total = (evento) => conteos.filter((c) => c.evento === evento).reduce((s, c) => s + c.n, 0);
  const vieron = (id) => conteos.find((c) => c.evento === 'vio' && c.pregunta === id)?.n ?? 0;

  const pantallas = encuesta.preguntas.map((p) => ({
    id: p.id,
    texto: p.tipo === 'info' ? p.titulo : p.texto,
    // Las preguntas sin condición las ve todo el que sigue en la encuesta: sirven de punto
    // de control. Entre dos de ellas, la diferencia es la gente que se fue en ese tramo
    // (aunque en el medio haya una rama que no ve todo el mundo).
    comun: !p.visibleSi,
    vieron: vieron(p.id),
  }));

  const controles = [
    { texto: 'Aceptaron participar', n: total('acepto') },
    ...pantallas.filter((p) => p.comun).map((p) => ({ texto: p.texto, n: p.vieron })),
    { texto: 'Enviaron la encuesta', n: completaron },
  ];
  const tramos = controles.slice(1).map((hasta, i) => {
    const desde = controles[i];
    return { desde: desde.texto, hasta: hasta.texto, empezaron: desde.n, siguieron: hasta.n, seFueron: Math.max(0, desde.n - hasta.n) };
  });

  return {
    entraron: total('entro'),
    aceptaron: total('acepto'),
    noParticiparon: total('no_participa'),
    edadFueraDeRango: total('edad_fuera'),
    completaron,
    pantallas,
    tramos,
  };
}
