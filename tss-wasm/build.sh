#!/bin/bash

TSS_BUILD_IMAGE_NAME=tss-build-image
TSS_BUILD_IMAGE_TAG=version0.1
TSS_BUILD_CONTAINER=tss-build-container

docker kill $TSS_BUILD_CONTAINER
docker rm $TSS_BUILD_CONTAINER

docker build . -t $TSS_BUILD_IMAGE_NAME:$TSS_BUILD_IMAGE_TAG

# Start the container and run the command
CONTAINER_ID=$(docker run -d --name $TSS_BUILD_CONTAINER $TSS_BUILD_IMAGE_NAME:$TSS_BUILD_IMAGE_TAG)
# Monitor the container logs for completion
while ! docker logs $CONTAINER_ID 2>&1 | grep -q " ready " ; do
  sleep 5
done

echo start copying building artifacts
docker cp $CONTAINER_ID:/app/pkg ./tss_pkg

docker stop $CONTAINER_ID
docker rm $CONTAINER_ID
docker image rm $TSS_BUILD_IMAGE_NAME:$TSS_BUILD_IMAGE_TAG
