#!/bin/bash

cd src/

cd __codegen
npm i
npm run sync
npm run generate
cd -

bundle install
jekyll build
