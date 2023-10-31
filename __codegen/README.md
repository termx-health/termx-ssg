Put file(s) into `__codegen/sources` folder

1. `__codegen/sources/pages` contains source `*.(md|html)` files
1. `__codegen/sources/attachment` contains attachments/assets (optional)
1. `__codegen/sources` root contains the `index.json` file

```
├── __codegen
│   ├── sources
│   |   ├── attachments
│   |   |   └── 101 (page ID)
│   |   |       └── **.(png|jpg|jpeg)
│   |   ├── pages
│   |   |   └── **.(md|html) 
│   |   └── index.json
│   └── src
│       └── ...
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
          "name": "User interface",
          "slug": "user-interface",
          "lang": "en",
          "ct": "markdown"
        }
      ],
      "children": []
    }
  ]
}
```

_Install node modules, if missing_

```shell
npm i
```

Run source generation command

```shell
node generate.js
```
