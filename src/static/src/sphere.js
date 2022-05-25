async function show_sphere(filename) {

        let metadata = await load_metadata(filename);

        const viewer = new PhotoSphereViewer.Viewer({
                container: document.querySelector('#viewer'),
                panorama: `/static/spheres/${filename}`,
                caption: `${metadata.properties.label}, ${metadata.properties.date}. Photographer: ${metadata.properties.author}`,
        });
}


async function load_metadata(filename) {
        const data = await fetch("/static/shapes/spheres.geojson").then(response => response.json());

        return data.features.filter(feature => feature.properties.filename == filename)[0];
};
