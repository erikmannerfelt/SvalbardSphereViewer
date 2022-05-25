# syntax=docker/dockerfile:1
FROM ubuntu:latest
ARG DEBIAN_FRONTEND=noninteractive

# Install python and build tools
RUN apt-get -y update
RUN apt-get install python3 python3-pip build-essential curl libssl-dev pkg-config gdal-bin unzip -y

# Install leaflet, photo-sphere-viewer, and two dependencies
WORKDIR /code/static/plugins
RUN curl -O https://leafletjs-cdn.s3.amazonaws.com/content/leaflet/v1.8.0/leaflet.zip && curl -O https://registry.npmjs.org/photo-sphere-viewer/-/photo-sphere-viewer-4.6.2.tgz  && curl -O https://cdn.jsdelivr.net/npm/uevent@2/browser.min.js && curl -O https://cdn.jsdelivr.net/npm/three/build/three.min.js
RUN unzip leaflet.zip -d leaflet && tar -xzf photo-sphere-viewer-4.6.2.tgz && rm *.tgz *.zip && mv package photo-sphere-viewer

WORKDIR /code

# Download the pre-tiled NPI Basema
RUN mkdir -p static/tiles/ && echo "Downloading basemap" && curl -O https://schyttholmlund.com/nextcloud/index.php/s/nneMJQoPWtJjHSc/download/Basiskart_20m.zip && echo "Extracting basemap" && unzip -qd static/tiles/ Basiskart_20m.zip && rm Basiskart_20m.zip

# Install the requirements
ADD ./requirements.txt /code/
RUN pip install -r requirements.txt

ADD src/ /code/

CMD ["bash", "./run.sh"]
#CMD ["ls", "/code/static/spheres/"]
