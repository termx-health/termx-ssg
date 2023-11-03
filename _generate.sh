#!/bin/bash
GREEN='\033[0;32m'

cd __codegen

printf "${GREEN}Running template generation\n"
npm run generate
cd -

printf "${GREEN}Generating the Jekyll site\n"
cd template
jekyll build
