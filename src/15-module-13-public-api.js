    /* ============================================================================
     * 13. PUBLIC API MODULE
     * ============================================================================
     * External interfaces and debugging utilities
     */

    /**
     * Public API for debugging and external access
     * @namespace MGA
     * @global
     */
    window.MGA = {
      state: UnifiedState,

      // Manual controls
      showPanel: () => {
        if (UnifiedState.panels.main) {
          UnifiedState.panels.main.style.display = "block";
        }
      },

      hidePanel: () => {
        if (UnifiedState.panels.main) {
          UnifiedState.panels.main.style.display = "none";
        }
      },

      // Manual initialization - use if script doesn't auto-initialize
      init: () => {
        productionLog("🔄 Manual initialization requested...");
        UnifiedState.initialized = false; // Reset flag
        initializeScript();
      },

      // Recovery function for stuck initialization
      forceReinit: () => {
        productionLog("🔄 Force reinitialization requested...");
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
        window._MGA_FORCE_INIT = true;
        location.reload();
      },

      // Data persistence diagnostics
      checkPersistence: () => {
        productionLog("📊 Data Persistence Check:");
        productionLog(
          "  Pet Presets in State:",
          Object.keys(UnifiedState.data.petPresets).length,
        );
        productionLog(
          "  Pet Presets in Storage:",
          localStorage.getItem("MGA_petPresets") ? "EXISTS" : "MISSING",
        );
        productionLog(
          "  Seeds in State:",
          UnifiedState.data.seedsToDelete.length,
        );
        productionLog(
          "  Seeds in Storage:",
          localStorage.getItem("MGA_seedsToDelete") ? "EXISTS" : "MISSING",
        );

        if (localStorage.getItem("MGA_petPresets")) {
          productionLog(
            "  Raw Presets:",
            localStorage.getItem("MGA_petPresets"),
          );
        }
        if (localStorage.getItem("MGA_seedsToDelete")) {
          productionLog(
            "  Raw Seeds:",
            localStorage.getItem("MGA_seedsToDelete"),
          );
        }
      },

      // Pop-out functionality
      popout: {
        openTab: (tabName) => openTabInPopout(tabName),
        openSeparateWindow: (tabName) => openTabInSeparateWindow(tabName),
        createOverlay: (tabName) => createInGameOverlay(tabName),
        closeOverlay: (tabName) => closeInGameOverlay(tabName),
        refreshOverlay: (tabName) => refreshOverlayContent(tabName),
      },

      // Debug functions
      debug: {
        logState: () => productionLog("MGA State:", UnifiedState),
        logAtoms: () => productionLog("Atoms:", UnifiedState.atoms),
        logData: () => productionLog("Data:", UnifiedState.data),
        testTheming: () => {
          productionLog("🎨 Testing universal theming system...");
          productionLog("Current theme:", UnifiedState.currentTheme);
          productionLog(
            "Active overlays:",
            UnifiedState.data.popouts.overlays.size,
          );
          productionLog("Theme sync working:", !!UnifiedState.currentTheme);

          // Apply a test theme change
          const originalStyle = UnifiedState.data.settings.gradientStyle;
          UnifiedState.data.settings.gradientStyle = "rainbow-burst";
          UnifiedState.data.settings.opacity = 75;
          applyTheme();

          productionLog(
            "✅ Test theme applied! Check all windows for rainbow theme.",
          );
          productionLog(
            "💡 Open a pop-out or overlay to see the theme in action!",
          );

          // Restore original after 5 seconds
          setTimeout(() => {
            UnifiedState.data.settings.gradientStyle = originalStyle;
            UnifiedState.data.settings.opacity = 95;
            applyTheme();
            productionLog("🔄 Original theme restored.");
          }, 5000);
        },

        checkConnection: () => {
          const hasConnection =
            targetWindow.MagicCircle_RoomConnection &&
            typeof targetWindow.MagicCircle_RoomConnection.sendMessage ===
              "function";
          productionLog(
            "🔌 Connection Status:",
            hasConnection ? "✅ Available" : "❌ Not Available",
          );
          productionLog(
            "📡 RoomConnection Object:",
            targetWindow.MagicCircle_RoomConnection,
          );
          return hasConnection;
        },

        testSendMessage: () => {
          productionLog("🧪 Testing safeSendMessage...");
          const result = safeSendMessage({
            scopePath: ["Room"],
            type: "Ping",
          });
          productionLog("Result:", result ? "✅ Success" : "❌ Failed");
          return result;
        },

        debugStorage: () => window.MGA_debugStorage(),

        // Test functions
        testAbilityLog: () => {
          UnifiedState.data.petAbilityLogs.unshift({
            petName: "Test Pet",
            abilityType: "Test Ability",
            timestamp: Date.now(),
            timeString: new Date().toLocaleTimeString(),
            data: { test: true },
          });

          // Apply memory management for test logs too
          UnifiedState.data.petAbilityLogs = MGA_manageLogMemory(
            UnifiedState.data.petAbilityLogs,
          );
          MGA_debouncedSave(
            "MGA_petAbilityLogs",
            UnifiedState.data.petAbilityLogs,
          );
          if (UnifiedState.activeTab === "abilities") {
            updateTabContent();
          }
          // Update all overlay windows showing abilities tab
          UnifiedState.data.popouts.overlays.forEach((overlay, tabName) => {
            if (
              overlay &&
              document.contains(overlay) &&
              tabName === "abilities"
            ) {
              if (overlay.className.includes("mga-overlay-content-only")) {
                // NEW: Pure content overlays - refresh entire overlay
                updatePureOverlayContent(overlay, tabName);
                debugLog(
                  "OVERLAY_LIFECYCLE",
                  "Updated pure abilities overlay after test ability",
                );
              } else {
                // LEGACY: Old overlay structure
                const overlayContent = overlay.querySelector(
                  ".mga-overlay-content > div",
                );
                if (overlayContent) {
                  overlayContent.innerHTML = getAbilitiesTabContent();
                  // Update ability log display within this overlay context
                  setTimeout(() => updateAbilityLogDisplay(overlay), 10);
                  // Re-add resize handle after content update
                  setTimeout(() => {
                    if (!overlay.querySelector(".mga-resize-handle")) {
                      addResizeHandleToOverlay(overlay);
                      productionLog(
                        "🔧 [RESIZE] Re-added missing resize handle to ability logs overlay",
                      );
                    }
                  }, 50);
                }
              }
            }
          });
        },

        testTimer: () => {
          UnifiedState.data.timers = {
            seed: 120,
            egg: 240,
            tool: 180,
            lunar: 3600,
          };
          if (UnifiedState.activeTab === "timers") {
            updateTimerDisplay();
          }
        },

        testValues: () => {
          UnifiedState.data.inventoryValue = 123456;
          UnifiedState.data.tileValue = 78900;
          UnifiedState.data.gardenValue = 456789;
          if (UnifiedState.activeTab === "values") {
            updateTabContent();
          }
        },
      },

      // Manual refresh functions
      refresh: {
        pets: () => {
          if (UnifiedState.activeTab === "pets") {
            // Use targeted updates instead of full DOM rebuild to prevent UI interruption
            const context = document.getElementById("mga-tab-content");
            if (context) {
              updatePetPresetDropdown(context);
              // Update popouts without touching main tab
              refreshSeparateWindowPopouts("pets");
              UnifiedState.data.popouts.overlays.forEach((overlay, tabName) => {
                if (
                  overlay &&
                  document.contains(overlay) &&
                  tabName === "pets"
                ) {
                  if (overlay.className.includes("mga-overlay-content-only")) {
                    updatePureOverlayContent(overlay, tabName);
                  }
                }
              });
            }
          }
        },
        abilities: () => {
          if (UnifiedState.activeTab === "abilities") updateTabContent();
        },
        seeds: () => {
          if (UnifiedState.activeTab === "seeds") updateTabContent();
        },
        values: () => {
          updateValues();
          if (UnifiedState.activeTab === "values") updateTabContent();
        },
        timers: () => {
          updateTimers();
          if (UnifiedState.activeTab === "timers") updateTimerDisplay();
        },
        all: () => {
          updateTabContent();
          updateValues();
          updateTimers();
        },
      },

      // Export functions
      export: {
        petPresets: () => {
          const data = JSON.stringify(UnifiedState.data.petPresets, null, 2);
          const blob = new Blob([data], { type: "application/json" });
          const link = targetDocument.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = "MGA_PetPresets.json";
          link.click();
        },

        abilityLogs: () => exportAbilityLogs(),

        allData: () => {
          const data = JSON.stringify(
            {
              petPresets: UnifiedState.data.petPresets,
              petAbilityLogs: UnifiedState.data.petAbilityLogs,
              settings: {
                seedsToDelete: UnifiedState.data.seedsToDelete,
                autoDeleteEnabled: UnifiedState.data.autoDeleteEnabled,
              },
            },
            null,
            2,
          );
          const blob = new Blob([data], { type: "application/json" });
          const link = targetDocument.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `MGA_AllData_${new Date().toISOString().split("T")[0]}.json`;
          link.click();
        },
      },

      // Import functions
      import: {
        petPresets: (jsonString) => {
          try {
            const data = JSON.parse(jsonString);
            UnifiedState.data.petPresets = data;
            MGA_saveJSON("MGA_petPresets", data);
            if (UnifiedState.activeTab === "pets") {
              // Use targeted update to prevent UI interruption
              const context = document.getElementById("mga-tab-content");
              if (context) {
                updatePetPresetDropdown(context);
                refreshSeparateWindowPopouts("pets");
              }
            }
            productionLog("✅ Pet presets imported successfully");
          } catch (e) {
            console.error("❌ Failed to import pet presets:", e);
          }
        },

        allData: (jsonString) => {
          try {
            const data = JSON.parse(jsonString);
            if (data.petPresets) {
              UnifiedState.data.petPresets = data.petPresets;
              MGA_saveJSON("MGA_petPresets", data.petPresets);
            }
            if (data.petAbilityLogs) {
              UnifiedState.data.petAbilityLogs = data.petAbilityLogs;
              MGA_saveJSON("MGA_petAbilityLogs", data.petAbilityLogs);
            }
            if (data.settings) {
              if (data.settings.seedsToDelete) {
                UnifiedState.data.seedsToDelete = data.settings.seedsToDelete;
              }
              if (typeof data.settings.autoDeleteEnabled === "boolean") {
                UnifiedState.data.autoDeleteEnabled =
                  data.settings.autoDeleteEnabled;
              }
            }
            updateTabContent();
            productionLog("✅ All data imported successfully");
          } catch (e) {
            console.error("❌ Failed to import data:", e);
          }
        },
      },

      // Clear functions
      clear: {
        petPresets: () => {
          if (confirm("Clear all pet presets?")) {
            UnifiedState.data.petPresets = {};
            MGA_saveJSON("MGA_petPresets", {});
            if (UnifiedState.activeTab === "pets") {
              // Use targeted update to prevent UI interruption
              const context = document.getElementById("mga-tab-content");
              if (context) {
                updatePetPresetDropdown(context);
                refreshSeparateWindowPopouts("pets");
              }
            }
          }
        },

        abilityLogs: () => {
          if (confirm("Clear all ability logs?")) {
            UnifiedState.data.petAbilityLogs = [];
            MGA_saveJSON("MGA_petAbilityLogs", []);
            if (UnifiedState.activeTab === "abilities") updateTabContent();

            // Also update ability overlays
            UnifiedState.data.popouts.overlays.forEach((overlay, tabName) => {
              if (
                overlay &&
                document.contains(overlay) &&
                tabName === "abilities"
              ) {
                if (overlay.className.includes("mga-overlay-content-only")) {
                  // NEW: Pure content overlays - refresh entire overlay
                  updatePureOverlayContent(overlay, tabName);
                  debugLog(
                    "OVERLAY_LIFECYCLE",
                    "Updated pure abilities overlay after clearing logs",
                  );
                } else {
                  // LEGACY: Old overlay structure
                  const overlayContent = overlay.querySelector(
                    ".mga-overlay-content > div",
                  );
                  if (overlayContent) {
                    overlayContent.innerHTML = getAbilitiesTabContent();
                    setTimeout(() => updateAbilityLogDisplay(overlay), 10);
                    // Re-add resize handle after content update
                    setTimeout(() => {
                      if (!overlay.querySelector(".mga-resize-handle")) {
                        addResizeHandleToOverlay(overlay);
                        productionLog(
                          "🔧 [RESIZE] Re-added missing resize handle to ability logs overlay",
                        );
                      }
                    }, 50);
                  }
                }
              }
            });
          }
        },

        allData: () => {
          if (confirm("Clear ALL saved data? This cannot be undone!")) {
            UnifiedState.data.petPresets = {};
            UnifiedState.data.petAbilityLogs = [];
            UnifiedState.data.seedsToDelete = [];
            UnifiedState.data.autoDeleteEnabled = false;

            MGA_saveJSON("MGA_petPresets", {});
            MGA_saveJSON("MGA_petAbilityLogs", []);
            updateTabContent();
          }
        },
      },

      // Debug controls for development and testing
      debugControls: {
        forceInit: () => {
          productionLog("🔄 [DEBUG] Force re-initialization requested");
          window._MGA_FORCE_INIT = true;
          location.reload();
        },

        resetFlags: () => {
          productionLog("🔄 [DEBUG] Resetting initialization flags");
          window._MGA_INITIALIZED = false;
          try {
            delete window._MGA_INITIALIZING;
          } catch (e) {
            window._MGA_INITIALIZING = false;
          }
          window._MGA_FORCE_INIT = false;
          productionLog(
            "✅ [DEBUG] Flags reset - you can now re-run the script",
          );
        },

        checkPets: () => {
          productionLog("🐾 [DEBUG] Current pet state:");
          productionLog(
            "• UnifiedState.atoms.activePets:",
            UnifiedState.atoms.activePets,
          );
          productionLog("• window.activePets:", window.activePets);
          productionLog("• Room state pets:", getActivePetsFromRoomState());
          return {
            unifiedState: UnifiedState.atoms.activePets,
            windowPets: window.activePets,
            roomState: getActivePetsFromRoomState(),
          };
        },

        refreshPets: () => {
          productionLog("🔄 [DEBUG] Manually refreshing pets from room state");
          const pets = updateActivePetsFromRoomState();
          productionLog("✅ [DEBUG] Pets refreshed:", pets);
          return pets;
        },

        listIntervals: () => {
          productionLog("⏰ [DEBUG] Active managed intervals:");
          Object.entries(UnifiedState.intervals).forEach(([name, interval]) => {
            productionLog(`• ${name}: ${interval ? "Running" : "Stopped"}`);
          });
          return UnifiedState.intervals;
        },
      },
    };

    // ==================== LOADING STATE UTILITIES ====================
    window.MGA_LoadingStates = {
      show: (element, text = "Loading...") => {
        if (!element) return;
        const loadingHtml = `
                  <div class="mga-loading">
                      <div class="mga-loading-spinner"></div>
                      <span>${text}</span>
                  </div>
              `;
        element.innerHTML = loadingHtml;
      },

      showSkeleton: (element, lines = 3) => {
        if (!element) return;
        const skeletonLines = Array(lines)
          .fill(0)
          .map(
            () =>
              `<div class="mga-skeleton" style="height: 20px; margin-bottom: 8px; width: ${Math.floor(Math.random() * 40 + 60)}%;"></div>`,
          )
          .join("");
        element.innerHTML = `<div style="padding: 20px;">${skeletonLines}</div>`;
      },

      hide: (element, content, fadeIn = true) => {
        if (!element) return;
        element.innerHTML = content;
        if (fadeIn) {
          element.classList.add("mga-fade-in");
          setTimeout(() => element.classList.remove("mga-fade-in"), 300);
        }
      },

      addToButton: (button, originalText) => {
        if (!button) return;
        button.disabled = true;
        button.innerHTML = `<div class="mga-loading-spinner" style="margin-right: 4px; width: 16px; height: 16px;"></div>Loading...`;
      },

      removeFromButton: (button, originalText) => {
        if (!button) return;
        button.disabled = false;
        button.innerHTML = originalText;
      },
    };

    // ==================== ERROR RECOVERY MECHANISMS ====================
    window.MGA_ErrorRecovery = {
      wrapFunction: (fn, fallback = null, context = "Unknown") => {
        return function (...args) {
          try {
            return fn.apply(this, args);
          } catch (error) {
            debugError("ERROR_RECOVERY", `Error in ${context}`, error);

            // Show user-friendly error message
            const errorToast = targetDocument.createElement("div");
            errorToast.style.cssText = `
                          position: fixed; top: 20px; right: 20px; z-index: 20000;
                          background: rgba(220, 38, 38, 0.95); color: white;
                          padding: 12px 20px; border-radius: 8px;
                          font-family: Arial, sans-serif; font-size: 13px;
                          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                          animation: mga-fade-in 0.3s ease-out;
                      `;
            errorToast.innerHTML = `⚠️ Something went wrong in ${context}. Please try again.`;
            targetDocument.body.appendChild(errorToast);

            setTimeout(() => {
              errorToast.style.animation = "mga-fade-out 0.3s ease-in forwards";
              setTimeout(
                () => targetDocument.body.removeChild(errorToast),
                300,
              );
            }, 4000);

            return fallback ? fallback.apply(this, args) : null;
          }
        };
      },

      safeAsync: async (
        asyncFn,
        fallback = null,
        context = "Async Operation",
      ) => {
        try {
          return await asyncFn();
        } catch (error) {
          debugError("ERROR_RECOVERY", `Async error in ${context}`, error);
          return fallback;
        }
      },

      retryOperation: async (
        operation,
        maxRetries = 3,
        delay = 1000,
        context = "Operation",
      ) => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await operation();
          } catch (error) {
            if (i === maxRetries - 1) {
              debugError(
                "ERROR_RECOVERY",
                `Final retry failed for ${context}`,
                error,
              );
              throw error;
            }
            debugLog(
              "ERROR_RECOVERY",
              `Retry ${i + 1}/${maxRetries} for ${context}`,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      },
    };

    // ==================== PERFORMANCE OPTIMIZATIONS ====================
    window.MGA_Performance = {
      debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
          const later = () => {
            clearTimeout(timeout);
            func(...args);
          };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
        };
      },

      throttle: (func, limit) => {
        let inThrottle;
        return function () {
          const args = arguments;
          const context = this;
          if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
          }
        };
      },

      batchDOMUpdates: (updates) => {
        requestAnimationFrame(() => {
          const fragment = document.createDocumentFragment();
          updates.forEach((update) => {
            if (typeof update === "function") {
              update(fragment);
            }
          });
        });
      },

      optimizeScrolling: (element) => {
        if (!element) return;
        element.style.willChange = "scroll-position";
        element.style.transform = "translateZ(0)";
      },
    };

    // ==================== COMPREHENSIVE TOOLTIP SYSTEM ====================
    window.MGA_Tooltips = {
      tooltip: null,
      showTimeout: null,
      hideTimeout: null,
      currentEvent: null, // Store current mouse event for positioning

      init: () => {
        // Create tooltip element
        if (!window.MGA_Tooltips.tooltip) {
          window.MGA_Tooltips.tooltip = targetDocument.createElement("div");
          window.MGA_Tooltips.tooltip.className = "mga-tooltip";
          targetDocument.body.appendChild(window.MGA_Tooltips.tooltip);
        }

        // Add event listeners to all elements with tooltip data
        document.addEventListener(
          "mouseenter",
          window.MGA_Tooltips.handleMouseEnter,
          true,
        );
        document.addEventListener(
          "mouseleave",
          window.MGA_Tooltips.handleMouseLeave,
          true,
        );
        document.addEventListener(
          "mousemove",
          window.MGA_Tooltips.handleMouseMove,
          true,
        );
      },

      handleMouseEnter: (e) => {
        const element = e.target?.closest?.("[data-tooltip]");
        if (!element) return;

        // Don't interfere with button interactions - check if target is a button or interactive element
        if (
          e.target &&
          typeof e.target.matches === "function" &&
          (e.target.matches("button, input, select, .mga-btn") ||
            e.target.closest("button, .mga-btn"))
        ) {
          return; // Skip tooltip for interactive elements to prevent hover interference
        }

        const text = element.dataset.tooltip;
        const delay = element.dataset.tooltipDelay || 500;

        // Store the event for positioning
        window.MGA_Tooltips.currentEvent = e;

        window.MGA_Tooltips.showTimeout = setTimeout(() => {
          window.MGA_Tooltips.show(element, text);
        }, parseInt(delay));
      },

      handleMouseLeave: (e) => {
        const element = e.target?.closest?.("[data-tooltip]");
        if (!element) return;

        clearTimeout(window.MGA_Tooltips.showTimeout);
        window.MGA_Tooltips.hide();
      },

      handleMouseMove: (e) => {
        // CRITICAL: Only handle MGA-related tooltip events
        if (!isMGAEvent(e)) {
          return;
        }

        // Don't interfere with button hover states
        if (
          e.target &&
          typeof e.target.matches === "function" &&
          (e.target.matches("button, input, select, .mga-btn") ||
            e.target.closest("button, .mga-btn"))
        ) {
          return;
        }

        // Update current event for positioning
        window.MGA_Tooltips.currentEvent = e;

        if (
          window.MGA_Tooltips.tooltip &&
          window.MGA_Tooltips.tooltip.classList.contains("show")
        ) {
          // Check if we're still over a tooltip element
          const tooltipElement = e.target?.closest?.("[data-tooltip]");
          if (!tooltipElement) {
            window.MGA_Tooltips.hide();
            return;
          }
          window.MGA_Tooltips.position(e);
        }
      },

      show: (element, text) => {
        const tooltip = window.MGA_Tooltips.tooltip;
        tooltip.textContent = text;

        // BUGFIX: Position immediately before showing to prevent flash at (0,0)
        if (window.MGA_Tooltips.currentEvent) {
          window.MGA_Tooltips.position(window.MGA_Tooltips.currentEvent);
        }

        tooltip.classList.add("show");
      },

      hide: () => {
        const tooltip = window.MGA_Tooltips.tooltip;
        tooltip.classList.remove("show");

        // BUGFIX: Reset position to prevent stuck tooltips
        tooltip.style.left = "-9999px";
        tooltip.style.top = "-9999px";
        window.MGA_Tooltips.currentEvent = null;
      },

      position: (e) => {
        const tooltip = window.MGA_Tooltips.tooltip;
        const rect = tooltip.getBoundingClientRect();
        const padding = 10;

        let x = e.clientX + padding;
        let y = e.clientY - rect.height - padding;

        // Adjust if tooltip goes off screen
        if (x + rect.width > window.innerWidth) {
          x = e.clientX - rect.width - padding;
        }
        if (y < 0) {
          y = e.clientY + padding;
        }

        tooltip.style.left = x + "px";
        tooltip.style.top = y + "px";
      },

      addToElement: (element, text, options = {}) => {
        if (!element) return;
        element.setAttribute("data-tooltip", text);
        if (options.delay)
          element.setAttribute("data-tooltip-delay", options.delay);
      },

      removeFromElement: (element) => {
        if (!element) return;
        element.removeAttribute("data-tooltip");
        element.removeAttribute("data-tooltip-delay");
      },
    };

    // Add fade-out animation for error toasts and slot value centering
    const additionalStyles = `
    @keyframes mga-fade-out {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(-10px); }
    }

    /* Ensure our estimate/slot-value paragraphs behave as full-width, centered lines
       so they appear centered inside the game's tooltip textbox regardless of container quirks. */
    [data-turtletimer-estimate="true"] {
      display: block !important;
      width: 100% !important;
      box-sizing: border-box !important;
      text-align: center !important;       /* centers text inside the tooltip textbox */
      margin: 2px 0 !important;
      padding: 0 !important;
      color: lime !important;
      font-weight: bold !important;
      font-size: 14px !important;
      line-height: 1.25 !important;
    }

    [data-turtletimer-slot-value="true"] {
      display: block !important;
      width: 100% !important;
      box-sizing: border-box !important;
      text-align: center !important;       /* centers text inside the tooltip textbox */
      margin: 2px 0 !important;
      padding: 0 !important;
      color: #FFD700 !important;
      font-weight: 600 !important;
      font-size: 13px !important;
      line-height: 1.25 !important;
    }
  `;
    const styleSheet = targetDocument.createElement("style");
    styleSheet.textContent = additionalStyles;
    targetDocument.head.appendChild(styleSheet);

    // ==================== AUTO-SAVE ====================
    // Auto-save data every 30 seconds using managed interval
    setManagedInterval(
      "autoSave",
      () => {
        MGA_saveJSON("MGA_petPresets", UnifiedState.data.petPresets);
        // Only save ability logs if not in clear session
        const clearSession = localStorage.getItem("MGA_logs_clear_session");
        if (
          !clearSession ||
          Date.now() - parseInt(clearSession, 10) > 86400000
        ) {
          MGA_saveJSON("MGA_petAbilityLogs", UnifiedState.data.petAbilityLogs);
        }
        MGA_saveJSON("MGA_seedsToDelete", UnifiedState.data.seedsToDelete);
        MGA_saveJSON(
          "MGA_autoDeleteEnabled",
          UnifiedState.data.autoDeleteEnabled,
        );

        // Update resource tracking
        if (window.resourceDashboard) {
          window.resourceDashboard.updateResourceHistory();
        }
      },
      30000,
    );

    // ==================== CLEANUP ====================
    window.addEventListener("beforeunload", () => {
      // Save all data before leaving - CRITICAL: Use immediate saves, not debounced!
      MGA_saveJSON("MGA_petPresets", UnifiedState.data.petPresets);
      // Only save ability logs if not in clear session
      const clearSession = localStorage.getItem("MGA_logs_clear_session");
      if (!clearSession || Date.now() - parseInt(clearSession, 10) > 86400000) {
        MGA_saveJSON("MGA_petAbilityLogs", UnifiedState.data.petAbilityLogs);
      }
      MGA_saveJSON("MGA_seedsToDelete", UnifiedState.data.seedsToDelete);
      MGA_saveJSON(
        "MGA_autoDeleteEnabled",
        UnifiedState.data.autoDeleteEnabled,
      );

      // Clean up all managed intervals
      clearAllManagedIntervals();

      // Close all popout windows
      closeAllPopoutWindows();

      debugLog("PERFORMANCE", "Cleanup completed on window unload");
    });
  }
})();

