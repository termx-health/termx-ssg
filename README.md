# TermX Experimental SSG

Put file(s) into `__source` folder

1. `__source/pages` contains source `*.(md|html)` files
1. `__source/attachment` contains attachments/assets (optional)
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

Navigate to `__codegen` folder and install node modules, if missing
```shell
npm i
```

Run the generation command
```shell
node generate.js
```

Look output in the `template` folder



```sh
bundle install
```

```sh
bundle exec jekyll serve
```






## Docker

```shell
docker build -t docker.kodality.com/termx-jekyll-builder:latest .
```

```shell
this="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"

docker run --rm -it -v $this:/template  \
  docker.kodality.com/termx-jekyll-builder /bin/bash -c "chmod -R 777 ./_generate.sh && ./_generate.sh"
```

