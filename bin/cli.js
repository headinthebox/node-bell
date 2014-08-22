#!/bin/sh
':' //; exec "$(command -v node)" "--harmony-generators" "$0" "$@"

// about the shebang: we can't pass '--harmony' to node via /usr/bin/env
require('../bell.js');
