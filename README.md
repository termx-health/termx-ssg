# TermX SSG

## File Structure

- `__codegen` - template population utility
- `template` - Jekyll template

## Setting up the source files

Place the file(s) into the `__source` folder.

1. `__source/pages` contains `*.(md|html)` source files.
2. `__source/attachment` contains assets (optional).
3. `__source` root contains the `index.json` file.

**Directory Structure:**

```
├── __source
│   ├── attachments
│   │   └── 101 (page ID)
│   │       └── **.(png|jpg|jpeg)
│   ├── pages
│   │   └── **.(md|html) 
│   └── index.json
└── ...
```

_Example of `index.json` file:_

```json
{
  "space": "demo",
  "tree": [
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
}
```

## Populating the Template

Navigate to the `__codegen` folder and install the required Node modules:

```shell
npm i
```

Run the generation command:

```shell
node generate.js
```

Navigate to the `template` folder to view the populated result.

## Serving the Static Site

In the `template` folder, run the following commands:

```sh
bundle install
```

```sh
bundle exec jekyll serve
```

## __codegen

This folder contains the scripts necessary for template population.

The `generate.js` file reads data from the `__source` folder, transforms it, and writes it into the `template` folder.

It utilizes the same Markdown parser as in TermX web, although there may be some minor changes.

## Docker Jekyll Site Builder

In the `__codegen` folder, run the following command:

```shell
docker build -t docker.kodality.com/termx-jekyll-builder:latest .
```
