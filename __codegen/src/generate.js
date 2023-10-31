const path = require("path");
const fs = require("fs");
const location = path.join(__dirname);

if (!process.cwd().endsWith("__codegen")) {
  throw Error(`invalid cwd: ${process.cwd()}`)
}

const parser = require("./parser");
const folderCheck = p => !fs.existsSync(p) && fs.mkdirSync(p)
const folderCopy = (src, dest) => fs.cpSync(src, dest, {recursive: true});
const fileRead = (p) => String(fs.readFileSync(p))
const fileWrite = (p, file) => fs.writeFileSync(p, file, 'utf-8');
const fileMove = (pOld, pNew) => fs.renameSync(pOld, pNew);
const fileRemove = (p) => fs.rmSync(p, {recursive: true});

const _ROOT_FOLDER = `../__source`;
const _TARGET_FOLDER = '../template/'
const _TMP = '_tmp';


async function main() {
  console.time();
  // initialize MarkdownParser
  const mdParser = await parser.build()

  // read file index
  const indexJson = fileRead(`${_ROOT_FOLDER}/index.json`);
  const index = JSON.parse(indexJson)

  const flatten = (pages) => pages?.flatMap(p => [p, ...flatten(p.children)]) ?? []
  const pages = flatten(index.tree);


  // check '_tmp' folder
  folderCheck(`./${_TMP}`)
  fileWrite(`./${_TMP}/index.json`, indexJson);

  // CONTENT TRANSFORMATION
  for (const pageDef of pages) {
    for (const content of pageDef['contents']) {
      const {frontMatter, pageContent, extension} = await handlePage(pageDef, content);
      // check language folder
      folderCheck(`./${_TMP}/${content['lang']}`)
      // save page content in '_tmp'
      fileWrite(`./${_TMP}/${content['lang']}/${content['slug']}.${extension}`,
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


  // create index files for language root folders
  pages
    .flatMap(p => p['contents'])
    .map(c => c['lang'])
    .filter((value, index, self) => self.indexOf(value) === index)
    .forEach(lang => {
      const frontMatter =
        '---\n' +
        `title: ${lang} index\n` +
        `language: ${lang}\n` +
        'layout: toc\n' +
        '---\n';
      fileWrite(`./${_TMP}/${lang}/index.html`, frontMatter);
    })

  // STEP (_data): move index.json to '_data' folder
  try {
    folderCheck(`${_TARGET_FOLDER}/_data`)
    fileMove(`./${_TMP}/index.json`, `${_TARGET_FOLDER}/_data/index.json`)
  } catch (e) {
    console.log("Failed to copy index!", e);
  }

  // STEP (assets): copy assets
  try {
    folderCheck(`${_TARGET_FOLDER}/assets`)
    folderCopy(`${_ROOT_FOLDER}/attachments`, `${_TARGET_FOLDER}/assets/files`)
  } catch (e) {
    console.log("Failed to copy assets!", e);
  }

  // STEP (_wiki): move '_tmp' folder w/out index.json to '_wiki' folder
  try {
    folderCheck(`${_TARGET_FOLDER}/_wiki`)
    fileRemove(`${_TARGET_FOLDER}/_wiki`);
    fileMove(`./${_TMP}`, `${_TARGET_FOLDER}/_wiki`)
  } catch (e) {
    console.log("Failed to copy pages!", e);
  }
  console.timeEnd();
}


main()
