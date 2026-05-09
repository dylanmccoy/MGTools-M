/* ============================================================================
 * 2. COMPATIBILITY MODULE - START
 * ============================================================================
 * Handles browser compatibility, CSP issues, and Discord-specific workarounds
 */

// === CSP Guard: Disable external Google Fonts in Discord/webview ===
(function () {
  try {
    const isDiscord =
      /discord|overlay|electron/i.test(navigator.userAgent) ||
      window.DiscordNative ||
      window.__discordApp;
    if (isDiscord) {
      productionLog(
        "🛡️ [CSP] External font loads disabled in Discord context.",
      );
    }
    const origCreateElement = Document.prototype.createElement;
    Document.prototype.createElement = function (tag) {
      const el = origCreateElement.call(this, tag);
      try {
        if (isDiscord && tag && tag.toLowerCase() === "link") {
          const origSetAttribute = el.setAttribute;
          el.setAttribute = function (name, value) {
            if (
              name === "href" &&
              typeof value === "string" &&
              /fonts\.googleapis/i.test(value)
            ) {
              productionLog(
                "🛡️ [CSP] Prevented external font link injection:",
                value,
              );
              return;
            }
            return origSetAttribute.apply(this, arguments);
          };
        }
      } catch (_) {
        // Intentionally ignore setAttribute errors in restricted environments
      }
      return el;
    };
  } catch (_) {
    // Intentionally ignore createElement override errors
  }
})();
