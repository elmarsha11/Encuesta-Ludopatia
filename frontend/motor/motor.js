// Motor de la encuesta: dibuja cada pantalla a partir de la definición que entrega
// el backend (GET /api/encuestas/:id) y envía las respuestas (POST /api/respuestas/:id).
//
// Traducido a JavaScript sin framework desde los prototipos de Claude Design
// (design/adolescentes/ y design/adultos/). El aspecto sale 100% del CSS del tema:
// acá solo se arman elementos con las clases que ese CSS define. Qué componente se
// dibuja depende de la forma de cada pregunta, nunca del nombre de la encuesta.
//
// Seguridad: todo texto se inserta con textContent (nunca innerHTML), así un texto
// jamás puede ejecutar código. Los estilos dinámicos se ponen con element.style,
// que la política de seguridad (CSP) del servidor permite.

import * as L from './logica.js';
import { h } from './dom.js';

const NBSP = ' ';

// Íconos: trazos SVG del prototipo.
const ICONOS = {
  check: { tam: 14, trazo: 3.2, formas: [['path', { d: 'M20 6L9 17l-5-5' }]] },
  siguiente: { tam: 20, trazo: 2.4, formas: [['path', { d: 'M9 18l6-6-6-6' }]] },
  atras: { tam: 22, trazo: 2.2, formas: [['path', { d: 'M15 18l-6-6 6-6' }]] },
  info: {
    tam: 20,
    trazo: 2.2,
    formas: [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: 'M12 11v5' }], ['path', { d: 'M12 8h.01' }]],
  },
  telefono: {
    tam: 18,
    trazo: 2,
    formas: [
      [
        'path',
        {
          d: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z',
        },
      ],
    ],
  },
};

function icono(nombre) {
  const { tam, trazo, formas } = ICONOS[nombre];
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const atributos = {
    'aria-hidden': 'true',
    width: tam,
    height: tam,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': trazo,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  };
  for (const [k, v] of Object.entries(atributos)) svg.setAttribute(k, v);
  for (const [tipo, attrs] of formas) {
    const forma = document.createElementNS(ns, tipo);
    for (const [k, v] of Object.entries(attrs)) forma.setAttribute(k, v);
    svg.append(forma);
  }
  return svg;
}

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

// --- Guardado del progreso (sessionStorage) -------------------------------------
// Si la persona recarga la página por error, no pierde lo respondido.
// sessionStorage se borra solo al cerrar la pestaña. Puede no estar disponible
// (modo privado, bloqueos): por eso todo va dentro de try/catch.

function leerBorrador(clave) {
  try {
    const crudo = sessionStorage.getItem(clave);
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
}

function guardarBorrador(clave, datos) {
  try {
    if (datos) sessionStorage.setItem(clave, JSON.stringify(datos));
    else sessionStorage.removeItem(clave);
  } catch {
    // Sin almacenamiento la encuesta funciona igual; solo no sobrevive a una recarga.
  }
}

// --- Eventos del recorrido ------------------------------------------------------
// Cuentan cuántos no participaron y en qué pantalla se abandona. No llevan respuestas
// ni ningún identificador. Cada evento se manda UNA vez por pestaña (se anota en
// sessionStorage, que no sale del dispositivo), así recargar la página no cuenta doble.

function registrarEvento(id, evento, pregunta) {
  const clave = `encuesta:${id}:eventos`;
  const marca = pregunta ? `${evento}:${pregunta}` : evento;
  let enviados = [];
  try {
    enviados = JSON.parse(sessionStorage.getItem(clave) ?? '[]');
    if (enviados.includes(marca)) return;
    sessionStorage.setItem(clave, JSON.stringify([...enviados, marca]));
  } catch {
    // Sin almacenamiento se manda igual: el conteo puede duplicarse si recarga, nada más.
  }
  // keepalive: el aviso sale aunque la persona cierre la pestaña justo después.
  // Si falla, no pasa nada: la encuesta nunca depende de esto.
  fetch(`/api/eventos/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pregunta ? { evento, pregunta } : { evento }),
    keepalive: true,
  }).catch(() => {});
}

// --- Motor ----------------------------------------------------------------------

export class Motor {
  /**
   * @param {object} opciones
   * @param {HTMLElement} opciones.raiz - el <main class="app">
   * @param {string} opciones.id - 'adolescentes' o 'adultos'
   * @param {object} opciones.ui - textos de interfaz (botones, errores, ayuda)
   * @param {object} [opciones.presentacion] - lo que cambia entre temas y no es CSS:
   *   tarjeta: envolver cada pregunta en .tarjeta (adolescentes) o no (adultos: la página es la tarjeta);
   *   largoPreguntaLarga: desde cuántos caracteres una pregunta usa la letra más chica;
   *   flechaAlEnviar: si el botón «Enviar» lleva flecha;
   *   inicioConConsentimiento: la presentación y «¿Aceptás participar?» en una sola pantalla.
   */
  constructor({ raiz, id, ui, presentacion = {} }) {
    this.raiz = raiz;
    this.id = id;
    this.ui = ui;
    this.presentacion = { tarjeta: false, largoPreguntaLarga: 60, flechaAlEnviar: true, inicioConConsentimiento: false, ...presentacion };
    this.claveBorrador = `encuesta:${id}:borrador`;
    this.el = {
      progresoSeccion: raiz.querySelector('.progreso-seccion'),
      progreso: raiz.querySelector('.progreso'),
      motivo: raiz.querySelector('.motivo'),
      contenido: raiz.querySelector('.contenido'),
      pie: raiz.querySelector('.pie'),
    };
    this.estado = {
      pantalla: 'cargando',
      paso: 0,
      respuestas: {},
      borradorEdad: '',
      edadFuera: false,
      error: null,
      proximaApertura: null,
      vista: 0,
      direccion: 'quieto',
      aparecido: false,
      ayudaAbierta: false, // nota «¿Por qué preguntamos esto?»
    };
    this.temporizadorTransicion = null; // fase de salida de la galería
    this.controles = null; // referencias a los controles de la pantalla actual
  }

  async iniciar() {
    this.crearPixeles();
    window.addEventListener('resize', () => {
      this.actualizarMotivo();
      this.actualizarHayMas();
    });
    // Si el contenido cambia de alto (un aviso, la nota de ayuda), se recalcula el indicador.
    if (typeof ResizeObserver === 'function') new ResizeObserver(() => this.actualizarHayMas()).observe(this.el.contenido);
    // Si alguien toca un campo mientras la pantalla todavía entra deslizándose, el navegador
    // corre la columna de costado para mostrarlo y queda desplazada. La columna nunca
    // debe tener desplazamiento horizontal: si lo tiene, se vuelve a cero.
    this.raiz.addEventListener(
      'scroll',
      () => {
        if (this.raiz.scrollLeft !== 0) this.raiz.scrollLeft = 0;
        this.actualizarHayMas();
      },
      { passive: true },
    );

    try {
      const res = await fetch(`/api/encuestas/${this.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.def = await res.json();
    } catch (error) {
      console.error('No se pudo cargar la encuesta:', error);
      this.estado.pantalla = 'error-carga';
      this.dibujar();
      return;
    }

    const borrador = leerBorrador(this.claveBorrador);
    if (this.def.abierta === false) {
      Object.assign(this.estado, { pantalla: 'cerrada', proximaApertura: this.def.proximaApertura });
    } else if (borrador?.respuestas) {
      // Retomar donde estaba: las respuestas se "limpian" por si alguna rama ya no aplica.
      const respuestas = L.limpiar(this.def, borrador.respuestas);
      const lista = L.pasos(this.def, respuestas);
      const paso = Math.max(0, Math.min(Number(borrador.paso) || 0, lista.length - 1));
      Object.assign(this.estado, { pantalla: 'recorrido', paso, respuestas }, this.extraParaPaso(lista[paso], respuestas));
    } else {
      this.estado.pantalla = 'inicio';
    }
    if (this.estado.pantalla !== 'cerrada') this.registrar('entro');

    this.dibujar();
    // Los píxeles llegan de a uno en la primera carga.
    setTimeout(() => {
      this.estado.aparecido = true;
      this.actualizarMotivo();
    }, 80);
  }

  registrar(evento, pregunta) {
    registrarEvento(this.id, evento, pregunta);
  }

  /**
   * En celulares muy chicos algunas pantallas no entran enteras. Cuando queda contenido
   * debajo, el pie muestra un degradé («hay más»), que se va al llegar al final.
   */
  actualizarHayMas() {
    const falta = this.raiz.scrollHeight - this.raiz.clientHeight - this.raiz.scrollTop;
    this.el.pie.classList.toggle('pie--hay-mas', falta > 8);
  }

  // --- Movimiento ----------------------------------------------------------------

  movimientoReducido() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  /** Lee un tiempo de los tokens CSS (una sola fuente de verdad para las duraciones). */
  leerMs(token, porDefecto) {
    const v = getComputedStyle(this.raiz).getPropertyValue(token).trim();
    const n = Number.parseFloat(v);
    if (!v || Number.isNaN(n)) return porDefecto;
    return v.endsWith('ms') ? n : v.endsWith('s') ? n * 1000 : n;
  }

  /** Cambia de pantalla en dos tiempos: primero se va la actual, después llega la nueva. Gana la última navegación. */
  navegar(cambios, direccion = 'adelante') {
    this.limpiarTransicion();
    const aplicar = () => {
      this.temporizadorTransicion = null;
      // Cada pantalla nueva arranca con la nota «¿Por qué preguntamos esto?» cerrada.
      Object.assign(this.estado, cambios, { vista: this.estado.vista + 1, direccion, ayudaAbierta: false });
      this.dibujar();
    };
    if (this.movimientoReducido()) return aplicar();
    this.el.contenido.className = `contenido salir-${direccion}`;
    this.temporizadorTransicion = setTimeout(aplicar, this.leerMs('--dur-salida', 260));
  }

  limpiarTransicion() {
    clearTimeout(this.temporizadorTransicion);
    this.temporizadorTransicion = null;
  }

  // --- Recorrido -------------------------------------------------------------------

  lista() {
    return L.pasos(this.def, this.estado.respuestas);
  }

  pasoActual() {
    return this.estado.pantalla === 'recorrido' ? this.lista()[this.estado.paso] ?? null : null;
  }

  preguntaActual() {
    const paso = this.pasoActual();
    return paso?.clase === 'pregunta' ? paso.pregunta : null;
  }

  // Al llegar a la pregunta de número, el borrador del campo arranca con lo ya respondido.
  extraParaPaso(paso, respuestas) {
    if (paso?.clase === 'pregunta' && paso.pregunta.tipo === 'numero') {
      const v = respuestas[paso.pregunta.id];
      return { borradorEdad: v === undefined ? '' : String(v), edadFuera: false };
    }
    return {};
  }

  irAPaso(i, direccion) {
    const dir = direccion ?? (i >= this.estado.paso ? 'adelante' : 'atras');
    const lista = this.lista();
    if (i < 0) return this.navegar({ pantalla: this.pantallaConsentimiento(), paso: 0 }, 'atras');
    if (i >= lista.length) return this.enviar();
    this.navegar({ pantalla: 'recorrido', paso: i, ...this.extraParaPaso(lista[i], this.estado.respuestas) }, dir);
  }

  // Elegir una opción nunca pasa de pantalla: siempre se confirma con «Siguiente».
  // Así la persona ve lo que eligió, puede corregirlo, y el ritmo lo decide ella.
  responder(id, valor) {
    const r = { ...this.estado.respuestas };
    if (valor === undefined || valor === '' || (Array.isArray(valor) && valor.length === 0)) delete r[id];
    else r[id] = valor;
    this.estado.respuestas = L.limpiar(this.def, r);
    this.guardarProgreso();
    this.actualizarControles();
  }

  guardarProgreso() {
    const { pantalla, paso, respuestas } = this.estado;
    if (pantalla === 'recorrido') guardarBorrador(this.claveBorrador, { paso, respuestas });
  }

  confirmarEdad(pregunta) {
    const texto = this.estado.borradorEdad;
    if (texto === '') return;
    const n = Number.parseInt(texto, 10);
    if (Number.isNaN(n) || n < pregunta.min || n > pregunta.max) {
      this.registrar('edad_fuera');
      this.estado.edadFuera = true;
      this.dibujarAvisoEdad();
      return;
    }
    this.estado.respuestas = L.limpiar(this.def, { ...this.estado.respuestas, [pregunta.id]: n });
    this.estado.edadFuera = false;
    this.guardarProgreso();
    this.irAPaso(this.estado.paso + 1, 'adelante');
  }

  /** Dónde se pregunta «¿Aceptás participar?»: en su propia pantalla o en la de inicio. */
  pantallaConsentimiento() {
    return this.presentacion.inicioConConsentimiento ? 'inicio' : 'consentimiento';
  }

  /** Los dos botones del consentimiento (los usa la pantalla que lo muestre). */
  botonesConsentimiento(c) {
    return h(
      'div',
      { class: 'consentimiento-botones' },
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--primario',
          on: {
            click: () => {
              this.registrar('acepto');
              this.irAPaso(0, 'adelante');
            },
          },
        },
        c.si,
      ),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--secundario',
          on: {
            click: () => {
              this.registrar('no_participa');
              guardarBorrador(this.claveBorrador, null);
              this.navegar({ pantalla: 'no-participa', respuestas: {} }, 'adelante');
            },
          },
        },
        c.no,
      ),
    );
  }

  volver() {
    const { pantalla, paso } = this.estado;
    if (pantalla === 'consentimiento') return this.navegar({ pantalla: 'inicio' }, 'atras');
    if (pantalla === 'no-participa') return this.navegar({ pantalla: this.pantallaConsentimiento() }, 'atras');
    if (pantalla === 'error') return this.irAPaso(this.lista().length - 1, 'atras');
    this.irAPaso(paso - 1, 'atras');
  }

  async enviar() {
    const inicio = Date.now();
    this.navegar({ pantalla: 'enviando' }, 'adelante');
    let destino;
    try {
      const res = await fetch(`/api/respuestas/${this.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(L.cuerpo(this.def, this.estado.respuestas)),
      });
      const datos = await res.json().catch(() => ({}));
      if (res.status === 201) {
        guardarBorrador(this.claveBorrador, null);
        destino = { pantalla: 'final' };
      } else if (res.status === 403 && datos.cerrada) {
        destino = { pantalla: 'cerrada', proximaApertura: datos.proximaApertura ?? null };
      } else if (res.status === 429) {
        destino = { pantalla: 'error', error: 'ocupado' };
      } else {
        // Un 400 es un error del frontend: se registra para poder corregirlo.
        if (res.status === 400) console.error('El servidor rechazó la respuesta:', datos.errores);
        destino = { pantalla: 'error', error: 'generico' };
      }
    } catch {
      destino = { pantalla: 'error', error: 'sin-conexion' };
    }
    // Que "Enviando…" no sea un parpadeo: se muestra al menos un instante.
    await esperar(Math.max(0, 700 - (Date.now() - inicio)));
    this.navegar(destino, 'adelante');
  }

  // --- Dibujo ----------------------------------------------------------------------

  /** Dibuja la pantalla completa (se llama al cambiar de pantalla). */
  dibujar() {
    const { contenido } = this.el;
    const par = this.estado.vista % 2;
    contenido.className = `contenido entrar-${this.estado.direccion}-${par}`;
    this.controles = null;
    // Las partes opcionales de una pantalla llegan como false/undefined: replaceChildren
    // las convertiría en texto («falseundefined»), así que se descartan acá.
    contenido.replaceChildren(...this.pantalla(par).filter((nodo) => nodo instanceof Node));
    this.dibujarPie();
    this.actualizarProgreso();
    this.actualizarMotivo();
    this.guardarProgreso();
    const paso = this.pasoActual();
    if (paso?.clase === 'pregunta') this.registrar('vio', paso.pregunta.id);

    // Pantalla nueva: volver arriba y llevar el foco al título (lectores de pantalla).
    this.raiz.scrollTop = 0;
    contenido.querySelector('h1')?.focus({ preventScroll: true });
    this.actualizarHayMas();
    // Y otra vez cuando termina de entrar (la animación de entrada cambia la medida).
    setTimeout(() => this.actualizarHayMas(), this.leerMs('--dur-entrada', 520) + 50);
  }

  pantalla(par) {
    const aparecer = ` aparecer-${par}`;
    const escalon = this.leerMs('--retraso-escalonado', 70);
    // Retraso de aparición escalonada: base + un escalón por elemento (máximo 6).
    const retraso = (i, base) => ({ animationDelay: `${Math.round(base + Math.min(i, 6) * escalon)}ms` });
    const d = this.def;

    switch (this.estado.pantalla) {
      case 'cargando':
        return [];

      case 'error-carga':
        return [
          h(
            'div',
            { class: 'mensaje', role: 'alert' },
            h('h1', { class: 'mensaje-titulo', tabindex: '-1' }, this.ui.errorCarga.titulo),
            h('p', { class: 'mensaje-texto' }, this.ui.errorCarga.texto),
            h(
              'div',
              {},
              h('button', { type: 'button', class: 'btn btn--primario', on: { click: () => location.reload() } }, this.ui.reintentar),
            ),
          ),
        ];

      case 'inicio': {
        const intro = d.pantallas.intro;
        const puntos = intro.puntos ?? [];
        const dCierre = 320 + puntos.length * (escalon + 40) + 80;
        return [
          h('h1', { class: `portada-titulo${aparecer}`, tabindex: '-1', estilo: { animationDelay: '60ms' } }, intro.titulo),
          h('p', { class: `portada-texto${aparecer}`, estilo: { animationDelay: '180ms' } }, intro.texto),
          puntos.length > 0 &&
            h(
              'ul',
              { class: 'puntos' },
              puntos.map((pt, i) =>
                h(
                  'li',
                  {
                    class: `punto-lista${aparecer}`,
                    estilo: { animationDelay: `${Math.round(320 + Math.min(i, 6) * escalon + i * 40)}ms` },
                  },
                  h('span', {}, h('strong', {}, `${pt.destacado}:`), ` ${pt.texto}`),
                ),
              ),
            ),
          intro.cierre &&
            h('p', { class: `portada-cierre${aparecer}`, estilo: { animationDelay: `${dCierre}ms` } }, intro.cierre),
          // Adultos: presentación corta y consentimiento en la misma pantalla. Adolescentes: el
          // consentimiento va en su propia pantalla, así cada una entra entera en el celular.
          this.presentacion.inicioConConsentimiento
            ? h(
                'section',
                {
                  class: `consentimiento consentimiento--en-inicio${aparecer}`,
                  'aria-labelledby': 'consentimiento-t',
                  estilo: { animationDelay: `${dCierre + 140}ms` },
                },
                h('h2', { id: 'consentimiento-t', class: 'consentimiento-titulo' }, d.pantallas.consentimiento.pregunta),
                this.botonesConsentimiento(d.pantallas.consentimiento),
              )
            : h(
                'div',
                { class: `portada-continuar${aparecer}`, estilo: { animationDelay: `${dCierre + 140}ms` } },
                h(
                  'button',
                  { type: 'button', class: 'btn btn--primario', on: { click: () => this.navegar({ pantalla: 'consentimiento' }, 'adelante') } },
                  h('span', {}, this.ui.continuar),
                  icono('siguiente'),
                ),
              ),
        ];
      }

      case 'consentimiento': {
        const c = d.pantallas.consentimiento;
        return [
          h(
            'section',
            { class: 'consentimiento', 'aria-labelledby': 'consentimiento-t' },
            h('h1', { id: 'consentimiento-t', class: 'consentimiento-titulo', tabindex: '-1' }, c.pregunta),
            this.botonesConsentimiento(c),
          ),
        ];
      }

      case 'no-participa':
        return [
          h('div', { class: 'mensaje' }, h('h1', { class: 'mensaje-titulo', tabindex: '-1' }, d.pantallas.consentimiento.respuestaNo)),
        ];

      case 'recorrido': {
        const paso = this.pasoActual();
        if (!paso) return [];
        if (paso.clase === 'seccion') {
          // Portada de cada parte: número grande, «Parte X de N», título y una marca por parte.
          // Le dice a la persona cuánto le falta, que es lo que más ayuda a no abandonar.
          const { numero, total } = L.ubicacionSeccion(d, this.estado.respuestas, this.estado.paso, this.lista());
          const marca = (i) => (i < numero - 1 ? 'hecha' : i === numero - 1 ? 'actual' : null);
          return [
            h(
              'div',
              { class: 'seccion' },
              h(
                'p',
                { class: `seccion-numero${aparecer}`, estilo: { animationDelay: '40ms' } },
                h('span', { class: 'seccion-cifra', 'aria-hidden': 'true' }, String(numero).padStart(2, '0')),
                h('span', { class: 'seccion-de' }, `Parte ${numero} de ${total}`),
              ),
              h('h1', { class: `seccion-titulo${aparecer}`, tabindex: '-1', estilo: { animationDelay: '120ms' } }, paso.seccion.titulo),
              h('p', { class: `seccion-desc${aparecer}`, estilo: { animationDelay: '300ms' } }, paso.seccion.descripcion),
              h(
                'div',
                { class: `seccion-marcas${aparecer}`, 'aria-hidden': 'true', estilo: { animationDelay: '420ms' } },
                Array.from({ length: total }, (_, i) => h('span', { class: marca(i) })),
              ),
            ),
          ];
        }
        const pregunta = this.pregunta(paso.pregunta, aparecer, retraso);
        return [this.presentacion.tarjeta ? h('div', { class: 'tarjeta' }, pregunta) : pregunta];
      }

      case 'enviando':
        return [h('div', { class: 'mensaje', role: 'status' }, h('h1', { class: 'mensaje-titulo', tabindex: '-1' }, this.ui.enviando))];

      case 'error': {
        const e = this.ui.errores[this.estado.error] ?? this.ui.errores.generico;
        return [
          h(
            'div',
            { class: 'mensaje', role: 'alert' },
            h('h1', { class: 'mensaje-titulo', tabindex: '-1' }, e.titulo),
            h('p', { class: 'mensaje-texto' }, e.texto),
          ),
        ];
      }

      case 'cerrada': {
        const { proximaApertura } = this.estado;
        const texto = proximaApertura
          ? this.ui.cerrada.conFecha.replace('{cuando}', L.formatearApertura(proximaApertura))
          : this.ui.cerrada.finalizada;
        return [
          h(
            'div',
            { class: 'mensaje' },
            h('h1', { class: 'mensaje-titulo', tabindex: '-1' }, this.ui.cerrada.titulo),
            h('p', { class: 'mensaje-texto' }, texto),
          ),
        ];
      }

      case 'final': {
        const cierre = d.pantallas.cierre;
        return [
          h(
            'div',
            { class: 'mensaje' },
            h('h1', { class: `cierre-titulo${aparecer}`, tabindex: '-1', estilo: { animationDelay: '100ms' } }, cierre.titulo),
            h('p', { class: `mensaje-texto${aparecer}`, estilo: { animationDelay: '260ms' } }, cierre.texto),
          ),
          h(
            'section',
            { class: `ayuda${aparecer}`, 'aria-labelledby': 'ayuda-t', estilo: { animationDelay: '480ms' } },
            h('p', { id: 'ayuda-t', class: 'ayuda-intro' }, this.ui.ayuda.intro),
            this.ui.ayuda.lineas.map((l) =>
              h(
                'a',
                { class: 'linea', href: l.href },
                h('span', { class: 'linea-icono', 'aria-hidden': 'true' }, icono('telefono')),
                h(
                  'span',
                  { class: 'linea-textos' },
                  h('span', { class: 'linea-numero' }, l.numero),
                  h('span', { class: 'linea-desc' }, l.descripcion),
                ),
              ),
            ),
          ),
        ];
      }

      default:
        return [];
    }
  }

  /** Dibuja una pregunta según su tipo y guarda referencias a sus controles. */
  pregunta(p, aparecer, retraso) {
    const r = this.estado.respuestas;
    const larga = (p.texto ?? '').length > this.presentacion.largoPreguntaLarga;
    const clasePregunta = `pregunta-texto${larga ? ' pregunta-texto--larga' : ''}`;
    const titulo = () => h('legend', { class: 'grupo-leyenda' }, h('h1', { class: clasePregunta, tabindex: '-1' }, p.texto));
    const ayuda = () => this.notaAyuda(p);

    switch (p.tipo) {
      case 'unica':
      case 'multiple': {
        const multiple = p.tipo === 'multiple';
        const opciones = [];
        let i = 0;
        const dibujarOpcion = (o, hijos) => {
          if (o.exclusiva) hijos.push(h('div', { class: 'separador', 'aria-hidden': 'true' }));
          const input = h('input', {
            class: 'opcion-input',
            type: multiple ? 'checkbox' : 'radio',
            name: p.id,
            value: o.valor,
            on: {
              // Se lee el estado ACTUAL (no el del momento en que se dibujó la pantalla).
              change: () =>
                multiple
                  ? this.responder(p.id, L.alternar(p, this.estado.respuestas[p.id] ?? [], o))
                  : this.responder(p.id, o.valor),
            },
          });
          const label = h(
            'label',
            {
              class: `opcion ${multiple ? 'opcion--check' : 'opcion--radio'}${o.exclusiva ? ' opcion--exclusiva' : ''}${aparecer}`,
              estilo: retraso(i++, 160),
            },
            input,
            h('span', { class: 'opcion-marca', 'aria-hidden': 'true' }, icono('check')),
            h('span', { class: 'opcion-texto' }, o.texto),
          );
          opciones.push({
            label,
            input,
            valor: o.valor,
            base: `opcion ${multiple ? 'opcion--check' : 'opcion--radio'}${o.exclusiva ? ' opcion--exclusiva' : ''}${aparecer}`,
          });
          hijos.push(label);
          return hijos;
        };

        // Opciones agrupadas (carrera): un role="group" por grupo, rotulado. Sin grupos
        // (o con uno solo sin rótulo) las opciones van directo, como en adolescentes.
        const grupos = L.gruposDeOpciones(p.opciones);
        const contenidoOpciones =
          grupos.length === 1 && !grupos[0].mostrarTitulo
            ? grupos[0].opciones.reduce((hijos, o) => dibujarOpcion(o, hijos), [])
            : grupos.map((g, n) => {
                const idTitulo = `grupo-${p.id}-${n}`;
                return h(
                  'div',
                  { class: 'opciones-grupo', role: g.mostrarTitulo ? 'group' : null, 'aria-labelledby': g.mostrarTitulo ? idTitulo : null },
                  g.mostrarTitulo && h('p', { class: 'opciones-grupo-titulo', id: idTitulo }, g.titulo),
                  g.opciones.reduce((hijos, o) => dibujarOpcion(o, hijos), []),
                );
              });
        this.controles = { tipo: p.tipo, pregunta: p, opciones };
        this.actualizarControles();
        return h(
          'fieldset',
          { class: 'grupo' },
          titulo(),
          ayuda(),
          multiple && h('p', { class: 'pista' }, this.ui.pistaMultiple),
          // Listas largas sin orden en dos columnas, así entran en el celular (L.enColumnas).
          h('div', { class: `opciones${L.enColumnas(p) ? ' opciones--columnas' : ''}` }, contenidoOpciones),
        );
      }

      case 'escala': {
        const componente = L.componenteEscala(p);
        if (componente === 'tramos') return this.tramos(p, titulo, ayuda);
        if (componente === 'frecuencia') return this.frecuencia(p, titulo, ayuda);
        const puntos = [];
        for (let v = p.min; v <= p.max; v++) {
          const etiqueta = p.etiquetas?.[v];
          const input = h('input', {
            class: 'opcion-input',
            type: 'radio',
            name: p.id,
            value: String(v),
            on: { change: () => this.responder(p.id, v) },
          });
          const label = h(
            'label',
            { class: `punto${aparecer}`, estilo: retraso(v - p.min, 160) },
            input,
            h('span', {}, String(v)),
            etiqueta && h('span', { class: 'solo-lector' }, `, ${etiqueta}`),
          );
          puntos.push({ label, input, valor: v, base: `punto${aparecer}` });
        }
        this.controles = { tipo: 'escala', pregunta: p, opciones: puntos };
        this.actualizarControles();
        return h(
          'fieldset',
          { class: 'grupo' },
          titulo(),
          ayuda(),
          h('div', { class: 'escala' }, puntos.map((x) => x.label)),
          h(
            'div',
            { class: 'escala-extremos', 'aria-hidden': 'true' },
            h('span', {}, p.etiquetas?.[p.min] ?? ''),
            h('span', {}, p.etiquetas?.[p.max] ?? ''),
          ),
        );
      }

      case 'numero': {
        const campo = h('input', {
          id: 'campo-numero',
          class: 'campo campo--numero',
          type: 'text',
          inputmode: 'numeric',
          pattern: '[0-9]*',
          autocomplete: 'off',
          maxlength: String(String(p.max).length),
          'aria-describedby': 'aviso-edad',
          'aria-invalid': this.estado.edadFuera ? 'true' : 'false',
          on: {
            input: (e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, String(p.max).length);
              e.target.value = v;
              this.estado.borradorEdad = v;
              if (this.estado.edadFuera) {
                this.estado.edadFuera = false;
                this.dibujarAvisoEdad();
              }
              this.dibujarPie();
            },
            keydown: (e) => {
              if (e.key === 'Enter') this.confirmarEdad(p);
            },
          },
        });
        campo.value = this.estado.borradorEdad;
        const contenedor = h(
          'div',
          { class: 'grupo' },
          h('h1', { class: clasePregunta, tabindex: '-1' }, h('label', { for: 'campo-numero' }, p.texto)),
          ayuda(),
          campo,
        );
        this.controles = { tipo: 'numero', pregunta: p, campo, contenedor };
        if (this.estado.edadFuera) contenedor.append(this.avisoEdad());
        return contenedor;
      }

      case 'texto': {
        const actual = r[p.id] ?? '';
        const contador = h('p', { class: 'contador', id: 'contador-texto' });
        const campo = h('textarea', {
          id: 'campo-texto',
          class: 'campo campo--texto',
          rows: '6',
          maxlength: String(p.maxLargo),
          'aria-describedby': 'contador-texto',
          on: { input: (e) => this.responder(p.id, e.target.value.slice(0, p.maxLargo)) },
        });
        campo.value = actual;
        this.controles = { tipo: 'texto', pregunta: p, campo, contador };
        this.actualizarControles();
        return h(
          'div',
          { class: 'grupo' },
          h('h1', { class: clasePregunta, tabindex: '-1' }, h('label', { for: 'campo-texto' }, p.texto)),
          ayuda(),
          campo,
          contador,
        );
      }

      case 'info':
        // Pantalla para leer: no se responde, no se envía y no cuenta en el progreso.
        return h(
          'div',
          { class: 'info' },
          h('h1', { class: `info-titulo${aparecer}`, tabindex: '-1', estilo: { animationDelay: '100ms' } }, p.titulo),
          h('p', { class: `info-texto${aparecer}`, estilo: { animationDelay: '240ms' } }, p.texto),
        );

      default:
        console.error(`Tipo de pregunta sin componente: ${p.tipo}`);
        return h('div', {});
    }
  }

  /**
   * «¿Por qué preguntamos esto?»: un botón con aria-expanded y la nota debajo, que solo
   * existe mientras está abierta. No es un <details> porque el motor tiene que cerrarla
   * al cambiar de pantalla. Se abre y se cierra en el lugar, sin redibujar la pantalla.
   */
  notaAyuda(p) {
    if (!p.ayuda) return null;
    const nota = () => h('p', { class: 'porque-texto', id: 'nota-porque' }, p.ayuda);
    const boton = h(
      'button',
      {
        type: 'button',
        class: 'porque-boton',
        'aria-expanded': String(this.estado.ayudaAbierta),
        'aria-controls': 'nota-porque',
        on: {
          click: () => {
            this.estado.ayudaAbierta = !this.estado.ayudaAbierta;
            boton.setAttribute('aria-expanded', String(this.estado.ayudaAbierta));
            if (this.estado.ayudaAbierta) contenedor.append(nota());
            else contenedor.querySelector('.porque-texto')?.remove();
          },
        },
      },
      h('span', { class: 'porque-icono', 'aria-hidden': 'true' }, 'i'),
      h('span', { class: 'porque-boton-texto' }, this.ui.porque),
    );
    const contenedor = h('div', { class: 'porque' }, boton, this.estado.ayudaAbierta && nota());
    return contenedor;
  }

  /**
   * Tramos: slider de 5 pasos hecho con radios (no un <input type="range">, que nunca puede
   * estar vacío). Las flechas del teclado recorren los escalones sin código extra.
   */
  tramos(p, titulo, ayuda) {
    const pesos = (v) => L.textoPesos(p, v, this.def.smvmReferencia, this.ui.pesos);
    const escalones = [];
    for (let v = p.min; v <= p.max; v++) {
      const input = h('input', {
        class: 'opcion-input',
        type: 'radio',
        name: p.id,
        value: String(v),
        on: { change: () => this.responder(p.id, v) },
      });
      const extra = pesos(v);
      const label = h(
        'label',
        { class: 'tramo' },
        input,
        h('span', { class: 'tramo-barra', 'aria-hidden': 'true' }),
        h('span', { class: 'solo-lector' }, p.etiquetas[v] + (extra ? ` (${extra})` : '')),
      );
      escalones.push({ label, input, valor: v });
    }
    // «Prefiero no responder»: un renglón aparte debajo de los escalones, con el mismo
    // `name`, así las flechas del teclado lo recorren junto con ellos.
    let noResponde = null;
    if (p.opcionNoResponde) {
      const { valor, texto } = p.opcionNoResponde;
      const input = h('input', {
        class: 'opcion-input',
        type: 'radio',
        name: p.id,
        value: valor,
        on: { change: () => this.responder(p.id, valor) },
      });
      const base = 'opcion opcion--radio';
      const label = h(
        'label',
        { class: base },
        input,
        h('span', { class: 'opcion-marca', 'aria-hidden': 'true' }),
        h('span', { class: 'opcion-texto' }, texto),
      );
      noResponde = { label, input, valor, base };
    }
    // La lectura grande repite lo que ya dice cada radio: para lectores de pantalla, se oculta.
    const lectura = h('div', { class: 'tramos-lectura', 'aria-hidden': 'true' });
    this.controles = { tipo: 'tramos', pregunta: p, opciones: escalones, lectura, pesos, noResponde };
    this.actualizarControles();
    return h(
      'fieldset',
      { class: 'grupo' },
      titulo(),
      ayuda(),
      h(
        'div',
        { class: 'tramos' },
        lectura,
        h('div', { class: 'tramos-escalones' }, escalones.map((e) => e.label)),
        h(
          'div',
          { class: 'tramos-extremos', 'aria-hidden': 'true' },
          h('span', {}, this.ui.tramosMenos),
          h('span', {}, this.ui.tramosMas),
        ),
        noResponde && h('div', { class: 'opciones' }, noResponde.label),
      ),
    );
  }

  /**
   * Frecuencia (PGSI): etiqueta en cada punto. Las respuestas van ancladas abajo, así
   * quedan en el mismo lugar aunque la pregunta tenga 1 o 4 renglones.
   * Autoavance igual que la opción única.
   */
  frecuencia(p, titulo, ayuda) {
    const renglones = [];
    for (let v = p.min; v <= p.max; v++) {
      const input = h('input', {
        class: 'opcion-input',
        type: 'radio',
        name: p.id,
        value: String(v),
        on: { change: () => this.responder(p.id, v) },
      });
      // Barritas decorativas (sin números, para no sugerir un puntaje).
      const grado = [];
      for (let k = 1; k <= p.max - p.min; k++) grado.push(h('i', { class: k <= v - p.min ? 'on' : null }));
      const label = h(
        'label',
        { class: 'frecuencia-opcion' },
        input,
        h('span', { class: 'frecuencia-grado', 'aria-hidden': 'true' }, grado),
        h('span', {}, p.etiquetas[v]),
        h('span', { class: 'opcion-marca', 'aria-hidden': 'true' }),
      );
      renglones.push({ label, input, valor: v });
    }
    this.controles = { tipo: 'frecuencia', pregunta: p, opciones: renglones };
    this.actualizarControles();
    const { n, total } = L.contextoFrecuencia(p, this.lista());
    return h(
      'div',
      { class: 'frecuencia-pregunta' },
      h('p', { class: 'frecuencia-contexto' }, `${this.ui.pregunta} `, h('b', {}, `${n} de ${total}`)),
      h(
        'fieldset',
        { class: 'grupo' },
        titulo(),
        ayuda(),
        h('div', { class: 'frecuencia-zona' }, h('div', { class: 'frecuencia' }, renglones.map((x) => x.label))),
      ),
    );
  }

  avisoEdad() {
    return h(
      'p',
      { class: 'aviso', id: 'aviso-edad', role: 'status' },
      icono('info'),
      h('span', {}, this.def.pantallas.edadFueraDeRango),
    );
  }

  // La edad fuera de rango se muestra en la misma pantalla, sin redibujarla (el campo sigue editable).
  dibujarAvisoEdad() {
    const c = this.controles;
    if (c?.tipo !== 'numero') return;
    c.campo.setAttribute('aria-invalid', this.estado.edadFuera ? 'true' : 'false');
    c.contenedor.querySelector('.aviso')?.remove();
    if (this.estado.edadFuera) c.contenedor.append(this.avisoEdad());
  }

  /** Actualiza marcas, contador y pie sin redibujar la pantalla (así no se pierde el foco). */
  actualizarControles() {
    const c = this.controles;
    if (c) {
      const valor = this.estado.respuestas[c.pregunta.id];
      if (c.tipo === 'unica' || c.tipo === 'multiple' || c.tipo === 'escala') {
        const marcadaClase = c.tipo === 'escala' ? ' punto--marcado' : ' opcion--marcada';
        for (const o of c.opciones) {
          const marcada = c.tipo === 'multiple' ? (valor ?? []).includes(o.valor) : valor === o.valor;
          o.input.checked = marcada;
          o.label.className = o.base + (marcada ? marcadaClase : '');
        }
      }
      if (c.tipo === 'frecuencia') {
        for (const o of c.opciones) {
          o.input.checked = valor === o.valor;
          o.label.className = `frecuencia-opcion${valor === o.valor ? ' frecuencia-opcion--marcada' : ''}`;
        }
      }
      if (c.tipo === 'tramos') {
        const numero = typeof valor === 'number' ? valor : undefined; // el «no responde» no es un escalón
        if (c.noResponde) {
          const marcada = valor === c.noResponde.valor;
          c.noResponde.input.checked = marcada;
          c.noResponde.label.className = c.noResponde.base + (marcada ? ' opcion--marcada' : '');
        }
        for (const o of c.opciones) {
          o.input.checked = numero === o.valor;
          const debajo = numero !== undefined && o.valor < numero;
          o.label.className = `tramo${numero === o.valor ? ' tramo--marcado' : ''}${debajo ? ' tramo--debajo' : ''}`;
        }
        let lectura = [];
        if (valor === undefined) lectura = [h('p', { class: 'tramos-vacio' }, this.ui.tramosVacio)];
        else if (numero !== undefined) {
          const pesos = c.pesos(numero);
          lectura = [h('p', { class: 'tramos-valor' }, c.pregunta.etiquetas[numero]), pesos && h('p', { class: 'tramos-pesos' }, pesos)];
        }
        // Con «Prefiero no responder» la lectura queda vacía: lo elegido ya se ve marcado abajo.
        c.lectura.replaceChildren(...lectura.filter(Boolean));
      }
      if (c.tipo === 'texto') {
        const largo = (valor ?? '').length;
        c.contador.textContent = `${largo} / ${c.pregunta.maxLargo}`;
        c.contador.className = `contador${largo >= c.pregunta.maxLargo * 0.9 ? ' contador--cerca' : ''}`;
      }
    }
    this.dibujarPie();
  }

  /** Pie: «Atrás» a la izquierda y una acción a la derecha, según la pantalla. */
  dibujarPie() {
    const { pantalla, paso, respuestas, borradorEdad } = this.estado;
    const enRecorrido = pantalla === 'recorrido' && this.pasoActual();
    const esError = pantalla === 'error';
    const mostrar = enRecorrido || esError || pantalla === 'no-participa' || pantalla === 'consentimiento';
    this.el.pie.style.display = mostrar ? '' : 'none';
    if (!mostrar) return this.el.pie.replaceChildren();

    const p = this.preguntaActual();
    const esNumero = p?.tipo === 'numero';
    const esUltimo = enRecorrido && paso === this.lista().length - 1;
    const obligatoria = p ? L.esObligatoria(this.def, p) : false;
    const respondida = p ? L.tieneRespuesta(p, respuestas) : false;

    let etiqueta = this.ui.siguiente;
    let secundaria = false;
    let conFlecha = !(esUltimo && !this.presentacion.flechaAlEnviar);
    let deshabilitada = false;
    let accion = () => this.irAPaso(paso + 1, 'adelante');

    if (p) {
      if (esUltimo) etiqueta = this.ui.enviar;
      else if (!respondida && !obligatoria && !esNumero && p.tipo !== 'info') {
        etiqueta = this.ui.saltar;
        secundaria = true;
      }
      if (esNumero) {
        accion = () => this.confirmarEdad(p);
        deshabilitada = borradorEdad === '';
      } else if (obligatoria && !respondida) {
        deshabilitada = true;
      }
    }
    if (esError) {
      etiqueta = this.ui.reintentar;
      conFlecha = false;
      accion = () => this.enviar();
    }

    const hayAccion = enRecorrido || esError;
    // Sin acción (consentimiento, «no participo») queda solo «Atrás». Un false suelto en
    // replaceChildren se convertiría en el texto «false»: se descarta, como en pantalla().
    const hijos = [
      h('button', { type: 'button', class: 'btn-volver', on: { click: () => this.volver() } }, icono('atras'), h('span', {}, this.ui.atras)),
      hayAccion &&
        h(
          'button',
          {
            type: 'button',
            class: `btn pie-accion ${secundaria ? 'btn--secundario' : 'btn--primario'}`,
            disabled: deshabilitada,
            on: { click: accion },
          },
          h('span', {}, etiqueta),
          conFlecha && icono('siguiente'),
        ),
    ];
    this.el.pie.replaceChildren(...hijos.filter((nodo) => nodo instanceof Node));
  }

  actualizarProgreso() {
    const { pantalla, paso, respuestas } = this.estado;
    const p = this.preguntaActual();
    const conSeccion = p && this.def.portadasDeSeccion !== false;
    this.el.progresoSeccion.textContent = conSeccion ? (this.def.secciones.find((s) => s.id === p.seccion)?.titulo ?? NBSP) : NBSP;
    if (!this.def) return;
    const lista = this.lista();
    const { hechas, total } = L.progreso(this.def, respuestas, paso, lista);
    const completo = ['enviando', 'error', 'final'].includes(pantalla);
    this.el.progreso.max = Math.max(1, total);
    this.el.progreso.value = pantalla === 'recorrido' ? hechas : completo ? total : 0;
  }

  // --- Motivo de píxeles ------------------------------------------------------------

  crearPixeles() {
    if (!this.el.motivo) return; // adultos no tiene motivo de píxeles
    this.px = Array.from({ length: L.CANTIDAD_PIXELES }, () => h('span', { class: 'px' }));
    this.el.motivo.replaceChildren(...this.px);
    this.actualizarMotivo();
  }

  actualizarMotivo() {
    if (!this.px) return;
    const { pantalla, paso, respuestas, aparecido } = this.estado;
    let avance = 0;
    if (pantalla === 'recorrido' && this.def) avance = L.avanceMotivo(this.def, respuestas, paso, this.lista());
    if (['enviando', 'error', 'final'].includes(pantalla)) avance = 1;
    if (pantalla === 'no-participa') avance = 0.6;
    if (pantalla === 'cerrada') avance = 0.4;

    const datos = L.pixeles(L.calma(avance), aparecido, this.el.motivo.clientWidth || 342, this.el.motivo.clientHeight || 56);
    datos.forEach((d, i) =>
      Object.assign(this.px[i].style, {
        left: `${d.x}px`,
        top: `${d.y}px`,
        opacity: d.opacidad,
        background: d.color,
        transitionDelay: `${d.retraso}ms`,
        animationDelay: `${d.ola}ms`,
      }),
    );
  }
}
