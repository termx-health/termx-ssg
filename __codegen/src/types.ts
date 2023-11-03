// space.json
interface SpaceIndex {
  web: string
  code: string;
  names: {[lang: string]: string};
}


// pages.json
type PageIndex = PageDefinition[];

interface PageDefinition {
  code: string,
  contents: PageDefinitionContent[],
  children?: PageDefinition[]
}

interface PageDefinitionContent {
  name: string,
  slug: string,
  lang: string,
  contentType?: 'markdown' | 'html',
  modifiedAt?: Date
}
