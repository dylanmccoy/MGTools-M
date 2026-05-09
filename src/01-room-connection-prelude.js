// --- EARLY RoomConnection trap (captures true scopePath ASAP) ---
(function installEarlyRoomConnectionTrap() {
  const KEY = "MagicCircle_RoomConnection";
  // CRITICAL: Use the ACTUAL page window, not sandbox
  const targetWin = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;

  if (targetWin.__mg_rc_trap_installed) return;
  targetWin.__mg_rc_trap_installed = true;

  function installHooks(rc) {
    if (!rc || rc.__mg_scope_installed) return;
    rc.__mg_scope_installed = true;

    const setLast = (sp) => {
      if (Array.isArray(sp)) {
        targetWin.__mga_lastScopePath = sp.slice();
        // Debug only - uncomment if troubleshooting scopePath issues
        // productionLog('[MGTools ScopePatch] captured scopePath', targetWin.__mga_lastScopePath);
      }
    };

    const origSend = rc.sendMessage?.bind(rc);
    if (origSend) {
      rc.sendMessage = function (msg) {
        try {
          setLast(msg?.scopePath);
        } catch {}
        return origSend(msg);
      };
    }

    const origDispatch = rc.dispatch?.bind(rc) || rc._dispatch?.bind(rc);
    if (origDispatch) {
      rc.dispatch = function (evt) {
        try {
          setLast(evt?.scopePath);
        } catch {}
        return origDispatch(evt);
      };
    }

    // Debug only - uncomment if troubleshooting scopePath issues
    // productionLog('[MGTools ScopePatch] early RC trap installed');
  }

  // Check if RC already exists
  if (targetWin[KEY]) {
    try {
      installHooks(targetWin[KEY]);
    } catch (e) {
      console.warn("[MGTools ScopePatch] install now failed", e);
    }
    return;
  }

  // Set trap for future RC
  let _rc;
  Object.defineProperty(targetWin, KEY, {
    configurable: true,
    enumerable: true,
    get() {
      return _rc;
    },
    set(v) {
      _rc = v;
      try {
        installHooks(v);
      } catch (e) {
        console.warn("[MGTools ScopePatch] install on set failed", e);
      }
    },
  });
})();

// ---- Simplified rcSend (waits for scopePath, then sends) ----
async function rcSend(payload, opts = {}) {
  const { retries = 10, delay = 120 } = opts;
  const targetWin = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;

  if (!payload || typeof payload !== "object") {
    console.warn("[MGTools] rcSend invalid payload:", payload);
    return;
  }

  // Wait for scopePath to be captured
  for (let i = 0; i <= retries; i++) {
    const sp = targetWin.__mga_lastScopePath;
    if (Array.isArray(sp)) {
      payload.scopePath = sp.slice();
      break;
    }
    if (i === retries) {
      // FALLBACK: Use known working scopePath structure
      payload.scopePath = ["Room"];
      console.warn('[MGTools] Using fallback scopePath ["Room"]');
    }
    await new Promise((r) => setTimeout(r, delay));
  }

  try {
    targetWin.MagicCircle_RoomConnection?.sendMessage(payload);
    // Debug only - uncomment if troubleshooting message sending
    // productionLog('[MGTools] Sent with scopePath:', payload.scopePath);
  } catch (e) {
    console.error("[MGTools] rcSend error", e);
  }
}

/**
 * MGTools - Magic Garden Enhancement Suite
 * A comprehensive userscript for enhancing the Magic Garden gaming experience
 *
 * @version 2.6.0
 * @author Unified Script
 * @license MIT
 */

