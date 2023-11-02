## Setting up the source files

Place files into the `__source` folder.

```
├── __source
│   ├── attachments (optional)
│   │   └── 101 (page ID)
│   │       └── **.(png|jpg|jpeg|**)
│   ├── pages
│   │   └── **.(md|html) 
│   ├── pages.json (source files structure)
│   └── space.json (space definition)
└── ...
```

## Types

**`__codegen/src/types.ts`**

_Example of `pages.json` file_

```json
[
  {
    "code": "can-be-whatever-you-want",
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
  "code": "ssg-demo",
  "names": {
    "en": "SSG Demo"
  }
}
```

## __codegen

This folder contains the scripts necessary for template population.

The `generate.js` file reads data from the `__source` folder, transforms it, and writes it into the `template` folder.

It utilizes the same Markdown parser as in TermX application, although there may be some minor changes.

## Populating the Template

Navigate to the `__codegen` folder and install required Node modules

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

## GitHub actions

### Docker Image

Run the following command in the root folder to build Docker image for static site generation in GitHub Actions

```shell
docker build -t docker.kodality.com/termx-jekyll-builder:latest .
```

### Setup

In your GitHub repository, create a `__source` folder and a `.github/workflows/jekyll-docker.yml` file.

The `__source` folder should contain files using the structure described earlier.

*.github/workflows/jekyll-docker.yml*

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
          path: _site/**
```
