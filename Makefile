NAME = transcendence

DOCKER_COMPOSE = docker-compose -f containers/docker-compose.yml
DOCKER = docker
DB_DATA = /home/mhaan/goinfre/transcendence/db_data

all: up

test: down build up

up: build
	${DOCKER_COMPOSE} up -d

down:
	${DOCKER_COMPOSE} down

start:
	$(DOCKER_COMPOSE) start

stop:
	$(DOCKER_COMPOSE) stop

build:
	$(DOCKER_COMPOSE) build

postgres:
	docker exec -it postgres bash

clean:
	@docker stop $$(docker ps -qa) || true
	@docker rm $$(docker ps -qa) || true
	@docker rmi -f $$(docker images -qa) || true
	@docker volume rm $$(docker volume ls -q) || true
	@docker network rm $$(docker network ls -q) || true
	@rm -rf $(DB_DATA) || true

re: clean up

prune: clean
	@docker system prune -a --volumes -f

.PHONY: all up down start stop build clean re prune
