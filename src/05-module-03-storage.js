
(function () {
  "use strict";

  /* ============================================================================
   * 3. STORAGE MODULE - START
   * ============================================================================
   * Unified storage abstraction with multiple fallback mechanisms
   */

  /**
   * Unified Storage Module
   * Provides consistent storage API with automatic fallback chain:
   * GM Storage → localStorage → sessionStorage → memory
   *
   * @namespace Storage
   */
  const Storage = (() => {
    // Private state
    let initialized = false;
    let storageType = null;
    let gmApiAvailable = null;
    const _gmApiWarningShown = false; // Reserved for future warning system
    const memoryStore = {};
    const storageTypes = {
      GM: "gm",
      LOCAL: "local",
      SESSION: "session",
      MEMORY: "memory",
    };

    // Storage references
    let localStorageRef = null;
    let sessionStorageRef = null;

    /**
     * Test if GM storage API is available and working
     * @private
     * @returns {boolean}
     */
    function testGMStorage() {
      if (gmApiAvailable !== null) return gmApiAvailable;

      try {
        if (
          typeof GM_setValue === "undefined" ||
          typeof GM_getValue === "undefined"
        ) {
          gmApiAvailable = false;
          return false;
        }

        // Test actual functionality
        const testKey = "__mgtools_gm_test__";
        const testValue = "test_" + Date.now();
        GM_setValue(testKey, testValue);
        const retrieved = GM_getValue(testKey, null);

        // Clean up
        if (typeof GM_deleteValue !== "undefined") {
          try {
            GM_deleteValue(testKey);
          } catch (e) {
            // Ignore GM_deleteValue errors during cleanup
          }
        }

        gmApiAvailable = retrieved === testValue;
        return gmApiAvailable;
      } catch (e) {
        gmApiAvailable = false;
        return false;
      }
    }

    /**
     * Get localStorage reference (with Discord iframe workaround)
     * @private
     * @returns {Storage|null}
     */
    function getLocalStorage() {
      if (localStorageRef) return localStorageRef;

      try {
        // Try direct access
        if (window.localStorage && typeof window.localStorage !== "undefined") {
          const test = "__localStorage_test__";
          window.localStorage.setItem(test, test);
          window.localStorage.removeItem(test);
          localStorageRef = window.localStorage;
          return localStorageRef;
        }
      } catch (e) {
        // Discord iframe workaround
        try {
          const iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.style.position = "absolute";
          iframe.style.width = "0";
          iframe.style.height = "0";

          if (document.body) {
            document.body.appendChild(iframe);
          } else {
            document.documentElement.appendChild(iframe);
          }

          const iframeStorage = iframe.contentWindow.localStorage;
          const test = "__mgtools_iframe_test__";
          iframeStorage.setItem(test, test);
          iframeStorage.removeItem(test);

          localStorageRef = iframeStorage;
          productionLog("✅ [STORAGE] Using iframe localStorage workaround");
          return localStorageRef;
        } catch (iframeError) {
          // Fallback failed
        }
      }

      return null;
    }

    /**
     * Get sessionStorage reference
     * @private
     * @returns {Storage|null}
     */
    function getSessionStorage() {
      if (sessionStorageRef) return sessionStorageRef;

      try {
        if (
          window.sessionStorage &&
          typeof window.sessionStorage !== "undefined"
        ) {
          const test = "__sessionStorage_test__";
          window.sessionStorage.setItem(test, test);
          window.sessionStorage.removeItem(test);
          sessionStorageRef = window.sessionStorage;
          return sessionStorageRef;
        }
      } catch (e) {
        // sessionStorage not available or blocked
      }

      return null;
    }

    /**
     * Initialize storage system and determine best available type
     * @private
     */
    function initialize() {
      if (initialized) return;

      // Test storage types in order of preference
      if (testGMStorage()) {
        storageType = storageTypes.GM;
        productionLog(
          "✅ [STORAGE] Using GM storage (persistent across domains)",
        );
      } else if (getLocalStorage()) {
        storageType = storageTypes.LOCAL;
        productionLog("✅ [STORAGE] Using localStorage");
      } else if (getSessionStorage()) {
        storageType = storageTypes.SESSION;
        console.warn(
          "⚠️ [STORAGE] Using sessionStorage (data lost on tab close)",
        );
      } else {
        storageType = storageTypes.MEMORY;
        console.warn(
          "⚠️ [STORAGE] Using memory storage (data lost on refresh)",
        );
      }

      initialized = true;
    }

    /**
     * Get item from storage
     * @param {string} key - Storage key
     * @param {*} [defaultValue=null] - Default value if not found
     * @returns {*} Value or default
     */
    function getItem(key, defaultValue = null) {
      initialize();

      try {
        let value = null;

        switch (storageType) {
          case storageTypes.GM:
            value = GM_getValue(key, null);
            break;
          case storageTypes.LOCAL:
            value = localStorageRef.getItem(key);
            break;
          case storageTypes.SESSION:
            value = sessionStorageRef.getItem(key);
            break;
          case storageTypes.MEMORY:
            value = memoryStore[key] || null;
            break;
        }

        // Try to parse JSON if applicable
        if (value && typeof value === "string") {
          try {
            return JSON.parse(value);
          } catch (e) {
            return value;
          }
        }

        return value !== null ? value : defaultValue;
      } catch (e) {
        console.error("[STORAGE] getItem error:", e);
        return defaultValue;
      }
    }

    /**
     * Set item in storage
     * @param {string} key - Storage key
     * @param {*} value - Value to store
     * @returns {boolean} Success status
     */
    function setItem(key, value) {
      initialize();

      try {
        // Convert objects to JSON
        const stringValue =
          typeof value === "object" ? JSON.stringify(value) : String(value);

        switch (storageType) {
          case storageTypes.GM:
            GM_setValue(key, stringValue);
            break;
          case storageTypes.LOCAL:
            localStorageRef.setItem(key, stringValue);
            break;
          case storageTypes.SESSION:
            sessionStorageRef.setItem(key, stringValue);
            break;
          case storageTypes.MEMORY:
            memoryStore[key] = stringValue;
            break;
        }

        return true;
      } catch (e) {
        console.error("[STORAGE] setItem error:", e);

        // Try fallback to memory if other storage fails
        if (storageType !== storageTypes.MEMORY) {
          try {
            memoryStore[key] =
              typeof value === "object" ? JSON.stringify(value) : String(value);
            console.warn("[STORAGE] Fallback to memory for key:", key);
            return true;
          } catch (e2) {}
        }

        return false;
      }
    }

    /**
     * Remove item from storage
     * @param {string} key - Storage key
     * @returns {boolean} Success status
     */
    function removeItem(key) {
      initialize();

      try {
        switch (storageType) {
          case storageTypes.GM:
            if (typeof GM_deleteValue !== "undefined") {
              GM_deleteValue(key);
            } else {
              GM_setValue(key, undefined);
            }
            break;
          case storageTypes.LOCAL:
            localStorageRef.removeItem(key);
            break;
          case storageTypes.SESSION:
            sessionStorageRef.removeItem(key);
            break;
          case storageTypes.MEMORY:
            delete memoryStore[key];
            break;
        }

        return true;
      } catch (e) {
        console.error("[STORAGE] removeItem error:", e);
        return false;
      }
    }

    /**
     * Clear all storage (use with caution)
     * @returns {boolean} Success status
     */
    function clear() {
      initialize();

      try {
        switch (storageType) {
          case storageTypes.GM:
            // GM storage doesn't have a clear method, would need to track keys
            console.warn("[STORAGE] GM storage clear not implemented");
            break;
          case storageTypes.LOCAL:
            localStorageRef.clear();
            break;
          case storageTypes.SESSION:
            sessionStorageRef.clear();
            break;
          case storageTypes.MEMORY:
            Object.keys(memoryStore).forEach((key) => delete memoryStore[key]);
            break;
        }

        return true;
      } catch (e) {
        console.error("[STORAGE] clear error:", e);
        return false;
      }
    }

    /**
     * Get current storage type
     * @returns {string|null} Current storage type
     */
    function getStorageType() {
      initialize();
      return storageType;
    }

    /**
     * Get storage info for debugging
     * @returns {Object} Storage information
     */
    function getInfo() {
      initialize();
      return {
        type: storageType,
        gmAvailable: gmApiAvailable,
        localStorageAvailable: localStorageRef !== null,
        sessionStorageAvailable: sessionStorageRef !== null,
        memoryKeys: Object.keys(memoryStore).length,
      };
    }

    // Public API
    return {
      get: getItem,
      set: setItem,
      remove: removeItem,
      clear,
      getType: getStorageType,
      getInfo,

      // Legacy compatibility
      getItem,
      setItem,
      removeItem,

      // Storage type constants
      TYPES: storageTypes,
    };
  })();

  // Legacy compatibility - maintain old references
  const _safeStorage = Storage; // Kept for backwards compatibility
  const localStorage = {
    getItem: (key) => Storage.get(key),
    setItem: (key, value) => Storage.set(key, value),
    removeItem: (key) => Storage.remove(key),
    clear: () => Storage.clear(),
    get length() {
      console.warn(
        "[STORAGE] localStorage.length not supported in unified storage",
      );
      return 0;
    },
    key: (_index) => {
      console.warn(
        "[STORAGE] localStorage.key() not supported in unified storage",
      );
      return null;
    },
  };

