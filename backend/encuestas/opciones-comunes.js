// Listas de opciones que se repiten en varias preguntas.
// `valor` es lo que viaja por la red y se guarda en la base (sin tildes ni espacios);
// `texto` es lo que ve la persona que responde.

export const SI_NO = [
  { valor: 'si', texto: 'Sí' },
  { valor: 'no', texto: 'No' },
];

export const SI_NO_NOSE = [...SI_NO, { valor: 'no_se', texto: 'No sé' }];

// Escala de acuerdo 1 a 5 usada en la encuesta de adolescentes.
export const ACUERDO_1_A_5 = {
  min: 1,
  max: 5,
  etiquetas: { 1: 'Nada de acuerdo', 5: 'Totalmente de acuerdo' },
};
