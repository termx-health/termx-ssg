/**
 * FHIR Structure Definition Viewer Wrapper
 *
 * Generate Step (MD parser)
 * 1. puts JSON files into assets;
 * 2. transforms inline/template FSH to JSON
 *
 * Both of these actions are asynchronous, so it is not possible to generate completed HTML during generation step.
 * Instead, plugins download JSON files into assets folder, and leaves reference to file name in the [data] attribute.
 */
import('./fhir-structure-definition-viewer.js').then(m => {
  m.initializeWebComponent('fsd-viewer')

  const nodes = document.querySelectorAll('[data-type="fsdv-placeholder"]');
  nodes.forEach(el => {
    el.innerHTML = '...loading';

    fetch(el.getAttribute('data-src'))
      .then(r => r.text())
      .then(json => {
        el.outerHTML = `<fsd-viewer class="structure-definition-viewer" data="${encodeURIComponent(json)}" inline="true" columns="flags,cardinality,types"></fsd-viewer>`;
      })
  })
})
