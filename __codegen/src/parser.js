// fake DOM
const jsdom = require("jsdom");
const DOM = new jsdom.JSDOM();
const DOCUMENT = DOM.window.document;
const CONTAINER = DOCUMENT.createElement('div');

module.exports = {
  build: async () => {
    const lib = await import('@kodality-web/marina-markdown-parser');

    // initialize MarkdownParser
    const parser = new lib.MarkdownParser(() => DOCUMENT, () => CONTAINER);
    parser.use({plugin: await localImage})
    parser.use({plugin: await drawioPlugin})
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

// image.plugin
async function localImage(md) {
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

// drawio.plugin
async function drawioPlugin(md) {
  const _matchSection = await matchSection();

  md.renderer.rules.drawio = (tokens, idx, /*options, env, self */) => {
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


