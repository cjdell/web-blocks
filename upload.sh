#!/bin/bash

rsync -avh --progress index.html shaders textures lib build vu2003@wb.buz.co:/var/www/virtual/buz.co/wb/htdocs
