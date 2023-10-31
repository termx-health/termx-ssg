#!/bin/bash

docker build -t docker.kodality.com/termx-jekyll-builder:latest .
docker push docker.kodality.com/termx-jekyll-builder

