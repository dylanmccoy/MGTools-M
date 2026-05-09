  /* ============================================================================
   * 8. UI FRAMEWORK MODULE - ASSET MANAGEMENT
   * ============================================================================
   * Compatibility-aware style and font loading
   */

  /**
   * Asset management system for styles, fonts, and icons
   * @namespace AssetManager
   */
  const AssetManager = {
    addStyles(css, id) {
      // Discord Fix: Prefer GM_addElement for best CSP compatibility
      // GM_addElement bypasses CSP better than regular createElement
      if (
        typeof GM_addElement === "function" &&
        CompatibilityMode.flags.enabled
      ) {
        try {
          const attrs = { textContent: css };
          if (id) attrs.id = id;
          GM_addElement("style", attrs);
          logDebug(
            "ASSETS",
            `Added styles via GM_addElement${id ? ` (${id})` : ""} (Discord-safe)`,
          );
          return;
        } catch (e) {
          logWarn(
            "ASSETS",
            "GM_addElement failed, falling back to standard method",
            e,
          );
        }
      }

      if (CompatibilityMode.flags.domOnlyStyles) {
        // Inline styles only - inject into head with style element
        const style = document.createElement("style");
        style.textContent = css;
        if (id) style.id = id;
        document.head.appendChild(style);
        logDebug("ASSETS", `Injected inline styles${id ? ` (${id})` : ""}`);
      } else {
        // Normal mode - use GM_addStyle if available
        if (typeof GM_addStyle === "function") {
          GM_addStyle(css);
        } else {
          const style = document.createElement("style");
          style.textContent = css;
          if (id) style.id = id;
          document.head.appendChild(style);
        }
        logDebug("ASSETS", `Added styles${id ? ` (${id})` : ""}`);
      }
    },

    loadFonts() {
      if (CompatibilityMode.flags.blockExternalFonts) {
        // Use system fonts only
        this.addStyles(
          `
                      .mgtools-ui *, .mga-dock *, .mga-sidebar *, .mga-panel * {
                          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
                                       Roboto, Helvetica, Arial, sans-serif !important;
                      }
                      .fancy-header, .mgtools-header {
                          font-family: Georgia, "Times New Roman", serif !important;
                          font-style: italic;
                      }
                  `,
          "mgtools-compat-fonts",
        );
        logInfo("ASSETS", "Using system fonts (compat mode)");
      } else {
        // Normal font loading - Google Fonts
        // The CSP guard at the top of the file will prevent this in Discord anyway
        logDebug("ASSETS", "External fonts allowed (normal mode)");
      }
    },

    // Icon helper - returns data URI in compat mode or emoji/text fallback
    getIcon(name) {
      // In compat mode or for simplicity, use emoji fallbacks
      const icons = {
        pet: "🐾",
        timer: "⏰",
        shop: "🛒",
        seeds: "🌱",
        values: "💎",
        abilities: "⚡",
        rooms: "🏠",
        tools: "🔧",
        settings: "⚙️",
        hotkeys: "⌨️",
        help: "❓",
        alert: "🔔",
        close: "✖️",
        refresh: "🔄",
        save: "💾",
        export: "📤",
        import: "📥",
      };
      return icons[name] || "📦";
    },
  };

  // Call font setup early
  AssetManager.loadFonts();

  // ==================== SELECTIVE CONTEXT ISOLATION ====================
  // Detect userscript environment and use unsafeWindow for page access (like v3.5.7)
  const isUserscript = typeof unsafeWindow !== "undefined";
  const targetWindow = isUserscript ? unsafeWindow : window;
  const targetDocument = targetWindow.document;

  // Track which atoms have been hooked to prevent duplicates
  const hookedAtoms = new Set();

  // Store references to hooked atoms for re-querying (CRITICAL for fresh data)
  const atomReferences = new Map(); // Maps windowKey -> {atom, atomCache, atomPath}

  // Store the Jotai store object (has get/set/sub methods for querying atoms)
  let jotaiStore = null;

  // Capture Jotai store from React fiber tree
  function captureJotaiStore() {
    if (jotaiStore) return jotaiStore;

    try {
      // Method 1: Check if store is directly exposed on window
      const directStore = targetWindow.__jotaiStore || targetWindow.jotaiStore;
      if (
        directStore &&
        typeof directStore.get === "function" &&
        typeof directStore.set === "function"
      ) {
        jotaiStore = directStore;
        productionLog(
          "✅ [STORE] Captured Jotai store from window.__jotaiStore",
        );
        return jotaiStore;
      }

      // Method 2: Try React DevTools hook (original method)
      const hook = targetWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (hook?.renderers?.size) {
        for (const [rid] of hook.renderers) {
          const roots = hook.getFiberRoots?.(rid);
          if (!roots) continue;

          for (const root of roots) {
            const seen = new Set();
            const stack = [root.current];

            while (stack.length) {
              const fiber = stack.pop();
              if (!fiber || seen.has(fiber)) continue;
              seen.add(fiber);

              // Look for Jotai Provider's store in pendingProps.value
              const value = fiber?.pendingProps?.value;
              if (
                value &&
                typeof value.get === "function" &&
                typeof value.set === "function" &&
                typeof value.sub === "function"
              ) {
                jotaiStore = value;
                productionLog(
                  "✅ [STORE] Captured Jotai store from React fiber tree",
                );
                return jotaiStore;
              }

              if (fiber.child) stack.push(fiber.child);
              if (fiber.sibling) stack.push(fiber.sibling);
              if (fiber.alternate) stack.push(fiber.alternate);
            }
          }
        }
      }

      // Method 3: Try to extract store from an atom in the cache
      const atomCache =
        targetWindow.jotaiAtomCache?.cache || targetWindow.jotaiAtomCache;
      if (atomCache && atomCache.size > 0) {
        // Try to find the store reference in any atom's metadata
        for (const [key, value] of atomCache.entries()) {
          // Some Jotai implementations store the store reference in the atom cache
          if (value?.store && typeof value.store.get === "function") {
            jotaiStore = value.store;
            productionLog(
              "✅ [STORE] Extracted Jotai store from atom cache metadata",
            );
            return jotaiStore;
          }
        }
        productionLog(
          "⏳ [STORE] Atom cache exists but store not extractable - will use direct cache reading",
        );
      }

      productionLog(
        "⏳ [STORE] Store not found - will fall back to direct atom cache reading",
      );
      return null;
    } catch (error) {
      console.error("[STORE] Error capturing Jotai store:", error);
      return null;
    }
  }

  // Get fresh value from an atom using the store
  async function getAtomValue(atomLabel) {
    try {
      // Get atom from cache by label
      const atomCache =
        targetWindow.jotaiAtomCache?.cache || targetWindow.jotaiAtomCache;
      if (!atomCache) {
        return null;
      }

      // Find atom with matching label
      let targetAtom = null;
      let atomKey = null;

      for (const [key, atom] of atomCache.entries()) {
        const label = atom?.debugLabel || atom?.label || "";
        if (label === atomLabel || label.includes(atomLabel)) {
          targetAtom = atom;
          atomKey = key;
          break;
        }
      }

      if (!targetAtom || !atomKey) {
        return null;
      }

      // PRIORITY 1: Try direct atom cache read first (Tier 1) - v3.8.7 fix
      // This works even when jotaiStore capture fails
      const atomState = atomCache.get(atomKey);
      if (atomState && "v" in atomState) {
        productionLog(
          `[STORE] ✅ Tier 1: Read '${atomLabel}' directly from atom cache`,
        );
        return atomState.v;
      }

      // PRIORITY 2: Try using jotaiStore if available (fallback)
      if (jotaiStore) {
        try {
          const value = await jotaiStore.get(targetAtom);
          productionLog(
            `[STORE] ✅ Tier 2: Read '${atomLabel}' via jotaiStore`,
          );
          return value;
        } catch (err) {
          console.warn(
            `[STORE] Tier 2 jotaiStore.get() failed for '${atomLabel}':`,
            err.message,
          );
        }
      }

      // PRIORITY 3: Try to capture store and use it (last resort)
      if (!jotaiStore) {
        jotaiStore = captureJotaiStore();
        if (jotaiStore) {
          try {
            const value = await jotaiStore.get(targetAtom);
            productionLog(
              `[STORE] ✅ Tier 3: Read '${atomLabel}' via late-captured jotaiStore`,
            );
            return value;
          } catch (err) {
            console.warn(
              `[STORE] Tier 3 late jotaiStore.get() also failed:`,
              err.message,
            );
          }
        }
      }

      console.warn(
        `[STORE] ❌ Could not read atom '${atomLabel}' - all tiers failed (cache state:`,
        atomState,
        ")",
      );
      return null;
    } catch (error) {
      console.error(`[STORE] Error getting atom '${atomLabel}':`, error);
      return null;
    }
  }

  // Set context identifier for debugging (use window not targetWindow to avoid modifying page)
  window.MGA_CONTEXT = "userscript";

  // ==================== JOTAI ATOM CACHE WATCHER ====================
  // MutationObserver fallback to detect when jotaiAtomCache becomes available
  let atomCacheWatcherCallbacks = [];

  function watchForAtomCache(callback) {
    // If already available, call immediately
    if (targetWindow.jotaiAtomCache) {
      callback();
      return;
    }

    // Otherwise, register callback
    atomCacheWatcherCallbacks.push(callback);

    // Set up observer only once
    if (atomCacheWatcherCallbacks.length === 1) {
      const observer = new MutationObserver(() => {
        if (targetWindow.jotaiAtomCache) {
          productionLog(
            "✅ [ATOM-WATCH] jotaiAtomCache detected via MutationObserver",
          );
          observer.disconnect();
          const callbacks = atomCacheWatcherCallbacks;
          atomCacheWatcherCallbacks = [];
          callbacks.forEach((cb) => cb());
        }
      });

      // Watch for property additions to targetWindow
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });

      // Also poll as backup (very infrequent)
      const pollInterval = setInterval(() => {
        if (targetWindow.jotaiAtomCache) {
          clearInterval(pollInterval);
          observer.disconnect();
          productionLog("✅ [ATOM-WATCH] jotaiAtomCache detected via polling");
          const callbacks = atomCacheWatcherCallbacks;
          atomCacheWatcherCallbacks = [];
          callbacks.forEach((cb) => cb());
        }
      }, 1000); // Check every 1 second as safety net

      // Cleanup after 30 seconds
      setTimeout(() => {
        clearInterval(pollInterval);
        observer.disconnect();
      }, 30000);
    }
  }

  // ==================== ADVANCED STORE CAPTURE SYSTEM ====================
  // Robust Jotai atom store capture for cross-environment compatibility
  const StoreCapture = {
    store: null,
    captureMethod: null,

    // Method 1: Direct cache access (fastest when available)
    tryDirectCache() {
      // Check targetWindow first (unsafeWindow = page context), then fallback to window
      const cache =
        targetWindow.jotaiAtomCache?.cache ||
        targetWindow.jotaiAtomCache ||
        window.jotaiAtomCache?.cache ||
        window.jotaiAtomCache;

      if (
        cache &&
        (cache.get || (typeof cache.size === "number" && cache.size > 0))
      ) {
        this.store = cache;
        this.captureMethod = "direct";
        return true;
      }
      return false;
    },

    // Method 2: React DevTools Fiber Traversal (for iframes)
    tryFiberTraversal() {
      const hook = targetWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (!hook?.renderers?.size) return false;

      for (const [rendererID] of hook.renderers) {
        const roots = hook.getFiberRoots?.(rendererID);
        if (!roots) continue;

        for (const root of roots) {
          const store = this.traverseFiber(root.current);
          if (store) {
            this.store = store;
            this.captureMethod = "fiber";
            return true;
          }
        }
      }
      return false;
    },

    // Traverse React Fiber tree to find Jotai store provider
    traverseFiber(fiber) {
      const visited = new Set();
      const queue = [fiber];

      while (queue.length > 0) {
        const node = queue.shift();
        if (!node || visited.has(node)) continue;
        visited.add(node);

        // Check if this fiber node contains the Jotai store
        const storeValue = node?.pendingProps?.value;
        if (
          storeValue &&
          typeof storeValue.get === "function" &&
          typeof storeValue.set === "function" &&
          typeof storeValue.sub === "function"
        ) {
          return storeValue;
        }

        // Continue traversing child, sibling, and alternate fibers
        if (node.child) queue.push(node.child);
        if (node.sibling) queue.push(node.sibling);
        if (node.alternate) queue.push(node.alternate);
      }
      return null;
    },

    // Method 3: Write-intercept fallback (patches atom write functions)
    async tryWriteIntercept(timeoutMs = 5000) {
      const cache = targetWindow.jotaiAtomCache?.cache;
      if (!cache) return false;

      let capturedStore = null;
      const patchedAtoms = [];

      // Temporarily patch atom write functions to intercept store access
      for (const atom of cache.values()) {
        if (!atom || typeof atom.write !== "function") continue;

        const originalWrite = atom.write;
        atom.__mgtools_originalWrite = originalWrite;

        atom.write = function (get, set, ...args) {
          if (!capturedStore) {
            capturedStore = { get, set, sub: () => () => {} };
            // Restore all patched atoms immediately
            for (const a of patchedAtoms) {
              if (a.__mgtools_originalWrite) {
                a.write = a.__mgtools_originalWrite;
                delete a.__mgtools_originalWrite;
              }
            }
          }
          return originalWrite.call(this, get, set, ...args);
        };

        patchedAtoms.push(atom);
      }

      // Wait for capture or timeout
      const startTime = Date.now();
      while (!capturedStore && Date.now() - startTime < timeoutMs) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      if (capturedStore) {
        this.store = capturedStore;
        this.captureMethod = "intercept";
        return true;
      }

      // Cleanup if failed
      for (const atom of patchedAtoms) {
        if (atom.__mgtools_originalWrite) {
          atom.write = atom.__mgtools_originalWrite;
          delete atom.__mgtools_originalWrite;
        }
      }
      return false;
    },

    // Main capture routine - tries all methods with retry logic
    async capture(maxRetries = 20, retryDelay = 500) {
      productionLog("🔍 [STORE] Attempting to capture Jotai store...");

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        // Try direct cache access first (fastest)
        if (this.tryDirectCache()) {
          return true;
        }

        // Try Fiber traversal (works in iframes)
        if (this.tryFiberTraversal()) {
          return true;
        }

        // Try write intercept as last resort (only on last few attempts)
        if (attempt >= maxRetries - 3) {
          if (await this.tryWriteIntercept(1000)) {
            return true;
          }
        }

        // Wait before next attempt (but not after last attempt)
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }

      console.warn(
        "⚠️ [STORE] Failed to capture store after max retries - atoms will not be available",
      );
      return false;
    },

    // Get the captured store (with fallback to direct cache check)
    getStore() {
      if (this.store) return this.store;
      // Try direct access as fallback
      if (this.tryDirectCache()) return this.store;
      return null;
    },
  };

  // StorageManager has been consolidated into the unified Storage module above
  // For legacy compatibility, create an alias
  const StorageManager = Storage;

  // ==================== API BASE URL HELPER (MUST BE EARLY) ====================
  // This function MUST be defined early because roomsInfo() IIFE needs it immediately
  // Determines correct API base URL to prevent 404 errors in Discord browser
  targetWindow.getGameApiBaseUrl = function () {
    try {
      // Check if we're in Discord browser or Discord activity
      const isDiscordHost =
        window.location.host.includes("discordsays.com") ||
        window.location.host.endsWith(".discordsays.com") ||
        window.location.host.includes("discord.com");

      const isInIframe = window.location !== window.parent.location;
      const hasDiscordNative = window.DiscordNative !== undefined;

      // If in any Discord context, use magiccircle.gg API
      // This prevents 404 errors when trying to fetch from discord.com/api/rooms/
      if (
        isDiscordHost ||
        hasDiscordNative ||
        (isInIframe &&
          document.referrer &&
          document.referrer.includes("discord"))
      ) {
        return "https://magiccircle.gg";
      }

      // Otherwise use current origin for proper same-origin requests
      return location.origin;
    } catch (err) {
      console.error("[API-BASE] Failed to determine API base URL:", err);
      // Safe fallback: use magiccircle.gg if detection fails
      return "https://magiccircle.gg";
    }
  };

  // Also define as regular function for convenience
  const getGameApiBaseUrl = targetWindow.getGameApiBaseUrl;

  // Verify function is accessible and log current API base
  productionLog("✅ [API-BASE] getGameApiBaseUrl() defined and accessible");
  try {
    productionLog(
      "🔗 [API-BASE] Current API base:",
      targetWindow.getGameApiBaseUrl(),
    );
  } catch (e) {
    console.error("❌ [API-BASE] Function exists but failed to execute:", e);
  }

  // GM API availability check with actual functionality test
  let gmApiCheckResult = null; // Cache the result
  let gmApiWarningShown = false; // Only warn once

  function isGMApiAvailable() {
    // CRITICAL: Wrap entire function in try-catch to prevent script failure on managed devices
    try {
      // Return cached result if already tested
      if (gmApiCheckResult !== null) {
        return gmApiCheckResult;
      }

      // Check if functions exist
      if (
        typeof GM_setValue === "undefined" ||
        typeof GM_getValue === "undefined"
      ) {
        gmApiCheckResult = false;
        if (!gmApiWarningShown) {
          try {
            logWarn(
              "GM-STORAGE",
              "GM API functions not defined - using localStorage fallback",
            );
          } catch (e) {
            console.warn(
              "⚠️ [GM-STORAGE] GM API not available - using localStorage fallback",
            );
          }
          gmApiWarningShown = true;
        }
        return false;
      }

      // Try to actually USE the functions (managed devices may block them)
      try {
        const testKey = "__mgtools_gm_test__";
        const testValue = "test_" + Date.now();
        GM_setValue(testKey, testValue);
        const retrieved = GM_getValue(testKey, null);

        // Clean up test
        try {
          if (typeof GM_deleteValue !== "undefined") {
            GM_deleteValue(testKey);
          }
        } catch (e) {
          // Ignore cleanup errors
        }

        // Check if it actually worked
        if (retrieved === testValue) {
          gmApiCheckResult = true;
          try {
            logInfo("GM-STORAGE", "GM API fully functional");
          } catch (e) {
            productionLog("✅ [GM-STORAGE] GM API fully functional");
          }
          return true;
        } else {
          throw new Error("GM_getValue returned incorrect value");
        }
      } catch (e) {
        gmApiCheckResult = false;
        if (!gmApiWarningShown) {
          try {
            logWarn(
              "GM-STORAGE",
              "GM API blocked by security policy - using localStorage fallback",
            );
          } catch (e2) {
            console.warn(
              "⚠️ [GM-STORAGE] GM API blocked - using localStorage fallback",
            );
          }
          gmApiWarningShown = true;
        }
        return false;
      }
    } catch (outerError) {
      // Absolute last resort - assume GM API is not available and continue
      gmApiCheckResult = false;
      gmApiWarningShown = true;
      try {
        console.warn(
          "⚠️ [GM-STORAGE] Unexpected error testing GM API - using localStorage fallback",
        );
      } catch (e) {
        // Even console might fail on heavily locked down devices
      }
      return false;
    }
  }

  // SELECTIVE CONTEXT FUNCTIONS - Use these instead of direct document/window references
  function createMGAElement(tag, className) {
    const element = targetDocument.createElement(tag);
    if (className) element.className = className;
    return element;
  }

  function attachToMGAContext(element) {
    targetDocument.body.appendChild(element);
  }

  function isMGAEvent(event) {
    try {
      return (
        event &&
        event.target &&
        event.target.closest &&
        event.target.closest(".mga-panel, .mga-toggle-btn, .mga-overlay")
      );
    } catch (error) {
      console.error("❌ [BASIC-DEBUG] Error in isMGAEvent:", error);
      return false;
    }
  }

  function checkForGameModals() {
    try {
      // Use regular document for game modal detection to avoid interference
      const modals = document.querySelectorAll(
        '[class*="modal"], [class*="dialog"], [role="dialog"]',
      );
      // CRITICAL FIX: Exclude game drag overlays that are normal game UI, not blocking modals
      const overlays = document.querySelectorAll(
        '[class*="overlay"]:not(.mga-overlay):not(.top-drag-overlay):not(.bottom-drag-overlay)',
      );
      const popups = document.querySelectorAll(
        '[class*="popup"]:not(.mga-panel)',
      );

      // More comprehensive modal detection
      const mgcModals = document.querySelectorAll(
        '[class*="MGC"], [class*="magic-circle"]',
      );
      const saveDiscardButtons = document.querySelectorAll(
        "button:not(.mga-btn)",
      );

      const totalModalElements =
        modals.length + overlays.length + popups.length + mgcModals.length;

      // Check for excluded drag overlays
      const dragOverlays = document.querySelectorAll(
        ".top-drag-overlay, .bottom-drag-overlay",
      );

      // DEBUG: Log every modal check with full details
      const modalDetails = {
        modals: modals.length,
        overlays: overlays.length,
        popups: popups.length,
        mgcElements: mgcModals.length,
        dragOverlaysExcluded: dragOverlays.length,
        total: totalModalElements,
        modalClasses: Array.from(modals).map((m) => m.className),
        overlayClasses: Array.from(overlays).map((o) => o.className),
        mgcClasses: Array.from(mgcModals).map((m) => m.className),
      };

      if (window.MGA_DEBUG) {
        window.MGA_DEBUG.logModalEvent("MODAL_CHECK_PERFORMED", modalDetails);
      }

      // Log drag overlay exclusion
      if (dragOverlays.length > 0) {
        logInfo(
          "INIT",
          `Excluding ${dragOverlays.length} game drag overlays (normal game UI, not blocking modals)`,
        );
      }

      // DISABLED: False positive detection - game naturally has modal/overlay elements
      // This was blocking initialization and causing infinite retry loops
      // eslint-disable-next-line no-constant-condition
      if (false && totalModalElements > 0) {
        logInfo(
          "INIT",
          "Game modal system active - deferring MGA interactions",
          modalDetails,
        );
        if (window.MGA_DEBUG) {
          window.MGA_DEBUG.logModalEvent("MODAL_SYSTEM_ACTIVE", modalDetails);
        }
        return false;
      }

      // SIMPLIFIED: Only block for actual modal/dialog containers, not individual buttons
      // If there are no modals/dialogs detected above, allow initialization
      logInfo(
        "INIT",
        "No blocking modals detected - MGA initialization allowed",
      );

      return true;
    } catch (error) {
      console.error("❌ [MODAL-CHECK] Error in modal detection:", error);
      if (window.MGA_DEBUG) {
        window.MGA_DEBUG.logError(error, "checkForGameModals");
      }
      return true; // Allow MGA operations if modal check fails
    }
  }

  // ==================== SCRIPT IDENTIFICATION ====================
  // DO NOT override console - causes issues in Tampermonkey sandbox

  logInfo("CONTEXT", "Script context:", window.MGA_CONTEXT);
  logInfo("CONTEXT", "GM API available:", isGMApiAvailable());
  logInfo("CONTEXT", "Injection mode: page context (@inject-into page)");
  logInfo("CONTEXT", "Selective isolation enabled - game modals preserved");

  // Add manual debug export command
  logInfo(
    "DEBUG",
    'Manual debug export: Run "MGA_DEBUG.exportDebug()" in console anytime',
  );
  logInfo("DEBUG", "Auto-export will trigger in 30s if issues are detected");

  // Verify debug system is working
  setTimeout(() => {
    if (typeof window.MGA_DEBUG === "undefined") {
      console.error(
        "❌ [DEBUG-VERIFY] MGA_DEBUG is not defined! Debug system failed to initialize",
      );
      logWarn("DEBUG", "Basic logging will continue without full debug system");
    } else {
      logInfo("DEBUG", "MGA_DEBUG is available and working");
      logDebug("DEBUG", "Available methods:", Object.keys(window.MGA_DEBUG));
    }
  }, 100);

  // Add modal system verification logging
  function logModalSystemStatus() {
    const initialModalCheck = checkForGameModals();
    logInfo("INIT", "Modal isolation verification:", {
      gameModalsActive: !initialModalCheck,
      eventIsolationActive: typeof isMGAEvent === "function",
      contextIsolationActive: typeof createMGAElement === "function",
      targetDocumentAvailable: !!targetDocument,
      regularDocumentIntact: !!document,
    });

    // Test event isolation function
    const testEvent = { target: document.body };
    const testMGAEvent = { target: { closest: () => null } };
    logDebug("INIT", "Event isolation test:", {
      gameEventBlocked: !isMGAEvent(testEvent),
      mgaEventAllowed: !isMGAEvent(testMGAEvent), // Should be false since closest returns null
    });
  }

  // Run modal system verification after a short delay
  setTimeout(logModalSystemStatus, 100);

  // ==================== COMPREHENSIVE DEBUG SYSTEM ====================

  function createDebugLogger() {
    const debugData = {
      timestamp: new Date().toISOString(),
      loadingStages: [],
      modalEvents: [],
      contextIssues: [],
      errorLogs: [],
      performanceMetrics: {
        scriptStart: performance.now(),
        domReady: null,
        gameReady: null,
        uiCreated: null,
        fullyLoaded: null,
      },
    };

    // Enhanced logging functions
    function logStage(stage, details = {}) {
      const entry = {
        timestamp: performance.now(),
        stage,
        details,
        domState: document.readyState,
        gameElements: {
          jotaiAtoms: !!(targetWindow && targetWindow.jotaiAtomCache),
          magicCircle: !!(
            targetWindow && targetWindow.MagicCircle_RoomConnection
          ),
          canvas: !!document.querySelector("canvas"),
          gameContainer: !!document.querySelector(
            "#game-container, #app, .game-wrapper, main",
          ),
        },
      };
      debugData.loadingStages.push(entry);
      logDebug("DEBUG-SYSTEM", `Stage: ${stage}`, entry);
    }

    function logModalEvent(event, details = {}) {
      const entry = {
        timestamp: performance.now(),
        event,
        details,
        gameModals: document.querySelectorAll(
          '[class*="modal"], [class*="dialog"], [role="dialog"]',
        ).length,
        mgaElements: targetDocument.querySelectorAll(
          ".mga-panel, .mga-toggle-btn",
        ).length,
      };
      debugData.modalEvents.push(entry);
      logDebug("DEBUG-SYSTEM", `Modal Event: ${event}`, entry);
    }

    function logContextIssue(issue, details = {}) {
      const entry = {
        timestamp: performance.now(),
        issue,
        details,
        context: {
          targetWindow: targetWindow === window ? "same" : "different",
          targetDocument: targetDocument === document ? "same" : "different",
          gmApiAvailable: isGMApiAvailable(),
        },
      };
      debugData.contextIssues.push(entry);
      logDebug("DEBUG-SYSTEM", `Context Issue: ${issue}`, entry);
    }

    function logError(error, context = "") {
      const entry = {
        timestamp: performance.now(),
        error: error.toString(),
        stack: error.stack,
        context,
      };
      debugData.errorLogs.push(entry);
      console.error(`🐛 [DEBUG-ERROR] ${context}:`, entry);
    }

    // Store debug functions globally
    window.MGA_DEBUG = {
      logStage,
      logModalEvent,
      logContextIssue,
      logError,
      getData: () => debugData,
      exportDebug: () => {
        logInfo(
          "DEBUG-SYSTEM",
          "Complete debug data:",
          JSON.stringify(debugData, null, 2),
        );
        return debugData;
      },
    };

    logStage("DEBUG_SYSTEM_INITIALIZED", {
      userAgent: navigator.userAgent,
      url: window.location.href,
      contextDetection: { targetWindow: targetWindow.constructor.name },
    });

    return window.MGA_DEBUG;
  }

  // Initialize debug system immediately with error handling
  let DEBUG;
  try {
    DEBUG = createDebugLogger();
    logInfo("DEBUG-SYSTEM", "Debug system initialized successfully");
  } catch (error) {
    logError("DEBUG-SYSTEM", "Failed to initialize debug system:", error);
    // Create a minimal debug fallback
    window.MGA_DEBUG = {
      logStage: (stage, details) =>
        logDebug("DEBUG-SYSTEM", `Stage: ${stage}`, details),
      logModalEvent: (event, details) =>
        logDebug("DEBUG-SYSTEM", `Modal Event: ${event}`, details),
      logContextIssue: (issue, details) =>
        logDebug("DEBUG-SYSTEM", `Context Issue: ${issue}`, details),
      logError: (error, context) =>
        logError("DEBUG-SYSTEM", `Error in ${context}:`, error),
      getData: () => ({
        error: "Debug system failed to initialize",
        fallback: true,
      }),
      exportDebug: () =>
        logWarn("DEBUG-SYSTEM", "Debug system failed to initialize properly"),
    };
    DEBUG = window.MGA_DEBUG;
  }

  // Add global error handler for comprehensive error logging
  window.addEventListener("error", (event) => {
    if (window.MGA_DEBUG) {
      window.MGA_DEBUG.logError(
        event.error || new Error(event.message),
        "GLOBAL_ERROR_HANDLER",
      );
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (window.MGA_DEBUG) {
      window.MGA_DEBUG.logError(
        event.reason || new Error("Unhandled Promise Rejection"),
        "UNHANDLED_REJECTION",
      );
    }
  });

  // Auto-export debug data after 30 seconds if issues detected
  setTimeout(() => {
    if (window.MGA_DEBUG) {
      const debugData = window.MGA_DEBUG.getData();
      const hasErrors = debugData.errorLogs.length > 0;
      const hasModalIssues = debugData.modalEvents.some(
        (e) => e.event === "MODAL_SYSTEM_ACTIVE",
      );
      const uiNotCreated = !debugData.loadingStages.some(
        (s) => s.stage === "CREATE_UI_COMPLETED",
      );

      if (hasErrors || hasModalIssues || uiNotCreated) {
        productionLog(
          "🚨 [AUTO-DEBUG] Issues detected - exporting debug data...",
        );
        window.MGA_DEBUG.exportDebug();
        productionLog(
          "📋 [AUTO-DEBUG] Copy the debug data above and paste it into mgdebug.txt",
        );
      } else {
        productionLog("✅ [AUTO-DEBUG] No issues detected in first 30 seconds");
      }
    }
  }, 30000);

  // ==================== CRITICAL EXECUTION CHECKPOINT ====================
  productionLog(
    "🔍🔍🔍 [EXECUTION] Reached line 951 - About to define initialization",
  );
  productionLog("🔍 typeof document:", typeof document);
  productionLog("🔍 typeof window:", typeof window);
  productionLog("🔍 document.readyState:", document?.readyState);

  // ==================== PROPER PAGE LOAD DETECTION ====================
  // Fix for document-idle timing issues - wait for complete page load
  let initializationStarted = false;

  function initializeWhenReady() {
    productionLog("🔍🔍🔍 [EXECUTION] initializeWhenReady() called!");
    productionLog(
      `🔍 [EXECUTION] initializationStarted = ${initializationStarted}`,
    );
    if (initializationStarted) {
      productionLog("🔍 [EXECUTION] Already initialized, returning early");
      return;
    }
    initializationStarted = true;
    productionLog("🔍 [EXECUTION] Set initializationStarted = true");

    productionLog("🚀 Magic Garden Unified Assistant v3.5.2 - Discord Fix");
    productionLog("🔧 CRITICAL: Disabled data-destroying migration system");
    productionLog("🔧 Fixed: Now uses localStorage directly (100% reliable)");
    productionLog("🔧 Fixed: Active pets detection with retry logic");
    productionLog("✅ Seeds + Pet Presets will now SAVE and LOAD correctly!");
    productionLog("🔧 [TIMING] Page load state:", document.readyState);
    productionLog(
      "🔧 [BASIC-DEBUG] Script execution started at:",
      new Date().toISOString(),
    );
    productionLog("🔧 [BASIC-DEBUG] Location:", window.location.href);
    productionLog("🔧 [BASIC-DEBUG] User Agent:", navigator.userAgent);

    // Proceed with initialization
    productionLog("🔍 [EXECUTION] About to call startMGAInitialization()");
    startMGAInitialization();
    productionLog("🔍 [EXECUTION] startMGAInitialization() returned");
  }

  // CRITICAL FIX: Handle all readyState possibilities for Tampermonkey compatibility
  // document-idle means readyState is 'interactive' - not 'loading' or 'complete'

  productionLog(
    "🔍🔍🔍 [EXECUTION] Reached line 982 - INITIALIZATION BLOCK START",
  );
  productionLog("🔍 About to call productionLog for readyState...");

  try {
    productionLog("🔧 [INIT] Initial readyState:", document.readyState);
  } catch (e) {
    console.error("❌ [EXECUTION] productionLog FAILED:", e);
  }

  // Detect Discord environment for special handling
  const isDiscordEnv =
    window.location.host.includes("discordsays.com") ||
    window.location.host.includes("discord.com") ||
    typeof window.DiscordNative !== "undefined" ||
    typeof window.__DISCORD__ !== "undefined";

  if (isDiscordEnv) {
    productionLog(
      "🎮 [DISCORD] Discord environment detected, using specialized initialization",
    );
  }

  // Discord Fix: Use shorter delay for Discord, check for canvas existence
  const initDelay = isDiscordEnv ? 500 : 3000;

  // Helper function to check if game canvas is ready
  function isGameCanvasReady() {
    const canvas = document.querySelector("canvas");
    const gameContainer = document.querySelector(
      "#game-container, #app, .game-wrapper, main, body",
    );
    const ready = canvas && gameContainer;
    if (!ready && isDiscordEnv) {
      productionLog("⏳ [DISCORD] Waiting for game canvas...");
    }
    return ready;
  }

  // Discord Fix: Wait for canvas with retry mechanism
  function initWithCanvasCheck(attempt = 0) {
    productionLog(
      `🔍 [EXECUTION] initWithCanvasCheck called, attempt=${attempt}`,
    );
    if (isGameCanvasReady()) {
      productionLog(
        "🔍 [EXECUTION] Canvas ready! Calling initializeWhenReady()",
      );
      productionLog("✅ [INIT] Game canvas detected, initializing MGTools");
      initializeWhenReady();
    } else if (attempt < 20) {
      // Retry up to 20 times (10 seconds) for Discord
      productionLog(
        `🔍 [EXECUTION] Canvas not ready, scheduling retry ${attempt + 1}/20`,
      );
      productionLog(`🔄 [INIT] Canvas not ready, retry ${attempt + 1}/20`);
      setTimeout(() => initWithCanvasCheck(attempt + 1), 500);
    } else {
      productionLog(
        "🔍 [EXECUTION] Max retries reached, calling initializeWhenReady() anyway",
      );
      productionLog(
        "⚠️ [INIT] Canvas not detected after 10s, initializing anyway",
      );
      initializeWhenReady();
    }
  }

  productionLog("🔍 [EXECUTION] About to check document.readyState...");

  try {
    if (document.readyState === "complete") {
      // Page is already fully loaded
      productionLog("🔍 [EXECUTION] readyState is complete");
      productionLog(
        `🔍 [EXECUTION] isDiscordEnv = ${isDiscordEnv}, initDelay = ${initDelay}ms`,
      );
      productionLog(
        `🔧 [INIT] Page already complete, initializing in ${initDelay}ms`,
      );
      productionLog(
        `🔍 [EXECUTION] About to schedule setTimeout for ${initDelay}ms`,
      );
      setTimeout(() => {
        productionLog(
          "🔍🔍🔍 [EXECUTION] setTimeout FIRED! About to call init function...",
        );
        if (isDiscordEnv) {
          productionLog("🔍 [EXECUTION] Calling initWithCanvasCheck()");
          initWithCanvasCheck();
        } else {
          productionLog("🔍 [EXECUTION] Calling initializeWhenReady()");
          initializeWhenReady();
        }
      }, initDelay);
    } else if (document.readyState === "interactive") {
      productionLog("🔍 [EXECUTION] readyState is interactive");
      // DOM is ready but resources still loading (document-idle state)
      productionLog(
        `🔧 [INIT] DOM interactive (document-idle), initializing in ${initDelay}ms...`,
      );
      setTimeout(() => {
        if (isDiscordEnv) {
          initWithCanvasCheck();
        } else {
          initializeWhenReady();
        }
      }, initDelay);
    } else {
      // readyState is 'loading' - wait for full page load
      productionLog("🔧 [INIT] DOM still loading, waiting for load event...");

      // Discord Fix: Use DOMContentLoaded for Discord like other scripts do
      if (isDiscordEnv) {
        document.addEventListener("DOMContentLoaded", () => {
          productionLog("✅ [DISCORD] DOM ready, checking for canvas...");
          setTimeout(() => initWithCanvasCheck(), initDelay);
        });
      } else {
        window.addEventListener("load", initializeWhenReady);

        // Backup: also listen for DOMContentLoaded
        document.addEventListener("DOMContentLoaded", () => {
          productionLog("🔧 [TIMING] DOM ready, waiting for complete load...");
        });
      }
    }
  } catch (initError) {
    console.error(
      "❌❌❌ [EXECUTION] CRITICAL ERROR in initialization block:",
      initError,
    );
    console.error("Stack:", initError.stack);
    // Try to initialize anyway as fallback
    productionLog("🔄 [EXECUTION] Attempting fallback initialization in 1s...");
    setTimeout(() => {
      try {
        initializeWhenReady();
      } catch (e2) {
        console.error("❌ [EXECUTION] Fallback also failed:", e2);
      }
    }, 1000);
  }

  productionLog(
    "✅ [EXECUTION] Initialization block completed without throwing",
  );

  async function startMGAInitialization() {
    productionLog(
      "🔍🔍🔍🔍🔍 [EXECUTION] ENTERED startMGAInitialization() function!",
    );
    productionLog("🔍 [EXECUTION] document.readyState:", document.readyState);
    productionLog(
      "🚀 [TIMING] Starting MGA initialization with readyState:",
      document.readyState,
    );
    productionLog("🔍 [EXECUTION] productionLog completed, continuing...");

    // ==================== PROACTIVE STORAGE CLEANUP ====================
    // CRITICAL: Clean up large debug/console storage items BEFORE MGTools tries to save anything
    // This prevents quota errors on managed devices with monitoring software
    (function cleanupStorageBeforeInit() {
      try {
        const debugKeys = [
          "console-history",
          "mga-debug-cache",
          "mga-temp-cache",
          "console-insights-onboarding-finished",
          "experiments",
          "settles",
          "getItem",
          "removeItem",
          "key",
          "localInspectorVersion",
        ];

        let cleaned = 0;
        let freedBytes = 0;

        for (const key of debugKeys) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              const size = value.length;
              // Remove any item over 100KB or any console-history regardless of size
              if (size > 100000 || key.includes("console")) {
                localStorage.removeItem(key);
                cleaned++;
                freedBytes += size;
                logInfo(
                  "STORAGE-CLEANUP",
                  `Removed ${key} (${(size / 1024).toFixed(1)}KB)`,
                );
              }
            }
          } catch (e) {
            // Ignore errors for individual keys
          }
        }

        if (cleaned > 0) {
          logInfo(
            "STORAGE-CLEANUP",
            `Freed ${(freedBytes / 1024).toFixed(1)}KB by removing ${cleaned} debug items`,
          );
        }
      } catch (e) {
        logWarn(
          "STORAGE-CLEANUP",
          "Could not clean storage, continuing anyway",
          e,
        );
      }
    })();

    // Detect other Magic Garden scripts
    setTimeout(() => {
      const hasMainScript =
        typeof window.loadJSON === "function" ||
        typeof window.petAbilityLogs !== "undefined" ||
        document.hidden === false;
      if (hasMainScript) {
        productionLog(
          "📝 [COMPAT] Detected external scripts - compatibility mode enabled",
        );
      } else {
        productionLog(
          "📝 [COMPAT] No other Magic Garden scripts detected - running standalone",
        );
      }
    }, 100);

    // ==================== IMMEDIATE IDLE PREVENTION ====================
    // CRITICAL: Apply idle prevention immediately before any game code runs
    (function () {
      productionLog(
        "🚫 [IDLE-PREVENTION] Applying immediate anti-idle protection...",
      );

      // Override document properties to prevent idle detection
      try {
        Object.defineProperty(document, "hidden", {
          value: false,
          writable: false,
          configurable: false,
        });
        Object.defineProperty(document, "visibilityState", {
          value: "visible",
          writable: false,
          configurable: false,
        });
        productionLog("✅ [IDLE-PREVENTION] Document properties overridden");
      } catch (e) {
        productionWarn(
          "⚠️ [IDLE-PREVENTION] Could not override document properties:",
          e,
        );
      }

      // Block idle detection events with capture phase (highest priority)
      document.addEventListener(
        "visibilitychange",
        (e) => {
          e.stopImmediatePropagation();
          e.preventDefault();
        },
        true,
      );

      window.addEventListener(
        "blur",
        (e) => {
          e.stopImmediatePropagation();
          e.preventDefault();
        },
        true,
      );

      window.addEventListener(
        "focus",
        (e) => {
          e.stopImmediatePropagation();
          e.preventDefault();
        },
        true,
      );

      productionLog(
        "✅ [IDLE-PREVENTION] Event listeners added with capture phase",
      );
    })();

    // ==================== INITIALIZATION ====================
    /* CHECKPOINT removed: INITIALIZATION_START */

    // ==================== GLOBAL STYLES ====================
    // Skip Google Fonts on Discord to avoid CSP violations
    const isDiscordPage =
      window.location.hostname.includes("discord.com") ||
      window.location.hostname.includes("discordsays.com") ||
      typeof window.DiscordNative !== "undefined" ||
      typeof window.__DISCORD__ !== "undefined";

    // Use empty string for Discord (system fonts only), otherwise no Google Fonts CDN
    // We never use external CDN to avoid CSP issues entirely
    const googleFontsImport = "";

    const UNIFIED_STYLES = `
          ${googleFontsImport}

          /* ==================== HYBRID DOCK STYLES ==================== */
          #mgh-dock {
              font-family: 'Inter', sans-serif;
              position: fixed;
              display: flex;
              gap: 6px;
              background: rgba(0, 0, 0, 0.65) !important;
              border: 0px !important;
              backdrop-filter: blur(4px);
              padding: 8px 12px;
              z-index: 999999;
              /* No transition for instant drag response */
          }

          #mgh-dock.horizontal {
              bottom: 16px;
              left: 50%;
              transform: translateX(-50%);
              flex-direction: row;
              border-radius: 16px;
          }

          #mgh-dock.vertical {
              left: 16px;
              top: 20px;
              transform: none;
              flex-direction: column;
              border-radius: 16px;
              max-height: calc(100vh - 40px);
              overflow-y: auto;
              overflow: visible !important;
          }

          /* Custom scrollbar for vertical dock */
          #mgh-dock.vertical::-webkit-scrollbar {
              width: 4px;
          }

          #mgh-dock.vertical::-webkit-scrollbar-track {
              background: transparent;
          }

          #mgh-dock.vertical::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.2);
              border-radius: 2px;
          }

          #mgh-dock.vertical::-webkit-scrollbar-thumb:hover {
              background: rgba(255, 255, 255, 0.3);
          }

          /* Scroll indicators - gradient shadows at top/bottom when scrollable */
          #mgh-dock.vertical::before,
          #mgh-dock.vertical::after {
              content: '';
              position: sticky;
              display: block;
              left: 0;
              right: 0;
              height: 20px;
              pointer-events: none;
              z-index: 10;
          }

          #mgh-dock.vertical::before {
              top: 0;
              margin-bottom: -20px;
          }

          #mgh-dock.vertical::after {
              bottom: 0;
              margin-top: -20px;
          }

          .mgh-dock-item {
              width: 44px;
              height: 44px;
              background-color: rgba(0, 0, 0, 0.30) !important;
              border-radius: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 18px;
              cursor: pointer;
              transition: all 0.3s ease;
              position: relative;
          }

          .mgh-dock-item:hover {
              background: rgba(255, 255, 255, 0.15);
              transform: scale(1.1);
          }

          .mgh-dock-item.active {
              background: rgba(102, 126, 234, 0.3);
              border-color: #667eea;
          }

          .mgh-dock-item.flip-toggle {
              background: rgba(255, 255, 255, 0.08);
              font-size: 14px;
          }

          .mgh-dock-item.flip-toggle:hover {
              background: rgba(255, 255, 255, 0.12);
          }

          /* Optimized sizes for vertical mode */
          #mgh-dock.vertical .mgh-dock-item {
              width: 44px;
              height: 44px;
              padding: 2px;
          }

          #mgh-dock.vertical .mgh-dock-item img {

          }

          #mgh-dock.vertical .mgh-dock-item {
              font-size: 20px;
          }

          /* ==================== DOCK SIZE VARIANTS ==================== */
          /* Micro size (0.50x scale - smallest) */
          #mgh-dock.dock-size-micro.horizontal .mgh-dock-item {
              width: 22px;
              height: 22px;
              font-size: 10px;
          }

          #mgh-dock.dock-size-micro.vertical .mgh-dock-item {
              width: 20px;
              height: 20px;
              font-size: 11px;
          }

          #mgh-dock.dock-size-micro .mgh-dock-item img {
              width: 12px;
              height: 12px;
          }

          /* Mini size (0.61x scale) */
          #mgh-dock.dock-size-mini.horizontal .mgh-dock-item {
              width: 27px;
              height: 27px;
              font-size: 12px;
          }

          #mgh-dock.dock-size-mini.vertical .mgh-dock-item {
              width: 25px;
              height: 25px;
              font-size: 13px;
          }

          #mgh-dock.dock-size-mini .mgh-dock-item img {
              width: 15px;
              height: 15px;
          }

          /* Tiny size (0.73x scale) */
          #mgh-dock.dock-size-tiny.horizontal .mgh-dock-item {
              width: 32px;
              height: 32px;
              font-size: 14px;
          }

          #mgh-dock.dock-size-tiny.vertical .mgh-dock-item {
              width: 30px;
              height: 30px;
              font-size: 15px;
          }

          #mgh-dock.dock-size-tiny .mgh-dock-item img {
              width: 18px;
              height: 18px;
          }

          /* Small size (0.86x scale) */
          #mgh-dock.dock-size-small.horizontal .mgh-dock-item {
              width: 38px;
              height: 38px;
              font-size: 16px;
          }

          #mgh-dock.dock-size-small.vertical .mgh-dock-item {
              width: 36px;
              height: 36px;
              font-size: 17px;
          }

          #mgh-dock.dock-size-small .mgh-dock-item img {
              width: 21px;
              height: 21px;
          }

          /* Medium size (1.0x scale - default, already defined above) */
          /* No additional CSS needed - uses base .mgh-dock-item styles */

          /* Large size (1.18x scale) */
          #mgh-dock.dock-size-large.horizontal .mgh-dock-item {
              width: 52px;
              height: 52px;
              font-size: 22px;
          }

          #mgh-dock.dock-size-large.vertical .mgh-dock-item {
              width: 48px;
              height: 48px;
              font-size: 24px;
          }

          #mgh-dock.dock-size-large .mgh-dock-item img {
              width: 28px;
              height: 28px;
          }

          .mgh-tooltip {
              position: absolute;
              background: rgba(10, 10, 10, 0.95);
              padding: 6px 10px;
              border-radius: 6px;
              font-size: 11px;
              color: white;
              white-space: nowrap;
              opacity: 0;
              pointer-events: none;
              transition: opacity 0.2s;
              border: 1px solid rgba(255, 255, 255, 0.57);
              z-index: 10;
          }

          #mgh-dock.horizontal .mgh-tooltip {
              bottom: 56px;
              left: 50%;
              transform: translateX(-50%);
          }

          #mgh-dock.vertical .mgh-tooltip {
              left: 56px;
              top: 50%;
              transform: translateY(-50%);
          }

          .mgh-dock-item:hover .mgh-tooltip { opacity: 1; }

          .mgh-tail-group {
              display: flex;
              gap: 6px;
              transition: opacity 0.3s ease;
          }

          #mgh-dock.horizontal .mgh-tail-group {
              flex-direction: row;
          }

          #mgh-dock.vertical .mgh-tail-group {
              flex-direction: column;
          }

          /* ==================== SIDEBAR STYLES ==================== */
          #mgh-sidebar {
              font-family: 'Inter', sans-serif;
              position: fixed;
              left: -420px;
              top: 0;
              width: 400px;
              height: 100vh;
              background: rgba(10, 10, 10, 0.95);
              backdrop-filter: blur(20px);
              border-right: 1px solid rgba(255, 255, 255, 0.15);
              z-index: 999998;
              transition: left 0.3s ease;
              display: flex;
              flex-direction: column;
              box-shadow: 4px 0 24px rgba(0, 0, 0, 0.6);
          }

          #mgh-sidebar.open { left: 0; }

          /* ==================== SHOP SIDEBAR STYLES ==================== */
          .mga-shop-sidebar {
              font-family: 'Inter', sans-serif;
              position: fixed;
              top: 0;
              width: 380px;
              height: 100vh;
              background: rgba(10, 10, 10, 0.95);
              backdrop-filter: blur(20px);
              border: 1px solid rgba(255, 255, 255, 0.15);
              z-index: 999998;
              transition: left 0.3s ease, right 0.3s ease;
              display: flex;
              flex-direction: column;
              box-shadow: 0 0 24px rgba(0, 0, 0, 0.6);
          }

          .mga-shop-sidebar-left {
              left: -400px;
              border-right: 1px solid rgba(255, 255, 255, 0.15);
          }

          .mga-shop-sidebar-left.open {
              left: 0;
          }

          .mga-shop-sidebar-right {
              right: -400px;
              border-left: 1px solid rgba(255, 255, 255, 0.15);
          }

          .mga-shop-sidebar-right.open {
              right: 0;
          }

          .mga-shop-sidebar-header {
              padding: 20px;
              border-bottom: 1px solid rgba(255, 255, 255, 0.57);
              display: flex;
              justify-content: space-between;
              align-items: center;
              background: rgba(20, 20, 20, 0.5);
          }

          .mgh-sidebar-header {
              padding: 20px;
              border-bottom: 1px solid rgba(255, 255, 255, 0.57);
              display: flex;
              justify-content: space-between;
              align-items: center;
          }

          .mgh-sidebar-title {
              font-size: 16px;
              font-weight: 600;
              color: white;
          }

          .mgh-sidebar-close {
              width: 32px;
              height: 32px;
              background: transparent;
              border: 1px solid rgba(255, 255, 255, 0.73);
              border-radius: 8px;
              color: rgba(255, 255, 255, 0.7);
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 18px;
              transition: all 0.2s;
          }

          .mgh-sidebar-close:hover {
              background: rgba(255, 255, 255, 0.57);
              color: white;
          }

          .mgh-sidebar-body {
              flex: 1;
              padding: 20px;
              overflow-y: auto;
              color: white;
          }

          .mgh-sidebar-body::-webkit-scrollbar { width: 6px; }
          .mgh-sidebar-body::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.73);
              border-radius: 3px;
          }

          /* ==================== PRESERVE ORIGINAL MGA STYLES ==================== */
          .mga-btn {
              background: rgba(255, 255, 255, 0.57);
              border: 1px solid rgba(255, 255, 255, 0.73);
              color: #ffffff;
              padding: 6px 12px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 13px;
              transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
              outline: none !important;
          }

          .mga-btn:hover {
              background: rgba(255, 255, 255, 0.2);
              border-color: rgba(74, 158, 255, 0.6);
              box-shadow: 0 0 12px rgba(74, 158, 255, 0.4);
          }

          .mga-input, .mga-select {
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.2);
              color: #ffffff;
              padding: 6px 12px;
              border-radius: 6px;
              font-size: 13px;
              font-family: inherit;
          }

          .mga-input:focus, .mga-select:focus {
              outline: none;
              border-color: rgba(102, 126, 234, 0.5);
              background: rgba(255, 255, 255, 0.08);
          }

          .mga-select option {
              background: rgba(20, 20, 20, 0.95);
              color: #ffffff;
              padding: 8px;
          }

          .mga-select option:hover {
              background: rgba(74, 158, 255, 0.3);
          }

          .mga-select optgroup {
              background: rgba(0, 0, 0, 0.5);
              color: #4a9eff;
              font-weight: bold;
              font-size: 11px;
              padding: 6px;
              border-top: 1px solid rgba(255, 255, 255, 0.57);
          }

          /* Shop item name colors */
          .shop-color-white { color: #ffffff !important; }
          .shop-color-green { color: #2afd23ff !important; }
          .shop-color-blue { color: #0084ffff !important; }
          .shop-color-yellow { color: #fced19ff !important; }
          .shop-color-purple { color: #774cb3 !important; }
          .shop-color-orange { color: #ff7300ff !important; }

          /* Rainbow text for celestial items */
          .shop-rainbow-text {
              background: linear-gradient(90deg,
                  #ff0000, #ff7b00, #ffd800, #3cff2a, #00b5ff, #774cb3, #ff2ab7, #ff0000);
              background-size: 200% 100%;
              background-repeat: repeat;
              -webkit-background-clip: text;
              background-clip: text;
              color: transparent !important;
              animation: shopRainbowShift 3s linear infinite;
              font-weight: 700;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
          }

          @keyframes shopRainbowShift {
              0%   { background-position: 0% 50%; }
              100% { background-position: 200% 50%; }
          }

          /* ========== TEXTURE ANIMATIONS ========== */
          @keyframes textureSlowDrift {
              0%   { background-position: 0px 0px, 0 0; }
              100% { background-position: 200px 200px, 0 0; }
          }

          @keyframes hologramScan {
              0%   { background-position: 0 0, 0 0; }
              100% { background-position: 0 100%, 0 0; }
          }

          @keyframes energyPulse {
              0%   { background-position: 0% 0%, 0% 0%, 0% 0%, 0 0; }
              50%  { background-position: 100% 0%, 100% 100%, 0% 100%, 0 0; }
              100% { background-position: 0% 0%, 0% 0%, 0% 0%, 0 0; }
          }

          .mga-texture-animated {
              animation: textureSlowDrift 60s linear infinite;
          }

          /* Shop sprite sizing */
          .shop-sprite {
              width: 28px;
              height: 28px;
              border-radius: 6px;
              object-fit: contain;
              flex-shrink: 0;
              background: rgba(255, 255, 255, 0.02);
              transition: transform 0.12s ease, box-shadow 0.12s ease;
          }

          .shop-item.in-stock .shop-sprite {
              transform: scale(1.04);
              box-shadow: 0 4px 10px rgba(0, 255, 42, 0.07);
          }

          /* Original overlay styles preserved */
          .mga-overlay {
              position: fixed;
              background: rgba(17, 24, 39, 0.95);
              border: 1px solid rgba(255, 255, 255, 0.57);
              border-radius: 12px;
              padding: 20px;
              color: #ffffff;
              z-index: 10001;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }

          /* Popout widget styles */
          .mgh-popout {
              font-family: 'Inter', sans-serif;
              position: fixed;
              background: rgba(10, 10, 10, 0.95);
              backdrop-filter: blur(20px);
              border: 1px solid rgba(255, 255, 255, 0.15);
              border-radius: 12px;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
              z-index: 1000000;
              min-width: 320px;
              width: 400px; /* Default width, resizable */
              height: 400px; /* Default height, resizable */
              display: flex;
              flex-direction: column;
              /* No transition for instant drag response */
          }

          .mgh-popout-header {
              padding: 12px 16px;
              border-bottom: 1px solid rgba(255, 255, 255, 0.57);
              display: flex;
              align-items: center;
              justify-content: space-between;
              cursor: grab;
              user-select: none;
              background: rgba(20, 20, 20, 0.5);
              flex-shrink: 0;
          }

          .mgh-popout-header:active {
              cursor: grabbing;
          }

          .mgh-popout-body {
              padding: 16px;
              color: white;
              flex: 1;
              min-height: 0;
              overflow-y: auto;
          }

          /* ==================== PET MANAGEMENT STYLES ==================== */
          .mga-section {
              margin-bottom: 20px;
          }

          .mga-section-title {
              font-size: 14px;
              font-weight: 600;
              color: rgba(255, 255, 255, 0.9);
              margin-bottom: 12px;
              padding-bottom: 8px;
              border-bottom: 1px solid rgba(255, 255, 255, 0.57);
          }

          .mga-pet-section-title {
              background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
          }

          /* Active Pets Display */
          .mga-active-pets-display {
              background: rgba(255, 255, 255, 0.03);
              border: 1px solid rgba(255, 255, 255, 0.57);
              border-radius: 8px;
              padding: 12px;
              margin-bottom: 12px;
          }

          .mga-active-pets-header {
              color: #93c5fd;
              font-size: 12px;
              margin-bottom: 8px;
              font-weight: 500;
          }

          .mga-active-pets-list {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
          }

          .mga-pet-slot {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 4px;
          }

          .mga-pet-badge {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 6px 12px;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 600;
              white-space: nowrap;
              box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
              transition: all 0.2s ease;
          }

          .mga-pet-badge:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }

          .mga-hunger-timer {
              font-size: 11px;
              font-weight: 600;
              padding: 2px 6px;
              border-radius: 4px;
              background: rgba(0, 0, 0, 0.48);
          }

          /* Pet Presets */
          .mga-presets-container {
              display: flex;
              flex-direction: column;
              gap: 8px;
          }

          .mga-preset {
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.57);
              border-radius: 8px;
              padding: 12px;
              transition: all 0.2s ease;
          }

          .mga-preset-clickable {
              cursor: pointer;
          }

          .mga-preset-clickable:hover {
              background: rgba(255, 255, 255, 0.55);
              border-color: #667eea;
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.48);
          }

          .mga-preset-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;
          }

          .mga-preset-name {
              font-size: 13px;
              font-weight: 600;
              color: #93c5fd;
          }

          .mga-preset-pets {
              font-size: 12px;
              color: rgba(255, 255, 255, 0.7);
              line-height: 1.5;
          }

          /* Empty State */
          .mga-empty-state {
              text-align: center;
              padding: 24px;
              color: rgba(255, 255, 255, 0.5);
          }

          .mga-empty-state-icon {
              font-size: 32px;
              margin-bottom: 8px;
              opacity: 0.5;
          }

          .mga-empty-state-title {
              font-size: 14px;
              font-weight: 600;
              color: rgba(255, 255, 255, 0.7);
              margin-bottom: 6px;
          }

          .mga-empty-state-description {
              font-size: 12px;
              color: rgba(255, 255, 255, 0.5);
              line-height: 1.5;
          }

          /* Scrollable containers */
          .mga-scrollable {
              overflow-y: auto;
          }

          .mga-scrollable::-webkit-scrollbar {
              width: 6px;
          }

          .mga-scrollable::-webkit-scrollbar-track {
              background: rgba(255, 255, 255, 0.05);
              border-radius: 3px;
          }

          .mga-scrollable::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.73);
              border-radius: 3px;
          }

          .mga-scrollable::-webkit-scrollbar-thumb:hover {
              background: rgba(255, 255, 255, 0.3);
          }
      `;

    /* CHECKPOINT removed: GLOBAL_STYLES_COMPLETE */

    // ==================== DEBUG SYSTEM ====================

    // Debug system has been consolidated into the Logger module
    // Reference CONFIG.DEBUG.FLAGS for debug settings
    // Use debugLog() and debugError() functions from Logger module
    const DEBUG_FLAGS = CONFIG.DEBUG.FLAGS;

    /* CHECKPOINT removed: DEBUG_SYSTEM_COMPLETE */

    // ==================== RESPONSIVE TEXT SCALING ====================
    // Efficient, smooth text scaling using transform instead of recalculating fonts
    function applyResponsiveTextScaling(overlay, width, height) {
      try {
        const baseWidth = 400;
        const baseHeight = 300;

        const widthScale = width / baseWidth;
        const heightScale = height / baseHeight;
        const scale = Math.min(widthScale, heightScale);

        // Clamp to reasonable values
        const clampedScale = Math.max(0.7, Math.min(1.3, scale));

        // Apply smooth GPU scaling to the overlay’s inner content
        const content = overlay.querySelector(".mga-content");
        if (content) {
          content.style.transformOrigin = "top left";
          content.style.transform = `scale(${clampedScale})`;
        }
      } catch (error) {
        debugError(
          "OVERLAY_LIFECYCLE",
          "Failed to apply transform-based scaling",
          error,
          {
            overlayId: overlay.id,
            width,
            height,
          },
        );
      }
    }

    // ==================== UNIFIED STATE ====================
    // Global initialization mutex to prevent double initialization
    // Clear any stale flags from previous page load (refresh fix)
    // On normal refresh, these flags shouldn't persist, but Tampermonkey timing can cause race conditions
    const now = Date.now();
    const flagTimestamp = window._MGA_TIMESTAMP || 0;
    const flagAge = now - flagTimestamp;

    // If flags are older than 5 seconds, they're stale from a previous load
    if (flagAge > 5000) {
      productionLog("🔄 Detected stale initialization flags, clearing...");
      try {
        delete window._MGA_INITIALIZING;
      } catch (e) {
        window._MGA_INITIALIZING = undefined;
      }
      try {
        delete window._MGA_INITIALIZED;
      } catch (e) {
        window._MGA_INITIALIZED = undefined;
      }
      try {
        delete window._MGA_TIMESTAMP;
      } catch (e) {
        window._MGA_TIMESTAMP = undefined;
      }
    }

    const forceInit =
      targetWindow.location.search.includes("force=true") ||
      window._MGA_FORCE_INIT;

    if ((window._MGA_INITIALIZING || window._MGA_INITIALIZED) && !forceInit) {
      productionLog(
        "🔒 MGA already initializing or initialized, stopping duplicate execution",
      );
      productionLog(
        "💡 Use ?force=true in URL or MGA.forceInit() to re-initialize",
      );
      return;
    }

    // Clear flags if forcing re-initialization
    if (forceInit) {
      productionLog(
        "🔄 Force initialization requested - clearing existing flags",
      );
      window._MGA_INITIALIZED = false;
      window._MGA_FORCE_INIT = false;
    }

    // Set flags with timestamp
    window._MGA_INITIALIZING = true;
    window._MGA_TIMESTAMP = now;

    // ==================== DEFERRED CONFLICT DETECTION ====================
    // Conflict detection moved to after game initialization to prevent loading stalls

    // Legacy compatibility - reference CONFIG.DECOR_ITEMS
    const DECOR_ITEMS = CONFIG.DECOR_ITEMS;

