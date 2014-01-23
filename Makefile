check: lint

lint:
	./node_modules/.bin/jshint *.js

.PHONY: lint check
