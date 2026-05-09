/* MGTOOLS_MERGE_BLOCK_v1 */

/* 1) Ability Logs: ghost-free hard clear with tombstone and writers lifting the flag */
(function () {
  const LOG_MAIN = "MGA_petAbilityLogs";
  const LOG_ARCH = "MGA_petAbilityLogs_archive";
  const FLAG = "MGA_logs_manually_cleared";

  function gmGet(k, d = null) {
    try {
      const raw =
        typeof GM_getValue === "function" ? GM_getValue(k, null) : null;
      if (raw == null) return d;
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return d;
    }
  }
  function gmSet(k, v) {
    try {
      if (typeof GM_setValue === "function") GM_setValue(k, JSON.stringify(v));
    } catch {}
  }

  // Enforce tombstone on read paths (localStorage + GM)
  try {
    const _get = Storage.prototype.getItem;
    if (!_get.__mgtoolsPatched) {
      Storage.prototype.getItem = function (k) {
        if (
          (k === LOG_MAIN || k === LOG_ARCH) &&
          localStorage.getItem(FLAG) === "true"
        )
          return "[]";
        return _get.apply(this, arguments);
      };
      Storage.prototype.getItem.__mgtoolsPatched = true;
    }
  } catch {}

  try {
    if (typeof GM_getValue === "function" && !GM_getValue.__mgtoolsPatched) {
      const _gm = GM_getValue;
      window.GM_getValue = function (k, d) {
        if (
          (k === LOG_MAIN || k === LOG_ARCH) &&
          localStorage.getItem(FLAG) === "true"
        )
          return "[]";
        return _gm.apply(this, arguments);
      };
      window.GM_getValue.__mgtoolsPatched = true;
    }
  } catch {}

  try {
    if (typeof GM_setValue === "function" && !GM_setValue.__mgtoolsPatched) {
      const _gm = GM_setValue;
      window.GM_setValue = function (k, v) {
        if (k === LOG_MAIN) {
          try {
            const arr = Array.isArray(v)
              ? v
              : typeof v === "string"
                ? JSON.parse(v)
                : [];
            if (arr && arr.length) localStorage.removeItem(FLAG);
          } catch {}
        }
        return _gm.apply(this, arguments);
      };
      window.GM_setValue.__mgtoolsPatched = true;
    }
  } catch {}

  function hardClear() {
    try {
      localStorage.setItem(FLAG, "true");
      gmSet(LOG_MAIN, []);
      gmSet(LOG_ARCH, []);
      try {
        localStorage.removeItem(LOG_MAIN);
        localStorage.removeItem(LOG_ARCH);
      } catch {}
      if (window.UnifiedState?.data)
        window.UnifiedState.data.petAbilityLogs = [];
      if (Array.isArray(window.petAbilityLogs))
        window.petAbilityLogs.length = 0;
    } catch (e) {
      console.error("[MGTools] hardClear logs failed", e);
    }
  }
  window.MGTOOLS_hardClearAbilityLogs = hardClear;

  document.addEventListener(
    "click",
    (ev) => {
      const t =
        ev.target &&
        ev.target.closest(
          '#clear-ability-logs,[data-role="clear-ability-logs"],[data-action="clear-ability-logs"],[data-mga-clear-logs],#mga-clear-logs',
        );
      if (t) {
        hardClear();
      }
    },
    true,
  );

  // REMOVED v3.7.8: Startup sanitizer was preventing ability logs from persisting
  // The sanitizer ran for 16 seconds and cleared logs even after new abilities were added
  // Proper flag management already exists in the proxy (line 26681-26685)
})();

/* WebSocket reconnect handled by enhanced implementation above (lines 22603+) */
