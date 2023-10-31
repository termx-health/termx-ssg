#!/bin/bash

cd ssg/

cd __codegen
npm i
npm run sync
npm run generate
cd -

bundle install
jekyll build
