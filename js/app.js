/* ============================================================================
   Mapa Squad — DayZ en español
   Mapa interactivo con marcadores compartidos en tiempo real (Firebase RTDB).
   ============================================================================ */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin I, L, O, 0, 1
  const PALETA = ["#e8a33d", "#4fc3f7", "#81c784", "#e57373", "#ba68c8", "#ffd54f", "#4db6ac", "#f06292"];
  const ES_TACTIL = "ontouchstart" in window;

  /* ---------------- Estado global ---------------- */
  const E = {
    mapaKey: "chernarusplus",
    mapa: null,          // instancia L.Map
    capas: {},           // topo, sat, lugares, lugaresMil, marcadores, jugadores, medir
    lugares: [],         // [{marker, mz, militar}]
    store: null,         // StoreLocal o StoreFirebase
    sala: null,          // código de sala o null (solo)
    nombre: "",
    uid: "",
    modo: "normal",      // normal | medir | pos
    medirPuntos: [],
    medirLinea: null,
    medirTip: null,
    marcadores: {},      // id -> datos
    pendiente: null,     // {x, z} del diálogo de marcador
    tipoElegido: localStorage.getItem("dayz_tipo") || "encuentro",
    capaBase: "topo",
  };

  /* ---------------- Utilidades ---------------- */
  let toastTimer = null;
  function toast(msg, ms = 2600) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.remove("oculto");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add("oculto"), ms);
  }

  function generarCodigo() {
    let c = "";
    for (let i = 0; i < 4; i++) c += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
    return c;
  }

  function normalizar(s) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function fmtCoords(x, z) {
    return `${Math.round(x)} / ${Math.round(z)}`;
  }

  function cuadricula(x, z) {
    const size = MAPAS[E.mapaKey].size;
    const cx = String(Math.max(0, Math.min(999, Math.floor(x / 100)))).padStart(3, "0");
    const cz = String(Math.max(0, Math.min(999, Math.floor((size - z) / 100)))).padStart(3, "0");
    return `${cx}-${cz}`;
  }

  function leerHash() {
    const h = {};
    location.hash.replace(/^#/, "").split("&").forEach((par) => {
      const [k, v] = par.split("=");
      if (k && v) h[k] = decodeURIComponent(v);
    });
    return h;
  }

  function escribirHash() {
    if (!E.mapa) return;
    const c = E.mapa.getCenter();
    const partes = [
      `m=${E.mapaKey}`,
      `c=${Math.round(c.lng)},${Math.round(c.lat)}`,
      `z=${E.mapa.getZoom()}`,
    ];
    if (E.sala) partes.push(`s=${E.sala}`);
    history.replaceState(null, "", "#" + partes.join("&"));
  }

  /* ============================================================
     STORES: misma interfaz para modo solo (localStorage) y sala
     (Firebase). Callbacks: cb.marcadores, cb.pos, cb.jugadores,
     cb.notas — se llaman ante cada cambio.
     ============================================================ */

  function crearStoreLocal(cb) {
    const clave = (suf) => `dayz_local_${suf}`;
    let mapaKey = null;

    const leer = (k, def) => {
      try { return JSON.parse(localStorage.getItem(k)) || def; } catch { return def; }
    };
    const guardar = (k, v) => localStorage.setItem(k, JSON.stringify(v));

    const emitirMarcadores = () => cb.marcadores(leer(clave(mapaKey + "_marcadores"), {}));
    const emitirNotas = () => cb.notas(leer(clave("notas"), {}));
    const emitirPos = () => cb.pos(leer(clave(mapaKey + "_pos"), {}));

    return {
      esSala: false,
      suscribirMapa(k) {
        mapaKey = k;
        emitirMarcadores();
        emitirPos();
      },
      iniciar() {
        emitirNotas();
        cb.jugadores({ [E.uid]: { n: E.nombre, c: PALETA[0], online: true } });
      },
      agregarMarcador(m) {
        const datos = leer(clave(mapaKey + "_marcadores"), {});
        datos["m" + Date.now()] = m;
        guardar(clave(mapaKey + "_marcadores"), datos);
        emitirMarcadores();
      },
      borrarMarcador(id) {
        const datos = leer(clave(mapaKey + "_marcadores"), {});
        delete datos[id];
        guardar(clave(mapaKey + "_marcadores"), datos);
        emitirMarcadores();
      },
      setPos(x, z) {
        guardar(clave(mapaKey + "_pos"), { [E.uid]: { x, z, ts: Date.now() } });
        emitirPos();
      },
      borrarPos() {
        guardar(clave(mapaKey + "_pos"), {});
        emitirPos();
      },
      agregarNota(t) {
        const datos = leer(clave("notas"), {});
        datos["n" + Date.now()] = { t, a: E.nombre, ts: Date.now(), ok: false };
        guardar(clave("notas"), datos);
        emitirNotas();
      },
      borrarNota(id) {
        const datos = leer(clave("notas"), {});
        delete datos[id];
        guardar(clave("notas"), datos);
        emitirNotas();
      },
      setNotaOk(id, ok) {
        const datos = leer(clave("notas"), {});
        if (datos[id]) datos[id].ok = ok;
        guardar(clave("notas"), datos);
        emitirNotas();
      },
      salir() {},
    };
  }

  function crearStoreFirebase(codigo, cb) {
    const db = firebase.database();
    const raiz = db.ref(`rooms/${codigo}`);
    let refsMapa = []; // refs con listeners del mapa actual

    const jugRef = raiz.child(`dayz/jugadores/${E.uid}`);

    return {
      esSala: true,
      codigo,
      async iniciar(colorPreferido) {
        await jugRef.update({
          n: E.nombre,
          c: colorPreferido,
          online: true,
          ts: firebase.database.ServerValue.TIMESTAMP,
        });
        jugRef.child("online").onDisconnect().set(false);
        raiz.child("dayz/jugadores").on("value", (s) => cb.jugadores(s.val() || {}));
        raiz.child("dayz/notas").on("value", (s) => cb.notas(s.val() || {}));
      },
      suscribirMapa(k) {
        refsMapa.forEach((r) => r.off());
        refsMapa = [];
        const rm = raiz.child(`dayz/${k}/marcadores`);
        const rp = raiz.child(`dayz/${k}/pos`);
        rm.on("value", (s) => cb.marcadores(s.val() || {}));
        rp.on("value", (s) => cb.pos(s.val() || {}));
        refsMapa.push(rm, rp);
        raiz.child("mapa").set(k);
      },
      agregarMarcador(m) {
        m.ts = firebase.database.ServerValue.TIMESTAMP;
        raiz.child(`dayz/${E.mapaKey}/marcadores`).push(m);
      },
      borrarMarcador(id) {
        raiz.child(`dayz/${E.mapaKey}/marcadores/${id}`).remove();
      },
      setPos(x, z) {
        raiz.child(`dayz/${E.mapaKey}/pos/${E.uid}`).set({ x, z, ts: firebase.database.ServerValue.TIMESTAMP });
      },
      borrarPos() {
        raiz.child(`dayz/${E.mapaKey}/pos/${E.uid}`).remove();
      },
      agregarNota(t) {
        raiz.child("dayz/notas").push({ t, a: E.nombre, ts: firebase.database.ServerValue.TIMESTAMP, ok: false });
      },
      borrarNota(id) {
        raiz.child(`dayz/notas/${id}`).remove();
      },
      setNotaOk(id, ok) {
        raiz.child(`dayz/notas/${id}/ok`).set(ok);
      },
      salir() {
        refsMapa.forEach((r) => r.off());
        raiz.child("dayz/jugadores").off();
        raiz.child("dayz/notas").off();
        jugRef.child("online").onDisconnect().cancel();
        jugRef.child("online").set(false);
      },
    };
  }

  /* ============================================================
     MAPA (Leaflet)
     ============================================================ */

  function crsPara(size) {
    return L.extend({}, L.CRS.Simple, {
      transformation: new L.Transformation(256 / size, 0, -256 / size, 256),
    });
  }

  function crearMapa(mapaKey, centro, zoom) {
    const cfg = MAPAS[mapaKey];
    if (E.mapa) { E.mapa.remove(); E.mapa = null; }
    E.mapaKey = mapaKey;

    const mapa = L.map("mapa", {
      crs: crsPara(cfg.size),
      minZoom: 1,
      maxZoom: 10,
      zoomControl: !ES_TACTIL,
      attributionControl: true,
      maxBounds: [[-cfg.size * 0.15, -cfg.size * 0.15], [cfg.size * 1.15, cfg.size * 1.15]],
      maxBoundsViscosity: 0.7,
      doubleClickZoom: false,
    });
    E.mapa = mapa;

    const limites = L.latLngBounds([[0, 0], [cfg.size, cfg.size]]);
    const opciones = {
      minNativeZoom: 0,
      maxNativeZoom: cfg.maxNativo,
      tileSize: 256,
      noWrap: true,
      bounds: limites,
      attribution: 'Tiles © <a href="https://dayz.xam.nu" target="_blank" rel="noopener">Xam.nu</a> · DayZ © Bohemia Interactive',
    };
    E.capas.topo = L.tileLayer(cfg.topo, opciones);
    E.capas.sat = L.tileLayer(cfg.sat, opciones);
    E.capas[E.capaBase === "sat" ? "sat" : "topo"].addTo(mapa);

    E.capas.lugares = L.layerGroup();
    E.capas.lugaresMil = L.layerGroup();
    E.capas.marcadores = L.layerGroup().addTo(mapa);
    E.capas.jugadores = L.layerGroup().addTo(mapa);
    E.capas.medir = L.layerGroup().addTo(mapa);
    if ($("chk-lugares").checked) E.capas.lugares.addTo(mapa);
    if ($("chk-militar").checked) E.capas.lugaresMil.addTo(mapa);

    prepararLugares(mapaKey);

    mapa.setView(centro || [cfg.size / 2, cfg.size / 2], zoom || 2);

    mapa.on("zoomend", refrescarLugares);
    mapa.on("moveend", () => { escribirHash(); if (ES_TACTIL) mostrarCoords(mapa.getCenter()); });
    mapa.on("mousemove", (ev) => mostrarCoords(ev.latlng));
    mapa.on("click", clickEnMapa);

    refrescarLugares();
    escribirHash();
  }

  function mostrarCoords(latlng) {
    const x = latlng.lng, z = latlng.lat;
    const size = MAPAS[E.mapaKey].size;
    if (x < 0 || z < 0 || x > size || z > size) return;
    $("pie-coords").textContent = `${fmtCoords(x, z)} · cuadr. ${cuadricula(x, z)}`;
  }

  /* ----- Capa de nombres de lugares ----- */
  function prepararLugares(mapaKey) {
    E.lugares = [];
    const cfg = MAPAS[mapaKey];
    const datos = cfg.lugares ? window[cfg.lugares] : null;
    if (!datos) return;
    datos.forEach((p) => {
      const tipo = TIPOS_LUGAR[p.t] || TIPOS_LUGAR.paraje;
      const span = document.createElement("span");
      span.textContent = p.n;
      if (p.ru && p.ru !== p.n) {
        const ru = document.createElement("span");
        ru.className = "ru";
        ru.textContent = p.ru;
        span.appendChild(ru);
      }
      const icono = L.divIcon({ className: "lg " + tipo.clase, html: span.outerHTML, iconSize: [0, 0] });
      const marker = L.marker([p.z, p.x], { icon: icono, interactive: false, keyboard: false });
      E.lugares.push({ marker, mz: p.t === "capital" ? 2 : p.mz, militar: p.t === "militar" });
    });
  }

  function refrescarLugares() {
    if (!E.mapa) return;
    const zoom = E.mapa.getZoom();
    E.lugares.forEach((l) => {
      const capa = l.militar ? E.capas.lugaresMil : E.capas.lugares;
      const visible = zoom >= l.mz;
      if (visible && !capa.hasLayer(l.marker)) capa.addLayer(l.marker);
      if (!visible && capa.hasLayer(l.marker)) capa.removeLayer(l.marker);
    });
  }

  /* ----- Click en el mapa según el modo ----- */
  function clickEnMapa(ev) {
    const x = ev.latlng.lng, z = ev.latlng.lat;
    const size = MAPAS[E.mapaKey].size;
    if (x < 0 || z < 0 || x > size || z > size) return;

    if (E.modo === "medir") { agregarPuntoMedicion(ev.latlng); return; }
    if (E.modo === "pos") {
      E.store.setPos(Math.round(x), Math.round(z));
      ponerModo("normal");
      toast("📌 Posición marcada. Arrastrá tu punto para moverlo.");
      return;
    }
    abrirDialogoMarcador(x, z);
  }

  /* ============================================================
     MARCADORES DEL SQUAD
     ============================================================ */

  function abrirDialogoMarcador(x, z) {
    E.pendiente = { x: Math.round(x), z: Math.round(z) };
    $("dm-coords").textContent = `${fmtCoords(x, z)} · cuadr. ${cuadricula(x, z)}`;
    $("dm-nombre").value = "";
    pintarTiposDialogo();
    $("dialogo-marcador").classList.remove("oculto");
  }

  function pintarTiposDialogo() {
    const cont = $("dm-tipos");
    cont.textContent = "";
    Object.entries(TIPOS_MARCADOR).forEach(([clave, t]) => {
      const b = document.createElement("button");
      b.className = "dm-tipo" + (clave === E.tipoElegido ? " activo" : "");
      const em = document.createElement("span");
      em.className = "em";
      em.textContent = t.emoji;
      const et = document.createElement("span");
      et.textContent = t.nombre;
      b.append(em, et);
      b.addEventListener("click", () => {
        E.tipoElegido = clave;
        localStorage.setItem("dayz_tipo", clave);
        pintarTiposDialogo();
      });
      cont.appendChild(b);
    });
  }

  function confirmarMarcador() {
    if (!E.pendiente) return;
    const nombre = $("dm-nombre").value.trim().slice(0, 30);
    E.store.agregarMarcador({
      x: E.pendiente.x,
      z: E.pendiente.z,
      t: E.tipoElegido,
      n: nombre,
      a: E.nombre,
    });
    cerrarDialogoMarcador();
  }

  function cerrarDialogoMarcador() {
    E.pendiente = null;
    $("dialogo-marcador").classList.add("oculto");
  }

  function pintarMarcadores(datos) {
    E.marcadores = datos || {};
    if (!E.mapa) return;
    const capa = E.capas.marcadores;
    capa.clearLayers();
    Object.entries(E.marcadores).forEach(([id, m]) => {
      const tipo = TIPOS_MARCADOR[m.t] || TIPOS_MARCADOR.encuentro;
      const pin = document.createElement("div");
      pin.className = "mk-pin";
      const em = document.createElement("span");
      em.className = "em";
      em.textContent = tipo.emoji;
      pin.appendChild(em);
      if (m.n) {
        const nom = document.createElement("span");
        nom.className = "nom";
        nom.textContent = m.n;
        pin.appendChild(nom);
      }
      const icono = L.divIcon({ className: "mk-icono", html: pin.outerHTML, iconSize: [0, 0] });
      const marker = L.marker([m.z, m.x], { icon: icono });
      marker.bindPopup(() => popupMarcador(id, m));
      capa.addLayer(marker);
    });
    pintarListaMarcadores();
  }

  function popupMarcador(id, m) {
    const tipo = TIPOS_MARCADOR[m.t] || TIPOS_MARCADOR.encuentro;
    const cont = document.createElement("div");
    const tit = document.createElement("div");
    tit.className = "pp-titulo";
    tit.textContent = `${tipo.emoji} ${m.n || tipo.nombre}`;
    const sub = document.createElement("div");
    sub.className = "pp-sub";
    sub.textContent = `${tipo.nombre} · ${m.a || "?"} · ${fmtCoords(m.x, m.z)}`;
    const acc = document.createElement("div");
    acc.className = "pp-acciones";
    const borrar = document.createElement("button");
    borrar.className = "pp-btn";
    borrar.textContent = "🗑 Borrar";
    borrar.addEventListener("click", () => {
      E.store.borrarMarcador(id);
      E.mapa.closePopup();
    });
    acc.appendChild(borrar);
    cont.append(tit, sub, acc);
    return cont;
  }

  function pintarListaMarcadores() {
    const ul = $("lista-marcadores");
    ul.textContent = "";
    const entradas = Object.entries(E.marcadores);
    if (!entradas.length) {
      const li = document.createElement("li");
      li.className = "lista-vacia";
      li.textContent = "Sin marcadores. Tocá el mapa para agregar uno.";
      ul.appendChild(li);
      return;
    }
    entradas
      .sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0))
      .forEach(([id, m]) => {
        const tipo = TIPOS_MARCADOR[m.t] || TIPOS_MARCADOR.encuentro;
        const li = document.createElement("li");
        const ir = document.createElement("button");
        ir.className = "mk-ir";
        const txt = document.createElement("span");
        txt.textContent = `${tipo.emoji} ${m.n || tipo.nombre}`;
        const autor = document.createElement("span");
        autor.className = "mk-autor";
        autor.textContent = m.a || "";
        ir.append(txt, autor);
        ir.addEventListener("click", () => {
          E.mapa.flyTo([m.z, m.x], Math.max(E.mapa.getZoom(), 6));
          cerrarPaneles();
        });
        const borrar = document.createElement("button");
        borrar.className = "mk-borrar";
        borrar.textContent = "🗑";
        borrar.title = "Borrar marcador";
        borrar.addEventListener("click", () => E.store.borrarMarcador(id));
        li.append(ir, borrar);
        ul.appendChild(li);
      });
  }

  /* ============================================================
     JUGADORES Y POSICIONES EN VIVO
     ============================================================ */

  let jugadoresDatos = {};
  let posDatos = {};

  function pintarJugadores(datos) {
    jugadoresDatos = datos || {};
    const online = Object.values(jugadoresDatos).filter((j) => j.online).length;
    const badge = $("sala-badge");
    if (E.store && E.store.esSala && online > 0) {
      badge.textContent = online;
      badge.classList.remove("oculto");
    } else {
      badge.classList.add("oculto");
    }
    const ul = $("lista-jugadores");
    ul.textContent = "";
    Object.entries(jugadoresDatos).forEach(([uid, j]) => {
      const li = document.createElement("li");
      if (!j.online) li.classList.add("desconectado");
      const punto = document.createElement("span");
      punto.className = "punto";
      punto.style.background = j.c || "#888";
      const nom = document.createElement("span");
      nom.textContent = j.n || "?";
      li.append(punto, nom);
      if (uid === E.uid) {
        const vos = document.createElement("span");
        vos.className = "vos";
        vos.textContent = "vos";
        li.appendChild(vos);
      }
      ul.appendChild(li);
    });
    pintarPosiciones(posDatos);
  }

  function pintarPosiciones(datos) {
    posDatos = datos || {};
    if (!E.mapa) return;
    const capa = E.capas.jugadores;
    capa.clearLayers();
    Object.entries(posDatos).forEach(([uid, p]) => {
      const j = jugadoresDatos[uid] || {};
      const propio = uid === E.uid;
      const pin = document.createElement("div");
      pin.className = "jug-pin" + (propio ? " propio" : "");
      const punto = document.createElement("div");
      punto.className = "jug-punto";
      punto.style.background = j.c || "#e8a33d";
      const nom = document.createElement("span");
      nom.className = "jug-nom";
      nom.textContent = (j.n || "?") + (propio ? " (vos)" : "");
      pin.append(punto, nom);
      const icono = L.divIcon({ className: "jug-icono", html: pin.outerHTML, iconSize: [0, 0] });
      const marker = L.marker([p.z, p.x], { icon: icono, draggable: propio, zIndexOffset: 500 });
      if (propio) {
        marker.on("dragend", () => {
          const ll = marker.getLatLng();
          E.store.setPos(Math.round(ll.lng), Math.round(ll.lat));
        });
        marker.bindPopup(() => {
          const cont = document.createElement("div");
          const tit = document.createElement("div");
          tit.className = "pp-titulo";
          tit.textContent = "📌 Tu posición";
          const acc = document.createElement("div");
          acc.className = "pp-acciones";
          const quitar = document.createElement("button");
          quitar.className = "pp-btn";
          quitar.textContent = "Quitar del mapa";
          quitar.addEventListener("click", () => {
            E.store.borrarPos();
            E.mapa.closePopup();
          });
          acc.appendChild(quitar);
          cont.append(tit, acc);
          return cont;
        });
      }
      capa.addLayer(marker);
    });
  }

  /* ============================================================
     NOTAS DEL SQUAD
     ============================================================ */

  function pintarNotas(datos) {
    const ul = $("lista-notas");
    ul.textContent = "";
    const entradas = Object.entries(datos || {});
    if (!entradas.length) {
      const li = document.createElement("li");
      li.className = "lista-vacia";
      li.textContent = "Sin notas todavía. Anotá lo importante del squad acá.";
      ul.appendChild(li);
      return;
    }
    entradas
      .sort((a, b) => (a[1].ts || 0) - (b[1].ts || 0))
      .forEach(([id, n]) => {
        const li = document.createElement("li");
        if (n.ok) li.classList.add("nota-hecha");
        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.checked = !!n.ok;
        chk.addEventListener("change", () => E.store.setNotaOk(id, chk.checked));
        const texto = document.createElement("div");
        texto.className = "nota-texto";
        texto.textContent = n.t || "";
        const autor = document.createElement("span");
        autor.className = "nota-autor";
        autor.textContent = n.a || "";
        texto.appendChild(autor);
        const borrar = document.createElement("button");
        borrar.className = "nota-borrar";
        borrar.textContent = "🗑";
        borrar.addEventListener("click", () => E.store.borrarNota(id));
        li.append(chk, texto, borrar);
        ul.appendChild(li);
      });
  }

  /* ============================================================
     MEDICIÓN DE DISTANCIA
     ============================================================ */

  function agregarPuntoMedicion(latlng) {
    E.medirPuntos.push(latlng);
    if (!E.medirLinea) {
      E.medirLinea = L.polyline(E.medirPuntos, {
        color: "#e8a33d",
        weight: 3,
        dashArray: "6 6",
      }).addTo(E.capas.medir);
    } else {
      E.medirLinea.setLatLngs(E.medirPuntos);
    }
    let total = 0;
    for (let i = 1; i < E.medirPuntos.length; i++) {
      total += E.mapa.distance(E.medirPuntos[i - 1], E.medirPuntos[i]);
    }
    const min = total / 6 / 60; // ~6 m/s trotando
    const texto =
      total >= 1000
        ? `${(total / 1000).toFixed(2)} km · ~${Math.round(min)} min trotando`
        : `${Math.round(total)} m · ~${Math.max(1, Math.round(min))} min trotando`;
    if (E.medirTip) E.capas.medir.removeLayer(E.medirTip);
    E.medirTip = L.marker(latlng, { interactive: false, icon: L.divIcon({ className: "", iconSize: [0, 0] }) })
      .bindTooltip(texto, { permanent: true, className: "medir-tip", direction: "top", offset: [0, -8] })
      .addTo(E.capas.medir);
  }

  function limpiarMedicion() {
    E.medirPuntos = [];
    E.medirLinea = null;
    E.medirTip = null;
    E.capas.medir.clearLayers();
  }

  /* ============================================================
     MODOS Y CONTROLES DE LA BARRA
     ============================================================ */

  function ponerModo(modo) {
    if (E.modo === "medir" && modo !== "medir") limpiarMedicion();
    E.modo = modo;
    $("btn-regla").classList.toggle("activo", modo === "medir");
    $("btn-pos").classList.toggle("activo", modo === "pos");
    const el = $("pie-modo");
    if (modo === "medir") el.textContent = "📏 Tocá el mapa para medir · volvé a tocar el botón para salir";
    else if (modo === "pos") el.textContent = "📌 Tocá el mapa donde estás parado";
    else el.textContent = "";
    $("mapa").style.cursor = modo === "normal" ? "" : "crosshair";
  }

  function cerrarPaneles() {
    $("panel-sala").classList.add("oculto");
    $("panel-notas").classList.add("oculto");
    $("pop-capas").classList.add("oculto");
  }

  function alternar(idPanel) {
    const el = $(idPanel);
    const estabaOculto = el.classList.contains("oculto");
    cerrarPaneles();
    if (estabaOculto) el.classList.remove("oculto");
  }

  /* ============================================================
     BUSCADOR DE LUGARES
     ============================================================ */

  function buscarLugares(q) {
    const cfg = MAPAS[E.mapaKey];
    const datos = cfg.lugares ? window[cfg.lugares] : null;
    const cont = $("buscar-resultados");
    cont.textContent = "";
    if (!datos || !q || q.length < 2) {
      cont.classList.add("oculto");
      return;
    }
    const nq = normalizar(q);
    const resultados = datos
      .filter((p) => normalizar(p.n).includes(nq) || (p.ru && p.ru.toLowerCase().includes(nq)))
      .slice(0, 8);
    if (!resultados.length) {
      cont.classList.add("oculto");
      return;
    }
    resultados.forEach((p) => {
      const b = document.createElement("button");
      const nom = document.createElement("span");
      nom.textContent = p.ru && p.ru !== p.n ? `${p.n} · ${p.ru}` : p.n;
      const tipo = document.createElement("span");
      tipo.className = "tipo";
      tipo.textContent = (TIPOS_LUGAR[p.t] || TIPOS_LUGAR.paraje).etiqueta;
      b.append(nom, tipo);
      b.addEventListener("click", () => {
        cont.classList.add("oculto");
        $("in-buscar").value = p.n;
        E.mapa.flyTo([p.z, p.x], Math.max(E.mapa.getZoom(), 6), { duration: 0.8 });
      });
      cont.appendChild(b);
    });
    cont.classList.remove("oculto");
  }

  /* ============================================================
     SALAS
     ============================================================ */

  const callbacks = {
    marcadores: pintarMarcadores,
    pos: pintarPosiciones,
    jugadores: pintarJugadores,
    notas: pintarNotas,
  };

  function firebaseDisponible() {
    return typeof firebase !== "undefined" && firebase.apps !== undefined;
  }

  async function crearSala(mapaKey) {
    const db = firebase.database();
    for (let intento = 0; intento < 5; intento++) {
      const codigo = generarCodigo();
      const ref = db.ref(`rooms/${codigo}`);
      const snap = await ref.get();
      if (!snap.exists()) {
        await ref.set({
          app: "dayz-mapa",
          creado: firebase.database.ServerValue.TIMESTAMP,
          mapa: mapaKey,
          currentMode: "dayz-mapa",
        });
        return codigo;
      }
    }
    throw new Error("No pude generar un código libre. Probá de nuevo.");
  }

  async function unirseSala(codigo) {
    const db = firebase.database();
    const snap = await db.ref(`rooms/${codigo}`).get();
    if (!snap.exists()) throw new Error(`La sala ${codigo} no existe. ¿Está bien el código?`);
    const datos = snap.val();
    if (datos.app !== "dayz-mapa") throw new Error(`El código ${codigo} es de otra app (INSERT COIN).`);
    return datos;
  }

  function colorLibre() {
    const usados = Object.values(jugadoresDatos).map((j) => j.c);
    return PALETA.find((c) => !usados.includes(c)) || PALETA[Math.floor(Math.random() * PALETA.length)];
  }

  async function entrarEnSala(codigo, mapaKey) {
    if (E.store) E.store.salir();
    E.sala = codigo;
    E.store = crearStoreFirebase(codigo, callbacks);
    await E.store.iniciar(colorLibre());
    E.store.suscribirMapa(mapaKey);
    localStorage.setItem("dayz_sala", codigo);
    $("sala-codigo").textContent = codigo.split("").join(" ");
    $("sala-codigo-caja").classList.remove("oculto");
    $("sala-solo-aviso").classList.add("oculto");
    $("btn-salir-sala").classList.remove("oculto");
    escribirHash();
  }

  function entrarSolo(mapaKey) {
    if (E.store) E.store.salir();
    E.sala = null;
    E.store = crearStoreLocal(callbacks);
    E.store.iniciar();
    E.store.suscribirMapa(mapaKey);
    localStorage.removeItem("dayz_sala");
    $("sala-codigo-caja").classList.add("oculto");
    $("sala-solo-aviso").classList.remove("oculto");
    $("btn-salir-sala").classList.add("oculto");
    escribirHash();
  }

  function cambiarMapa(mapaKey) {
    if (mapaKey === E.mapaKey) return;
    crearMapa(mapaKey);
    E.store.suscribirMapa(mapaKey);
    $("sel-mapa").value = mapaKey;
    const buscador = $("in-buscar");
    buscador.value = "";
    buscador.placeholder = MAPAS[mapaKey].lugares ? "Buscar lugar…" : "Buscar (solo en Chernarus+)";
    toast(`Mapa: ${MAPAS[mapaKey].nombre}`);
  }

  /* ============================================================
     ARRANQUE Y EVENTOS DE UI
     ============================================================ */

  function errorInicio(msg) {
    const el = $("inicio-error");
    el.textContent = msg;
    el.classList.remove("oculto");
  }

  function empezar(mapaKey) {
    $("inicio").classList.add("oculto");
    $("barra").classList.remove("oculto");
    $("pie").classList.remove("oculto");
    const hash = leerHash();
    let centro = null, zoom = null;
    if (hash.m === mapaKey && hash.c) {
      const [x, z] = hash.c.split(",").map(Number);
      if (isFinite(x) && isFinite(z)) centro = [z, x];
      if (hash.z && isFinite(+hash.z)) zoom = +hash.z;
    }
    crearMapa(mapaKey, centro, zoom);
    $("sel-mapa").value = mapaKey;
    $("in-buscar").placeholder = MAPAS[mapaKey].lugares ? "Buscar lugar…" : "Buscar (solo en Chernarus+)";
  }

  function guardarNombre() {
    const v = $("in-nombre").value.trim().slice(0, 16) || "Superviviente";
    E.nombre = v;
    localStorage.setItem("dayz_nombre", v);
    return v;
  }

  function init() {
    // identidad persistente
    E.uid = localStorage.getItem("dayz_uid");
    if (!E.uid) {
      E.uid = "u" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("dayz_uid", E.uid);
    }
    $("in-nombre").value = localStorage.getItem("dayz_nombre") || "";

    // firebase
    try {
      firebase.initializeApp(window.FIREBASE_CONFIG);
    } catch (e) {
      console.warn("Firebase no disponible:", e);
    }

    // hash: sala y mapa precargados
    const hash = leerHash();
    if (hash.m && MAPAS[hash.m]) $("in-mapa").value = hash.m;
    const salaPrevia = (hash.s || localStorage.getItem("dayz_sala") || "").toUpperCase();
    if (salaPrevia && salaPrevia.length === 4) $("in-codigo").value = salaPrevia;

    /* ---- pantalla de inicio ---- */
    $("btn-crear").addEventListener("click", async () => {
      guardarNombre();
      const mapaKey = $("in-mapa").value;
      try {
        const codigo = await crearSala(mapaKey);
        empezar(mapaKey);
        await entrarEnSala(codigo, mapaKey);
        alternar("panel-sala");
        toast(`Sala ${codigo} creada. Compartí el código con tu squad 🎯`);
      } catch (e) {
        errorInicio(e.message || "No pude crear la sala. ¿Hay internet?");
      }
    });

    $("btn-unirse").addEventListener("click", async () => {
      guardarNombre();
      const codigo = $("in-codigo").value.trim().toUpperCase();
      if (codigo.length !== 4) { errorInicio("El código tiene 4 letras/números."); return; }
      try {
        const sala = await unirseSala(codigo);
        const mapaKey = MAPAS[sala.mapa] ? sala.mapa : "chernarusplus";
        empezar(mapaKey);
        await entrarEnSala(codigo, mapaKey);
        toast(`Te uniste a la sala ${codigo} ✔`);
      } catch (e) {
        errorInicio(e.message || "No pude entrar a la sala.");
      }
    });

    $("in-codigo").addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") $("btn-unirse").click();
    });

    $("btn-solo").addEventListener("click", () => {
      guardarNombre();
      const mapaKey = $("in-mapa").value;
      empezar(mapaKey);
      entrarSolo(mapaKey);
    });

    /* ---- barra ---- */
    $("btn-regla").addEventListener("click", () => ponerModo(E.modo === "medir" ? "normal" : "medir"));
    $("btn-pos").addEventListener("click", () => ponerModo(E.modo === "pos" ? "normal" : "pos"));
    $("btn-capas").addEventListener("click", () => alternar("pop-capas"));
    $("btn-notas").addEventListener("click", () => alternar("panel-notas"));
    $("btn-sala").addEventListener("click", () => alternar("panel-sala"));

    document.querySelectorAll(".cerrar").forEach((b) =>
      b.addEventListener("click", () => $(b.dataset.cierra).classList.add("oculto"))
    );

    /* ---- capas ---- */
    document.querySelectorAll('input[name="capa-base"]').forEach((r) =>
      r.addEventListener("change", () => {
        E.capaBase = r.value;
        if (r.value === "topo") {
          E.mapa.removeLayer(E.capas.sat);
          E.capas.topo.addTo(E.mapa);
        } else {
          E.mapa.removeLayer(E.capas.topo);
          E.capas.sat.addTo(E.mapa);
        }
      })
    );
    $("chk-lugares").addEventListener("change", (ev) => {
      if (ev.target.checked) E.capas.lugares.addTo(E.mapa);
      else E.mapa.removeLayer(E.capas.lugares);
    });
    $("chk-militar").addEventListener("change", (ev) => {
      if (ev.target.checked) E.capas.lugaresMil.addTo(E.mapa);
      else E.mapa.removeLayer(E.capas.lugaresMil);
    });
    $("chk-ruso").addEventListener("change", (ev) => {
      $("mapa").classList.toggle("sin-ruso", !ev.target.checked);
      localStorage.setItem("dayz_ruso", ev.target.checked ? "1" : "0");
    });
    if (localStorage.getItem("dayz_ruso") === "0") {
      $("chk-ruso").checked = false;
      $("mapa").classList.add("sin-ruso");
    }
    $("sel-mapa").addEventListener("change", (ev) => cambiarMapa(ev.target.value));

    /* ---- sala ---- */
    $("btn-copiar-link").addEventListener("click", async () => {
      const url = `${location.origin}${location.pathname}#m=${E.mapaKey}&s=${E.sala}`;
      try {
        await navigator.clipboard.writeText(url);
        toast("🔗 Link copiado. Pasáselo a tu squad.");
      } catch {
        prompt("Copiá el link:", url);
      }
    });
    $("btn-salir-sala").addEventListener("click", () => {
      entrarSolo(E.mapaKey);
      toast("Saliste de la sala. Modo solo.");
    });
    $("btn-cambiar-sala").addEventListener("click", () => {
      cerrarPaneles();
      $("inicio").classList.remove("oculto");
    });

    /* ---- notas ---- */
    const agregarNota = () => {
      const v = $("in-nota").value.trim();
      if (!v) return;
      E.store.agregarNota(v.slice(0, 140));
      $("in-nota").value = "";
    };
    $("btn-agregar-nota").addEventListener("click", agregarNota);
    $("in-nota").addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") agregarNota();
    });

    /* ---- diálogo marcador ---- */
    $("dm-agregar").addEventListener("click", confirmarMarcador);
    $("dm-cancelar").addEventListener("click", cerrarDialogoMarcador);
    $("dialogo-marcador").addEventListener("click", (ev) => {
      if (ev.target === $("dialogo-marcador")) cerrarDialogoMarcador();
    });
    $("dm-nombre").addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") confirmarMarcador();
    });

    /* ---- buscador ---- */
    $("in-buscar").addEventListener("input", (ev) => buscarLugares(ev.target.value));
    $("in-buscar").addEventListener("focus", (ev) => buscarLugares(ev.target.value));
    document.addEventListener("click", (ev) => {
      if (!ev.target.closest(".buscador")) $("buscar-resultados").classList.add("oculto");
    });

    /* ---- pie: copiar coordenadas ---- */
    $("pie-coords").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText($("pie-coords").textContent);
        toast("Coordenadas copiadas");
      } catch { /* nada */ }
    });

    /* ---- teclado ---- */
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        cerrarDialogoMarcador();
        cerrarPaneles();
        if (E.modo !== "normal") ponerModo("normal");
      }
    });

    /* ---- service worker ---- */
    if ("serviceWorker" in navigator && location.protocol === "https:") {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
