PROJECT_ID ?= ambiguous-expression-checker
CHANNEL ?= $(shell git rev-parse --abbrev-ref HEAD 2>/dev/null || echo preview)

.PHONY: help dev build test lint typecheck deploy deploy-preview clean

help:
	@echo "Usage:"
	@echo "  make dev              # Vite 開発サーバ起動"
	@echo "  make build            # 本番ビルド (dist/)"
	@echo "  make test             # 単体テスト"
	@echo "  make lint             # ESLint"
	@echo "  make typecheck        # TypeScript 型チェック"
	@echo "  make deploy           # 本番デプロイ (firebase hosting:default)"
	@echo "  make deploy-preview   # プレビュー(channels)デプロイ 7日有効"
	@echo "  make clean            # ビルド成果物削除"

dev:
	npm run dev

build:
	npm run build

test:
	npm test -- --ci

lint:
	npm run lint

typecheck:
	npm run typecheck

deploy:
	npx firebase-tools@latest deploy \
		--only hosting:default \
		--project $(PROJECT_ID)

deploy-preview:
	npx firebase-tools@latest hosting:channel:deploy "$(CHANNEL)" \
		--only default \
		--expires 7d \
		--project $(PROJECT_ID)

clean:
	rm -rf dist
