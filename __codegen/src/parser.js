const md5 = require("md5");

// fake DOM
const jsdom = require("jsdom");
const DOM = new jsdom.JSDOM();
const DOCUMENT = DOM.window.document;
const CONTAINER = DOCUMENT.createElement('div');

module.exports = {
  /**
   * @param mdOptions {{
   *  webPath: string,
   *  pages: import('types').PageDefinition[],
   *  downloadFile: (filename: string, url: string) => void,
   *  plantumlServer: string
   * }}
   */
  build: async (mdOptions) => {
    const lib = await import('@kodality-web/marina-markdown-parser');

    // initialize MarkdownParser
    const parser = new lib.MarkdownParser(() => DOCUMENT, () => CONTAINER, {plantUml: {server: mdOptions.plantumlServer}});
    parser.use({plugin: localImagePlugin()})
    parser.use({plugin: localLinkPlugin({web: mdOptions.webPath, pages: mdOptions.pages})})
    parser.use({plugin: umlPlugin({downloadFile: mdOptions.downloadFile})})
    parser.use({plugin: await drawioPlugin()})
    return parser
  }
}


// utils

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


/**
 * Image plugin
 */
function localImagePlugin() {
  return (md) => {
    // matches "files/:pageId/:fileName"
    const filesRe = /^files\/(\d*)\/(.+)/;

    const filesLink = (url) => {
      const [_, id, name] = url.match(filesRe);
      return `/assets/files/${id}/${name}`;
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
 * @param opts {{web: string, pages: import('types').PageDefinition[]}}
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
      }
      return renderer(tokens, idx, options, env, self);
    };
  }
}

/**
 * DrawIO plugin
 */
async function drawioPlugin() {
  const _matchSection = await matchSection();

  // markdown-it plugin
  return (md) => {
    md.renderer.rules.drawio = (tokens, idx, /* options, env, self */) => {
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
 * PlantUML plugin
 *
 * @param opts {{downloadFile: (filename: string, url: string) => void}}
 */
function umlPlugin(opts) {
  const {downloadFile} = opts;

  // markdown-it plugin
  return (md) => {
    md.renderer.rules.uml_diagram = function(tokens, idx, options, env, self) {
      const [url] = tokenAttrValue(tokens[idx], 'src');
      const name = md5(url);
      downloadFile(`${name}.svg`, url)
      return `<img class="drawio" src="/assets/generated/${name}.svg">`;
    };
  }
}
