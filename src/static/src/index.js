// Nice hardcoded share symbol SVG!
const share_symbol = '<svg fill="#000000" xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 30 30" width="30px" height="30px"><path d="M 23 3 A 4 4 0 0 0 19 7 A 4 4 0 0 0 19.09375 7.8359375 L 10.011719 12.376953 A 4 4 0 0 0 7 11 A 4 4 0 0 0 3 15 A 4 4 0 0 0 7 19 A 4 4 0 0 0 10.013672 17.625 L 19.089844 22.164062 A 4 4 0 0 0 19 23 A 4 4 0 0 0 23 27 A 4 4 0 0 0 27 23 A 4 4 0 0 0 23 19 A 4 4 0 0 0 19.986328 20.375 L 10.910156 15.835938 A 4 4 0 0 0 11 15 A 4 4 0 0 0 10.90625 14.166016 L 19.988281 9.625 A 4 4 0 0 0 23 11 A 4 4 0 0 0 27 7 A 4 4 0 0 0 23 3 z"/></svg>';

/**
 * Create a search string that can be shared with others
 *
 * @param {L.Map} map The map to generate a search string from
 * @param {{a: String, b: L.TileLayer}} base_layers The available base layers
 * @param {{a: String, b: L.FeatureGroup}} overlays The available overlays
 * @returns {String} The search string to share
**/
function create_search_string(map, base_layers, overlays) {

	let search_params = new URLSearchParams("");
	
	for (const name in base_layers) {
		if (map.hasLayer(base_layers[name])) {
			search_params.set("base_layer", name);
			break;
		};
	};

	for (const name in overlays) {
		if (map.hasLayer(overlays[name])) {
			search_params.append("overlay", name);
		};
	};

	const center = map.getCenter();
	search_params.set("lat", center.lat);
	search_params.set("lon", center.lng);
	search_params.set("zoom", map.getZoom());

	return search_params.toString();
}

/**
 * Get the longitude, latitude and zoom level from a search, or revert to default values
 *
 * @param {URLSearchParams} search_params The active search
 * @returns {[Number, Number, Number]} The lat, lon and zoom
**/
function get_lon_lat_zoom(search_params) {

	let lat = search_params.get("lat") || 78.0;
	let lon = search_params.get("lon") || 16.0;
	let zoom = search_params.get("zoom") || 7;

	return [lat, lon, zoom];
}

/**
 * Add the overlays that are given in the search
 *
 * @param {URLSearchParams} search_params The active search
 * @param {L.Map} map The active Leaflet map
 * @param {{a: String, b: L.FeatureGroup}} overlays The available overlays
**/
function add_overlays(search_params, map, overlays) {
	for (const name of search_params.getAll("overlay")) {
		if (name in overlays) {
			overlays[name].addTo(map);
		};
	};
}

/**
 * Add the base layer that is given in the search, or revert to a default one
 *
 * @param {URLSearchParams} search_params The active search
 * @param {L.Map} map The active Leaflet map
 * @param {{a: String, b: L.TileLayer}} base_layers The available base layers
**/
function add_base_layer(search_params, map, base_layers) {
	const base_layer = search_params.get("base_layer");
	if (base_layer in base_layers) {
		base_layers[base_layer].addTo(map);
	} else {
		base_layers["NPI Basiskart (20m)"].addTo(map);
	};
}

/** 
 * Set up the main map
**/
async function setup_map() {

	// Parse the search strings, e.g. "?base_layer=OpenStreetMap"
	const search_string = window.location.search.slice(1);
	const search_params = new URLSearchParams(search_string);

	// Parse the starting lat/lon/zoom from the search (or default to all of Svalbard)
	const [lat, lon, zoom] = get_lon_lat_zoom(search_params);

	let map = L.map('map').setView([lat, lon], zoom);

	map.attributionControl.setPrefix("&copy; Erik Schytt Mannerfelt, <a href='https://uio.no'>UiO</a>, <a href='https://unis.no'>UNIS</a>");

	// Add generic functionality to add a text box anywhere
	L.Control.textbox = L.Control.extend({
		onAdd: function(map) {
			var text = L.DomUtil.create('div');
			text.style = this.options.style;
			text.id = this.options.id;
			text.innerHTML = this.options.text;//"<strong>Loading layers...</strong>";
			return text;
		},
		onRemove: function(map) {
			// Nothing to do here
		}
	});
	L.control.textbox = function(opts) { return new L.Control.textbox(opts);}

	L.Control.popuptext = L.Control.extend({
		onAdd: function(map) {

			let div = L.DomUtil.get("share-popup") || L.DomUtil.create('div');
			div.id = "share-popup";
			div.onclick = function() {console.log("hello")};
			div.innerHTML = '<div class="popup"><span class="popuptext" id="myPopup">Popup text...</span></div>';


			return div;
		},
		onRemove: function(map) {
			// Nothing to do here
		}
	});
	L.control.popuptext = function(opts) { return new L.Control.popuptext(opts);}

	// Add the loading text (which will later be removed)
	let loading_text = L.control.textbox({ text: "<strong>Loading layers...</strong>", id: "loading_text", style: "", position: 'topright' }).addTo(map);

	// Add the title in the bottom left corner
	L.control.textbox({text: "Svalbard Sphere Viewer", id: "title", style: "font-family: arial; font-size: 1.5em; text-shadow: 1px 1px 5px white;", position: "bottomleft"}).addTo(map);

	let base_layers = {
		/*
		"OpenTopoMap": L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
			attribution: "<a href='https://opentopomap.org/'>OpenTopoMap</a>"
		}),
		*/
		/*
		"OpenStreetMap": L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}', {
		attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
		}),
		*/
		"NPI Basiskart (20m)": L.tileLayer("/static/tiles/Basiskart_20m/{z}/{x}/{y}.png", {
			attribution: '&copy; <a href="https://www.npolar.no">NPI</a> Basemap',
				minZoom: 5,
				maxZoom: 13,
		}),
		"ESRI Satellite (online)": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
		attribution: '&copy; <a href="https://www.esri.com">ESRI</a> Satellite Basemap',
			minZoom: 1,
			maxZoom: 18,
	}),
		/*
		"dH dt⁻¹ 1936–1990": L.tileLayer("/static/tiles/dhdt/ddem_1936_1990_rendered/{z}/{x}/{y}.png", {
			attribution: "Data: <a href='https://doi.org/10.21334/npolar.2014.dce53a47'>NPI</a>",
			maxZoom: 13,
			tileSize: 256,
			zoomOffset: 0,
		}),
		"dH dt⁻¹ 1936–2010": L.tileLayer("/static/tiles/dhdt/dh_1936_2010_all_Svalbard_50m_rendered/{z}/{x}/{y}.png", {
			attribution: "1936 Data: <a href='https://doi.org/10.21334/npolar.2021.f6afca5c'>Geyman et al., 2022</a>",
			maxZoom: 13,
			tileSize: 256,
			zoomOffset: 0,
		}),
		"dH dt⁻¹ 1990–2010": L.tileLayer("/static/tiles/dhdt/ddem_1990_2010_rendered/{z}/{x}/{y}.png", {
			attribution: "Data: <a href='https://doi.org/10.21334/npolar.2014.dce53a47'>NPI</a>",
			maxZoom: 13,
			tileSize: 256,
			zoomOffset: 0,
		}),
		"dH dt⁻¹ 1990–2018": L.tileLayer("/static/tiles/dhdt/ddem_1990_2018_rendered/{z}/{x}/{y}.png", {
			attribution: "Data: <a href='https://doi.org/10.21334/npolar.2014.dce53a47'>NPI</a>, <a href='https://www.pgc.umn.edu/data/arcticdem/'>ArcticDEM</a>",
			maxZoom: 13,
			tileSize: 256,
			zoomOffset: 0,
		}),
		"dH dt⁻¹ 2010–2018": L.tileLayer("/static/tiles/dhdt/ddem_2010_2018_rendered/{z}/{x}/{y}.png", {
			attribution: "Data: <a href='https://doi.org/10.21334/npolar.2014.dce53a47'>NPI</a>, <a href='https://www.pgc.umn.edu/data/arcticdem/'>ArcticDEM</a>",
			maxZoom: 13,
			tileSize: 256,
			zoomOffset: 0,
		}),
		"dH dt⁻² 1936–1990–2010–2018": L.tileLayer("/static/tiles/dhdt_squared/ddem_squared_1936_1990_2010_2018_rendered/{z}/{x}/{y}.png", {
			attribution: "Data: <a href='https://doi.org/10.21334/npolar.2014.dce53a47'>NPI</a>, <a href='https://www.pgc.umn.edu/data/arcticdem/'>ArcticDEM</a>, <a href='https://doi.org/10.21334/npolar.2021.f6afca5c'>Geyman et al., 2022</a>",
			maxZoom: 13,
			tileSize: 256,
			zoomOffset: 0,
		}),
		"Hillshade": L.tileLayer("/static/tiles/hillshade/S0_DTM20_hillshade_multi/{z}/{x}/{y}.png", {
			attribution: "Norwegian Polar Institute: <a href='https://data.npolar.no/dataset/dce53a47-c726-4845-85c3-a65b46fe2fea'>S20 DEM</a>",
			maxZoom: 13,
			tileSize: 256,
			zoomOffset: 0,

		}),
		"Basal topography hillshade": L.tileLayer("/static/tiles/hillshade/basal_hillshade_svift_ibcao/{z}/{x}/{y}.png", {
			attribution: "Data: <a href='https://doi.org/10.21334/npolar.2014.dce53a47'>NPI</a>, <a href='https://doi.org/10.21334/npolar.2018.57fd0db4'>SVIFT 1.1</a>, <a href='https://www.gebco.net/data_and_products/gridded_bathymetry_data/arctic_ocean/'>IBCAO 4.1</a>",
			maxZoom: 11,
			tileSize: 256,
			zoomOffset: 0,
		}),
		"Orthomosaic 1936": L.tileLayer("/static/tiles/ortho/1936/ortho_1936_all_Svalbard_20m/{z}/{x}/{y}.png", {
			attribution: "1936 Data: <a href='https://doi.org/10.21334/npolar.2021.f6afca5c'>Geyman et al., 2022</a>",
			maxZoom: 13,
			tileSize: 256,
			zoomOffset: 0,
		}),
		*/
	};
	// Add the base layer set by the search or a default one.
	add_base_layer(search_params, map, base_layers);

	// These are asynchronous so they need to be awaited to load.
	const shapes = await Promise.all([add_spheres("/static/shapes/spheres.geojson")]);
	let overlays = {
		//"Glaciers (1990)": shapes[0],
		"Spherical (360) images": shapes[0],
	};
	add_overlays(search_params, map, overlays);

	// Add a share button that will copy the current window to the clipboard
	let share_button = L.control.textbox({text: `<button style="border-radius: 100%; opacity: 0.8;">${share_symbol}</button>`, id: "share_button", style: "", position: "bottomright"}).addTo(map);

	share_button._container.onclick = function() {

		const url = window.location.origin + window.location.pathname + "?" + create_search_string(map, base_layers, overlays);

		/* Copy the text inside the text field */
		navigator.clipboard.writeText(url);

		let popup = document.getElementById("share-popup") || document.createElement("div");
		// Remove all previous children (if any)
		while (popup.firstChild) {
			popup.removeChild(popup.firstChild);
		};
		popup.id = "share-popup";
		popup.style = "background-color: white; position: fixed; left: 50%; top: 50%; transform: translate(-60%, -50%); padding: 8px; z-index: 50000; border: 2px solid black; border-radius: 2%; max-width: 80%;";

		// Add a close button
		let popup_close = document.createElement("button");
		popup_close.id = "share-popup-close";
		popup.appendChild(popup_close);
		popup_close.innerHTML = "Close";
		popup_close.onclick = function() {popup.remove()};
		popup.appendChild(document.createElement("br"));

		// Add the link
		let popup_text = document.createElement("a");
		popup_text.id = "share-popup-text";
		popup_text.style = "font-size: 0.7em; color: black; word-break: break-all;";
		popup.appendChild(popup_text);
		popup_text.href = url;
		popup_text.innerHTML = url;

		document.body.appendChild(popup);
	};

	// Legacy "layers=spheres" syntax. May remove
	let spheres_active = search_string.includes("spheres");
	if (spheres_active) {
		overlays["Spherical (360) images"].addTo(map);
	};
	let styling = {
		collapsed: true,
	};
	

	// Finalize the map
	L.control.scale().addTo(map);
	L.control.layers(base_layers, overlays, styling).addTo(map);
	loading_text.remove();
}

/**
 * Interpolate between two hexadecimal numbers given a relative weight
 *
 * @param {String} hex0 The first hexadecimal number
 * @param {String} hex1 The second hexadecimal number
 * @param {Number} weight The weight of hex1 between 0 and 1
 * @returns {String} The interpolated hexadecimal number
**/
function interpolate_hex(hex0, hex1, weight) {

	let val0 = parseInt(hex0, 16);
	let val1 = parseInt(hex1, 16);

	return Math.round((val1 * weight + val0 * (1 - weight))).toString(16).padStart(2, "0");


}

/**
 * Naively interpolate between colors
 *
 * @param {{a: Number, b: String}} colors An object of value:hex_color items, e.g. {0: "#44ffcc"}
 * @param {Number} value The value to interpolate a color at
 * @returns {String} The interpolated color at `value`
**/
function interpolate_color(colors, value) {

	let lower = 0;
	let upper = 1;

	for (const xval in colors) {
		if (xval < value) {
			lower = xval;
		} else {

			upper = xval;
			break;
		};
	};

	const weight = (value - lower) / (upper - lower);


	let out_color = `#${interpolate_hex(colors[lower].slice(1, 3), colors[upper].slice(1, 3), weight)}${interpolate_hex(colors[lower].slice(3, 5), colors[upper].slice(3, 5), weight)}${interpolate_hex(colors[lower].slice(5, 7), colors[upper].slice(5, 7), weight)}`;

	return out_color;

}

/**
 * Add a spherical (360) images overview GeoJSON as a Leaflet FeatureGroup
 *
 * @param {String} url The url of the GeoJSON
 * @returns {L.FeatureGroup} The points representing spherical images
**/
async function add_spheres(url) {
	const data = await fetch(url).then(response => response.json());

	let colors = {
		1: "#505196",
		5: "#6bbdcf",
		6: "#6bcfa5",
		8: "#7ccf6b",
		9: "#cfb26b",
		11: "#946bcf",
		13: "#505196",
	};
	// Get an icon with a color that depends on its capture year
	function get_icon(properties) {
		// Convert the month to a color in hexadecimal
		const color = interpolate_color(colors, parseInt(properties.properties.date.slice(5, 7)) + parseInt(properties.properties.date.slice(8, 10)) / 30, 10);
		const markerHtmlStyles = `
			background-color: ${color};
			width: 1rem;
			height: 1rem;
			display: block;
			left: -0.5rem;
			top: -0.5rem;
			position: relative;
			border-radius: 1rem 1rem 0;
			transform: rotate(45deg);
			border: 1px solid #000000`;

		return L.divIcon({
			className: `pin-${color}`,
			iconAnchor: [0, 0],
			labelAnchor: [-6, 0],
			popupAnchor: [0, -10],
			html: `<span style="${markerHtmlStyles}" />`
		});


	}

	let l = L.geoJSON(data, {
		pointToLayer: function(geoJsonPoint, latlng) {
			return L.marker(latlng, {icon: get_icon(geoJsonPoint)});

		}
	}).bindPopup(function (layer) {return `<a href='/spheres/${layer.feature.properties.filename}' target="_blank" rel="noopener noreferrer">${layer.feature.properties.label}, date: ${layer.feature.properties.date}<img src="/${layer.feature.properties.thumbnail}" style="width: 100%"></img></a>`});

	return l;


}

/**
 * Add the CryoCLIM shapefile GeoJSON as a Leaflet FeatureGroup
 *
 * @param {String} url The url of the GeoJSON
 * @param {String} color The color of the outlines
 * @returns {L.FeatureGroup} Polygons representing glaciers 
**/
async function add_cryoclim(url, color) {
	const data = await fetch(url).then(response => response.json());
	const markerHtmlStyles = `
		background-color: ${color};
		width: 1rem;
		height: 1rem;
		display: block;
		left: -0.5rem;
		top: -0.5rem;
		position: relative;
		border-radius: 1rem 1rem 0;
		transform: rotate(45deg);
		border: 1px solid #FFFFFF`;

	const icon = L.divIcon({
		className: `pin-${color}`,
		iconAnchor: [0, 0],
		labelAnchor: [-6, 0],
		popupAnchor: [0, -10],
		html: `<span style="${markerHtmlStyles}" />`
	});

	let l = L.geoJSON(data, {
		pointToLayer: function(geoJsonPoint, latlng) {
			return L.marker(latlng, {icon: icon});

		}
	}).bindPopup(function (layer) {return `Name: ${layer.feature.properties.NAME}, Area: ${(layer.feature.properties.Shape_Area / 1e6).toPrecision(2)} km², Length: ${(layer.feature.properties.LENGTH / 1e3).toPrecision(2)} km`});

	return l;

}
