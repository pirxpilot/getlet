check: lint test
.PHONY: check

LINT_SRC=index.js lib test

include ./node_modules/make-jshint/index.mk

test:
	node --test

.PHONY: test
