install: install-deps

run:
	npx babel-node src/bin/page-loader.js

debug:
	DEBUG=page-loader,axios npx babel-node src/bin/page-loader.js

install-deps:
	yarn install

build:
	rm -rf dist
	yarn run build

test:
	yarn test

test-debug:
	DEBUG=page-loader,axios yarn test

test-coverage:
	yarn test --coverage

watch:
	yarn test:watch

watch-debug:
	DEBUG=page-loader yarn test:watch

lint:
	npx eslint .

publish:
	npm publish

publish-dry:
	npm publish --dry-run

.PHONY: test
