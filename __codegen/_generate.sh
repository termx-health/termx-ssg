#!/bin/bash
RED='\033[0;32m'


cd __codegen

printf "${RED}Installing NPM modules\n"
npm i

printf "${RED}Running template generation\n"
npm run generate
cd -

printf "${RED}Generating the Jekyll site\n"
cd template
bundle install
jekyll build
