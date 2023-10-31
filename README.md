# TermX SSG

### File Structure

Put file(s) into `__source` folder

1. `__source/pages` contains `*.(md|html)` source files
1. `__source/attachment` contains assets (optional)
1. `__source` root contains the `index.json` file

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

_index.json example_

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

### Populate Template

Navigate to `__codegen` folder and install node modules

```shell
npm i
````

Run the generation command

```shell
node generate.js
```

Navigate to `template` folder to see the population result

### Serve Static Site

In the `template` folder run the following commands:

```sh
bundle install
```

```sh
bundle exec jekyll serve
```

## `__codegen`

This folder contains scripts necessary for template population.

`generate.js` file reads data from `__source` folder, transforms it, and writes into `template` folder.

It utilizes the same Markdown parser as in TermX web, although they may be some minor changes.

## Docker Jekyll Site builder

In the `__codegen` folder run the following command:

```shell
docker build -t docker.kodality.com/termx-jekyll-builder:latest .
```
