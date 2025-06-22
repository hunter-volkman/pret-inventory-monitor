.PHONY: create update upload build dev install clean deploy test lint format
VERSION := 1.0.0
MODULE_NAME := inventorymonitor
ORG_NAMESPACE := pret

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

# Development Commands
install:
	@echo "$(BLUE)📦 Installing dependencies...$(NC)"
	cd src/monitor && npm install
	@echo "$(GREEN)✅ Dependencies installed$(NC)"

dev:
	@echo "$(BLUE)🚀 Starting development server...$(NC)"
	@echo "$(YELLOW)📱 Mobile-first design - test on mobile devices!$(NC)"
	cd src/monitor && npm run dev

dev-mobile:
	@echo "$(BLUE)📱 Starting development server with mobile debugging...$(NC)"
	cd src/monitor && npm run dev -- --host 0.0.0.0

# Code Quality
lint:
	@echo "$(BLUE)🔍 Running linter...$(NC)"
	cd src/monitor && npm run lint

format:
	@echo "$(BLUE)✨ Formatting code...$(NC)"
	cd src/monitor && npm run format

type-check:
	@echo "$(BLUE)🔷 Type checking...$(NC)"
	cd src/monitor && npm run type-check

test:
	@echo "$(BLUE)🧪 Running tests...$(NC)"
	cd src/monitor && npm run test

# Production Commands
build:
	@echo "$(BLUE)🔨 Building production bundle...$(NC)"
	cd src/monitor && npm run build
	@echo "$(GREEN)✅ Build complete: module/apps/inventorymonitor/dist/$(NC)"

preview:
	@echo "$(BLUE)👀 Previewing production build...$(NC)"
	cd src/monitor && npm run preview

upload: build
	@echo "$(BLUE)🌐 Deploying to Viam Apps...$(NC)"
	viam module upload --version=${VERSION} --platform=any --public-namespace=${ORG_NAMESPACE} --force module
	@echo "$(GREEN)🎉 Deployed: https://inventorymonitor_pret.viamapplications.com$(NC)"

# Utility Commands
clean:
	@echo "$(YELLOW)🧹 Cleaning build artifacts...$(NC)"
	rm -rf src/monitor/node_modules
	rm -rf src/monitor/dist
	rm -rf module/apps/inventorymonitor/dist
	@echo "$(GREEN)✅ Clean complete$(NC)"

fresh: clean install
	@echo "$(GREEN)🆕 Fresh installation complete$(NC)"

# Viam Commands
create:
	viam module create --name=${MODULE_NAME} --public-namespace=${ORG_NAMESPACE}

update:
	viam module update --module=meta.json

# Full Deployment Pipeline
deploy: clean install type-check build upload
	@echo "$(GREEN)🎉 Full deployment complete!$(NC)"
	@echo "$(BLUE)📱 App URL: https://inventorymonitor_pret.viamapplications.com$(NC)"

# Development Shortcuts
d: dev
b: build  
u: upload
c: clean
i: install

# Help
help:
	@echo "$(BLUE)Pret Inventory Monitor - Build Commands$(NC)"
	@echo ""
	@echo "$(YELLOW)Development:$(NC)"
	@echo "  make dev          Start development server"
	@echo "  make dev-mobile   Start with mobile debugging"
	@echo "  make install      Install dependencies"
	@echo ""
	@echo "$(YELLOW)Code Quality:$(NC)"
	@echo "  make lint         Run linter"
	@echo "  make format       Format code"
	@echo "  make type-check   TypeScript type checking"
	@echo "  make test         Run tests"
	@echo ""
	@echo "$(YELLOW)Production:$(NC)"
	@echo "  make build        Build for production"
	@echo "  make preview      Preview production build"
	@echo "  make upload       Deploy to Viam Apps"
	@echo "  make deploy       Full deployment pipeline"
	@echo ""
	@echo "$(YELLOW)Utilities:$(NC)"
	@echo "  make clean        Clean build artifacts"
	@echo "  make fresh        Clean + fresh install"
	@echo ""
	@echo "$(BLUE)🌐 Production URL: https://inventorymonitor_pret.viamapplications.com$(NC)"

# Default target
.DEFAULT_GOAL := help
