#!/bin/bash

npm i -g @zeit/ncc

ncc build -o dist/main index.js
ncc build -o dist/cleanup index.js
