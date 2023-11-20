const md5 = require("md5");
const {join} = require('path');
const {
  _TARGET_ASSETS_FILES,
  _TARGET_ASSETS_GENERATED,
  _TARGET_ASSETS_RESOURCES,
  abs
} = require("./paths");
// fake DOM
const jsdom = require("jsdom");
const DOM = new jsdom.JSDOM();
const DOCUMENT = DOM.window.document;
const CONTAINER = DOCUMENT.createElement('div');


module.exports = {
  /**
   * @param mdOptions {{
   *    webPath: string,
   *    pages: import('types').PageDefinition[],
   *    plantumlServer: string,
   *    chef: string,
   *    downloadFile: (filename: string, url: string) => void,
   *    saveFile: (filename: string, content: string) => void,
   *    setLock: (lock: Promise) => void,
   * }}
   */
  build: async (mdOptions) => {
    const lib = await import('@kodality-web/marina-markdown-parser');

    // initialize MarkdownParser
    const parser = new lib.MarkdownParser(() => DOCUMENT, () => CONTAINER, {plantUml: {server: mdOptions.plantumlServer}});
    parser.use({plugin: localImagePlugin()})
    parser.use({plugin: localLinkPlugin({web: mdOptions.webPath, pages: mdOptions.pages})})
    parser.use({plugin: umlPlugin({downloadFile: mdOptions.downloadFile})})
    parser.use({plugin: await mermaidPlugin({saveFile: mdOptions.saveFile, setLock: mdOptions.setLock})})
    parser.use({plugin: await drawioPlugin()})
    parser.use({plugin: await structureDefinitionFSHPlugin({chefUrl: mdOptions.chef, saveFile: mdOptions.saveFile, setLock: mdOptions.setLock})})
    parser.use({plugin: await structureDefinitionCodePlugin()})

    const finalize = async () => {
      await requireBrowser().then(b => b.close());
    }

    return {parser, finalize}
  }
}


// utils

function hash(data) {
  return md5(data);
}

function matchSection() {
  return import('@kodality-web/marina-markdown-parser').then(pack => pack.matchSection)
}

function tokenAttrValue(token, attr) {
  const attrIdx = token.attrs.findIndex(a => a[0] === attr)
  if (attrIdx === -1) {
    return [undefined, (val) => {
      token.attrs.push(attr, val);
    }];
  }
  return [token.attrs[attrIdx][1], (val) => {
    token.attrs[attrIdx][1] = val
  }];
}

async function requireBrowser() {
  if (this['__puppeteer-browser']) {
    return this['__puppeteer-browser']
  }
  const puppeteer = await import("puppeteer");
  return this['__puppeteer-browser'] = puppeteer.launch({
    executablePath: 'google-chrome-stable',
    headless: "new",
    args: ["--no-sandbox", "--disable-extensions", "--disable-setuid-sandbox"],
    cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
  });
}


// plugins

/**
 * Image plugin
 */
function localImagePlugin() {
  // markdown-it plugin
  return (md) => {
    // matches "files/:pageId/:fileName"
    const filesRe = /^files\/(\d*)\/(.+)/;

    const filesLink = (url) => {
      const [_, id, name] = url.match(filesRe);
      return `${abs(_TARGET_ASSETS_FILES)}/${id}/${name}`;
    };

    const defaultRender = md.renderer.rules.image;
    md.renderer.rules.image = function(tokens, idx, options, env, self) {
      const [val, setVal] = tokenAttrValue(tokens[idx], 'src');
      if (filesRe.test(val)) {
        setVal(filesLink(val));
      }
      return defaultRender(tokens, idx, options, env, self);
    };
  }
}

/**
 * Link plugin
 *
 * @param opts {{
 *    web: string,
 *    pages: import('types').PageDefinition[]
 * }}
 */
function localLinkPlugin(opts) {
  const {web, pages} = opts;

  function processHref(href) {
    if (["cs", "csv", "vs", "vsv", "ms", "msv", "concept", "page"].includes(href.split(":")[0])) {
      const [system, value] = decodeURIComponent(href).split(':');
      switch (system) {
        // CodeSystem
        case 'cs':
          return `${web}/resources/code-systems/${value}/summary`;
        case 'csv':
          const [codeSystem, csVersion] = value.split('|');
          return `${web}/resources/code-systems/${codeSystem}/versions/${csVersion}/summary`;
        case 'concept':
          const [cs, concept] = value.split('|');
          return cs === 'snomed-ct' ? `${web}/integration/snomed/dashboard/${concept}` : `${web}/resources/code-systems/${cs}/concepts/${concept}/view`;

        // ValueSet
        case 'vs':
          return `${web}/resources/value-sets/${value}/summary`;
        case 'vsv':
          const [valueSet, vsVersion] = value.split('|');
          return `${web}/resources/value-sets/${valueSet}/versions/${vsVersion}/summary`;

        // MapSet
        case 'ms':
          return `${web}/resources/map-sets/${value}/summary`;
        case 'msv':
          const [mapSet, msVersion] = value.split('|');
          return `${web}/resources/map-sets/${mapSet}/versions/${msVersion}/summary`;

        // Wiki
        case 'page':
          const [page, space] = value.split(/\/(.*)/s).slice(0, 2).reverse()
          if (space) {
            return `${web}/wiki/${space}/${page}`;
          }
          const targetPage = pages
            .flatMap(p => p.contents)
            .filter(Boolean)
            .find(c => c.slug === value)
          return targetPage ? `/${targetPage.lang}/${value}` : `/${value}`;
      }
    }
    return href;
  }


  // markdown-it plugin
  return (md) => {
    const renderer = md.renderer.rules.link_open || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

    md.renderer.rules.link_open = function(tokens, idx, options, env, self) {
      const [val, setVal] = tokenAttrValue(tokens[idx], 'href');
      if (val.includes(':')) {
        setVal(processHref(val, opts));
      } else if (val.startsWith('/')) {
        setVal(`${web}${val}`)
      }
      return renderer(tokens, idx, options, env, self);
    };
  }
}

/**
 * PlantUML plugin
 *
 * @param opts {{downloadFile: (filename: string, url: string) => void}}
 */
function umlPlugin(opts) {
  const {downloadFile} = opts;

  // markdown-it plugin
  return (md) => {
    md.renderer.rules.uml_diagram = function(tokens, idx) {
      const [url] = tokenAttrValue(tokens[idx], 'src');
      const name = md5(url);
      downloadFile(`${name}.svg`, url)
      return `<img class="drawio" src="${abs(_TARGET_ASSETS_GENERATED)}/${name}.svg">`;
    };
  }
}

/**
 * Mermaid plugin
 *
 * @param opts {{
 *    saveFile: (filename: string, content: string) => void,
 *    setLock: (promise: Promise) => void
 * }}
 */
async function mermaidPlugin(opts) {
  const _matchSection = await matchSection();
  const {saveFile, setLock} = opts;

  const browser = await requireBrowser();
  const mermaidCli = await import("@mermaid-js/mermaid-cli");


  // markdown-it plugin
  return (md) => {
    md.renderer.rules.mermaid = (tokens, idx) => {
      const [data] = tokenAttrValue(tokens[idx], 'data');
      return `<img class="drawio" src="${abs(_TARGET_ASSETS_GENERATED)}/${hash(data)}.svg">`;
    };

    md.block.ruler.before('fence', 'mermaid', (state, startl, endl, silent) => {
      const {failed, end, autoClosed, content} = _matchSection('```mermaid', '```', state, startl, endl, silent);
      if (failed) {
        return false;
      }
      const data = content?.match(/```mermaid\n?([\W\w]*)\n?```/)?.[1];
      if (!data) {
        return false;
      }

      // create MD token
      const token = state.push('mermaid', '', 0);
      token.attrs = [['data', data]];
      state.line = end.line + (autoClosed ? 1 : 0);

      // render diagram using Mermaid CLI
      setLock(mermaidCli
        .renderMermaid(browser, data, 'svg')
        .then(r => r.data)
        .then(d => saveFile(`${hash(data)}.svg`, String(d))));

      return true;
    });
  }
}

/**
 * DrawIO plugin
 */
async function drawioPlugin() {
  const _matchSection = await matchSection();

  // markdown-it plugin
  return (md) => {
    md.renderer.rules.drawio = (tokens, idx) => {
      const [base64] = tokenAttrValue(tokens[idx], 'data');
      return `<div><img class="drawio" src="data:image/svg+xml;base64, ${base64}"></div>`;
    };

    md.block.ruler.before('fence', 'drawio', (state, startl, endl, silent) => {
      const {failed, end, autoClosed, content} = _matchSection('```drawio', '```', state, startl, endl, silent);
      if (failed) {
        return false;
      }
      const base64 = content.match(/```drawio\n?(.+)\n?```/)?.[1];
      if (!base64) {
        return false;
      }
      const token = state.push('drawio', '', 0);
      token.attrs = [['data', base64]];
      state.line = end.line + (autoClosed ? 1 : 0);
      return true;
    });
  }
}

/**
 * StructureDefinition FSH plugin

 * @see /template/assets/js/fsdv-wrapper.js
 * Assumes:
 * ```fsh
 * FHS-shy content in the .md
 * ```
 *
 * @param opts {{
 *    chefUrl: string,
 *    saveFile: (filename: string, content: string) => void,
 *    setLock: (promise: Promise) => void
 * }}
 *
 */
async function structureDefinitionFSHPlugin(opts) {
  const {saveFile, setLock, chefUrl} = opts;
  const _matchSection = await matchSection();

  return md => {
    md.renderer.rules.structure_definition_fsh = (tokens, idx) => {
      const [fsh] = tokenAttrValue(tokens[idx], 'fsh');
      return `<div data-type="fsdv-placeholder" data-src="${abs(_TARGET_ASSETS_GENERATED)}/${hash(fsh)}.json"></div>`;
    };

    md.block.ruler.before('fence', 'structure_definition_fsh', (state, startl, endl, silent) => {
      const {failed, end, autoClosed, content} = _matchSection('```fsh', '```', state, startl, endl, silent);
      if (failed) {
        return false;
      }

      // create MD token
      const token = state.push('structure_definition_fsh', '', 0);
      const fshContent = content.match(/```fsh(.*?)```/s)[1].replace(/^\n/, '');
      token.attrs = [['fsh', fshContent]];
      state.line = end.line + (autoClosed ? 1 : 0);

      // transform FSH to JSON
      setLock(fetch(`${chefUrl}/fsh2fhir`, {
        method: 'POST',
        body: JSON.stringify({fsh: fshContent}),
        headers: {'Content-Type': 'application/json'}
      })
        .then(r => r.json())
        .then(r => {
          if (r['fhir'] && r['fhir'].length) {
            return r['fhir'][0];
          }
          throw Error(`Failed to convert FSH to JSON: ${r['error'].map(e => e['message']).join('; ')}`)
        })
        .then(json => saveFile(`${hash(fshContent)}.json`, JSON.stringify(json, null, 2))))

      return true;
    });
  }
}

/**
 * StructureDefinition code plugin.
 *
 * @see /template/assets/js/fsdv-wrapper.js
 * Assumes:
 * 1. '{{def:structure-definition-code}}' in template
 * 2. structure-definition-code.json in assets
 */
async function structureDefinitionCodePlugin() {
  const _matchSection = await matchSection();

  return md => {
    md.renderer.rules.structure_definition_code = (tokens, idx) => {
      const [code] = tokenAttrValue(tokens[idx], 'code');
      return `<div data-type="fsdv-placeholder" data-src="${abs(_TARGET_ASSETS_RESOURCES)}/structure-definition/${code}.json"></div>`;
    };

    md.block.ruler.after('reference', 'structure_definition_code', (state, startl, endl, silent) => {
      const {failed, end, autoClosed, content} = _matchSection('{{def:', '}}', state, startl, endl, silent);
      if (failed) {
        return false;
      }

      const token = state.push('structure_definition_code', '', 0);
      token.attrs = [['code', content.match(/{{def:(.*)}}/)[1]]];
      state.line = end.line + (autoClosed ? 1 : 0);
      return true;
    });
  }
}
