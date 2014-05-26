check: lint test
.PHONY: check

LINT_SRC=index.js test

include ./node_modules/make-test/index.mk
include ./node_modules/make-jshint/index.mk
