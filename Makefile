.PHONY: pipeline-smoke pipeline-check web-dev web-typecheck web-build audit-tier-a audit-tier-a-smoke verify

pipeline-smoke:
	cd pipeline && uv run python -m src.emit_smoke

pipeline-check:
	cd pipeline && uv run ruff check . && uv run ruff format --check . && uv run ty check

web-dev:
	npm --prefix web run dev

web-typecheck:
	npm --prefix web run typecheck
	npm --prefix audit run typecheck

web-build:
	npm --prefix web run build

audit-tier-a:
	npm --prefix audit run tier-a

audit-tier-a-smoke:
	npm --prefix audit run tier-a -- --smoke

verify: pipeline-check pipeline-smoke web-typecheck web-build audit-tier-a-smoke
