# ☣ Mapa Squad — DayZ en español

Mapa interactivo de DayZ **100% en español**, con **marcadores compartidos en
tiempo real** para jugar con tu squad. Alternativa simple y sin publicidad a
iZurvive, pensada para coordinarse entre amigos.

**En vivo:** https://oldfashioned1994.github.io/dayz-mapa/

## Qué hace

- 🗺️ Mapas de **Chernarus+, Livonia y Sakhal** (topográfico y satelital, zoom hasta nivel de edificios)
- 👥 **Salas por código de 4 letras** — sin cuentas ni registro; creás la sala, pasás el código y listo
- 🚩 **Marcadores compartidos en vivo**: encuentro, base, loot, peligro, muerte, vehículo, stash, agua
- 📌 **Posición en vivo**: cada jugador marca dónde está y el resto lo ve al instante (arrastrable)
- 📝 **Notas del squad** sincronizadas (con check de "hecho")
- 📏 **Regla de distancia** con tiempo estimado de trote
- 🔍 **Buscador de lugares** (218 ubicaciones de Chernarus+ con categorías en español, zonas militares destacadas)
- 🇷🇺 **Nombres bilingües**: cada lugar muestra también su nombre en cirílico, igual que los carteles del juego (se puede apagar en Capas); el buscador encuentra en ambos idiomas
- 🪖 **Capa de instalaciones con datos oficiales de Bohemia** ([DayZ-Central-Economy](https://github.com/BohemiaInteractive/DayZ-Central-Economy)) en los 3 mapas: instalaciones militares (agrupadas con contador), posibles helis caídos, zonas tóxicas permanentes con su radio real (Rify, Pavlovo, Radunin, Lukov, volcán de Sakhal), estaciones de servicio, hospitales, comisarías, bombas de agua, castillos, iglesias y aguas termales — cada categoría con su toggle en Capas
- 📱 **PWA**: se instala en el celu y cachea mapa y tiles ya vistos
- 🧭 Coordenadas del juego (X/Z) y cuadrícula estilo iZurvive en el pie

También funciona **sin sala** (modo solo): los marcadores quedan guardados en el dispositivo.

## Stack

HTML/CSS/JS puro + [Leaflet](https://leafletjs.com/) (vendoreado) + Firebase
Realtime Database (misma base que INSERT COIN, salas en `/rooms/{código}` con
rama `dayz`). Hosting en GitHub Pages.

- Tiles: © [Xam.nu](https://dayz.xam.nu) (comunidad, DayZ 1.27)
- Lugares: convertidos del `citycoords.json` de iZurvive (Web Mercator → metros de juego, script en el historial del proyecto)
- DayZ © Bohemia Interactive — proyecto de fans, sin fines comerciales

## Estructura

```
index.html            pantalla de inicio + mapa + paneles
css/estilo.css        tema oscuro militar
js/app.js             toda la lógica (mapa, salas, marcadores, notas, regla)
js/datos-mapas.js     config de mapas y tipos de marcador/lugar
js/data/lugares-chernarus.js   218 lugares con coords en metros de juego
js/firebase-config.js claves públicas de Firebase (protege: reglas)
sw.js                 service worker (cache de cáscara + tiles)
```

## Datos en Firebase

```
rooms/{CODE}                  ← code de 4 chars (regla existente de INSERT COIN)
  app: "dayz-mapa"            ← distingue salas de este juego
  mapa: "chernarusplus"
  dayz/
    jugadores/{uid}: { n, c, online, ts }
    notas/{id}:      { t, a, ts, ok }
    {mapa}/marcadores/{id}: { x, z, t, n, a, ts }
    {mapa}/pos/{uid}:       { x, z, ts }
```

Las coordenadas siempre en **metros de juego** (X hacia el este, Z hacia el
norte), igual que las del propio DayZ.
