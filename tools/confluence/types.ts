/** Parsed Confluence page view JSON from `acli confluence page view`. */
export type PageViewJson = {
  id: string;
  title?: string;
  parentId?: string;
  spaceId?: string;
  status?: string;
  body?: {
    storage?: {
      representation?: string;
      value?: string;
    };
  };
  directChildren?: {
    meta?: { hasMore?: boolean };
    results?: ChildRef[];
  };
  version?: { number?: number };
  _links?: {
    base?: string;
    webui?: string;
    tinyui?: string;
  };
};

/** Child page reference from `directChildren.results`. */
export type ChildRef = {
  id: string;
  title?: string;
  childPosition?: number;
};

/** Local markdown page under `confluence/`. */
export type LocalPage = {
  id: string;
  path: string;
  relPath: string;
  title: string;
  parentId: string;
  version: number;
  url: string;
  spaceKey: string;
  syncedHash: string;
  body: string;
};
