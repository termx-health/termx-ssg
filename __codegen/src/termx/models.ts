export interface LocalizedName {
  [key: string]: string;
}

export interface SearchResult<T> {
  data: T[]
  meta?: {
    total?: number;
    pages?: number;
    offset?: number;
  }
}

export class Space {
  public code?: string;
  public names?: LocalizedName;
}

export class Page {
  public id?: number;
  public code?: string;
  public contents?: PageContent[];
  public links?: PageLink[];
}

export class PageContent {
  public id?: number;
  public name?: string;
  public slug?: string;
  public lang?: string;
  public content?: string;
  public contentType?: 'markdown' | 'html';

  public createdAt?: Date;
  public modifiedAt: Date
}

export class PageLink {
  public id?: number;
  public sourceId?: number;
  public targetId?: number;
  public orderNumber?: number;
}

export class PageAttachment {
  public fileId?: string;
  public fileName?: string;
  public contentType?: string;
}
