// Auto-generated view manifest — order = script order in index.html.
// Loaded while the parser is in the body; document.write appends each
// view's css+js right here so window.ObservatoryViews is populated
// before app.js runs. To add a view: drop .js/.css here, append the id.
(function () {
  var VIEWS = ["waterfall", "swarm", "treemap", "sankey", "funnel", "latency", "orrery", "budget", "marimekko", "chord", "network", "stream", "chips", "factory", "bees", "stellar", "play", "burn", "candle", "gauge", "bloom", "petri", "aurora", "constellation", "tide", "maze", "quartz", "ripple", "lantern", "pinwheel", "chime", "firework", "fountain", "pendulum", "aurora2", "beehive", "vine", "galton", "tidepool", "pinboard", "rosetta", "eclipse", "tapestry", "lighthouse", "harbor", "harbor2", "desert", "fortune", "grove", "pond", "metro", "glacier", "volcano", "canyon", "lake", "harvest2", "marina", "river", "forest", "village", "beach", "skyline", "pasture", "wetland", "garden", "monsoon", "fjord", "atoll", "meadow", "tundra", "dune", "lagoon", "oasis", "cascade", "delta", "solarwind", "mangrove", "heath", "steppe", "pampa", "mesa", "terrace", "kelp", "prairie", "taiga", "geyser", "meteor", "cavern", "bayou", "fen", "bog", "marsh", "karst", "badlands", "veldt", "chaparral", "glade", "cove", "islet", "dell", "sierra", "basin", "outcrop", "plateau", "ridge", "escarp", "bluff", "crag", "inlet", "loch", "cape", "headland", "sound", "creek", "point", "abyss", "grotto", "hollow", "savanna", "jungle", "moor", "vale", "understory", "butte", "pinnacle", "rainforest", "shoal", "estuary", "arch", "hoodoos", "domes", "tors", "needles", "spires", "monoliths", "towers", "crags", "mesas", "dunes", "outcrops", "pinnacles", "summits", "chimneys", "arches", "lighthouses", "castles", "ridges", "terraces", "waterwheels", "pagodas", "oceans", "moorland", "vineyards", "orchards", "hedges", "crofts", "paddocks", "gardens", "groves", "harbours", "fjords", "lochs", "geysers", "bayous", "tarns", "meres", "springs", "brooks", "fords", "inlets", "creeks", "sloughs", "deltas", "atolls", "reefs", "lagoons", "shoals", "sandbars", "breakers", "icebergs", "floes", "nunataks", "moraines", "crevasses", "eskers", "cirques", "drumlins", "kames", "seracs", "buttes", "fins", "yardangs", "playas", "wadis", "hamadas", "forecast", "trophies", "burnrate", "scorecard", "latrank", "league", "versus", "accounts", "vaults", "onsen", "nightmarket", "bonfire", "workshop", "stadium", "theater", "arena", "vineyard", "kitchen", "hangar", "planetarium", "museum", "conservatory", "atrium", "kiln", "igloo", "apiary", "avalanche", "arboretum", "brewery", "distillery", "mill", "foundry", "smithy", "tannery", "glassworks", "shipyard", "sawmill", "printshop", "cooperage", "saddler", "cobbler", "fletcher", "bowyer", "goldsmith", "silversmith", "locksmith", "terminal", "kaleidoscope", "etching", "monotype", "bazaar", "telescope", "seaport", "laboratory", "checkpoint", "gatehouse", "tollbooth", "caravanserai", "ranch2", "paddock", "corral", "pasture2", "atelier", "studio2", "workshop2", "vivarium", "waypoint", "crossroads", "junction2", "interchange", "garden2", "orchard2", "vineyard2", "grove2", "souk", "fair2", "market2", "meadow2", "threshold2", "roundabout", "oasis2", "reserve2", "aviary", "greenhouse", "winery", "bakery", "carnival", "studio", "campfire", "aquarium", "dojo", "library", "arcade", "castle", "observatory", "station", "circus", "subway", "windmill", "orchestra", "harvest", "hotpot", "racing", "forge", "reef", "tavern", "rodeo", "depot", "laundry", "temple", "market", "gallery", "zen", "sakura", "rain", "rain2", "tank", "camp", "prism", "terrarium", "echo", "mosaic", "origami", "firefly", "mandala", "quilt", "vortex", "kaleido", "orbit", "bubbles", "spectrum", "wave", "galaxy", "dna", "nebula"];
  var html = '';
  for (var i = 0; i < VIEWS.length; i++) {
    var v = VIEWS[i];
    html += '<link rel="stylesheet" href="assets/views/' + v + '.css">' +
            '<script src="assets/views/' + v + '.js"><\/script>';
  }
  document.write(html);
  window.ObservatoryManifest = VIEWS;
})();

/* stage-view placeholders: appended into .route-stage on DOMContentLoaded.
   Each view id in the manifest gets one empty .stage-view div — modules
   register renderers that fill it on demand. */
(function () {
  function seed() {
    var stage = document.querySelector('.route-stage');
    if (!stage) return;
    (window.ObservatoryManifest || []).forEach(function (v) {
      if (v === 'route' || document.getElementById('view-' + v)) return;
      var d = document.createElement('div');
      d.className = 'stage-view';
      d.id = 'view-' + v;
      d.hidden = true;
      stage.appendChild(d);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', seed);
  else seed();
})();
