CC ?= cc
CFLAGS ?= -O2 -Wall -Wextra -Werror
LDFLAGS ?=

SRC = main.c
BIN = ../.bin/start

.PHONY: all clean install

all: $(BIN)

$(BIN): $(SRC)
	@mkdir -p ../.bin
	$(CC) $(CFLAGS) $(LDFLAGS) -o $(BIN) $(SRC)

clean:
	rm -f $(BIN)

install: all
