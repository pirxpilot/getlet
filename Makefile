check: lint test

lint:
	./node_modules/.bin/jshint *.js

test:
	./node_modules/.bin/mocha --require should

.PHONY: lint test check
