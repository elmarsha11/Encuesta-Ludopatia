// Dashboard de resultados. Dirección 1a «Renglones» (design/dashboard/HANDOFF.md).
//
// Todo llega ya calculado y protegido desde el servidor (/api/resultados/:encuesta):
// esta página solo dibuja. Las reglas de dibujo están en logica.js, con tests.
// Los textos se insertan como texto (h() nunca usa innerHTML).

import { h } from '/motor/dom.js';
import * as D from './logica.js';

const raiz = document.getElementById('raiz');

// Qué va en «Hallazgos principales» de cada encuesta, además del total.
const HALLAZGOS = {
  adultos: {
    apuesta: { id: 'aposto_12m', valores: ['si'], titulo: 'Apostó en los últimos 12 meses', complemento: { valores: ['no'], texto: 'No apostó' } },
    tercero: { tipo: 'pgsi', id: 'pgsi_categoria', titulo: 'Riesgo según el PGSI · quienes apostaron' },
  },
  adolescentes: {
    apuesta: {
      id: 'aposto_alguna_vez',
      valores: ['si_no_ultimo_anio', 'si_ultimo_anio'],
      titulo: 'Apostó alguna vez',
      complemento: { valores: ['nunca'], texto: 'Nunca apostó' },
    },
    tercero: { tipo: 'renglones', id: 'frecuencia_publicidad', titulo: 'Con qué frecuencia ven publicidad de apuestas' },
  },
};
const NOMBRE_ENCUESTA = { adultos: 'Encuesta de adultos', adolescentes: 'Encuesta de adolescentes' };
const NOMBRE_CORTO = { adultos: 'Adultos', adolescentes: 'Adolescentes' };
const TEXTO_OCULTO = 'Oculto para proteger el anonimato';
const NOTA_CAUSA = 'Muestra cómo se relacionan dos respuestas; no indica que una cause la otra.';

const estado = { sesion: null, encuesta: null, vista: 'resultados', datos: null, actualizado: null };

// --- Servidor -------------------------------------------------------------------------

async function pedir(ruta, opciones) {
  const res = await fetch(ruta, { credentials: 'same-origin', ...opciones });
  const datos = res.status === 204 ? null : await res.json().catch(() => null);
  return { status: res.status, datos };
}

async function iniciar() {
  try {
    const { status, datos } = await pedir('/api/sesion');
    if (status === 401) return pantallaAcceso();
    if (status !== 200) throw new Error(`HTTP ${status}`);
    abrir(datos);
  } catch {
    pantallaError(iniciar);
  }
}

function abrir(sesion) {
  estado.sesion = sesion;
  estado.encuesta = sesion.encuestas.includes(estado.encuesta) ? estado.encuesta : sesion.encuestas[0];
  if (!sesion.control) estado.vista = 'resultados';
  cargar();
}

async function cargar() {
  mostrar(h('p', { class: 'r-cargando' }, 'Cargando resultados…'));
  try {
    const { status, datos } = await pedir(`/api/resultados/${estado.encuesta}`);
    if (status === 401) return pantallaAcceso({ vencida: true });
    if (status !== 200) throw new Error(`HTTP ${status}`);
    estado.datos = datos;
    estado.actualizado = new Date();
    dibujar();
  } catch {
    pantallaError(cargar);
  }
}

async function salir() {
  await pedir('/api/salir', { method: 'POST' }).catch(() => {});
  Object.assign(estado, { sesion: null, datos: null });
  pantallaAcceso();
}

// --- Utilidades de dibujo --------------------------------------------------------------

function mostrar(...nodos) {
  dejarDeEspiar();
  raiz.classList.toggle('r-raiz--app', nodos[0]?.classList?.contains('r-app') ?? false);
  raiz.replaceChildren(...nodos);
  window.scrollTo(0, 0);
}

// --- Índice que acompaña el scroll -----------------------------------------------------
// Enciende el enlace de la sección que se está leyendo. Se escucha el scroll de la ventana
// (y no un IntersectionObserver) porque así la última sección, que suele ser corta y no
// llega a subir, también se enciende al llegar al fondo (D.seccionActiva).

let dejarDeEspiar = () => {};

function espiarIndice() {
  const indice = raiz.querySelector('.r-indice');
  if (!indice) return;
  const enlaces = [...indice.querySelectorAll('a[href^="#"]')];
  const objetivos = enlaces.map((a) => document.getElementById(a.getAttribute('href').slice(1)));
  let pendiente = false;
  let actual = null;

  const actualizar = () => {
    pendiente = false;
    const secciones = objetivos.map((el, i) => ({ id: i, arriba: el.getBoundingClientRect().top }));
    const alFondo = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    const activa = D.seccionActiva(secciones, { linea: window.innerHeight * 0.3, alFondo });
    if (activa === actual) return;
    actual = activa;
    enlaces.forEach((a, i) => (i === activa ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current')));
    mantenerALaVista(indice, enlaces[activa]);
  };
  // Como mucho un cálculo por cuadro, aunque el navegador dispare muchos eventos de scroll.
  const alMoverse = () => {
    if (!pendiente) {
      pendiente = true;
      requestAnimationFrame(actualizar);
    }
  };

  window.addEventListener('scroll', alMoverse, { passive: true });
  window.addEventListener('resize', alMoverse);
  actualizar();
  dejarDeEspiar = () => {
    window.removeEventListener('scroll', alMoverse);
    window.removeEventListener('resize', alMoverse);
    dejarDeEspiar = () => {};
  };
}

// Si el índice tiene su propio scroll (lista larga, o fila horizontal en el celular), lo
// mueve para que el enlace encendido se vea. Sin scrollIntoView: ese movería también la página.
function mantenerALaVista(indice, enlace) {
  const caja = indice.getBoundingClientRect();
  const e = enlace.getBoundingClientRect();
  if (e.top < caja.top) indice.scrollTop -= caja.top - e.top + 8;
  else if (e.bottom > caja.bottom) indice.scrollTop += e.bottom - caja.bottom + 8;
  if (e.left < caja.left) indice.scrollLeft -= caja.left - e.left + 8;
  else if (e.right > caja.right) indice.scrollLeft += e.right - caja.right + 8;
}

const rotulo = (texto) => h('p', { class: 'r-rotulo' }, texto);
const oculto = (texto = TEXTO_OCULTO) => h('span', { class: 'r-oculto' }, texto);
const conPct = (n, base) => `${D.pct(n, base)}%`;

// --- Pantallas: acceso, error ----------------------------------------------------------

function pantallaAcceso({ vencida = false } = {}) {
  const campo = h('input', { id: 'clave', class: 'campo', type: 'password', autocomplete: 'current-password', required: true });
  const error = h('div', { 'aria-live': 'assertive' });
  const boton = h('button', { type: 'submit', class: 'btn btn--primario' }, 'Ingresar');

  const enviar = async (e) => {
    e.preventDefault();
    error.replaceChildren();
    boton.disabled = true;
    try {
      const { status, datos } = await pedir('/api/acceso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave: campo.value }),
      });
      if (status === 200) return abrir(datos);
      const mensaje = status === 429 ? 'Demasiados intentos seguidos. Esperá unos minutos y probá de nuevo.' : 'Esa contraseña no es correcta.';
      error.append(h('p', { class: 'r-error', role: 'alert' }, mensaje));
      campo.select();
    } catch {
      error.append(h('p', { class: 'r-error', role: 'alert' }, 'No hay conexión con el servidor. Probá de nuevo en un momento.'));
    } finally {
      boton.disabled = false;
    }
  };

  mostrar(
    h(
      'main',
      { class: 'r-acceso' },
      rotulo('Resultados · Uso restringido'),
      h('h1', {}, vencida ? 'Tu sesión venció' : 'Ingresá la contraseña'),
      h(
        'p',
        { class: 'r-nota' },
        vencida
          ? 'Por seguridad, las sesiones duran unas horas. Volvé a ingresar la contraseña para seguir.'
          : 'Si no la tenés, pedísela a quien coordina el proyecto. Cada grupo tiene la suya y ve solo sus resultados.',
      ),
      h('form', { on: { submit: enviar } }, h('label', { for: 'clave' }, 'Contraseña'), campo, error, boton),
    ),
  );
  campo.focus();
}

function pantallaError(reintentar) {
  mostrar(
    h(
      'main',
      { class: 'r-estado', role: 'alert' },
      h('h1', {}, 'No pudimos conectarnos con el servidor'),
      h('p', {}, 'Revisá tu conexión a internet. Los resultados siguen guardados: probá de nuevo en un momento.'),
      h('button', { type: 'button', class: 'btn btn--primario', on: { click: reintentar } }, 'Probar de nuevo'),
    ),
  );
}

// --- Barra lateral y encabezado --------------------------------------------------------

/** Barra lateral: qué encuesta, qué vista, el índice (si lo hay) y las acciones. */
function lateral(indice) {
  const { sesion } = estado;
  const pestana = (texto, activa, accion) =>
    h('button', { type: 'button', class: 'r-pestana', 'aria-current': activa ? 'true' : 'false', on: { click: accion } }, texto);

  // Dos grupos separados: qué encuesta y qué vista. Mezclados en una fila no se entiende qué elige cada botón.
  const grupo = (etiqueta, botones) =>
    h('div', { class: 'r-selector' }, rotulo(etiqueta), h('div', { class: 'r-grupo', role: 'group', 'aria-label': etiqueta }, botones));
  const encuestas =
    sesion.encuestas.length > 1 &&
    grupo(
      'Encuesta',
      sesion.encuestas.map((id) =>
        pestana(NOMBRE_CORTO[id], id === estado.encuesta, () => {
          if (id === estado.encuesta) return;
          estado.encuesta = id;
          cargar();
        }),
      ),
    );
  const vistas =
    sesion.control &&
    grupo('Vista', [
      pestana('Resultados', estado.vista === 'resultados', () => cambiarVista('resultados')),
      pestana('Control', estado.vista === 'control', () => cambiarVista('control')),
    ]);

  return h(
    'aside',
    { class: 'r-lateral' },
    h('div', { class: 'r-marca' }, rotulo('Resultados'), h('p', { class: 'r-marca-nombre' }, sesion.nombre)),
    h('nav', { class: 'r-pestanas', 'aria-label': 'Encuesta y vista' }, encuestas, vistas),
    indice,
    h(
      'div',
      { class: 'r-acciones' },
      h('a', { class: 'r-accion r-accion--principal', href: `/api/exportar/${estado.encuesta}`, download: '' }, sesion.excelCompleto ? 'Descargar Excel completo' : 'Descargar Excel'),
      h('button', { type: 'button', class: 'r-accion', on: { click: () => window.print() } }, 'Imprimir'),
      h('button', { type: 'button', class: 'r-accion', on: { click: salir } }, 'Salir'),
    ),
  );
}

function cambiarVista(vista) {
  estado.vista = vista;
  dibujar();
}

function encabezado(datos) {
  const hora = estado.actualizado.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  return h(
    'header',
    { class: 'r-encabezado' },
    rotulo(`${estado.vista === 'control' ? 'Control de participación' : 'Resultados'} · ${NOMBRE_ENCUESTA[datos.encuesta]}`),
    h('h1', {}, datos.titulo),
    h('p', { class: 'r-sub' }, `${D.numero(datos.respuestas)} respuestas completas · actualizado a las ${hora}`),
    datos.umbral > 1
      ? h('p', { class: 'r-nota' }, `Las cantidades menores a ${datos.umbral} no se muestran, para proteger el anonimato.`)
      : h('p', { class: 'r-completa' }, 'Vista completa, sin cantidades ocultas: no compartas capturas de esta pantalla.'),
  );
}

// --- Componentes -------------------------------------------------------------------------

/** Anillo (conic-gradient). Solo se dibuja con todas las cantidades a la vista. */
function anillo(partes, base, etiqueta, centro) {
  return h(
    'div',
    { class: 'r-anillo', role: 'img', 'aria-label': etiqueta, estilo: { background: D.anillo(partes, base, 'var(--r-riel)') } },
    centro && h('span', { class: 'r-anillo-centro', 'aria-hidden': 'true' }, centro),
  );
}

/** Cabeza de una tarjeta de sección: número en un círculo de color y el título. */
const cabezaPanel = (numero, tono, titulo) =>
  h('div', { class: 'r-panel-cabeza' }, h('span', { class: `r-chip r-chip--${tono}`, 'aria-hidden': 'true' }, String(numero).padStart(2, '0')), titulo);

/** Renglones de una distribución: etiqueta, barra (escala absoluta sobre 100%), %, personas. */
function renglones(d) {
  return h(
    'div',
    { class: 'r-renglones' },
    d.celdas.map((c) =>
      h(
        'div',
        { class: 'r-renglon' },
        h('span', { class: 'r-renglon-texto' }, c.texto),
        c.oculto
          ? oculto()
          : [
              h('div', { class: 'r-pista', 'aria-hidden': 'true' }, h('div', { class: 'r-relleno', estilo: { width: `${D.pct(c.n, d.base)}%` } })),
              h('span', { class: 'r-pct' }, conPct(c.n, d.base)),
              h('span', { class: 'r-n' }, D.numero(c.n)),
            ],
      ),
    ),
  );
}

function pregunta(d) {
  const descripcion = d.tipo === 'multiple' ? 'podían elegir más de una: no suma 100%' : 'una respuesta por persona';
  return h(
    'article',
    { class: 'r-pregunta' },
    h(
      'div',
      { class: 'r-pregunta-cabeza' },
      h('h3', {}, d.texto),
      !d.oculto && h('p', { class: 'r-meta' }, `n = ${D.numero(d.base)} · ${descripcion}`),
    ),
    d.oculto
      ? h('p', { class: 'r-sin-datos' }, 'Menos de 5 personas respondieron esta pregunta: no se muestra, para proteger el anonimato.')
      : renglones(d),
  );
}

function cruce(c) {
  const titulo = h('h3', {}, `${c.resultado}, `, h('span', {}, `según ${D.minuscula(c.factor)}`));
  const base = (f) => (f.base === null ? 'n < 5' : `n = ${D.numero(f.base)}`);

  if (D.cruceCompletoOculto(c)) {
    return h(
      'article',
      { class: 'r-cruce' },
      titulo,
      h(
        'div',
        { class: 'r-cruce-oculto' },
        h('strong', {}, 'Este cruce no se muestra.'),
        h('p', {}, 'No hay suficientes respuestas en cada grupo para mostrarlo sin arriesgar el anonimato.'),
        h('div', { class: 'r-bases' }, c.filas.map((f) => h('span', {}, `${f.texto} · ${base(f)}`))),
      ),
    );
  }

  return h(
    'article',
    { class: 'r-cruce' },
    h(
      'div',
      {},
      titulo,
      h(
        'div',
        { class: 'r-cruce-leyenda' },
        h('span', {}, 'Se lee por fila: cada fila suma 100%.'),
        c.columnas.map((col, i) => h('span', {}, h('span', { class: `r-muestra r-seg-${i}`, 'aria-hidden': 'true' }), ` ${col.texto}`)),
      ),
    ),
    h(
      'div',
      {},
      c.filas.map((f) =>
        h(
          'div',
          { class: 'r-fila' },
          h('div', { class: 'r-fila-nombre' }, h('span', { class: 'r-renglon-texto' }, f.texto), h('span', { class: 'r-meta' }, base(f))),
          D.filaOculta(f)
            ? oculto()
            : h(
                'div',
                { class: 'r-dividida', role: 'img', 'aria-label': f.celdas.map((x) => `${x.texto}: ${conPct(x.n, f.base)} (${x.n})`).join('; ') },
                f.celdas.map((x, i) => {
                  const p = D.pct(x.n, f.base);
                  // Un segmento angosto no tiene lugar para su número: queda en el aria-label y en el título.
                  return h('span', { class: `r-segmento r-seg-${i}`, title: `${x.texto}: ${p}% (${x.n})`, estilo: { flexBasis: `${p}%`, flexGrow: '0' } }, p >= 8 ? `${p}%` : '');
                }),
              ),
        ),
      ),
    ),
  );
}

// --- Hallazgos -------------------------------------------------------------------------

function hallazgoApuesta(datos, conf) {
  const d = datos.distribuciones.find((x) => x.id === conf.id);
  const si = D.suma(d, conf.valores);
  const no = D.suma(d, conf.complemento.valores);
  const hijos = [rotulo(conf.titulo)];
  if (si.oculto) {
    hijos.push(h('p', { class: 'r-hallazgo-oculto' }, 'Oculto por anonimato'));
    if (!no.oculto) hijos.push(h('p', { class: 'r-texto' }, `${conf.complemento.texto}: `, h('b', {}, conPct(no.n, no.base)), ` · ${no.n} de ${no.base}.`));
  } else {
    hijos.push(
      h(
        'div',
        { class: 'r-kpi-fila' },
        h('div', {}, h('p', { class: 'r-hallazgo-cifra' }, conPct(si.n, si.base)), h('p', { class: 'r-texto' }, `${D.numero(si.n)} de ${D.numero(si.base)} personas`)),
        anillo([{ n: si.n, color: 'var(--color-acento)' }], si.base, `${conf.titulo}: ${conPct(si.n, si.base)}`),
      ),
    );
  }
  return h('div', { class: 'r-hallazgo r-kpi r-kpi--acento' }, hijos);
}

function hallazgoTercero(datos, conf) {
  const d = datos.distribuciones.find((x) => x.id === conf.id);
  const cabeza = h('div', { class: 'r-hallazgo-cabeza' }, rotulo(conf.titulo), d && !d.oculto && conf.tipo !== 'pgsi' && h('p', { class: 'r-meta' }, `n = ${d.base}`));
  if (!d || d.oculto) {
    return h('div', { class: 'r-hallazgo r-kpi r-kpi--ancha r-kpi--terracota' }, cabeza, h('p', { class: 'r-hallazgo-oculto' }, 'Menos de 5 respuestas: no se muestra'));
  }
  // PGSI: anillo solo si no hay categorías ocultas (la porción que falta revelaría el valor).
  if (conf.tipo === 'pgsi' && D.apilable(d)) {
    return h(
      'div',
      { class: 'r-hallazgo r-kpi r-kpi--ancha r-kpi--terracota' },
      cabeza,
      h(
        'div',
        { class: 'r-kpi-fila r-kpi-fila--pgsi' },
        anillo(d.celdas.map((c, i) => ({ n: c.n, color: `var(--pgsi-${i})` })), d.base, D.resumenAccesible(d), `n = ${d.base}`),
        h(
          'div',
          { class: 'r-leyenda' },
          d.celdas.map((c, i) =>
            h(
              'div',
              { class: 'r-leyenda-item' },
              h('span', { class: 'r-leyenda-nombre' }, h('span', { class: `r-muestra r-pgsi-${i}`, 'aria-hidden': 'true' }), c.texto),
              h('span', { class: 'r-leyenda-pct' }, conPct(c.n, d.base)),
              h('span', { class: 'r-meta' }, `${c.n} ${c.n === 1 ? 'persona' : 'personas'}`),
            ),
          ),
        ),
      ),
    );
  }
  return h('div', { class: 'r-hallazgo r-kpi r-kpi--ancha r-kpi--terracota' }, cabeza, renglones(d));
}

// --- Vistas ------------------------------------------------------------------------------

function vistaResultados(datos) {
  if (datos.respuestas === 0) {
    return {
      indice: null,
      contenido: h(
        'div',
        { class: 'r-estado' },
        h('h2', {}, 'Todavía no hay respuestas'),
        h('p', {}, 'Cuando alguien complete la encuesta, sus resultados van a aparecer acá.'),
      ),
    };
  }
  const conf = HALLAZGOS[datos.encuesta];
  const secciones = D.porSeccion(datos);
  const temas = D.crucesPorTema(datos);
  const enlace = (id, texto) =>
    h('a', { href: `#${id}`, on: { click: (e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); } } }, texto);

  const indice = h(
    'nav',
    { class: 'r-indice', 'aria-label': 'Índice de secciones' },
    rotulo('Resumen'),
    enlace('hallazgos', 'Hallazgos principales'),
    temas.length > 0 && [rotulo('Cruces'), temas.map((t, i) => enlace(`tema-${i}`, t.titulo))],
    rotulo('Todas las preguntas'),
    secciones.map((s) => enlace(`seccion-${s.id}`, s.titulo)),
  );

  const contenido = h(
    'div',
    { class: 'r-contenido' },
    h(
      'section',
      { class: 'r-bloque', id: 'hallazgos', 'aria-labelledby': 'hallazgos-t' },
      h('h2', { id: 'hallazgos-t' }, 'Hallazgos principales'),
      h(
        'div',
        { class: 'r-hallazgos' },
        h(
          'div',
          { class: 'r-hallazgo r-kpi r-kpi--tinta' },
          rotulo('Respondieron'),
          h('p', { class: 'r-hallazgo-cifra' }, D.numero(datos.respuestas)),
          h('p', { class: 'r-texto' }, 'encuestas completas'),
        ),
        hallazgoApuesta(datos, conf.apuesta),
        hallazgoTercero(datos, conf.tercero),
      ),
    ),
    temas.length > 0 &&
      h(
        'section',
        { class: 'r-bloque', 'aria-label': 'Cruces' },
        h('h2', {}, 'Cruces'),
        h('p', { class: 'r-aviso-fondo' }, NOTA_CAUSA),
        temas.map((t, i) =>
          h('div', { class: 'r-bloque r-panel', id: `tema-${i}` }, cabezaPanel(i + 1, 'terracota', h('p', { class: 'r-panel-titulo' }, t.titulo)), t.cruces.map(cruce)),
        ),
      ),
    h('p', { class: 'r-rotulo r-separador' }, 'Todas las preguntas'),
    secciones.map((s, i) =>
      h(
        'section',
        { class: 'r-bloque r-panel', id: `seccion-${s.id}`, 'aria-labelledby': `seccion-${s.id}-t` },
        cabezaPanel(i + 1, 'acento', h('h2', { id: `seccion-${s.id}-t` }, s.titulo)),
        s.preguntas.map(pregunta),
      ),
    ),
  );

  return { indice, contenido };
}

function vistaControl(datos) {
  const e = datos.control.embudo;
  const tarjeta = (cifra, texto, tono = 'tinta') =>
    h('div', { class: `r-tarjeta r-kpi r-kpi--${tono}` }, h('span', { class: 'r-tarjeta-cifra' }, cifra), h('span', { class: 'r-tarjeta-texto' }, texto));
  const terminaron = e.aceptaron > 0 ? `${D.pct(e.completaron, e.aceptaron)}%` : '—';

  const tramos = e.tramos.filter((t) => t.seFueron > 0);
  const mayor = D.tramoMayor(e.tramos);
  const maximo = Math.max(1, ...tramos.map((t) => t.seFueron));
  const maxDia = Math.max(1, ...datos.control.porDia.map((d) => d.entraron));

  return h(
    'div',
    { class: 'r-control' },
    h(
      'section',
      { class: 'r-bloque' },
      h('h2', {}, 'Participación'),
      h(
        'div',
        { class: 'r-tarjetas' },
        tarjeta(D.numero(e.entraron), 'entraron a la portada'),
        tarjeta(D.numero(e.noParticiparon), 'dijeron que no'),
        tarjeta(D.numero(e.aceptaron), 'aceptaron participar'),
        tarjeta(D.numero(e.completaron), 'enviaron la encuesta', 'acento'),
        tarjeta(terminaron, 'de quienes aceptaron, terminaron', 'acento'),
        tarjeta(D.numero(e.edadFueraDeRango), 'pusieron una edad fuera de rango (¿QR equivocado?)', 'terracota'),
      ),
      h('p', { class: 'r-nota' }, 'Conteos aproximados: quien abre la encuesta en dos celulares cuenta dos veces.'),
    ),
    h(
      'section',
      { class: 'r-bloque r-panel' },
      h('h2', {}, 'Dónde se va la gente'),
      tramos.length === 0
        ? h('p', { class: 'r-sin-datos' }, 'Nadie abandonó a mitad de camino, por ahora.')
        : h(
            'div',
            {},
            tramos.map((t) =>
              h(
                'div',
                { class: `r-tramo${t === mayor ? ' r-tramo--mayor' : ''}` },
                h('span', { class: 'r-tramo-texto' }, 'Entre ', h('b', {}, `«${t.desde}»`), ' y ', h('b', {}, `«${t.hasta}»`)),
                h('span', { class: 'r-n', 'aria-label': `${t.seFueron} se fueron` }, D.numero(t.seFueron)),
                h('div', { class: 'r-pista', 'aria-hidden': 'true' }, h('div', { class: 'r-relleno', estilo: { width: `${(100 * t.seFueron) / maximo}%` } })),
              ),
            ),
          ),
      mayor && h('p', { class: 'r-nota' }, `El tramo con más abandonos está resaltado. Si es una pregunta sensible, puede convenir revisarla después de la prueba piloto.`),
    ),
    h(
      'section',
      { class: 'r-bloque r-panel' },
      h('h2', {}, 'Por día'),
      datos.control.porDia.length === 0
        ? h('p', { class: 'r-sin-datos' }, 'Todavía no hay actividad.')
        : h(
            'div',
            {},
            datos.control.porDia.map((d) =>
              h(
                'div',
                { class: 'r-dia' },
                h('span', {}, new Date(`${d.fecha}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'numeric' })),
                h(
                  'div',
                  { class: 'r-pista', 'aria-hidden': 'true' },
                  h('div', { class: 'r-relleno--entraron', estilo: { width: `${(100 * d.entraron) / maxDia}%` } }),
                  h('div', { class: 'r-relleno--enviaron', estilo: { width: `${(100 * d.completaron) / maxDia}%` } }),
                ),
                h('span', { class: 'r-meta' }, `${d.completaron} de ${d.entraron}`),
              ),
            ),
          ),
      h('p', { class: 'r-nota' }, 'Barra clara: entraron. Barra oscura: enviaron la encuesta.'),
    ),
  );
}

function dibujar() {
  const { datos } = estado;
  document.title = `Resultados · ${NOMBRE_ENCUESTA[datos.encuesta]}`;
  const { indice, contenido } =
    estado.vista === 'control' && datos.control ? { indice: null, contenido: vistaControl(datos) } : vistaResultados(datos);
  mostrar(h('div', { class: 'r-app' }, lateral(indice), h('main', { class: 'r-principal' }, encabezado(datos), contenido)));
  espiarIndice();
}

iniciar();
