install: install-deps

run:
	npx babel-node src/bin/gendiff.js

install-deps:
	yarn install

build:
	rm -rf dist
	yarn run build

test:
	yarn test

test-coverage:
	yarn test --coverage

watch:
	yarn test:watch

lint:
	npx eslint .

publish:
	npm publish

publish-dry:
	npm publish --dry-run

.PHONY: test
