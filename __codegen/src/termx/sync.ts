import fs from 'fs';
import {Page, PageAttachment, PageLink, SearchResult, Space} from './models';


if (!process.cwd().endsWith("__codegen")) {
  throw Error(`invalid cwd: ${process.cwd()}`)
}


// utils
const folderCheck = p => !fs.existsSync(p) && fs.mkdirSync(p)
const fileWrite = (p, file) => fs.writeFileSync(p, file, 'utf-8');

function group<K extends string | number | symbol, V, R = V>(
  array: V[],
  groupBy: (val: V) => K,
  transform: (val: V, key?: K) => R = (val): R => val as unknown as R
): Record<K, R> {
  return array.reduce((acc, val) => {
    const k = groupBy(val);
    return ({...acc, [k]: transform(val, k)});
  }, {}) as Record<K, R>;
}


function collect<K extends string | number | symbol, V, R = V>(
  array: V[],
  collectBy: (val: V) => K,
  transform: (val: V, key?: K) => R = (val): R => val as unknown as R
): Record<K, R[]> {
  const _acc = {} as Record<K, R[]>;

  return array.reduce((acc, val) => {
    const k = collectBy(val);
    const v = transform(val, k);
    return ({...acc, [k]: [...(acc[k] || []), v]});
  }, _acc) as Record<K, R[]>;
}


// HTTP
const WEB_BASE = 'https://termx.kodality.dev';
const API_BASE = 'https://termx.kodality.dev/api';
const ACCESS_TOKEN_URL = 'https://auth.kodality.dev/realms/terminology/protocol/openid-connect';
const CLIENT_ID = 'term-service';
const CLIENT_SECRET = 'INSERT_YOUR_TOKEN_HERE';


class HttpClient {
  private readonly jwt: string;

  constructor(jwt: string) {
    this.jwt = jwt
  }

  async get<T>(url: string): Promise<T> {
    const opts = {
      headers: {'Authorization': `Bearer ${this.jwt}`}
    };
    return fetch(url, opts)
      .then(r => r.json())
      .catch(err => console.error(err))
  };

  async getBlob(url: string): Promise<Blob | void> {
    const opts = {
      headers: {'Authorization': `Bearer ${this.jwt}`}
    };
    return fetch(url, opts)
      .then(r => r.blob())
      .catch(err => console.error(err))
  };

  async post<T>(url: string, body: any): Promise<T> {
    const opts = {
      method: 'POST',
      headers: {'Authorization': `Bearer ${this.jwt}`, 'Content-Type': 'application/json'},
      body: JSON.stringify(body)
    };
    return fetch(url, opts)
      .then(r => r.json())
      .catch(err => console.error(err))
  };

  static async build(): Promise<HttpClient> {
    const jwt = await fetch(ACCESS_TOKEN_URL + '/token', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded', 'Access-Control-Allow-Origin': '*'},
      body: `client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`
    })
      .then(r => r.json())
      .then(r => r['access_token']);

    return new HttpClient(jwt)
  }
}


console.time()
HttpClient.build().then(async http => {
  const SPACE_ID = 8211114;
  const _ROOT_FOLDER = `../__source`;
  const _ROOT_ATTACHMENTS = `${_ROOT_FOLDER}/attachments`;
  const _ROOT_PAGES = `${_ROOT_FOLDER}/pages`;
  const _ROOT_RESOURCES = `${_ROOT_FOLDER}/resources`;

  // load resources
  const space = await http.get<Space>(`${API_BASE}/spaces/${SPACE_ID}`);
  const pages = (await http.get<SearchResult<Page>>(`${API_BASE}/pages?spaceIds=${SPACE_ID}&limit=-1`)).data;
  const links = group((await http.get<SearchResult<PageLink>>(`${API_BASE}/page-links?spaceIds=${SPACE_ID}&limit=-1`)).data, l => l.targetId);


  // check temp folder existence
  folderCheck(_ROOT_FOLDER);


  // STEP (pages/**): save page contents
  const pagesGrouped = group(pages.flatMap(p => p.contents), c => c.slug);
  folderCheck(_ROOT_PAGES)
  for (const pc of Object.values(pagesGrouped)) {
    fileWrite(`${_ROOT_PAGES}/${pc.slug}.${pc.contentType === 'markdown' ? 'md' : 'html'}`, pc.content);
  }


  // STEP (attachments/**): save page attachments
  const pageAttachments = pages.flatMap(async p => {
    // load definitions
    const attachmentDefinitions = await http.get<PageAttachment[]>(`${API_BASE}/pages/${p.id}/files`);

    // load actual blobs
    const attachments = attachmentDefinitions.map(async att => {
      const blob = await http.getBlob(`${API_BASE}/pages/${p.id}/files/${att.fileName}`);
      return {
        pageId: p.id,
        fileName: att.fileName,
        blob
      };
    });

    return Promise.all(attachments)
  });


  folderCheck(_ROOT_ATTACHMENTS)
  for (const attachments of await Promise.all(pageAttachments)) {
    for (const att of attachments) {
      const buffer = Buffer.from(await (att.blob as Blob).arrayBuffer());
      folderCheck(`${_ROOT_ATTACHMENTS}/${att.pageId}`)
      fileWrite(`${_ROOT_ATTACHMENTS}/${att.pageId}/${att.fileName}`, buffer);
    }
  }

  // STEP (resources/**)
  const pageResources: Promise<{
    type: 'structure-definition' | string,
    resourceId: string,
    content: string,
    extension: 'json' | string
  }>[] = pages.flatMap(p => {
    return p.relations.map(async rel => {
      if (rel.type === 'def') {
        const {data} = await http.get<SearchResult<{
          contentFormat: 'json' | 'fsh',
          content: string
        }>>(`${API_BASE}/structure-definitions?code=${rel.target}&limit=1`)

        const sd = data[0]
        if (sd?.contentFormat === 'json') {
          return {
            type: 'structure-definition',
            resourceId: rel.target,
            content: sd.content,
            extension: 'json'
          }
        }

        console.log(`SD ${rel.target} has "${sd?.contentFormat || 'unknown'}" content format, skipping!`)
      } else {
        console.log(`Unknown "${rel.type}" resource type, skipping!`)
      }
    });
  })

  folderCheck(_ROOT_RESOURCES)
  for (const res of (await Promise.all(pageResources)).filter(Boolean)) {
    folderCheck(`${_ROOT_RESOURCES}/${res.type}`)
    fileWrite(`${_ROOT_RESOURCES}/${res.type}/${res.resourceId}.${res.extension}`, res.content);
  }


  // STEP (index.json): save page index
  const pagesSorted = pages
    .sort((p1, p2) => p1.id - p2.id)
    .sort((p1, p2) => links[p1.id].orderNumber - links[p2.id].orderNumber);

  const spaceIndex: SpaceIndex = {web: WEB_BASE, code: space.code, names: space.names};
  const pageIndex: PageIndex = buildPages(0, collect(pagesSorted, p => p.links?.length ? p.links[0].sourceId : 0))

  fileWrite(`${_ROOT_FOLDER}/space.json`, JSON.stringify(spaceIndex, null, 2));
  fileWrite(`${_ROOT_FOLDER}/pages.json`, JSON.stringify(pageIndex, null, 2));
}).then(() => console.timeEnd())


const buildPages = (parent: number, allPages: Record<number, Page[]>): PageDefinition[] => {
  return !allPages[parent] ? null : allPages[parent].map(p => ({
    code: p.code,
    contents: p.contents
      .sort((c1, c2) => c1.slug.localeCompare(c2.slug))
      .map(c => ({
        name: c.name,
        slug: c.slug,
        lang: c.lang,
        contentType: c.contentType,
        modifiedAt: c.modifiedAt
      })),
    children: buildPages(p.id, allPages)
  }))
}
