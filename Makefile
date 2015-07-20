
all: install build

install:
	@npm install

watch:
	@node_modules/.bin/gulp
