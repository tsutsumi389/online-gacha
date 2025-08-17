# Makefile for online-gacha backend

# .envファイルなどでDATABASE_URLを定義しておくこと

MIGRATE_CMD=docker compose exec web npm run migrate up
SEED_CMD=docker compose exec web npm run seed
DOCKER_UP_CMD=docker compose up -d
DOCKER_EXEC_CMD=docker compose exec web sh
INSTALL_WEB_CMD=docker compose exec web npm install
INSTALL_FRONTEND_CMD=docker compose exec frontend npm install

.PHONY: migrate seed docker-up docker-sh install-web install-frontend install-all setup help

setup: docker-up install-all migrate seed
	@echo "✅ Setup completed successfully!"
	@echo "🌐 Frontend: http://localhost:3000"
	@echo "🔧 Backend: http://localhost:8080"

migrate:
	$(MIGRATE_CMD)

seed:
	$(SEED_CMD)

docker-up:
	$(DOCKER_UP_CMD)

docker-sh:
	$(DOCKER_EXEC_CMD)

install-web:
	$(INSTALL_WEB_CMD)

install-frontend:
	$(INSTALL_FRONTEND_CMD)

install-all:
	$(INSTALL_WEB_CMD)
	$(INSTALL_FRONTEND_CMD)

help:
	@echo "Available commands:"
	@echo "  setup           - Complete project setup (docker-up + install-all + migrate + seed)"
	@echo "  migrate         - Run database migrations"
	@echo "  seed            - Run database seed data"
	@echo "  docker-up       - Start all Docker services"
	@echo "  docker-sh       - Access web container shell"
	@echo "  install-web     - Install web (backend) dependencies"
	@echo "  install-frontend - Install frontend dependencies"
	@echo "  install-all     - Install all dependencies (web + frontend)"
