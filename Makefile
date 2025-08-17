# Makefile for online-gacha backend

# .envファイルなどでDATABASE_URLを定義しておくこと

MIGRATE_CMD=docker compose exec web npm run migrate up
SEED_CMD=docker compose exec web npm run seed
DOCKER_UP_CMD=docker compose up -d
DOCKER_EXEC_CMD=docker compose exec web sh

.PHONY: migrate seed docker-up docker-sh

migrate:
	$(MIGRATE_CMD)

seed:
	$(SEED_CMD)

docker-up:
	$(DOCKER_UP_CMD)

docker-sh:
	$(DOCKER_EXEC_CMD)
