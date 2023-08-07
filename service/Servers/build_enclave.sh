#!/bin/bash

SERVER_IMAGE_NAME=tss-server-enclave-image
SERVER_IMAGE_TAG=version0.1
SERVER_CONTAINER=tss-server-enclave-container
SERVER_PORT=8222

docker kill $SERVER__CONTAINER
docker rm $SERVER_CONTAINER

docker build . -t $SERVER_IMAGE_NAME:$SERVER_IMAGE_TAG -f Dockerfile.enclave


SERVER_CONTAINER_ID=$(docker run --network="host" -d -p $SERVER_PORT:$SERVER_PORT --name $SERVER_CONTAINER $SERVER_IMAGE_NAME:$SERVER_IMAGE_TAG)

docker cp $SERVER_CONTAINER_ID:/app/target/release/servers ../../enclave/server/
docker cp $SERVER_CONTAINER_ID:/app/Rocket.toml  ../../enclave/server/
#docker kill $SERVER_CONTAINER