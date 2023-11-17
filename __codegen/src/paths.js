const _ROOT_FOLDER = `../__source`;
const _ROOT_ATTACHMENTS = `${_ROOT_FOLDER}/attachments`;
const _ROOT_PAGES = `${_ROOT_FOLDER}/pages`;
const _ROOT_RESOURCES = `${_ROOT_FOLDER}/resources`;


const _TARGET_FOLDER = '../template'
const _TARGET_DATA = `${_TARGET_FOLDER}/_data`;
const _TARGET_WIKI = `${_TARGET_FOLDER}/_wiki`;
const _TARGET_ASSETS = `${_TARGET_FOLDER}/assets`;
const _TARGET_ASSETS_FILES = `${_TARGET_ASSETS}/files`;
const _TARGET_ASSETS_GENERATED = `${_TARGET_ASSETS}/generated`;
const _TARGET_ASSETS_RESOURCES = `${_TARGET_ASSETS}/resources`;


module.exports = {
  _ROOT_FOLDER,
  _ROOT_ATTACHMENTS,
  _ROOT_PAGES,
  _ROOT_RESOURCES,

  _TARGET_FOLDER,
  _TARGET_DATA,
  _TARGET_WIKI,
  _TARGET_ASSETS,
  _TARGET_ASSETS_FILES,
  _TARGET_ASSETS_GENERATED,
  _TARGET_ASSETS_RESOURCES,

  abs: function(path) {
    return path.slice(_TARGET_FOLDER.length)
  }
}
