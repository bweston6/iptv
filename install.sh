#!/bin/sh

# create a new network called "server"
docker network create server

# pull and start all services 
docker compose up -d
