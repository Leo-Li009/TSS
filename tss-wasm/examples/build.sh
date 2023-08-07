#!/bin/bash

SIDE_IMAGE_NAME=side2-image
SIDE_IMAGE_TAG=version0.1
SIDE2_CONTAINER=side2-container
SIDE3_CONTAINER=side3-container

docker kill $SIDE2_CONTAINER
docker kill $SIDE3_CONTAINER

docker rm $SIDE2_CONTAINER
docker rm $SIDE3_CONTAINER

docker build . -t $SIDE_IMAGE_NAME:$SIDE_IMAGE_TAG

SIDE2_CONTAINER_ID=$(docker run --network="host" -d -e SIDE_ID=2 -e USERNAME=test --name $SIDE2_CONTAINER $SIDE_IMAGE_NAME:$SIDE_IMAGE_TAG)
SIDE3_CONTAINER_ID=$(docker run --network="host" -d -e SIDE_ID=3  -e USERNAME=test --name $SIDE3_CONTAINER $SIDE_IMAGE_NAME:$SIDE_IMAGE_TAG)

# Waiting for key generation
while ! docker logs $SIDE2_CONTAINER_ID 2>&1 | grep -q "Finish generating key" ; do
  sleep 5
  echo waiting...
done

# Copy the side-2 key file and side-3 key file
docker cp $SIDE2_CONTAINER_ID:/app/key-2.json ./key-2.json
docker cp $SIDE3_CONTAINER_ID:/app/key-3.json ./key-3.json
