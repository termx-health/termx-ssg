const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require("fs");

if (!process.cwd().endsWith("__codegen")) {
  throw Error(`invalid cwd: ${process.cwd()}`)
}

const parser = require("./parser");
const folderCheck = p => !fs.existsSync(p) && fs.mkdirSync(p, {recursive: true})
const folderCopy = (src, dest) => fs.cpSync(src, dest, {recursive: true});
const fileRead = (p) => String(fs.readFileSync(p))
const fileWrite = (p, file) => fs.writeFileSync(p, file, 'utf-8');
const downloadFile = (async (path, url) => {
  const res = await fetch(url);
  const fileStream = fs.createWriteStream(path);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on("error", reject);
    fileStream.on("finish", resolve);
  });
});

const _ROOT_FOLDER = `../__source`;
const _TARGET_FOLDER = '../template'
const _TARGET_DATA = `${_TARGET_FOLDER}/_data`;
const _TARGET_WIKI = `${_TARGET_FOLDER}/_wiki`;
const _TARGET_ASSETS = `${_TARGET_FOLDER}/assets`;


/**
 * @return {{space: import('types.ts').SpaceIndex, pages: import('types.ts').PageIndex}}
 */
function readIndex() {
  const pages = JSON.parse(fileRead(`${_ROOT_FOLDER}/pages.json`));
  const space = JSON.parse(fileRead(`${_ROOT_FOLDER}/space.json`));
  return {pages, space};
}

/**
 * @return {import('types.ts').PageDefinition[]}
 */
function flattenPages(index) {
  const flatten = (pages) => pages?.flatMap(p => [p, ...flatten(p.children)]) ?? []
  return flatten(index.pages);
}

/**
 * @return {string[]}
 */
function getUniqueContentLanguages(pages) {
  return pages
    .flatMap(p => p['contents'])
    .map(c => c['lang'])
    .filter((value, index, self) => self.indexOf(value) === index);
}


async function main() {
  console.time();

  // STEP 1:
  // read file index
  const index = readIndex();
  const pagesFlat = flattenPages(index);

  // check '_data' folder
  folderCheck(`${_TARGET_DATA}`);
  fileWrite(`${_TARGET_DATA}/index.json`, JSON.stringify(index, null, 2));


  // STEP 2:
  // check '_wiki' folder
  folderCheck(`${_TARGET_WIKI}`);

  // create index files for language root folders
  getUniqueContentLanguages(pagesFlat).forEach(lang => {
    // check '_wiki/(en|**)' folder
    folderCheck(`${_TARGET_WIKI}/${lang}`);
    fileWrite(`${_TARGET_WIKI}/${lang}/index.html`, '' +
      '---\n' +
      `title: ${lang} index\n` +
      `language: ${lang}\n` +
      'layout: toc\n' +
      '---\n'
    );
  });


  // initialize MarkdownParser
  const mdPluginAssets = [];
  const mdPluginFiles = [];
  const mdLocks = [];
  const {parser: mdParser, finalize} = await parser.build({
    // url to TermX web
    webPath: index.space.web,
    // flat page array
    pages: pagesFlat,
    // plantUML server
    plantumlServer: 'https://www.plantuml.com/plantuml',
    // for plugins to download any file
    downloadFile: (filename, url) => mdPluginAssets.push({filename, url}),
    // for plugins to save any file
    saveFile: (filename, content) => mdPluginFiles.push({filename, content}),
    // for plugins to force client wait until they finished
    setLock: lock => mdLocks.push(lock)
  });

  try {
    // save transformed page content
    for (const pageDef of pagesFlat) {
      for (const content of pageDef['contents']) {
        let extension = content.contentType === 'markdown' ? 'md' : 'html';
        let pageContent = fileRead(`${_ROOT_FOLDER}/pages/${content.slug}.${extension}`);

        // font-matter
        const frontMatter =
          '---\n' +
          `title: ${content.name}\n` +
          `slug: ${content.slug}\n` +
          `language: ${content.lang}\n` +
          'langs:\n' +
          `${pageDef.contents.map(({lang, slug}) =>
            ` - key: ${lang}\n   value: ${slug}`).join('\n')}\n` +
          `last_modified_date: ${content.modifiedAt}\n` +
          '---\n';

        // content
        if (extension === 'md') {
          pageContent = await mdParser.render(pageContent)
          extension = 'html';
        }

        // save page content in '_wiki/(en|**)' folder
        fileWrite(`${_TARGET_WIKI}/${content.lang}/${content.slug}.${extension}`,
          frontMatter +
          '\n{% raw %}\n' +
          pageContent +
          '\n{% endraw %}'
        );
      }
    }

    if (mdLocks.length) {
      await Promise.allSettled(mdLocks);
    }
  } finally {
    await finalize()
  }


  // STEP 3:
  // copy assets
  try {
    // uploaded
    folderCheck(`${_TARGET_ASSETS}`);
    folderCopy(`${_ROOT_FOLDER}/attachments`, `${_TARGET_ASSETS}/files`);

    // generated
    folderCheck(`${_TARGET_ASSETS}/generated`);
    for (const ass of mdPluginAssets) {
      await downloadFile(`${_TARGET_ASSETS}/generated/${ass.filename}`, ass.url);
    }
    for (const ass of mdPluginFiles) {
      fileWrite(`${_TARGET_ASSETS}/generated/${ass.filename}`, ass.content)
    }
  } catch (e) {
    console.log("Failed to copy assets!", e);
  }

  console.timeEnd();
}


main()
