/* Mapas disponibles. Tiles de la comunidad (dayz.xam.nu), versión DayZ 1.27.
   size = lado del mapa en metros de juego. Los tiles cubren todo el mapa en z0 (256px). */
window.MAPAS = {
  chernarusplus: {
    nombre: "Chernarus+",
    size: 15360,
    maxNativo: 8,
    topo: "https://static.xam.nu/dayz/maps/chernarusplus/1.27/topographic/{z}/{x}/{y}.webp",
    sat: "https://static.xam.nu/dayz/maps/chernarusplus/1.27/satellite/{z}/{x}/{y}.webp",
    lugares: "LUGARES_CHERNARUS",
    instalaciones: "INSTALACIONES_CHERNARUS",
  },
  livonia: {
    nombre: "Livonia",
    size: 12800,
    maxNativo: 8,
    topo: "https://static.xam.nu/dayz/maps/livonia/1.27/topographic/{z}/{x}/{y}.webp",
    sat: "https://static.xam.nu/dayz/maps/livonia/1.27/satellite/{z}/{x}/{y}.webp",
    lugares: null,
    instalaciones: "INSTALACIONES_LIVONIA",
  },
  sakhal: {
    nombre: "Sakhal",
    size: 15360,
    maxNativo: 8,
    topo: "https://static.xam.nu/dayz/maps/sakhal/1.27/topographic/{z}/{x}/{y}.webp",
    sat: "https://static.xam.nu/dayz/maps/sakhal/1.27/satellite/{z}/{x}/{y}.webp",
    lugares: null,
    instalaciones: "INSTALACIONES_SAKHAL",
  },
};

/* Instalaciones (datos oficiales de Bohemia: DayZ-Central-Economy).
   mz = zoom mínimo para mostrar el ícono. def:false = apagada por defecto. */
window.TIPOS_INSTALACION = {
  toxica: { emoji: "☣️", nombre: "Zona tóxica (NBC)", mz: 3 },
  militar: { emoji: "🪖", nombre: "Instalación militar", mz: 4 },
  heli: { emoji: "🚁", nombre: "Posible heli caído", mz: 5 },
  spawn: { emoji: "🧍", nombre: "Spawn de jugadores", mz: 3 },
  combustible: { emoji: "⛽", nombre: "Estación de servicio", mz: 4 },
  hospital: { emoji: "🏥", nombre: "Hospital", mz: 5 },
  policia: { emoji: "🚓", nombre: "Comisaría", mz: 5 },
  agua: { emoji: "💧", nombre: "Bomba de agua", mz: 6 },
  castillo: { emoji: "🏰", nombre: "Castillo", mz: 4 },
  iglesia: { emoji: "⛪", nombre: "Iglesia", mz: 6 },
  faro: { emoji: "🗼", nombre: "Faro", mz: 5 },
  termal: { emoji: "♨️", nombre: "Aguas termales", mz: 4 },
  lobo: { emoji: "🐺", nombre: "Territorio de lobos", mz: 5 },
  oso: { emoji: "🐻", nombre: "Territorio de osos", mz: 5 },
  fauna: { emoji: "🦌", nombre: "Ciervos y jabalíes", mz: 6, def: false },
  vehiculo: { emoji: "🚙", nombre: "Posible spawn de vehículo", mz: 6, def: false },
  bote: { emoji: "🛶", nombre: "Posible spawn de bote", mz: 6, def: false },
  caza: { emoji: "🏹", nombre: "Torre de caza", mz: 7, def: false },
};

/* Tipos de marcador del squad */
window.TIPOS_MARCADOR = {
  encuentro: { emoji: "🚩", nombre: "Encuentro", color: "#e8a33d" },
  base: { emoji: "🏠", nombre: "Base", color: "#81c784" },
  loot: { emoji: "🎒", nombre: "Loot", color: "#4fc3f7" },
  peligro: { emoji: "⚠️", nombre: "Peligro", color: "#ff8a65" },
  muerte: { emoji: "💀", nombre: "Muerte", color: "#e57373" },
  vehiculo: { emoji: "🚗", nombre: "Vehículo", color: "#ba68c8" },
  stash: { emoji: "📦", nombre: "Stash", color: "#ffd54f" },
  agua: { emoji: "💧", nombre: "Agua", color: "#4db6ac" },
};

/* Categorías de lugares (capa de nombres) */
window.TIPOS_LUGAR = {
  capital: { clase: "lg-capital", etiqueta: "Ciudad principal" },
  ciudad: { clase: "lg-ciudad", etiqueta: "Ciudad" },
  pueblo: { clase: "lg-pueblo", etiqueta: "Pueblo" },
  paraje: { clase: "lg-paraje", etiqueta: "Paraje" },
  militar: { clase: "lg-militar", etiqueta: "Zona militar" },
  cerro: { clase: "lg-cerro", etiqueta: "Cerro" },
  campamento: { clase: "lg-campamento", etiqueta: "Campamento" },
  estacion: { clase: "lg-estacion", etiqueta: "Estación de tren" },
  costa: { clase: "lg-costa", etiqueta: "Costa" },
  ruinas: { clase: "lg-ruinas", etiqueta: "Ruinas" },
};
