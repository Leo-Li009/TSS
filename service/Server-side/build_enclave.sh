#!/bin/bash

SERVER_SIDE_IMAGE_NAME=tss-server-enclave-side-image
SERVER_SIDE_IMAGE_TAG=version0.1
SERVER_SIDE_CONTAINER=tss-server-enclave-side-container
SERVER_SIDE_PORT=8000

docker kill $SERVER_SIDE_CONTAINER
docker rm $SERVER_SIDE_CONTAINER

docker build . -t $SERVER_SIDE_IMAGE_NAME:$SERVER_SIDE_IMAGE_TAG -f Dockerfile.enclave


SIDE2_CONTAINER_ID=$(docker run --network="host" -d -p $SERVER_SIDE_PORT:$SERVER_SIDE_PORT --name $SERVER_SIDE_CONTAINER $SERVER_SIDE_IMAGE_NAME:$SERVER_SIDE_IMAGE_TAG)

docker cp $SIDE2_CONTAINER_ID:/app/target/release/side-1 ../../enclave/side-1
docker cp $SIDE2_CONTAINER_ID:/app/Rocket.toml  ../../enclave/side-1
docker kill $SERVER_SIDE_CONTAINER