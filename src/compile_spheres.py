import geopandas as gpd
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import datetime
from pathlib import Path
import re
import exif
import os

TRANSLATIONS = {
        "Vallakrabreen": "Vallåkrabreen",
        "Dronbreen": "Drønbreen",
        "Nordenskioldbreen": "Nordenskiöldbreen",
        "Midtoya": "Midtøya",
        "Aabreen": "Åbreen",
        "Konigsberg": "Königsberg",
}


GPSINFO_TAG = [key for key, value in TAGS.items() if value == "GPSInfo"][0]
AUTHOR_TAG = [key for key, value in TAGS.items() if "Artist" in value][0]

GPS_TAG_NAMES = {value: key for key, value in GPSTAGS.items()}

def translate(text: str) -> str:

    for str_from, str_to in TRANSLATIONS.items():
        if str_from not in text:
            continue
        text = text.replace(str_from, str_to)
    return text

def get_location(filepath: Path, thumbnail_dir: Path):

    thumbnail_path = thumbnail_dir.joinpath(filepath.with_suffix(".thumbnail").name);

    with open(filepath, "rb") as infile:
        img = exif.Image(infile)

        gps_lat = img.gps_latitude
        gps_lon = img.gps_longitude

        gps_lat_ref = img.gps_latitude_ref
        gps_lon_ref = img.gps_longitude_ref

    with Image.open(filepath) as img:
        img_exif = img.getexif()

        if not thumbnail_path.is_file():
            os.makedirs(thumbnail_path.parent, exist_ok=True)
            img.thumbnail((256, 128))
            img.save(thumbnail_path, "JPEG")

    lat = (gps_lat[0] + gps_lat[1] / 60. + gps_lat[2] / 3600.) * (1 if gps_lat_ref == "N" else -1)
    lon = (gps_lon[0] + gps_lon[1] / 60. + gps_lon[2] / 3600.) * (1 if gps_lon_ref == "E" else -1)

    date = str(datetime.datetime.strptime(filepath.stem.replace("Sph_", "").split("_")[0], "%y%m%d").date())

    label = re.sub(r'((?<=[a-z])[A-Z]|(?<!\A)[A-Z](?=[a-z]))', r' \1', filepath.stem[filepath.stem.index("-") + 1:]) 

    return {
        "filename": filepath.name,
        "thumbnail": str(thumbnail_path),
        "author": img_exif.get(AUTHOR_TAG, "Unspecified"),
        "label": translate(label),
        "date": date,
        "geometry": gpd.points_from_xy([lon], [lat], crs=4326)[0],
    }

def main():

    sphere_dir = Path("static/spheres/")
    thumbnail_dir = sphere_dir.parent.joinpath("sphere-thumbnails")

    locations = gpd.GeoDataFrame([get_location(fp, thumbnail_dir=thumbnail_dir) for fp in sphere_dir.glob("Sph_*") if not any(pattern in str(fp) for pattern in ["_original", "thumbnail"])], crs=4326)

    os.makedirs("static/shapes/", exist_ok=True)
    locations.to_file("static/shapes/spheres.geojson", driver="GeoJSON")

    print(locations.sort_values("date"))

if __name__ == "__main__":
    main()
