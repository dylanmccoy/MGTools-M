  /* ============================================================================
   * 7. NETWORK MODULE - START
   * ============================================================================
   * Unified network layer with CSP bypass capabilities
   */

  /**
   * Network abstraction layer with fallback to GM_xmlhttpRequest
   * @namespace Network
   */
  const Network = {
    async fetch(url, options = {}) {
      if (
        CompatibilityMode.flags.bypassCSPNetworking &&
        typeof GM_xmlhttpRequest === "function" &&
        !url.startsWith(window.location.origin)
      ) {
        // Use GM_xmlhttpRequest to bypass CSP for external requests
        logDebug("NETWORK", `Using GM_xmlhttpRequest for: ${url}`);
        return new Promise((resolve, reject) => {
          GM_xmlhttpRequest({
            url,
            method: options.method || "GET",
            headers: options.headers || {},
            data: options.body,
            responseType: "text",
            timeout: options.timeout || 10000,
            onload: (response) => {
              resolve({
                ok: response.status >= 200 && response.status < 300,
                status: response.status,
                statusText: response.statusText,
                text: () => Promise.resolve(response.responseText),
                json: () => Promise.resolve(JSON.parse(response.responseText)),
                headers: {
                  get: (name) =>
                    response.responseHeaders.match(
                      new RegExp(`^${name}:\\s*(.*)$`, "mi"),
                    )?.[1],
                },
              });
            },
            onerror: (error) =>
              reject(new Error(error.statusText || "Network error")),
            ontimeout: () => reject(new Error("Request timeout")),
          });
        });
      } else {
        // Normal fetch
        return fetch(url, options);
      }
    },
  };

