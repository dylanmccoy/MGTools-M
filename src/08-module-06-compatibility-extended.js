  /* ============================================================================
   * 6. COMPATIBILITY MODULE - EXTENDED
   * ============================================================================
   * Advanced CSP detection and compatibility mode for Discord/managed devices
   */

  /**
   * Compatibility mode system for handling restricted environments
   * @namespace CompatibilityMode
   */
  const CompatibilityMode = {
    flags: {
      enabled: false,
      blockExternalFonts: false,
      blockExternalBeacons: false,
      wsReconnectWhenHidden: false,
      strictNoEvalDynamicImport: false,
      inlineAssetsOnly: false,
      uiReducedMode: false,
      domOnlyStyles: false,
      bypassCSPNetworking: false,
    },

    detectionComplete: false,
    cspViolations: [],
    detectionReason: null,

    detect() {
      // Check for user override first
      try {
        const disabled = localStorage.getItem("mgtools_compat_disabled");
        if (disabled === "true") {
          logInfo("COMPAT", "Compatibility mode disabled by user");
          this.detectionComplete = true;
          return;
        }

        const forced = localStorage.getItem("mgtools_compat_forced");
        if (forced === "true") {
          this.enableCompat("user-forced");
          this.detectionComplete = true;
          return;
        }
      } catch (e) {
        logWarn(
          "COMPAT",
          "Unable to check localStorage for compat settings",
          e,
        );
      }

      // 1. Discord embed detection (enhanced)
      const host = window.location.host;
      const isDiscordHost =
        host.includes("discordsays.com") ||
        host.includes("discordactivities.com") ||
        host.includes("discord.gg") ||
        host.includes("discord.com");
      const isDiscordDesktop = typeof window.DiscordNative !== "undefined";
      const inDiscordIframe =
        window !== window.top && document.referrer?.includes("discord");
      const hasDiscordSDK =
        typeof window.DiscordSDK !== "undefined" ||
        typeof window.__DISCORD__ !== "undefined";

      const isDiscordEmbed =
        isDiscordHost || isDiscordDesktop || inDiscordIframe || hasDiscordSDK;

      if (CONFIG.DEBUG.FLAGS.FIX_VALIDATION) {
        productionLog("[FIX_DISCORD]", {
          host: isDiscordHost,
          desktop: isDiscordDesktop,
          iframe: inDiscordIframe,
          sdk: hasDiscordSDK,
          scope:
            typeof unsafeWindow !== "undefined" ? "unsafeWindow" : "window",
        });
      }

      /**
       * Discord CSP Constraints:
       * - No external stylesheets (Google Fonts blocked)
       * - Limited fetch (use GM_xmlhttpRequest)
       * - Storage fallback to sessionStorage/memory
       * - Scope bridging via unsafeWindow when available
       */

      if (isDiscordEmbed) {
        this.enableCompat("discord-embed");
        this.detectionComplete = true;
        return;
      }

      // 2. CSP violation listener (500ms window) with duplicate prevention
      // CRITICAL FIX: Opera/Tampermonkey makes console.error read-only, causing fatal crash
      const self = this;
      const seenCSPMessages = new Set();

      try {
        // Check if console.error is writable before attempting override
        const descriptor = Object.getOwnPropertyDescriptor(console, "error");
        const canOverride =
          !descriptor || descriptor.writable || descriptor.configurable;

        if (canOverride) {
          // Safe to override console.error
          const originalError = console.error.bind(console);

          console.error = function (...args) {
            const msg = args.join(" ");

            // Check for CSP-related errors
            if (
              (msg.includes("Content Security Policy") ||
                msg.includes("Refused to load") ||
                msg.includes("violates the following")) &&
              !msg.includes("mgtools")
            ) {
              // Ignore our own CSP issues

              // Skip duplicate CSP violations to reduce console spam
              if (seenCSPMessages.has(msg)) {
                return; // Silently skip duplicate
              }
              seenCSPMessages.add(msg);

              self.cspViolations.push(msg);
              if (self.cspViolations.length >= 2 && !self.flags.enabled) {
                self.enableCompat("csp-violations");
              }
            }
            return originalError.apply(console, args);
          };

          logInfo(
            "COMPAT",
            "✅ Console.error override successful for CSP detection",
          );
        } else {
          // Console.error is read-only (Opera/Tampermonkey) - use alternative detection
          logWarn(
            "COMPAT",
            "⚠️ Console.error is read-only, using alternative CSP detection",
          );

          // Alternative: listen for window error events
          window.addEventListener(
            "error",
            (event) => {
              const msg = event.message || "";
              if (
                (msg.includes("Content Security Policy") ||
                  msg.includes("Refused to load") ||
                  msg.includes("violates the following")) &&
                !msg.includes("mgtools") &&
                !seenCSPMessages.has(msg)
              ) {
                seenCSPMessages.add(msg);
                self.cspViolations.push(msg);
                if (self.cspViolations.length >= 2 && !self.flags.enabled) {
                  self.enableCompat("csp-violations");
                }
              }
            },
            true,
          );
        }
      } catch (e) {
        // Complete failure - continue without CSP detection
        logWarn("COMPAT", "❌ Cannot setup CSP detection:", e.message);
        logInfo("COMPAT", "Continuing without CSP violation detection");
      }

      // 3. Test storage availability
      setTimeout(() => {
        if (!this.flags.enabled) {
          try {
            const testKey = "__mgtools_compat_test_" + Date.now();
            GM_setValue(testKey, "test");
            GM_deleteValue(testKey);
          } catch (e) {
            this.enableCompat("storage-failed");
          }
        }

        this.detectionComplete = true;
        if (this.flags.enabled) {
          logInfo("COMPAT", "Compatibility mode ACTIVE", {
            reason: this.detectionReason,
            violations: this.cspViolations.length,
          });
        } else {
          logDebug(
            "COMPAT",
            "Compatibility mode not needed, running in normal mode",
          );
        }
      }, 500);
    },

    enableCompat(reason) {
      if (this.flags.enabled) return; // Already enabled

      logInfo("COMPAT", `Enabling compatibility mode: ${reason}`);

      // Discord Fix: Add detailed Discord-specific logging
      const isDiscordReason =
        reason.includes("discord") || reason.includes("csp");
      if (isDiscordReason) {
        productionLog(
          "🎮 [DISCORD] Compatibility mode activated for Discord environment",
        );
        productionLog("   📋 [DISCORD] Features enabled:");
        productionLog("      • Inline styles only (no external CSS)");
        productionLog("      • System fonts (no Google Fonts CDN)");
        productionLog("      • GM_xmlhttpRequest for network requests");
        productionLog("      • DOM mutation observer for UI persistence");
      }

      this.detectionReason = reason;
      this.flags.enabled = true;
      this.flags.blockExternalFonts = true;
      this.flags.blockExternalBeacons = true;
      this.flags.wsReconnectWhenHidden = true;
      this.flags.strictNoEvalDynamicImport = true;
      this.flags.inlineAssetsOnly = true;
      this.flags.uiReducedMode = true;
      this.flags.domOnlyStyles = true;
      this.flags.bypassCSPNetworking = true;

      // Save preference
      try {
        localStorage.setItem("mgtools_compat_mode", "true");
        localStorage.setItem("mgtools_compat_reason", reason);
      } catch (e) {
        // Ignore localStorage errors in restricted environments
      }
    },

    disableCompat() {
      this.flags.enabled = false;
      Object.keys(this.flags).forEach((key) => {
        if (key !== "enabled") this.flags[key] = false;
      });

      try {
        localStorage.setItem("mgtools_compat_disabled", "true");
        localStorage.removeItem("mgtools_compat_mode");
      } catch (e) {}

      logInfo("COMPAT", "Compatibility mode disabled");
    },

    isEnabled() {
      return this.flags.enabled;
    },
  };

  // Initialize compatibility detection immediately
  CompatibilityMode.detect();

