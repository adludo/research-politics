/**
 * Request helpers for a host-provided ChatGPT-compatible web-run tool.
 * This module is not a search service and does not provide authentication.
 * Inspect the active tool schema before binding its callback.
 */
export function createWebResearch(run) {
  if (typeof run !== 'function') {
    throw new TypeError('A callable web search/browsing tool is required; shell HTTP is not a substitute.');
  }

  const request = async (operation) => {
    const result = await run({ ...operation, response_length: 'long' });
    if (result?.isError) throw new Error('Web tool reported an error; inspect its returned evidence.', { cause: result });
    return result;
  };

  const requiredText = (value, label) => {
    if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} must be a nonempty string.`);
    return value.trim();
  };

  const pageReference = (value) => {
    const ref = requiredText(value, 'Returned page reference');
    if (/^https?:\/\//i.test(ref)) {
      throw new TypeError('Use the page reference from actual preceding web output, not a URL.');
    }
    return ref;
  };

  return {
    /** Search an exact source URL before opening the matching result. */
    searchUrl(url) {
      const parsed = new URL(requiredText(url, 'Source URL'));
      if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) {
        throw new TypeError('Use a public HTTP(S) source URL without credentials.');
      }
      return request({ search_query: [{ q: `"${parsed.href}"` }] });
    },
    /** Also supports site-restricted queries when exact-URL search has no match. */
    search(query) {
      return request({ search_query: [{ q: requiredText(query, 'Search query') }] });
    },
    /** Open a matching returned result reference, or its source URL. */
    open(refOrUrl) {
      return request({ open: [{ ref_id: requiredText(refOrUrl, 'Result reference or URL') }] });
    },
    /** The caller must obtain both values from actual preceding output. */
    follow(pageRef, linkId) {
      const ref = pageReference(pageRef);
      if (!Number.isInteger(linkId) || linkId < 0) throw new TypeError('Link ID must be a nonnegative integer from preceding output.');
      return request({ click: [{ ref_id: ref, id: linkId }] });
    },
    /** Read a section using the line numbering supplied by the web service. */
    read(pageRef, line) {
      const ref = pageReference(pageRef);
      if (!Number.isInteger(line) || line < 0) throw new TypeError('Line number must be a nonnegative integer.');
      return request({ open: [{ ref_id: ref, lineno: line }] });
    },
  };
}
