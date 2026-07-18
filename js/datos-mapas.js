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
  },
  livonia: {
    nombre: "Livonia",
    size: 12800,
    maxNativo: 8,
    topo: "https://static.xam.nu/dayz/maps/livonia/1.27/topographic/{z}/{x}/{y}.webp",
    sat: "https://static.xam.nu/dayz/maps/livonia/1.27/satellite/{z}/{x}/{y}.webp",
    lugares: null,
  },
  sakhal: {
    nombre: "Sakhal",
    size: 15360,
    maxNativo: 8,
    topo: "https://static.xam.nu/dayz/maps/sakhal/1.27/topographic/{z}/{x}/{y}.webp",
    sat: "https://static.xam.nu/dayz/maps/sakhal/1.27/satellite/{z}/{x}/{y}.webp",
    lugares: null,
  },
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
