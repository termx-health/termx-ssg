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


function readIndex() {
  const pages = JSON.parse(fileRead(`${_ROOT_FOLDER}/pages.json`));
  const space = JSON.parse(fileRead(`${_ROOT_FOLDER}/space.json`));
  return {pages, space};
}

function getPages(index) {
  const flatten = (pages) => pages?.flatMap(p => [p, ...flatten(p.children)]) ?? []
  return flatten(index.pages);
}

function getUniqueContentLanguages(pages) {
  return pages
    .flatMap(p => p['contents'])
    .map(c => c['lang'])
    .filter((value, index, self) => self.indexOf(value) === index);
}

async function main() {
  console.time();
  // initialize MarkdownParser
  const mdParser = await parser.build()

  // STEP 1:
  // read file index
  const index = readIndex();
  const pages = getPages(index);

  // check '_data' folder
  folderCheck(`${_TARGET_DATA}`)
  fileWrite(`${_TARGET_DATA}/index.json`, JSON.stringify(index, null, 2));


  // STEP 2:
  // check '_wiki' folder
  folderCheck(`${_TARGET_WIKI}`)

  // create index files for language root folders
  getUniqueContentLanguages(pages).forEach(lang => {
    // check '_wiki/(en|**)' folder
    folderCheck(`${_TARGET_WIKI}/${lang}`);
    fileWrite(`${_TARGET_WIKI}/${lang}/index.html`, '' +
      '---\n' +
      `title: ${lang} index\n` +
      `language: ${lang}\n` +
      'layout: toc\n' +
      '---\n'
    );
  })

  // save pages into
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


  // STEP 3:
  // copy assets
  try {
    folderCheck(`${_TARGET_ASSETS}`)
    folderCopy(`${_ROOT_FOLDER}/attachments`, `${_TARGET_ASSETS}/files`)
  } catch (e) {
    console.log("Failed to copy assets!", e);
  }

  console.timeEnd();
}


main()
