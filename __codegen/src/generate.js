const fs = require("fs");
if (!process.cwd().endsWith("__codegen")) {
  throw Error(`invalid cwd: ${process.cwd()}`)
}

const parser = require("./parser");
const folderCheck = p => !fs.existsSync(p) && fs.mkdirSync(p)
const folderCopy = (src, dest) => fs.cpSync(src, dest, {recursive: true});
const fileRead = (p) => String(fs.readFileSync(p))
const fileWrite = (p, file) => fs.writeFileSync(p, file, 'utf-8');

const _ROOT_FOLDER = `../__source`;
const _TARGET_FOLDER = '../template'
const _TARGET_DATA = `${_TARGET_FOLDER}/_data`;
const _TARGET_WIKI = `${_TARGET_FOLDER}/_wiki`;
const _TARGET_ASSETS = `${_TARGET_FOLDER}/assets`;


async function main() {
  console.time();
  // initialize MarkdownParser
  const mdParser = await parser.build()

  // read file index
  const indexJson = fileRead(`${_ROOT_FOLDER}/index.json`);
  const index = JSON.parse(indexJson)

  const flatten = (pages) => pages?.flatMap(p => [p, ...flatten(p.children)]) ?? []
  const pages = flatten(index.tree);


  // check '_data' folder
  folderCheck(`${_TARGET_DATA}`)
  fileWrite(`${_TARGET_DATA}/index.json`, indexJson);


  const uniqueLangs = pages
    .flatMap(p => p['contents'])
    .map(c => c['lang'])
    .filter((value, index, self) => self.indexOf(value) === index);


  // check '_wiki' folder
  folderCheck(`${_TARGET_WIKI}`)

  // create index files for language root folders
  uniqueLangs.forEach(lang => {
    const frontMatter =
      '---\n' +
      `title: ${lang} index\n` +
      `language: ${lang}\n` +
      'layout: toc\n' +
      '---\n';

    // check '_wiki/(en|**)' folder
    folderCheck(`${_TARGET_WIKI}/${lang}`);
    fileWrite(`${_TARGET_WIKI}/${lang}/index.html`, frontMatter);
  })

  for (const pageDef of pages) {
    for (const content of pageDef['contents']) {
      const {frontMatter, pageContent, extension} = await handlePage(pageDef, content);

      // save page content in '_wiki/(en|**)' folder
      fileWrite(`${_TARGET_WIKI}/${content['lang']}/${content['slug']}.${extension}`,
        frontMatter +
        '\n{% raw %}\n' +
        pageContent +
        '\n{% endraw %}'
      );
    }
  }

  async function handlePage(pageDef, content) {
    let extension = content['contentType'] === 'markdown' ? 'md' : 'html';
    let pageContent = fileRead(`${_ROOT_FOLDER}/pages/${content['slug']}.${extension}`);

    const frontMatter =
      '---\n' +
      `title: ${content['name']}\n` +
      `slug: ${content['slug']}\n` +
      `language: ${content['lang']}\n` +
      'langs:\n' +
      `${pageDef.contents.map(({lang, slug}) =>
        ` - key: ${lang}\n   value: ${slug}`).join('\n')}\n` +
      `last_modified_date: ${content['modifiedAt']}\n` +
      '---\n';

    if (extension === 'md') {
      pageContent = await mdParser.render(pageContent)
      extension = 'html';
    }

    return {
      frontMatter,
      pageContent,
      extension
    }
  }


  // STEP (assets): copy assets
  try {
    folderCheck(`${_TARGET_ASSETS}`)
    folderCopy(`${_ROOT_FOLDER}/attachments`, `${_TARGET_ASSETS}/files`)
  } catch (e) {
    console.log("Failed to copy assets!", e);
  }

  console.timeEnd();
}


main()
