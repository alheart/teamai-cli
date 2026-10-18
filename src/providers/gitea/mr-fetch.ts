import type { MRData } from '../../types.js';
import { log } from '../../utils/logger.js';
import { giteaJson, giteaList, giteaRequest } from './gitea-api.js';
import { giteaRepoPath, parseGiteaPrUrl } from './repo-url.js';

// Validated PR URL → metadata + paginated commits + bounded diff → MRData.

interface GiteaPull {
  title: string;
  body?: string | null;
  merged_at?: string | null;
  user?: { login?: string };
}

interface GiteaCommit { sha: string; commit?: { message?: string } }

/** Fail visibly when required evidence is unavailable instead of importing an empty diff. */
export async function fetchGiteaMR(url: string): Promise<MRData> {
  const info = parseGiteaPrUrl(url);
  const route = `${giteaRepoPath(`${info.owner}/${info.repo}`)}/pulls/${info.number}`;
  const pull = await giteaJson<GiteaPull>(route);
  const commits = await giteaList<GiteaCommit>(`${route}/commits`);
  const patch = await giteaRequest(`${route}.diff`, { textLimit: 50 * 1024 });
  const marker = '\n[Diff truncated at 50 KiB; evidence is incomplete.]';
  let diff = patch.text;
  if (patch.truncated) {
    log.warn('Gitea PR diff truncated at 50 KiB; extracted knowledge has incomplete diff evidence.');
    // Keep the marker inside the same byte budget, including a UTF-8 boundary.
    const decoder = new TextDecoder();
    diff = decoder.decode(Buffer.from(diff).subarray(0, 50 * 1024 - Buffer.byteLength(marker)), { stream: true }) + marker;
  }
  return {
    title: pull.title, description: pull.body ?? '', author: pull.user?.login,
    mergedAt: pull.merged_at ?? undefined, url,
    commits: commits.map((commit) => ({ hash: commit.sha, message: commit.commit?.message ?? '' })), diff,
  };
}
