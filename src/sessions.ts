import { chromium, type Browser, type Page } from "playwright";
import { configure, wrap } from "agentql";
import {
  createBrowserSession,
  BrowserProfile,
  UserAgentPreset,
  type BrowserSession,
} from "agentql/tools";

export interface SessionEntry {
  sessionId: string;
  cdpUrl: string;
  streamingUrl: string;
  browser: Browser;
  tetraSession: BrowserSession;
  createdAt: Date;
}

export interface CreateSessionParams {
  profile?: "light" | "stealth";
  ua_preset?: "windows" | "macos" | "linux";
  proxy?: "none" | "tetra" | "custom";
  proxy_url?: string;
}

const sessions = new Map<string, SessionEntry>();
let idCounter = 0;

export function initAgentQL(apiKey: string): void {
  configure({ apiKey });
}

export async function createSession(
  params: CreateSessionParams = {}
): Promise<{
  session_id: string;
  cdp_url: string;
  streaming_url: string;
}> {
  const profile =
    params.profile === "stealth"
      ? BrowserProfile.STEALTH
      : BrowserProfile.LIGHT;

  const uaPreset =
    params.ua_preset === "macos"
      ? UserAgentPreset.MACOS
      : params.ua_preset === "linux"
        ? UserAgentPreset.LINUX
        : UserAgentPreset.WINDOWS;

  const sessionOpts: Record<string, unknown> = { profile };
  if (params.profile !== "stealth") {
    sessionOpts.uaPreset = uaPreset;
  }
  if (params.proxy === "tetra") {
    sessionOpts.proxy = { type: "tetra" };
  } else if (params.proxy === "custom" && params.proxy_url) {
    sessionOpts.proxy = { type: "custom", url: params.proxy_url };
  }

  const tetraSession = await createBrowserSession(sessionOpts);
  const cdpUrl = tetraSession.cdpUrl;

  // Connect Playwright to hold the connection alive
  const browser = await chromium.connectOverCDP(cdpUrl);

  const sessionId = `sess_${++idCounter}_${Date.now()}`;
  const streamingUrl = tetraSession.getPageStreamingUrl(0);

  sessions.set(sessionId, {
    sessionId,
    cdpUrl,
    streamingUrl,
    browser,
    tetraSession,
    createdAt: new Date(),
  });

  return {
    session_id: sessionId,
    cdp_url: cdpUrl,
    streaming_url: streamingUrl,
  };
}

export async function closeSession(
  sessionId: string
): Promise<{ ok: true }> {
  const entry = sessions.get(sessionId);
  if (entry) {
    try {
      await entry.browser.close();
    } catch {
      // already closed
    }
    sessions.delete(sessionId);
  }
  return { ok: true };
}

function getSession(sessionId: string): SessionEntry {
  const entry = sessions.get(sessionId);
  if (!entry) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  return entry;
}

async function getPage(sessionId: string, pageIndex: number = 0): Promise<Page> {
  const entry = getSession(sessionId);
  const contexts = entry.browser.contexts();
  if (contexts.length === 0) {
    throw new Error("No browser contexts available");
  }
  const pages = contexts[0].pages();
  if (pages.length === 0) {
    // Tetra may not create a default page — create one
    return await contexts[0].newPage();
  }
  if (pageIndex >= pages.length) {
    throw new Error(
      `Page index ${pageIndex} out of range (${pages.length} pages open)`
    );
  }
  return pages[pageIndex];
}

export async function queryData(
  sessionId: string,
  query: string,
  options: {
    include_hidden?: boolean;
    mode?: "standard" | "fast";
    page_index?: number;
  } = {}
): Promise<{ data: unknown }> {
  const page = await getPage(sessionId, options.page_index ?? 0);
  const wrappedPage = await wrap(page);

  const data = await wrappedPage.queryData(query, {
    includeHidden: options.include_hidden ?? true,
    mode: (options.mode ?? "fast") as "standard" | "fast",
  });

  return { data };
}

function enrichElements(data: any): any {
  if (Array.isArray(data)) {
    return data.map((item) => enrichElements(item));
  }
  if (data && typeof data === "object") {
    // Leaf element node — has tf623_id
    if (data.tf623_id !== undefined) {
      // Strip noisy attributes (class, style-like props)
      const attrs: Record<string, string> = {};
      if (data.attributes) {
        for (const [k, v] of Object.entries(data.attributes)) {
          if (k !== "class" && k !== "background-image" && k !== "style") {
            attrs[k] = v as string;
          }
        }
      }
      return {
        selector: `[tf623_id="${data.tf623_id}"]`,
        tag: data.html_tag || null,
        role: data.role || null,
        name: data.name || null,
        ...(Object.keys(attrs).length > 0 ? { attributes: attrs } : {}),
      };
    }
    // Container node — recurse
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(data)) {
      result[key] = enrichElements(data[key]);
    }
    return result;
  }
  return data;
}

export async function queryElements(
  sessionId: string,
  query: string,
  options: {
    include_hidden?: boolean;
    mode?: "standard" | "fast";
    page_index?: number;
  } = {}
): Promise<{ elements: unknown }> {
  const page = await getPage(sessionId, options.page_index ?? 0);
  const wrappedPage = await wrap(page);

  // Run the query (builds the proxy + injects tf623_id attrs)
  await wrappedPage.queryElements(query, {
    includeHidden: options.include_hidden ?? false,
    mode: (options.mode ?? "fast") as "standard" | "fast",
  });

  // Get the raw response data (no proxy, no locators)
  const rawData = await wrappedPage.getLastResponse();
  const elements = enrichElements(rawData);
  return { elements };
}

export async function closeAll(): Promise<void> {
  for (const [id] of sessions) {
    await closeSession(id);
  }
}

export function listSessions(): Array<{
  session_id: string;
  cdp_url: string;
  created_at: string;
}> {
  return Array.from(sessions.values()).map((s) => ({
    session_id: s.sessionId,
    cdp_url: s.cdpUrl,
    created_at: s.createdAt.toISOString(),
  }));
}
