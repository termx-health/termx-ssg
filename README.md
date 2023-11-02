# TermX SSG

## File Structure

- `__codegen` - template population utility
- `template` - Jekyll template

## Setting up the source files

Place the file(s) into the `__source` folder.

1. `__source/pages` contains `*.(md|html)` source files.
1. `__source/attachment` contains assets (optional).
1. `__source` root contains the `pages.json` with pages structure.
1. `__source` root contains the `space.json` with space definition.

**Directory Structure**

```
├── __source
│   ├── attachments
│   │   └── 101 (page ID)
│   │       └── **.(png|jpg|jpeg)
│   ├── pages
│   │   └── **.(md|html) 
│   ├── space.json
│   └── pages.json
└── ...
```

_Example of `pages.json` file_

```json
[
  {
    "code": "66ef0be7-c25e-4d5d-a63a-4f9abb071cd3",
    "contents": [
      {
        "name": "Page A",
        "slug": "page-a",
        "lang": "en",
        "ct": "markdown"
      }
    ],
    "children": []
  }
]
```

_Example of `space.json` file_

```json
{
  "code": "termx-demo",
  "names": {
    "en": "TermX Demo"
  }
}
```

## Populating the Template

Navigate to the `__codegen` folder and install the required Node modules

```shell
npm i
```

Run the generation command

```shell
node generate.js
```

Navigate to the `template` folder to view the populated result.

## Serving the Static Site

In the `template` folder, run the following commands

```sh
bundle install
```

```sh
bundle exec jekyll serve
```

## __codegen

This folder contains the scripts necessary for template population.

The `generate.js` file reads data from the `__source` folder, transforms it, and writes it into the `template` folder.

It utilizes the same Markdown parser as in TermX application, although there may be some minor changes.

## Docker Jekyll Site Builder

Run the following command in the root folder

```shell
docker build -t docker.kodality.com/termx-jekyll-builder:latest .
```

## Github Actions

```yaml
name: SSG

on:
  push:
    branches: [ "main" ]


jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build the Jekyll site
        run: |
          docker run \
          -v ${{ github.workspace }}/__source:/__source -v ${{ github.workspace }}/_site:/template/_site  \
          docker.kodality.com/termx-jekyll-builder /bin/bash -c "chmod -R 777 ./_generate.sh && ./_generate.sh"

      - name: Upload _site
        uses: actions/upload-artifact@v3
        with:
          name: _site
          path: _site/**```
