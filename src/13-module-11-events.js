    /* ============================================================================
     * 11. EVENT MODULE - START
     * ============================================================================
     * Event handlers for all UI interactions and user inputs
     */

    /**
     * Sets up event handlers for the pets tab
     * @function setupPetsTabHandlers
     * @param {Document|Element} context - DOM context for event binding
     */
    function setupPetsTabHandlers(context = document) {
      productionLog("🚨 [CRITICAL] Setting up pet preset handlers");

      // Use event delegation on the parent container for all preset buttons
      const presetsContainer = context.querySelector("#presets-list");
      if (presetsContainer) {
        productionLog(
          "🚨 [CRITICAL] Found presets container, adding delegation",
        );

        // Remove old listener if it exists
        if (presetsContainer._mgaClickHandler) {
          presetsContainer.removeEventListener(
            "click",
            presetsContainer._mgaClickHandler,
          );
        }

        // Create new handler
        presetsContainer._mgaClickHandler = (e) => {
          const btn = e.target.closest("[data-action]");
          if (!btn) return;

          e.preventDefault();
          e.stopPropagation();

          const action = btn.dataset.action;
          const presetName = btn.dataset.preset;

          productionLog(
            `🚨 [CRITICAL] Delegated click: action=${action}, preset=${presetName}`,
          );

          if (action === "move-up") {
            productionLog(`🚨 [CRITICAL] Moving ${presetName} UP`);
            movePreset(presetName, "up", context);
          } else if (action === "move-down") {
            productionLog(`🚨 [CRITICAL] Moving ${presetName} DOWN`);
            movePreset(presetName, "down", context);
          } else if (action === "save") {
            productionLog(`🚨 [CRITICAL] Saving preset ${presetName}`);
            UnifiedState.data.petPresets[presetName] = (
              UnifiedState.atoms.activePets || []
            ).slice(0, 3);
            MGA_saveJSON("MGA_petPresets", UnifiedState.data.petPresets);
            refreshPresetsList(context);
          } else if (action === "place") {
            productionLog(`🚨 [CRITICAL] Placing preset ${presetName}`);
            window.debouncedPlacePetPreset(presetName);
          } else if (action === "remove") {
            productionLog(`[CRITICAL] Removing preset ${presetName}`);
            delete UnifiedState.data.petPresets[presetName];

            // Clean up associated hotkey if it exists
            if (UnifiedState.data.petPresetHotkeys[presetName]) {
              const deletedHotkey =
                UnifiedState.data.petPresetHotkeys[presetName];
              delete UnifiedState.data.petPresetHotkeys[presetName];
              MGA_saveJSON(
                "MGA_petPresetHotkeys",
                UnifiedState.data.petPresetHotkeys,
              );
              productionLog(
                `[MGTOOLS] Cleared hotkey "${deletedHotkey}" for deleted preset: ${presetName}`,
              );
            }

            MGA_saveJSON("MGA_petPresets", UnifiedState.data.petPresets);
            refreshPresetsList(context);
          }
        };

        // Add the handler
        presetsContainer.addEventListener(
          "click",
          presetsContainer._mgaClickHandler,
        );
        productionLog(
          "🚨 [CRITICAL] Event delegation handler attached successfully",
        );

        // Handle hotkey button clicks
        context.querySelectorAll(".mga-hotkey-btn").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const presetName = btn.dataset.preset;
            showHotkeyRecordingModal(presetName, context);
          });
        });
      } else {
        productionLog("🚨 [CRITICAL] ERROR: presets container not found!");
      }

      const input = context.querySelector("#preset-name-input");
      if (input) {
        // Comprehensive input isolation to prevent game key interference and modal detection

        let handlingEvent = false;

        // Add additional isolation layer for the input container
        // Note: Removed aggressive event blocking that was preventing UI interactions

        // Create input isolation system
        const createInputIsolation = function (inputElement) {
          // Prevent ALL game key interference when input is focused
          const isolateKeyEvent = (e) => {
            if (document.activeElement === inputElement) {
              // Stop all propagation to prevent game from receiving keys
              e.stopImmediatePropagation();
              e.stopPropagation();

              // Handle special keys
              if (e.key === "Escape") {
                e.preventDefault();
                inputElement.blur(); // Allow user to return to game
                return;
              }

              // Allow Enter to submit
              if (e.key === "Enter") {
                e.preventDefault();
                const addBtn = context.querySelector("#add-preset-btn");
                if (addBtn) addBtn.click();
                return;
              }

              // For other keys, let the input handle them naturally
              // but prevent game from seeing them
            }
          };

          // Capture ALL key events before they reach the game
          ["keydown", "keyup", "keypress"].forEach((eventType) => {
            inputElement.addEventListener(eventType, isolateKeyEvent, {
              capture: true,
              passive: false,
            });
          });

          // Also isolate focus/blur events
          inputElement.addEventListener("focus", (e) => {
            if (UnifiedState.data.settings.debugMode) {
              productionLog("🔒 Input focused - Game keys isolated");
            }
            e.stopPropagation();
          });

          inputElement.addEventListener("blur", (e) => {
            if (UnifiedState.data.settings.debugMode) {
              productionLog("🔓 Input blurred - Game keys restored");
            }
            e.stopPropagation();
          });
        };

        // Apply input isolation
        createInputIsolation(input);

        // Existing click handlers with improved event handling
        input.addEventListener("mousedown", (e) => {
          if (handlingEvent) return;
          handlingEvent = true;
          e.stopPropagation();

          setTimeout(() => {
            handlingEvent = false;
          }, 50);
        });

        input.addEventListener("click", (e) => {
          if (handlingEvent) return;
          e.stopPropagation();

          // Only select all if the input is empty or user clicked when not focused
          if (input.value === "" || document.activeElement !== input) {
            setTimeout(() => {
              input.focus();
              input.select();
            }, 0);
          }
        });
      }

      // Cycle Presets Hotkey Button Handler
      const setCycleHotkeyBtn = context.querySelector("#set-cycle-hotkey-btn");
      if (
        setCycleHotkeyBtn &&
        !setCycleHotkeyBtn.hasAttribute("data-handler-setup")
      ) {
        setCycleHotkeyBtn.setAttribute("data-handler-setup", "true");
        setCycleHotkeyBtn.addEventListener("click", () => {
          startRecordingHotkeyMGTools("cyclePresets", setCycleHotkeyBtn);
        });
      }

      // Quick Load Button Handler
      const quickLoadBtn = context.querySelector("#quick-load-btn");
      if (quickLoadBtn && !quickLoadBtn.hasAttribute("data-handler-setup")) {
        quickLoadBtn.setAttribute("data-handler-setup", "true");
        quickLoadBtn.addEventListener("click", () => {
          const select = context.querySelector("#preset-quick-select");
          const presetName = select.value;

          if (!presetName) {
            productionWarn("[PETS] No preset selected");
            return;
          }

          if (!UnifiedState.data.petPresets[presetName]) {
            productionWarn("[PETS] Preset not found:", presetName);
            return;
          }

          const preset = UnifiedState.data.petPresets[presetName];

          // Validate preset
          if (!preset || !Array.isArray(preset) || preset.length === 0) {
            productionWarn("[PETS] Preset is empty or invalid:", preset);
            return;
          }

          const maxSlots = 3;

          // Native swap approach - works even with full inventory!
          let delay = 0;

          for (let slotIndex = 0; slotIndex < maxSlots; slotIndex++) {
            const desiredPet = preset[slotIndex];

            // BUGFIX: Capture delay value in closure to prevent race conditions
            ((currentDelay, slot) => {
              setTimeout(() => {
                // BUGFIX: Read FRESH state inside timeout (not stale reference)
                const currentPets =
                  UnifiedState.atoms.activePets || window.activePets || [];
                const currentPet = currentPets[slot];

                if (currentPet && desiredPet) {
                  // Check if desired pet is already equipped
                  if (currentPet.id === desiredPet.id) {
                    if (UnifiedState.data.settings?.debugMode) {
                      productionLog(
                        `[PET-SWAP] Slot ${slot + 1}: Already equipped (${currentPet.id}), skipping`,
                      );
                    }
                    return; // Skip swap, pet already in place
                  }

                  // Both exist: Use native SwapPet (no inventory space needed!)
                  if (UnifiedState.data.settings?.debugMode) {
                    productionLog(
                      `[PET-SWAP] Slot ${slot + 1}: Swapping ${currentPet.id} → ${desiredPet.id}`,
                    );
                  }

                  safeSendMessage({
                    scopePath: ["Room", "Quinoa"],
                    type: "SwapPet",
                    petSlotId: currentPet.id,
                    petInventoryId: desiredPet.id,
                  });
                } else if (!currentPet && desiredPet) {
                  // Empty slot: Place new pet
                  if (UnifiedState.data.settings?.debugMode) {
                    productionLog(
                      `[PET-SWAP] Slot ${slot + 1}: Placing ${desiredPet.id} (empty slot)`,
                    );
                  }

                  safeSendMessage({
                    scopePath: ["Room", "Quinoa"],
                    type: "PlacePet",
                    itemId: desiredPet.id,
                    position: { x: 17 + slot * 2, y: 13 },
                    localTileIndex: 64,
                    tileType: "Boardwalk",
                  });
                } else if (currentPet && !desiredPet) {
                  // Remove excess pet (preset has fewer pets)
                  if (UnifiedState.data.settings?.debugMode) {
                    productionLog(
                      `[PET-SWAP] Slot ${slot + 1}: Storing ${currentPet.id} (no preset pet)`,
                    );
                  }

                  safeSendMessage({
                    scopePath: ["Room", "Quinoa"],
                    type: "StorePet",
                    itemId: currentPet.id,
                  });
                }
              }, currentDelay);
            })(delay, slotIndex);

            // Increase delay: 100ms → 200ms for better network latency tolerance
            delay += 200;
          }

          // Refresh after swaps complete
          setTimeout(() => {
            updateActivePetsFromRoomState();
            updateActivePetsDisplay(context);
          }, delay + 200);

          setTimeout(() => {
            updateActivePetsFromRoomState();
            updateActivePetsDisplay(context);
          }, delay + 600);

          setTimeout(() => {
            updateActivePetsFromRoomState();
            updateActivePetsDisplay(context);
            refreshSeparateWindowPopouts("pets");
            UnifiedState.data.popouts.overlays.forEach((overlay, tabName) => {
              if (overlay && document.contains(overlay) && tabName === "pets") {
                if (overlay.className.includes("mga-overlay-content-only")) {
                  updatePureOverlayContent(overlay, tabName);
                }
              }
            });
          }, delay + 1000);
        });
      }

      // Add/Save Preset Button Handler
      const addBtn = context.querySelector("#add-preset-btn");
      if (addBtn && !addBtn.hasAttribute("data-handler-setup")) {
        addBtn.setAttribute("data-handler-setup", "true");
        addBtn.addEventListener("click", () => {
          const input = context.querySelector("#preset-name-input");
          const name = input.value.trim();
          if (
            name &&
            UnifiedState.atoms.activePets &&
            UnifiedState.atoms.activePets.length
          ) {
            // Save full pet data including abilities for Crop Eater detection
            UnifiedState.data.petPresets[name] =
              UnifiedState.atoms.activePets.slice(0, 3);
            MGA_saveJSON("MGA_petPresets", UnifiedState.data.petPresets);
            input.value = ""; // Clear input after successful add

            // Add preset name to order array
            ensurePresetOrder();
            if (!UnifiedState.data.petPresetsOrder.includes(name)) {
              UnifiedState.data.petPresetsOrder.push(name);
              MGA_saveJSON(
                "MGA_petPresetsOrder",
                UnifiedState.data.petPresetsOrder,
              );
            }

            // Refresh preset list to show in correct order
            refreshPresetsList(context);

            // Update dropdown
            updatePetPresetDropdown(context);

            // Update popouts
            refreshSeparateWindowPopouts("pets");
            UnifiedState.data.popouts.overlays.forEach((overlay, tabName) => {
              if (overlay && document.contains(overlay) && tabName === "pets") {
                if (overlay.className.includes("mga-overlay-content-only")) {
                  updatePureOverlayContent(overlay, tabName);
                }
              }
            });

            debugLog(
              "BUTTON_INTERACTIONS",
              `Created new preset: ${name} without full DOM refresh`,
            );
          } else if (!name) {
            input.focus(); // Focus input if name is empty
          }
        });
      }

      // Prevent duplicate event listeners by checking if already handled
      context.querySelectorAll("[data-action]").forEach((btn) => {
        if (btn.hasAttribute("data-handler-setup")) {
          return; // Skip if already has event listener
        }
        btn.setAttribute("data-handler-setup", "true");

        btn.addEventListener("click", (e) => {
          e.preventDefault();
          debugLog(
            "BUTTON_INTERACTIONS",
            `Button clicked: ${e.target.dataset.action}`,
            {
              preset: e.target.dataset.preset,
              buttonText: e.target.textContent,
            },
          );

          const action = e.target.dataset.action;
          const presetName = e.target.dataset.preset;

          if (action === "save") {
            UnifiedState.data.petPresets[presetName] = (
              UnifiedState.atoms.activePets || []
            ).slice(0, 3);
            MGA_saveJSON("MGA_petPresets", UnifiedState.data.petPresets);

            // Update only the quick select dropdown without full refresh
            updatePetPresetDropdown(context);

            // Update all pet overlays (they need full updates for popouts)
            UnifiedState.data.popouts.overlays.forEach((overlay, tabName) => {
              if (overlay && document.contains(overlay) && tabName === "pets") {
                if (overlay.className.includes("mga-overlay-content-only")) {
                  updatePureOverlayContent(overlay, tabName);
                  debugLog(
                    "OVERLAY_LIFECYCLE",
                    "Updated pure pets overlay after saving preset",
                  );
                }
              }
            });

            // Update separate window popouts
            refreshSeparateWindowPopouts("pets");

            debugLog(
              "BUTTON_INTERACTIONS",
              `Saved preset: ${presetName} without full DOM refresh`,
            );
          } else if (action === "place") {
            window.debouncedPlacePetPreset(presetName);
          } else if (action === "remove") {
            delete UnifiedState.data.petPresets[presetName];

            // Clean up associated hotkey if it exists
            if (UnifiedState.data.petPresetHotkeys[presetName]) {
              const deletedHotkey =
                UnifiedState.data.petPresetHotkeys[presetName];
              delete UnifiedState.data.petPresetHotkeys[presetName];
              MGA_saveJSON(
                "MGA_petPresetHotkeys",
                UnifiedState.data.petPresetHotkeys,
              );
              productionLog(
                `[MGTOOLS] Cleared hotkey "${deletedHotkey}" for deleted preset: ${presetName}`,
              );
            }

            MGA_saveJSON("MGA_petPresets", UnifiedState.data.petPresets);

            // Remove the preset element from DOM without full refresh
            const presetElement = e.target.closest(".mga-preset");
            if (presetElement) {
              presetElement.remove();
            }

            // Update the dropdown
            updatePetPresetDropdown(context);

            // Update all pet overlays
            UnifiedState.data.popouts.overlays.forEach((overlay, tabName) => {
              if (overlay && document.contains(overlay) && tabName === "pets") {
                if (overlay.className.includes("mga-overlay-content-only")) {
                  updatePureOverlayContent(overlay, tabName);
                  debugLog(
                    "OVERLAY_LIFECYCLE",
                    "Updated pure pets overlay after removing preset",
                  );
                }
              }
            });

            // Update separate window popouts
            refreshSeparateWindowPopouts("pets");

            debugLog(
              "BUTTON_INTERACTIONS",
              `Removed preset: ${presetName} without full DOM refresh`,
            );
          }
        });
      });

      // Handle popout preset buttons (simplified interface)
      context.querySelectorAll("[data-preset]").forEach((btn) => {
        if (btn.hasAttribute("data-handler-setup")) return;
        btn.setAttribute("data-handler-setup", "true");

        btn.addEventListener("click", (e) => {
          e.preventDefault();
          const presetName = e.target.dataset.preset;
          const preset = UnifiedState.data.petPresets[presetName];

          if (!preset || !preset.length) {
            productionWarn(`⚠️ Preset "${presetName}" not found or empty!`);
            return;
          }

          debugLog(
            "BUTTON_INTERACTIONS",
            `Loading preset from popout: ${presetName}`,
            { preset },
          );

          const currentPets = UnifiedState.atoms.activePets || [];

          // Clear existing pets WITH DELAYS (50ms between each) - CRITICAL FIX for slow connections
          currentPets.forEach((p, i) => {
            setTimeout(() => {
              safeSendMessage({
                scopePath: ["Room", "Quinoa"],
                type: "RemovePet",
                itemId: p.id,
              });
            }, i * 50);
          });

          // Calculate delay before placing new pets (wait for all RemovePet to complete)
          const removalDelay = currentPets.length * 50 + 200; // Extra 200ms buffer

          // Place preset pets with delays AFTER removal completes
          preset.forEach((p, i) => {
            setTimeout(
              () => {
                safeSendMessage({
                  scopePath: ["Room", "Quinoa"],
                  type: "PlacePet",
                  itemId: p.id,
                  position: { x: 17 + i * 2, y: 13 },
                  localTileIndex: 64,
                  tileType: "Boardwalk",
                });
              },
              removalDelay + i * 50,
            );
          });

          // Update popouts after removal + placement completes
          setTimeout(
            () => {
              updateActivePetsFromRoomState();
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
            },
            removalDelay + preset.length * 50 + 1000,
          );
        });
      });

      // === EXPORT/IMPORT BUTTON HANDLERS (v3.8.7) ===
      const exportBtn = context.querySelector("#export-presets-btn");
      if (exportBtn && !exportBtn.hasAttribute("data-handler-setup")) {
        exportBtn.setAttribute("data-handler-setup", "true");
        exportBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          exportPetPresets();
        });
      }

      const importBtn = context.querySelector("#import-presets-btn");
      if (importBtn && !importBtn.hasAttribute("data-handler-setup")) {
        importBtn.setAttribute("data-handler-setup", "true");
        importBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          importPetPresets();
        });
      }

      // Pet management handlers will be added here when we detect actual Magic Garden pets
    }

    // ==================== MAGIC GARDEN PET HELPERS ====================
    // Pet helpers for actual Magic Garden pets (not generic fantasy pets)

    class ResourceDashboard {
      constructor() {
        this.resourceHistory =
          localStorage.getItem("MGA_resourceHistory") || [];
        this.resourceAlerts = localStorage.getItem("MGA_resourceAlerts") || {};

        // Initialize resource tracking if not exists
        if (!UnifiedState.data.resources) {
          UnifiedState.data.resources = {
            coins: 0,
            gems: 0,
            seeds: {},
            tiles: 0,
            lastUpdate: Date.now(),
          };
        }
      }

      updateResourceHistory() {
        try {
          const currentResources = {
            timestamp: Date.now(),
            coins: UnifiedState.atoms.coinCount || 0,
            gems: UnifiedState.atoms.gems || 0,
            seeds: Object.keys(UnifiedState.atoms.seedInventory || {}).length,
            tiles: UnifiedState.atoms.tiles || 0,
          };

          this.resourceHistory.push(currentResources);
          if (this.resourceHistory.length > 100) {
            this.resourceHistory = this.resourceHistory.slice(-100);
          }
          localStorage.setItem(
            "MGA_resourceHistory",
            JSON.stringify(this.resourceHistory),
          );
        } catch (error) {
          console.error("Error updating resource history:", error);
        }
      }

      generateDashboard() {
        const latest = this.resourceHistory[this.resourceHistory.length - 1];
        if (!latest) {
          return `<div class="mga-section"><div class="mga-section-title">📊 Resource Dashboard</div><div style="color: rgba(255,255,255,0.6); text-align: center; padding: 20px;">No resource data available yet.</div></div>`;
        }

        return `
                  <div class="mga-section">
                      <div class="mga-section-title">📊 Resource Dashboard</div>
                      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin: 15px 0;">
                          <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 8px;">
                              <div style="color: #F59E0B; font-size: 24px; font-weight: bold;">${latest.coins.toLocaleString()}</div>
                              <div style="color: rgba(255,255,255,0.7); font-size: 12px;">💰 Coins</div>
                          </div>
                          <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 8px;">
                              <div style="color: #8B5CF6; font-size: 24px; font-weight: bold;">${latest.gems.toLocaleString()}</div>
                              <div style="color: rgba(255,255,255,0.7); font-size: 12px;">💎 Gems</div>
                          </div>
                          <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 8px;">
                              <div style="color: #10B981; font-size: 24px; font-weight: bold;">${latest.seeds}</div>
                              <div style="color: rgba(255,255,255,0.7); font-size: 12px;">🌱 Seeds</div>
                          </div>
                      </div>
                  </div>
              `;
      }

      setupDashboardHandlers(context = document) {
        // Resource dashboard handlers
      }
    }

    // Create global instance
    window.resourceDashboard = new ResourceDashboard();

    // setupAbilitiesTabHandlers is defined later in file (line ~16772)

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
    };

    // Forward declaration (initialized later in ability log display optimization)
    let lastLogCount;

    function setupAbilitiesTabHandlers(context = document) {
      debugLog(
        "ABILITY_LOGS",
        "Setting up abilities tab handlers with context",
        {
          isDocument: context === document,
          className: context.className || "document",
        },
      );

      // Filter mode switching
      const categoriesBtn = context.querySelector("#filter-mode-categories");
      const byPetBtn = context.querySelector("#filter-mode-bypet");
      const customBtn = context.querySelector("#filter-mode-custom");

      if (categoriesBtn && !categoriesBtn.hasAttribute("data-handler-setup")) {
        categoriesBtn.setAttribute("data-handler-setup", "true");
        categoriesBtn.addEventListener("click", () =>
          switchFilterMode("categories"),
        );
      }
      if (byPetBtn && !byPetBtn.hasAttribute("data-handler-setup")) {
        byPetBtn.setAttribute("data-handler-setup", "true");
        byPetBtn.addEventListener("click", () => switchFilterMode("byPet"));
      }
      if (customBtn && !customBtn.hasAttribute("data-handler-setup")) {
        customBtn.setAttribute("data-handler-setup", "true");
        customBtn.addEventListener("click", () => switchFilterMode("custom"));
      }

      // All/None filter buttons (context-aware)
      const selectAllBtn = context.querySelector("#select-all-filters");
      const selectNoneBtn = context.querySelector("#select-none-filters");

      if (selectAllBtn && !selectAllBtn.hasAttribute("data-handler-setup")) {
        selectAllBtn.setAttribute("data-handler-setup", "true");
        selectAllBtn.addEventListener("click", () => {
          const mode = UnifiedState.data.filterMode || "categories";
          selectAllFilters(mode);
        });
      }

      if (selectNoneBtn && !selectNoneBtn.hasAttribute("data-handler-setup")) {
        selectNoneBtn.setAttribute("data-handler-setup", "true");
        selectNoneBtn.addEventListener("click", () => {
          const mode = UnifiedState.data.filterMode || "categories";
          selectNoneFilters(mode);
        });
      }

      // Category filter checkboxes - USE CONTEXT-AWARE SELECTORS
      context
        .querySelectorAll("#category-filters .mga-checkbox[data-filter]")
        .forEach((checkbox) => {
          if (!checkbox.hasAttribute("data-handler-setup")) {
            checkbox.setAttribute("data-handler-setup", "true");
            checkbox.addEventListener("change", (e) => {
              const filterKey = e.target.dataset.filter;
              UnifiedState.data.abilityFilters[filterKey] = e.target.checked;
              MGA_saveJSON(
                "MGA_abilityFilters",
                UnifiedState.data.abilityFilters,
              );

              // PERFORMANCE: Use CSS visibility toggle instead of DOM rebuild
              updateAllLogVisibility();
              debugLog(
                "ABILITY_LOGS",
                `Filter ${filterKey} changed to ${e.target.checked}, updated visibility via CSS`,
              );
            });
          }
        });

      // Basic action buttons
      const clearLogsBtn = context.querySelector("#clear-logs-btn");
      if (clearLogsBtn && !clearLogsBtn.hasAttribute("data-handler-setup")) {
        clearLogsBtn.setAttribute("data-handler-setup", "true");
        clearLogsBtn.addEventListener("click", () => {
          logDebug(
            "ABILITY-LOGS",
            "Starting comprehensive ability log clear...",
          );

          // BEFORE CLEAR: Show what exists in each storage
          const beforeClear = {
            memory: UnifiedState.data.petAbilityLogs?.length || 0,
            gmMain: (() => {
              try {
                const v = GM_getValue("MGA_petAbilityLogs", null);
                return v ? JSON.parse(v).length : 0;
              } catch (e) {
                return 0;
              }
            })(),
            gmArchive: (() => {
              try {
                const v = GM_getValue("MGA_petAbilityLogs_archive", null);
                return v ? JSON.parse(v).length : 0;
              } catch (e) {
                return 0;
              }
            })(),
            lsMain: (() => {
              try {
                const v = window.localStorage?.getItem("MGA_petAbilityLogs");
                return v ? JSON.parse(v).length : 0;
              } catch (e) {
                return 0;
              }
            })(),
            lsArchive: (() => {
              try {
                const v = window.localStorage?.getItem(
                  "MGA_petAbilityLogs_archive",
                );
                return v ? JSON.parse(v).length : 0;
              } catch (e) {
                return 0;
              }
            })(),
          };

          logDebug(
            "ABILITY-LOGS",
            "📊 BEFORE CLEAR - Log counts:",
            beforeClear,
          );

          // Show individual logs from memory (to identify which one won't delete)
          if (UnifiedState.data.petAbilityLogs?.length > 0) {
            logDebug("ABILITY-LOGS", "📋 Current logs in memory:");
            UnifiedState.data.petAbilityLogs.forEach((log, i) => {
              logDebug(
                "ABILITY-LOGS",
                `  ${i + 1}. ${log.abilityType} - ${log.petName} - ${new Date(log.timestamp).toLocaleString()}`,
              );
            });
          }

          // 1. Clear memory
          UnifiedState.data.petAbilityLogs = [];
          logDebug("ABILITY-LOGS", "  ✓ Cleared UnifiedState memory");

          // 2. Clear GM storage (Tampermonkey)
          MGA_saveJSON("MGA_petAbilityLogs", []);
          MGA_saveJSON("MGA_petAbilityLogs_archive", []);
          logDebug("ABILITY-LOGS", "  ✓ Cleared GM storage (main + archive)");

          // 3. Clear window.localStorage directly (bypass sync logic)
          try {
            window.localStorage?.removeItem("MGA_petAbilityLogs");
            window.localStorage?.removeItem("MGA_petAbilityLogs_archive");
            logDebug("ABILITY-LOGS", "  ✓ Cleared window.localStorage");
          } catch (e) {
            logWarn(
              "ABILITY-LOGS",
              "  ⚠️ Could not clear window.localStorage:",
              e.message,
            );
          }

          // 4. Clear targetWindow.localStorage (if different from window)
          try {
            if (
              typeof targetWindow !== "undefined" &&
              targetWindow &&
              targetWindow !== window
            ) {
              targetWindow.localStorage?.removeItem("MGA_petAbilityLogs");
              targetWindow.localStorage?.removeItem(
                "MGA_petAbilityLogs_archive",
              );
              logDebug("ABILITY-LOGS", "  ✓ Cleared targetWindow.localStorage");
            }
          } catch (e) {
            logWarn(
              "ABILITY-LOGS",
              "  ⚠️ Could not clear targetWindow.localStorage:",
              e.message,
            );
          }

          // 5. Clear compatibility array
          try {
            if (typeof window.petAbilityLogs !== "undefined") {
              window.petAbilityLogs = [];
              logDebug(
                "ABILITY-LOGS",
                "  ✓ Cleared window.petAbilityLogs compatibility array",
              );
            }
          } catch (e) {
            logWarn(
              "ABILITY-LOGS",
              "  ⚠️ Could not clear compatibility array:",
              e.message,
            );
          }

          // 6. Set comprehensive clear flags with timestamp-based session lock
          const clearTimestamp = Date.now();
          localStorage.setItem(
            "MGA_logs_manually_cleared",
            clearTimestamp.toString(),
          );
          localStorage.setItem(
            "MGA_logs_clear_session",
            clearTimestamp.toString(),
          );
          try {
            GM_setValue("MGA_logs_manually_cleared", clearTimestamp.toString());
          } catch (e) {
            logWarn(
              "ABILITY-LOGS",
              "  ⚠️ Could not set GM clear flag:",
              e.message,
            );
          }
          logDebug(
            "ABILITY-LOGS",
            "  ✓ Set manual clear flags (session + GM + timestamp)",
          );

          // 7. AFTER CLEAR: Comprehensive verification
          const verifyMain = MGA_loadJSON("MGA_petAbilityLogs", null);
          const verifyArchive = MGA_loadJSON(
            "MGA_petAbilityLogs_archive",
            null,
          );
          const verifyLS = window.localStorage?.getItem("MGA_petAbilityLogs");
          const verifyCompat =
            typeof window.petAbilityLogs !== "undefined"
              ? window.petAbilityLogs?.length
              : "N/A";

          // Recount all sources after clear
          const afterClear = {
            memory: UnifiedState.data.petAbilityLogs?.length || 0,
            gmMain: verifyMain?.length || 0,
            gmArchive: verifyArchive?.length || 0,
            lsMain: verifyLS
              ? (() => {
                  try {
                    return JSON.parse(verifyLS).length;
                  } catch (e) {
                    return "parse-error";
                  }
                })()
              : 0,
            lsArchive: (() => {
              try {
                const v = window.localStorage?.getItem(
                  "MGA_petAbilityLogs_archive",
                );
                return v ? JSON.parse(v).length : 0;
              } catch (e) {
                return 0;
              }
            })(),
            compatArray: verifyCompat,
          };

          logDebug("ABILITY-LOGS", "📊 AFTER CLEAR - Log counts:", afterClear);
          logDebug("ABILITY-LOGS", "📊 COMPARISON:", {
            before: beforeClear,
            after: afterClear,
            clearedFlag: localStorage.getItem("MGA_logs_manually_cleared"),
          });

          // If ANY logs remain, show which ones
          const totalRemaining = Object.values(afterClear).reduce(
            (sum, val) => sum + (typeof val === "number" ? val : 0),
            0,
          );

          if (totalRemaining > 0) {
            productionWarn(
              `⚠️ [ABILITIES] ${totalRemaining} log(s) persist after clear!`,
            );
            logDebug(
              "ABILITY-LOGS",
              "🔍 Logs that persisted - check these sources:",
              afterClear,
            );

            // Show which specific logs remain (if any)
            if (verifyMain && verifyMain.length > 0) {
              logDebug("ABILITY-LOGS", "❌ PERSISTENT LOGS IN GM STORAGE:");
              verifyMain.forEach((log, i) => {
                logDebug(
                  "ABILITY-LOGS",
                  `  ${i + 1}. ${log.abilityType} - ${log.petName} - ${new Date(log.timestamp).toLocaleString()}`,
                );
              });
            }
          } else {
            productionLog(
              "✅ [ABILITIES] Successfully cleared all ability logs from all storage locations",
            );
          }

          lastLogCount = 0; // Reset log count tracker
          updateTabContent();
          updateAllAbilityLogDisplays();
        });
      }

      const exportLogsBtn = context.querySelector("#export-logs-btn");
      if (exportLogsBtn && !exportLogsBtn.hasAttribute("data-handler-setup")) {
        exportLogsBtn.setAttribute("data-handler-setup", "true");
        exportLogsBtn.addEventListener("click", () => {
          exportAbilityLogs();
        });
      }

      // Diagnose logs button (only visible when debug mode is enabled)
      const diagnoseLogsBtn = context.querySelector("#diagnose-logs-btn");
      if (
        diagnoseLogsBtn &&
        !diagnoseLogsBtn.hasAttribute("data-handler-setup")
      ) {
        diagnoseLogsBtn.setAttribute("data-handler-setup", "true");
        diagnoseLogsBtn.addEventListener("click", () => {
          productionLog("🔍 Running ability logs storage diagnostic...");
          const report = MGA_diagnoseAbilityLogStorage();

          // Show a user-friendly notification
          const totalWithLogs = report.summary.totalLocationsWithLogs;
          if (totalWithLogs === 0) {
            showNotificationToast(
              "✅ No ability logs found in any storage location",
              "success",
            );
          } else {
            showNotificationToast(
              `📊 Found logs in ${totalWithLogs} storage location(s). Check console for details.`,
              "info",
            );
          }
        });
      }

      // Detailed timestamps checkbox
      const detailedTimestampsCheckbox = context.querySelector(
        "#detailed-timestamps-checkbox",
      );
      if (
        detailedTimestampsCheckbox &&
        !detailedTimestampsCheckbox.hasAttribute("data-handler-setup")
      ) {
        detailedTimestampsCheckbox.setAttribute("data-handler-setup", "true");
        detailedTimestampsCheckbox.addEventListener("change", (e) => {
          UnifiedState.data.settings.detailedTimestamps = e.target.checked;
          MGA_saveJSON("MGA_data", UnifiedState.data);

          // Clear timestamp cache and force full rebuild for timestamp format change
          // eslint-disable-next-line no-use-before-define -- cache is initialized below; usage occurs after init at runtime
          MGA_AbilityCache.timestamps.clear();

          // BUGFIX: Force overlay refresh to show new timestamp format
          // Update all overlays first to ensure they show the new format
          UnifiedState.data.popouts.overlays.forEach((overlay, tabName) => {
            if (
              tabName === "abilities" &&
              overlay &&
              overlay.offsetParent !== null
            ) {
              updateAbilityLogDisplay(overlay);
              debugLog(
                "ABILITY_LOGS",
                "Updated overlay with new timestamp format",
              );
            }
          });

          // Then update main displays
          updateAllAbilityLogDisplays(true);
          productionLog(
            `🕐 [ABILITIES] Detailed timestamps: ${e.target.checked ? "enabled" : "disabled"}`,
          );
        });
      }

      // Test Abilities button removed - function kept for potential debugging use

      // Initialize the current filter mode display
      const currentMode = UnifiedState.data.filterMode || "categories";
      setTimeout(() => populateFilterModeContent(currentMode), 100);
    }

    // PERFORMANCE OPTIMIZATION: Caching for expensive operations
    const MGA_AbilityCache = {
      categories: new Map(),
      timestamps: new Map(),
      normalizedNames: new Map(),
      lastTimestampUpdate: 0,
    };

    // Clear timestamp cache every minute (timestamps change over time)
    setInterval(() => {
      MGA_AbilityCache.timestamps.clear();
      MGA_AbilityCache.lastTimestampUpdate = Date.now();
    }, 60000);

    // Comprehensive ability categorization logic based on Pet Ability Logs 4
    function categorizeAbility(abilityType) {
      const cleanType = (abilityType || "").toLowerCase();

      // 💫 XP Boost (for pet experience)
      if (cleanType.includes("xp") && cleanType.includes("boost")) {
        return "xp-boost";
      }
      if (cleanType.includes("hatch") && cleanType.includes("xp")) {
        return "xp-boost";
      }

      // 📈 Crop Size Boost (for scaling crops)
      if (
        cleanType.includes("crop") &&
        (cleanType.includes("size") || cleanType.includes("scale"))
      ) {
        return "crop-size-boost";
      }

      // 💰 Selling (for selling crops/pets)
      if (cleanType.includes("sell") && cleanType.includes("boost")) {
        return "selling";
      }
      if (cleanType.includes("refund")) {
        return "selling";
      }

      // 🌾 Harvesting (for harvesting crops)
      if (cleanType.includes("double") && cleanType.includes("harvest")) {
        return "harvesting";
      }

      // 🐢 Growth Speed (plant and egg growth)
      if (cleanType.includes("growth") && cleanType.includes("boost")) {
        return "growth-speed";
      }
      if (cleanType.includes("plant") && cleanType.includes("growth")) {
        return "growth-speed";
      }
      if (cleanType.includes("egg") && cleanType.includes("growth")) {
        return "growth-speed";
      }

      // 🌈✨ Special Mutations (Rainbow/Gold conversion)
      if (cleanType.includes("rainbow") || cleanType.includes("gold")) {
        return "special-mutations";
      }

      // 🔧 Other (passive abilities, pet management, etc.)
      return "other";
    }

    function updateAbilityLogDisplay(context = document) {
      const abilityLogs = context.querySelector("#ability-logs");
      if (!abilityLogs) {
        debugLog("ABILITY_LOGS", "No ability logs element found in context", {
          isDocument: context === document,
          className: context.className || "unknown",
        });
        return;
      }

      // Preserve drag state if this is a content-only overlay being updated
      const isOverlay = context.classList?.contains("mga-overlay-content-only");
      const isDragInProgress =
        context.getAttribute?.("data-dragging") === "true";
      if (isOverlay && isDragInProgress) {
        debugLog(
          "ABILITY_LOGS",
          "Skipping content update during drag operation",
          {
            overlayId: context.id,
          },
        );
        return;
      }

      const logs = MGA_getAllLogs(); // Show all logs including archived - user requested 100% persistence
      const filteredLogs = logs.filter((log) => {
        return shouldLogAbility(log.abilityType, log.petName);
      });

      debugLog("ABILITY_LOGS", "Updating ability log display", {
        totalLogs: logs.length,
        filteredLogs: filteredLogs.length,
        filterMode: UnifiedState.data.filterMode,
      });

      // Diagnostic logging for FIX_VALIDATION
      if (CONFIG.DEBUG.FLAGS.FIX_VALIDATION) {
        productionLog("[FIX_ABILITY_LOGS] Update called:", {
          totalLogs: logs.length,
          filteredLogs: filteredLogs.length,
          filterMode: UnifiedState.data.filterMode,
          elementFound: !!abilityLogs,
          contextType: context === document ? "document" : "overlay",
        });
      }

      const htmlParts = [];
      filteredLogs.forEach((log, index) => {
        const category = categorizeAbilityToFilterKey(log.abilityType);
        const categoryData = {
          xpBoost: { icon: "💫", color: "#4a9eff", label: "XP Boost" },
          cropSizeBoost: { icon: "📈", color: "#10b981", label: "Crop Size" },
          selling: { icon: "💰", color: "#f59e0b", label: "Selling" },
          harvesting: { icon: "🌾", color: "#84cc16", label: "Harvesting" },
          growthSpeed: { icon: "🐢", color: "#06b6d4", label: "Growth Speed" },
          specialMutations: {
            icon: "🌈✨",
            color: "#8b5cf6",
            label: "Special",
          },
          other: { icon: "🔧", color: "#6b7280", label: "Other" },
        };

        const catData = categoryData[category] || categoryData.other;
        const formattedTime = formatTimestamp(log.timestamp);
        const isRecent = Date.now() - log.timestamp < 10000; // Less than 10 seconds ago
        const displayAbilityName = normalizeAbilityName(log.abilityType);

        htmlParts.push(`
                  <div class="mga-log-item ${isRecent ? "mga-log-recent" : ""}" data-category="${category}" data-ability-type="${log.abilityType}" data-pet-name="${log.petName}" style="--category-color: ${catData.color}">
                      <div class="mga-log-header">
                          <span class="mga-log-icon">${catData.icon}</span>
                          <span class="mga-log-meta">
                              <span class="mga-log-pet" style="color: ${catData.color}; font-weight: 600;">${log.petName}</span>
                              <span class="mga-log-time">${formattedTime}</span>
                          </span>
                      </div>
                      <div class="mga-log-ability">${displayAbilityName}</div>
                      ${
                        log.data && Object.keys(log.data).length > 0
                          ? `<div class="mga-log-details">${formatLogData(log.data)}</div>`
                          : ""
                      }
                  </div>
              `);
      });

      // PERFORMANCE: Use DocumentFragment for batch DOM updates
      const fragment = targetDocument.createDocumentFragment();
      const tempContainer = targetDocument.createElement("div");

      if (htmlParts.length === 0) {
        const mode = UnifiedState.data.filterMode || "categories";
        const modeText =
          mode === "categories"
            ? "category filters"
            : mode === "byPet"
              ? "pet filters"
              : "custom filters";
        tempContainer.innerHTML = `<div class="mga-log-empty">
                  <div style="color: #888; text-align: center; padding: 20px;">
                      <div style="font-size: 24px; margin-bottom: 8px;">📋</div>
                      <div>No abilities match the current ${modeText}</div>
                      <div style="font-size: 11px; margin-top: 4px; opacity: 0.7;">Try adjusting your filter settings</div>
                  </div>
              </div>`;
      } else {
        tempContainer.innerHTML = htmlParts.join("");
        // Auto-scroll to newest if there are new entries
        setTimeout(() => {
          if (abilityLogs.scrollHeight > abilityLogs.clientHeight) {
            abilityLogs.scrollTop = 0; // Scroll to top (newest entries)
          }
        }, 100);
      }

      // Move all children to fragment, then update DOM once
      while (tempContainer.firstChild) {
        fragment.appendChild(tempContainer.firstChild);
      }

      abilityLogs.innerHTML = "";
      abilityLogs.appendChild(fragment);

      // Add enhanced log styles if not already present
      if (!context.querySelector("#mga-log-styles")) {
        const logStyles = targetDocument.createElement("style");
        logStyles.id = "mga-log-styles";
        logStyles.textContent = `
                  .mga-log-item {
                      margin: 4px 0;
                      padding: 8px;
                      border-radius: 4px;
                      background: rgba(255, 255, 255, 0.02);
                      border-left: 2px solid var(--category-color, #6b7280);
                      transition: all 0.2s ease;
                      font-size: 11px;
                      line-height: 1.3;
                  }

                  .mga-log-item:hover {
                      background: rgba(255, 255, 255, 0.05);
                      transform: translateX(2px);
                  }

                  .mga-log-recent {
                      background: rgba(74, 158, 255, 0.30);
                      border-color: #4a9eff;
                      box-shadow: 0 0 8px rgba(74, 158, 255, 0.3);
                      animation: mgaLogPulse 2s ease-out;
                  }

                  @keyframes mgaLogPulse {
                      0% { box-shadow: 0 0 8px rgba(74, 158, 255, 0.6); }
                      100% { box-shadow: 0 0 8px rgba(74, 158, 255, 0.3); }
                  }

                  .mga-log-header {
                      display: flex;
                      align-items: center;
                      gap: 6px;
                      margin-bottom: 2px;
                  }

                  .mga-log-icon {
                      font-size: 12px;
                  }

                  .mga-log-meta {
                      display: flex;
                      align-items: center;
                      gap: 8px;
                      flex: 1;
                  }

                  .mga-log-pet {
                      font-weight: 600;
                      font-size: 11px;
                  }

                  .mga-log-time {
                      font-size: 9px;
                      color: rgba(255, 255, 255, 0.6);
                      margin-left: auto;
                  }

                  .mga-log-ability {
                      color: rgba(255, 255, 255, 0.9);
                      font-size: 10px;
                      margin: 2px 0 0 18px;
                  }

                  .mga-log-details {
                      font-size: 9px;
                      color: rgba(255, 255, 255, 0.5);
                      margin: 2px 0 0 18px;
                      font-style: italic;
                  }

                  .mga-log-empty {
                      text-align: center;
                      padding: 20px;
                      color: #888;
                  }
              `;
        (
          context.head ||
          context.querySelector("head") ||
          targetDocument.head
        ).appendChild(logStyles);
      }
    }

    function formatRelativeTime(timestamp) {
      const now = Date.now();
      const diff = now - timestamp;

      if (diff < 60000) {
        // Less than 1 minute
        const seconds = Math.floor(diff / 1000);
        return `${seconds}s ago`;
      } else if (diff < 3600000) {
        // Less than 1 hour
        const minutes = Math.floor(diff / 60000);
        return `${minutes}m ago`;
      } else if (diff < 86400000) {
        // Less than 1 day
        const hours = Math.floor(diff / 3600000);
        return `${hours}h ago`;
      } else {
        return new Date(timestamp).toLocaleDateString();
      }
    }

    function formatLogData(data) {
      if (!data || typeof data !== "object") return "";

      const formatted = Object.entries(data)
        .filter(([key, value]) => value !== null && value !== undefined)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");

      return formatted.length > 60
        ? formatted.substring(0, 60) + "..."
        : formatted;
    }

    // Update ability logs across ALL overlays and contexts
    // OPTIMIZED: Track log count to skip unnecessary updates (declared earlier at top scope)
    lastLogCount = 0;

    function updateAllAbilityLogDisplays(force = false) {
      // OPTIMIZED: Skip if no new logs (unless forced by settings change)
      const currentLogCount = UnifiedState.data.petAbilityLogs?.length || 0;

      // Debug logging for ability logs
      if (CONFIG.DEBUG.FLAGS.FIX_VALIDATION) {
        productionLog("[FIX_ABILITY_LOGS] Update called:", {
          force,
          currentLogCount,
          lastLogCount,
          willUpdate: force || currentLogCount !== lastLogCount,
          petAbilityLogsExists: !!UnifiedState.data.petAbilityLogs,
        });
      }

      if (!force && currentLogCount === lastLogCount) {
        debugLog("ABILITY_LOGS", "Skipping update - no new logs");
        return;
      }
      lastLogCount = currentLogCount;

      debugLog("ABILITY_LOGS", "Updating ability logs across all contexts");

      // Update main document context
      updateAbilityLogDisplay(document);

      // OPTIMIZED: Only query DOM once and filter for visible overlays and widgets
      const allOverlays = targetDocument.querySelectorAll(
        ".mga-overlay-content-only, .mga-overlay, .mgh-popout",
      );
      allOverlays.forEach((overlay) => {
        // Skip if hidden
        if (overlay.offsetParent === null) return;

        if (overlay.querySelector("#ability-logs")) {
          updateAbilityLogDisplay(overlay);
          debugLog("ABILITY_LOGS", "Updated overlay/widget ability logs", {
            overlayId: overlay.id || overlay.className,
          });
        }
      });

      // BUGFIX: Update separate window pop-outs in real-time
      UnifiedState.data.popouts.windows.forEach((windowRef, tabName) => {
        if (windowRef && !windowRef.closed && tabName === "abilities") {
          try {
            // Method 1: Direct DOM manipulation (most reliable)
            const popoutContent =
              windowRef.document?.getElementById("popout-content");
            if (popoutContent) {
              // Get fresh content from main window
              const freshContent = getAbilitiesTabContent();
              popoutContent.innerHTML = freshContent;

              // Re-run handlers in the pop-out window context
              if (typeof setupAbilitiesTabHandlers === "function") {
                setupAbilitiesTabHandlers.call(window, windowRef.document);
              }
              debugLog(
                "ABILITY_LOGS",
                "Updated pop-out via direct DOM manipulation",
              );
            } else {
              debugLog(
                "ABILITY_LOGS",
                "Pop-out content element not found, trying fallback",
              );

              // Fallback: Try to call the refresh function if it exists
              if (
                windowRef.refreshPopoutContent &&
                typeof windowRef.refreshPopoutContent === "function"
              ) {
                windowRef.refreshPopoutContent("abilities");
                debugLog(
                  "ABILITY_LOGS",
                  "Updated pop-out via refresh function",
                );
              }
            }
          } catch (e) {
            debugLog(
              "ABILITY_LOGS",
              "Error updating separate window:",
              e.message,
            );

            // Last resort: Force reload (disruptive but ensures fresh data)
            try {
              windowRef.location.reload();
              debugLog("ABILITY_LOGS", "Forced pop-out refresh via reload");
            } catch (e2) {
              // Window is truly dead, clean up reference
              debugLog("ABILITY_LOGS", "Window is dead, removing reference");
              UnifiedState.data.popouts.windows.delete(tabName);
            }
          }
        }
      });
    }

    // PERFORMANCE OPTIMIZATION: CSS-based filtering instead of DOM rebuild
    function updateLogVisibility(context = document) {
      const abilityLogs = context.querySelector("#ability-logs");
      if (!abilityLogs) return;

      const filterMode = UnifiedState.data.filterMode || "categories";
      const logItems = abilityLogs.querySelectorAll(".mga-log-item");

      debugLog("ABILITY_LOGS", "Updating log visibility via CSS", {
        filterMode,
        totalItems: logItems.length,
      });

      logItems.forEach((item) => {
        let shouldShow = false;

        if (filterMode === "categories") {
          const category = item.dataset.category;
          shouldShow = UnifiedState.data.abilityFilters[category] || false;
        } else if (filterMode === "byPet") {
          const petName = item.dataset.petName;
          shouldShow =
            UnifiedState.data.petFilters.selectedPets[petName] || false;
        } else if (filterMode === "custom") {
          const abilityType = item.dataset.abilityType;
          shouldShow =
            UnifiedState.data.customAbilityFilters[abilityType] || false;
        }

        item.style.display = shouldShow ? "" : "none";
      });
    }

    // Apply visibility update to all contexts
    function updateAllLogVisibility() {
      debugLog("ABILITY_LOGS", "Updating log visibility across all contexts");

      updateLogVisibility(document);

      const allOverlays = targetDocument.querySelectorAll(
        ".mga-overlay-content-only, .mga-overlay",
      );
      allOverlays.forEach((overlay) => {
        if (overlay.offsetParent === null) return;
        if (overlay.querySelector("#ability-logs")) {
          updateLogVisibility(overlay);
        }
      });
    }

    function addTestAbilities() {
      const testLogs = [
        // 💫 XP Boost
        {
          petName: "Goat",
          abilityType: "XP Boost I",
          timestamp: Date.now() - 1000,
        },
        {
          petName: "Peacock",
          abilityType: "XP Boost II",
          timestamp: Date.now() - 2000,
        },
        {
          petName: "Pig",
          abilityType: "Hatch XP Boost I",
          timestamp: Date.now() - 3000,
        },
        {
          petName: "Goat",
          abilityType: "Hatch XP Boost II",
          timestamp: Date.now() - 4000,
        },

        // 📈 Crop Size Boost
        {
          petName: "Bee",
          abilityType: "Crop Size Boost I",
          timestamp: Date.now() - 5000,
        },
        {
          petName: "Butterfly",
          abilityType: "Crop Size Boost II",
          timestamp: Date.now() - 6000,
        },

        // 💰 Selling
        {
          petName: "Bunny",
          abilityType: "Sell Boost I",
          timestamp: Date.now() - 7000,
        },
        {
          petName: "Pig",
          abilityType: "Sell Boost II",
          timestamp: Date.now() - 8000,
        },
        {
          petName: "Squirrel",
          abilityType: "Sell Boost III",
          timestamp: Date.now() - 9000,
        },
        {
          petName: "Peacock",
          abilityType: "Sell Boost IV",
          timestamp: Date.now() - 10000,
        },
        {
          petName: "Capybara",
          abilityType: "Crop Refund",
          timestamp: Date.now() - 11000,
        },
        {
          petName: "Chicken",
          abilityType: "Pet Refund I",
          timestamp: Date.now() - 12000,
        },

        // 🌾 Harvesting
        {
          petName: "Capybara",
          abilityType: "Double Harvest",
          timestamp: Date.now() - 13000,
        },

        // 🐢 Growth Speed
        {
          petName: "Cow",
          abilityType: "Plant Growth Boost I",
          timestamp: Date.now() - 14000,
        },
        {
          petName: "Turtle",
          abilityType: "Plant Growth Boost II",
          timestamp: Date.now() - 15000,
        },
        {
          petName: "Chicken",
          abilityType: "Egg Growth Boost I",
          timestamp: Date.now() - 16000,
        },
        {
          petName: "Turtle",
          abilityType: "Egg Growth Boost II",
          timestamp: Date.now() - 17000,
        },

        // 🌈✨ Special Mutations
        {
          petName: "Test Pet",
          abilityType: "Rainbow Granter",
          timestamp: Date.now() - 18000,
        },
        {
          petName: "Test Pet",
          abilityType: "Gold Granter",
          timestamp: Date.now() - 19000,
        },

        // 🔧 Other
        {
          petName: "Snail",
          abilityType: "Coin Finder I",
          timestamp: Date.now() - 20000,
        },
        {
          petName: "Bunny",
          abilityType: "Coin Finder II",
          timestamp: Date.now() - 21000,
        },
        {
          petName: "Squirrel",
          abilityType: "Coin Finder III",
          timestamp: Date.now() - 22000,
        },
        {
          petName: "Worm",
          abilityType: "Seed Finder I",
          timestamp: Date.now() - 23000,
        },
        {
          petName: "Cow",
          abilityType: "Seed Finder II",
          timestamp: Date.now() - 24000,
        },
        {
          petName: "Butterfly",
          abilityType: "Seed Finder III",
          timestamp: Date.now() - 25000,
        },
        {
          petName: "Worm",
          abilityType: "Crop Eater",
          timestamp: Date.now() - 26000,
        },
        {
          petName: "Cow",
          abilityType: "Hunger Boost I",
          timestamp: Date.now() - 27000,
        },
        {
          petName: "Turtle",
          abilityType: "Hunger Boost II",
          timestamp: Date.now() - 28000,
        },
        {
          petName: "Pig",
          abilityType: "Max Strength Boost I",
          timestamp: Date.now() - 29000,
        },
        {
          petName: "Goat",
          abilityType: "Max Strength Boost II",
          timestamp: Date.now() - 30000,
        },
      ];

      testLogs.forEach((log) => {
        log.timeString = new Date(log.timestamp).toLocaleTimeString();
        UnifiedState.data.petAbilityLogs.unshift(log);
      });

      // Apply memory management to keep recent logs in memory, archive older ones
      UnifiedState.data.petAbilityLogs = MGA_manageLogMemory(
        UnifiedState.data.petAbilityLogs,
      );

      // Use debounced save to reduce I/O operations
      // Only save if not in clear session
      const clearSession = localStorage.getItem("MGA_logs_clear_session");
      if (!clearSession || Date.now() - parseInt(clearSession, 10) > 86400000) {
        MGA_debouncedSave(
          "MGA_petAbilityLogs",
          UnifiedState.data.petAbilityLogs,
        );
      } else {
        logDebug("ABILITY-LOGS", "⏸️ Skipping save - clear session active");
      }
      productionLog(
        "Added comprehensive test abilities covering all 7 categories!",
      );
    }

    // PAL4 Filter System Functions
    function switchFilterMode(mode) {
      UnifiedState.data.filterMode = mode;
      MGA_saveJSON("MGA_filterMode", mode);

      // Update button states
      targetDocument
        .querySelectorAll('[id^="filter-mode-"]')
        .forEach((btn) => btn.classList.remove("active"));
      document
        .getElementById(`filter-mode-${mode === "byPet" ? "bypet" : mode}`)
        ?.classList.add("active");

      // Update description
      const descriptions = {
        categories: "Filter by ability categories",
        byPet: "Filter by pet species",
        custom: "Filter by individual abilities",
      };
      const descEl = document.getElementById("filter-mode-description");
      if (descEl) descEl.textContent = descriptions[mode];

      // Show/hide appropriate filter sections
      document.getElementById("category-filters").style.display =
        mode === "categories" ? "grid" : "none";
      document.getElementById("pet-filters").style.display =
        mode === "byPet" ? "block" : "none";
      document.getElementById("custom-filters").style.display =
        mode === "custom" ? "block" : "none";

      // Populate content for the selected mode
      populateFilterModeContent(mode);
      // PERFORMANCE: Use CSS visibility toggle instead of DOM rebuild
      updateAllLogVisibility();
    }

    function populateFilterModeContent(mode) {
      if (mode === "byPet") {
        populatePetSpeciesList();
      } else if (mode === "custom") {
        populateIndividualAbilities();
      }
    }

    function populatePetSpeciesList() {
      const container = document.getElementById("pet-species-list");
      if (!container) return;

      const pets = getAllUniquePets();
      container.innerHTML = "";

      if (pets.length === 0) {
        container.innerHTML =
          '<div style="color: #888; text-align: center;">No pet species found in logs</div>';
        return;
      }

      pets.forEach((pet) => {
        const label = targetDocument.createElement("label");
        label.className = "mga-checkbox-group";
        label.style.display = "block";
        label.style.marginBottom = "4px";

        const checkbox = targetDocument.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "mga-checkbox";
        checkbox.checked =
          UnifiedState.data.petFilters.selectedPets[pet] || false;

        checkbox.addEventListener("change", (e) => {
          UnifiedState.data.petFilters.selectedPets[pet] = e.target.checked;
          MGA_saveJSON("MGA_petFilters", UnifiedState.data.petFilters);
          // PERFORMANCE: Use CSS visibility toggle instead of DOM rebuild
          updateAllLogVisibility();
        });

        const span = targetDocument.createElement("span");
        span.className = "mga-label";
        span.textContent = ` ${pet}`;

        label.appendChild(checkbox);
        label.appendChild(span);
        container.appendChild(label);
      });
    }

    function populateIndividualAbilities() {
      const container = document.getElementById("individual-abilities-list");
      if (!container) return;

      const abilities = getAllUniqueAbilities();
      container.innerHTML = "";

      if (abilities.length === 0) {
        container.innerHTML =
          '<div style="color: #888; text-align: center;">No individual abilities found in logs</div>';
        return;
      }

      abilities.forEach((ability) => {
        const label = targetDocument.createElement("label");
        label.className = "mga-checkbox-group";
        label.style.display = "block";
        label.style.marginBottom = "4px";

        const checkbox = targetDocument.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "mga-checkbox";
        checkbox.checked =
          UnifiedState.data.customMode.selectedAbilities[ability] || false;

        checkbox.addEventListener("change", (e) => {
          UnifiedState.data.customMode.selectedAbilities[ability] =
            e.target.checked;
          MGA_saveJSON("MGA_customMode", UnifiedState.data.customMode);
          // PERFORMANCE: Use CSS visibility toggle instead of DOM rebuild
          updateAllLogVisibility();
        });

        const span = targetDocument.createElement("span");
        span.className = "mga-label";
        span.textContent = ` ${normalizeAbilityName(ability)}`;

        label.appendChild(checkbox);
        label.appendChild(span);
        container.appendChild(label);
      });
    }

    function getAllUniquePets() {
      const pets = new Set();
      UnifiedState.data.petAbilityLogs.forEach((log) => {
        if (log.petName && log.petName !== "Test Pet") {
          pets.add(log.petName);
        }
      });
      return Array.from(pets).sort();
    }

    function getAllUniqueAbilities() {
      const abilities = new Set();
      UnifiedState.data.petAbilityLogs.forEach((log) => {
        if (log.abilityType) {
          abilities.add(log.abilityType);
        }
      });
      return Array.from(abilities).sort();
    }

    function selectAllFilters(mode) {
      if (mode === "categories") {
        Object.keys(UnifiedState.data.abilityFilters).forEach((key) => {
          UnifiedState.data.abilityFilters[key] = true;
          const checkbox = targetDocument.querySelector(
            `[data-filter="${key}"]`,
          );
          if (checkbox) checkbox.checked = true;
        });
        MGA_saveJSON("MGA_abilityFilters", UnifiedState.data.abilityFilters);
      } else if (mode === "byPet") {
        const pets = getAllUniquePets();
        pets.forEach((pet) => {
          UnifiedState.data.petFilters.selectedPets[pet] = true;
        });
        MGA_saveJSON("MGA_petFilters", UnifiedState.data.petFilters);
        populatePetSpeciesList();
      } else if (mode === "custom") {
        const abilities = getAllUniqueAbilities();
        abilities.forEach((ability) => {
          UnifiedState.data.customMode.selectedAbilities[ability] = true;
        });
        MGA_saveJSON("MGA_customMode", UnifiedState.data.customMode);
        populateIndividualAbilities();
      }
      // PERFORMANCE: Use CSS visibility toggle instead of DOM rebuild
      updateAllLogVisibility();
    }

    function selectNoneFilters(mode) {
      if (mode === "categories") {
        Object.keys(UnifiedState.data.abilityFilters).forEach((key) => {
          UnifiedState.data.abilityFilters[key] = false;
          const checkbox = targetDocument.querySelector(
            `[data-filter="${key}"]`,
          );
          if (checkbox) checkbox.checked = false;
        });
        MGA_saveJSON("MGA_abilityFilters", UnifiedState.data.abilityFilters);
      } else if (mode === "byPet") {
        UnifiedState.data.petFilters.selectedPets = {};
        MGA_saveJSON("MGA_petFilters", UnifiedState.data.petFilters);
        populatePetSpeciesList();
      } else if (mode === "custom") {
        UnifiedState.data.customMode.selectedAbilities = {};
        MGA_saveJSON("MGA_customMode", UnifiedState.data.customMode);
        populateIndividualAbilities();
      }
      // PERFORMANCE: Use CSS visibility toggle instead of DOM rebuild
      updateAllLogVisibility();
    }

    // Enhanced shouldLogAbility function matching PAL4 logic
    function shouldLogAbility(abilityType, petName = null) {
      // Filter out ProduceMutationBoost abilities - user doesn't want these logged
      if (
        abilityType &&
        (abilityType.includes("ProduceMutationBoost") ||
          abilityType.includes("PetMutationBoost"))
      ) {
        return false;
      }

      const mode = UnifiedState.data.filterMode || "categories";

      if (mode === "custom") {
        return (
          UnifiedState.data.customMode.selectedAbilities[abilityType] || false
        );
      }

      if (mode === "byPet") {
        if (!petName) return false;
        return UnifiedState.data.petFilters.selectedPets[petName] || false;
      }

      // Categories mode - use existing categorizeAbility logic
      const category = categorizeAbilityToFilterKey(abilityType);
      return UnifiedState.data.abilityFilters[category] || false;
    }

    function categorizeAbilityToFilterKey(abilityType) {
      // PERFORMANCE: Check cache first
      if (MGA_AbilityCache.categories.has(abilityType)) {
        return MGA_AbilityCache.categories.get(abilityType);
      }

      const cleanType = (abilityType || "").toLowerCase();

      let category = "other";
      if (cleanType.includes("xp") && cleanType.includes("boost"))
        category = "xpBoost";
      else if (cleanType.includes("hatch") && cleanType.includes("xp"))
        category = "xpBoost";
      else if (
        cleanType.includes("crop") &&
        (cleanType.includes("size") || cleanType.includes("scale"))
      )
        category = "cropSizeBoost";
      else if (cleanType.includes("sell") && cleanType.includes("boost"))
        category = "selling";
      else if (cleanType.includes("refund")) category = "selling";
      else if (cleanType.includes("double") && cleanType.includes("harvest"))
        category = "harvesting";
      else if (cleanType.includes("growth") && cleanType.includes("boost"))
        category = "growthSpeed";
      else if (cleanType.includes("rainbow") || cleanType.includes("gold"))
        category = "specialMutations";

      // PERFORMANCE: Cache result
      MGA_AbilityCache.categories.set(abilityType, category);

      return category;
    }

    function setupSeedsTabHandlers(context = document) {
      // Seed ID mapping for initialization
      const seedIdMap = {};

      UnifiedState.plantsDatabase.forEach((plant, index) => {
        seedIdMap[plant.name] = plant.id;
      });

      context.querySelectorAll(".seed-checkbox").forEach((checkbox) => {
        // Prevent duplicate event listeners
        if (checkbox.hasAttribute("data-handler-setup")) {
          return;
        }
        checkbox.setAttribute("data-handler-setup", "true");

        // Initialize checkbox state based on saved seedsToDelete
        const seed = checkbox.dataset.seed;
        const internalId = seedIdMap[seed] || seed;
        if (UnifiedState.data.seedsToDelete.includes(internalId)) {
          checkbox.checked = true;
        }

        checkbox.addEventListener("change", (e) => {
          const seed = e.target.dataset.seed;

          // Prevent adding protected seeds to deletion list
          if (
            e.target.checked &&
            ["Starweaver", "Moonbinder", "Dawnbinder", "Sunflower"].includes(
              seed,
            )
          ) {
            e.target.checked = false;
            const seedType = seed === "Sunflower" ? "Divine" : "Celestial";
            productionWarn(
              `❌ ${seed} is a protected ${seedType} seed and cannot be deleted!`,
            );
            return;
          }

          // Map display name to internal ID for storage (using seedIdMap from function scope)
          const internalId = seedIdMap[seed] || seed;

          if (e.target.checked) {
            if (!UnifiedState.data.seedsToDelete.includes(internalId)) {
              UnifiedState.data.seedsToDelete.push(internalId);
            }
          } else {
            UnifiedState.data.seedsToDelete =
              UnifiedState.data.seedsToDelete.filter((s) => s !== internalId);
          }

          // Use safe save for critical seed selection data
          const result = MGA_safeSave(
            "MGA_seedsToDelete",
            UnifiedState.data.seedsToDelete,
            {
              description: `seed selection for "${seed}"`,
              criticalData: true,
              showUserAlert: true,
            },
          );

          if (result.success) {
            productionLog(
              `✅ [SEED-SELECTION] Successfully saved seed selection change for "${seed}"`,
            );
          } else {
            console.error(
              `❌ [SEED-SELECTION] Failed to save seed selection for "${seed}":`,
              result.error,
            );
          }

          debugLog("BUTTON_INTERACTIONS", `Seed checkbox changed: ${seed}`, {
            checked: e.target.checked,
            seedsToDelete: UnifiedState.data.seedsToDelete,
          });
        });
      });

      const autoDeleteCheckbox = context.querySelector("#auto-delete-checkbox");
      if (
        autoDeleteCheckbox &&
        !autoDeleteCheckbox.hasAttribute("data-handler-setup")
      ) {
        autoDeleteCheckbox.setAttribute("data-handler-setup", "true");
        autoDeleteCheckbox.addEventListener("change", (e) => {
          if (e.target.checked) {
            // Confirmation dialog for enabling auto-delete
            const selectedSeedsText =
              UnifiedState.data.seedsToDelete.length > 0
                ? UnifiedState.data.seedsToDelete.join(", ")
                : "No seeds currently selected";
            const confirmMessage = `⚠️ WARNING: Auto-Delete will IRREVERSIBLY delete seeds!\n\nSelected seeds for auto-deletion:\n${selectedSeedsText}\n\nAuto-delete will continuously remove these seed types from your inventory as soon as they appear. This action cannot be undone.\n\nAre you sure you want to enable Auto-Delete?`;

            if (!confirm(confirmMessage)) {
              e.target.checked = false; // Uncheck the box if user cancels
              return;
            }
          }
          UnifiedState.data.autoDeleteEnabled = e.target.checked;
          MGA_saveJSON("MGA_autoDeleteEnabled", e.target.checked);
          if (e.target.checked) {
            startAutoDelete();
          }
          debugLog(
            "BUTTON_INTERACTIONS",
            `Auto-delete toggled: ${e.target.checked}`,
          );
        });

        // Initialize checkbox state from saved settings
        autoDeleteCheckbox.checked = UnifiedState.data.autoDeleteEnabled;
        if (UnifiedState.data.autoDeleteEnabled) {
          startAutoDelete();
        }
      }

      const deleteSelectedBtn = context.querySelector("#delete-selected-btn");
      if (
        deleteSelectedBtn &&
        !deleteSelectedBtn.hasAttribute("data-handler-setup")
      ) {
        deleteSelectedBtn.setAttribute("data-handler-setup", "true");
        deleteSelectedBtn.addEventListener("click", () => {
          deleteSelectedSeeds();
          debugLog(
            "BUTTON_INTERACTIONS",
            "Delete selected seeds button clicked",
            {
              seedsToDelete: UnifiedState.data.seedsToDelete,
            },
          );
        });
      }

      // Select All Seeds Button
      const selectAllBtn = context.querySelector("#select-all-seeds");
      if (selectAllBtn && !selectAllBtn.hasAttribute("data-handler-setup")) {
        selectAllBtn.setAttribute("data-handler-setup", "true");
        selectAllBtn.addEventListener("click", () => {
          context.querySelectorAll(".seed-checkbox").forEach((checkbox) => {
            const seed = checkbox.dataset.seed;

            // Skip protected seeds
            if (
              ["Starweaver", "Moonbinder", "Dawnbinder", "Sunflower"].includes(
                seed,
              )
            ) {
              checkbox.checked = false;
              return;
            }

            checkbox.checked = true;
            // Map to internal ID for storage (using seedIdMap from function scope)
            const internalId = seedIdMap[seed] || seed;
            if (!UnifiedState.data.seedsToDelete.includes(internalId)) {
              UnifiedState.data.seedsToDelete.push(internalId);
            }
          });
          MGA_saveJSON("MGA_seedsToDelete", UnifiedState.data.seedsToDelete);
          debugLog("BUTTON_INTERACTIONS", "Selected all seeds");
        });
      }

      // Select None Seeds Button
      const selectNoneBtn = context.querySelector("#select-none-seeds");
      if (selectNoneBtn && !selectNoneBtn.hasAttribute("data-handler-setup")) {
        selectNoneBtn.setAttribute("data-handler-setup", "true");
        selectNoneBtn.addEventListener("click", () => {
          context.querySelectorAll(".seed-checkbox").forEach((checkbox) => {
            checkbox.checked = false;
          });
          UnifiedState.data.seedsToDelete = [];
          debugLog("BUTTON_INTERACTIONS", "Deselected all seeds");
        });
      }

      // Select Common Seeds Button
      const selectCommonBtn = context.querySelector("#select-common");
      if (
        selectCommonBtn &&
        !selectCommonBtn.hasAttribute("data-handler-setup")
      ) {
        selectCommonBtn.setAttribute("data-handler-setup", "true");
        selectCommonBtn.addEventListener("click", () => {
          const commonSeeds = ["Carrot", "Strawberry", "Aloe"];
          selectSeedsByList(context, commonSeeds);
          debugLog("BUTTON_INTERACTIONS", "Selected common seeds");
        });
      }

      // Select Uncommon Seeds Button
      const selectUncommonBtn = context.querySelector("#select-uncommon");
      if (
        selectUncommonBtn &&
        !selectUncommonBtn.hasAttribute("data-handler-setup")
      ) {
        selectUncommonBtn.setAttribute("data-handler-setup", "true");
        selectUncommonBtn.addEventListener("click", () => {
          const uncommonSeeds = ["Apple", "Tulip", "Tomato", "Blueberry"];
          selectSeedsByList(context, uncommonSeeds);
          debugLog("BUTTON_INTERACTIONS", "Selected uncommon seeds");
        });
      }

      // Select Rare+ Seeds Button
      const selectRareBtn = context.querySelector("#select-rare");
      if (selectRareBtn && !selectRareBtn.hasAttribute("data-handler-setup")) {
        selectRareBtn.setAttribute("data-handler-setup", "true");
        selectRareBtn.addEventListener("click", () => {
          const rareSeeds = [
            "Daffodil",
            "Corn",
            "Watermelon",
            "Pumpkin",
            "Delphinium",
            "Squash",
            "Echeveria",
            "Coconut",
            "Banana",
            "Lily",
            "BurrosTail",
            "Mushroom",
            "Cactus",
            "Bamboo",
            "Grape",
            "Pepper",
            "Lemon",
            "PassionFruit",
            "DragonFruit",
            "Lychee",
            "Chrysanthemum",
            "Camellia",
            "Cacao",
          ];
          selectSeedsByList(context, rareSeeds);
          debugLog("BUTTON_INTERACTIONS", "Selected rare+ seeds");
        });
      }

      // Calculate Value Button
      const calculateValueBtn = context.querySelector("#calculate-value-btn");
      if (
        calculateValueBtn &&
        !calculateValueBtn.hasAttribute("data-handler-setup")
      ) {
        calculateValueBtn.setAttribute("data-handler-setup", "true");
        calculateValueBtn.addEventListener("click", () => {
          calculateSelectedSeedsValue(context);
          debugLog("BUTTON_INTERACTIONS", "Calculate seeds value clicked");
        });
      }
    }

    // Helper function to select seeds by list
    function selectSeedsByList(context, seedList) {
      // First, clear all selections
      context.querySelectorAll(".seed-checkbox").forEach((checkbox) => {
        checkbox.checked = false;
      });
      UnifiedState.data.seedsToDelete = [];

      // Then select the specified seeds (excluding protected seeds)
      context.querySelectorAll(".seed-checkbox").forEach((checkbox) => {
        const seed = checkbox.dataset.seed;

        // Skip protected seeds
        if (
          ["Starweaver", "Moonbinder", "Dawnbinder", "Sunflower"].includes(seed)
        ) {
          checkbox.checked = false;
          return;
        }

        if (seedList.includes(seed)) {
          checkbox.checked = true;
          UnifiedState.data.seedsToDelete.push(seed);
        }
      });
      MGA_saveJSON("MGA_seedsToDelete", UnifiedState.data.seedsToDelete);
    }

    // Helper function to calculate selected seeds value
    function calculateSelectedSeedsValue(context) {
      const seedValues = {};

      UnifiedState.plantsDatabase.forEach((plant) => {
        if (plant.inShop) {
          seedValues[plant.name] = plant.shopPrice;
        }
      });

      if (
        !UnifiedState.atoms.inventory ||
        !UnifiedState.atoms.inventory.items
      ) {
        return;
      }

      let totalValue = 0;
      const inventory = UnifiedState.atoms.inventory.items;

      UnifiedState.data.seedsToDelete.forEach((seedType) => {
        const inventoryItem = inventory.find(
          (item) =>
            item &&
            item.species &&
            (item.species === seedType ||
              item.species === seedType.replace("Tulip", "OrangeTulip")),
        );

        if (inventoryItem) {
          const quantity = inventoryItem.quantity || 0;
          const unitValue = seedValues[seedType] || 1;
          totalValue += quantity * unitValue;
        }
      });

      // Show the value display
      const valueDisplay = context.querySelector("#seed-value-display");
      const valueSpan = context.querySelector("#selected-seeds-value");

      if (valueDisplay && valueSpan) {
        valueSpan.textContent = totalValue.toLocaleString();
        valueDisplay.style.display = "block";

        // Hide after 5 seconds
        setTimeout(() => {
          valueDisplay.style.display = "none";
        }, 5000);
      }

      debugLog("BUTTON_INTERACTIONS", `Calculated seeds value: ${totalValue}`, {
        selectedSeeds: UnifiedState.data.seedsToDelete,
        totalValue,
      });
    }

    // Track current hotkey recording state
    let currentlyRecordingHotkey = null;

    function startRecordingHotkey(key, buttonElement) {
      if (currentlyRecordingHotkey) return; // Already recording

      currentlyRecordingHotkey = key;
      const originalText = buttonElement.textContent;
      buttonElement.textContent = "Press any key...";
      buttonElement.style.background = "#ff9900";

      // Add one-time key listener
      const recordHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Skip modifier-only keys
        if (["Control", "Alt", "Shift", "Meta"].includes(e.key)) return;

        // Allow ESC to cancel
        if (e.key === "Escape") {
          stopRecordingHotkey(buttonElement, originalText);
          document.removeEventListener("keydown", recordHandler, true);
          return;
        }

        // Build key combination string
        let keyCombo = "";
        if (e.ctrlKey) keyCombo += "ctrl+";
        if (e.altKey) keyCombo += "alt+";
        if (e.shiftKey) keyCombo += "shift+";

        // Handle special keys
        const keyName = e.key === " " ? "space" : e.key.toLowerCase();
        keyCombo += keyName;

        // Check for conflicts
        const conflicts = [];
        Object.entries(UnifiedState.data.hotkeys.gameKeys).forEach(
          ([k, config]) => {
            if (k !== key && config.custom && config.custom === keyCombo) {
              conflicts.push(config.name);
            }
          },
        );

        if (conflicts.length > 0) {
          alert(
            `Key "${keyCombo}" is already assigned to: ${conflicts.join(", ")}`,
          );
          stopRecordingHotkey(buttonElement, originalText);
          document.removeEventListener("keydown", recordHandler, true);
          return;
        }

        // Save the new key
        UnifiedState.data.hotkeys.gameKeys[key].custom = keyCombo;
        MGA_saveJSON("MGA_hotkeys", UnifiedState.data.hotkeys);

        stopRecordingHotkey(buttonElement, null);
        updateTabContent(); // Refresh display to show new key and reset button
        document.removeEventListener("keydown", recordHandler, true);

        productionLog(
          `🎮 [HOTKEYS] Remapped ${key}: ${UnifiedState.data.hotkeys.gameKeys[key].original} → ${keyCombo}`,
        );
      };

      document.addEventListener("keydown", recordHandler, true);
    }

    function stopRecordingHotkey(buttonElement, originalText) {
      if (!currentlyRecordingHotkey) return;

      if (originalText) {
        buttonElement.textContent = originalText;
      }
      buttonElement.style.background = "";
      currentlyRecordingHotkey = null;
    }

    // MGTools hotkey recording (similar to game keys but for mgToolsKeys)
    function startRecordingHotkeyMGTools(key, buttonElement) {
      if (currentlyRecordingHotkey) return; // Already recording

      currentlyRecordingHotkey = key;
      const originalText = buttonElement.textContent;
      buttonElement.textContent = "Press any key...";
      buttonElement.style.background = "#ff9900";

      // Add one-time key listener
      const recordHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Skip modifier-only keys
        if (["Control", "Alt", "Shift", "Meta"].includes(e.key)) return;

        // Allow ESC to cancel
        if (e.key === "Escape") {
          stopRecordingHotkey(buttonElement, originalText);
          document.removeEventListener("keydown", recordHandler, true);
          return;
        }

        // Build key combination string
        let keyCombo = "";
        if (e.ctrlKey) keyCombo += "ctrl+";
        if (e.altKey) keyCombo += "alt+";
        if (e.shiftKey) keyCombo += "shift+";

        // Handle special keys
        const keyName = e.key === " " ? "space" : e.key.toLowerCase();
        keyCombo += keyName;

        // Check for conflicts in both gameKeys and mgToolsKeys
        const conflicts = [];
        Object.entries(UnifiedState.data.hotkeys.gameKeys).forEach(
          ([k, config]) => {
            if (config.custom && config.custom === keyCombo) {
              conflicts.push(config.name);
            }
          },
        );
        Object.entries(UnifiedState.data.hotkeys.mgToolsKeys).forEach(
          ([k, config]) => {
            if (k !== key && config.custom && config.custom === keyCombo) {
              conflicts.push(config.name);
            }
          },
        );

        if (conflicts.length > 0) {
          alert(
            `Key "${keyCombo}" is already assigned to: ${conflicts.join(", ")}`,
          );
          stopRecordingHotkey(buttonElement, originalText);
          document.removeEventListener("keydown", recordHandler, true);
          return;
        }

        // Save the new key
        UnifiedState.data.hotkeys.mgToolsKeys[key].custom = keyCombo;
        MGA_saveJSON("MGA_hotkeys", UnifiedState.data.hotkeys);

        stopRecordingHotkey(buttonElement, null);
        updateTabContent(); // Refresh display to show new key and reset button
        document.removeEventListener("keydown", recordHandler, true);

        productionLog(`🎮 [HOTKEYS] Set MGTools key ${key}: ${keyCombo}`);
      };

      document.addEventListener("keydown", recordHandler, true);
    }

    // ==================== HOTKEY INTERCEPTION & SIMULATION ====================

    function shouldBlockHotkey(event) {
      const active = document.activeElement;
      if (!active) return false;

      // Basic input elements
      const tagName = active.tagName?.toLowerCase();
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select"
      ) {
        return true;
      }

      // SPECIFIC CHECK for game's Chakra UI chat input
      if (active.classList?.contains("chakra-input")) {
        if (UnifiedState.data.settings?.debugMode) {
          productionLog("[FIX_HOTKEYS] Blocking - Chakra UI input detected");
        }
        return true;
      }

      // Contenteditable
      if (active.contentEditable === "true" || active.isContentEditable) {
        return true;
      }

      // ARIA role
      if (active.getAttribute("role") === "textbox") {
        return true;
      }

      // Shadow DOM traversal
      if (event && event.composedPath) {
        const path = event.composedPath();
        for (const element of path) {
          if (!element.tagName) continue;

          const tag = element.tagName.toLowerCase();
          if (tag === "input" || tag === "textarea" || tag === "select") {
            return true;
          }

          if (
            element.contentEditable === "true" ||
            element.getAttribute?.("role") === "textbox"
          ) {
            return true;
          }
        }
      }

      // Discord chat detection
      const discordSelectors = [
        ".chat-input-container",
        '[class*="textArea"]',
        '[class*="slateTextArea"]',
        ".markup-input",
      ];

      for (const selector of discordSelectors) {
        try {
          const chatElement = document.querySelector(selector);
          if (chatElement && chatElement.contains(active)) {
            return true;
          }
        } catch {}
      }

      // In-game chat detection - check for common game chat patterns
      // Look for input fields that might be chat, even if not marked as such
      const activeClasses = active.className || "";
      const activeId = active.id || "";

      // Check if active element has chat-related classes or IDs
      const chatPatterns = [
        "chat",
        "message",
        "input",
        "text",
        "field",
        "edit",
      ];
      const hasChatPattern = chatPatterns.some(
        (pattern) =>
          activeClasses.toLowerCase().includes(pattern) ||
          activeId.toLowerCase().includes(pattern),
      );

      if (
        hasChatPattern &&
        (tagName === "div" || tagName === "span" || active.isContentEditable)
      ) {
        // Likely a chat input
        productionLog("[FIX_HOTKEYS] Blocking hotkey - detected chat input:", {
          tag: tagName,
          classes: activeClasses,
          id: activeId,
          contentEditable: active.contentEditable,
        });
        return true;
      }

      // Check parent elements for chat containers
      let parent = active.parentElement;
      let depth = 0;
      while (parent && depth < 5) {
        const parentClasses = parent.className || "";
        const parentId = parent.id || "";

        if (
          chatPatterns.some(
            (pattern) =>
              parentClasses.toLowerCase().includes(pattern) ||
              parentId.toLowerCase().includes(pattern),
          )
        ) {
          productionLog(
            "[FIX_HOTKEYS] Blocking hotkey - active element in chat container:",
            {
              parentTag: parent.tagName,
              parentClasses,
              parentId,
              activeTag: tagName,
            },
          );
          return true;
        }

        parent = parent.parentElement;
        depth++;
      }

      return false;
    }

    // Legacy alias for backwards compatibility
    function isTypingInInput() {
      return shouldBlockHotkey(null);
    }

    function parseKeyCombo(combo) {
      const parts = combo.toLowerCase().split("+");
      return {
        ctrl: parts.includes("ctrl"),
        alt: parts.includes("alt"),
        shift: parts.includes("shift"),
        key:
          parts[parts.length - 1] === "space" ? " " : parts[parts.length - 1],
      };
    }

    function getProperKeyCode(key) {
      // Handle special keys
      const codeMap = {
        " ": "Space",
        space: "Space",
        enter: "Enter",
        tab: "Tab",
        escape: "Escape",
        backspace: "Backspace",
        delete: "Delete",
        arrowup: "ArrowUp",
        arrowdown: "ArrowDown",
        arrowleft: "ArrowLeft",
        arrowright: "ArrowRight",
        home: "Home",
        end: "End",
        pageup: "PageUp",
        pagedown: "PageDown",
        "-": "Minus",
        "=": "Equal",
        "[": "BracketLeft",
        "]": "BracketRight",
        ";": "Semicolon",
        "'": "Quote",
        ",": "Comma",
        ".": "Period",
        "/": "Slash",
        "\\": "Backslash",
        "`": "Backquote",
      };

      const lowerKey = key.toLowerCase();

      // Check special keys map
      if (codeMap[lowerKey]) return codeMap[lowerKey];

      // F-keys
      if (/^f([1-9]|1[0-2])$/.test(lowerKey)) {
        return "F" + lowerKey.substring(1);
      }

      // Numbers
      if (/^[0-9]$/.test(key)) {
        return "Digit" + key;
      }

      // Letters
      if (/^[a-z]$/i.test(key)) {
        return "Key" + key.toUpperCase();
      }

      // Fallback - just capitalize
      return key.charAt(0).toUpperCase() + key.slice(1);
    }

    function matchesKeyCombo(event, combo) {
      const parsed = parseKeyCombo(combo);
      const eventKey = event.key.toLowerCase();

      return (
        event.ctrlKey === parsed.ctrl &&
        event.altKey === parsed.alt &&
        event.shiftKey === parsed.shift &&
        (eventKey === parsed.key || (parsed.key === " " && eventKey === " "))
      );
    }

    // Track which remapped keys are currently held down
    const heldRemappedKeys = new Map(); // customKey → originalKey

    function simulateKeyDown(keyCombo) {
      const parsed = parseKeyCombo(keyCombo);

      // Create keydown event
      const downEvent = new KeyboardEvent("keydown", {
        key: parsed.key,
        code: getProperKeyCode(parsed.key),
        ctrlKey: parsed.ctrl,
        altKey: parsed.alt,
        shiftKey: parsed.shift,
        bubbles: true,
        cancelable: true,
        repeat: false, // First press
      });

      // Dispatch to document (where game listens)
      document.dispatchEvent(downEvent);
    }

    function simulateKeyUp(keyCombo) {
      const parsed = parseKeyCombo(keyCombo);

      // Create keyup event
      const upEvent = new KeyboardEvent("keyup", {
        key: parsed.key,
        code: getProperKeyCode(parsed.key),
        ctrlKey: parsed.ctrl,
        altKey: parsed.alt,
        shiftKey: parsed.shift,
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(upEvent);
    }

    function handleHotkeyPress(e) {
      // ESC key closes sidebar (always active, even if hotkeys disabled)
      if (e.key === "Escape" && e.type === "keydown") {
        const sidebar = document.getElementById("mgh-sidebar");
        if (sidebar && sidebar.classList.contains("open")) {
          sidebar.classList.remove("open");
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      // Skip if disabled, typing in input, recording a hotkey, or in room search/add room inputs
      const isRoomSearch = e.target && e.target.id === "room-search-input";
      const isAddRoomInput = e.target && e.target.id === "add-room-input";
      const isRoomSearchFocused =
        document.activeElement &&
        document.activeElement.id === "room-search-input";
      const isAddRoomFocused =
        document.activeElement &&
        document.activeElement.id === "add-room-input";

      // CRITICAL: Skip simulated events to prevent infinite loops
      // Simulated events have isTrusted: false, real user keypresses have isTrusted: true
      if (!e.isTrusted) return;

      // Block hotkeys when typing in inputs (enhanced with shadow DOM support)
      if (shouldBlockHotkey(e)) {
        // CRITICAL: Stop event from reaching game's hotkey handler
        // DO NOT use preventDefault() - that blocks typing in the input!
        // stopImmediatePropagation() prevents OTHER handlers from seeing this event
        // EXCEPTION: Allow Enter key to reach game's chat handler for message submission
        if (e.key !== "Enter") {
          e.stopImmediatePropagation();
        }

        // Log when hotkey is blocked (helps diagnose chat detection issues)
        if (UnifiedState.data.settings?.debugMode) {
          const active = document.activeElement;
          productionLog("[FIX_HOTKEYS] Hotkey blocked - typing detected:", {
            key: e.key,
            tag: active?.tagName,
            id: active?.id,
            classes: active?.className,
            contentEditable: active?.contentEditable,
          });
        }
        return;
      }

      if (
        !UnifiedState.data.hotkeys.enabled ||
        currentlyRecordingHotkey ||
        isRoomSearch ||
        isRoomSearchFocused ||
        isAddRoomInput ||
        isAddRoomFocused
      )
        return;

      const isKeyDown = e.type === "keydown";
      const isKeyUp = e.type === "keyup";

      // STEP 1: Check each remapped key (custom → original)
      for (const [action, config] of Object.entries(
        UnifiedState.data.hotkeys.gameKeys,
      )) {
        if (config.custom) {
          // Check if pressed key matches custom mapping
          if (matchesKeyCombo(e, config.custom)) {
            e.preventDefault();
            e.stopPropagation();

            // Special handling for script functions (not game keys)
            if (action === "toggleQuickShop") {
              if (isKeyDown && !e.repeat) {
                toggleShopWindows();
                if (UnifiedState.data.settings.debugMode) {
                  productionLog(
                    `🎮 [HOTKEYS] Triggered Quick Shop toggle via ${config.custom}`,
                  );
                }
              }
              return false;
            }

            if (isKeyDown) {
              // Only simulate keydown once per hold (ignore repeat events)
              if (!e.repeat) {
                simulateKeyDown(config.original);
                heldRemappedKeys.set(config.custom, config.original);
                if (UnifiedState.data.settings.debugMode) {
                  productionLog(
                    `🎮 [HOTKEYS] Remapped keydown ${config.custom} → ${config.original} (${config.name})`,
                  );
                }
              }
            } else if (isKeyUp) {
              // Simulate keyup when released
              simulateKeyUp(config.original);
              heldRemappedKeys.delete(config.custom);
              if (UnifiedState.data.settings.debugMode) {
                productionLog(
                  `🎮 [HOTKEYS] Remapped keyup ${config.custom} → ${config.original} (${config.name})`,
                );
              }
            }
            return false;
          }
        }
      }

      // STEP 2: Check for non-remapped script functions using original key
      for (const [action, config] of Object.entries(
        UnifiedState.data.hotkeys.gameKeys,
      )) {
        if (!config.custom && action === "toggleQuickShop") {
          if (matchesKeyCombo(e, config.original)) {
            if (isKeyDown && !e.repeat) {
              e.preventDefault();
              e.stopPropagation();
              toggleShopWindows();
              if (UnifiedState.data.settings.debugMode) {
                productionLog(
                  `🎮 [HOTKEYS] Triggered Quick Shop toggle via ${config.original}`,
                );
              }
              return false;
            }
          }
        }
      }

      // STEP 3: Suppress original keys that have been remapped
      for (const [action, config] of Object.entries(
        UnifiedState.data.hotkeys.gameKeys,
      )) {
        if (config.custom && matchesKeyCombo(e, config.original)) {
          // Original key has been remapped, suppress it
          e.preventDefault();
          e.stopPropagation();
          if (UnifiedState.data.settings.debugMode && !e.repeat) {
            productionLog(
              `🚫 [HOTKEYS] Suppressed ${config.original} (remapped to ${config.custom} for ${config.name})`,
            );
          }
          return false;
        }
      }
    }

    function handleHotkeyRelease(e) {
      // Just call the same handler - it checks e.type
      handleHotkeyPress(e);
    }

    // Install hotkey interceptor at highest priority
    function initializeHotkeySystem() {
      document.addEventListener("keydown", handleHotkeyPress, true);
      document.addEventListener("keyup", handleHotkeyRelease, true);
      productionLog(
        "🎮 [HOTKEYS] Key interception system installed (keydown + keyup)",
      );
    }

    function setupHotkeysTabHandlers(context = document) {
      // Enable/disable checkbox
      const enableCheckbox = context.querySelector("#hotkeys-enabled");
      if (enableCheckbox) {
        enableCheckbox.addEventListener("change", (e) => {
          UnifiedState.data.hotkeys.enabled = e.target.checked;
          MGA_saveJSON("MGA_hotkeys", UnifiedState.data.hotkeys);
          productionLog(
            `🎮 [HOTKEYS] ${e.target.checked ? "Enabled" : "Disabled"}`,
          );
        });
      }

      // Hotkey buttons
      context.querySelectorAll(".hotkey-button").forEach((button) => {
        button.addEventListener("click", function () {
          const key = this.dataset.key;
          startRecordingHotkey(key, this);
        });
      });

      // Reset buttons
      context.querySelectorAll(".hotkey-reset").forEach((button) => {
        button.addEventListener("click", function () {
          const key = this.dataset.key;
          UnifiedState.data.hotkeys.gameKeys[key].custom = null;
          MGA_saveJSON("MGA_hotkeys", UnifiedState.data.hotkeys);
          updateTabContent(); // Refresh display
          productionLog(`🎮 [HOTKEYS] Reset ${key} to default`);
        });
      });

      // MGTools hotkey buttons
      context.querySelectorAll(".hotkey-button-mgtools").forEach((button) => {
        button.addEventListener("click", function () {
          const key = this.dataset.key;
          startRecordingHotkeyMGTools(key, this);
        });
      });

      // MGTools reset buttons
      context.querySelectorAll(".hotkey-reset-mgtools").forEach((button) => {
        button.addEventListener("click", function () {
          const key = this.dataset.key;
          UnifiedState.data.hotkeys.mgToolsKeys[key].custom = null;
          MGA_saveJSON("MGA_hotkeys", UnifiedState.data.hotkeys);
          updateTabContent(); // Refresh display
          productionLog(`🎮 [HOTKEYS] Reset MGTools key ${key} to default`);
        });
      });

      // Reset all button
      const resetAllBtn = context.querySelector("#hotkeys-reset-all");
      if (resetAllBtn) {
        resetAllBtn.addEventListener("click", () => {
          if (confirm("Reset all hotkeys to defaults?")) {
            Object.keys(UnifiedState.data.hotkeys.gameKeys).forEach((key) => {
              UnifiedState.data.hotkeys.gameKeys[key].custom = null;
            });
            Object.keys(UnifiedState.data.hotkeys.mgToolsKeys).forEach(
              (key) => {
                UnifiedState.data.hotkeys.mgToolsKeys[key].custom = null;
              },
            );
            MGA_saveJSON("MGA_hotkeys", UnifiedState.data.hotkeys);
            updateTabContent();
            productionLog("🎮 [HOTKEYS] Reset all hotkeys to defaults");
          }
        });
      }

      // Export button
      const exportBtn = context.querySelector("#hotkeys-export");
      if (exportBtn) {
        exportBtn.addEventListener("click", () => {
          const exportData = {};
          Object.entries(UnifiedState.data.hotkeys.gameKeys).forEach(
            ([key, config]) => {
              if (config.custom) {
                exportData[key] = config.custom;
              }
            },
          );
          const json = JSON.stringify(exportData, null, 2);
          navigator.clipboard.writeText(json);
          alert("Hotkey configuration copied to clipboard!");
        });
      }
    }

    function setupProtectTabHandlers(context = document) {
      // Actual game crop species (from shop)
      const cropSpecies = [];

      UnifiedState.plantsDatabase.forEach((plant) => {
        cropSpecies.push(plant.id);
      });

      const cropMutations = [
        "Rainbow",
        "Thunderstruck",
        "Frozen",
        "Wet",
        "Chilled",
        "Gold",
        "Dawnlit",
        "Amberlit",
        "Dawnbound",
        "Amberbound",
        "Lock All Mutations",
        "Lock Only Non-Mutated",
      ];

      // Add new setting for frozen exception
      if (!UnifiedState.data.protectionSettings) {
        UnifiedState.data.protectionSettings = {
          allowFrozenPickup: false, // Allow pickup of protected crops when frozen
        };
      }

      // Initialize locked crops if not exists
      if (!UnifiedState.data.lockedCrops) {
        UnifiedState.data.lockedCrops = { species: [], mutations: [] };
      }
      if (!UnifiedState.data.sellBlockThreshold) {
        UnifiedState.data.sellBlockThreshold = 1.0;
      }
      // Initialize locked decor if not exists
      if (!UnifiedState.data.lockedDecor) {
        UnifiedState.data.lockedDecor = [];
      }
      // Initialize locked pet abilities if not exists
      if (!UnifiedState.data.lockedPetAbilities) {
        UnifiedState.data.lockedPetAbilities = [];
      }

      const lockedCrops = UnifiedState.data.lockedCrops;

      // Generate species checkboxes
      const speciesList = context.querySelector("#protect-species-list");
      if (speciesList) {
        speciesList.innerHTML = cropSpecies
          .map(
            (species) => `
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 6px; background: rgba(74, 158, 255, 0.30); border-radius: 4px;">
                      <input type="checkbox" class="protect-species-checkbox" value="${species}"
                          ${lockedCrops.species?.includes(species) ? "checked" : ""}
                          style="cursor: pointer;">
                      <span style="font-size: 12px;">${species}</span>
                  </label>
              `,
          )
          .join("");
      }

      // Generate mutation checkboxes
      const mutationsList = context.querySelector("#protect-mutations-list");
      if (mutationsList) {
        mutationsList.innerHTML = cropMutations
          .map(
            (mutation) => `
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 6px; background: rgba(74, 158, 255, 0.30); border-radius: 4px;">
                      <input type="checkbox" class="protect-mutation-checkbox" value="${mutation}"
                          ${lockedCrops.mutations?.includes(mutation) ? "checked" : ""}
                          style="cursor: pointer;">
                      <span style="font-size: 12px;">${mutation}</span>
                  </label>
              `,
          )
          .join("");
      }

      // Generate pet ability checkboxes
      const petAbilities = ["Rainbow Granter", "Gold Granter"];
      const petAbilitiesList = context.querySelector(
        "#protect-pet-abilities-list",
      );
      if (petAbilitiesList) {
        petAbilitiesList.innerHTML = petAbilities
          .map(
            (ability) => `
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 6px; background: rgba(74, 158, 255, 0.30); border-radius: 4px;">
                      <input type="checkbox" class="protect-pet-ability-checkbox" value="${ability}"
                          ${UnifiedState.data.lockedPetAbilities?.includes(ability) ? "checked" : ""}
                          style="cursor: pointer;">
                      <span style="font-size: 12px;">${ability}</span>
                  </label>
              `,
          )
          .join("");
      }

      // Generate decor checkboxes
      const decorList = context.querySelector("#protect-decor-list");
      if (decorList) {
        decorList.innerHTML = DECOR_ITEMS.map(
          (decor) => `
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 6px; background: rgba(74, 158, 255, 0.30); border-radius: 4px;">
                      <input type="checkbox" class="protect-decor-checkbox" value="${decor.id}"
                          ${UnifiedState.data.lockedDecor?.includes(decor.id) ? "checked" : ""}
                          style="cursor: pointer;">
                      <span style="font-size: 11px;">${decor.name}</span>
                  </label>
              `,
        ).join("");
      }

      // Diagnostic logging
      const speciesCheckboxes = context.querySelectorAll(
        ".protect-species-checkbox",
      );
      const mutationCheckboxes = context.querySelectorAll(
        ".protect-mutation-checkbox",
      );
      productionLog(
        `✅ [Protect] Found ${speciesCheckboxes.length} species checkboxes, ${mutationCheckboxes.length} mutation checkboxes`,
      );

      // Handle species checkbox changes
      context
        .querySelectorAll(".protect-species-checkbox")
        .forEach((checkbox) => {
          checkbox.addEventListener("change", (e) => {
            productionLog(
              "[Protect] 🔔 Species checkbox changed!",
              e.target.value,
              "checked:",
              e.target.checked,
            );
            const species = e.target.value;
            if (e.target.checked) {
              if (!lockedCrops.species.includes(species)) {
                lockedCrops.species.push(species);
              }
            } else {
              lockedCrops.species = lockedCrops.species.filter(
                (s) => s !== species,
              );
            }
            productionLog(
              "[Protect] Saving species change:",
              species,
              e.target.checked,
            );
            MGA_saveJSON("MGA_data", UnifiedState.data);
            productionLog("[Protect] Save completed");
            updateProtectStatus(context);
            applyHarvestRule();
          });
        });

      // Handle mutation checkbox changes
      context
        .querySelectorAll(".protect-mutation-checkbox")
        .forEach((checkbox) => {
          checkbox.addEventListener("change", (e) => {
            productionLog(
              "[Protect] 🔔 Mutation checkbox changed!",
              e.target.value,
              "checked:",
              e.target.checked,
            );
            const mutation = e.target.value;

            // Special handling for "Lock All Mutations" - it's a "select all" toggle
            if (mutation === "Lock All Mutations") {
              const allMutationCheckboxes = context.querySelectorAll(
                ".protect-mutation-checkbox",
              );
              const otherMutations = [
                "Rainbow",
                "Frozen",
                "Thunderstruck",
                "Wet",
                "Chilled",
                "Gold",
                "Dawnlit",
                "Amberlit",
                "Dawnbound",
                "Amberbound",
              ];

              if (e.target.checked) {
                // Check all other mutation checkboxes
                allMutationCheckboxes.forEach((cb) => {
                  if (
                    cb.value !== "Lock All Mutations" &&
                    cb.value !== "Lock Only Non-Mutated"
                  ) {
                    cb.checked = true;
                    if (!lockedCrops.mutations.includes(cb.value)) {
                      lockedCrops.mutations.push(cb.value);
                    }
                  }
                });
              } else {
                // Uncheck all other mutation checkboxes
                allMutationCheckboxes.forEach((cb) => {
                  if (
                    cb.value !== "Lock All Mutations" &&
                    cb.value !== "Lock Only Non-Mutated"
                  ) {
                    cb.checked = false;
                  }
                });
                lockedCrops.mutations = lockedCrops.mutations.filter(
                  (m) => m === "Lock Only Non-Mutated",
                );
              }
            } else if (mutation === "Lock Only Non-Mutated") {
              // Special handling for "Lock Only Non-Mutated" - locks crops with 0 mutations
              if (e.target.checked) {
                if (!lockedCrops.mutations.includes(mutation)) {
                  lockedCrops.mutations.push(mutation);
                }
              } else {
                lockedCrops.mutations = lockedCrops.mutations.filter(
                  (m) => m !== mutation,
                );
              }
            } else {
              // Regular mutation checkbox
              if (e.target.checked) {
                if (!lockedCrops.mutations.includes(mutation)) {
                  lockedCrops.mutations.push(mutation);
                }
              } else {
                lockedCrops.mutations = lockedCrops.mutations.filter(
                  (m) => m !== mutation,
                );
                // Uncheck "Lock All Mutations" if any individual mutation is unchecked
                const lockAllCheckbox = context.querySelector(
                  '.protect-mutation-checkbox[value="Lock All Mutations"]',
                );
                if (lockAllCheckbox) {
                  lockAllCheckbox.checked = false;
                }
              }
            }

            productionLog(
              "[Protect] Saving mutation change:",
              mutation,
              e.target.checked,
            );
            MGA_saveJSON("MGA_data", UnifiedState.data);
            productionLog("[Protect] Save completed");
            updateProtectStatus(context);
            applyHarvestRule();
          });
        });

      // Handle pet ability checkbox changes
      context
        .querySelectorAll(".protect-pet-ability-checkbox")
        .forEach((checkbox) => {
          checkbox.addEventListener("change", (e) => {
            const ability = e.target.value;
            if (e.target.checked) {
              if (!UnifiedState.data.lockedPetAbilities.includes(ability)) {
                UnifiedState.data.lockedPetAbilities.push(ability);
              }
            } else {
              UnifiedState.data.lockedPetAbilities =
                UnifiedState.data.lockedPetAbilities.filter(
                  (a) => a !== ability,
                );
            }
            MGA_saveJSON("MGA_data", UnifiedState.data);
            updateProtectStatus(context);
          });
        });

      // Handle decor checkbox changes
      context
        .querySelectorAll(".protect-decor-checkbox")
        .forEach((checkbox) => {
          checkbox.addEventListener("change", (e) => {
            const decorId = e.target.value;
            if (e.target.checked) {
              if (!UnifiedState.data.lockedDecor.includes(decorId)) {
                UnifiedState.data.lockedDecor.push(decorId);
              }
            } else {
              UnifiedState.data.lockedDecor =
                UnifiedState.data.lockedDecor.filter((d) => d !== decorId);
            }
            MGA_saveJSON("MGA_data", UnifiedState.data);
            updateProtectStatus(context);
          });
        });

      // Clear all button
      const clearButton = context.querySelector("#protect-clear-all");
      if (clearButton) {
        clearButton.addEventListener("click", () => {
          lockedCrops.species = [];
          lockedCrops.mutations = [];
          UnifiedState.data.lockedDecor = [];
          UnifiedState.data.lockedPetAbilities = [];
          MGA_saveJSON("MGA_data", UnifiedState.data);

          // Uncheck all checkboxes
          context
            .querySelectorAll(
              ".protect-species-checkbox, .protect-mutation-checkbox, .protect-decor-checkbox, .protect-pet-ability-checkbox",
            )
            .forEach((cb) => {
              cb.checked = false;
            });

          updateProtectStatus(context);
          applyHarvestRule();
        });
      }

      // Sell threshold slider
      const thresholdSlider = context.querySelector("#protect-sell-threshold");
      const thresholdValue = context.querySelector(
        "#protect-sell-threshold-value",
      );
      if (thresholdSlider) {
        thresholdSlider.addEventListener("input", (e) => {
          const value = parseFloat(e.target.value);
          UnifiedState.data.sellBlockThreshold = value;
          if (thresholdValue) {
            thresholdValue.textContent = `${value.toFixed(2)}x (${((value - 1) * 100).toFixed(0)}%)`;
          }
          MGA_saveJSON("MGA_data", UnifiedState.data);
          applySellBlockThreshold();
        });
      }

      // Add handler for frozen pickup checkbox
      productionLog(
        "[Protect-Debug] 🔍 Looking for #allow-frozen-pickup checkbox in context:",
        context,
      );
      const frozenCheckbox = context.querySelector("#allow-frozen-pickup");
      productionLog(
        "[Protect-Debug] 📋 Frozen checkbox found?",
        !!frozenCheckbox,
        frozenCheckbox,
      );

      if (frozenCheckbox) {
        productionLog(
          "[Protect-Debug] ✅ Attaching change event handler to frozen checkbox",
        );
        frozenCheckbox.addEventListener("change", (e) => {
          productionLog(
            "[Protect-Debug] 🔔 FROZEN CHECKBOX CHANGED!",
            e.target.checked,
          );
          if (!UnifiedState.data.protectionSettings) {
            UnifiedState.data.protectionSettings = {};
          }
          UnifiedState.data.protectionSettings.allowFrozenPickup =
            e.target.checked;
          MGA_saveJSON("MGA_data", UnifiedState.data);
          productionLog(
            `❄️ [PROTECTION] Frozen exception: ${e.target.checked ? "enabled" : "disabled"}`,
          );
          applyHarvestRule();
        });
        productionLog(
          "[Protect-Debug] ✅ Frozen checkbox handler attached successfully",
        );
      } else {
        console.warn(
          "[Protect-Debug] ⚠️ Frozen checkbox NOT FOUND in context!",
        );
      }

      // Initial status update
      updateProtectStatus(context);
      applyHarvestRule();
      applySellBlockThreshold();
    }

    function updateProtectStatus(context = document) {
      const statusDisplay = context.querySelector("#protect-status-display");
      if (!statusDisplay) return;

      const lockedCrops = UnifiedState.data.lockedCrops || {
        species: [],
        mutations: [],
      };
      const lockedDecor = UnifiedState.data.lockedDecor || [];
      const lockedPetAbilities = UnifiedState.data.lockedPetAbilities || [];
      const hasLocks =
        lockedCrops.species.length > 0 ||
        lockedCrops.mutations.length > 0 ||
        lockedDecor.length > 0 ||
        lockedPetAbilities.length > 0;

      if (!hasLocks) {
        statusDisplay.innerHTML =
          '<div style="color: #888;">No protections are currently active.</div>';
        return;
      }

      let html = "";
      if (lockedCrops.species.length > 0) {
        html += `<div style="margin-bottom: 8px;"><strong>🔒 Locked Crop Species:</strong> ${lockedCrops.species.join(", ")}</div>`;
      }
      if (lockedCrops.mutations.length > 0) {
        html += `<div style="margin-bottom: 8px;"><strong>🔒 Locked Mutations:</strong> ${lockedCrops.mutations.join(", ")}</div>`;
      }
      if (lockedPetAbilities.length > 0) {
        html += `<div style="margin-bottom: 8px;"><strong>🐾 Locked Pet Abilities:</strong> ${lockedPetAbilities.join(", ")}</div>`;
      }
      if (lockedDecor.length > 0) {
        const decorNames = lockedDecor
          .map((id) => {
            const decor = DECOR_ITEMS.find((d) => d.id === id);
            return decor ? decor.name : id;
          })
          .join(", ");
        html += `<div><strong>🏛️ Locked Decor:</strong> ${decorNames}</div>`;
      }

      statusDisplay.innerHTML = html;
    }

    // ==================== HARVEST & SELL PROTECTION ====================
    function applyHarvestRule() {
      targetWindow.currentHarvestRule = ({ species, mutations } = {}) => {
        // CRITICAL FIX: Read fresh locked crops from UnifiedState each time harvest is attempted
        // This ensures unlocking crops takes effect immediately without requiring page refresh
        const freshLockedCrops = UnifiedState.data.lockedCrops || {
          species: [],
          mutations: [],
        };
        let mutationsLocal = mutations;
        mutationsLocal = Array.isArray(mutationsLocal) ? mutationsLocal : [];

        // Check if crop is frozen
        const isFrozen = mutationsLocal.includes("Frozen");
        const allowFrozenPickup =
          UnifiedState.data.protectionSettings?.allowFrozenPickup || false;

        // If species is locked, check for frozen exception
        if (
          freshLockedCrops.species &&
          freshLockedCrops.species.includes(species)
        ) {
          // If frozen exception is enabled and crop is frozen, allow harvest
          if (isFrozen && allowFrozenPickup) {
            return true;
          }
          return false;
        }

        // Check for "Lock Only Non-Mutated" - locks crops with 0 mutations
        if (
          freshLockedCrops.mutations &&
          freshLockedCrops.mutations.includes("Lock Only Non-Mutated")
        ) {
          if (mutationsLocal.length === 0) {
            return false; // Block harvest if crop has no mutations
          }
        }

        // If any locked mutation is present, check for frozen exception
        if (
          freshLockedCrops.mutations &&
          freshLockedCrops.mutations.length > 0
        ) {
          const regularMutations = freshLockedCrops.mutations.filter(
            (m) => m !== "Lock All Mutations" && m !== "Lock Only Non-Mutated",
          );
          const hasLockedMutation = regularMutations.some((m) =>
            mutationsLocal.includes(m),
          );
          if (hasLockedMutation) {
            // If frozen exception is enabled and crop is frozen, allow harvest
            if (isFrozen && allowFrozenPickup) {
              return true;
            }
            return false;
          }
        }

        return true;
      };
    }

    function applySellBlockThreshold() {
      targetWindow.sellBlockThreshold =
        UnifiedState.data.sellBlockThreshold || 1.0;
      productionLog(
        `✅ Sell block threshold set to ${targetWindow.sellBlockThreshold}x`,
      );
    }

    // Track RoomConnection retry attempts
    let roomConnectionRetries = 0;
    const MAX_ROOM_CONNECTION_RETRIES = 10;

    function initializeProtectionHooks() {
      // Note: friendBonus and myGarden atoms are already hooked in initializeAtoms()
      // which sets both UnifiedState.atoms and targetWindow values

      // Hook sendMessage to intercept harvest and sell commands
      setTimeout(() => {
        if (!targetWindow.MagicCircle_RoomConnection) {
          if (roomConnectionRetries < MAX_ROOM_CONNECTION_RETRIES) {
            roomConnectionRetries++;
            console.warn(
              `⏳ Waiting for RoomConnection (${roomConnectionRetries}/${MAX_ROOM_CONNECTION_RETRIES})...`,
            );
            setTimeout(initializeProtectionHooks, 1000);
            return;
          } else {
            console.warn(
              "⚠️ RoomConnection not found after max retries - continuing without protection hooks",
            );
            // Continue without it - non-critical feature
            return;
          }
        }

        // Reset counter on success
        roomConnectionRetries = 0;
        productionLog(
          "✅ MagicCircle_RoomConnection found - initializing protection hooks",
        );

        const originalSendMessage =
          targetWindow.MagicCircle_RoomConnection.sendMessage.bind(
            targetWindow.MagicCircle_RoomConnection,
          );

        // Wrap sendMessage to intercept messages for protection and tracking
        targetWindow.MagicCircle_RoomConnection.sendMessage = function (
          message,
          ...rest
        ) {
          try {
            if (!message || typeof message.type !== "string") {
              return originalSendMessage(message, ...rest);
            }

            const friendBonus = targetWindow.friendBonus ?? 1.5;
            const msgType = message.type;
            const isSellMessage = msgType === "SellAllCrops"; // Only check crops - friend bonus doesn't work for pets

            // Detect in-game shop purchases
            if (msgType === "PurchaseSeed" && message.species) {
              if (typeof trackLocalPurchase === "function") {
                trackLocalPurchase(message.species, "seed", 1);
              }
            } else if (msgType === "PurchaseEgg" && message.eggId) {
              if (typeof trackLocalPurchase === "function") {
                trackLocalPurchase(message.eggId, "egg", 1);
              }
            } else if (msgType === "PurchaseTool" && message.toolId) {
              if (UnifiedState.data.settings?.debugMode) {
                productionLog(
                  `🔧 [PURCHASE-INTERCEPT] Tool Purchase Detected!`,
                  {
                    toolId: message.toolId,
                    toolIdType: typeof message.toolId,
                    fullMessage: JSON.stringify(message),
                  },
                );
              }
              if (typeof trackLocalPurchase === "function") {
                trackLocalPurchase(message.toolId, "tool", 1);
                if (UnifiedState.data.settings?.debugMode) {
                  productionLog(
                    `🔧 [PURCHASE-INTERCEPT] Called trackLocalPurchase with: "${message.toolId}"`,
                  );
                }
              } else {
                console.error(
                  `❌ [PURCHASE-INTERCEPT] trackLocalPurchase function not available!`,
                );
              }
            }

            // Check sell blocking
            if (
              isSellMessage &&
              friendBonus < targetWindow.sellBlockThreshold
            ) {
              console.warn(
                `[SellBlock] Blocked ${msgType} (friendBonus=${friendBonus} < ${targetWindow.sellBlockThreshold})`,
              );
              return;
            }

            // Check harvest blocking
            if (msgType === "HarvestCrop") {
              const tile =
                targetWindow.myGarden?.garden?.tileObjects?.[message.slot];
              const slotData = tile?.slots?.[message.slotsIndex];

              productionLog(
                `[HarvestCheck] Attempting harvest: slot=${message.slot}, index=${message.slotsIndex}`,
              );
              productionLog(`[HarvestCheck] Tile data:`, tile);
              productionLog(`[HarvestCheck] Slot data:`, slotData);

              if (slotData) {
                const species = slotData.species;
                const slotMutations = slotData.mutations || [];

                productionLog(
                  `[HarvestCheck] Species: ${species}, Mutations:`,
                  slotMutations,
                );
                productionLog(
                  `[HarvestCheck] currentHarvestRule exists:`,
                  !!targetWindow.currentHarvestRule,
                );

                if (
                  targetWindow.currentHarvestRule &&
                  !targetWindow.currentHarvestRule({
                    species,
                    mutations: slotMutations,
                  })
                ) {
                  productionLog(
                    `🔒 BLOCKED HarvestCrop: ${species} with mutations [${slotMutations.join(", ")}]`,
                  );
                  return;
                }
                productionLog(
                  `✅ ALLOWED HarvestCrop: ${species} with mutations [${slotMutations.join(", ")}]`,
                );

                // DIAGNOSTIC: Log when debug mode is enabled
                if (UnifiedState.data.settings?.debugMode) {
                  productionLog(
                    "[FIX_HARVEST] Harvest handler called for:",
                    species,
                    "Will attempt sync in 100ms...",
                  );
                }

                // Sync slot index after harvest - works for both single and multi-harvest crops
                // For single-harvest: game doesn't advance slot, sync returns null (no change)
                // For multi-harvest: game advances slot, sync updates MGTools to match
                const preHarvestIndex = window._mgtools_currentSlotIndex || 0;

                // Use polyfill from multi-harvest helpers
                // eslint-disable-next-line no-undef
                const qmt =
                  typeof queueMicrotask === "function"
                    ? queueMicrotask
                    : (fn) => Promise.resolve().then(fn);

                // Wait for game to update atoms after harvest
                qmt(() => {
                  setTimeout(() => {
                    try {
                      // Use globally exposed sync function
                      if (!window.syncSlotIndexFromGame) {
                        if (UnifiedState.data.settings?.debugMode) {
                          console.error(
                            "[FIX_HARVEST] ERROR: syncSlotIndexFromGame not found on window!",
                          );
                        }
                        return;
                      }

                      const newIndex = window.syncSlotIndexFromGame();

                      // Log slot sync when debug mode is enabled
                      if (UnifiedState.data.settings?.debugMode) {
                        productionLog("[FIX_HARVEST] Post-harvest slot sync:", {
                          species,
                          preHarvest: preHarvestIndex,
                          postHarvest:
                            newIndex !== null ? newIndex : preHarvestIndex,
                          slotAdvanced: newIndex !== null,
                          isMultiHarvest: newIndex !== null,
                          note:
                            newIndex === null
                              ? "Single-harvest crop (expected - no slot advance)"
                              : "Multi-harvest detected - slot advanced",
                        });
                      }

                      // Force refresh the value display after slot sync
                      if (typeof insertTurtleEstimate === "function") {
                        requestAnimationFrame(() => {
                          insertTurtleEstimate();
                          if (UnifiedState.data.settings?.debugMode) {
                            productionLog(
                              "[FIX_HARVEST] Refreshed value display",
                            );
                          }
                        });
                      }
                    } catch (error) {
                      console.error("[FIX_HARVEST] Sync error:", error);
                    }
                  }, 100); // Small delay to let game update atom
                });
              } else {
                console.warn(
                  `[HarvestCheck] No slot data found for slot ${message.slot}, index ${message.slotsIndex}`,
                );
              }
            }

            // Check pet sell blocking by ability (using mutation-based detection)
            if (
              msgType.toLowerCase().includes("pet") &&
              msgType.toLowerCase().includes("sell")
            ) {
              const lockedAbilities =
                UnifiedState.data.lockedPetAbilities || [];
              const petId = message.itemId || message.petId;

              if (UnifiedState.data.settings?.debugMode) {
                productionLog(
                  `🐾 [PetSellDebug] Message type: ${msgType}`,
                  message,
                );
                productionLog(
                  `🐾 [PetSellDebug] Locked abilities:`,
                  lockedAbilities,
                );
              }

              if (lockedAbilities.length > 0 && petId) {
                // Find the pet being sold
                let pet = null;

                // Check active pets
                if (UnifiedState.atoms.activePets) {
                  pet = UnifiedState.atoms.activePets.find(
                    (p) => p.id === petId,
                  );
                }

                // Check inventory if not found in active pets
                if (!pet && UnifiedState.atoms.inventory?.items) {
                  pet = UnifiedState.atoms.inventory.items.find(
                    (item) => item.id === petId && item.itemType === "Pet",
                  );
                }

                if (UnifiedState.data.settings?.debugMode) {
                  productionLog(`🐾 [PetSellDebug] Found pet:`, pet);
                }

                if (pet) {
                  // BETTER APPROACH: Check pet mutations instead of petAbility atom
                  // Gold/Rainbow mutations are ALWAYS present, unlike ability data which may not be populated
                  const petMutations = pet.mutations || [];

                  if (UnifiedState.data.settings?.debugMode) {
                    productionLog(
                      `🐾 [PetSellDebug] Pet mutations:`,
                      petMutations,
                    );

                    // Check petAbility atom as backup
                    let abilityFromAtom = null;
                    if (
                      UnifiedState.atoms.petAbility &&
                      UnifiedState.atoms.petAbility[petId]
                    ) {
                      const abilityData = UnifiedState.atoms.petAbility[petId];
                      abilityFromAtom =
                        abilityData.lastAbilityTrigger?.abilityId;
                      productionLog(
                        `🐾 [PetSellDebug] Pet ability from atom:`,
                        abilityFromAtom,
                      );
                    }
                  }

                  // Check if pet has Gold or Rainbow mutation
                  const hasGoldMutation = petMutations.includes("Gold");
                  const hasRainbowMutation = petMutations.includes("Rainbow");

                  if (UnifiedState.data.settings?.debugMode) {
                    productionLog(
                      `🐾 [PetSellDebug] Has Gold mutation: ${hasGoldMutation}, Has Rainbow mutation: ${hasRainbowMutation}`,
                    );
                  }

                  // Block if mutation matches locked ability
                  const isGoldGranterLocked =
                    lockedAbilities.includes("Gold Granter");
                  const isRainbowGranterLocked =
                    lockedAbilities.includes("Rainbow Granter");

                  const shouldBlockGold =
                    hasGoldMutation && isGoldGranterLocked;
                  const shouldBlockRainbow =
                    hasRainbowMutation && isRainbowGranterLocked;

                  if (UnifiedState.data.settings?.debugMode) {
                    productionLog(
                      `🐾 [PetSellDebug] Should block gold: ${shouldBlockGold}, Should block rainbow: ${shouldBlockRainbow}`,
                    );
                  }

                  if (shouldBlockGold || shouldBlockRainbow) {
                    const blockedType = shouldBlockGold ? "Gold" : "Rainbow";
                    console.warn(
                      `🐾 [PetLock] ❌ BLOCKED selling ${blockedType} pet (${blockedType} Granter is locked)`,
                    );
                    return; // Block the sale
                  } else if (UnifiedState.data.settings?.debugMode) {
                    productionLog(
                      `🐾 [PetSellDebug] ✅ Pet mutations not locked, allowing sale`,
                    );
                  }
                } else if (UnifiedState.data.settings?.debugMode) {
                  productionLog(
                    `🐾 [PetSellDebug] ⚠️ Could not find pet with ID ${petId}`,
                  );
                }
              }
            }

            // Check decor removal blocking
            // CRITICAL: PickupDecor message doesn't include decorId, only localTileIndex!
            // We need to look up what's at that position in the garden
            if (msgType === "PickupDecor") {
              productionLog(
                `🏛️ [DecorCheck] PickupDecor message:`,
                JSON.stringify(message, null, 2),
              );

              const lockedDecor = UnifiedState.data.lockedDecor || [];

              if (lockedDecor.length > 0) {
                // Extract tile information from message
                const tileType = message.tileType;
                const tileIndex = message.localTileIndex;

                productionLog(
                  `🏛️ [DecorCheck] Looking for decor at ${tileType} tile ${tileIndex}`,
                );

                // Look up what decor is at this tile position
                let decorAtPosition = null;

                if (targetWindow.myGarden?.garden) {
                  const garden = targetWindow.myGarden.garden;

                  // Check the appropriate tile collection based on tileType
                  if (tileType === "Boardwalk" && garden.boardwalkTileObjects) {
                    const tile = garden.boardwalkTileObjects[tileIndex];
                    if (tile && tile.objectType === "decor" && tile.decorId) {
                      decorAtPosition = tile.decorId;
                    }
                  } else if (tileType === "Garden" && garden.tileObjects) {
                    const tile = garden.tileObjects[tileIndex];
                    if (tile && tile.objectType === "decor" && tile.decorId) {
                      decorAtPosition = tile.decorId;
                    }
                  }
                }

                productionLog(
                  `🏛️ [DecorCheck] Decor at position: "${decorAtPosition}"`,
                );
                productionLog(
                  `🏛️ [DecorCheck] Locked decor list:`,
                  lockedDecor,
                );

                // Block if this decor is locked
                if (decorAtPosition && lockedDecor.includes(decorAtPosition)) {
                  console.warn(
                    `🏛️ [DecorLock] ❌ BLOCKED pickup of "${decorAtPosition}"`,
                  );
                  return; // Block the pickup
                } else if (decorAtPosition) {
                  productionLog(
                    `🏛️ [DecorCheck] ✅ Decor "${decorAtPosition}" not locked, allowing pickup`,
                  );
                } else {
                  productionLog(
                    `🏛️ [DecorCheck] ⚠️ Could not find decor at tile position`,
                  );
                }
              }
            }

            // Backup scopePath capture for Feed buttons
            if (Array.isArray(message?.scopePath)) {
              targetWindow.__mga_lastScopePath = message.scopePath.slice();
            }

            // Debug hook to see ALL FeedPet messages (native and ours)
            if (message?.type === "FeedPet") {
              productionLog("[FEED-DEBUG] 🔍 FeedPet message being sent:", {
                type: message.type,
                petItemId: message.petItemId,
                cropItemId: message.cropItemId,
                scopePath: message.scopePath,
                fullMsg: JSON.stringify(message),
              });

              // Check if IDs look valid (UUIDs)
              const uuidRegex =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              if (!uuidRegex.test(message.petItemId)) {
                console.error(
                  "[FEED-DEBUG] ❌ Invalid petItemId format:",
                  message.petItemId,
                );
              }
              if (!uuidRegex.test(message.cropItemId)) {
                console.error(
                  "[FEED-DEBUG] ❌ Invalid cropItemId format:",
                  message.cropItemId,
                );
              }
            }

            return originalSendMessage(message, ...rest);
          } catch (err) {
            console.error("[SendMessageHook] Error:", err);
            return originalSendMessage(message, ...rest);
          }
        };

        productionLog("✅ Harvest and sell protection hooks installed");
      }, 2000);

      // Apply initial rules
      applyHarvestRule();
      applySellBlockThreshold();
    }

    function setupNotificationsTabHandlers(context = document) {
      // Notification enabled checkbox
      const notificationEnabledCheckbox = context.querySelector(
        "#notifications-enabled-checkbox",
      );
      if (
        notificationEnabledCheckbox &&
        !notificationEnabledCheckbox.hasAttribute("data-handler-setup")
      ) {
        notificationEnabledCheckbox.setAttribute("data-handler-setup", "true");
        notificationEnabledCheckbox.addEventListener("change", (e) => {
          UnifiedState.data.settings.notifications.enabled = e.target.checked;
          MGA_saveJSON("MGA_data", UnifiedState.data);
          productionLog(
            `🔔 [NOTIFICATIONS] ${e.target.checked ? "Enabled" : "Disabled"} notifications`,
          );
        });
      }

      // Volume slider
      const volumeSlider = context.querySelector("#notification-volume-slider");
      if (volumeSlider && !volumeSlider.hasAttribute("data-handler-setup")) {
        volumeSlider.setAttribute("data-handler-setup", "true");
        volumeSlider.addEventListener("input", (e) => {
          const volume = parseInt(e.target.value) / 100;
          UnifiedState.data.settings.notifications.volume = volume;
          // Update label
          const label = volumeSlider.previousElementSibling;
          label.textContent = `Volume: ${Math.round(volume * 100)}%`;
          MGA_saveJSON("MGA_data", UnifiedState.data);
        });
      }

      // Enable Continuous Mode checkbox
      const continuousCheckbox = context.querySelector(
        "#notification-continuous-checkbox",
      );
      if (
        continuousCheckbox &&
        !continuousCheckbox.hasAttribute("data-handler-setup")
      ) {
        continuousCheckbox.setAttribute("data-handler-setup", "true");

        // On load: if continuous is already enabled, lock acknowledgment checkbox
        if (UnifiedState.data.settings.notifications.continuousEnabled) {
          const acknowledgmentCheckbox = context.querySelector(
            "#notification-acknowledgment-checkbox",
          );
          if (acknowledgmentCheckbox) {
            acknowledgmentCheckbox.checked = true;
            acknowledgmentCheckbox.disabled = true;
            UnifiedState.data.settings.notifications.requiresAcknowledgment = true;
          }

          // CRITICAL: Also ensure dropdown is set to continuous if checkbox is checked
          const notificationTypeSelect = context.querySelector(
            "#notification-type-select",
          );
          if (notificationTypeSelect) {
            notificationTypeSelect.value = "continuous";
            UnifiedState.data.settings.notifications.notificationType =
              "continuous";
            productionLog(
              "🔊 [NOTIFICATIONS] Auto-selected continuous in dropdown (checkbox was checked on load)",
            );
          }
        }

        continuousCheckbox.addEventListener("change", (e) => {
          UnifiedState.data.settings.notifications.continuousEnabled =
            e.target.checked;

          // When enabling continuous mode, force acknowledgment to be enabled AND disabled (locked)
          const acknowledgmentCheckbox = context.querySelector(
            "#notification-acknowledgment-checkbox",
          );
          if (acknowledgmentCheckbox) {
            if (e.target.checked) {
              acknowledgmentCheckbox.checked = true;
              acknowledgmentCheckbox.disabled = true; // Lock it on
              UnifiedState.data.settings.notifications.requiresAcknowledgment = true;
              productionLog(
                `🚨 [NOTIFICATIONS] Auto-enabled and locked acknowledgment (required for continuous alarms)`,
              );
            } else {
              acknowledgmentCheckbox.disabled = false; // Unlock when continuous is off
            }
          }

          // Update dropdown state
          const notificationTypeSelect = context.querySelector(
            "#notification-type-select",
          );
          if (notificationTypeSelect) {
            const continuousOption = notificationTypeSelect.querySelector(
              'option[value="continuous"]',
            );
            if (continuousOption) {
              continuousOption.disabled = !e.target.checked;

              if (e.target.checked) {
                // When checking: Save current selection and auto-select continuous
                if (notificationTypeSelect.value !== "continuous") {
                  UnifiedState.data.settings.notifications.previousNotificationType =
                    notificationTypeSelect.value;
                  notificationTypeSelect.value = "continuous";
                  UnifiedState.data.settings.notifications.notificationType =
                    "continuous";
                  productionLog(
                    `🔊 [NOTIFICATIONS] Saved previous type (${UnifiedState.data.settings.notifications.previousNotificationType}), auto-selected continuous`,
                  );
                }
              } else {
                // When unchecking: Restore previous selection (or default to epic)
                if (notificationTypeSelect.value === "continuous") {
                  const previousType =
                    UnifiedState.data.settings.notifications
                      .previousNotificationType || "epic";
                  notificationTypeSelect.value = previousType;
                  UnifiedState.data.settings.notifications.notificationType =
                    previousType;
                  productionLog(
                    `🔊 [NOTIFICATIONS] Continuous mode disabled, reverted to ${previousType}`,
                  );
                }
              }
            }
          }

          MGA_saveJSON("MGA_data", UnifiedState.data);
          productionLog(
            `⚠️ [NOTIFICATIONS] Continuous mode enabled: ${e.target.checked}`,
          );
        });
      }

      // Notification type selector
      const notificationTypeSelect = context.querySelector(
        "#notification-type-select",
      );
      if (
        notificationTypeSelect &&
        !notificationTypeSelect.hasAttribute("data-handler-setup")
      ) {
        notificationTypeSelect.setAttribute("data-handler-setup", "true");

        // Explicitly restore saved value (defensive - ensures dropdown matches saved state)
        const savedNotificationType =
          UnifiedState.data.settings.notifications.notificationType || "epic";
        notificationTypeSelect.value = savedNotificationType;
        productionLog(
          `🔊 [NOTIFICATIONS] Restored notification type to: ${savedNotificationType}`,
        );

        // On load: if continuous type is selected, lock acknowledgment checkbox
        if (
          UnifiedState.data.settings.notifications.notificationType ===
          "continuous"
        ) {
          const acknowledgmentCheckbox = context.querySelector(
            "#notification-acknowledgment-checkbox",
          );
          if (acknowledgmentCheckbox) {
            acknowledgmentCheckbox.checked = true;
            acknowledgmentCheckbox.disabled = true;
            UnifiedState.data.settings.notifications.requiresAcknowledgment = true;
          }
        }

        notificationTypeSelect.addEventListener("change", (e) => {
          // Prevent selecting continuous if not enabled
          if (
            e.target.value === "continuous" &&
            !UnifiedState.data.settings.notifications.continuousEnabled
          ) {
            e.target.value =
              UnifiedState.data.settings.notifications.notificationType ||
              "epic";
            productionWarn(
              `⚠️ [NOTIFICATIONS] Cannot select continuous mode - please enable it first`,
            );
            showVisualNotification(
              "⚠️ Please enable Continuous Mode checkbox first",
              false,
            );
            return;
          }

          UnifiedState.data.settings.notifications.notificationType =
            e.target.value;

          // When selecting continuous, force acknowledgment to be enabled AND locked
          const acknowledgmentCheckbox = context.querySelector(
            "#notification-acknowledgment-checkbox",
          );
          if (acknowledgmentCheckbox) {
            if (e.target.value === "continuous") {
              acknowledgmentCheckbox.checked = true;
              acknowledgmentCheckbox.disabled = true; // Lock it on
              UnifiedState.data.settings.notifications.requiresAcknowledgment = true;
              productionLog(
                `🚨 [NOTIFICATIONS] Auto-enabled and locked acknowledgment (required for continuous alarms)`,
              );
            } else {
              // When changing away from continuous, unlock the acknowledgment checkbox
              // (unless continuous mode checkbox is still enabled)
              if (!UnifiedState.data.settings.notifications.continuousEnabled) {
                acknowledgmentCheckbox.disabled = false;
              }
            }
          }

          MGA_saveJSON("MGA_data", UnifiedState.data);
          productionLog(
            `🔊 [NOTIFICATIONS] Sound type changed to: ${e.target.value}`,
          );
        });
      }

      // Acknowledgment required checkbox
      const acknowledgmentCheckbox = context.querySelector(
        "#notification-acknowledgment-checkbox",
      );
      if (
        acknowledgmentCheckbox &&
        !acknowledgmentCheckbox.hasAttribute("data-handler-setup")
      ) {
        acknowledgmentCheckbox.setAttribute("data-handler-setup", "true");

        // Explicitly restore saved value
        acknowledgmentCheckbox.checked =
          UnifiedState.data.settings.notifications.requiresAcknowledgment ||
          false;
        productionLog(
          `🚨 [NOTIFICATIONS] Restored acknowledgment checkbox to: ${acknowledgmentCheckbox.checked}`,
        );

        acknowledgmentCheckbox.addEventListener("change", (e) => {
          UnifiedState.data.settings.notifications.requiresAcknowledgment =
            e.target.checked;
          MGA_saveJSON("MGA_data", UnifiedState.data);
          productionLog(
            `🚨 [NOTIFICATIONS] Require acknowledgment: ${e.target.checked}`,
          );
        });
      }

      // Test notification button
      const testNotificationBtn = context.querySelector(
        "#test-notification-btn",
      );
      if (
        testNotificationBtn &&
        !testNotificationBtn.hasAttribute("data-handler-setup")
      ) {
        testNotificationBtn.setAttribute("data-handler-setup", "true");
        testNotificationBtn.addEventListener("click", () => {
          const notifications = UnifiedState.data.settings.notifications;
          playSelectedNotification();
          queueNotification(
            "🔔 Test notification - This is how alerts will look!",
            notifications.requiresAcknowledgment,
          );
          productionLog(
            `🔔 [NOTIFICATIONS] Test notification played - Type: ${notifications.notificationType}, Volume: ${Math.round(notifications.volume * 100)}%, Acknowledgment: ${notifications.requiresAcknowledgment}`,
          );
        });
      }

      // Seed watch checkboxes
      const seedWatchMap = {};

      UnifiedState.plantsDatabase.forEach((plant) => {
        if (plant.inShop) {
          seedWatchMap[`watch-${plant.id.toLowerCase()}`] = plant.name;
        }
      });

      Object.entries(seedWatchMap).forEach(([checkboxId, seedId]) => {
        const checkbox = context.querySelector(`#${checkboxId}`);
        if (checkbox && !checkbox.hasAttribute("data-handler-setup")) {
          checkbox.setAttribute("data-handler-setup", "true");
          checkbox.addEventListener("change", (e) => {
            const notifications = UnifiedState.data.settings.notifications;
            if (e.target.checked) {
              if (!notifications.watchedSeeds.includes(seedId)) {
                notifications.watchedSeeds.push(seedId);
              }
            } else {
              notifications.watchedSeeds = notifications.watchedSeeds.filter(
                (id) => id !== seedId,
              );
            }
            MGA_saveJSON("MGA_data", UnifiedState.data);
            productionLog(
              `🌱 [NOTIFICATIONS] ${e.target.checked ? "Added" : "Removed"} ${seedId} to/from watch list`,
            );
            updateLastSeenDisplay();
          });
        }
      });

      // Egg watch checkboxes
      const eggWatchMap = {
        "watch-common-egg": "CommonEgg",
        "watch-uncommon-egg": "UncommonEgg",
        "watch-rare-egg": "RareEgg",
        "watch-snow-egg": "SnowEgg",
        "watch-horse-egg": "HorseEgg",
        "watch-legendary-egg": "LegendaryEgg",
        "watch-mythical-egg": "MythicalEgg",
      };

      Object.entries(eggWatchMap).forEach(([checkboxId, eggId]) => {
        const checkbox = context.querySelector(`#${checkboxId}`);
        if (checkbox && !checkbox.hasAttribute("data-handler-setup")) {
          checkbox.setAttribute("data-handler-setup", "true");
          checkbox.addEventListener("change", (e) => {
            const notifications = UnifiedState.data.settings.notifications;
            if (e.target.checked) {
              if (!notifications.watchedEggs.includes(eggId)) {
                notifications.watchedEggs.push(eggId);
              }
            } else {
              notifications.watchedEggs = notifications.watchedEggs.filter(
                (id) => id !== eggId,
              );
            }
            MGA_saveJSON("MGA_data", UnifiedState.data);
            productionLog(
              `🥚 [NOTIFICATIONS] ${e.target.checked ? "Added" : "Removed"} ${eggId} to/from watch list`,
            );
            updateLastSeenDisplay();
          });
        }
      });

      // Update last seen display function
      function updateLastSeenDisplay() {
        const lastSeenDisplay = context.querySelector("#last-seen-display");
        if (!lastSeenDisplay) return;

        const notifications = UnifiedState.data.settings.notifications;
        const allWatched = [
          ...notifications.watchedSeeds,
          ...notifications.watchedEggs,
        ];

        if (allWatched.length === 0) {
          lastSeenDisplay.innerHTML = "No items being watched";
          return;
        }

        let html = "";
        allWatched.forEach((itemId) => {
          const timeSince = getTimeSinceLastSeen(itemId);
          html += `<div>${itemId}: ${timeSince}</div>`;
        });

        lastSeenDisplay.innerHTML = html;
      }

      // Initial last seen update
      updateLastSeenDisplay();

      // Update last seen display every 30 seconds
      setInterval(updateLastSeenDisplay, 30000);

      // ==================== NEW NOTIFICATION HANDLERS ====================

      // Pet hunger enabled checkbox
      const petHungerCheckbox = context.querySelector("#pet-hunger-enabled");
      if (
        petHungerCheckbox &&
        !petHungerCheckbox.hasAttribute("data-handler-setup")
      ) {
        petHungerCheckbox.setAttribute("data-handler-setup", "true");
        petHungerCheckbox.addEventListener("change", (e) => {
          UnifiedState.data.settings.notifications.petHungerEnabled =
            e.target.checked;
          MGA_saveJSON("MGA_data", UnifiedState.data);
          productionLog(
            `🐾 [PET-HUNGER] ${e.target.checked ? "Enabled" : "Disabled"} pet hunger notifications`,
          );

          // BUGFIX: Scan for currently hungry pets when enabling alerts
          if (e.target.checked) {
            // Delay slightly to ensure atoms are available
            setTimeout(() => {
              scanAndAlertHungryPets();
            }, 500);
          }
        });
      }

      // Pet hunger threshold slider
      const petHungerThreshold = context.querySelector("#pet-hunger-threshold");
      if (
        petHungerThreshold &&
        !petHungerThreshold.hasAttribute("data-handler-setup")
      ) {
        petHungerThreshold.setAttribute("data-handler-setup", "true");
        petHungerThreshold.addEventListener("input", (e) => {
          const threshold = parseInt(e.target.value);
          UnifiedState.data.settings.notifications.petHungerThreshold =
            threshold;
          // Update label
          const label = petHungerThreshold.previousElementSibling;
          label.textContent = `Alert when hunger below: ${threshold}%`;
          MGA_saveJSON("MGA_data", UnifiedState.data);
          productionLog(`🐾 [PET-HUNGER] Threshold set to ${threshold}%`);
        });
      }

      // Ability notifications enabled checkbox
      const abilityNotificationsCheckbox = context.querySelector(
        "#ability-notifications-enabled",
      );
      if (
        abilityNotificationsCheckbox &&
        !abilityNotificationsCheckbox.hasAttribute("data-handler-setup")
      ) {
        abilityNotificationsCheckbox.setAttribute("data-handler-setup", "true");
        abilityNotificationsCheckbox.addEventListener("change", (e) => {
          UnifiedState.data.settings.notifications.abilityNotificationsEnabled =
            e.target.checked;
          MGA_saveJSON("MGA_data", UnifiedState.data);
          productionLog(
            `✨ [ABILITY-NOTIFY] ${e.target.checked ? "Enabled" : "Disabled"} ability notifications`,
          );
        });
      }

      // Ability notification sound type selector
      const abilityNotificationSoundSelect = context.querySelector(
        "#ability-notification-sound-select",
      );
      if (
        abilityNotificationSoundSelect &&
        !abilityNotificationSoundSelect.hasAttribute("data-handler-setup")
      ) {
        abilityNotificationSoundSelect.setAttribute(
          "data-handler-setup",
          "true",
        );
        abilityNotificationSoundSelect.addEventListener("change", (e) => {
          UnifiedState.data.settings.notifications.abilityNotificationSound =
            e.target.value;
          MGA_saveJSON("MGA_data", UnifiedState.data);
          productionLog(
            `✨ [ABILITY-NOTIFY] Sound type changed to: ${e.target.value}`,
          );
        });
      }

      // Ability notification volume slider
      const abilityVolumeSlider = context.querySelector(
        "#ability-notification-volume-slider",
      );
      if (
        abilityVolumeSlider &&
        !abilityVolumeSlider.hasAttribute("data-handler-setup")
      ) {
        abilityVolumeSlider.setAttribute("data-handler-setup", "true");
        abilityVolumeSlider.addEventListener("input", (e) => {
          const volume = parseInt(e.target.value) / 100;
          UnifiedState.data.settings.notifications.abilityNotificationVolume =
            volume;
          // Update label
          const label = abilityVolumeSlider.previousElementSibling;
          label.textContent = `Ability Alert Volume: ${Math.round(volume * 100)}%`;
          MGA_saveJSON("MGA_data", UnifiedState.data);
        });
      }

      // Individual ability checkboxes
      const individualAbilityCheckboxes = context.querySelectorAll(
        ".individual-ability-checkbox",
      );
      individualAbilityCheckboxes.forEach((checkbox) => {
        if (!checkbox.hasAttribute("data-handler-setup")) {
          checkbox.setAttribute("data-handler-setup", "true");
          checkbox.addEventListener("change", (e) => {
            const abilityName = e.target.dataset.abilityName;
            if (!UnifiedState.data.settings.notifications.watchedAbilities) {
              UnifiedState.data.settings.notifications.watchedAbilities = [];
            }

            if (e.target.checked) {
              // Add to watched list
              if (
                !UnifiedState.data.settings.notifications.watchedAbilities.includes(
                  abilityName,
                )
              ) {
                UnifiedState.data.settings.notifications.watchedAbilities.push(
                  abilityName,
                );
              }
            } else {
              // Remove from watched list
              const index =
                UnifiedState.data.settings.notifications.watchedAbilities.indexOf(
                  abilityName,
                );
              if (index > -1) {
                UnifiedState.data.settings.notifications.watchedAbilities.splice(
                  index,
                  1,
                );
              }
            }

            MGA_saveJSON("MGA_data", UnifiedState.data);
            productionLog(
              `✨ [ABILITY-NOTIFY] ${abilityName}: ${e.target.checked ? "Enabled" : "Disabled"}`,
            );
          });
        }
      });

      // Ability search box
      const abilitySearchBox = context.querySelector("#ability-search-box");
      if (
        abilitySearchBox &&
        !abilitySearchBox.hasAttribute("data-handler-setup")
      ) {
        abilitySearchBox.setAttribute("data-handler-setup", "true");
        abilitySearchBox.addEventListener("input", (e) => {
          const query = e.target.value.toLowerCase();
          const items = context.querySelectorAll(".ability-checkbox-item");
          items.forEach((item) => {
            const abilityName = item.dataset.ability.toLowerCase();
            item.style.display = abilityName.includes(query) ? "flex" : "none";
          });
        });
      }

      // Select All individual abilities button
      const selectAllIndividualAbilities = context.querySelector(
        "#select-all-individual-abilities",
      );
      if (
        selectAllIndividualAbilities &&
        !selectAllIndividualAbilities.hasAttribute("data-handler-setup")
      ) {
        selectAllIndividualAbilities.setAttribute("data-handler-setup", "true");
        selectAllIndividualAbilities.addEventListener("click", () => {
          // Empty array means all abilities enabled (backward compatibility)
          UnifiedState.data.settings.notifications.watchedAbilities = [];

          // Update all checkboxes
          context
            .querySelectorAll(".individual-ability-checkbox")
            .forEach((checkbox) => {
              checkbox.checked = true;
            });

          MGA_saveJSON("MGA_data", UnifiedState.data);
          productionLog("✨ [ABILITY-NOTIFY] Enabled all abilities");
        });
      }

      // Select None individual abilities button
      const selectNoneIndividualAbilities = context.querySelector(
        "#select-none-individual-abilities",
      );
      if (
        selectNoneIndividualAbilities &&
        !selectNoneIndividualAbilities.hasAttribute("data-handler-setup")
      ) {
        selectNoneIndividualAbilities.setAttribute(
          "data-handler-setup",
          "true",
        );
        selectNoneIndividualAbilities.addEventListener("click", () => {
          // Get all ability names
          const allAbilities = [];
          context
            .querySelectorAll(".individual-ability-checkbox")
            .forEach((checkbox) => {
              allAbilities.push(checkbox.dataset.abilityName);
            });

          // Set watchedAbilities to opposite - if we want none, we list all then check against not-in-list
          // Actually, better approach: use a special flag or empty means all, populated means only those
          // For "none", we need a way to indicate "empty set of abilities"
          // Let's use: populated array with abilities = only those; empty array = all; null = none
          UnifiedState.data.settings.notifications.watchedAbilities = [
            "__NONE__",
          ]; // Special marker

          // Update all checkboxes
          context
            .querySelectorAll(".individual-ability-checkbox")
            .forEach((checkbox) => {
              checkbox.checked = false;
            });

          MGA_saveJSON("MGA_data", UnifiedState.data);
          productionLog("✨ [ABILITY-NOTIFY] Disabled all abilities");
        });
      }

      // Weather notifications enabled checkbox
      const weatherNotificationsCheckbox = context.querySelector(
        "#weather-notifications-enabled",
      );
      if (
        weatherNotificationsCheckbox &&
        !weatherNotificationsCheckbox.hasAttribute("data-handler-setup")
      ) {
        weatherNotificationsCheckbox.setAttribute("data-handler-setup", "true");
        weatherNotificationsCheckbox.addEventListener("change", (e) => {
          UnifiedState.data.settings.notifications.weatherNotificationsEnabled =
            e.target.checked;
          MGA_saveJSON("MGA_data", UnifiedState.data);
          productionLog(
            `🌤️ [WEATHER] ${e.target.checked ? "Enabled" : "Disabled"} weather notifications`,
          );
        });
      }

      // Weather event checkboxes
      const weatherEventMap = {
        "watch-snow": "Snow",
        "watch-rain": "Rain",
        "watch-amber-moon": "AmberMoon",
        "watch-dawn": "Dawn",
      };

      Object.entries(weatherEventMap).forEach(([checkboxId, eventName]) => {
        const checkbox = context.querySelector(`#${checkboxId}`);
        if (checkbox && !checkbox.hasAttribute("data-handler-setup")) {
          checkbox.setAttribute("data-handler-setup", "true");
          checkbox.addEventListener("change", (e) => {
            const watchedEvents =
              UnifiedState.data.settings.notifications.watchedWeatherEvents;
            if (e.target.checked) {
              if (!watchedEvents.includes(eventName)) {
                watchedEvents.push(eventName);
              }
            } else {
              const idx = watchedEvents.indexOf(eventName);
              if (idx > -1) watchedEvents.splice(idx, 1);
            }
            MGA_saveJSON("MGA_data", UnifiedState.data);
            productionLog(
              `🌤️ [WEATHER] ${e.target.checked ? "Added" : "Removed"} ${eventName} to/from watch list`,
            );
          });
        }
      });

      // ========== CUSTOM NOTIFICATION SOUNDS ==========
      const customSoundsContainer = context.querySelector(
        "#custom-sounds-container",
      );
      if (
        customSoundsContainer &&
        !customSoundsContainer.hasAttribute("data-handler-setup")
      ) {
        customSoundsContainer.setAttribute("data-handler-setup", "true");

        const soundTypes = [
          { id: "shop", label: "🛒 Shop Alerts" },
          { id: "pet", label: "🐾 Pet Hunger" },
          { id: "ability", label: "⚡ Ability Triggers" },
          { id: "weather", label: "🌤️ Weather Events" },
        ];

        soundTypes.forEach((type) => {
          const hasCustom =
            GM_getValue(`mgtools_custom_sound_${type.id}`, null) !== null;

          const controlDiv = document.createElement("div");
          controlDiv.style.cssText =
            "border: 1px solid rgba(255, 255, 255, 0.57); padding: 10px; border-radius: 6px; background: rgba(0, 0, 0, 0.48);";
          controlDiv.innerHTML = `
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                          <label class="mga-label" style="margin: 0;">${type.label}</label>
                          <span id="custom-sound-status-${type.id}" style="font-size: 10px; color: ${hasCustom ? "#10b981" : "#666"};">
                              ${hasCustom ? "✓ Custom" : "○ Default"}
                          </span>
                      </div>
                      <div style="display: flex; gap: 6px;">
                          <input type="file" accept="audio/*" id="upload-sound-${type.id}" style="display: none;">
                          <button class="mga-btn mga-btn-sm" id="upload-btn-${type.id}" style="flex: 1; background: #4a9eff; font-size: 11px; padding: 6px;">📁 Upload</button>
                          <button class="mga-btn mga-btn-sm" id="test-btn-${type.id}" style="flex: 0.6; background: #10b981; font-size: 11px; padding: 6px;">▶️ Test</button>
                          <button class="mga-btn mga-btn-sm" id="delete-btn-${type.id}" style="flex: 0.6; background: ${hasCustom ? "#ef4444" : "#666"}; font-size: 11px; padding: 6px;" ${!hasCustom ? "disabled" : ""}>🗑️</button>
                      </div>
                  `;
          customSoundsContainer.appendChild(controlDiv);

          const uploadBtn = controlDiv.querySelector(`#upload-btn-${type.id}`);
          const fileInput = controlDiv.querySelector(
            `#upload-sound-${type.id}`,
          );
          uploadBtn.addEventListener("click", () => fileInput.click());

          fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
              alert("❌ File too large! Max 2MB");
              return;
            }
            if (!file.type.startsWith("audio/")) {
              alert("❌ Please upload an audio file");
              return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
              GM_setValue(
                `mgtools_custom_sound_${type.id}`,
                event.target.result,
              );
              controlDiv.querySelector(
                `#custom-sound-status-${type.id}`,
              ).textContent = "✓ Custom";
              controlDiv.querySelector(
                `#custom-sound-status-${type.id}`,
              ).style.color = "#10b981";
              const delBtn = controlDiv.querySelector(`#delete-btn-${type.id}`);
              delBtn.disabled = false;
              delBtn.style.background = "#ef4444";
              productionLog(`🎵 [CUSTOM-SOUND] Uploaded: ${type.id}`);
              alert(`✅ Custom sound uploaded!`);
            };
            reader.readAsDataURL(file);
          });

          controlDiv
            .querySelector(`#test-btn-${type.id}`)
            .addEventListener("click", () => {
              const customSound = GM_getValue(
                `mgtools_custom_sound_${type.id}`,
                null,
              );
              const volume =
                UnifiedState.data.settings.notifications.volume || 0.3;
              if (customSound) {
                const audio = new Audio(customSound);
                audio.volume = volume;
                audio.play();
              } else {
                playSelectedNotification();
              }
            });

          controlDiv
            .querySelector(`#delete-btn-${type.id}`)
            .addEventListener("click", () => {
              if (confirm(`Delete custom sound for ${type.label}?`)) {
                GM_deleteValue(`mgtools_custom_sound_${type.id}`);
                controlDiv.querySelector(
                  `#custom-sound-status-${type.id}`,
                ).textContent = "○ Default";
                controlDiv.querySelector(
                  `#custom-sound-status-${type.id}`,
                ).style.color = "#666";
                const delBtn = controlDiv.querySelector(
                  `#delete-btn-${type.id}`,
                );
                delBtn.disabled = true;
                delBtn.style.background = "#666";
                alert(`✅ Reverted to default sound`);
              }
            });
        });
      }
    }

    function setupSettingsTabHandlers(context = document) {
      productionLog("🚨 [CRITICAL-DEBUG] setupSettingsTabHandlers ENTERED");
      productionLog("⚙️ [SETTINGS] setupSettingsTabHandlers called", {
        context: context === document ? "document" : "custom",
      });
      productionLog(
        "🚨 [CRITICAL-DEBUG] Context type:",
        context === document ? "DOCUMENT" : "ELEMENT",
        context,
      );

      // Compatibility Mode toggle button
      const compatToggleBtn = context.querySelector("#compat-toggle-btn");
      if (compatToggleBtn && typeof CompatibilityMode !== "undefined") {
        compatToggleBtn.addEventListener("click", () => {
          if (CompatibilityMode.flags.enabled) {
            // Disable compatibility mode
            CompatibilityMode.disableCompat();
            logInfo(
              "COMPAT",
              "User disabled compatibility mode - reload required",
            );
            alert(
              "Compatibility Mode disabled. Please refresh the page for changes to take effect.",
            );
          } else {
            // Enable compatibility mode
            try {
              localStorage.setItem("mgtools_compat_forced", "true");
              localStorage.removeItem("mgtools_compat_disabled");
              logInfo(
                "COMPAT",
                "User enabled compatibility mode - reload required",
              );
              alert(
                "Compatibility Mode enabled. Please refresh the page for changes to take effect.",
              );
            } catch (e) {
              alert(
                "Unable to save compatibility mode setting. Your browser may have storage restrictions.",
              );
            }
          }

          // Offer to reload
          if (confirm("Would you like to reload the page now?")) {
            window.location.reload();
          }
        });
      }

      // Opacity slider
      const opacitySlider = context.querySelector("#opacity-slider");
      if (opacitySlider) {
        opacitySlider.addEventListener("input", (e) => {
          const opacity = parseInt(e.target.value);
          UnifiedState.data.settings.opacity = opacity;
          applyTheme();
          // Update label
          const label = opacitySlider.previousElementSibling;
          label.textContent = `Main HUD Opacity: ${opacity}%`;
          MGA_saveJSON("MGA_data", UnifiedState.data);
        });
      }

      // Pop-out opacity slider
      const popoutOpacitySlider = context.querySelector(
        "#popout-opacity-slider",
      );
      if (popoutOpacitySlider) {
        popoutOpacitySlider.addEventListener("input", (e) => {
          const popoutOpacity = parseInt(e.target.value);
          UnifiedState.data.settings.popoutOpacity = popoutOpacity;
          syncThemeToAllWindows(); // Apply theme to pop-out windows only
          // Update label
          const label = popoutOpacitySlider.previousElementSibling;
          label.textContent = `Pop-out Opacity: ${popoutOpacity}%`;
          MGA_saveJSON("MGA_data", UnifiedState.data);
        });
      }

      // Gradient select
      const gradientSelect = context.querySelector("#gradient-select");
      if (gradientSelect) {
        gradientSelect.addEventListener("change", (e) => {
          UnifiedState.data.settings.gradientStyle = e.target.value;
          applyTheme();
          MGA_saveJSON("MGA_data", UnifiedState.data);
        });
      }

      // Effect select
      const effectSelect = context.querySelector("#effect-select");
      if (effectSelect) {
        effectSelect.addEventListener("change", (e) => {
          UnifiedState.data.settings.effectStyle = e.target.value;
          applyTheme();
          MGA_saveJSON("MGA_data", UnifiedState.data);
        });
      }

      // Theme preset buttons
      const themePresetButtons = context.querySelectorAll("[data-preset]");
      themePresetButtons.forEach((btn) => {
        if (!btn.hasAttribute("data-handler-setup")) {
          btn.setAttribute("data-handler-setup", "true");
          btn.addEventListener("click", (e) => {
            const presetName = e.target.dataset.preset;

            // Apply the preset
            applyPreset(presetName);

            // Apply theme immediately
            applyTheme();

            // Save the settings
            MGA_saveJSON("MGA_data", UnifiedState.data);

            // Update UI elements to reflect new values
            // Update opacity slider
            const opacitySlider = context.querySelector("#opacity-slider");
            if (opacitySlider) {
              opacitySlider.value = UnifiedState.data.settings.opacity;
              const label = opacitySlider.previousElementSibling;
              if (label) {
                label.textContent = `Main HUD Opacity: ${UnifiedState.data.settings.opacity}%`;
              }
            }

            // Update gradient select
            const gradientSelect = context.querySelector("#gradient-select");
            if (gradientSelect) {
              gradientSelect.value = UnifiedState.data.settings.gradientStyle;
            }

            // Update effect select
            const effectSelect = context.querySelector("#effect-select");
            if (effectSelect) {
              effectSelect.value = UnifiedState.data.settings.effectStyle;
            }

            productionLog(`🎨 Applied theme preset: ${presetName}`);
          });
        }
      });

      // Texture select
      const textureSelect = context.querySelector("#texture-select");
      if (textureSelect) {
        textureSelect.addEventListener("change", (e) => {
          UnifiedState.data.settings.textureStyle = e.target.value;
          applyTheme();
          MGA_saveJSON("MGA_data", UnifiedState.data);
        });
      }

      // Texture intensity slider
      const intensitySlider = context.querySelector(
        "#texture-intensity-slider",
      );
      const intensityValue = context.querySelector("#texture-intensity-value");
      if (intensitySlider && intensityValue) {
        intensitySlider.addEventListener("input", (e) => {
          const value = e.target.value;
          intensityValue.textContent = value + "%";
          UnifiedState.data.settings.textureIntensity = parseInt(value);
          applyTheme();
        });
        intensitySlider.addEventListener("change", (e) => {
          MGA_saveJSON("MGA_data", UnifiedState.data);
        });
      }

      // Texture scale buttons
      const scaleButtons = context.querySelectorAll(".texture-scale-btn");
      if (scaleButtons.length > 0) {
        scaleButtons.forEach((btn) => {
          btn.addEventListener("click", (e) => {
            const scale = e.target.dataset.scale;
            UnifiedState.data.settings.textureScale = scale;

            // Update button styles
            scaleButtons.forEach((b) => {
              b.style.background = "";
              b.style.color = "";
            });
            e.target.style.background = "#4a9eff";
            e.target.style.color = "white";

            applyTheme();
            MGA_saveJSON("MGA_data", UnifiedState.data);
          });
        });
      }

      // Texture blend mode selector
      const blendModeSelect = context.querySelector("#texture-blend-mode");
      if (blendModeSelect) {
        blendModeSelect.addEventListener("change", (e) => {
          UnifiedState.data.settings.textureBlendMode = e.target.value;
          applyTheme();
          MGA_saveJSON("MGA_data", UnifiedState.data);
        });
      }

      // Ultra-compact mode checkbox
      const ultraCompactCheckbox = context.querySelector(
        "#ultra-compact-checkbox",
      );
      if (ultraCompactCheckbox) {
        // Remove any existing listeners by cloning
        const newCheckbox = ultraCompactCheckbox.cloneNode(true);
        ultraCompactCheckbox.parentNode.replaceChild(
          newCheckbox,
          ultraCompactCheckbox,
        );

        newCheckbox.addEventListener("change", (e) => {
          e.stopPropagation();
          UnifiedState.data.settings.ultraCompactMode = e.target.checked;
          MGA_saveJSON("MGA_data", UnifiedState.data);
          applyUltraCompactMode(e.target.checked);
          productionLog(
            `📱 Ultra-compact mode ${e.target.checked ? "enabled" : "disabled"}`,
          );
        });
      }

      // FIX ISSUE B: Hide feed buttons checkbox
      const hideFeedButtonsCheckbox = context.querySelector(
        "#hide-feed-buttons-checkbox",
      );
      if (hideFeedButtonsCheckbox) {
        hideFeedButtonsCheckbox.addEventListener("change", (e) => {
          UnifiedState.data.settings.hideFeedButtons = e.target.checked;
          MGA_saveJSON("MGA_data", UnifiedState.data);

          // Toggle visibility immediately
          const allFeedButtons = targetDocument.querySelectorAll(
            ".mgtools-instant-feed-btn",
          );
          allFeedButtons.forEach((btn) => {
            btn.style.setProperty(
              "display",
              e.target.checked ? "none" : "block",
              "important",
            );
          });

          productionLog(
            `[MGTOOLS-FIX-B] Feed buttons ${e.target.checked ? "hidden" : "shown"}`,
          );
          productionLog(
            `🍃 Instant feed buttons ${e.target.checked ? "hidden" : "shown"}`,
          );
        });
      }

      // Overlay mode checkbox
      const overlayCheckbox = context.querySelector("#use-overlays-checkbox");
      if (overlayCheckbox) {
        overlayCheckbox.addEventListener("change", (e) => {
          UnifiedState.data.settings.useInGameOverlays = e.target.checked;
          MGA_saveJSON("MGA_data", UnifiedState.data);
          productionLog(
            `🎮 Overlay mode ${e.target.checked ? "enabled" : "disabled"}`,
          );
        });
      }

      const keepAliveAudioCheckbox = context.querySelector(
        "#keep-alive-audio-checkbox",
      );
      if (keepAliveAudioCheckbox) {
        keepAliveAudioCheckbox.addEventListener("change", (e) => {
          if (!UnifiedState.data.settings.keepAliveAudio) {
            UnifiedState.data.settings.keepAliveAudio = {
              enabled: false,
              volume: 0.008,
              frequency: 72,
            };
          }

          UnifiedState.data.settings.keepAliveAudio.enabled = e.target.checked;
          MGA_saveJSON("MGA_data", UnifiedState.data);

          if (typeof syncKeepAliveAudio === "function") {
            syncKeepAliveAudio();
          } else if (typeof window.MGTools_syncKeepAliveAudio === "function") {
            window.MGTools_syncKeepAliveAudio();
          }

          productionLog(
            `[KEEP-ALIVE] Audio loop ${e.target.checked ? "enabled" : "disabled"}`,
          );
        });
      }

      // Debug mode checkbox
      const debugModeCheckbox = context.querySelector("#debug-mode-checkbox");
      if (debugModeCheckbox) {
        debugModeCheckbox.addEventListener("change", (e) => {
          UnifiedState.data.settings.debugMode = e.target.checked;
          MGA_saveJSON("MGA_data", UnifiedState.data);
          productionLog(
            `🐛 Debug mode ${e.target.checked ? "enabled" : "disabled"}`,
          );
        });
      }

      // Room debug mode checkbox
      const roomDebugModeCheckbox = context.querySelector(
        "#room-debug-mode-checkbox",
      );
      if (roomDebugModeCheckbox) {
        roomDebugModeCheckbox.addEventListener("change", (e) => {
          UnifiedState.data.settings.roomDebugMode = e.target.checked;
          MGA_saveJSON("MGA_data", UnifiedState.data);
          productionLog(
            `[MGTools] Room debug mode ${e.target.checked ? "enabled" : "disabled"}`,
          );
        });
      }

      // Preset buttons
      context.querySelectorAll("[data-preset]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const preset = e.target.dataset.preset;
          applyPreset(preset);
        });
      });

      // Export/Import
      const exportBtn = context.querySelector("#export-settings-btn");
      if (exportBtn) {
        exportBtn.addEventListener("click", () => {
          const data = JSON.stringify(UnifiedState.data, null, 2);
          const blob = new Blob([data], { type: "application/json" });
          const link = targetDocument.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = "MGA_Settings.json";
          link.click();
        });
      }

      // Import settings handler
      const importBtn = context.querySelector("#import-settings-btn");
      if (importBtn) {
        importBtn.addEventListener("click", () => {
          const fileInput = targetDocument.createElement("input");
          fileInput.type = "file";
          fileInput.accept = ".json";
          fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
              try {
                const importedData = JSON.parse(event.target.result);

                // Validate it's a data object
                if (typeof importedData !== "object" || importedData === null) {
                  throw new Error("Invalid data format");
                }

                // Merge imported data with current data (preserve any new data not in import)
                UnifiedState.data = { ...UnifiedState.data, ...importedData };

                // Save to storage
                MGA_saveJSON("MGA_data", UnifiedState.data);

                // Apply theme immediately
                applyTheme();

                // Apply other settings
                if (UnifiedState.data.settings.ultraCompactMode) {
                  applyUltraCompactMode(true);
                }

                productionLog("✅ Settings imported successfully!");
                showNotificationToast(
                  "✅ Settings imported and applied!",
                  "success",
                );

                // Refresh UI to show updated settings
                if (UnifiedState.activeTab === "settings") {
                  updateTabContent();
                }
              } catch (error) {
                console.error("Failed to import settings:", error);
                showNotificationToast(
                  "❌ Failed to import settings. Invalid file format.",
                  "error",
                );
              }
            };
            reader.readAsText(file);
          });
          fileInput.click();
        });
      }

      // Reset pet loadouts handler
      const resetLoadoutsBtn = context.querySelector("#reset-loadouts-btn");
      if (resetLoadoutsBtn) {
        resetLoadoutsBtn.addEventListener("click", () => {
          if (
            confirm(
              "Are you sure you want to reset all pet loadouts? This cannot be undone.",
            )
          ) {
            UnifiedState.data.petPresets = {};
            UnifiedState.data.petPresetHotkeys = {};
            UnifiedState.data.petPresetsOrder = [];
            MGA_saveJSON("MGA_petPresets", UnifiedState.data.petPresets);
            MGA_saveJSON(
              "MGA_petPresetHotkeys",
              UnifiedState.data.petPresetHotkeys,
            );
            MGA_saveJSON(
              "MGA_petPresetsOrder",
              UnifiedState.data.petPresetsOrder,
            );
            productionLog(
              "[SETTINGS] Pet loadouts and hotkeys have been reset",
            );
            // Update the UI if we're in the pets tab
            if (UnifiedState.activeTab === "pets") {
              updateTabContent();
            }
            productionLog(
              "[SETTINGS] Pet loadouts have been reset successfully",
            );
          }
        });
      }

      // Clear all pet hotkeys handler
      const clearHotkeysBtn = context.querySelector("#clear-hotkeys-btn");
      if (clearHotkeysBtn) {
        clearHotkeysBtn.addEventListener("click", () => {
          if (
            confirm(
              "Clear all pet preset hotkeys? This will not delete your presets, only the hotkey assignments.",
            )
          ) {
            UnifiedState.data.petPresetHotkeys = {};
            MGA_saveJSON(
              "MGA_petPresetHotkeys",
              UnifiedState.data.petPresetHotkeys,
            );
            productionLog("[SETTINGS] All pet preset hotkeys cleared");
            // Update the UI if we're in the pets tab
            if (UnifiedState.activeTab === "pets") {
              updateTabContent();
            }
            alert(
              "All pet preset hotkeys have been cleared. You can now assign new hotkeys without conflicts.",
            );
          }
        });
      }

      // Weather effects checkbox
      const weatherCheckbox = context.querySelector("#hide-weather-checkbox");
      if (
        weatherCheckbox &&
        !weatherCheckbox.hasAttribute("data-handler-setup")
      ) {
        weatherCheckbox.setAttribute("data-handler-setup", "true");
        try {
          weatherCheckbox.checked = !!(
            UnifiedState &&
            UnifiedState.data &&
            UnifiedState.data.settings &&
            UnifiedState.data.settings.hideWeather
          );
        } catch (_) {}
        const cloned = weatherCheckbox.cloneNode(true);
        weatherCheckbox.parentNode.replaceChild(cloned, weatherCheckbox);
        cloned.addEventListener("change", (e) => {
          if (
            !UnifiedState ||
            !UnifiedState.data ||
            !UnifiedState.data.settings
          )
            return;
          UnifiedState.data.settings.hideWeather = !!e.target.checked;
          try {
            MGA_saveJSON("MGA_data", UnifiedState.data);
          } catch (err) {
            console.error("Weather save failed:", err);
          }
          try {
            applyWeatherSetting();
          } catch (err) {
            console.error("applyWeatherSetting failed:", err);
          }
          productionLog(
            `🌧️ [WEATHER] Toggle set to ${e.target.checked ? "HIDE" : "SHOW"}`,
          );
        });
      }
    }

    // ==================== CROP HIGHLIGHTING SYSTEM ====================
    let applyCropHighlighting = function () {
      try {
        // Get values from UI
        const highlightSpecies =
          targetDocument.querySelector("#highlight-species-select")?.value ||
          null;
        const slotIndex = parseInt(
          targetDocument.querySelector("#highlight-slot-input")?.value || "0",
        );
        const hiddenSpecies =
          targetDocument.querySelector("#hidden-species-select")?.value || null;
        const hiddenScale = parseFloat(
          targetDocument.querySelector("#hidden-scale-input")?.value || "0.1",
        );

        // Validate inputs
        if (!highlightSpecies) {
          productionWarn("🌱 No species selected for highlighting");
          return;
        }

        // Always clear previous highlights first
        if (typeof window.removeAllTileOverrides === "function") {
          window.removeAllTileOverrides();
          debugLog("CROP_HIGHLIGHTING", "Cleared previous tile overrides");
        } else {
          debugLog(
            "CROP_HIGHLIGHTING",
            "removeAllTileOverrides function not available",
          );
        }

        // Apply new highlighting
        const config = {
          highlightSpecies: highlightSpecies,
          highlightMutations: [null], // Default to no mutation filter
          slotIndex: slotIndex,
          highlightScale: null, // Let the system decide
          hiddenSpecies: hiddenSpecies || null,
          hiddenScale: hiddenScale,
        };

        if (typeof window.highlightTilesByMutation === "function") {
          window.highlightTilesByMutation(config);
          productionLog(
            `🌱 Applied crop highlighting for ${highlightSpecies} (slot ${slotIndex})`,
          );
          debugLog(
            "CROP_HIGHLIGHTING",
            "Applied highlighting configuration",
            config,
          );
        } else {
          productionWarn("🌱 highlightTilesByMutation function not available");
          debugLog(
            "CROP_HIGHLIGHTING",
            "highlightTilesByMutation function not found in window object",
          );
        }
      } catch (error) {
        debugError(
          "CROP_HIGHLIGHTING",
          "Failed to apply crop highlighting",
          error,
        );
      }
    };

    function setupToolsTabHandlers(context = document) {
      // Calculator mapping
      const calculatorUrls = {
        "sell-price":
          "https://daserix.github.io/magic-garden-calculator/#/sell-price-calculator",
        "weight-probability":
          "https://daserix.github.io/magic-garden-calculator/#/weight-probability-calculator",
        "pet-appearance-probability":
          "https://daserix.github.io/magic-garden-calculator/#/pet-appearance-probability-calculator",
        "ability-trigger-time":
          "https://daserix.github.io/magic-garden-calculator/#/ability-trigger-time-calculator",
        "import-garden":
          "https://daserix.github.io/magic-garden-calculator/#/garden",
      };

      // Wiki mapping
      const wikiUrls = {
        crops: "https://magicgarden.wiki/Crops",
        pets: "https://magicgarden.wiki/Pets",
        abilities: "https://magicgarden.wiki/Abilities",
        weather: "https://magicgarden.wiki/Weather_Events",
        multipliers: "https://magicgarden.wiki/Multipliers",
        shops: "https://magicgarden.wiki/Shops",
      };

      // Add click handlers to all calculator cards
      const toolCards = context.querySelectorAll(".mga-tool-card");
      toolCards.forEach((card) => {
        card.addEventListener("click", () => {
          const calculatorType = card.dataset.calculator;
          const url = calculatorUrls[calculatorType];
          if (url) {
            openCalculatorPopup(url, calculatorType);
          } else {
            productionWarn(`Calculator URL not found for: ${calculatorType}`);
          }
        });

        // Add hover effect class if not already present
        if (!card.classList.contains("mga-tool-interactive")) {
          card.classList.add("mga-tool-interactive");
        }
      });

      // Add click handlers to all wiki cards
      const wikiCards = context.querySelectorAll(".mga-wiki-card");
      wikiCards.forEach((card) => {
        card.addEventListener("click", () => {
          const wikiType = card.dataset.wiki;
          const url = wikiUrls[wikiType];
          if (url) {
            openWikiPopup(url, wikiType);
          } else {
            productionWarn(`Wiki URL not found for: ${wikiType}`);
          }
        });

        // Add hover effect class if not already present
        if (!card.classList.contains("mga-wiki-interactive")) {
          card.classList.add("mga-wiki-interactive");
        }
      });

      // Hide Weather checkbox
      const hideWeatherCheckbox = context.querySelector(
        "#hide-weather-checkbox",
      );
      productionLog("🌧️ [WEATHER-DEBUG] Setting up weather checkbox handler", {
        found: !!hideWeatherCheckbox,
        hasHandler: hideWeatherCheckbox?.hasAttribute("data-handler-setup"),
      });

      if (
        hideWeatherCheckbox &&
        !hideWeatherCheckbox.hasAttribute("data-handler-setup")
      ) {
        hideWeatherCheckbox.setAttribute("data-handler-setup", "true");
        hideWeatherCheckbox.addEventListener("change", (e) => {
          productionLog(
            `🌧️ [WEATHER] Checkbox changed to: ${e.target.checked}`,
          );
          UnifiedState.data.settings.hideWeather = e.target.checked;
          MGA_saveJSON("MGA_data", UnifiedState.data);
          applyWeatherSetting();
          productionLog(
            `🌧️ [WEATHER] Weather effects ${e.target.checked ? "hidden" : "shown"}`,
          );
        });
        productionLog(
          "🌧️ [WEATHER-DEBUG] Event listener attached successfully",
        );
      } else if (hideWeatherCheckbox) {
        productionLog(
          "🌧️ [WEATHER-DEBUG] Checkbox already has handler, skipping",
        );
      } else {
        productionLog("🌧️ [WEATHER-DEBUG] Checkbox element not found!");
      }

      // Crop highlighting handlers
      const applyHighlightingBtn = context.querySelector(
        "#apply-highlighting-btn",
      );
      if (applyHighlightingBtn) {
        applyHighlightingBtn.addEventListener("click", () => {
          applyCropHighlighting();
        });
      }

      const clearHighlightingBtn = context.querySelector(
        "#clear-highlighting-btn",
      );
      if (clearHighlightingBtn) {
        clearHighlightingBtn.addEventListener("click", () => {
          clearCropHighlighting();
        });
      }

      if (UnifiedState.data.settings.debugMode) {
        productionLog(
          `🧮 Set up handlers for ${toolCards.length} calculator tools and ${wikiCards.length} wiki resources`,
        );
      }
    }

    function openCalculatorPopup(url, calculatorType) {
      // Calculate window dimensions and position
      const width = 1200;
      const height = 800;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      // Window features
      const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`;

      // Open the popup window
      const popupWindow = window.open(
        url,
        `mga_calculator_${calculatorType}`,
        features,
      );

      // Check if popup was blocked
      if (
        !popupWindow ||
        popupWindow.closed ||
        typeof popupWindow.closed === "undefined"
      ) {
        // Popup was blocked, show alternative message
        const message = `
                  <div style="padding: 20px; background: rgba(255, 50, 50, 0.30); border: 1px solid rgba(255,100,100,0.3); border-radius: 5px; margin: 20px;">
                      <h3 style="color: #ff6b6b; margin-bottom: 10px;">⚠️ Popup Blocked</h3>
                      <p style="margin-bottom: 15px;">The calculator popup was blocked by your browser. Please allow popups for this site or open the calculator manually:</p>
                      <div style="background: rgba(0, 0, 0, 0.48); padding: 10px; border-radius: 3px; word-break: break-all;">
                          <a href="${url}" target="_blank" style="color: #4fc3f7;">${url}</a>
                      </div>
                      <p style="margin-top: 10px; font-size: 0.9em; color: rgba(255,255,255,0.6);">
                          Click the link above to open the calculator in a new tab.
                      </p>
                  </div>
              `;

        // Show message in the Tools tab content area
        const contentEl = document.getElementById("mga-tab-content");
        if (contentEl && UnifiedState.activeTab === "tools") {
          const existingContent = contentEl.innerHTML;
          contentEl.innerHTML = message + existingContent;

          // Remove the message after 10 seconds
          setTimeout(() => {
            if (contentEl.innerHTML.includes(message)) {
              contentEl.innerHTML = existingContent;
            }
          }, 10000);
        }

        productionWarn(
          `Popup blocked for calculator: ${calculatorType}. URL: ${url}`,
        );
      } else {
        // Popup opened successfully
        popupWindow.focus();
        productionLog(`✅ Opened calculator popup: ${calculatorType}`);
      }
    }

    function openWikiPopup(url, wikiType) {
      // Calculate window dimensions and position
      const width = 1000;
      const height = 900;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      // Window features
      const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`;

      // Open the popup window
      const popupWindow = window.open(url, `mga_wiki_${wikiType}`, features);

      // Check if popup was blocked
      if (
        !popupWindow ||
        popupWindow.closed ||
        typeof popupWindow.closed === "undefined"
      ) {
        // Popup was blocked, show alternative message
        const message = `
                  <div style="padding: 20px; background: rgba(255, 50, 50, 0.30); border: 1px solid rgba(255,100,100,0.3); border-radius: 5px; margin: 20px;">
                      <h3 style="color: #ff6b6b; margin-bottom: 10px;">⚠️ Popup Blocked</h3>
                      <p style="margin-bottom: 15px;">The wiki popup was blocked by your browser. Please allow popups for this site or open the wiki manually:</p>
                      <div style="background: rgba(0, 0, 0, 0.48); padding: 10px; border-radius: 3px; word-break: break-all;">
                          <a href="${url}" target="_blank" style="color: #4fc3f7;">${url}</a>
                      </div>
                      <p style="margin-top: 10px; font-size: 0.9em; color: rgba(255,255,255,0.6);">
                          Click the link above to open the wiki page in a new tab.
                      </p>
                  </div>
              `;

        // Show message in the Tools tab content area
        const contentEl = document.getElementById("mga-tab-content");
        if (contentEl && UnifiedState.activeTab === "tools") {
          const existingContent = contentEl.innerHTML;
          contentEl.innerHTML = message + existingContent;

          // Remove the message after 10 seconds
          setTimeout(() => {
            if (contentEl.innerHTML.includes(message)) {
              contentEl.innerHTML = existingContent;
            }
          }, 10000);
        }

        productionWarn(`Popup blocked for wiki: ${wikiType}. URL: ${url}`);
      } else {
        // Popup opened successfully
        popupWindow.focus();
        productionLog(`✅ Opened wiki popup: ${wikiType}`);
      }
    }

    // ==================== CROP HIGHLIGHTING UTILITIES ====================
    // Initialize tile override storage
    window.__tileOverrides = window.__tileOverrides || {};
    window.__slotTargetOverrides = window.__slotTargetOverrides || {};

    // Tile-modifying hookAtom function (different from monitoring hookAtom)
    function hookAtomForTileOverrides(atomPath, windowKey) {
      const atom = targetWindow.jotaiAtomCache?.get(atomPath);
      if (!atom?.read) {
        productionWarn(`🔍 Could not find atom at path: ${atomPath}`);
        return;
      }

      if (!atom.__originalRead) {
        atom.__originalRead = atom.read;
        productionLog(`🔗 Hooked atom for tile overrides: ${atomPath}`);

        atom.read = (t) => {
          const value = atom.__originalRead(t);

          try {
            const tileObjects =
              value?.data?.garden?.tileObjects || value?.garden?.tileObjects;

            if (tileObjects != null) {
              let overridesApplied = 0;
              const applyOverrideToTile = (tileIndex, tileObj) => {
                if (!tileObj || typeof tileObj !== "object") return;

                let wasModified = false;

                // Species override
                if (window.__tileOverrides[tileIndex] !== undefined) {
                  const oldSpecies = tileObj.species;
                  tileObj.species = window.__tileOverrides[tileIndex];
                  wasModified = true;
                  if (UnifiedState.data.settings.debugMode) {
                    productionLog(
                      `🔄 Tile ${tileIndex}: ${oldSpecies} → ${tileObj.species}`,
                    );
                  }
                }

                // Slot targetScale override
                if (window.__slotTargetOverrides[tileIndex] !== undefined) {
                  const slots = tileObj.slots;
                  const slotOverrides = window.__slotTargetOverrides[tileIndex];
                  if (slots) {
                    for (const [slotIdx, scale] of Object.entries(
                      slotOverrides,
                    )) {
                      if (
                        slots[slotIdx] &&
                        typeof slots[slotIdx] === "object"
                      ) {
                        const oldScale = slots[slotIdx].targetScale;
                        slots[slotIdx].targetScale = scale;
                        wasModified = true;
                        if (UnifiedState.data.settings.debugMode) {
                          productionLog(
                            `🔄 Tile ${tileIndex} slot ${slotIdx}: scale ${oldScale} → ${scale}`,
                          );
                        }
                      }
                    }
                  }
                }

                if (wasModified) overridesApplied++;
              };

              // Apply overrides to all tiles
              if (Array.isArray(tileObjects)) {
                tileObjects.forEach((tile, idx) =>
                  applyOverrideToTile(idx, tile),
                );
              } else if (tileObjects instanceof Map) {
                tileObjects.forEach((tile, key) =>
                  applyOverrideToTile(key, tile),
                );
              } else if (typeof tileObjects === "object") {
                Object.keys(tileObjects).forEach((key) => {
                  const idx = isFinite(key) ? Number(key) : key;
                  applyOverrideToTile(idx, tileObjects[key]);
                });
              }

              if (overridesApplied > 0) {
                productionLog(
                  `🌱 Applied ${overridesApplied} tile overrides in atom read`,
                );
              }
            }
          } catch (err) {
            console.error(
              "hookAtomForTileOverrides: error applying tile overrides",
              err,
            );
          }

          // Expose full value for console inspection (extract .data if present for myUserSlotAtom)
          try {
            window[windowKey] = value?.data || value;
          } catch (e) {}

          return value;
        };
      } else {
        productionLog(`⚠️ Atom already hooked: ${atomPath}`);
      }
    }

    // Tile override utility functions (MGA namespaced to prevent conflicts)
    window.MGA_Internal.setTileSpecies = function (index, species) {
      if (species == null) {
        delete window.__tileOverrides[index];
      } else {
        window.__tileOverrides[index] = species;
      }
    };

    window.MGA_Internal.setTileSlotTargetScale = function (
      tileIndex,
      slotIndex,
      targetScale,
    ) {
      if (!window.__slotTargetOverrides[tileIndex]) {
        window.__slotTargetOverrides[tileIndex] = {};
      }
      if (targetScale == null) {
        delete window.__slotTargetOverrides[tileIndex][slotIndex];
      } else {
        window.__slotTargetOverrides[tileIndex][slotIndex] = targetScale;
      }
    };

    window.MGA_Internal.removeTileOverrides = function (tileIndex) {
      delete window.__tileOverrides[tileIndex];
      delete window.__slotTargetOverrides[tileIndex];
    };

    window.MGA_Internal.removeAllTileOverrides = function () {
      window.__tileOverrides = {};
      window.__slotTargetOverrides = {};
    };

    // Advanced tile filtering functions
    window.applyToAllTilesExcept = function (
      skipSpecies = "Starweaver",
      slotIndex = 0,
      targetScale = 0.1,
      newSpecies = null,
    ) {
      const tileObjects = window.gardenInfo?.garden?.tileObjects;
      if (!tileObjects) return;

      const entries = Array.isArray(tileObjects)
        ? tileObjects.map((t, i) => ({ tile: t, index: i }))
        : tileObjects instanceof Map
          ? Array.from(tileObjects.entries()).map(([k, v]) => ({
              tile: v,
              index: k,
            }))
          : Object.keys(tileObjects).map((k) => ({
              tile: tileObjects[k],
              index: isFinite(k) ? Number(k) : k,
            }));

      entries.forEach(({ tile, index }) => {
        if (!tile || tile.species === skipSpecies) return;
        if (newSpecies != null) window.setTileSpecies(index, newSpecies);
        if (targetScale != null)
          window.setTileSlotTargetScale(index, slotIndex, targetScale);
      });
    };

    window.applyToAllTilesFiltered = function ({
      skipSpecies = "Starweaver",
      slotIndex = 0,
      targetScale = 0.1,
      newSpecies = null,
      mutationFilter = null, // function(slotMutations) => true/false
    } = {}) {
      const tileObjects = window.gardenInfo?.garden?.tileObjects;
      if (!tileObjects) return;

      const entries = Array.isArray(tileObjects)
        ? tileObjects.map((t, i) => ({ tile: t, index: i }))
        : tileObjects instanceof Map
          ? Array.from(tileObjects.entries()).map(([k, v]) => ({
              tile: v,
              index: k,
            }))
          : Object.keys(tileObjects).map((k) => ({
              tile: tileObjects[k],
              index: isFinite(k) ? Number(k) : k,
            }));

      entries.forEach(({ tile, index }) => {
        if (!tile || tile.species === skipSpecies) return;

        const slot = tile.slots?.[slotIndex];
        if (!slot) return;

        // Skip if mutationFilter is defined and returns false
        if (mutationFilter && !mutationFilter(slot.mutations)) return;

        if (newSpecies != null) window.setTileSpecies(index, newSpecies);
        if (targetScale != null)
          window.setTileSlotTargetScale(index, slotIndex, targetScale);
      });
    };

    // Main crop highlighting function
    window.highlightTilesByMutation = function ({
      highlightSpecies = null, // string or array of species
      highlightMutations = [], // array of mutations to match
      slotIndex = 0,
      highlightScale = null, // null = keep original
      hiddenSpecies = "Carrot",
      hiddenScale = 0.1,
    } = {}) {
      const tileObjects = window.gardenInfo?.garden?.tileObjects;
      if (!tileObjects) return;

      const entries = Array.isArray(tileObjects)
        ? tileObjects.map((t, i) => ({ tile: t, index: i }))
        : tileObjects instanceof Map
          ? Array.from(tileObjects.entries()).map(([k, v]) => ({
              tile: v,
              index: k,
            }))
          : Object.keys(tileObjects).map((k) => ({
              tile: tileObjects[k],
              index: isFinite(k) ? Number(k) : k,
            }));

      // Normalize species array
      const speciesArr = Array.isArray(highlightSpecies)
        ? highlightSpecies
        : highlightSpecies
          ? [highlightSpecies]
          : [];

      entries.forEach(({ tile, index }) => {
        if (!tile) return;

        const slot = tile.slots?.[slotIndex];
        if (!slot) return;

        const mutations = slot.mutations || [];

        // Highlight if species is in the array
        const matchesSpecies =
          speciesArr.length === 0 || speciesArr.includes(tile.species);
        const matchesMutations =
          !highlightMutations ||
          highlightMutations.length === 0 ||
          highlightMutations.includes(null) ||
          highlightMutations.some((m) => mutations.includes(m)) ||
          highlightMutations.every((m) => mutations.includes(m));

        if (matchesSpecies && matchesMutations) {
          if (highlightScale != null)
            window.setTileSlotTargetScale(index, slotIndex, highlightScale);
          if (highlightSpecies) window.setTileSpecies(index, tile.species); // keep species unchanged
        } else {
          if (hiddenScale != null)
            window.setTileSlotTargetScale(index, slotIndex, hiddenScale);
          window.setTileSpecies(index, hiddenSpecies);
        }
      });
    };

    // Initialize crop highlighting atoms hooks when utilities are loaded
    function initializeCropHighlightingAtoms() {
      if (!targetWindow.jotaiAtomCache) {
        // Wait for jotaiAtomCache to be available
        setTimeout(initializeCropHighlightingAtoms, 1000);
        return;
      }

      try {
        hookAtomForTileOverrides(
          "/home/runner/work/magiccircle.gg/magiccircle.gg/client/src/games/Quinoa/atoms/baseAtoms.ts/myUserSlotAtom",
          "gardenInfo",
        );
        hookAtomForTileOverrides(
          "/home/runner/work/magiccircle.gg/magiccircle.gg/client/src/games/Quinoa/atoms/myAtoms.ts/myCurrentGrowSlotsAtom",
          "currentCrop",
        );
        debugLog("CROP_HIGHLIGHT", "Crop highlighting atom hooks initialized");
      } catch (error) {
        debugError(
          "CROP_HIGHLIGHT",
          "Failed to initialize crop highlighting atoms",
          error,
        );
      }
    }

    // Track the last highlighted species for toggle functionality
    window.__lastHighlightedSpecies = null;

    // Initialize the crop highlighting atom hooks
    initializeCropHighlightingAtoms();

    // ==================== CROP HIGHLIGHTING SYSTEM ====================
    function clearCropHighlighting() {
      try {
        if (typeof window.removeAllTileOverrides === "function") {
          window.removeAllTileOverrides();
          productionLog("🌱 Cleared all crop highlighting");
          queueNotification("🧹 Cleared all crop highlighting", false);
          debugLog("CROP_HIGHLIGHTING", "Cleared all tile overrides");
          return true;
        } else {
          productionWarn("🌱 removeAllTileOverrides function not available");
          queueNotification(
            "⚠️ Cannot clear highlighting - game not fully loaded",
            false,
          );
          debugLog(
            "CROP_HIGHLIGHTING",
            "removeAllTileOverrides function not found in window object",
          );
          return false;
        }
      } catch (error) {
        debugError(
          "CROP_HIGHLIGHTING",
          "Failed to clear crop highlighting",
          error,
        );
      }
    }

    // Debug function to check garden data availability
    function debugCropHighlighting() {
      productionLog("🔍 CROP HIGHLIGHTING DEBUG:");
      productionLog("  window.gardenInfo:", !!window.gardenInfo);
      productionLog("  window.currentCrop:", !!window.currentCrop);
      productionLog(
        "  targetWindow.jotaiAtomCache:",
        !!targetWindow.jotaiAtomCache,
      );

      if (window.gardenInfo?.garden?.tileObjects) {
        const tileObjects = window.gardenInfo.garden.tileObjects;
        const tileCount = Array.isArray(tileObjects)
          ? tileObjects.length
          : tileObjects instanceof Map
            ? tileObjects.size
            : Object.keys(tileObjects).length;
        productionLog("  Garden tiles available:", tileCount);

        // Show first few tiles for debugging
        if (Array.isArray(tileObjects) && tileObjects.length > 0) {
          productionLog("  Sample tile:", tileObjects[0]);
        }
      } else {
        productionLog("  ❌ No garden tile data available");
      }

      if (
        window.currentCrop &&
        Array.isArray(window.currentCrop) &&
        window.currentCrop.length > 0
      ) {
        productionLog(
          "  Current crop species:",
          window.currentCrop[0]?.species,
        );
      } else {
        productionLog("  ❌ No current crop data available");
      }

      productionLog("  Available functions:");
      productionLog(
        "    removeAllTileOverrides:",
        typeof window.removeAllTileOverrides,
      );
      productionLog(
        "    highlightTilesByMutation:",
        typeof window.highlightTilesByMutation,
      );
      productionLog("    setTileSpecies:", typeof window.setTileSpecies);
    }

    // Improved manual highlighting with better debugging and error handling
    function applyCropHighlightingWithDebug() {
      productionLog("🌱 Starting crop highlighting...");
      debugCropHighlighting();

      try {
        // Get values from UI
        const highlightSpecies =
          targetDocument.querySelector("#highlight-species-select")?.value ||
          null;
        const slotIndex = parseInt(
          targetDocument.querySelector("#highlight-slot-input")?.value || "0",
        );
        const hiddenSpecies =
          targetDocument.querySelector("#hidden-species-select")?.value ||
          "Carrot";
        const hiddenScale = parseFloat(
          targetDocument.querySelector("#hidden-scale-input")?.value || "0.1",
        );

        productionLog("🌱 Settings:", {
          highlightSpecies,
          slotIndex,
          hiddenSpecies,
          hiddenScale,
        });

        // Validate inputs
        if (!highlightSpecies) {
          productionWarn("🌱 No species selected for highlighting");
          queueNotification(
            "⚠️ Please select a species to highlight first",
            false,
          );
          return false;
        }

        // Check if required game functions are available
        const hasRemoveOverrides =
          typeof window.removeAllTileOverrides === "function";
        const hasHighlightFunction =
          typeof window.highlightTilesByMutation === "function";

        productionLog("🌱 Function availability:", {
          removeAllTileOverrides: hasRemoveOverrides,
          highlightTilesByMutation: hasHighlightFunction,
        });

        if (!hasHighlightFunction) {
          productionWarn(
            "🌱 Crop highlighting function not available - game may not be loaded yet",
          );
          queueNotification(
            "⚠️ Crop highlighting not available - try again when fully loaded",
            false,
          );
          return false;
        }

        // Always clear previous highlights first
        if (hasRemoveOverrides) {
          window.removeAllTileOverrides();
          productionLog("🌱 Cleared previous highlights");
        }

        // Apply new highlighting with array format
        const config = {
          highlightSpecies: [highlightSpecies], // Convert to array like working reference
          highlightMutations: [null], // Default to no mutation filter
          slotIndex: slotIndex,
          highlightScale: null, // Let the system decide
          hiddenSpecies: hiddenSpecies,
          hiddenScale: hiddenScale,
        };

        productionLog("🌱 Applying config:", config);

        try {
          window.highlightTilesByMutation(config);
          productionLog(
            `✅ Applied crop highlighting for ${highlightSpecies} (slot ${slotIndex})`,
          );
          queueNotification(
            `🌱 Highlighted all ${highlightSpecies} crops (slot ${slotIndex})`,
            false,
          );

          // Force a re-render by triggering a small change
          setTimeout(() => {
            productionLog("🔄 Forcing render update...");
            try {
              globalThis.dispatchEvent?.(new Event("visibilitychange"));
            } catch (e) {
              productionLog("Could not dispatch visibility change:", e);
            }
          }, 100);

          return true;
        } catch (highlightError) {
          productionError("🌱 Error during highlighting:", highlightError);
          queueNotification(
            `❌ Crop highlighting failed: ${highlightError.message}`,
            false,
          );
          return false;
        }
      } catch (error) {
        productionError("❌ Failed to apply crop highlighting:", error);
        queueNotification(
          `❌ Crop highlighting system error: ${error.message}`,
          false,
        );
        return false;
      }
    }

    // Automatic highlighting with Ctrl+C (from working reference)
    function setupAutomaticCropHighlighting() {
      window.addEventListener("keydown", function (e) {
        // Ignore when typing in input fields
        const active = document.activeElement;
        if (
          active &&
          (active.tagName === "INPUT" ||
            active.tagName === "TEXTAREA" ||
            active.isContentEditable)
        )
          return;

        // Ctrl (or Cmd) + C for automatic highlighting
        if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C")) {
          try {
            const cc = window.currentCrop;

            window.removeAllTileOverrides(); // always clear first
            productionLog("🌱 Ctrl+C: Cleared previous highlights");

            if (
              cc &&
              Array.isArray(cc) &&
              cc.length > 0 &&
              cc[0] &&
              cc[0].species
            ) {
              const species = cc[0].species;

              if (window.__lastHighlightedSpecies === species) {
                // Same species pressed twice → just clear
                productionLog(
                  `🌱 Ctrl+C: Removed highlights (${species} was already highlighted)`,
                );
                window.__lastHighlightedSpecies = null;
              } else {
                // New species → highlight it after delay
                setTimeout(() => {
                  window.highlightTilesByMutation({
                    highlightSpecies: [species],
                    highlightMutations: [null],
                    slotIndex: 0,
                    highlightScale: null,
                    hiddenSpecies: "Carrot",
                    hiddenScale: 0.1,
                  });
                  productionLog(
                    `✅ Ctrl+C: Highlighted current crop: ${species}`,
                  );
                  window.__lastHighlightedSpecies = species;
                }, 350);
              }
            } else {
              // currentCrop is null or invalid → just clear
              productionLog("🌱 Ctrl+C: No current crop - highlights cleared");
              window.__lastHighlightedSpecies = null;
            }

            e.preventDefault(); // block normal copy
          } catch (err) {
            console.error("❌ Error handling Ctrl+C highlight action", err);
          }
        }
      });

      productionLog("🌱 Automatic crop highlighting installed (Ctrl+C)");
    }

    // Replace the original applyCropHighlighting with the debug version
    applyCropHighlighting = applyCropHighlightingWithDebug;

    // Install automatic highlighting
    setupAutomaticCropHighlighting();

    // ==================== GLOBAL DEBUGGING FUNCTIONS ====================
    // Make debugging functions globally accessible
    window.debugCropHighlighting = debugCropHighlighting;
    window.applyCropHighlightingWithDebug = applyCropHighlightingWithDebug;

    // BUGFIX: Add ability log verification command
    window.MGA_AbilityLogDebug = {
      checkLogs: function () {
        const allLogs = MGA_getAllLogs();
        const oldLogs = allLogs.filter(
          (log) =>
            log.abilityType && /produce\s*scale\s*boost/i.test(log.abilityType),
        );
        const newLogs = allLogs.filter(
          (log) =>
            log.abilityType && /crop\s*size\s*boost/i.test(log.abilityType),
        );

        productionLog("=== ABILITY LOG VERIFICATION ===");
        productionLog('Old "Produce Scale Boost" logs:', oldLogs.length);
        if (oldLogs.length > 0) {
          console.warn(
            "⚠️ Found unmigrated logs - migration may need to run again",
          );
          productionLog("Sample old logs:", oldLogs.slice(0, 3));
        }
        productionLog('New "Crop Size Boost" logs:', newLogs.length);
        productionLog("Total logs:", allLogs.length);
        productionLog("============================");

        return {
          oldCount: oldLogs.length,
          newCount: newLogs.length,
          total: allLogs.length,
        };
      },
      listAllAbilities: function () {
        const allLogs = MGA_getAllLogs();
        const abilityTypes = [
          ...new Set(allLogs.map((log) => log.abilityType)),
        ].sort();
        productionLog("=== ALL UNIQUE ABILITIES IN LOGS ===");
        abilityTypes.forEach((ability, i) => {
          const count = allLogs.filter(
            (log) => log.abilityType === ability,
          ).length;
          productionLog(`${i + 1}. ${ability} (${count} logs)`);
        });
        productionLog("===================================");
        return abilityTypes;
      },
    };

    window.MGA_CropDebug = {
      debug: debugCropHighlighting,
      apply: applyCropHighlightingWithDebug,
      clear: clearCropHighlighting,
      testHighlight: function (species = "Aloe") {
        productionLog(`🧪 Testing highlight for ${species}...`);
        if (typeof window.removeAllTileOverrides === "function") {
          window.removeAllTileOverrides();
        }
        setTimeout(() => {
          if (typeof window.highlightTilesByMutation === "function") {
            window.highlightTilesByMutation({
              highlightSpecies: [species],
              highlightMutations: [null],
              slotIndex: 0,
              highlightScale: null,
              hiddenSpecies: "Carrot",
              hiddenScale: 0.1,
            });
            productionLog(`✅ Test highlight applied for ${species}`);
          } else {
            console.error("❌ highlightTilesByMutation not available");
          }
        }, 100);
      },
      listAvailableSpecies: function () {
        if (window.gardenInfo?.garden?.tileObjects) {
          const tileObjects = window.gardenInfo.garden.tileObjects;
          const species = new Set();

          const entries = Array.isArray(tileObjects)
            ? tileObjects
            : tileObjects instanceof Map
              ? Array.from(tileObjects.values())
              : Object.values(tileObjects);

          entries.forEach((tile) => {
            if (tile?.species) species.add(tile.species);
          });

          productionLog(
            "🌱 Available species in your garden:",
            Array.from(species),
          );
          return Array.from(species);
        } else {
          productionLog("❌ No garden data available");
          return [];
        }
      },
      checkFunctions: function () {
        productionLog("🔍 Crop highlighting function status:");
        productionLog(
          "  removeAllTileOverrides:",
          typeof window.removeAllTileOverrides,
        );
        productionLog(
          "  highlightTilesByMutation:",
          typeof window.highlightTilesByMutation,
        );
        productionLog("  setTileSpecies:", typeof window.setTileSpecies);
        productionLog(
          "  setTileSlotTargetScale:",
          typeof window.setTileSlotTargetScale,
        );
        productionLog("  gardenInfo available:", !!window.gardenInfo);
        productionLog("  currentCrop available:", !!window.currentCrop);
      },
      forceRefresh: function () {
        productionLog("🔄 Forcing multiple refresh attempts...");

        // Method 1: Visibility change
        try {
          globalThis.dispatchEvent?.(new Event("visibilitychange"));
          productionLog("✅ Triggered visibilitychange event");
        } catch (e) {
          productionLog("❌ Could not trigger visibilitychange");
        }

        // Method 2: Focus events
        try {
          window.dispatchEvent(new Event("focus"));
          window.dispatchEvent(new Event("blur"));
          window.dispatchEvent(new Event("focus"));
          productionLog("✅ Triggered focus/blur events");
        } catch (e) {
          productionLog("❌ Could not trigger focus events");
        }

        // Method 3: Resize event
        try {
          window.dispatchEvent(new Event("resize"));
          productionLog("✅ Triggered resize event");
        } catch (e) {
          productionLog("❌ Could not trigger resize");
        }

        // Method 4: Force re-hook atoms
        setTimeout(() => {
          productionLog("🔄 Re-hooking atoms...");
          if (targetWindow.jotaiAtomCache) {
            hookAtomForTileOverrides(
              "/home/runner/work/magiccircle.gg/magiccircle.gg/client/src/games/Quinoa/atoms/baseAtoms.ts/myUserSlotAtom",
              "gardenInfo",
            );
            hookAtomForTileOverrides(
              "/home/runner/work/magiccircle.gg/magiccircle.gg/client/src/games/Quinoa/atoms/myAtoms.ts/myCurrentGrowSlotsAtom",
              "currentCrop",
            );
          }
        }, 100);

        // Method 5: Mouse movement simulation
        try {
          const mouseEvent = new MouseEvent("mousemove", {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: window.innerWidth / 2,
            clientY: window.innerHeight / 2,
          });
          document.dispatchEvent(mouseEvent);
          productionLog("✅ Triggered mouse movement");
        } catch (e) {
          productionLog("❌ Could not trigger mouse movement");
        }
      },
      inspectOverrides: function () {
        productionLog("🔍 Current tile overrides:");
        productionLog("  Species overrides:", window.__tileOverrides);
        productionLog("  Scale overrides:", window.__slotTargetOverrides);

        const speciesCount = Object.keys(window.__tileOverrides || {}).length;
        const scaleCount = Object.keys(
          window.__slotTargetOverrides || {},
        ).length;
        productionLog(
          `  Total overrides: ${speciesCount} species, ${scaleCount} scales`,
        );

        if (speciesCount > 0) {
          productionLog("📋 Sample species overrides:");
          Object.entries(window.__tileOverrides)
            .slice(0, 5)
            .forEach(([index, species]) => {
              productionLog(`    Tile ${index} → ${species}`);
            });
        }
      },
      enableDebugMode: function () {
        UnifiedState.data.settings.debugMode = true;
        productionLog(
          "🐛 Debug mode enabled - you will see detailed tile modification logs",
        );
      },
      disableDebugMode: function () {
        UnifiedState.data.settings.debugMode = false;
        productionLog("🔇 Debug mode disabled");
      },
      strongRefresh: function () {
        productionLog("💪 Attempting strong refresh with multiple methods...");
        this.forceRefresh();

        // Wait and try again
        setTimeout(() => {
          productionLog("🔄 Second refresh wave...");
          this.forceRefresh();

          // Try direct garden access
          setTimeout(() => {
            if (window.gardenInfo?.garden?.tileObjects) {
              productionLog("🎯 Triggering direct garden re-read...");
              const tileObjects = window.gardenInfo.garden.tileObjects;
              const count = Array.isArray(tileObjects)
                ? tileObjects.length
                : tileObjects instanceof Map
                  ? tileObjects.size
                  : Object.keys(tileObjects).length;
              productionLog(
                `📊 Garden has ${count} tiles - forcing re-process...`,
              );

              // Force a property access that might trigger re-rendering
              try {
                if (Array.isArray(tileObjects)) {
                  tileObjects.forEach((tile, idx) => {
                    if (tile) {
                      const _ = tile.species; // Force property access
                      const __ = tile.slots; // Force slots access
                    }
                  });
                }
                productionLog("✅ Forced tile property access complete");
              } catch (e) {
                productionLog("❌ Could not force tile access:", e);
              }
            }
          }, 200);
        }, 500);
      },
    };

    // Backward compatibility aliases to prevent conflicts with other scripts
    // These key functions are exposed with MGA_ prefix to coexist with other mods
    window.MGA_removeAllTileOverrides =
      window.MGA_Internal.removeAllTileOverrides;
    window.MGA_highlightTilesByMutation = window.highlightTilesByMutation;
    window.MGA_setTileSpecies = window.MGA_Internal.setTileSpecies;
    window.MGA_setTileSlotTargetScale =
      window.MGA_Internal.setTileSlotTargetScale;

    // For scripts that might still depend on the global names, check if they exist
    // If not (meaning no conflict), provide them. If they do exist, skip to avoid conflicts.
    if (typeof window.removeAllTileOverrides !== "function") {
      window.removeAllTileOverrides =
        window.MGA_Internal.removeAllTileOverrides;
    }
    if (typeof window.setTileSpecies !== "function") {
      window.setTileSpecies = window.MGA_Internal.setTileSpecies;
    }
    if (typeof window.setTileSlotTargetScale !== "function") {
      window.setTileSlotTargetScale =
        window.MGA_Internal.setTileSlotTargetScale;
    }

    productionLog("🌱 Crop highlighting debugging tools installed:");
    productionLog("  • debugCropHighlighting() - Full diagnostic");
    productionLog("  • MGA_CropDebug.debug() - Same as above");
    productionLog(
      '  • MGA_CropDebug.testHighlight("Aloe") - Test highlighting',
    );
    productionLog(
      "  • MGA_CropDebug.listAvailableSpecies() - See what you have",
    );
    productionLog(
      "  • MGA_CropDebug.checkFunctions() - Verify functions exist",
    );
    productionLog("  • MGA_CropDebug.clear() - Clear all highlights");
    productionLog("  🔧 Advanced debugging:");
    productionLog(
      "  • MGA_CropDebug.inspectOverrides() - See current overrides",
    );
    productionLog("  • MGA_CropDebug.enableDebugMode() - Detailed tile logs");
    productionLog("  • MGA_CropDebug.forceRefresh() - Force game refresh");
    productionLog("  • MGA_CropDebug.strongRefresh() - Aggressive refresh");

    function applyPreset(preset) {
      const settings = UnifiedState.data.settings;

      switch (preset) {
        case "gaming":
          settings.opacity = 85;
          settings.gradientStyle = "red-orange";
          settings.effectStyle = "neon";
          break;
        case "minimal":
          settings.opacity = 70;
          settings.gradientStyle = "blue-purple";
          settings.effectStyle = "glass";
          break;
        case "vibrant":
          settings.opacity = 95;
          settings.gradientStyle = "purple-pink";
          settings.effectStyle = "neon";
          break;
        case "dark":
          settings.opacity = 90;
          settings.gradientStyle = "blue-purple";
          settings.effectStyle = "metallic";
          break;
        case "luxury":
          settings.opacity = 88;
          settings.gradientStyle = "gold-yellow";
          settings.effectStyle = "metallic";
          break;
        case "steel":
          settings.opacity = 92;
          settings.gradientStyle = "steel-blue";
          settings.effectStyle = "steel";
          break;
        case "chrome":
          settings.opacity = 85;
          settings.gradientStyle = "chrome-silver";
          settings.effectStyle = "chrome";
          break;
        case "titanium":
          settings.opacity = 90;
          settings.gradientStyle = "titanium-gray";
          settings.effectStyle = "titanium";
          break;
        case "reset":
          settings.opacity = 95;
          settings.gradientStyle = "blue-purple";
          settings.effectStyle = "none";
          break;
      }

      applyTheme();
      updateTabContent(); // Refresh the settings tab
      MGA_saveJSON("MGA_data", UnifiedState.data);
    }

    // Universal theme generation function with dual opacity support
    function generateThemeStyles(
      settings = UnifiedState.data.settings,
      isPopout = false,
    ) {
      // Use different opacity based on window type
      const opacity = isPopout
        ? settings.popoutOpacity / 100
        : settings.opacity / 100;

      // Use actual opacity value (0.0 to 1.0)
      const effectiveOpacity = opacity;

      // Define gradient styles - ALL themes now use effectiveOpacity for true 100% support
      const gradients = {
        // ⚫ BLACK ACCENT THEMES (Solid backgrounds with vibrant accent colors)
        "black-crimson":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(26, 0, 0, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-emerald":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(0, 26, 0, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-royal":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(13, 0, 21, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-gold":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(26, 20, 0, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-ice":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(0, 13, 26, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-flame":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(26, 13, 0, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-toxic":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(10, 26, 0, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-pink":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(26, 0, 20, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-matrix":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(0, 17, 0, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-sunset":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(26, 10, 0, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-blood":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(40, 0, 0, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-neon":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(0, 20, 30, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-storm":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(10, 0, 30, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-sapphire":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(0, 10, 40, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-aqua":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(0, 25, 25, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-phantom":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(20, 20, 20, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-void":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(10, 10, 10, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-violet":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(20, 0, 30, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-amber":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(30, 22, 0, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-jade":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(0, 20, 15, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-coral":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(30, 15, 10, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-steel":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(10, 20, 25, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-lavender":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(20, 15, 25, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-mint":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(5, 20, 15, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-ruby":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(30, 0, 10, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-cobalt":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(0, 10, 25, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-bronze":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(25, 15, 8, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-teal":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(0, 18, 18, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-magenta":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(25, 0, 25, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-lime":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(8, 25, 8, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",
        "black-indigo":
          "linear-gradient(135deg, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 0%, rgba(10, 0, 20, " +
          effectiveOpacity +
          ") 50%, rgba(0, 0, 0, " +
          effectiveOpacity +
          ") 100%)",

        // 🌈 ORIGINAL THEMES
        "blue-purple":
          "linear-gradient(135deg, rgba(20, 20, 35, " +
          effectiveOpacity +
          ") 0%, rgba(30, 30, 50, " +
          effectiveOpacity +
          ") 100%)",
        "green-blue":
          "linear-gradient(135deg, rgba(20, 35, 20, " +
          effectiveOpacity +
          ") 0%, rgba(30, 40, 60, " +
          effectiveOpacity +
          ") 100%)",
        "red-orange":
          "linear-gradient(135deg, rgba(35, 20, 20, " +
          effectiveOpacity +
          ") 0%, rgba(50, 35, 30, " +
          effectiveOpacity +
          ") 100%)",
        "purple-pink":
          "linear-gradient(135deg, rgba(35, 20, 35, " +
          effectiveOpacity +
          ") 0%, rgba(50, 30, 45, " +
          effectiveOpacity +
          ") 100%)",
        "gold-yellow":
          "linear-gradient(135deg, rgba(35, 30, 20, " +
          effectiveOpacity +
          ") 0%, rgba(45, 40, 25, " +
          effectiveOpacity +
          ") 100%)",
        // New vibrant gradients - using effectiveOpacity for better high-level opacity
        "electric-neon":
          "linear-gradient(135deg, rgba(0, 100, 255, " +
          effectiveOpacity * 0.3 +
          ") 0%, rgba(147, 51, 234, " +
          effectiveOpacity * 0.4 +
          ") 100%)",
        "sunset-fire":
          "linear-gradient(135deg, rgba(255, 94, 77, " +
          effectiveOpacity * 0.3 +
          ") 0%, rgba(255, 154, 0, " +
          effectiveOpacity * 0.4 +
          ") 100%)",
        "emerald-cyan":
          "linear-gradient(135deg, rgba(16, 185, 129, " +
          effectiveOpacity * 0.3 +
          ") 0%, rgba(6, 182, 212, " +
          effectiveOpacity * 0.4 +
          ") 100%)",
        "royal-gold":
          "linear-gradient(135deg, rgba(139, 69, 19, " +
          effectiveOpacity * 0.4 +
          ") 0%, rgba(255, 215, 0, " +
          effectiveOpacity * 0.3 +
          ") 100%)",
        "crimson-blaze":
          "linear-gradient(135deg, rgba(220, 38, 127, " +
          effectiveOpacity * 0.3 +
          ") 0%, rgba(249, 115, 22, " +
          effectiveOpacity * 0.4 +
          ") 100%)",
        "ocean-deep":
          "linear-gradient(135deg, rgba(15, 23, 42, " +
          effectiveOpacity * 0.8 +
          ") 0%, rgba(30, 64, 175, " +
          effectiveOpacity * 0.6 +
          ") 100%)",
        "forest-mystique":
          "linear-gradient(135deg, rgba(20, 83, 45, " +
          effectiveOpacity * 0.6 +
          ") 0%, rgba(34, 197, 94, " +
          effectiveOpacity * 0.4 +
          ") 100%)",
        "cosmic-purple":
          "linear-gradient(135deg, rgba(88, 28, 135, " +
          effectiveOpacity * 0.6 +
          ") 0%, rgba(168, 85, 247, " +
          effectiveOpacity * 0.4 +
          ") 100%)",
        "rainbow-burst":
          "linear-gradient(135deg, rgba(239, 68, 68, " +
          effectiveOpacity * 0.25 +
          ") 0%, rgba(245, 158, 11, " +
          effectiveOpacity * 0.25 +
          ") 25%, rgba(34, 197, 94, " +
          effectiveOpacity * 0.25 +
          ") 50%, rgba(59, 130, 246, " +
          effectiveOpacity * 0.25 +
          ") 75%, rgba(147, 51, 234, " +
          effectiveOpacity * 0.25 +
          ") 100%)",
        // Premium metallic themes - FIXED for visibility with darker, richer tones
        "steel-blue":
          "linear-gradient(135deg, rgba(30, 41, 59, " +
          effectiveOpacity * 0.95 +
          ") 0%, rgba(51, 65, 85, " +
          effectiveOpacity * 0.9 +
          ") 25%, rgba(71, 85, 105, " +
          effectiveOpacity * 0.85 +
          ") 50%, rgba(30, 58, 138, " +
          effectiveOpacity * 0.8 +
          ") 100%)",
        "chrome-silver":
          "linear-gradient(135deg, rgba(55, 65, 81, " +
          effectiveOpacity * 0.9 +
          ") 0%, rgba(75, 85, 99, " +
          effectiveOpacity * 0.85 +
          ") 25%, rgba(100, 116, 139, " +
          effectiveOpacity * 0.8 +
          ") 50%, rgba(71, 85, 105, " +
          effectiveOpacity * 0.9 +
          ") 100%)",
        "titanium-gray":
          "linear-gradient(135deg, rgba(31, 41, 55, " +
          effectiveOpacity * 0.95 +
          ") 0%, rgba(55, 65, 81, " +
          effectiveOpacity * 0.9 +
          ") 25%, rgba(75, 85, 99, " +
          effectiveOpacity * 0.85 +
          ") 50%, rgba(107, 114, 128, " +
          effectiveOpacity * 0.8 +
          ") 100%)",
        "platinum-white":
          "linear-gradient(135deg, rgba(75, 85, 99, " +
          effectiveOpacity * 0.85 +
          ") 0%, rgba(100, 116, 139, " +
          effectiveOpacity * 0.8 +
          ") 25%, rgba(148, 163, 184, " +
          effectiveOpacity * 0.75 +
          ") 50%, rgba(156, 163, 175, " +
          effectiveOpacity * 0.7 +
          ") 100%)",
      };

      const background =
        gradients[settings.gradientStyle] || gradients["blue-purple"];

      // Generate effect styles for the current theme
      let boxShadow = "0 10px 40px rgba(0, 0, 0, 0.5)";
      let borderShadow = "";

      switch (settings.effectStyle) {
        case "metallic":
          boxShadow = `
                      0 10px 40px rgba(0, 0, 0, 0.5),
                      inset 0 1px 0 rgba(255, 255, 255, 0.57),
                      inset 0 -1px 0 rgba(0, 0, 0, 0.48)
                  `;
          break;
        case "neon":
          borderShadow = `0 0 20px rgba(74, 158, 255, ${effectiveOpacity * 0.6})`;
          boxShadow = `
                      0 10px 40px rgba(0, 0, 0, 0.5),
                      ${borderShadow}
                  `;
          break;
        case "plasma":
          borderShadow = `0 0 30px rgba(147, 51, 234, ${effectiveOpacity * 0.5})`;
          boxShadow = `
                      0 10px 40px rgba(0, 0, 0, 0.5),
                      ${borderShadow}
                  `;
          break;
        case "holographic":
          boxShadow = `
                      0 10px 40px rgba(0, 0, 0, 0.5),
                      0 0 40px rgba(255, 255, 255, ${effectiveOpacity * 0.1}),
                      inset 0 1px 0 rgba(255, 255, 255, 0.73)
                  `;
          break;
        case "crystal":
          boxShadow = `
                      0 10px 40px rgba(0, 0, 0, 0.5),
                      0 0 20px rgba(255, 255, 255, ${effectiveOpacity * 0.1}),
                      inset 0 1px 0 rgba(255, 255, 255, 0.3),
                      inset 0 -1px 0 rgba(0, 0, 0, 0.30)
                  `;
          break;
      }

      // Accent colors for black themes
      const accentColors = {
        "black-void": {
          color: "#1a1a1a",
          glow: "rgba(26, 26, 26, 0.3)",
          text: "#2a2a2a",
        },
        "black-crimson": {
          color: "#DC143C",
          glow: "rgba(220, 20, 60, 0.5)",
          text: "#FF6B6B",
        },
        "black-emerald": {
          color: "#50C878",
          glow: "rgba(80, 200, 120, 0.5)",
          text: "#90EE90",
        },
        "black-royal": {
          color: "#9D4EDD",
          glow: "rgba(157, 78, 221, 0.5)",
          text: "#DDA0DD",
        },
        "black-gold": {
          color: "#FFD700",
          glow: "rgba(255, 215, 0, 0.5)",
          text: "#FFD700",
        },
        "black-ice": {
          color: "#00FFFF",
          glow: "rgba(0, 255, 255, 0.5)",
          text: "#B0E0E6",
        },
        "black-flame": {
          color: "#FF4500",
          glow: "rgba(255, 69, 0, 0.5)",
          text: "#FF7F50",
        },
        "black-toxic": {
          color: "#7FFF00",
          glow: "rgba(127, 255, 0, 0.5)",
          text: "#9ACD32",
        },
        "black-pink": {
          color: "#FF1493",
          glow: "rgba(255, 20, 147, 0.5)",
          text: "#FFB6C1",
        },
        "black-matrix": {
          color: "#00FF00",
          glow: "rgba(0, 255, 0, 0.8)",
          text: "#00FF00",
        },
        "black-sunset": {
          color: "#FF6B35",
          glow: "rgba(255, 107, 53, 0.6)",
          text: "#FFA500",
        },
        "black-blood": {
          color: "#8B0000",
          glow: "rgba(139, 0, 0, 0.7)",
          text: "#CD5C5C",
        },
        "black-neon": {
          color: "#00CED1",
          glow: "rgba(0, 206, 209, 0.8)",
          text: "#AFEEEE",
        },
        "black-storm": {
          color: "#483D8B",
          glow: "rgba(72, 61, 139, 0.6)",
          text: "#9370DB",
        },
        "black-sapphire": {
          color: "#0F52BA",
          glow: "rgba(15, 82, 186, 0.7)",
          text: "#4169E1",
        },
        "black-aqua": {
          color: "#008B8B",
          glow: "rgba(0, 139, 139, 0.6)",
          text: "#48D1CC",
        },
        "black-phantom": {
          color: "#C0C0C0",
          glow: "rgba(192, 192, 192, 0.4)",
          text: "#DCDCDC",
        },
        "black-violet": {
          color: "#8A2BE2",
          glow: "rgba(138, 43, 226, 0.6)",
          text: "#9370DB",
        },
        "black-amber": {
          color: "#FFBF00",
          glow: "rgba(255, 191, 0, 0.5)",
          text: "#FFC125",
        },
        "black-jade": {
          color: "#00A86B",
          glow: "rgba(0, 168, 107, 0.6)",
          text: "#5FD3A6",
        },
        "black-coral": {
          color: "#FF7F50",
          glow: "rgba(255, 127, 80, 0.5)",
          text: "#FFA07A",
        },
        "black-steel": {
          color: "#4682B4",
          glow: "rgba(70, 130, 180, 0.5)",
          text: "#87CEEB",
        },
        "black-lavender": {
          color: "#B57EDC",
          glow: "rgba(181, 126, 220, 0.5)",
          text: "#DDA0DD",
        },
        "black-mint": {
          color: "#3EB489",
          glow: "rgba(62, 180, 137, 0.6)",
          text: "#98FB98",
        },
        "black-ruby": {
          color: "#E0115F",
          glow: "rgba(224, 17, 95, 0.6)",
          text: "#FF1493",
        },
        "black-cobalt": {
          color: "#0047AB",
          glow: "rgba(0, 71, 171, 0.7)",
          text: "#4169E1",
        },
        "black-bronze": {
          color: "#CD7F32",
          glow: "rgba(205, 127, 50, 0.6)",
          text: "#D2691E",
        },
        "black-teal": {
          color: "#008080",
          glow: "rgba(0, 128, 128, 0.6)",
          text: "#20B2AA",
        },
        "black-magenta": {
          color: "#FF00FF",
          glow: "rgba(255, 0, 255, 0.6)",
          text: "#FF69B4",
        },
        "black-lime": {
          color: "#32CD32",
          glow: "rgba(50, 205, 50, 0.6)",
          text: "#7FFF00",
        },
        "black-indigo": {
          color: "#4B0082",
          glow: "rgba(75, 0, 130, 0.6)",
          text: "#8B00FF",
        },
      };

      const accent = accentColors[settings.gradientStyle] || null;

      // Texture patterns (CSS background-image overlays)
      // ========== PROFESSIONAL TEXTURE SYSTEM 2.0 ==========
      // 25 premium patterns with proper visibility (0.12-0.25 opacity)
      const textures = {
        none: "",

        // ===== MODERN GLASS (Apple iOS Glassmorphism) =====
        "frosted-glass": `
                  radial-gradient(circle at 35% 35%, rgba(74, 158, 255, 0.25), transparent 60%),
                  radial-gradient(circle at 65% 65%, rgba(0, 217, 255, 0.20), transparent 55%),
                  radial-gradient(circle at 20% 80%, rgba(147, 197, 253, 0.18), transparent 45%),
                  url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.15'/%3E%3C/svg%3E"),
                  linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(200, 230, 255, 0.08))
              `,
        "crystal-prism": `
                  linear-gradient(45deg, rgba(74, 158, 255, 0.35) 0%, transparent 50%, rgba(147, 51, 234, 0.28) 100%),
                  linear-gradient(-45deg, transparent 0%, rgba(0, 217, 255, 0.30) 50%, transparent 100%),
                  radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.25), transparent 60%),
                  radial-gradient(circle at 30% 70%, rgba(139, 92, 246, 0.18), transparent 50%)
              `,
        "ice-frost": `
                  radial-gradient(circle at 20% 30%, rgba(147, 197, 253, 0.40) 0%, transparent 4%),
                  radial-gradient(circle at 60% 70%, rgba(191, 219, 254, 0.35) 0%, transparent 5%),
                  radial-gradient(circle at 80% 20%, rgba(224, 242, 254, 0.38) 0%, transparent 3%),
                  radial-gradient(circle at 40% 50%, rgba(59, 130, 246, 0.22) 0%, transparent 8%),
                  linear-gradient(to bottom, rgba(219, 234, 254, 0.15), rgba(147, 197, 253, 0.08))
              `,
        "smoke-flow": `
                  radial-gradient(ellipse at 0% 0%, rgba(96, 165, 250, 0.35), transparent 55%),
                  radial-gradient(ellipse at 100% 100%, rgba(147, 197, 253, 0.28), transparent 60%),
                  radial-gradient(ellipse at 50% 50%, rgba(191, 219, 254, 0.25), transparent 45%),
                  radial-gradient(ellipse at 30% 70%, rgba(59, 130, 246, 0.18), transparent 50%)
              `,
        "water-ripple": `
                  radial-gradient(circle, rgba(6, 182, 212, 0.30) 3px, transparent 3px),
                  radial-gradient(circle, rgba(34, 211, 238, 0.25) 2px, transparent 2px),
                  radial-gradient(circle, rgba(103, 232, 249, 0.18) 1.5px, transparent 1.5px),
                  linear-gradient(to bottom, rgba(165, 243, 252, 0.12), rgba(6, 182, 212, 0.08))
              `,

        // ===== PREMIUM MATERIALS (Photorealistic Luxury) =====
        "carbon-fiber-pro": `
                  repeating-linear-gradient(0deg,
                      rgba(59, 130, 246, 0.15) 0px,
                      rgba(147, 51, 234, 0.35) 1px,
                      rgba(99, 102, 241, 0.28) 2px,
                      rgba(139, 92, 246, 0.12) 3px,
                      transparent 4px),
                  repeating-linear-gradient(90deg,
                      rgba(30, 58, 138, 0.18) 0px,
                      rgba(67, 56, 202, 0.32) 1px,
                      rgba(79, 70, 229, 0.25) 2px,
                      rgba(99, 102, 241, 0.15) 3px,
                      transparent 4px),
                  linear-gradient(135deg, rgba(30, 27, 75, 0.20), rgba(67, 56, 202, 0.10))
              `,
        "brushed-aluminum": `
                  repeating-linear-gradient(90deg,
                      rgba(226, 232, 240, 0.35) 0px,
                      rgba(203, 213, 225, 0.45) 0.5px,
                      rgba(226, 232, 240, 0.38) 1px,
                      rgba(241, 245, 249, 0.28) 1.5px,
                      rgba(203, 213, 225, 0.32) 2px),
                  linear-gradient(180deg, rgba(248, 250, 252, 0.18), rgba(226, 232, 240, 0.25)),
                  radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.15), transparent 60%)
              `,
        "brushed-titanium": `
                  repeating-linear-gradient(45deg,
                      rgba(251, 191, 36, 0.30) 0px,
                      rgba(217, 119, 6, 0.40) 1px,
                      rgba(245, 158, 11, 0.35) 2px,
                      rgba(251, 191, 36, 0.25) 3px),
                  linear-gradient(135deg, rgba(217, 119, 6, 0.18), rgba(251, 191, 36, 0.12)),
                  radial-gradient(circle at 40% 40%, rgba(252, 211, 77, 0.20), transparent 55%)
              `,
        "leather-grain": `
                  url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='turbulence'%3E%3CfeTurbulence type='turbulence' baseFrequency='2.2' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23turbulence)' opacity='0.28'/%3E%3C/svg%3E"),
                  radial-gradient(circle at 60% 40%, rgba(127, 29, 29, 0.35), transparent 65%),
                  radial-gradient(circle at 30% 70%, rgba(153, 27, 27, 0.28), transparent 60%),
                  linear-gradient(135deg, rgba(185, 28, 28, 0.22), rgba(127, 29, 29, 0.18))
              `,
        "fabric-weave": `
                  repeating-linear-gradient(0deg, rgba(148, 163, 184, 0.35) 0px, transparent 1px, transparent 3px),
                  repeating-linear-gradient(90deg, rgba(148, 163, 184, 0.35) 0px, transparent 1px, transparent 3px),
                  linear-gradient(45deg, rgba(203, 213, 225, 0.15) 25%, transparent 25%, transparent 75%, rgba(203, 213, 225, 0.15) 75%),
                  linear-gradient(45deg, rgba(226, 232, 240, 0.12), rgba(203, 213, 225, 0.08))
              `,
        "wood-grain": `
                  linear-gradient(90deg,
                      rgba(217, 119, 6, 0.28) 0%,
                      rgba(251, 146, 60, 0.35) 8%,
                      rgba(217, 119, 6, 0.25) 16%,
                      rgba(234, 88, 12, 0.32) 24%,
                      rgba(251, 146, 60, 0.28) 32%,
                      rgba(217, 119, 6, 0.30) 40%),
                  repeating-linear-gradient(90deg, transparent 0px, rgba(180, 83, 9, 0.18) 1px, transparent 2px),
                  linear-gradient(180deg, rgba(251, 191, 36, 0.15), rgba(217, 119, 6, 0.10))
              `,

        // ===== TECH/FUTURISTIC (Cyberpunk Neon) =====
        "circuit-board": `
                  linear-gradient(rgba(34, 197, 94, 0.32) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(34, 197, 94, 0.32) 1px, transparent 1px),
                  linear-gradient(rgba(16, 185, 129, 0.25) 2px, transparent 2px),
                  linear-gradient(90deg, rgba(16, 185, 129, 0.25) 2px, transparent 2px),
                  radial-gradient(circle at 25% 25%, rgba(52, 211, 153, 0.20), transparent 15%),
                  radial-gradient(circle at 75% 75%, rgba(16, 185, 129, 0.18), transparent 15%),
                  linear-gradient(135deg, rgba(6, 78, 59, 0.15), rgba(20, 83, 45, 0.10))
              `,
        "hexagon-grid-pro": `
                  repeating-linear-gradient(0deg, transparent, transparent 22px, rgba(6, 182, 212, 0.38) 22px, rgba(14, 165, 233, 0.38) 23px),
                  repeating-linear-gradient(60deg, transparent, transparent 22px, rgba(34, 211, 238, 0.32) 22px, rgba(6, 182, 212, 0.32) 23px),
                  repeating-linear-gradient(120deg, transparent, transparent 22px, rgba(56, 189, 248, 0.32) 22px, rgba(14, 165, 233, 0.32) 23px),
                  radial-gradient(circle at 50% 50%, rgba(125, 211, 252, 0.18), transparent 50%)
              `,
        "hologram-scan": `
                  repeating-linear-gradient(0deg,
                      transparent 0px,
                      rgba(6, 182, 212, 0.22) 1px,
                      rgba(236, 72, 153, 0.32) 2px,
                      rgba(6, 182, 212, 0.22) 3px,
                      transparent 4px),
                  linear-gradient(90deg, rgba(236, 72, 153, 0.15), rgba(6, 182, 212, 0.15), rgba(236, 72, 153, 0.15)),
                  radial-gradient(circle at 50% 50%, rgba(236, 72, 153, 0.18), transparent 60%)
              `,
        "matrix-rain": `
                  linear-gradient(rgba(34, 197, 94, 0.35) 2px, transparent 2px),
                  linear-gradient(90deg, rgba(16, 185, 129, 0.28) 1px, transparent 1px),
                  radial-gradient(circle at 30% 40%, rgba(52, 211, 153, 0.20), transparent 50%),
                  linear-gradient(180deg, rgba(34, 197, 94, 0.12), rgba(6, 78, 59, 0.08))
              `,
        "energy-waves": `
                  radial-gradient(ellipse at 50% 0%, rgba(59, 130, 246, 0.40), transparent 45%),
                  radial-gradient(ellipse at 50% 100%, rgba(96, 165, 250, 0.38), transparent 45%),
                  radial-gradient(ellipse at 50% 50%, rgba(147, 197, 253, 0.28), transparent 35%),
                  radial-gradient(ellipse at 0% 50%, rgba(29, 78, 216, 0.22), transparent 40%),
                  radial-gradient(ellipse at 100% 50%, rgba(37, 99, 235, 0.22), transparent 40%)
              `,
        "cyberpunk-grid": `
                  linear-gradient(rgba(236, 72, 153, 0.35) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(6, 182, 212, 0.35) 1px, transparent 1px),
                  radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.25), transparent 65%),
                  linear-gradient(135deg, rgba(236, 72, 153, 0.12), rgba(6, 182, 212, 0.12))
              `,

        // ===== GEOMETRIC CLEAN (Swiss Design) =====
        "dots-pro": `
                  radial-gradient(circle, rgba(100, 116, 139, 0.40) 2px, transparent 2px),
                  radial-gradient(circle, rgba(148, 163, 184, 0.20) 1px, transparent 1px),
                  linear-gradient(to bottom right, rgba(203, 213, 225, 0.10), rgba(148, 163, 184, 0.08))
              `,
        "grid-pro": `
                  linear-gradient(rgba(100, 116, 139, 0.35) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(100, 116, 139, 0.35) 1px, transparent 1px),
                  linear-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(148, 163, 184, 0.15) 1px, transparent 1px)
              `,
        "diagonal-pro": `
                  repeating-linear-gradient(45deg,
                      transparent,
                      transparent 18px,
                      rgba(100, 116, 139, 0.32) 18px,
                      rgba(148, 163, 184, 0.28) 19px,
                      transparent 20px),
                  linear-gradient(135deg, rgba(203, 213, 225, 0.10), rgba(148, 163, 184, 0.05))
              `,
        waves: `
                  repeating-radial-gradient(circle at 50% 50%,
                      transparent 0px,
                      rgba(100, 116, 139, 0.30) 12px,
                      transparent 24px),
                  radial-gradient(circle at 50% 50%, rgba(148, 163, 184, 0.18), transparent 60%)
              `,
        triangles: `
                  linear-gradient(45deg, rgba(100, 116, 139, 0.35) 25%, transparent 25%),
                  linear-gradient(-45deg, rgba(100, 116, 139, 0.35) 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, rgba(148, 163, 184, 0.28) 75%),
                  linear-gradient(-45deg, transparent 75%, rgba(148, 163, 184, 0.28) 75%)
              `,
        crosshatch: `
                  repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(100, 116, 139, 0.32) 4px, rgba(100, 116, 139, 0.32) 5px),
                  repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(148, 163, 184, 0.28) 4px, rgba(148, 163, 184, 0.28) 5px)
              `,

        // ===== SPECIAL EFFECTS (Atmospheric) =====
        "perlin-noise": `
                  url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='perlin'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='5' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0.3 0 0 0 0.4, 0 0.4 0 0 0.5, 0 0 0.5 0 0.6, 0 0 0 0.35 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23perlin)'/%3E%3C/svg%3E"),
                  radial-gradient(circle at 50% 50%, rgba(147, 51, 234, 0.15), transparent 70%)
              `,
        "gradient-mesh": `
                  radial-gradient(circle at 25% 25%, rgba(139, 92, 246, 0.35), transparent 55%),
                  radial-gradient(circle at 75% 25%, rgba(59, 130, 246, 0.32), transparent 55%),
                  radial-gradient(circle at 25% 75%, rgba(236, 72, 153, 0.30), transparent 55%),
                  radial-gradient(circle at 75% 75%, rgba(6, 182, 212, 0.28), transparent 55%),
                  linear-gradient(135deg, rgba(167, 139, 250, 0.12), rgba(96, 165, 250, 0.12))
              `,
      };

      const textureBackgroundSize = {
        "frosted-glass": "100% 100%, 100% 100%, 100% 100%, cover, 100% 100%",
        "crystal-prism": "100% 100%, 100% 100%, 100% 100%, 100% 100%",
        "ice-frost": "100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%",
        "smoke-flow": "100% 100%, 100% 100%, 100% 100%, 100% 100%",
        "water-ripple": "30px 30px, 50px 50px, 40px 40px, 100% 100%",
        "carbon-fiber-pro": "6px 6px, 6px 6px, 100% 100%",
        "brushed-aluminum": "2px 100%, 100% 100%, 100% 100%",
        "brushed-titanium": "3px 3px, 100% 100%, 100% 100%",
        "leather-grain": "cover, 100% 100%, 100% 100%, 100% 100%",
        "fabric-weave": "4px 4px, 4px 4px, 30px 30px, 100% 100%",
        "wood-grain": "100% 40px, 100% 2px, 100% 100%",
        "circuit-board":
          "40px 40px, 40px 40px, 120px 120px, 120px 120px, 100% 100%, 100% 100%, 100% 100%",
        "hexagon-grid-pro": "100% 100%, 100% 100%, 100% 100%, 100% 100%",
        "hologram-scan": "100% 5px, 100% 100%, 100% 100%",
        "matrix-rain": "2px 20px, 10px 10px, 100% 100%, 100% 100%",
        "energy-waves": "100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%",
        "cyberpunk-grid": "50px 50px, 50px 50px, 100% 100%, 100% 100%",
        "dots-pro": "25px 25px, 20px 20px, 100% 100%",
        "grid-pro": "30px 30px, 30px 30px, 60px 60px, 60px 60px",
        "diagonal-pro": "100% 100%, 100% 100%",
        waves: "100% 100%, 100% 100%",
        triangles: "30px 30px, 30px 30px, 30px 30px, 30px 30px",
        crosshatch: "100% 100%, 100% 100%",
        "perlin-noise": "cover, 100% 100%",
        "gradient-mesh":
          "100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%",
      };

      const textureStyle = settings.textureStyle || "none";
      let texturePattern = textures[textureStyle] || "";
      let textureBgSize = textureBackgroundSize[textureStyle] || "auto";

      // Apply intensity multiplier to texture opacity
      const textureIntensity =
        settings.textureIntensity !== undefined
          ? settings.textureIntensity
          : 75;
      const intensityMultiplier = textureIntensity / 100; // 0-100% direct mapping

      if (texturePattern && intensityMultiplier !== 1.0) {
        // Multiply all rgba() opacity values by intensity multiplier
        texturePattern = texturePattern.replace(
          /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)/g,
          (match, r, g, b, a) => {
            const newAlpha = Math.min(1, parseFloat(a) * intensityMultiplier);
            return `rgba(${r}, ${g}, ${b}, ${newAlpha.toFixed(3)})`;
          },
        );

        // Also handle SVG opacity attributes
        texturePattern = texturePattern.replace(
          /opacity='([0-9.]+)'/g,
          (match, a) => {
            const newAlpha = Math.min(1, parseFloat(a) * intensityMultiplier);
            return `opacity='${newAlpha.toFixed(2)}'`;
          },
        );
      }

      // Apply scale multiplier to texture background-size
      const textureScale = settings.textureScale || "medium";
      const scaleMultipliers = { small: 0.5, medium: 1.0, large: 2.0 };
      const scaleMultiplier = scaleMultipliers[textureScale];

      if (
        textureBgSize !== "cover" &&
        textureBgSize !== "auto" &&
        scaleMultiplier !== 1.0
      ) {
        // Scale pixel/percentage values
        textureBgSize = textureBgSize.replace(
          /(\d+)(px|%)/g,
          (match, value, unit) => {
            const scaled = Math.round(parseFloat(value) * scaleMultiplier);
            return scaled + unit;
          },
        );
      }

      // Get blend mode
      const textureBlendMode = settings.textureBlendMode || "overlay";

      // Get animation setting
      const textureAnimated = settings.textureAnimated || false;

      return {
        background,
        boxShadow,
        opacity: isPopout ? settings.popoutOpacity : settings.opacity,
        effectiveOpacity: effectiveOpacity,
        gradientStyle: settings.gradientStyle,
        effectStyle: settings.effectStyle,
        textureStyle: textureStyle,
        texturePattern: texturePattern,
        textureBackgroundSize: textureBgSize,
        textureBlendMode: textureBlendMode,
        textureAnimated: textureAnimated,
        isPopout: isPopout,
        accentColor: accent ? accent.color : "#4a9eff",
        accentGlow: accent ? accent.glow : "rgba(74, 158, 255, 0.5)",
        accentText: accent ? accent.text : "#FFFFFF",
      };
    }

    function applyThemeToElement(element, themeStyles) {
      if (!element || !themeStyles) return;

      const opacity = themeStyles.opacity / 100;

      // Handle true 0% opacity - completely transparent
      if (opacity === 0) {
        element.style.background = "transparent";
        element.style.boxShadow = "none";
        element.style.backdropFilter = "none";
        element.style.border = "none";
        productionLog("🔍 Applied true 0% opacity - completely transparent");
        return;
      }

      // Handle all opacity levels (1-100%) with same logic
      // Layer texture over gradient if texture is enabled
      if (themeStyles.texturePattern) {
        element.style.background = `${themeStyles.texturePattern}, ${themeStyles.background}`;
        element.style.backgroundSize = `${themeStyles.textureBackgroundSize}, cover`;
        element.style.backgroundBlendMode = `${themeStyles.textureBlendMode}, normal`;

        // Add animation class if enabled for supported textures
        const animatedTextures = [
          "smoke-flow",
          "hologram-scan",
          "energy-waves",
          "water-ripple",
        ];
        if (
          themeStyles.textureAnimated &&
          animatedTextures.includes(themeStyles.textureStyle)
        ) {
          element.classList.add("mga-texture-animated");
        } else {
          element.classList.remove("mga-texture-animated");
        }
      } else {
        element.style.background = themeStyles.background;
        element.style.backgroundBlendMode = "";
        element.classList.remove("mga-texture-animated");
      }

      // Apply box shadow and borders
      const isBlackTheme =
        themeStyles.gradientStyle &&
        themeStyles.gradientStyle.startsWith("black-");
      if (isBlackTheme && themeStyles.accentColor) {
        element.style.boxShadow = `0 10px 40px rgba(0, 0, 0, 0.8), 0 0 30px ${themeStyles.accentGlow}`;
        element.style.border = `1px solid ${themeStyles.accentColor}`;
      } else {
        element.style.boxShadow = themeStyles.boxShadow;
        element.style.border = `1px solid rgba(255, 255, 255, ${Math.max(0.05, opacity * 0.15)})`;
      }

      // Backdrop filter: disable at 100% for solid appearance, scale with opacity otherwise
      if (opacity >= 1.0) {
        element.style.backdropFilter = "none";
      } else if (opacity > 0.05) {
        const blurIntensity = Math.max(2, Math.min(12, 12 * opacity));
        element.style.backdropFilter = `blur(${blurIntensity}px)`;
      } else {
        element.style.backdropFilter = "none";
      }

      // Set theme-aware CSS custom properties for dynamic elements
      const effectiveOpacity = themeStyles.effectiveOpacity || opacity;
      const accentColor = getAccentColorForTheme(
        themeStyles.gradientStyle,
        effectiveOpacity,
      );

      element.style.setProperty("--theme-accent-bg", accentColor.background);
      element.style.setProperty("--theme-accent-border", accentColor.border);

      // Apply dynamic scaling if this is an overlay
      if (
        element.classList.contains("mga-overlay") ||
        (element.id && element.id.includes("overlay"))
      ) {
        const width = element.offsetWidth || 400;
        const scale = calculateScale(width);
        element.style.setProperty("--panel-scale", scale);
      }
    }

    function calculateScale(width) {
      // Same scaling logic as the main panel
      let scale = 1;
      if (width < 350) {
        scale = 0.8;
      } else if (width < 450) {
        scale = 0.85;
      } else if (width < 550) {
        scale = 0.9;
      } else if (width < 650) {
        scale = 0.95;
      } else if (width >= 800) {
        scale = 1.05;
      }
      return scale;
    }

    function getAccentColorForTheme(gradientStyle, opacity) {
      // Define accent colors based on the current theme
      const accentColors = {
        "blue-purple": {
          background: `linear-gradient(135deg, rgba(74, 158, 255, ${opacity * 0.1}) 0%, rgba(147, 51, 234, ${opacity * 0.1}) 100%)`,
          border: `rgba(74, 158, 255, ${opacity * 0.3})`,
        },
        "green-blue": {
          background: `linear-gradient(135deg, rgba(34, 197, 94, ${opacity * 0.1}) 0%, rgba(59, 130, 246, ${opacity * 0.1}) 100%)`,
          border: `rgba(34, 197, 94, ${opacity * 0.3})`,
        },
        "red-orange": {
          background: `linear-gradient(135deg, rgba(239, 68, 68, ${opacity * 0.1}) 0%, rgba(249, 115, 22, ${opacity * 0.1}) 100%)`,
          border: `rgba(239, 68, 68, ${opacity * 0.3})`,
        },
        "purple-pink": {
          background: `linear-gradient(135deg, rgba(168, 85, 247, ${opacity * 0.1}) 0%, rgba(236, 72, 153, ${opacity * 0.1}) 100%)`,
          border: `rgba(168, 85, 247, ${opacity * 0.3})`,
        },
        "gold-yellow": {
          background: `linear-gradient(135deg, rgba(255, 215, 0, ${opacity * 0.1}) 0%, rgba(245, 158, 11, ${opacity * 0.1}) 100%)`,
          border: `rgba(255, 215, 0, ${opacity * 0.3})`,
        },
        "steel-blue": {
          background: `linear-gradient(135deg, rgba(30, 58, 138, ${opacity * 0.1}) 0%, rgba(51, 65, 85, ${opacity * 0.1}) 100%)`,
          border: `rgba(30, 58, 138, ${opacity * 0.3})`,
        },
        "chrome-silver": {
          background: `linear-gradient(135deg, rgba(203, 213, 225, ${opacity * 0.1}) 0%, rgba(148, 163, 184, ${opacity * 0.1}) 100%)`,
          border: `rgba(203, 213, 225, ${opacity * 0.3})`,
        },
        "titanium-gray": {
          background: `linear-gradient(135deg, rgba(107, 114, 128, ${opacity * 0.1}) 0%, rgba(156, 163, 175, ${opacity * 0.1}) 100%)`,
          border: `rgba(107, 114, 128, ${opacity * 0.3})`,
        },
        "electric-neon": {
          background: `linear-gradient(135deg, rgba(0, 100, 255, ${opacity * 0.1}) 0%, rgba(147, 51, 234, ${opacity * 0.1}) 100%)`,
          border: `rgba(0, 100, 255, ${opacity * 0.3})`,
        },
        "rainbow-burst": {
          background: `linear-gradient(135deg, rgba(239, 68, 68, ${opacity * 0.08}) 0%, rgba(245, 158, 11, ${opacity * 0.08}) 25%, rgba(34, 197, 94, ${opacity * 0.08}) 50%, rgba(59, 130, 246, ${opacity * 0.08}) 75%, rgba(147, 51, 234, ${opacity * 0.08}) 100%)`,
          border: `rgba(147, 51, 234, ${opacity * 0.3})`,
        },
      };

      return accentColors[gradientStyle] || accentColors["blue-purple"];
    }

    function syncThemeToAllWindows() {
      // Generate theme styles specifically for pop-out windows
      const popoutThemeStyles = generateThemeStyles(
        UnifiedState.data.settings,
        true,
      );
      if (!popoutThemeStyles) return;

      // Update all in-game overlays with pop-out opacity
      UnifiedState.data.popouts.overlays.forEach((overlay, tabName) => {
        if (overlay && document.contains(overlay)) {
          applyThemeToElement(overlay, popoutThemeStyles);
        }
      });

      // Update all shift+click popout widgets
      UnifiedState.data.popouts.widgets.forEach((widget, tabName) => {
        if (widget && document.contains(widget)) {
          applyThemeToPopoutWidget(widget, popoutThemeStyles);
        }
      });

      // For pop-out windows, we'll implement a refresh system since we can't directly
      // communicate with them across window contexts. This is a limitation of
      // separate windows, but the themes will be applied when they're opened.

      // Store theme update timestamp for future reference
      UnifiedState.data.lastThemeUpdate = Date.now();
    }

    // Enhanced function to ensure themes are always current
    function ensureThemeConsistency() {
      // Apply theme to main panel if it exists but doesn't have the current theme
      const panel = UnifiedState.panels.main;
      if (panel) {
        const currentTheme = UnifiedState.currentTheme || generateThemeStyles();
        if (!UnifiedState.currentTheme) {
          UnifiedState.currentTheme = currentTheme;
        }
        applyThemeToElement(panel, currentTheme);
      }

      // Update all overlays
      syncThemeToAllWindows();
    }

    // Enhanced modal spam prevention with debouncing and queue system
    function setupModalSpamPrevention() {
      // Add modal spam protection to settings
      if (!UnifiedState.data.settings.modalSpamProtection) {
        UnifiedState.data.settings.modalSpamProtection = {
          enabled: true,
          cooldownMs: 500,
          queueLimit: 3,
          lastModalTime: 0,
          modalQueue: [],
        };
      }

      const modalSettings = UnifiedState.data.settings.modalSpamProtection;

      // Note: productionLog filtering removed - cannot intercept logs from other userscripts (MGC)
      // MGC spam is from separate userscript and must be filtered at browser console level if needed

      // Enhanced modal prevention with debouncing
      const originalAlert = window.alert;
      const originalConfirm = window.confirm;

      window.alert = function (message) {
        if (!modalSettings.enabled) return originalAlert.call(window, message);

        const now = Date.now();
        if (now - modalSettings.lastModalTime < modalSettings.cooldownMs) {
          debugLog("MODAL_SPAM", "Alert blocked due to cooldown", {
            message: message.substring(0, 50),
          });
          return;
        }

        modalSettings.lastModalTime = now;
        return originalAlert.call(window, message);
      };

      window.confirm = function (message) {
        if (!modalSettings.enabled)
          return originalConfirm.call(window, message);

        const now = Date.now();
        if (now - modalSettings.lastModalTime < modalSettings.cooldownMs) {
          debugLog("MODAL_SPAM", "Confirm blocked due to cooldown", {
            message: message.substring(0, 50),
          });
          return false; // Default to false for safety
        }

        modalSettings.lastModalTime = now;
        return originalConfirm.call(window, message);
      };

      // Prevent multiple overlapping modal dialogs
      let activeModalCount = 0;
      const originalCreateElement = targetDocument.createElement;
      targetDocument.createElement = function (tagName) {
        const element = originalCreateElement.call(document, tagName);

        if (
          tagName.toLowerCase() === "dialog" ||
          (element.className && element.className.includes("modal"))
        ) {
          if (activeModalCount >= modalSettings.queueLimit) {
            debugLog("MODAL_SPAM", "Modal blocked due to queue limit");
            return element; // Return but don't increment count
          }

          activeModalCount++;

          // Auto-cleanup modal count after 5 seconds
          setTimeout(() => {
            if (activeModalCount > 0) activeModalCount--;
          }, 5000);
        }

        return element;
      };

      debugLog("MODAL_SPAM", "Enhanced modal spam prevention initialized", {
        cooldownMs: modalSettings.cooldownMs,
        queueLimit: modalSettings.queueLimit,
      });
    }

    function applyTheme() {
      const themeStyles = generateThemeStyles();

      // Store current theme for cross-window synchronization
      UnifiedState.currentTheme = themeStyles;

      // Apply to main panel if it exists (Alt+key overlay windows)
      const panel = UnifiedState.panels.main;
      if (panel) {
        applyThemeToElement(panel, themeStyles);
      }

      // Apply theme colors to dock and sidebar for all themes
      const isBlackTheme =
        themeStyles.gradientStyle &&
        themeStyles.gradientStyle.startsWith("black-");
      if (isBlackTheme && themeStyles.accentColor) {
        // Black themes get special accent styling
        applyAccentToDock(themeStyles);
        applyAccentToSidebar(themeStyles);
      } else {
        // Non-black themes get their gradient applied
        applyThemeToDock(themeStyles);
        applyThemeToSidebar(themeStyles);
      }

      // Update all existing overlays and pop-out windows
      syncThemeToAllWindows();
    }

    function applyThemeToDock(themeStyles) {
      const dock = document.querySelector("#mgh-dock");
      if (!dock) return;

      // Apply theme background, border, and effects to dock
      dock.style.background = themeStyles.background;
      dock.style.border = `1px solid rgba(255, 255, 255, ${(themeStyles.opacity / 100) * 0.15})`;
      dock.style.boxShadow = themeStyles.boxShadow;
      dock.style.backdropFilter = "blur(20px)";
    }

    function applyAccentToDock(themeStyles) {
      const dock = document.querySelector("#mgh-dock");
      if (!dock) return;

      // Use actual user opacity setting
      const opacity = themeStyles.opacity / 100;

      // Apply black background with user-controlled opacity
      dock.style.background = `rgba(0, 0, 0, ${opacity})`;
      dock.style.border = `1px solid ${themeStyles.accentColor}`;

      // Combine base shadow with accent glow - enhanced by effect style
      let accentShadow = `0 8px 24px rgba(0, 0, 0, 0.8), 0 0 20px ${themeStyles.accentGlow}`;

      // Add effect-specific enhancements to the accent glow
      if (
        themeStyles.effectStyle === "neon" ||
        themeStyles.effectStyle === "plasma"
      ) {
        accentShadow += `, 0 0 40px ${themeStyles.accentGlow}`;
      } else if (
        themeStyles.effectStyle === "metallic" ||
        themeStyles.effectStyle === "steel"
      ) {
        accentShadow += `, inset 0 1px 0 rgba(255, 255, 255, 0.57)`;
      } else if (
        themeStyles.effectStyle === "crystal" ||
        themeStyles.effectStyle === "glass"
      ) {
        accentShadow += `, 0 0 30px ${themeStyles.accentGlow}, inset 0 1px 0 rgba(255, 255, 255, 0.73)`;
      }

      dock.style.boxShadow = accentShadow;

      // Scale backdrop blur with opacity, but disable at 100% for solid appearance
      if (opacity >= 1.0) {
        dock.style.backdropFilter = "none";
      } else if (opacity > 0.05) {
        const blurIntensity = Math.max(2, Math.min(20, 20 * opacity));
        dock.style.backdropFilter = `blur(${blurIntensity}px)`;
      } else {
        dock.style.backdropFilter = "none";
      }

      // Use CSS variables for hover effects (better performance)
      dock.style.setProperty("--accent-color", themeStyles.accentColor);
      dock.style.setProperty("--accent-glow", themeStyles.accentGlow);
    }

    function applyThemeToSidebar(themeStyles) {
      const sidebar = document.querySelector("#mgh-sidebar");
      if (!sidebar) return;

      // Apply theme background with textures, border, and effects to sidebar
      if (themeStyles.texturePattern) {
        sidebar.style.background = `${themeStyles.texturePattern}, ${themeStyles.background}`;
        sidebar.style.backgroundSize = `${themeStyles.textureBackgroundSize}, cover`;
      } else {
        sidebar.style.background = themeStyles.background;
      }
      sidebar.style.borderRight = `1px solid rgba(255, 255, 255, ${(themeStyles.opacity / 100) * 0.15})`;
      sidebar.style.boxShadow = `4px 0 24px rgba(0, 0, 0, 0.6), ${themeStyles.boxShadow}`;
      sidebar.style.backdropFilter = "blur(20px)";

      // Style sidebar header with textures
      const header = sidebar.querySelector(".mgh-sidebar-header");
      if (header) {
        if (themeStyles.texturePattern) {
          header.style.background = `${themeStyles.texturePattern}, ${themeStyles.background}`;
          header.style.backgroundSize = `${themeStyles.textureBackgroundSize}, cover`;
        } else {
          header.style.background = themeStyles.background;
        }
        header.style.borderBottom = `1px solid rgba(255, 255, 255, ${(themeStyles.opacity / 100) * 0.2})`;
      }

      // Remove accent-specific CSS if it exists
      const existingStyle = document.getElementById("accent-theme-styles");
      if (existingStyle) existingStyle.remove();
    }

    function applyAccentToSidebar(themeStyles) {
      const sidebar = document.querySelector("#mgh-sidebar");
      if (!sidebar) return;

      // Use actual user opacity setting
      const opacity = themeStyles.opacity / 100;

      // Apply solid black background with user-controlled opacity (no gradient tricks)
      if (themeStyles.texturePattern) {
        sidebar.style.background = `${themeStyles.texturePattern}, rgba(0, 0, 0, ${opacity})`;
        sidebar.style.backgroundSize = `${themeStyles.textureBackgroundSize}, cover`;
      } else {
        sidebar.style.background = `rgba(0, 0, 0, ${opacity})`;
      }
      sidebar.style.borderRight = `2px solid ${themeStyles.accentColor}`;

      // Scale backdrop blur with opacity, but disable at 100% for solid appearance
      if (opacity >= 1.0) {
        sidebar.style.backdropFilter = "none";
      } else if (opacity > 0.05) {
        const blurIntensity = Math.max(2, Math.min(20, 20 * opacity));
        sidebar.style.backdropFilter = `blur(${blurIntensity}px)`;
      } else {
        sidebar.style.backdropFilter = "none";
      }

      // Enhanced shadow with effect-specific styling
      let sidebarShadow = `4px 0 24px rgba(0, 0, 0, 0.6), 0 0 20px ${themeStyles.accentGlow}`;

      // Add effect-specific enhancements
      if (
        themeStyles.effectStyle === "neon" ||
        themeStyles.effectStyle === "plasma"
      ) {
        sidebarShadow += `, 0 0 40px ${themeStyles.accentGlow}`;
      } else if (
        themeStyles.effectStyle === "crystal" ||
        themeStyles.effectStyle === "glass"
      ) {
        sidebarShadow += `, inset 0 1px 0 rgba(255, 255, 255, 0.57)`;
      }

      sidebar.style.boxShadow = sidebarShadow;

      // Style sidebar header with accent gradient and opacity
      const header = sidebar.querySelector(".mgh-sidebar-header");
      if (header) {
        header.style.background = `linear-gradient(90deg, rgba(0, 0, 0, ${opacity}) 0%, ${themeStyles.accentColor} 100%)`;
        header.style.borderBottom = `2px solid ${themeStyles.accentColor}`;

        // Enhanced header glow based on effect
        let headerGlow = `0 2px 20px ${themeStyles.accentGlow}`;
        if (
          themeStyles.effectStyle === "neon" ||
          themeStyles.effectStyle === "plasma"
        ) {
          headerGlow += `, 0 0 30px ${themeStyles.accentGlow}`;
        }
        header.style.boxShadow = headerGlow;
      }

      // Use CSS variables for dynamic styling (better performance than event listeners)
      sidebar.style.setProperty("--accent-color", themeStyles.accentColor);
      sidebar.style.setProperty("--accent-glow", themeStyles.accentGlow);

      // Inject dynamic CSS for hover effects and other elements
      const style = document.createElement("style");
      style.id = "accent-theme-styles";
      const existingStyle = document.getElementById("accent-theme-styles");
      if (existingStyle) existingStyle.remove();

      style.textContent = `
              /* Sidebar sections - ONLY MGTools elements */
              #mgh-sidebar .mga-section {
                  background: ${themeStyles.accentColor}05;
                  border: 1px solid ${themeStyles.accentColor}33;
              }

              /* Buttons - ONLY in sidebar */
              #mgh-sidebar button.mga-button,
              #mgh-sidebar button.mga-btn {
                  background: linear-gradient(135deg, ${themeStyles.accentColor}AA, ${themeStyles.accentColor});
                  border: 1px solid ${themeStyles.accentColor};
              }
              #mgh-sidebar button.mga-button:hover,
              #mgh-sidebar button.mga-btn:hover {
                  background: linear-gradient(135deg, ${themeStyles.accentColor}, ${themeStyles.accentColor}FF);
                  box-shadow: 0 0 15px ${themeStyles.accentGlow};
              }

              /* Inputs - ONLY mga-prefixed classes */
              #mgh-sidebar input.mga-slider,
              #mgh-sidebar select.mga-select,
              #mgh-sidebar textarea.mga-textarea {
                  border-color: ${themeStyles.accentColor}66;
              }
              #mgh-sidebar input.mga-slider:focus,
              #mgh-sidebar select.mga-select:focus,
              #mgh-sidebar textarea.mga-textarea:focus {
                  border-color: ${themeStyles.accentColor};
                  box-shadow: 0 0 10px ${themeStyles.accentGlow};
              }

              /* Scrollbar - ONLY sidebar scrollbar */
              #mgh-sidebar .mgh-sidebar-body::-webkit-scrollbar-thumb {
                  background: linear-gradient(180deg, ${themeStyles.accentColor}, ${themeStyles.accentColor}AA);
              }
              #mgh-sidebar .mgh-sidebar-body::-webkit-scrollbar-thumb:hover {
                  background: ${themeStyles.accentColor};
              }
          `;
      document.head.appendChild(style);
    }

    function applyThemeToPopoutWidget(popout, themeStyles) {
      if (!popout || !themeStyles) return;

      const isBlackTheme =
        themeStyles.gradientStyle &&
        themeStyles.gradientStyle.startsWith("black-");

      // Use popout opacity setting (note: themeStyles is generated with isPopout flag)
      const opacity = themeStyles.opacity / 100;

      if (isBlackTheme && themeStyles.accentColor) {
        // Black themes: black background with user opacity and vibrant accents
        if (themeStyles.texturePattern) {
          popout.style.background = `${themeStyles.texturePattern}, rgba(0, 0, 0, ${opacity})`;
          popout.style.backgroundSize = `${themeStyles.textureBackgroundSize}, cover`;
        } else {
          popout.style.background = `rgba(0, 0, 0, ${opacity})`;
        }
        popout.style.border = `1px solid ${themeStyles.accentColor}`;

        // Enhanced shadow with effect-specific styling
        let shadow = `0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px ${themeStyles.accentGlow}`;

        // Add effect-specific enhancements
        if (
          themeStyles.effectStyle === "neon" ||
          themeStyles.effectStyle === "plasma"
        ) {
          shadow += `, 0 0 40px ${themeStyles.accentGlow}`;
        } else if (
          themeStyles.effectStyle === "metallic" ||
          themeStyles.effectStyle === "steel"
        ) {
          shadow += `, inset 0 1px 0 rgba(255, 255, 255, 0.57)`;
        } else if (
          themeStyles.effectStyle === "crystal" ||
          themeStyles.effectStyle === "glass"
        ) {
          shadow += `, 0 0 30px ${themeStyles.accentGlow}, inset 0 1px 0 rgba(255, 255, 255, 0.73)`;
        }

        popout.style.boxShadow = shadow;

        // Style header with accent gradient and opacity
        const header = popout.querySelector(".mgh-popout-header");
        if (header) {
          header.style.background = `linear-gradient(90deg, rgba(0, 0, 0, ${opacity}) 0%, ${themeStyles.accentColor} 100%)`;
          header.style.borderBottom = `1px solid ${themeStyles.accentColor}`;

          // Enhanced header glow based on effect
          let headerGlow = `0 2px 20px ${themeStyles.accentGlow}`;
          if (
            themeStyles.effectStyle === "neon" ||
            themeStyles.effectStyle === "plasma"
          ) {
            headerGlow += `, 0 0 30px ${themeStyles.accentGlow}`;
          }
          header.style.boxShadow = headerGlow;
        }

        // Body background with opacity for black themes
        const body = popout.querySelector(".mgh-popout-body");
        if (body) {
          if (themeStyles.texturePattern) {
            body.style.background = `${themeStyles.texturePattern}, rgba(0, 0, 0, ${opacity})`;
            body.style.backgroundSize = `${themeStyles.textureBackgroundSize}, cover`;
          } else {
            body.style.background = `rgba(0, 0, 0, ${opacity})`;
          }
        }
      } else {
        // Regular themes: use gradient background with textures
        if (themeStyles.texturePattern) {
          popout.style.background = `${themeStyles.texturePattern}, ${themeStyles.background}`;
          popout.style.backgroundSize = `${themeStyles.textureBackgroundSize}, cover`;
        } else {
          popout.style.background = themeStyles.background;
        }
        popout.style.border = `1px solid rgba(255, 255, 255, ${(themeStyles.opacity / 100) * 0.15})`;
        popout.style.boxShadow = themeStyles.boxShadow;

        // Style header
        const header = popout.querySelector(".mgh-popout-header");
        if (header) {
          if (themeStyles.texturePattern) {
            header.style.background = `${themeStyles.texturePattern}, ${themeStyles.background}`;
            header.style.backgroundSize = `${themeStyles.textureBackgroundSize}, cover`;
          } else {
            header.style.background = themeStyles.background;
          }
          header.style.borderBottom = `1px solid rgba(255, 255, 255, ${(themeStyles.opacity / 100) * 0.2})`;
        }

        // Keep body background solid for content readability
        const body = popout.querySelector(".mgh-popout-body");
        if (body) {
          if (themeStyles.texturePattern) {
            body.style.background = `${themeStyles.texturePattern}, ${themeStyles.background}`;
            body.style.backgroundSize = `${themeStyles.textureBackgroundSize}, cover`;
          } else {
            body.style.background = themeStyles.background; // Match theme gradient
          }
        }
      }

      popout.style.backdropFilter = "blur(20px)";
    }

    function applyUltraCompactMode(enabled) {
      const panel = UnifiedState.panels.main;
      if (!panel) return;

      if (enabled) {
        // Apply ultra-compact styles
        panel.style.cssText += `
                  --mga-font-size: 11px;
                  --mga-section-padding: 6px;
                  --mga-header-padding: 8px 12px;
                  --mga-button-padding: 4px 8px;
                  --mga-input-padding: 4px 6px;
                  --mga-tab-height: 32px;
                  --mga-spacing: 4px;
                  min-width: 250px;
                  font-size: 11px;
              `;

        // Add ultra-compact class for specific styling
        panel.classList.add("mga-ultra-compact");

        // Reduce overall panel size
        const currentWidth = parseInt(panel.style.width) || 800;
        const currentHeight = parseInt(panel.style.height) || 600;
        panel.style.width = Math.max(250, currentWidth * 0.7) + "px";
        panel.style.height = Math.max(300, currentHeight * 0.8) + "px";
      } else {
        // Remove ultra-compact styles
        panel.classList.remove("mga-ultra-compact");

        // Restore normal CSS variables
        panel.style.cssText = panel.style.cssText.replace(/--mga-[^;]+;/g, "");

        // Restore normal size - remove restrictions
        panel.style.minWidth = "250px";
        panel.style.maxWidth = "";
        panel.style.fontSize = "13px";
      }

      // Force re-render of current tab to apply new styles
      if (UnifiedState.activeTab) {
        updateTabContent();
      }

      productionLog(`📱 Ultra-compact mode ${enabled ? "applied" : "removed"}`);
    }

    // Cache for scale calculations
    const scaleCache = new Map();

    function applyDynamicScaling(element, width) {
      // Don't override ultra-compact mode
      if (element.classList.contains("mga-ultra-compact")) {
        return;
      }

      // Use cached scale if available for this width range
      const widthRange = Math.floor(width / 50) * 50; // Round to nearest 50px
      let scale = scaleCache.get(widthRange);

      if (scale === undefined) {
        // Calculate scale only once per range
        scale = 1;
        if (width < 350) {
          scale = 0.8;
        } else if (width < 450) {
          scale = 0.85;
        } else if (width < 550) {
          scale = 0.9;
        } else if (width < 650) {
          scale = 0.95;
        } else if (width >= 800) {
          scale = 1.05;
        }
        scaleCache.set(widthRange, scale);
      }

      // Only update if scale changed (avoid string conversion cost)
      const elementId = element.id || "default";
      const lastScale = element._lastScale;
      if (lastScale !== scale) {
        element._lastScale = scale;
        element.style.setProperty("--panel-scale", scale);
      }
    }

    function updateTabResponsiveness(element) {
      // This function was causing tabs to lose their popout buttons and text to truncate
      // Now we use horizontal scrolling with navigation arrows instead
      // Just handle scrolling the active tab into view if needed
      const tabs = element.querySelectorAll(".mga-tab");
      const tabsContainer = element.querySelector(".mga-tabs");

      if (!tabsContainer || tabs.length === 0) return;

      // Ensure active tab is visible by scrolling if necessary
      const activeTab = element.querySelector(".mga-tab.active");
      if (activeTab && tabsContainer.scrollWidth > tabsContainer.clientWidth) {
        const tabRect = activeTab.getBoundingClientRect();
        const containerRect = tabsContainer.getBoundingClientRect();

        if (tabRect.right > containerRect.right) {
          tabsContainer.scrollLeft += tabRect.right - containerRect.right + 10;
        } else if (tabRect.left < containerRect.left) {
          tabsContainer.scrollLeft -= containerRect.left - tabRect.left + 10;
        }
      }
    }

    // ==================== ABILITY MONITORING ====================
    // OPTIMIZED: Batch DOM updates and only update when necessary
    let pendingAbilityUpdates = false;

    // Helper function to get crop info from garden (only if unambiguous)
    function getGardenCropIfUnique() {
      const tileObjects = window.gardenInfo?.garden?.tileObjects;
      if (!tileObjects) return null;

      // Count unique species (only plants, not empty tiles)
      const speciesSet = new Set();
      const tiles = Object.values(tileObjects);

      tiles.forEach((tile) => {
        if (tile?.species && tile.objectType === "plant") {
          speciesSet.add(tile.species);
        }
      });

      // Only return if there's exactly ONE unique species (unambiguous)
      // If multiple crops, we can't know which one was affected
      if (speciesSet.size === 1) {
        return Array.from(speciesSet)[0];
      }

      return null; // Multiple crops or no crops - can't determine accurately
    }

    function monitorPetAbilities() {
      if (!UnifiedState.atoms.petAbility || !UnifiedState.atoms.activePets)
        return;

      let hasNewAbility = false;

      UnifiedState.atoms.activePets.forEach((pet, index) => {
        if (!pet || !pet.id) return;

        const abilityData = UnifiedState.atoms.petAbility[pet.id];
        if (!abilityData || !abilityData.lastAbilityTrigger) return;

        const trigger = abilityData.lastAbilityTrigger;
        const currentTimestamp = trigger.performedAt;

        // BUGFIX v1.11.4: Skip logging if pet is unfed (hunger = 0)
        // Game shows "feed your pet" notification but creates empty trigger
        if (!currentTimestamp || pet.hunger === 0) {
          productionLog(
            `🚫 [ABILITY-SKIP] Pet ${pet.petSpecies} unfed (hunger: ${pet.hunger}) - skipping ability log`,
          );
          return;
        }

        // BUGFIX v1.11.4: Additional validation - skip if trigger has no valid ability ID
        // This prevents fake ability logs from unfed pet notifications
        if (
          !trigger.abilityId ||
          trigger.abilityId === "Unknown" ||
          trigger.abilityId === ""
        ) {
          productionLog(
            `🚫 [ABILITY-SKIP] Invalid ability ID for ${pet.petSpecies} - likely unfed pet notification`,
          );
          return;
        }

        // Check if this is a new trigger - use UnifiedState instead of window variables
        if (!UnifiedState.data.lastAbilityTimestamps) {
          UnifiedState.data.lastAbilityTimestamps = {};
        }

        const lastKnown = UnifiedState.data.lastAbilityTimestamps[pet.id];

        // Exact match - definitely already logged
        if (lastKnown === currentTimestamp) {
          return;
        }

        // Additional validation: If timestamp is very recent (within 3 seconds), skip
        // BUGFIX v3.7.8: Reduced from 10s to 3s to allow rapid abilities (Gold Granter → Rainbow Granter)
        // This prevents false triggers on page refresh when same ability state reloads
        if (lastKnown && Math.abs(currentTimestamp - lastKnown) < 3000) {
          if (UnifiedState.data.settings?.debugMode) {
            productionLog(
              `🚫 [ABILITY-SKIP] ${pet.petSpecies} - Timestamp too close to last (${Math.abs(currentTimestamp - lastKnown)}ms)`,
            );
          }
          return;
        }

        // Check if this exact log already exists in recent entries (prevents race condition duplicates)
        const isDuplicate = UnifiedState.data.petAbilityLogs
          .slice(0, 10)
          .some(
            (log) =>
              log.timestamp === currentTimestamp &&
              log.petName &&
              log.petName.includes(pet.petSpecies),
          );

        if (isDuplicate) {
          if (UnifiedState.data.settings?.debugMode) {
            productionLog(
              `🚫 [ABILITY-SKIP] ${pet.petSpecies} - Already in recent logs (duplicate prevention)`,
            );
          }
          return;
        }

        UnifiedState.data.lastAbilityTimestamps[pet.id] = currentTimestamp;
        hasNewAbility = true;

        // Save ability timestamps to prevent duplicate logging after refresh
        MGA_debouncedSave(
          "MGA_lastAbilityTimestamps",
          UnifiedState.data.lastAbilityTimestamps,
        );

        // BUGFIX: Enrich ability data with crop info if missing (only when unambiguous)
        const enrichedData = trigger.data ? { ...trigger.data } : {};

        // For granter abilities (Gold/Rainbow), try to add crop name if missing
        const abilityId = trigger.abilityId || "";
        if (abilityId.includes("Granter") && !enrichedData.cropName) {
          // Strategy 1: Check currentCrop (works for single-crop users)
          const currentCrop =
            window.currentCrop || UnifiedState.atoms.currentCrop;
          if (currentCrop && currentCrop[0]?.species) {
            enrichedData.cropName = currentCrop[0].species;
          } else {
            // Strategy 2: Check garden tiles (only if exactly ONE crop type exists)
            // This prevents showing wrong crop when multiple crop types are growing
            const uniqueCrop = getGardenCropIfUnique();
            if (uniqueCrop) {
              enrichedData.cropName = uniqueCrop;
            }
            // Otherwise: No crop name added (honest about uncertainty)
          }
        }

        // Create display name with custom name if available
        let displayName = pet.petSpecies || `Pet ${index + 1}`;
        if (pet.name && pet.name !== pet.petSpecies) {
          // Show as "CustomName (Species)"
          displayName = `${pet.name} (${pet.petSpecies || "Pet"})`;
        }

        // Normalize ability name to fix potential typos (e.g., "Seed FinderII" → "Seed Finder II")
        const rawAbilityType = trigger.abilityId || "Unknown Ability";
        const normalizedAbilityType = normalizeAbilityName(rawAbilityType);

        const abilityLog = {
          petName: displayName,
          abilityType: normalizedAbilityType,
          timestamp: currentTimestamp,
          timeString: formatTimestamp(currentTimestamp),
          data: Object.keys(enrichedData).length > 0 ? enrichedData : null,
        };

        logDebug("ABILITY-LOGS", "Adding NEW ability log:", {
          ability: abilityLog.abilityType,
          pet: abilityLog.petName,
          time: abilityLog.timeString,
          currentLogCount: UnifiedState.data.petAbilityLogs.length,
        });

        UnifiedState.data.petAbilityLogs.unshift(abilityLog);

        // Apply memory management to keep recent logs in memory, archive older ones
        UnifiedState.data.petAbilityLogs = MGA_manageLogMemory(
          UnifiedState.data.petAbilityLogs,
        );

        // Use debounced save to reduce I/O operations during frequent ability triggers
        // Only save if not in clear session
        const clearSession = localStorage.getItem("MGA_logs_clear_session");
        if (
          !clearSession ||
          Date.now() - parseInt(clearSession, 10) > 86400000
        ) {
          MGA_debouncedSave(
            "MGA_petAbilityLogs",
            UnifiedState.data.petAbilityLogs,
          );
        } else {
          logDebug("ABILITY-LOGS", "⏸️ Skipping save - clear session active");
        }

        // Check if we should notify for this ability
        if (
          UnifiedState.data.settings.notifications.abilityNotificationsEnabled
        ) {
          const abilityType = trigger.abilityId || "";

          // Filter out ProduceMutationBoost/PetMutationBoost - these are passive and shouldn't trigger notifications
          if (
            abilityType &&
            (abilityType.includes("ProduceMutationBoost") ||
              abilityType.includes("PetMutationBoost"))
          ) {
            return; // Skip notification for mutation boosts
          }

          // Check individual abilities list
          const watchedAbilities =
            UnifiedState.data.settings.notifications.watchedAbilities || [];

          // Logic:
          // - Empty array = all abilities enabled (default/backward compatible)
          // - ['__NONE__'] = no abilities enabled (user clicked "Select None")
          // - [...abilities] = only those specific abilities enabled
          let shouldNotify = false;

          if (watchedAbilities.length === 0) {
            // Empty array means all abilities
            shouldNotify = true;
          } else if (watchedAbilities.includes("__NONE__")) {
            // Special marker means none
            shouldNotify = false;
          } else {
            // Check if this specific ability is in the list
            shouldNotify = watchedAbilities.includes(abilityType);
          }

          if (shouldNotify) {
            const displayAbilityName = normalizeAbilityName(abilityType);
            productionLog(
              `🎯 [ABILITY-NOTIFY] ${abilityLog.petName} triggered ${displayAbilityName}`,
            );

            // Play ability notification sound based on settings
            const abilityVolume =
              UnifiedState.data.settings.notifications
                .abilityNotificationVolume || 0.2;
            playAbilityNotificationSound(abilityVolume);

            // Show toast
            showNotificationToast(
              `✨ ${abilityLog.petName}: ${displayAbilityName}`,
              "success",
            );
          }
        }
      });

      // PERFORMANCE OPTIMIZATION: Debounce ability log updates to prevent spam
      // Max 1 update per 500ms even if multiple abilities trigger rapidly
      if (hasNewAbility && document.visibilityState === "visible") {
        if (!pendingAbilityUpdates) {
          pendingAbilityUpdates = true;

          // Debounce: Wait 500ms before updating to batch rapid ability triggers
          setTimeout(() => {
            requestAnimationFrame(() => {
              updateAllAbilityLogDisplays();

              if (UnifiedState.activeTab === "abilities") {
                updateTabContent();
              }

              // BUGFIX: Removed duplicate overlay update loop
              // updateAllAbilityLogDisplays() already handles all overlays at line 13548
              // Duplicate updates were causing race conditions when both tab and pop-up were open

              pendingAbilityUpdates = false;
            });
          }, 500); // OPTIMIZED: 500ms debounce window
        }
      }
    }

    function exportAbilityLogs() {
      const allLogs = MGA_getAllLogs();
      if (!allLogs.length) {
        productionWarn("⚠️ No logs to export!");
        return;
      }

      const headers = "Date,Time,Pet Name,Ability Type,Details\r\n";
      const csvContent = allLogs
        .map((log) => {
          const date = new Date(log.timestamp);
          return [
            date.toLocaleDateString(),
            date.toLocaleTimeString(),
            log.petName,
            normalizeAbilityName(log.abilityType),
            JSON.stringify(log.data || ""),
          ]
            .map((field) => `"${String(field).replace(/"/g, '""')}"`)
            .join(",");
        })
        .join("\r\n");

      const blob = new Blob([headers + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const link = targetDocument.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `MagicGarden_AbilityLogs_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
    }

    // ==================== VALUE CALCULATIONS ====================
    const speciesValues = {};

    UnifiedState.plantsDatabase.forEach((plant) => {
      speciesValues[plant.id] = plant.plantValue;
    });

    // Mutation calculation matching FriendsScript logic
    const COLOR_MULT = {
      Gold: 25,
      Rainbow: 50,
    };

    const WEATHER_MULT = {
      Wet: 2,
      Chilled: 2,
      Frozen: 6,
      ThunderStruck: 5,
    };

    const TIME_MULT = {
      Dawnlit: 4,
      Dawnbound: 7,
      Dawncharged: 7, // Same as Dawnbound
      Amberlit: 6,
      Ambershine: 6, // Internal game name for Amberlit
      Amberbound: 10,
      Ambercharged: 10, // Same as Amberbound
    };

    // Auto-generate the combinations
    const WEATHER_TIME_COMBO = {};

    for (const [weather, wVal] of Object.entries(WEATHER_MULT)) {
      for (const [time, tVal] of Object.entries(TIME_MULT)) {
        const comboKey = `${weather}+${time}`;
        WEATHER_TIME_COMBO[comboKey] = wVal + tVal - 1;
      }
    }
    function calculateMutationMultiplier(mutations) {
      if (!mutations || !Array.isArray(mutations)) return 1;

      // Pick best color multiplier
      let color = 1;
      for (const m of mutations) {
        if (m === "Rainbow" && COLOR_MULT.Rainbow > color)
          color = COLOR_MULT.Rainbow;
        if (m === "Gold" && COLOR_MULT.Gold > color) color = COLOR_MULT.Gold;
      }

      // Pick best weather
      let weather = null;
      for (const m of mutations) {
        if (WEATHER_MULT[m]) {
          if (!weather || WEATHER_MULT[m] > WEATHER_MULT[weather]) {
            weather = m;
          }
        }
      }

      // Pick best time
      let time = null;
      for (const m of mutations) {
        if (TIME_MULT[m]) {
          if (!time || TIME_MULT[m] > TIME_MULT[time]) {
            time = m;
          }
        }
      }

      // Calculate weather+time multiplier
      let wt = 1;
      if (!weather && !time) wt = 1;
      else if (weather && !time) wt = WEATHER_MULT[weather];
      else if (!weather && time) wt = TIME_MULT[time];
      else {
        const combo = `${weather}+${time}`;
        wt =
          WEATHER_TIME_COMBO[combo] ||
          Math.max(WEATHER_MULT[weather], TIME_MULT[time]);
      }

      return Math.round(color * wt);
    }

    // ==================== ENHANCED VALUE MANAGER ====================
    class ValueManager {
      constructor() {
        this.cache = {
          inventoryValue: { value: 0, lastUpdate: 0 },
          tileValue: { value: 0, lastUpdate: 0 },
          gardenValue: { value: 0, lastUpdate: 0 },
        };
        this.throttleMs = 100; // 100ms throttle for value calculations
        this.retryAttempts = 3;
        this.observer = null;

        this.initializeObserver();
        debugLog("VALUE_MANAGER", "ValueManager initialized", {
          throttleMs: this.throttleMs,
        });
      }

      initializeObserver() {
        // Create MutationObserver to detect game state changes
        if (typeof MutationObserver !== "undefined") {
          this.observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            mutations.forEach((mutation) => {
              // Check if changes are related to inventory or game state
              if (
                mutation.target.classList &&
                (mutation.target.classList.contains("inventory") ||
                  mutation.target.classList.contains("garden") ||
                  mutation.target.classList.contains("crop"))
              ) {
                shouldUpdate = true;
              }
            });

            if (shouldUpdate) {
              this.invalidateCache();
              debugLog(
                "VALUE_MANAGER",
                "Game state change detected, invalidating cache",
              );
            }
          });

          // Observe body for any game-related changes
          this.observer.observe(targetDocument.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class", "data-value"],
          });
        }
      }

      getTileValue(forceRefresh = false) {
        return this.getCachedValue("tileValue", forceRefresh, () =>
          this.calculateTileValue(),
        );
      }

      getInventoryValue(forceRefresh = false) {
        return this.getCachedValue("inventoryValue", forceRefresh, () =>
          this.calculateInventoryValue(),
        );
      }

      getGardenValue(forceRefresh = false) {
        return this.getCachedValue("gardenValue", forceRefresh, () =>
          this.calculateGardenValue(),
        );
      }

      getCachedValue(type, forceRefresh, calculator) {
        const cached = this.cache[type];
        const now = Date.now();

        if (
          !forceRefresh &&
          cached &&
          now - cached.lastUpdate < this.throttleMs
        ) {
          return cached.value;
        }

        // Calculate new value with retry mechanism
        let attempts = 0;
        let value = 0;

        while (attempts < this.retryAttempts) {
          try {
            value = calculator();
            break;
          } catch (error) {
            attempts++;
            debugError(
              "VALUE_MANAGER",
              `Calculation failed for ${type}, attempt ${attempts}`,
              error,
            );

            if (attempts >= this.retryAttempts) {
              // Use cached value if all retries fail
              value = cached ? cached.value : 0;
              debugLog(
                "VALUE_MANAGER",
                `Using cached value for ${type} after ${attempts} failures`,
              );
            } else {
              // Brief delay before retry
              setTimeout(() => {}, 10 * attempts);
            }
          }
        }

        // Update cache
        this.cache[type] = {
          value,
          lastUpdate: now,
        };

        return value;
      }

      calculateTileValue() {
        const currentCrop = UnifiedState.atoms.currentCrop;
        const friendBonus = UnifiedState.atoms.friendBonus || 1;
        let tileValue = 0;

        if (currentCrop && currentCrop.length) {
          currentCrop.forEach((slot) => {
            if (slot && slot.species) {
              const multiplier = calculateMutationMultiplier(slot.mutations);
              const speciesVal = speciesValues[slot.species] || 0;
              const scale = slot.targetScale || 1;
              tileValue += Math.round(
                multiplier * speciesVal * scale * friendBonus,
              );
            }
          });
        }

        return tileValue;
      }

      calculateInventoryValue() {
        const inventory = UnifiedState.atoms.inventory;
        const friendBonus = UnifiedState.atoms.friendBonus || 1;
        let inventoryValue = 0;

        if (inventory && inventory.items) {
          inventory.items.forEach((item) => {
            if (item.itemType === "Produce" && item.species) {
              const multiplier = calculateMutationMultiplier(item.mutations);
              const speciesVal = speciesValues[item.species] || 0;
              const scale = item.scale || 1;
              inventoryValue += Math.round(
                multiplier * speciesVal * scale * friendBonus,
              );
            }
          });
        }

        return inventoryValue;
      }

      calculateGardenValue() {
        const myGarden = UnifiedState?.atoms?.myGarden?.data;
        const friendBonus = UnifiedState.atoms.friendBonus || 1;
        let gardenValue = 0;

        if (myGarden && myGarden.garden && myGarden.garden.tileObjects) {
          const now = Date.now();
          Object.values(myGarden.garden.tileObjects).forEach((tile) => {
            if (tile.objectType === "plant" && tile.slots) {
              tile.slots.forEach((slot) => {
                if (
                  slot &&
                  slot.species &&
                  slot.endTime &&
                  now >= slot.endTime
                ) {
                  const multiplier = calculateMutationMultiplier(
                    slot.mutations,
                  );
                  const speciesVal = speciesValues[slot.species] || 0;
                  const scale = slot.targetScale || 1;
                  gardenValue += Math.round(
                    multiplier * speciesVal * scale * friendBonus,
                  );
                }
              });
            }
          });
        }

        return gardenValue;
      }

      updateAllValues(forceRefresh = false) {
        const tileValue = this.getTileValue(forceRefresh);
        const inventoryValue = this.getInventoryValue(forceRefresh);
        const gardenValue = this.getGardenValue(forceRefresh);

        // Store in UnifiedState
        UnifiedState.data.tileValue = tileValue;
        UnifiedState.data.inventoryValue = inventoryValue;
        UnifiedState.data.gardenValue = gardenValue;

        // Update UI if values tab is active
        this.updateValueDisplays();

        debugLog("VALUE_MANAGER", "All values updated", {
          tileValue,
          inventoryValue,
          gardenValue,
          cached: Object.keys(this.cache).map(
            (k) => `${k}: ${Date.now() - this.cache[k].lastUpdate}ms ago`,
          ),
        });

        return { tileValue, inventoryValue, gardenValue };
      }

      updateValueDisplays() {
        // Update main window if values tab is active
        if (UnifiedState.activeTab === "values") {
          updateTabContent();
        }

        // Update all overlay windows showing values tab
        UnifiedState.data.popouts.overlays.forEach((overlay, tabName) => {
          if (overlay && document.contains(overlay) && tabName === "values") {
            if (overlay.className.includes("mga-overlay-content-only")) {
              updatePureOverlayContent(overlay, tabName);
              debugLog("VALUE_MANAGER", "Updated pure values overlay");
            } else {
              // Legacy overlay structure
              const overlayContent = overlay.querySelector(
                ".mga-overlay-content > div",
              );
              if (overlayContent) {
                overlayContent.innerHTML = getValuesTabContent();
                debugLog("VALUE_MANAGER", "Updated legacy values overlay");
              }
            }
          }
        });

        // Update separate windows
        UnifiedState.data.popouts.windows.forEach((windowRef, tabName) => {
          if (windowRef && !windowRef.closed && tabName === "values") {
            try {
              const freshContent = getValuesTabContent();
              const contentElement =
                windowRef.document.getElementById("content");
              if (contentElement) {
                contentElement.innerHTML = freshContent;
                // Set up dashboard handlers in the separate window
                if (window.resourceDashboard) {
                  window.resourceDashboard.setupDashboardHandlers(
                    windowRef.document,
                  );
                }
                debugLog("VALUE_MANAGER", "Updated values in separate window");
              }
            } catch (error) {
              debugError(
                "VALUE_MANAGER",
                "Failed to update separate window",
                error,
              );
            }
          }
        });
      }

      invalidateCache() {
        Object.keys(this.cache).forEach((key) => {
          this.cache[key].lastUpdate = 0;
        });
      }

      getStatus() {
        const now = Date.now();
        return {
          cache: Object.keys(this.cache).reduce((acc, key) => {
            const cached = this.cache[key];
            acc[key] = {
              value: cached.value,
              age: now - cached.lastUpdate,
              fresh: now - cached.lastUpdate < this.throttleMs,
            };
            return acc;
          }, {}),
          throttleMs: this.throttleMs,
          retryAttempts: this.retryAttempts,
        };
      }

      destroy() {
        if (this.observer) {
          this.observer.disconnect();
          this.observer = null;
        }
      }
    }

    // Initialize global ValueManager
    let globalValueManager = null;

    function initializeValueManager() {
      if (!globalValueManager) {
        globalValueManager = new ValueManager();
      }
      return globalValueManager;
    }

    function updateValues() {
      // Use enhanced ValueManager instead of manual calculations
      const valueManager = globalValueManager || initializeValueManager();
      valueManager.updateAllValues();

      // Refresh Values tab if it's currently active
      if (UnifiedState.activeTab === "values") {
        updateTabContent();
      }

      // Refresh any open Values overlays
      UnifiedState.data.popouts.overlays.forEach((overlay, tabName) => {
        if (overlay && document.contains(overlay) && tabName === "values") {
          if (overlay.className.includes("mga-overlay-content-only")) {
            updatePureOverlayContent(overlay, tabName);
          }
        }
      });

      // Refresh Values in separate window popouts
      refreshSeparateWindowPopouts("values");

      debugLog("VALUES_UPDATE", "Values updated and UI refreshed");
    }

    // ==================== SEED DELETION ====================
    function deleteSelectedSeeds() {
      if (
        !UnifiedState.atoms.inventory ||
        !UnifiedState.atoms.inventory.items ||
        !UnifiedState.data.seedsToDelete.length
      ) {
        productionWarn("⚠️ No seeds selected for deletion!");
        return;
      }

      // Confirmation dialog for manual deletion
      const selectedSeedsText = UnifiedState.data.seedsToDelete.join(", ");
      const confirmMessage = `⚠️ WARNING: This action is IRREVERSIBLE!\n\nYou are about to permanently delete the following seeds:\n${selectedSeedsText}\n\nThis cannot be undone. Are you sure you want to continue?`;

      if (!confirm(confirmMessage)) {
        return;
      }

      // seedsToDelete now contains internal IDs (e.g., "OrangeTulip"), so direct comparison works
      productionLog("🌱 [SEED-DELETE-DEBUG] Deletion attempt:", {
        seedsToDelete: UnifiedState.data.seedsToDelete,
        inventoryItems:
          UnifiedState.atoms.inventory.items?.map((item) => ({
            species: item.species,
            quantity: item.quantity,
          })) || "No inventory",
        inventoryCount: UnifiedState.atoms.inventory.items?.length || 0,
      });

      const itemsToDelete = UnifiedState.atoms.inventory.items.filter(
        (item) =>
          item &&
          item.species &&
          UnifiedState.data.seedsToDelete.includes(item.species),
      );

      productionLog(
        "🌱 [SEED-DELETE-DEBUG] Items found for deletion:",
        itemsToDelete.map((item) => ({
          species: item.species,
          quantity: item.quantity,
        })),
      );

      if (!itemsToDelete.length) {
        productionLog(
          "🌱 [SEED-DELETE-DEBUG] No matching items found. Details:",
          {
            selectedSeeds: UnifiedState.data.seedsToDelete,
            availableSpecies:
              UnifiedState.atoms.inventory.items?.map((item) => item.species) ||
              [],
          },
        );
        productionWarn("⚠️ No matching seeds found in inventory!");
        return;
      }

      const summary = itemsToDelete
        .map((item) => `${item.species}: ${item.quantity}`)
        .join("\n");

      if (confirm(`Delete the following seeds?\n\n${summary}`)) {
        itemsToDelete.forEach((item) => {
          const qty = item.quantity || 0;
          for (let i = 0; i < qty; i++) {
            safeSendMessage({
              scopePath: ["Room", "Quinoa"],
              type: "Wish",
              itemId: item.species,
            });
          }
        });

        // Clear selections
        UnifiedState.data.seedsToDelete = [];

        // Clear checkboxes in main panel
        targetDocument
          .querySelectorAll(".seed-checkbox")
          .forEach((cb) => (cb.checked = false));

        // Update main tab content
        if (UnifiedState.activeTab === "seeds") {
          updateTabContent();
        }

        // Update all seed overlays
        UnifiedState.data.popouts.overlays.forEach((overlay, tabName) => {
          if (overlay && document.contains(overlay) && tabName === "seeds") {
            if (overlay.className.includes("mga-overlay-content-only")) {
              updatePureOverlayContent(overlay, tabName);
              // Also clear checkboxes in overlay
              overlay
                .querySelectorAll(".seed-checkbox")
                .forEach((cb) => (cb.checked = false));
              debugLog(
                "OVERLAY_LIFECYCLE",
                "Updated pure seeds overlay after deletion",
              );
            }
          }
        });

        // Update separate window popouts
        refreshSeparateWindowPopouts("seeds");
      }
    }

    function startAutoDelete() {
      if (!UnifiedState.data.autoDeleteEnabled) return;

      // Clear existing interval to prevent multiple intervals
      clearManagedInterval("autoDelete");

      // Use managed interval to prevent memory leaks
      setManagedInterval(
        "autoDelete",
        () => {
          if (
            UnifiedState.data.autoDeleteEnabled &&
            UnifiedState.data.seedsToDelete.length
          ) {
            const inventory = UnifiedState.atoms.inventory;
            if (!inventory || !inventory.items) return;

            // seedsToDelete now contains internal IDs (e.g., "OrangeTulip"), so direct comparison works
            UnifiedState.data.seedsToDelete.forEach((seedToDelete) => {
              const matchingItems = inventory.items.filter(
                (item) => item && item.species && item.species === seedToDelete,
              );

              matchingItems.forEach((item) => {
                const qty = item.quantity || 0;
                for (let i = 0; i < qty; i++) {
                  safeSendMessage({
                    scopePath: ["Room", "Quinoa"],
                    type: "Wish",
                    itemId: seedToDelete,
                  });
                }
              });
            });
          }
        },
        2000,
      );
    }

    function stopAutoDelete() {
      clearManagedInterval("autoDelete");
      UnifiedState.data.autoDeleteEnabled = false;
      debugLog("PERFORMANCE", "Auto-delete stopped and disabled");
    }

    // ==================== TIMERS ====================
    // ==================== ENHANCED TIMER MANAGER ====================
    class TimerManager {
      constructor() {
        this.activeTimers = new Map();
        this.isRunning = false;
        this.animationFrameId = null;
        this.lastHeartbeat = Date.now();
        this.heartbeatInterval = 1000; // 1 second heartbeat
        this.frozenThreshold = 3000; // 3 seconds to consider frozen

        // Initialize active timers storage
        if (!UnifiedState.data.activeTimers) {
          UnifiedState.data.activeTimers = {};
        }

        this.loadPersistedTimers();
        this.startHeartbeat();

        debugLog("TIMER_MANAGER", "TimerManager initialized", {
          heartbeatInterval: this.heartbeatInterval,
          frozenThreshold: this.frozenThreshold,
        });
      }

      startTimer(id, callback, interval = 1000) {
        if (this.activeTimers.has(id)) {
          this.stopTimer(id);
        }

        const timer = {
          id,
          callback,
          interval,
          lastRun: Date.now(),
          running: true,
          frozen: false,
        };

        this.activeTimers.set(id, timer);
        UnifiedState.data.activeTimers[id] = {
          interval,
          lastRun: timer.lastRun,
          running: true,
        };

        this.saveTimerState();

        if (!this.isRunning) {
          this.startMainLoop();
        }

        debugLog("TIMER_MANAGER", `Timer started: ${id}`, { interval });
        return timer;
      }

      stopTimer(id) {
        if (this.activeTimers.has(id)) {
          this.activeTimers.delete(id);
          delete UnifiedState.data.activeTimers[id];
          this.saveTimerState();
          debugLog("TIMER_MANAGER", `Timer stopped: ${id}`);
        }
      }

      pauseAll() {
        this.activeTimers.forEach((timer, id) => {
          timer.running = false;
          UnifiedState.data.activeTimers[id].running = false;
        });
        this.saveTimerState();
        debugLog("TIMER_MANAGER", "All timers paused");
      }

      resumeAll() {
        this.activeTimers.forEach((timer, id) => {
          timer.running = true;
          timer.lastRun = Date.now(); // Reset to prevent immediate execution
          UnifiedState.data.activeTimers[id].running = true;
          UnifiedState.data.activeTimers[id].lastRun = timer.lastRun;
        });
        this.saveTimerState();
        debugLog("TIMER_MANAGER", "All timers resumed");
      }

      startMainLoop() {
        if (this.isRunning) return;

        this.isRunning = true;
        const loop = (currentTime) => {
          if (!this.isRunning || this.activeTimers.size === 0) {
            this.isRunning = false;
            this.animationFrameId = null;
            return;
          }

          this.processTimers(currentTime);
          this.animationFrameId = requestAnimationFrame(loop);
        };

        this.animationFrameId = requestAnimationFrame(loop);
        debugLog("TIMER_MANAGER", "Main loop started");
      }

      processTimers(currentTime) {
        this.activeTimers.forEach((timer, id) => {
          if (!timer.running) return;

          const elapsed = currentTime - timer.lastRun;
          if (elapsed >= timer.interval) {
            try {
              timer.callback();
              timer.lastRun = currentTime;
              timer.frozen = false;
              UnifiedState.data.activeTimers[id].lastRun = timer.lastRun;
            } catch (error) {
              debugError(
                "TIMER_MANAGER",
                `Timer callback error for ${id}`,
                error,
              );
            }
          }
        });
      }

      startHeartbeat() {
        const heartbeat = () => {
          const now = Date.now();
          const timeSinceLastBeat = now - this.lastHeartbeat;

          // Detect if main loop is frozen
          if (this.isRunning && timeSinceLastBeat > this.frozenThreshold) {
            debugLog(
              "TIMER_MANAGER",
              "Heartbeat detected frozen timers, restarting main loop",
              {
                timeSinceLastBeat,
              },
            );
            this.restartMainLoop();
          }

          // Check individual timers for freezing
          this.checkForFrozenTimers(now);

          this.lastHeartbeat = now;
          setTimeout(heartbeat, this.heartbeatInterval);
        };

        // Start first heartbeat
        setTimeout(heartbeat, this.heartbeatInterval);
        debugLog("TIMER_MANAGER", "Heartbeat monitor started");
      }

      checkForFrozenTimers(now) {
        this.activeTimers.forEach((timer, id) => {
          if (!timer.running) return;

          const timeSinceLastRun = now - timer.lastRun;
          const expectedRuns = Math.floor(timeSinceLastRun / timer.interval);

          if (expectedRuns > 2 && !timer.frozen) {
            debugLog("TIMER_MANAGER", `Timer appears frozen: ${id}`, {
              timeSinceLastRun,
              expectedRuns,
              interval: timer.interval,
            });
            timer.frozen = true;
            this.restartTimer(id);
          }
        });
      }

      restartTimer(id) {
        const timer = this.activeTimers.get(id);
        if (timer) {
          timer.lastRun = Date.now();
          timer.frozen = false;
          debugLog("TIMER_MANAGER", `Timer restarted: ${id}`);
        }
      }

      restartMainLoop() {
        if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
          this.animationFrameId = null;
        }
        this.isRunning = false;
        setTimeout(() => this.startMainLoop(), 100); // Small delay before restart
      }

      saveTimerState() {
        try {
          MGA_saveJSON("MGA_timerStates", UnifiedState.data.activeTimers);
        } catch (error) {
          debugError("TIMER_MANAGER", "Failed to save timer state", error);
        }
      }

      loadPersistedTimers() {
        try {
          const saved = MGA_loadJSON("MGA_timerStates", {});
          UnifiedState.data.activeTimers = { ...saved };
          debugLog("TIMER_MANAGER", "Loaded persisted timer states", {
            count: Object.keys(saved).length,
          });
        } catch (error) {
          debugError("TIMER_MANAGER", "Failed to load persisted timers", error);
        }
      }

      getStatus() {
        return {
          isRunning: this.isRunning,
          activeCount: this.activeTimers.size,
          frozenCount: Array.from(this.activeTimers.values()).filter(
            (t) => t.frozen,
          ).length,
          lastHeartbeat: this.lastHeartbeat,
        };
      }
    }

    // Initialize global TimerManager
    let globalTimerManager = null;

    function initializeTimerManager() {
      if (!globalTimerManager) {
        globalTimerManager = new TimerManager();
      }
      return globalTimerManager;
    }

    function updateTimers() {
      // Update restock timers
      const quinoaData = UnifiedState.atoms.quinoaData;
      if (quinoaData && quinoaData.shops) {
        UnifiedState.data.timers.seed =
          (quinoaData.shops.seed &&
            quinoaData.shops.seed.secondsUntilRestock) ||
          null;
        UnifiedState.data.timers.egg =
          (quinoaData.shops.egg && quinoaData.shops.egg.secondsUntilRestock) ||
          null;
        UnifiedState.data.timers.tool =
          (quinoaData.shops.tool &&
            quinoaData.shops.tool.secondsUntilRestock) ||
          null;
      }

      // Calculate lunar event
      const lunarResult = getSecondsToNextLunarEvent();
      UnifiedState.data.timers.lunar = lunarResult.secondsLeft;

      // Note: checkForWatchedItems() now runs on its own 5-second interval

      // Always update timer display (needed for pop-out windows to work independently)
      updateTimerDisplay();
    }

    function getSecondsToNextLunarEvent() {
      const eventZone = "America/Chicago";
      const lunarHours = [3, 7, 11, 15, 19, 23];

      // Get current time in Central Time Zone
      const now = new Date();
      const centralTime = new Date(
        now.toLocaleString("en-US", { timeZone: eventZone }),
      );

      const currentHour = centralTime.getHours();
      const currentMin = centralTime.getMinutes();
      const currentSec = centralTime.getSeconds();

      // Find next lunar event hour
      let nextEventHour = null;
      for (const eventHour of lunarHours) {
        if (
          eventHour > currentHour ||
          (eventHour === currentHour && currentMin === 0 && currentSec === 0)
        ) {
          nextEventHour = eventHour;
          break;
        }
      }

      // If no event found today, get first event tomorrow
      if (nextEventHour === null) {
        nextEventHour = lunarHours[0];
      }

      // Create next event date in Central Time
      const nextEvent = new Date(centralTime);
      nextEvent.setHours(nextEventHour, 0, 0, 0);

      // If event is in the past today, move to tomorrow
      if (nextEvent <= centralTime) {
        nextEvent.setDate(nextEvent.getDate() + 1);
      }

      // Calculate seconds until event (precise calculation without manual adjustment)
      const secondsLeft = Math.max(
        0,
        Math.floor((nextEvent.getTime() - centralTime.getTime()) / 1000),
      );

      return {
        secondsLeft: secondsLeft, // Precise calculation without manual adjustment
        eventDateLocal: nextEvent,
      };
    }

    // PERFORMANCE OPTIMIZATION: Cache timer elements to avoid repeated DOM queries
    let cachedTimerElements = {
      "timer-seed": [],
      "timer-egg": [],
      "timer-tool": [],
      "timer-lunar": [],
    };
    let lastTimerElementCacheTime = 0;
    const TIMER_ELEMENT_CACHE_DURATION = 5000; // Refresh cache every 5 seconds

    function refreshTimerElementCache() {
      const timerIds = ["timer-seed", "timer-egg", "timer-tool", "timer-lunar"];

      timerIds.forEach((id) => {
        const elements = [];

        // Main window element
        const mainEl = document.getElementById(id);
        if (mainEl) elements.push(mainEl);

        // Overlay elements
        UnifiedState.data.popouts.overlays.forEach((overlay, tabName) => {
          if (overlay && document.contains(overlay)) {
            const overlayEl = overlay.querySelector(`#${id}`);
            if (overlayEl) elements.push(overlayEl);
          }
        });

        // Target document elements (for popouts)
        try {
          const targetEls = targetDocument.querySelectorAll(`#${id}`);
          targetEls.forEach((el) => {
            if (!elements.includes(el)) elements.push(el);
          });
        } catch (e) {
          // Ignore errors from closed windows
        }

        cachedTimerElements[id] = elements;
      });

      lastTimerElementCacheTime = Date.now();
    }

    function updateTimerDisplay() {
      const formatTime = (seconds) => {
        if (seconds == null) return "--:--";
        const s = Math.max(0, Math.floor(seconds));
        const m = Math.floor(s / 60);
        const ss = s % 60;
        return `${m}:${String(ss).padStart(2, "0")}`;
      };

      const formatTimeHoursMinutes = (seconds) => {
        if (seconds == null) return "--:--";
        const totalMinutes = Math.floor(seconds / 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours > 0) {
          return `${hours}h ${minutes}m`;
        } else {
          return `${minutes}m`;
        }
      };

      // BUGFIX: Initialize cache on first run or refresh if expired
      const now = Date.now();
      if (
        lastTimerElementCacheTime === 0 ||
        now - lastTimerElementCacheTime > TIMER_ELEMENT_CACHE_DURATION
      ) {
        refreshTimerElementCache();
      }

      // PERFORMANCE: Update cached elements only (no DOM queries in hot path)
      const updateTimerElement = (id, value) => {
        const formatter =
          id === "timer-lunar" ? formatTimeHoursMinutes : formatTime;
        const formattedValue = formatter(value);

        const elements = cachedTimerElements[id] || [];

        // FALLBACK: If cache is empty, query directly (first run before cache populated)
        if (elements.length === 0) {
          const el = document.getElementById(id);
          if (el) {
            el.textContent = formattedValue;
          }
          return;
        }

        elements.forEach((el) => {
          // Verify element still in DOM before updating
          if (document.contains(el)) {
            el.textContent = formattedValue;
          }
        });
      };

      // Update all timer types
      updateTimerElement("timer-seed", UnifiedState.data.timers.seed);
      updateTimerElement("timer-egg", UnifiedState.data.timers.egg);
      updateTimerElement("timer-tool", UnifiedState.data.timers.tool);
      updateTimerElement("timer-lunar", UnifiedState.data.timers.lunar);
    }

    // ==================== DEBUGGING UTILITIES ====================
    window.debugPets = function () {
      productionLog("🔍 [DEBUG] Debugging pets data...");
      productionLog(
        "🐾 UnifiedState.atoms.activePets:",
        UnifiedState.atoms.activePets,
      );
      productionLog("🐾 window.activePets:", window.activePets);

      // Try to access game's pet data directly
      if (targetWindow.MagicCircle_RoomConnection) {
        const roomState =
          targetWindow.MagicCircle_RoomConnection.lastRoomStateJsonable;
        productionLog("🎮 Room state pets:", roomState?.child?.data?.petSlots);
        productionLog("🎮 User slots:", roomState?.child?.data?.userSlots);
      }

      // Check jotai atoms
      if (targetWindow.jotaiAtomCache) {
        const allAtoms = Array.from(targetWindow.jotaiAtomCache.keys());
        const petAtoms = allAtoms.filter(
          (key) =>
            key.toLowerCase().includes("pet") ||
            key.toLowerCase().includes("slot") ||
            key.toLowerCase().includes("animal"),
        );
        productionLog("🔍 Pet-related atoms found:", petAtoms);
      }

      productionLog(
        "🏠 Presets saved:",
        Object.keys(UnifiedState.data.petPresets),
      );
    };

    // Manual fallback to force update Active Pets display
    window.forceUpdateActivePets = function () {
      productionLog("🔧 [MANUAL] Force updating Active Pets display...");

      // Try to get pets from room state as fallback
      if (targetWindow.MagicCircle_RoomConnection) {
        const roomState =
          targetWindow.MagicCircle_RoomConnection.lastRoomStateJsonable;
        const petSlots = roomState?.child?.data?.petSlots;

        if (petSlots && Array.isArray(petSlots)) {
          // Convert room state format to our expected format
          const activePetsFromRoom = petSlots
            .filter((slot) => slot && slot.item)
            .map((slot) => ({
              id: slot.item.id,
              petSpecies: slot.item.species || "Unknown",
              mutations: slot.item.mutations || [],
            }));

          productionLog(
            "🐾 [FALLBACK] Found pets in room state:",
            activePetsFromRoom,
          );

          // Manually set the active pets data
          UnifiedState.atoms.activePets = activePetsFromRoom;
          window.activePets = activePetsFromRoom;

          // Force update displays
          updateActivePetsDisplay(document);
          UnifiedState.data.popouts.overlays.forEach((overlay, tabName) => {
            if (overlay && document.contains(overlay) && tabName === "pets") {
              updateActivePetsDisplay(overlay);
            }
          });

          productionLog("✅ [FALLBACK] Active pets display updated manually");
          return activePetsFromRoom;
        }
      }

      productionWarn("❌ [FALLBACK] Could not find pet data in room state");
      return null;
    };

    // ==================== INITIALIZATION ====================
    function initializeAtoms() {
      productionLog("🔗 [SIMPLE-ATOMS] Starting simple atom initialization...");

      // Start simple pet detection using room state
      productionLog("🐾 [SIMPLE-ATOMS] Setting up room state pet detection...");
      updateActivePetsFromRoomState(); // Get initial pets immediately

      // Set up periodic pet detection (reduced frequency to minimize console spam)
      setManagedInterval(
        "petDetection",
        () => {
          updateActivePetsFromRoomState();

          // ALSO check window.activePets directly (set by atom hook)
          if (
            window.activePets &&
            Array.isArray(window.activePets) &&
            window.activePets.length > 0
          ) {
            productionLog(
              "🐾 [PERIODIC-CHECK] Found pets in window.activePets:",
              window.activePets,
            );

            // Update UnifiedState
            if (
              !UnifiedState.atoms.activePets ||
              UnifiedState.atoms.activePets.length !== window.activePets.length
            ) {
              UnifiedState.atoms.activePets = window.activePets;

              // Force UI update
              if (UnifiedState.activeTab === "pets") {
                const context = document.getElementById("mga-tab-content");
                if (context) {
                  updateTabContent("pets", context);
                }
              }
            }
          }
        },
        30000,
      ); // Check every 30 seconds

      // Hook #1: Pet SPECIES data (for active pets display)
      hookAtom(
        "/home/runner/work/magiccircle.gg/magiccircle.gg/client/src/games/Quinoa/atoms/myAtoms.ts/myPrimitivePetSlotsAtom",
        "activePets",
        (petSlots) => {
          if (UnifiedState.data.settings?.debugMode) {
            productionLog("🐾 [ATOM-DEBUG] myPetSlotsAtom raw value:", {
              value: petSlots,
              type: typeof petSlots,
              isArray: Array.isArray(petSlots),
              length: petSlots?.length,
              valueIsArray: Array.isArray(petSlots?.value),
              valueLength: petSlots?.value?.length,
            });
          }

          // Extract the actual array from the wrapper object
          const actualPetSlots = Array.isArray(petSlots)
            ? petSlots
            : petSlots?.value;

          // Extract active pets with species info
          if (Array.isArray(actualPetSlots)) {
            // DEBUG: Log raw slot data to understand structure
            if (UnifiedState.data.settings?.debugMode) {
              actualPetSlots.forEach((slot, i) => {});
            }

            const activePets = actualPetSlots
              .filter((slot) => {
                // Check if slot has pet data (handle multiple possible property names)
                const hasPet =
                  slot &&
                  (slot.petSpecies || slot.species || slot.petId || slot.id);
                return hasPet;
              })
              .map((slot, index) => {
                const extracted = {
                  id: slot.id || slot.petId || `pet_${index}`,
                  petSpecies: slot.petSpecies || slot.species || "Unknown",
                  mutations: slot.mutations || [],
                  abilities: slot.abilities || [],
                  hunger: slot.hunger ?? slot.petHunger ?? slot.health ?? 100, // Include hunger for pet hunger notifications
                  xp: slot.xp || 0, // CRITICAL: Required for turtle timer experience calculation
                  targetScale: slot.targetScale || slot.scale || 1, // CRITICAL: Required for turtle timer scale bonus calculation
                  strength: slot.strength || slot.str || 100, // Include strength for Hunger Boost calculations
                  str: slot.str || slot.strength || 100, // Fallback property name
                  slot: index + 1,
                };

                if (UnifiedState.data.settings?.debugMode) {
                }

                return extracted;
              });

            if (UnifiedState.data.settings?.debugMode) {
              productionLog("🐾 [PETS] Extracted active pets:", activePets);
            }

            const previousCount = UnifiedState.atoms.activePets?.length || 0;
            const previousPets = UnifiedState.atoms.activePets || [];

            // Check if pets changed (count OR species/abilities)
            const petsChanged =
              activePets.length !== previousCount ||
              JSON.stringify(
                activePets.map((p) => ({ s: p.petSpecies, a: p.abilities })),
              ) !==
                JSON.stringify(
                  previousPets.map((p) => ({
                    s: p.petSpecies,
                    a: p.abilities,
                  })),
                );

            if (petsChanged) {
              try {
                // 1. Establish a safe document reference
                const activeDoc =
                  (typeof targetDocument !== "undefined" && targetDocument) ||
                  document;

                // Safety check: if the document isn't initialized or accessible, skip this cycle
                if (!activeDoc || !activeDoc.body) return;

                // 2. Update UI if pets tab is active
                if (UnifiedState.activeTab === "pets") {
                  const context = activeDoc.getElementById("mga-tab-content");
                  if (
                    context &&
                    typeof updateActivePetsDisplay === "function"
                  ) {
                    try {
                      updateActivePetsDisplay(context);
                    } catch (e) {
                      /* Firefox often fails here if the element is being re-rendered */
                    }
                  }
                }

                // 3. Update all pet overlays with "Dead Object" protection
                if (UnifiedState.data?.popouts?.overlays) {
                  UnifiedState.data.popouts.overlays.forEach(
                    (overlay, tabName) => {
                      try {
                        // In Firefox, accessing properties on a 'dead' overlay element throws NS_ERROR
                        if (
                          overlay &&
                          tabName === "pets" &&
                          activeDoc.contains(overlay)
                        ) {
                          updateActivePetsDisplay(overlay);
                        }
                      } catch (e) {
                        // Ignore errors for specific overlays that might have been closed/destroyed
                      }
                    },
                  );
                }

                // 4. TURTLE TIMER: Safe removal
                try {
                  const elements = activeDoc.querySelectorAll(
                    '[data-turtletimer-estimate="true"], [data-turtletimer-slot-value="true"]',
                  );
                  elements.forEach((el) => {
                    try {
                      el.remove();
                    } catch (e) {
                      /* element might already be gone */
                    }
                  });
                } catch (e) {
                  // querySelectorAll can fail in backgrounded Firefox tabs
                }

                // 5. Hardened Async Update
                // We wrap the entire timeout chain to ensure it doesn't crash if the tab is closed/hidden
                setTimeout(() => {
                  try {
                    // Double check if context still exists before requesting frame
                    if (typeof insertTurtleEstimate === "function") {
                      requestAnimationFrame(() => {
                        try {
                          // Final check: is the document still 'alive'?
                          const finalDoc =
                            (typeof targetDocument !== "undefined" &&
                              targetDocument) ||
                            document;
                          if (finalDoc && finalDoc.body) {
                            insertTurtleEstimate();
                          }
                        } catch (e) {
                          // Silently exit if window context died during the frame request
                        }
                      });
                    }
                  } catch (e) {
                    // Catch-all for "Component not initialized" in the timeout
                  }
                }, 150);
              } catch (globalErr) {
                // This catches the "NS_ERROR_NOT_INITIALIZED" if everything fails
                // productionLog("Pets update skipped: Tab context currently unavailable");
              }
            }

            // CRITICAL: Return the extracted array so hookAtom stores it correctly
            if (UnifiedState.data.settings?.debugMode) {
              productionLog(
                "🔄 [RENDER-CYCLE] Atom callback returning pets to hookAtom system:",
                {
                  petsCount: activePets.length,
                  petsList: activePets.map((p) => p.petSpecies),
                  willUpdateUnifiedState: true,
                  willUpdateWindowActivePets: true,
                },
              );
            }
            return activePets;
          } else {
            if (UnifiedState.data.settings?.debugMode) {
              productionLog(
                "🐾 [EXTRACTION-ERROR] actualPetSlots is not an array:",
                actualPetSlots,
              );
            }
            return [];
          }
        },
      );

      // Hook #2: Pet ABILITY data (for ability logs - event-driven + polling)
      hookAtom(
        "/home/runner/work/magiccircle.gg/magiccircle.gg/client/src/games/Quinoa/atoms/myAtoms.ts/myPetSlotInfosAtom",
        "petAbility",
        (value) => {
          // BUGFIX v3.7.8: Event-driven monitoring to catch abilities immediately
          // Polling still runs every 3s as backup for missed events
          if (value && typeof monitorPetAbilities === "function") {
            monitorPetAbilities();
          }
        },
      );

      // Hook inventory
      hookAtom(
        "/home/runner/work/magiccircle.gg/magiccircle.gg/client/src/games/Quinoa/atoms/inventoryAtoms.ts/myInventoryAtom",
        "inventory",
        () => updateValues(),
      );

      // Hook crop data
      hookAtom(
        "/home/runner/work/magiccircle.gg/magiccircle.gg/client/src/games/Quinoa/atoms/myAtoms.ts/myCurrentGrowSlotsAtom",
        "currentCrop",
        () => updateValues(),
      );

      // Hook friend bonus from game (same as Slot,Inv,Garden script)
      hookAtom(
        "/home/runner/work/magiccircle.gg/magiccircle.gg/client/src/games/Quinoa/atoms/miscAtoms.ts/friendBonusMultiplierAtom",
        "friendBonus",
        (value) => {
          UnifiedState.atoms.friendBonus = value || 1;
          targetWindow.friendBonus = value; // Also needed for harvest/sell protection
          updateValues();
        },
      );

      // Hook garden data AND myData for auto-favorite
      hookAtom(
        "/home/runner/work/magiccircle.gg/magiccircle.gg/client/src/games/Quinoa/atoms/baseAtoms.ts/myUserSlotAtom",
        "myGarden",
        (value) => {
          targetWindow.myGarden = value?.data || value; // Extract .data property (has garden, inventory, petSlots)
          targetWindow.myData = value?.data || value; // Extract .data property for feed buttons & auto-favorite
          updateValues();
        },
      );

      // Hook quinoa data for timers and globalShop
      hookAtom(
        "/home/runner/work/magiccircle.gg/magiccircle.gg/client/src/games/Quinoa/atoms/baseAtoms.ts/quinoaDataAtom",
        "quinoaData",
        (value) => {
          // Store quinoa data for timers
          UnifiedState.atoms.quinoaData = value;
          // Also make globalShop available for notifications
          targetWindow.globalShop = value;
          // Update timers
          updateTimers();
        },
      );

      // Hook shopsAtom for real-time shop data (all 4 shops in one atom)
      hookAtom(
        "/home/runner/work/magiccircle.gg/magiccircle.gg/client/src/games/Quinoa/atoms/baseAtoms.ts/shopsAtom",
        "shops",
        (value) => {
          // value contains all 4 shops: { seed: {...}, egg: {...}, tool: {...}, decor: {...} }
          if (!targetWindow.globalShop) targetWindow.globalShop = {};
          targetWindow.globalShop.shops = value;

          // CRITICAL: Also update quinoaData.shops for timers
          if (!UnifiedState.atoms.quinoaData)
            UnifiedState.atoms.quinoaData = {};
          UnifiedState.atoms.quinoaData.shops = value;

          // Update timers when shop data changes
          updateTimers();

          // Trigger shop UI refresh if open
          if (typeof targetWindow.refreshAllShopWindows === "function") {
            targetWindow.refreshAllShopWindows();
          }
        },
      );

      productionLog(
        "✅ [SIMPLE-ATOMS] Simple atom initialization complete (including shopsAtom)",
      );

      // Capture Jotai store for fresh data queries
      setTimeout(() => {
        const store = captureJotaiStore();
        if (store) {
          productionLog("✅ [STORE] Jotai store captured successfully");
        } else {
          productionWarn(
            "⚠️ [STORE] Could not capture Jotai store, will retry on demand",
          );
        }
      }, 1000); // Wait 1 second for React to mount

      // CRITICAL: Check if window.activePets already exists after hooks are set up
      setTimeout(() => {
        if (
          window.activePets &&
          Array.isArray(window.activePets) &&
          window.activePets.length > 0
        ) {
          productionLog(
            "🐾 [INIT-CHECK] Found existing pets in window.activePets after hook setup:",
            window.activePets,
          );
          UnifiedState.atoms.activePets = window.activePets;

          // Force UI update if on pets tab
          if (UnifiedState.activeTab === "pets") {
            const context = document.getElementById("mga-tab-content");
            if (context) {
              updateTabContent("pets", context);
            }
          }
        } else {
          productionLog(
            "🐾 [INIT-CHECK] No pets found in window.activePets yet",
          );
        }
      }, 2000); // Wait 2 seconds for atoms to populate
    }

    // ==================== AUTO-FAVORITE SYSTEM ====================
    (function initAutoFavorite() {
      let lastInventoryCount = 0;

      // PERFORMANCE OPTIMIZATION: Increased interval from 500ms to 2000ms
      // Still responsive for new items, but 4x less CPU usage
      setInterval(() => {
        // Early exit if auto-favorite is disabled or no watched items
        if (!UnifiedState.data.settings.autoFavorite.enabled) {
          return;
        }

        const watchedSpecies =
          UnifiedState.data.settings.autoFavorite.species || [];
        const watchedMutations =
          UnifiedState.data.settings.autoFavorite.mutations || [];

        // Skip processing if nothing is being watched
        if (watchedSpecies.length === 0 && watchedMutations.length === 0) {
          return;
        }

        if (!targetWindow.myData?.inventory?.items) {
          return;
        }

        const currentCount = targetWindow.myData.inventory.items.length;
        // Only process if inventory count increased (new items added)
        if (currentCount > lastInventoryCount) {
          checkAndFavoriteNewItems(targetWindow.myData.inventory);
        }
        lastInventoryCount = currentCount;
      }, 2000); // OPTIMIZED: Every 2 seconds (was 500ms)

      function checkAndFavoriteNewItems(inventory) {
        if (!inventory?.items) return;

        // DEFENSIVE: Ensure petAbilities array exists (v2.0.0 fix for upgrade path)
        if (!UnifiedState.data.settings.autoFavorite.petAbilities) {
          UnifiedState.data.settings.autoFavorite.petAbilities = [];
        }

        if (
          !UnifiedState.data.settings.autoFavorite.species.length &&
          !UnifiedState.data.settings.autoFavorite.mutations.length &&
          !UnifiedState.data.settings.autoFavorite.petAbilities.length
        )
          return;

        const favoritedIds = new Set(inventory.favoritedItemIds || []);
        const targetSpecies = new Set(
          UnifiedState.data.settings.autoFavorite.species,
        );
        const targetMutations = new Set(
          UnifiedState.data.settings.autoFavorite.mutations,
        );
        const targetPetAbilities = new Set(
          UnifiedState.data.settings.autoFavorite.petAbilities,
        );
        let cropCount = 0;
        let petCount = 0;

        for (const item of inventory.items) {
          if (favoritedIds.has(item.id)) continue; // Already favorited

          // Check if it's a pet
          if (item.itemType === "Pet") {
            // Check pet mutations for Gold or Rainbow
            const petMutations = item.mutations || [];
            const hasGoldMutation = petMutations.includes("Gold");
            const hasRainbowMutation = petMutations.includes("Rainbow");

            // ALSO check abilities array for granter abilities
            const petAbilities = item.abilities || [];
            const hasGoldGranterAbility = petAbilities.some((a) => {
              const abilityStr =
                typeof a === "string" ? a : a?.type || a?.abilityType || "";
              return (
                abilityStr.toLowerCase().includes("gold") &&
                abilityStr.toLowerCase().includes("grant")
              );
            });
            const hasRainbowGranterAbility = petAbilities.some((a) => {
              const abilityStr =
                typeof a === "string" ? a : a?.type || a?.abilityType || "";
              return (
                abilityStr.toLowerCase().includes("rainbow") &&
                abilityStr.toLowerCase().includes("grant")
              );
            });

            const shouldFavorite =
              (targetPetAbilities.has("Gold Granter") &&
                (hasGoldMutation || hasGoldGranterAbility)) ||
              (targetPetAbilities.has("Rainbow Granter") &&
                (hasRainbowMutation || hasRainbowGranterAbility));

            if (shouldFavorite) {
              if (targetWindow.MagicCircle_RoomConnection?.sendMessage) {
                targetWindow.MagicCircle_RoomConnection.sendMessage({
                  scopePath: ["Room", "Quinoa"],
                  type: "ToggleFavoriteItem",
                  itemId: item.id,
                });
                petCount++;
              }
            }
            continue; // Skip to next item
          }

          // Only auto-favorite crops beyond this point
          if (item.itemType !== "Produce") continue;

          // CRITICAL: Explicitly exclude eggs and tools - CROPS ONLY
          if (item.itemType === "Egg" || item.itemType === "Tool") continue;
          if (item.category === "Egg" || item.category === "Tool") continue;
          if (
            item.species &&
            (item.species.includes("Pet") || item.species.includes("Egg"))
          )
            continue;

          // Check if item matches species
          const matchesSpecies = targetSpecies.has(item.species);

          // Check if item matches any mutation
          const itemMutations = item.mutations || [];
          const matchesMutation = itemMutations.some((mut) =>
            targetMutations.has(mut),
          );

          if (matchesSpecies || matchesMutation) {
            // Send favorite command
            if (targetWindow.MagicCircle_RoomConnection?.sendMessage) {
              targetWindow.MagicCircle_RoomConnection.sendMessage({
                scopePath: ["Room", "Quinoa"],
                type: "ToggleFavoriteItem",
                itemId: item.id,
              });
              cropCount++;
            }
          }
        }

        if (cropCount > 0) {
          productionLog(
            `🌟 [AUTO-FAVORITE] Auto-favorited ${cropCount} new crops`,
          );
        }
        if (petCount > 0) {
          productionLog(
            `🌟 [AUTO-FAVORITE] Auto-favorited ${petCount} new pets`,
          );
        }
      }

      // Function to favorite ALL items of a species (called when checkbox is checked)
      targetWindow.favoriteSpecies = function (speciesName) {
        if (!targetWindow.myData?.inventory?.items) {
          productionLog(
            "🌟 [AUTO-FAVORITE] No myData available yet - waiting for game to load",
          );
          return;
        }

        const items = targetWindow.myData.inventory.items;
        const favoritedIds = new Set(
          targetWindow.myData.inventory.favoritedItemIds || [],
        );
        let count = 0;

        for (const item of items) {
          // CRITICAL: Multiple checks to ensure ONLY crops are favorited
          if (item.itemType !== "Produce") continue;
          if (
            item.itemType === "Pet" ||
            item.itemType === "Egg" ||
            item.itemType === "Tool"
          )
            continue;
          if (
            item.category === "Pet" ||
            item.category === "Egg" ||
            item.category === "Tool"
          )
            continue;
          if (
            item.species &&
            (item.species.includes("Pet") || item.species.includes("Egg"))
          )
            continue;

          if (item.species === speciesName && !favoritedIds.has(item.id)) {
            if (targetWindow.MagicCircle_RoomConnection?.sendMessage) {
              targetWindow.MagicCircle_RoomConnection.sendMessage({
                scopePath: ["Room", "Quinoa"],
                type: "ToggleFavoriteItem",
                itemId: item.id,
              });
              count++;
            }
          }
        }

        if (count > 0) {
          productionLog(
            `✅ [AUTO-FAVORITE] Favorited ${count} ${speciesName} crops`,
          );
        } else {
          productionLog(
            `ℹ️ [AUTO-FAVORITE] No ${speciesName} crops to favorite (already favorited or none in inventory)`,
          );
        }
      };

      // DISABLED: Script never unfavorites - only adds favorites
      targetWindow.unfavoriteSpecies = function (speciesName) {
        productionLog(
          `🔒 [AUTO-FAVORITE] Checkbox unchecked for ${speciesName} - Auto-favorite disabled, but existing favorites are preserved (script never removes favorites)`,
        );
        // Do nothing - script only adds favorites, never removes them
        // This protects user's manually-favorited items (pets, eggs, crops, etc.)
      };

      // Function to favorite ALL items with a specific mutation (called when mutation checkbox is checked)
      targetWindow.favoriteMutation = function (mutationName) {
        if (!targetWindow.myData?.inventory?.items) {
          productionLog(
            "🌟 [AUTO-FAVORITE] No myData available yet - waiting for game to load",
          );
          return;
        }

        const items = targetWindow.myData.inventory.items;
        const favoritedIds = new Set(
          targetWindow.myData.inventory.favoritedItemIds || [],
        );
        let count = 0;

        for (const item of items) {
          // CRITICAL: Multiple checks to ensure ONLY crops are favorited
          if (item.itemType !== "Produce") continue;
          if (
            item.itemType === "Pet" ||
            item.itemType === "Egg" ||
            item.itemType === "Tool"
          )
            continue;
          if (
            item.category === "Pet" ||
            item.category === "Egg" ||
            item.category === "Tool"
          )
            continue;
          if (
            item.species &&
            (item.species.includes("Pet") || item.species.includes("Egg"))
          )
            continue;

          const itemMutations = item.mutations || [];
          if (
            itemMutations.includes(mutationName) &&
            !favoritedIds.has(item.id)
          ) {
            if (targetWindow.MagicCircle_RoomConnection?.sendMessage) {
              targetWindow.MagicCircle_RoomConnection.sendMessage({
                scopePath: ["Room", "Quinoa"],
                type: "ToggleFavoriteItem",
                itemId: item.id,
              });
              count++;
            }
          }
        }

        if (count > 0) {
          productionLog(
            `✅ [AUTO-FAVORITE] Favorited ${count} crops with ${mutationName} mutation`,
          );
        } else {
          productionLog(
            `ℹ️ [AUTO-FAVORITE] No crops with ${mutationName} mutation to favorite (already favorited or none in inventory)`,
          );
        }
      };

      // DISABLED: Script never unfavorites - only adds favorites
      targetWindow.unfavoriteMutation = function (mutationName) {
        productionLog(
          `🔒 [AUTO-FAVORITE] Checkbox unchecked for ${mutationName} mutation - Auto-favorite disabled, but existing favorites are preserved (script never removes favorites)`,
        );
        // Do nothing - script only adds favorites, never removes them
        // This protects user's manually-favorited items (pets, eggs, crops, etc.)
      };

      // Favorite ALL pets with a specific ability (called when checkbox is checked)
      targetWindow.favoritePetAbility = function (abilityName) {
        if (!targetWindow.myData?.inventory?.items) {
          productionLog(
            "🌟 [AUTO-FAVORITE-PET] No myData available yet - waiting for game to load",
          );
          return;
        }

        productionLog(
          `🔍 [AUTO-FAVORITE-PET] Searching for pets with ${abilityName}...`,
        );

        const items = targetWindow.myData.inventory.items;
        const favoritedIds = new Set(
          targetWindow.myData.inventory.favoritedItemIds || [],
        );
        let count = 0;
        let petsChecked = 0;

        // Debug: Log first pet structure to understand data format
        const firstPet = items.find((i) => i.itemType === "Pet");
        if (firstPet) {
          productionLog("🐾 [AUTO-FAVORITE-PET-DEBUG] Sample pet structure:", {
            species: firstPet.petSpecies,
            mutations: firstPet.mutations,
            abilities: firstPet.abilities,
            hasAbilitiesArray: Array.isArray(firstPet.abilities),
            hasMutationsArray: Array.isArray(firstPet.mutations),
          });
        }

        for (const item of items) {
          if (item.itemType !== "Pet") continue;
          petsChecked++;

          if (favoritedIds.has(item.id)) continue; // Already favorited

          // Check pet mutations for Gold or Rainbow
          const petMutations = item.mutations || [];
          const hasGoldMutation = petMutations.includes("Gold");
          const hasRainbowMutation = petMutations.includes("Rainbow");

          // ALSO check abilities array for granter abilities
          const petAbilities = item.abilities || [];
          const hasGoldGranterAbility = petAbilities.some((a) => {
            const abilityStr =
              typeof a === "string" ? a : a?.type || a?.abilityType || "";
            return (
              abilityStr.toLowerCase().includes("gold") &&
              abilityStr.toLowerCase().includes("grant")
            );
          });
          const hasRainbowGranterAbility = petAbilities.some((a) => {
            const abilityStr =
              typeof a === "string" ? a : a?.type || a?.abilityType || "";
            return (
              abilityStr.toLowerCase().includes("rainbow") &&
              abilityStr.toLowerCase().includes("grant")
            );
          });

          const shouldFavorite =
            (abilityName === "Gold Granter" &&
              (hasGoldMutation || hasGoldGranterAbility)) ||
            (abilityName === "Rainbow Granter" &&
              (hasRainbowMutation || hasRainbowGranterAbility));

          if (shouldFavorite) {
            productionLog(
              `✨ [AUTO-FAVORITE-PET] Found matching pet: ${item.petSpecies} (${item.id}) - mutations: [${petMutations.join(", ")}], abilities: ${petAbilities.length}`,
            );

            if (targetWindow.MagicCircle_RoomConnection?.sendMessage) {
              targetWindow.MagicCircle_RoomConnection.sendMessage({
                scopePath: ["Room", "Quinoa"],
                type: "ToggleFavoriteItem",
                itemId: item.id,
              });
              count++;
            }
          }
        }

        productionLog(
          `✅ [AUTO-FAVORITE-PET] Scanned ${petsChecked} pets, favorited ${count} with ${abilityName}`,
        );
      };

      // DISABLED: Script never unfavorites - only adds favorites
      targetWindow.unfavoritePetAbility = function (abilityName) {
        productionLog(
          `🔒 [AUTO-FAVORITE-PET] Checkbox unchecked for ${abilityName} - Auto-favorite disabled, but existing favorites are preserved (script never removes favorites)`,
        );
        // Do nothing - script only adds favorites, never removes them
      };

      productionLog(
        "🌟 [AUTO-FAVORITE] System initialized - monitoring inventory changes",
      );
    })();

    // ==================== TURTLE TIMER (CROP GROWTH BOOST II) ====================
    // Calculates expected crop growth time with Turtle's Plant Growth Boost II ability

    function getCropHash(crop) {
      try {
        return JSON.stringify(crop);
      } catch (e) {
        return "__ref_changed__" + Date.now();
      }
    }

    function getTurtleExpectations(activePets) {
      // Debug: Only log when debug mode is enabled
      if (UnifiedState.data.settings?.debugMode) {
        logDebug("TURTLE", "Checking active pets:", {
          petsCount: activePets?.length || 0,
          pets: (activePets || []).map((p) => ({
            species: p?.petSpecies,
            hunger: p?.hunger,
            abilities: p?.abilities,
          })),
        });
      }

      const turtles = (activePets || []).filter(
        (p) =>
          p &&
          p.petSpecies === "Turtle" &&
          p.hunger > 0 &&
          p.abilities?.some(
            (a) =>
              a === "Plant Growth Boost II" ||
              a === "PlantGrowthBoostII" ||
              a === "Plant Growth Boost 2" ||
              (typeof a === "string" &&
                a.toLowerCase().includes("plant") &&
                a.toLowerCase().includes("growth") &&
                (a.includes("II") || a.includes("2"))),
          ),
      );

      if (UnifiedState.data.settings?.debugMode) {
        logDebug("TURTLE", "Filtered turtles:", {
          turtleCount: turtles.length,
          turtles: turtles.map((t) => ({
            species: t.petSpecies,
            hunger: t.hunger,
            abilities: t.abilities,
            xp: t.xp,
            targetScale: t.targetScale,
          })),
        });
      }

      let expectedMinutesRemoved = 0;

      turtles.forEach((p) => {
        const xpComponent = Math.min(
          Math.floor(((p.xp || 0) / (100 * 3600)) * 30),
          30,
        );
        const scaleComponent =
          Math.floor((((p.targetScale || 1) - 1) / (2.5 - 1)) * 20 + 80) - 30;
        const base = xpComponent + scaleComponent;
        const minutesRemoved =
          (base / 100) *
          5 *
          60 *
          (1 - Math.pow(1 - (0.27 * base) / 100, 1 / 60));

        if (UnifiedState.data.settings?.debugMode) {
          logDebug("TURTLE", "Turtle calculation:", {
            xp: p.xp,
            targetScale: p.targetScale,
            xpComponent,
            scaleComponent,
            base,
            minutesRemoved,
          });
        }

        expectedMinutesRemoved += minutesRemoved;
      });

      if (UnifiedState.data.settings?.debugMode) {
        logDebug(
          "TURTLE",
          "Total expected minutes removed:",
          expectedMinutesRemoved,
        );
      }

      return {
        expectedMinutesRemoved,
      };
    }

    function estimateUntilLatestCrop(
      currentCrop,
      activePets,
      slotIndex = null,
    ) {
      try {
        if (!currentCrop || currentCrop.length === 0) return null;
        if (!activePets || activePets.length === 0) return null;

        const turtleExpectations = getTurtleExpectations(activePets);
        if (
          !turtleExpectations ||
          turtleExpectations.expectedMinutesRemoved === 0
        ) {
          return null;
        }

        const now = Date.now();

        // If slotIndex provided and valid, use that slot's endTime
        // Otherwise use the latest crop's endTime
        let targetEndTime;
        if (
          slotIndex !== null &&
          slotIndex >= 0 &&
          slotIndex < currentCrop.length
        ) {
          targetEndTime = currentCrop[slotIndex]?.endTime || 0;
        } else {
          targetEndTime = Math.max(...currentCrop.map((c) => c.endTime || 0));
        }

        if (targetEndTime <= now) return null; // Crop already mature

        const remainingRealMinutes = (targetEndTime - now) / (1000 * 60);
        const { expectedMinutesRemoved } = turtleExpectations;
        const effectiveRate = expectedMinutesRemoved + 1;
        const expectedRealMinutes = remainingRealMinutes / effectiveRate;

        const hours = Math.floor(expectedRealMinutes / 60);
        const minutes = Math.floor(expectedRealMinutes % 60);

        return `${hours}h ${minutes}m`;
      } catch (error) {
        logError("TURTLE", "ERROR in estimateUntilLatestCrop:", error);
        return null;
      }
    }

    // REPLACE the entire existing insertTurtleEstimate function with this complete robust version:
    // ---------- FULL REPLACEMENT: insertTurtleEstimate() ----------

    // ---------- REPLACEMENT: insertTurtleEstimate() with spatial matching ----------

    // ==================== GENERIC ABILITY EXPECTATIONS ====================
    function getAbilityExpectations(
      activePets,
      abilityName,
      minutesPerBase = 5,
      odds = 0.27,
    ) {
      const pets = (activePets || []).filter(
        (p) => p && p.hunger > 0 && p.abilities?.some((a) => a === abilityName),
      );

      let expectedMinutesRemoved = 0;

      pets.forEach((p) => {
        const base =
          Math.min(Math.floor(((p.xp || 0) / (100 * 3600)) * 30), 30) +
          Math.floor((((p.targetScale || 1) - 1) / (2.5 - 1)) * 20 + 80) -
          30;

        expectedMinutesRemoved +=
          (base / 100) *
          minutesPerBase *
          60 *
          (1 - Math.pow(1 - (odds * base) / 100, 1 / 60));
      });

      return {
        expectedMinutesRemoved,
      };
    }

    function getEggExpectations(activePets) {
      return getAbilityExpectations(activePets, "EggGrowthBoostII", 10, 0.24);
    }

    function getGrowthExpectations(activePets) {
      return getAbilityExpectations(activePets, "PlantGrowthBoostII", 5, 0.27);
    }

    // BUGFIX: Validate tooltip element position to prevent top-left corner misplacement
    // PERFORMANCE: Silent validation - no console spam unless debug mode enabled
    function isValidTooltipElement(element) {
      if (!element) return false;

      try {
        const rect = element.getBoundingClientRect();

        // Reject if element is in top-left corner (likely UI element, not tooltip)
        // Tooltips should be centered or follow cursor, never stuck at 0,0
        if (rect.top < 50 && rect.left < 50) {
          return false; // Silent rejection
        }

        // Reject if element is too small (likely not a tooltip container)
        if (rect.width < 50 || rect.height < 30) {
          return false; // Silent rejection
        }

        // Reject if element is off-screen
        const doc = targetDocument || document;
        const viewportWidth =
          window.innerWidth || doc.documentElement.clientWidth;
        const viewportHeight =
          window.innerHeight || doc.documentElement.clientHeight;

        if (
          rect.right < 0 ||
          rect.bottom < 0 ||
          rect.left > viewportWidth ||
          rect.top > viewportHeight
        ) {
          return false; // Silent rejection
        }

        // Additional check: Element should contain text (tooltips always have content)
        const hasText =
          element.textContent && element.textContent.trim().length > 0;
        if (!hasText) {
          return false; // Silent rejection
        }

        // Passed all validation checks
        return true;
      } catch (e) {
        // Only log errors, not validation failures
        if (UnifiedState?.data?.settings?.debugMode) {
          console.error("[CROP-VALUE] ❌ Error validating tooltip element:", e);
        }
        return false;
      }
    }

    function insertTurtleEstimate() {
      const doc = targetDocument || document;
      const ROOT_SEL = ".McFlex.css-fsggty";
      const INNER_SEL =
        ".McFlex.css-1omaybc, .McFlex.css-1c3sifn, .McFlex.css-11dqzw, .McFlex.css-1l3zq7";
      const MARKER_VALUE = "tm-crop-price-value";
      const MARKER_TURTLE = "tm-turtle-timer";

      // Get current crop/egg data from atoms
      let currentCrop =
        targetWindow.currentCrop || UnifiedState.atoms.currentCrop;
      const currentEgg =
        targetWindow.currentEgg || UnifiedState.atoms.currentEgg;

      //Remove old Span if no current crop
      if (!currentCrop) {
        const span = document
          .getElementsByClassName("tm-crop-price-value")
          .item(0);
        if (span != null) span.remove();
      }

      if (!currentCrop && !currentEgg) {
        return; // No data available
      }

      // Find all tooltip root elements
      const rootElements = Array.from(doc.querySelectorAll(ROOT_SEL));
      if (rootElements.length === 0) {
        return; // No tooltip visible
      }

      // Process each root element
      rootElements.forEach((rootEl) => {
        const innerElements = Array.from(rootEl.querySelectorAll(INNER_SEL));

        innerElements.forEach((inner) => {
          // Check if we're looking at an egg
          const isPlantedEgg =
            currentCrop?.[0]?.species?.endsWith("Egg") ||
            currentCrop?.[0]?.species?.includes("Egg") ||
            currentCrop?.[0]?.type === "egg" ||
            currentCrop?.[0]?.category === "egg";
          const isEgg = currentEgg || isPlantedEgg;

          if (isEgg) {
            // Handle egg timer
            const activePets =
              targetWindow.activePets || UnifiedState.atoms.activePets;
            const eggExpectations = getEggExpectations(activePets);

            if (eggExpectations && eggExpectations.expectedMinutesRemoved > 0) {
              // Find time element in tooltip
              const timeElement = [...inner.childNodes].find((el) =>
                /^\d+h(?: \d+m)?(?: \d+s)?$|^\d+m(?: \d+s)?$|^\d+s$/.test(
                  (el.textContent || "").trim(),
                ),
              );

              if (timeElement) {
                const timeText = timeElement.textContent.trim();
                const timeMatch = timeText.match(
                  /(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?/,
                );

                if (timeMatch) {
                  const hours = parseInt(timeMatch[1] || "0", 10);
                  const minutes = parseInt(timeMatch[2] || "0", 10);
                  const seconds = parseInt(timeMatch[3] || "0", 10);
                  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

                  if (totalSeconds > 0) {
                    const remainingRealMinutes = totalSeconds / 60;
                    const effectiveRate =
                      eggExpectations.expectedMinutesRemoved + 1;
                    const boostedRealMinutes =
                      remainingRealMinutes / effectiveRate;
                    const boostedTotalSeconds = boostedRealMinutes * 60;
                    const boostedHours = Math.floor(boostedTotalSeconds / 3600);
                    const boostedMinutes = Math.floor(
                      (boostedTotalSeconds % 3600) / 60,
                    );

                    const timerText =
                      boostedHours > 0
                        ? `🥚 Egg: ${boostedHours}h ${boostedMinutes}m`
                        : `🥚 Egg: ${boostedMinutes}m`;

                    ensureSpanAtEnd(inner, timerText, MARKER_TURTLE, "#fbbf24");
                  }
                }
              }
            }
            return; // Don't process value for eggs
          }

          // Handle crops
          if (!currentCrop || currentCrop.length === 0) return;

          // Show turtle estimate if crop is growing
          const timeElement = [...inner.childNodes].find((el) =>
            /^\d+h(?: \d+m)?(?: \d+s)?$|^\d+m(?: \d+s)?$|^\d+s$/.test(
              (el.textContent || "").trim(),
            ),
          );

          if (timeElement) {
            const activePets =
              targetWindow.activePets || UnifiedState.atoms.activePets;
            const slotIndex = getCurrentSlotIndex(currentCrop);
            const sortedIndices =
              UnifiedState.atoms.sortedSlotIndices || window.sortedSlotIndices;
            let actualSlotIndex = slotIndex;

            if (
              sortedIndices &&
              Array.isArray(sortedIndices) &&
              sortedIndices.length > 0 &&
              slotIndex < sortedIndices.length
            ) {
              actualSlotIndex = sortedIndices[slotIndex];
            }

            const estimate = estimateUntilLatestCrop(
              currentCrop,
              activePets,
              actualSlotIndex,
            );
            if (estimate) {
              ensureSpanAtEnd(inner, estimate, MARKER_TURTLE, "#4ade80");
            }
          }

          // Show crop value
          const slotValue = calculateCurrentSlotValue(currentCrop);
          if (slotValue > 0) {
            const valueText = Number(slotValue).toLocaleString();
            ensureSpanAtEnd(inner, valueText, MARKER_VALUE, "#FFD84D", true);
          }
        });
      });
    }

    // Helper function to create/update spans (ref.user.js pattern)
    // Helper function to create/update spans (ref.user.js pattern)
    function ensureSpanAtEnd(
      inner,
      text,
      markerClass,
      color,
      showCoinIcon = false,
    ) {
      // 1. Guard check
      if (typeof MGSpriteCatalog !== "undefined" || !inner) return;

      const COIN_URL =
        "https://cdn.discordapp.com/emojis/1425389207525920808.webp?size=96";
      const ICON_CLASS = markerClass + "-icon";
      const LABEL_CLASS = markerClass + "-label";

      /** * 2. FIND OR CREATE THE SPAN
       * To prevent the "double span" issue seen in the McFlex containers:
       * We check both the 'inner' container AND its parent to see if the marker already exists.
       */
      let span = inner.querySelector(`.${markerClass}`);

      // If not found in inner, check siblings/parent to catch misaligned injections
      if (!span && inner.parentElement) {
        span = inner.parentElement.querySelector(`:scope > .${markerClass}`);
      }

      // Handle cleanup of ALL duplicates in the immediate vicinity
      const context = inner.parentElement || inner;
      const allSpans = context.querySelectorAll(`.${markerClass}`);
      if (allSpans.length > 1) {
        for (let i = 1; i < allSpans.length; i++) {
          allSpans[i].remove();
        }
      }

      if (!span) {
        span = document.createElement("span");
        span.className = markerClass;
        // Append immediately
        inner.appendChild(span);
      }

      // 3. STYLE THE MAIN SPAN
      Object.assign(span.style, {
        display: "block",
        marginTop: "6px",
        fontWeight: "700",
        color: color,
        fontSize: "14px",
      });

      // 4. HANDLE COIN ICON
      if (showCoinIcon) {
        let icon = span.querySelector(`img.${ICON_CLASS}`);
        if (!icon) {
          icon = document.createElement("img");
          icon.className = ICON_CLASS;
          icon.alt = "";
          icon.setAttribute("aria-hidden", "true");
          Object.assign(icon.style, {
            width: "14px",
            height: "14px",
            display: "inline-block",
            verticalAlign: "middle",
            marginRight: "4px",
            userSelect: "none",
            pointerEvents: "none",
          });
          span.prepend(icon);
        }
        if (icon.src !== COIN_URL) {
          icon.src = COIN_URL;
        }
      } else {
        const existingIcon = span.querySelector(`img.${ICON_CLASS}`);
        if (existingIcon) existingIcon.remove();
      }

      // 5. HANDLE LABEL TEXT
      let label = span.querySelector(`span.${LABEL_CLASS}`);
      if (!label) {
        label = document.createElement("span");
        label.className = LABEL_CLASS;
        label.style.display = "inline";
        span.appendChild(label);
      }

      if (label.textContent !== text) {
        label.textContent = text;
      }

      // 6. ENFORCE POSITIONING
      // Ensure it is inside the 'inner' container and at the end.
      // This pulls it back inside if it somehow became a sibling.
      if (inner.lastElementChild !== span) {
        inner.appendChild(span);
      }
    }

    // Track current slot index for multi-harvest crops
    // Updated ONLY when cycling (X/C keys) in handleTooltipChange()
    // CRITICAL: Must be on window object to be accessible from both scopes
    if (typeof window._mgtools_currentSlotIndex === "undefined") {
      window._mgtools_currentSlotIndex = 0;
    }

    function getCurrentSlotIndex(currentCrop) {
      if (!currentCrop || currentCrop.length <= 1) return 0;
      return window._mgtools_currentSlotIndex || 0;
    }

    function calculateCurrentSlotValue(currentCrop) {
      if (!currentCrop || currentCrop.length === 0) return 0;

      const friendBonus = UnifiedState.atoms.friendBonus || 1;
      const slotIndex = getCurrentSlotIndex(currentCrop);

      // If we have sorted indices, use them to get the actual slot
      const sortedIndices =
        UnifiedState.atoms.sortedSlotIndices || window.sortedSlotIndices;
      let actualSlotIndex = slotIndex;

      if (
        sortedIndices &&
        Array.isArray(sortedIndices) &&
        sortedIndices.length > 0
      ) {
        // The window._mgtools_currentSlotIndex is the position in the sorted array
        // The value at that position is the actual slot index in currentCrop
        if (slotIndex < sortedIndices.length) {
          actualSlotIndex = sortedIndices[slotIndex];
          productionLog(
            `🔄 [CROP-VALUE] Using sorted index: position ${slotIndex} → actual slot ${actualSlotIndex}`,
          );
        }
      }

      // Debug logging
      productionLog(
        `📊 [CROP-VALUE] Calculating value for slot ${actualSlotIndex}/${currentCrop.length}`,
        {
          displayIndex: slotIndex,
          actualSlotIndex,
          cropCount: currentCrop.length,
          windowIndex: window._mgtools_currentSlotIndex,
          sortedIndices,
        },
      );

      // Validate slot index
      if (actualSlotIndex < 0 || actualSlotIndex >= currentCrop.length) {
        console.error(
          `[CROP-VALUE] Invalid slot index: ${actualSlotIndex} for crop array length: ${currentCrop.length}`,
        );
        window._mgtools_currentSlotIndex = 0; // Reset to safe value
        return 0;
      }

      const slot = currentCrop[actualSlotIndex];
      if (!slot || !slot.species) {
        productionLog(
          `[CROP-VALUE] No species at slot ${actualSlotIndex}`,
          slot,
        );
        return 0;
      }

      const multiplier = calculateMutationMultiplier(slot.mutations);
      const speciesVal = speciesValues[slot.species] || 0;
      const scale = slot.targetScale || 1;

      const value = Math.round(multiplier * speciesVal * scale * friendBonus);

      // Always log for debugging the issue
      productionLog(
        `💰 [CROP-VALUE] Slot ${actualSlotIndex}/${currentCrop.length}: ${slot.species} = ${value.toLocaleString()}`,
        {
          species: slot.species,
          speciesVal,
          multiplier,
          scale,
          friendBonus,
          value,
        },
      );

      return value;
    }

    // Hook currentCrop atom for turtle timer

    function initializeTurtleTimer() {
      productionLog(
        "🐢🐢🐢 [TURTLE-TIMER-START] initializeTurtleTimer() called!",
      );
      productionLog("🐢 [TURTLE-TIMER] Initializing crop growth estimate...");

      // Start listening to slot index changes
      listenToSlotIndexAtom();

      // Also hook the sorted slot indices atom for proper order tracking
      hookAtom(
        "/home/runner/work/magiccircle.gg/magiccircle.gg/client/src/games/Quinoa/atoms/myAtoms.ts/myCurrentSortedGrowSlotIndicesAtom",
        "sortedSlotIndices",
        (value) => {
          return value;
        },
      );

      // Hook currentCrop atom (using unique windowKey to avoid conflict with crop highlighting hook)
      hookAtom(
        "/home/runner/work/magiccircle.gg/magiccircle.gg/client/src/games/Quinoa/atoms/myAtoms.ts/myCurrentGrowSlotsAtom",
        "currentCropForValue",
        (value) => {
          // CRITICAL: Extract the actual crop data from the atom value
          // The atom might return {data: {garden: {tileObjects: [...]}}} or {garden: {tileObjects: [...]}} or just an array
          let cropData = null;
          if (value?.data?.garden?.tileObjects) {
            cropData = value.data.garden.tileObjects; // NEW: Check nested .data structure first
          } else if (value?.garden?.tileObjects) {
            cropData = value.garden.tileObjects; // Fallback to old structure
          } else if (Array.isArray(value)) {
            cropData = value; // Direct array fallback
          }

          // Store the extracted crop data
          UnifiedState.atoms.currentCrop = cropData;
          targetWindow.currentCrop = cropData;

          const currentHash = getCropHash(cropData || value);

          if (currentHash !== globalThis.prevCropHash) {
            globalThis.prevCropHash = currentHash;

            // Update estimate when crop changes
            requestAnimationFrame(() => insertTurtleEstimate());
          }

          return value; // Return original value to game
        },
      );

      // Initial call to display tooltips immediately
      requestAnimationFrame(() => insertTurtleEstimate());

      const doc = targetDocument;

      // Also poll while player is on a tile to catch any missed updates
      setInterval(() => {
        let currentCrop =
          targetWindow.currentCrop || UnifiedState.atoms.currentCrop;
        const currentEgg =
          targetWindow.currentEgg || UnifiedState.atoms.currentEgg;

        // Try to find crop data manually - DIRECT ATOM READING
        let manualCrop = null;
        if (!currentCrop) {
          // Step 1: Find Jotai store if not already found
          if (!targetWindow.__foundJotaiStore) {
            const possibleStores = [
              targetWindow.jotaiStore,
              targetWindow.__JOTAI_STORE__,
              targetWindow.store,
              targetWindow.getDefaultStore?.(),
              targetWindow.globalStore,
              targetWindow.__jotaiStore,
              targetWindow._jotaiStore,
            ];

            for (const store of possibleStores) {
              // Make sure it's NOT cookieStore (browser API)
              // And verify it looks like a Jotai store (has sub/unsub or set methods)
              if (
                store &&
                typeof store.get === "function" &&
                store !== targetWindow.cookieStore &&
                store !== window.cookieStore &&
                (typeof store.set === "function" ||
                  typeof store.sub === "function")
              ) {
                targetWindow.__foundJotaiStore = store;
                break;
              }
            }

            // If still not found, explore window properties
            if (!targetWindow.__foundJotaiStore) {
              const storeKeys = Object.keys(targetWindow).filter(
                (k) =>
                  k.toLowerCase().includes("store") ||
                  k.toLowerCase().includes("jotai"),
              );

              for (const key of storeKeys) {
                const val = targetWindow[key];
                if (
                  val &&
                  typeof val === "object" &&
                  typeof val.get === "function" &&
                  val !== targetWindow.cookieStore &&
                  val !== window.cookieStore &&
                  (typeof val.set === "function" ||
                    typeof val.sub === "function")
                ) {
                  targetWindow.__foundJotaiStore = val;
                  break;
                }
              }

              // ENHANCED: Explore jotaiAtomCache itself for store reference
              if (
                !targetWindow.__foundJotaiStore &&
                targetWindow.jotaiAtomCache
              ) {
                const cache = targetWindow.jotaiAtomCache;

                // Check if cache has store property
                if (cache.store) {
                  targetWindow.__foundJotaiStore = cache.store;
                } else if (cache.cache && cache.cache.store) {
                  targetWindow.__foundJotaiStore = cache.cache.store;
                }
              }
            }
          }

          // Step 2: Try to read atom using the store
          const atomCache =
            targetWindow.jotaiAtomCache?.cache || targetWindow.jotaiAtomCache;
          if (atomCache && atomCache.get) {
            const cropAtom = atomCache.get(
              "/home/runner/work/magiccircle.gg/magiccircle.gg/client/src/games/Quinoa/atoms/myAtoms.ts/myCurrentGrowSlotsAtom",
            );

            if (cropAtom) {
              // Try to read using found store
              if (targetWindow.__foundJotaiStore) {
                try {
                  const cropValue =
                    targetWindow.__foundJotaiStore.get(cropAtom);

                  // Handle if it's a Promise
                  if (cropValue && typeof cropValue.then === "function") {
                    cropValue
                      .then((val) => {
                        targetWindow.currentCrop = val;
                        UnifiedState.atoms.currentCrop = val;

                        // Trigger update
                        if (
                          val &&
                          !document.querySelector(
                            '[data-turtletimer-estimate="true"]',
                          )
                        ) {
                          insertTurtleEstimate();
                        }
                      })
                      .catch((e) => {
                        // Promise rejected
                      });
                  } else {
                    manualCrop = cropValue;

                    // Store it for next time
                    targetWindow.currentCrop = cropValue;
                    UnifiedState.atoms.currentCrop = cropValue;
                  }
                } catch (e) {
                  // Error reading atom from store
                }
              }

              // Fallback: try debugValue
              if (!manualCrop && cropAtom.debugValue !== undefined) {
                manualCrop = cropAtom.debugValue;
              }

              // ENHANCED: Try calling atom.read directly if it exists
              if (!manualCrop && typeof cropAtom.read === "function") {
                try {
                  const mockGetter = (a) => {
                    if (a === cropAtom && cropAtom.init !== undefined) {
                      return cropAtom.init;
                    }
                    return undefined;
                  };
                  const directValue = cropAtom.read(mockGetter);
                  if (directValue && typeof directValue.then !== "function") {
                    manualCrop = directValue;
                  }
                } catch (e) {
                  // Failed to call atom.read()
                }
              }
            }
          }
        }

        // Update currentCrop if we found something manually
        if (manualCrop && !currentCrop) {
          currentCrop = manualCrop;
        }

        // Check if tooltip is visible (player might be standing on something)
        const doc = targetDocument || document;
        const tooltipVisible = doc.querySelector(
          "div.QuinoaUI > div.McFlex:nth-of-type(2) > div.McGrid",
        );

        // If player is standing on something (has crop/egg data OR tooltip is visible), ensure estimate is shown
        if (currentCrop || currentEgg || tooltipVisible) {
          const hasExisting = doc.querySelector(
            '[data-turtletimer-estimate="true"], [data-turtletimer-slot-value="true"]',
          );
          if (!hasExisting) {
            insertTurtleEstimate();
          }
        }
      }, 1000); // Check every second

      // Slot index tracking is now handled by listenToSlotIndexAtom()
      // which directly listens to the game's myCurrentGrowSlotIndex atom

      productionLog("✅ [TURTLE-TIMER] Turtle timer initialized successfully");

      // Expose a debug function to manually check - make it available in page context
      const debugCropDetectionFunc = function () {
        productionLog("=== MANUAL CROP DETECTION DEBUG ===");

        // Check atom cache
        const atomCache = window.jotaiAtomCache?.cache || window.jotaiAtomCache;
        productionLog("atomCache exists:", !!atomCache);

        if (atomCache && atomCache.get) {
          productionLog(
            "Atom cache entries count:",
            atomCache.size || "unknown",
          );

          // Look for crop-related atoms
          try {
            const allKeys = Array.from(atomCache.keys ? atomCache.keys() : []);
            productionLog("Total atoms:", allKeys.length);

            const cropAtoms = allKeys.filter(
              (k) =>
                k.includes("Crop") ||
                k.includes("crop") ||
                k.includes("Grow") ||
                k.includes("Egg"),
            );
            productionLog("Crop-related atoms:", cropAtoms);

            // Try to read the current crop atom
            const atom = atomCache.get(
              "/home/runner/work/magiccircle.gg/magiccircle.gg/client/src/games/Quinoa/atoms/myAtoms.ts/myCurrentGrowSlotsAtom",
            );
            productionLog("Current crop atom:", atom);

            if (atom) {
              productionLog("Atom properties:", Object.keys(atom));
              productionLog("Atom.debugValue:", atom.debugValue);
              productionLog("Atom.init:", atom.init);

              // Try to find store and read it
              const tw = window;
              if (tw.__foundJotaiStore) {
                productionLog("Found store, trying to read...");
                try {
                  const val = tw.__foundJotaiStore.get(atom);
                  productionLog("✅ Store.get(atom) returned:", val);
                } catch (e) {
                  productionLog("❌ Error reading from store:", e);
                }
              } else {
                productionLog("⚠️ No Jotai store found yet");
              }
            }
          } catch (e) {
            productionLog("Error exploring atoms:", e);
          }
        }

        // Force call insertTurtleEstimate
        productionLog("Calling insertTurtleEstimate()...");
        if (typeof insertTurtleEstimate === "function") {
          insertTurtleEstimate();
        } else {
          productionLog(
            "❌ insertTurtleEstimate not available in this context",
          );
        }
      };

      // Attach to multiple contexts
      try {
        window.debugCropDetection = debugCropDetectionFunc;
        targetWindow.debugCropDetection = debugCropDetectionFunc;

        productionLog(
          "💡 TIP: Run window.debugCropDetection() in console to debug crop detection",
        );
        productionLog("💡 Available in: window, targetWindow");
      } catch (e) {
        productionLog("⚠️ Could not attach debugCropDetection:", e);
      }

      // === EXPOSE STORAGE RECOVERY FUNCTIONS (v3.8.7) ===
      try {
        window.emergencyStorageScan = emergencyStorageScan;
        window.exportPetPresets = exportPetPresets;
        window.importPetPresets = importPetPresets;
        window.performStorageHealthCheck = performStorageHealthCheck;

        targetWindow.emergencyStorageScan = emergencyStorageScan;
        targetWindow.exportPetPresets = exportPetPresets;
        targetWindow.importPetPresets = importPetPresets;
        targetWindow.performStorageHealthCheck = performStorageHealthCheck;

        productionLog("💡 TIP: Storage recovery functions available:");
        productionLog(
          '   - emergencyStorageScan("MGA_petPresets") - Scan for lost data',
        );
        productionLog("   - exportPetPresets() - Backup your presets to JSON");
        productionLog("   - importPetPresets() - Restore presets from backup");
        productionLog(
          "   - performStorageHealthCheck() - Check storage system health",
        );
      } catch (e) {
        productionLog("⚠️ Could not attach storage recovery functions:", e);
      }
    }

    function loadSavedData() {
      // PERSISTENCE GUARD v3.6.6: Initialize guard to prevent premature saves during initialization
      window.MGA_PERSISTENCE_GUARD = {
        initializationSavesBlocked: true,
        finalSaveLocation: 23480,
        warningMessage:
          "⚠️ BLOCKED: Premature save during initialization detected! Only final save at line ~23480 is allowed.",
      };
      productionLog(
        "🛡️ [PERSISTENCE-GUARD] Initialized - blocking premature saves during initialization",
      );

      // === STORAGE HEALTH CHECK (v3.8.7) ===
      productionLog("🏥 [HEALTH-CHECK] Running storage health check...");
      const healthReport = performStorageHealthCheck();
      productionLog("🏥 [HEALTH-CHECK] Results:", {
        GM: healthReport.writeTest.GM || "N/A",
        localStorage: healthReport.writeTest.localStorage || "N/A",
        issues: healthReport.issues.length,
      });

      if (healthReport.issues.length > 0) {
        productionWarn("⚠️ [HEALTH-CHECK] Storage issues detected:");
        healthReport.issues.forEach((issue) => productionWarn(`   - ${issue}`));
      } else {
        productionLog("✅ [HEALTH-CHECK] All storage systems healthy");
      }

      // Enhanced storage diagnostics
      productionLog(
        "📦 [STORAGE] Starting comprehensive data loading with diagnostics...",
      );

      // ==================== DATA MIGRATION ====================
      // CRITICAL: Migrate existing localStorage data to GM storage before loading
      productionLog("🔄 [STORAGE] Checking for data migration needs...");
      try {
        // Clean deprecated animation key
        try {
          const animEnabled = GM_getValue("animationEnabled");
          if (animEnabled !== undefined) {
            GM_deleteValue("animationEnabled");
            if (CONFIG.DEBUG.FLAGS.FIX_VALIDATION) {
              productionLog(
                "[FIX_ANIMATION] Removed deprecated animationEnabled from GM storage",
              );
            }
          }
        } catch (e) {
          // Try localStorage fallback
          try {
            if (localStorage.getItem("animationEnabled") !== null) {
              localStorage.removeItem("animationEnabled");
              if (CONFIG.DEBUG.FLAGS.FIX_VALIDATION) {
                productionLog(
                  "[FIX_ANIMATION] Removed deprecated animationEnabled from localStorage",
                );
              }
            }
          } catch (e2) {
            // Silently fail if storage not available
          }
        }

        // MGA_migrateFromLocalStorage();
      } catch (migrationError) {
        console.error(
          "❌ [MIGRATION] Migration failed, but continuing with initialization:",
          migrationError,
        );
      }

      // Verify UnifiedState.data exists and is properly initialized
      if (!UnifiedState.data) {
        console.error("❌ [CRITICAL] UnifiedState.data is not initialized!");
        UnifiedState.data = {};
      }
      productionLog(
        "✅ [STORAGE] UnifiedState.data initialized:",
        typeof UnifiedState.data,
      );

      // Storage availability check (lightweight version - removed blocking I/O test)
      productionLog("📊 [STORAGE-DIAGNOSTICS] Basic localStorage info:", {
        available: typeof localStorage !== "undefined",
        // totalItems: localStorage.length,  // Not supported in unified storage wrapper
        mgaKeys: Object.keys(localStorage).filter((k) => k.startsWith("MGA_")),
      });

      // Load pet presets with enhanced debugging
      productionLog("📦 [STORAGE] Loading pet presets...");
      const rawPresets = localStorage.getItem("MGA_petPresets");
      productionLog(
        "📦 [STORAGE] Raw pet presets from localStorage:",
        rawPresets
          ? (typeof rawPresets === "string"
              ? rawPresets
              : JSON.stringify(rawPresets)
            ).substring(0, 200) + "..."
          : "null",
      );

      UnifiedState.data.petPresets = MGA_loadJSON("MGA_petPresets", {});
      productionLog(
        "📦 [STORAGE] Loading pet presets, found:",
        Object.keys(UnifiedState.data.petPresets).length,
      );
      productionLog(
        "🔍 [STORAGE-DEBUG] Pet presets type check:",
        typeof UnifiedState.data.petPresets,
        "keys:",
        Object.keys(UnifiedState.data.petPresets || {}),
      );

      // Load pet presets order (for reordering feature)
      UnifiedState.data.petPresetsOrder = MGA_loadJSON(
        "MGA_petPresetsOrder",
        [],
      );
      ensurePresetOrder(); // Initialize order if needed
      productionLog(
        "📦 [STORAGE] Pet presets order initialized:",
        UnifiedState.data.petPresetsOrder.length,
        "items",
      );

      // Verify presets loaded correctly
      if (Object.keys(UnifiedState.data.petPresets).length > 0) {
        productionLog(
          "✅ [STORAGE-VERIFY] Pet presets loaded successfully:",
          Object.keys(UnifiedState.data.petPresets),
        );
      } else {
        // Only show detailed warnings in debug mode - this is normal for new users
        if (UnifiedState.data.settings?.debugMode) {
          productionLog(
            "ℹ️ [STORAGE-VERIFY] No pet presets found (fresh start or cleared data)",
          );
          productionLog(
            "   localStorage check:",
            localStorage.getItem("MGA_petPresets") ? "Data exists" : "No data",
          );

          // === EMERGENCY STORAGE SCAN (v3.8.7) ===
          productionLog(
            "🚨 [EMERGENCY-SCAN] Running emergency storage scan for lost presets...",
          );
          const scanReport = emergencyStorageScan("MGA_petPresets");
          productionLog(
            "🚨 [EMERGENCY-SCAN] Scan complete:",
            scanReport.locations,
          );

          // Check if data exists anywhere
          let foundAnywhere = false;
          let recoveryLocation = null;
          for (const [location, result] of Object.entries(
            scanReport.locations,
          )) {
            if (result.found && result.itemCount > 0) {
              foundAnywhere = true;
              recoveryLocation = location;
              productionWarn(
                `   🔍 Found ${result.itemCount} presets in ${location}!`,
              );
              productionLog(`   Preview: ${result.preview}`);
            }
          }

          if (foundAnywhere) {
            productionWarn(
              `⚠️ [DATA-RECOVERY] Presets found in ${recoveryLocation} but not loaded!`,
            );
            productionWarn(
              "   This indicates a storage synchronization issue.",
            );
            productionWarn(
              '   💡 TIP: Use console command: emergencyStorageScan("MGA_petPresets") for details',
            );
          } else {
            productionLog(
              "   💡 TIP: Use Export/Import buttons in Pets tab to backup/restore presets",
            );
          }
        }

        // Enhanced debugging - try to parse the raw data manually (debug mode only)
        if (UnifiedState.data.settings?.debugMode) {
          const rawData = localStorage.getItem("MGA_petPresets");
          if (rawData) {
            const dataAsString =
              typeof rawData === "string" ? rawData : JSON.stringify(rawData);
            productionLog("   Raw data length:", dataAsString.length);
            productionLog(
              "   Raw data preview:",
              dataAsString.substring(0, 100),
            );
            productionLog(
              "   Data type:",
              typeof rawData,
              "keys:",
              Object.keys(rawData || {}).length,
            );
            if (typeof rawData !== "object") {
              console.error(
                "❌ [STORAGE-ERROR] Data exists but is not an object - storage wrapper issue!",
              );
            }
          }
        }
      }

      // Check if logs were manually cleared - if so, keep them empty
      const clearFlag =
        localStorage.getItem("MGA_logs_manually_cleared") ||
        (typeof GM_getValue !== "undefined"
          ? GM_getValue("MGA_logs_manually_cleared", null)
          : null);
      const clearSession = localStorage.getItem("MGA_logs_clear_session");

      // Declare skipLogLoading once in the smallest common scope
      let skipLogLoading;

      // If cleared within last 24 hours, stay empty and skip ALL loading
      if (clearFlag && clearSession) {
        const clearTime = parseInt(clearFlag, 10);
        const sessionTime = parseInt(clearSession, 10);

        // 24-hour session lock: If cleared within last 24 hours, respect the clear
        if (Date.now() - clearTime < 86400000) {
          productionLog(
            "✅ [ABILITY-LOGS] Respecting manual clear - logs remain empty (session lock active)",
          );
          UnifiedState.data.petAbilityLogs = [];
          // Skip all loading including archive - jump to after load section
          // Return statement won't work here, so we use a flag
          skipLogLoading = true;
        } else {
          // Session expired - clear the flags and allow normal loading
          localStorage.removeItem("MGA_logs_manually_cleared");
          localStorage.removeItem("MGA_logs_clear_session");
          try {
            if (typeof GM_deleteValue !== "undefined") {
              GM_deleteValue("MGA_logs_manually_cleared");
            }
          } catch (e) {}
          logDebug(
            "STORAGE",
            "⏰ Clear session expired (>24h) - resuming normal log loading",
          );
          skipLogLoading = false;
        }
      } else {
        skipLogLoading = false;
      }

      const wasManuallyCleared = skipLogLoading;
      logDebug("STORAGE", "Loading ability logs:", {
        wasManuallyCleared,
        clearFlag: clearFlag,
        clearSession: clearSession,
        skipLogLoading: skipLogLoading,
      });

      if (skipLogLoading) {
        // Logs were manually cleared recently - keeping empty
        logDebug(
          "STORAGE",
          "Logs were manually cleared recently - keeping empty",
        );
        // Skip to after the loading section
      } else {
        // ENHANCED: Check all storage sources to see where logs will come from
        const gmRaw =
          typeof GM_getValue !== "undefined"
            ? GM_getValue("MGA_petAbilityLogs", null)
            : null;
        const lsRaw = window.localStorage?.getItem("MGA_petAbilityLogs");
        const tgRaw =
          typeof targetWindow !== "undefined" &&
          targetWindow &&
          targetWindow !== window
            ? targetWindow.localStorage?.getItem("MGA_petAbilityLogs")
            : null;

        // Count logs in each source
        const countLogs = (raw) => {
          if (!raw) return 0;
          try {
            const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
            return Array.isArray(parsed) ? parsed.length : 0;
          } catch (e) {
            return 0;
          }
        };

        const gmCount = countLogs(gmRaw);
        const lsCount = countLogs(lsRaw);
        const tgCount = countLogs(tgRaw);

        logDebug("STORAGE", "🔍 Ability log source analysis:", {
          gmStorage: gmCount > 0 ? `${gmCount} logs` : "empty",
          windowLocalStorage: lsCount > 0 ? `${lsCount} logs` : "empty",
          targetLocalStorage: tgCount > 0 ? `${tgCount} logs` : "empty",
          willChoose:
            gmCount >= lsCount && gmCount >= tgCount
              ? "GM"
              : lsCount >= tgCount
                ? "window.localStorage"
                : "targetWindow.localStorage",
        });

        const loadedLogs = MGA_loadJSON("MGA_petAbilityLogs", []);
        UnifiedState.data.petAbilityLogs = loadedLogs;

        logDebug("STORAGE", "✅ Loaded main logs:", {
          count: loadedLogs.length,
          sample: loadedLogs.slice(0, 3).map((l) => ({
            ability: l.abilityType,
            time: new Date(l.timestamp).toLocaleTimeString(),
          })),
        });

        // DIAGNOSTIC: If logs appeared from nowhere after clear, log a warning
        if (
          loadedLogs.length > 0 &&
          (gmCount > 0 || lsCount > 0 || tgCount > 0)
        ) {
          const sources = [];
          if (gmCount > 0) sources.push(`GM:${gmCount}`);
          if (lsCount > 0) sources.push(`LS:${lsCount}`);
          if (tgCount > 0) sources.push(`TG:${tgCount}`);
          logDebug("STORAGE", `📍 Logs restored from: ${sources.join(", ")}`);
        }
      }

      // BUGFIX: One-time migration - normalize old "Produce Scale Boost" ability names to "Crop Size Boost"
      // BUGFIX: Normalize malformed ability names (e.g., "Seed FinderII" → "Seed Finder II")
      // This fixes "lost logs" issue when game renamed the ability or had typos
      let migrationNeeded = false;
      let normalizationNeeded = false;
      UnifiedState.data.petAbilityLogs = UnifiedState.data.petAbilityLogs.map(
        (log) => {
          const updatedLog = { ...log };
          let wasUpdated = false;

          // Migration 1: Produce Scale Boost → Crop Size Boost
          if (
            updatedLog.abilityType &&
            /produce\s*scale\s*boost/i.test(updatedLog.abilityType)
          ) {
            migrationNeeded = true;
            wasUpdated = true;
            updatedLog.abilityType = updatedLog.abilityType.replace(
              /produce\s*scale\s*boost/gi,
              "Crop Size Boost",
            );
          }

          // Migration 2: Normalize ability names (fix missing spaces before roman numerals)
          if (updatedLog.abilityType) {
            const normalized = normalizeAbilityName(updatedLog.abilityType);
            if (normalized !== updatedLog.abilityType) {
              normalizationNeeded = true;
              wasUpdated = true;
              logDebug(
                "STORAGE",
                `📝 Normalizing ability name: "${updatedLog.abilityType}" → "${normalized}"`,
              );
              updatedLog.abilityType = normalized;
            }
          }

          return updatedLog;
        },
      );

      // Also migrate archived logs (BUT skip if logs were manually cleared)
      const archivedLogs = wasManuallyCleared
        ? []
        : MGA_loadJSON("MGA_petAbilityLogs_archive", []);
      logDebug("STORAGE", "Archive logs:", {
        skippedDueToClear: wasManuallyCleared,
        count: archivedLogs.length,
        logs: archivedLogs.slice(0, 5).map((l) => ({
          ability: l.abilityType,
          time: new Date(l.timestamp).toLocaleTimeString(),
        })),
      });

      let archivedMigrationNeeded = false;
      let archivedNormalizationNeeded = false;
      const migratedArchive = archivedLogs.map((log) => {
        const updatedLog = { ...log };
        let wasUpdated = false;

        // Migration 1: Produce Scale Boost → Crop Size Boost
        if (
          updatedLog.abilityType &&
          /produce\s*scale\s*boost/i.test(updatedLog.abilityType)
        ) {
          archivedMigrationNeeded = true;
          wasUpdated = true;
          updatedLog.abilityType = updatedLog.abilityType.replace(
            /produce\s*scale\s*boost/gi,
            "Crop Size Boost",
          );
        }

        // Migration 2: Normalize ability names
        if (updatedLog.abilityType) {
          const normalized = normalizeAbilityName(updatedLog.abilityType);
          if (normalized !== updatedLog.abilityType) {
            archivedNormalizationNeeded = true;
            wasUpdated = true;
            updatedLog.abilityType = normalized;
          }
        }

        return updatedLog;
      });

      // Save if any migrations/normalizations occurred
      if (migrationNeeded || normalizationNeeded) {
        MGA_saveJSON("MGA_petAbilityLogs", UnifiedState.data.petAbilityLogs);
        if (migrationNeeded && normalizationNeeded) {
          productionLog(
            '✅ [MIGRATION] Migrated "Produce Scale Boost" and normalized malformed ability names',
          );
        } else if (migrationNeeded) {
          productionLog(
            '✅ [MIGRATION] Migrated old "Produce Scale Boost" logs to "Crop Size Boost"',
          );
        } else if (normalizationNeeded) {
          productionLog(
            "✅ [MIGRATION] Normalized malformed ability names (fixed missing spaces before roman numerals)",
          );
        }
      }

      if (archivedMigrationNeeded || archivedNormalizationNeeded) {
        MGA_saveJSON("MGA_petAbilityLogs_archive", migratedArchive);
        if (archivedMigrationNeeded && archivedNormalizationNeeded) {
          productionLog(
            "✅ [MIGRATION] Migrated and normalized archived ability logs",
          );
        } else if (archivedMigrationNeeded) {
          productionLog(
            '✅ [MIGRATION] Migrated archived "Produce Scale Boost" logs to "Crop Size Boost"',
          );
        } else if (archivedNormalizationNeeded) {
          productionLog(
            "✅ [MIGRATION] Normalized archived malformed ability names",
          );
        }
      }

      // NOW clear the manual clear flag (after we've used it for both main and archive)
      if (wasManuallyCleared) {
        // Sticky clear: do not remove here; will be cleared on first new log add.
      }

      productionLog(
        "📦 [STORAGE] Loading pet ability logs, found:",
        UnifiedState.data.petAbilityLogs.length,
        "entries",
      );

      // Check if external pet ability logging is active
      if (window.petAbilityLogs && Array.isArray(window.petAbilityLogs)) {
        productionLog(
          "📝 [COMPAT] Detected external pet ability logging system with",
          window.petAbilityLogs.length,
          "entries",
        );
        productionLog(
          "📝 [COMPAT] Both systems will run independently with separate storage",
        );
      }
      // BUGFIX: Load from MGA_data instead of MGA_settings (saves use MGA_data)
      // Always load from MGA_data first (this is where we save)
      const loadedData = MGA_loadJSON("MGA_data", null);

      // CRITICAL: Verify loaded data integrity before using
      if (loadedData && typeof loadedData === "object") {
        productionLog("📦 [STORAGE-INTEGRITY] Loaded data structure:", {
          hasSettings: !!loadedData.settings,
          hasCustomRooms: !!loadedData.customRooms,
          hasSeedsToDelete: !!loadedData.seedsToDelete,
          hasLockedCrops: !!loadedData.lockedCrops,
          hasLockedDecor: !!loadedData.lockedDecor,
          hasLockedPetAbilities: !!loadedData.lockedPetAbilities,
          topLevelKeys: Object.keys(loadedData),
          settingsKeys: loadedData.settings
            ? Object.keys(loadedData.settings).length
            : 0,
        });
      } else {
        productionLog(
          "⚠️ [STORAGE-INTEGRITY] No valid saved data found - will use defaults",
        );
      }

      if (loadedData && loadedData.settings) {
        // If MGA_data exists, use it (this is where saves go)
        UnifiedState.data.settings = loadedData.settings;
        productionLog("📦 [STORAGE] Loaded settings from MGA_data");
      } else {
        // Try legacy MGA_settings for migration
        const legacySettings = MGA_loadJSON("MGA_settings", null);
        if (legacySettings) {
          UnifiedState.data.settings = legacySettings;
          // Migration will be saved at the end of loadSavedData (line ~23444)
          productionLog(
            "📦 [STORAGE] Migrated settings from MGA_settings to MGA_data (will save at end of init)",
          );
        } else {
          // Use COMPLETE defaults for first run (must match full structure from lines 2074-2115)
          UnifiedState.data.settings = {
            opacity: 95,
            popoutOpacity: 50,
            theme: "default",
            gradientStyle: "blue-purple",
            effectStyle: "none",
            compactMode: false,
            ultraCompactMode: false,
            useInGameOverlays: true,
            debugMode: false,
            hideWeather: false,
            keepAliveAudio: {
              enabled: false,
              volume: 0.008,
              frequency: 72,
            },
            notifications: {
              enabled: true,
              volume: 0.3,
              notificationType: "epic",
              requiresAcknowledgment: false,
              continuousEnabled: false,
              watchedSeeds: [
                "Carrot",
                "Sunflower",
                "Moonbinder",
                "Dawnbinder",
                "Starweaver",
              ],
              watchedEggs: ["CommonEgg", "MythicalEgg"],
              petHungerEnabled: false,
              petHungerThreshold: 25,
              petHungerSound: "double",
              abilityNotificationsEnabled: false,
              watchedAbilities: [],
              watchedAbilityCategories: {
                xpBoost: true,
                cropSizeBoost: true,
                selling: true,
                harvesting: true,
                growthSpeed: true,
                specialMutations: true,
                other: true,
              },
              abilityNotificationSound: "single",
              abilityNotificationVolume: 0.2,
              weatherNotificationsEnabled: false,
              watchedWeatherEvents: ["Snow", "Rain", "AmberMoon", "Dawn"],
              shopFirebaseEnabled: false,
              lastSeenTimestamps: {},
            },
            detailedTimestamps: true,
            autoFavorite: {
              enabled: false,
              species: [],
              mutations: [],
            },
          };
          productionLog(
            "📦 [STORAGE] Using complete default settings (first run - will save at end of init)",
          );
          // Defaults will be saved at the end of loadSavedData (line ~23444)
        }
      }

      // Ensure notifications object exists and has all required fields
      if (!UnifiedState.data.settings.notifications) {
        UnifiedState.data.settings.notifications = {};
      }

      if (!UnifiedState.data.settings.keepAliveAudio) {
        UnifiedState.data.settings.keepAliveAudio = {
          enabled: false,
          volume: 0.008,
          frequency: 72,
        };
      } else {
        if (UnifiedState.data.settings.keepAliveAudio.enabled === undefined) {
          UnifiedState.data.settings.keepAliveAudio.enabled = false;
        }
        if (UnifiedState.data.settings.keepAliveAudio.volume === undefined) {
          UnifiedState.data.settings.keepAliveAudio.volume = 0.008;
        }
        if (UnifiedState.data.settings.keepAliveAudio.frequency === undefined) {
          UnifiedState.data.settings.keepAliveAudio.frequency = 72;
        }
      }

      // Set defaults for any missing notification fields
      const notifDefaults = {
        enabled: true,
        volume: 0.3,
        notificationType: "epic",
        requiresAcknowledgment: false,
        continuousEnabled: false,
        watchedSeeds: [
          "Carrot",
          "Sunflower",
          "Moonbinder",
          "Dawnbinder",
          "Starweaver",
        ],
        watchedEggs: ["CommonEgg", "MythicalEgg"],
        petHungerEnabled: false,
        petHungerThreshold: 25,
        petHungerSound: "double",
        abilityNotificationsEnabled: false,
        watchedAbilities: [],
        watchedAbilityCategories: {
          xpBoost: true,
          cropSizeBoost: true,
          selling: true,
          harvesting: true,
          growthSpeed: true,
          specialMutations: true,
          other: true,
        },
        abilityNotificationSound: "single",
        abilityNotificationVolume: 0.2,
        weatherNotificationsEnabled: false,
        watchedWeatherEvents: ["Snow", "Rain", "AmberMoon", "Dawn"],
        shopFirebaseEnabled: false,
        lastSeenTimestamps: {},
      };

      // Merge defaults with existing settings
      // CRITICAL: Don't override intentionally empty arrays with defaults
      Object.keys(notifDefaults).forEach((key) => {
        const currentValue = UnifiedState.data.settings.notifications[key];

        if (currentValue === undefined) {
          // Only set default if field truly doesn't exist
          if (Array.isArray(notifDefaults[key])) {
            // For array fields, check if key exists in saved data
            if (!(key in UnifiedState.data.settings.notifications)) {
              UnifiedState.data.settings.notifications[key] =
                notifDefaults[key];
              productionLog(
                `📦 [SETTINGS] Initialized ${key} array with defaults (field was missing)`,
              );
            } else {
              // Key exists but value is undefined - keep it undefined (user may have cleared it)
              productionLog(
                `📦 [SETTINGS] Preserved undefined ${key} (intentionally cleared)`,
              );
            }
          } else {
            // Non-array fields just set default
            UnifiedState.data.settings.notifications[key] = notifDefaults[key];
          }
        }
      });

      // Ensure watchedAbilityCategories exists and has all categories
      if (!UnifiedState.data.settings.notifications.watchedAbilityCategories) {
        UnifiedState.data.settings.notifications.watchedAbilityCategories =
          notifDefaults.watchedAbilityCategories;
      }

      // Ensure detailedTimestamps setting exists
      if (UnifiedState.data.settings.detailedTimestamps === undefined) {
        UnifiedState.data.settings.detailedTimestamps = false;
      }

      // Ensure autoFavorite setting exists (for v3.3.4+)
      if (!UnifiedState.data.settings.autoFavorite) {
        UnifiedState.data.settings.autoFavorite = {
          enabled: false,
          species: [],
          mutations: [],
        };
        productionLog("🌟 [AUTO-FAVORITE] Initialized auto-favorite settings");
      }
      // Ensure mutations array exists for existing users
      if (!UnifiedState.data.settings.autoFavorite.mutations) {
        UnifiedState.data.settings.autoFavorite.mutations = [];
        productionLog(
          "🌟 [AUTO-FAVORITE] Added mutations array to existing settings",
        );
      }

      // Try to restore auto-favorites from backup if primary data is empty
      if (
        UnifiedState.data.settings.autoFavorite.species.length === 0 &&
        UnifiedState.data.settings.autoFavorite.mutations.length === 0
      ) {
        try {
          const backup = localStorage.getItem("mgtools_auto_favorites");
          if (backup) {
            const parsed = JSON.parse(backup);
            if (
              parsed &&
              (parsed.species?.length > 0 || parsed.mutations?.length > 0)
            ) {
              UnifiedState.data.settings.autoFavorite = parsed;
              logInfo(
                "AUTO-FAV",
                "Restored auto-favorites from localStorage backup",
                {
                  species: parsed.species?.length || 0,
                  mutations: parsed.mutations?.length || 0,
                },
              );
            }
          }
        } catch (e) {
          // Silent fail - non-critical
          logDebug("AUTO-FAV", "Failed to restore from backup", e);
        }
      }

      // Load customRooms from saved data
      if (
        loadedData &&
        loadedData.customRooms &&
        Array.isArray(loadedData.customRooms) &&
        loadedData.customRooms.length > 0
      ) {
        // Load from saved data
        UnifiedState.data.customRooms = loadedData.customRooms;
        productionLog(
          "🏠 [ROOMS] Loaded custom rooms from storage:",
          UnifiedState.data.customRooms,
        );
      } else {
        // Initialize with defaults (first time only)
        UnifiedState.data.customRooms = [...DEFAULT_ROOMS];

        // Add Discord play rooms if in Discord environment
        if (isDiscordEnvironment()) {
          UnifiedState.data.customRooms.push(...DISCORD_PLAY_ROOMS);
          productionLog(
            "🎮 [ROOMS] Discord environment detected - added Discord play rooms",
          );
        }

        // Custom rooms will be saved at the end of loadSavedData (line ~23444)
        productionLog(
          "🏠 [ROOMS] Initialized custom rooms (first time - will save at end of init):",
          UnifiedState.data.customRooms,
        );
      }

      // Load room status from storage (player counts for custom rooms)
      const savedRoomStatus = MGA_loadJSON("MGA_roomStatus", null);
      if (savedRoomStatus && savedRoomStatus.counts) {
        UnifiedState.data.roomStatus = savedRoomStatus;
        productionLog(
          "🏠 [ROOMS] Loaded saved room status:",
          Object.keys(savedRoomStatus.counts).length,
          "rooms",
        );
      } else {
        UnifiedState.data.roomStatus = { counts: {}, lastUpdate: {} };
        productionLog(
          "🏠 [ROOMS] Initialized empty room status (first time or no saved data)",
        );
      }

      // Load hotkeys data
      const savedHotkeys = MGA_loadJSON("MGA_hotkeys", null);
      if (savedHotkeys) {
        // Merge saved hotkeys with defaults to handle new keys
        UnifiedState.data.hotkeys = {
          ...UnifiedState.data.hotkeys,
          ...savedHotkeys,
          gameKeys: {
            ...UnifiedState.data.hotkeys.gameKeys,
            ...savedHotkeys.gameKeys,
          },
          mgToolsKeys: {
            ...UnifiedState.data.hotkeys.mgToolsKeys,
            ...(savedHotkeys.mgToolsKeys || {}),
          },
        };
        productionLog("🎮 [HOTKEYS] Loaded saved hotkey configuration");
      } else {
        productionLog("🎮 [HOTKEYS] Using default hotkey configuration");
      }

      // Load pet preset hotkeys
      const savedPresetHotkeys = MGA_loadJSON("MGA_petPresetHotkeys", null);
      if (savedPresetHotkeys) {
        // Clean up orphaned hotkeys (hotkey exists but preset doesn't)
        let orphanCount = 0;
        Object.keys(savedPresetHotkeys).forEach((presetName) => {
          if (!UnifiedState.data.petPresets[presetName]) {
            delete savedPresetHotkeys[presetName];
            orphanCount += 1;
          }
        });

        UnifiedState.data.petPresetHotkeys = savedPresetHotkeys;
        productionLog("[HOTKEYS] Loaded pet preset hotkeys");
        if (orphanCount > 0) {
          productionLog(
            `[HOTKEYS] Cleaned up ${orphanCount} orphaned hotkey(s)`,
          );
          MGA_saveJSON(
            "MGA_petPresetHotkeys",
            UnifiedState.data.petPresetHotkeys,
          );
        }
      }

      // Load PAL4 filter system data
      UnifiedState.data.filterMode = MGA_loadJSON(
        "MGA_filterMode",
        "categories",
      );
      UnifiedState.data.abilityFilters = MGA_loadJSON("MGA_abilityFilters", {
        xpBoost: true,
        cropSizeBoost: true,
        selling: true,
        harvesting: true,
        growthSpeed: true,
        specialMutations: true,
        other: true,
      });
      UnifiedState.data.customMode = MGA_loadJSON("MGA_customMode", {
        selectedAbilities: {},
      });
      UnifiedState.data.petFilters = MGA_loadJSON("MGA_petFilters", {
        selectedPets: {},
      });

      // Load seed deletion settings from MGA_data (primary) with fallback to legacy keys
      const rawSeedsData = localStorage.getItem("MGA_seedsToDelete");
      const rawAutoDeleteData = localStorage.getItem("MGA_autoDeleteEnabled");

      // Load seeds to delete from MGA_data (primary) with fallback to legacy keys
      if (loadedData && loadedData.seedsToDelete !== undefined) {
        UnifiedState.data.seedsToDelete = loadedData.seedsToDelete;
        productionLog(
          "📦 [STORAGE] Loaded seedsToDelete from MGA_data:",
          UnifiedState.data.seedsToDelete.length,
        );
      } else {
        // Backward compatibility: Try loading from old separate storage key
        UnifiedState.data.seedsToDelete = MGA_loadJSON("MGA_seedsToDelete", []);
        productionLog("📦 [STORAGE] Loaded seedsToDelete from legacy key");
        // Migrate to MGA_data on next save
        if (UnifiedState.data.seedsToDelete.length > 0) {
          productionLog(
            "📦 [MIGRATION] Will migrate seedsToDelete to MGA_data on next save",
          );
        }
      }

      if (loadedData && loadedData.autoDeleteEnabled !== undefined) {
        UnifiedState.data.autoDeleteEnabled = loadedData.autoDeleteEnabled;
        productionLog(
          "📦 [STORAGE] Loaded autoDeleteEnabled from MGA_data:",
          UnifiedState.data.autoDeleteEnabled,
        );
      } else {
        // Backward compatibility
        UnifiedState.data.autoDeleteEnabled = MGA_loadJSON(
          "MGA_autoDeleteEnabled",
          false,
        );
        productionLog("📦 [STORAGE] Loaded autoDeleteEnabled from legacy key");
      }
      productionLog(
        "🔍 [STORAGE-DEBUG] Seeds type check:",
        typeof UnifiedState.data.seedsToDelete,
        "length:",
        UnifiedState.data.seedsToDelete?.length || 0,
      );

      productionLog("📦 [STORAGE] Loading seed deletion settings:", {
        seedsToDelete: UnifiedState.data.seedsToDelete.length + " seeds",
        autoDeleteEnabled: UnifiedState.data.autoDeleteEnabled,
        seeds: UnifiedState.data.seedsToDelete,
        rawSeedsToDeleteFromStorage: rawSeedsData,
        rawAutoDeleteFromStorage: rawAutoDeleteData,
        parsedSeedsData: rawSeedsData, // Already parsed by storage wrapper
        parsedAutoDeleteData: rawAutoDeleteData, // Already parsed by storage wrapper
      });

      // Verify seeds loaded correctly
      if (UnifiedState.data.seedsToDelete.length > 0) {
        productionLog(
          "✅ [STORAGE-VERIFY] Seed selections loaded successfully:",
          UnifiedState.data.seedsToDelete,
        );
      } else {
        // Only show in debug mode - this is normal for users who haven't configured seed auto-delete
        if (UnifiedState.data.settings?.debugMode) {
          productionLog(
            "ℹ️ [STORAGE-VERIFY] No seed auto-delete selections (not configured yet)",
          );
          productionLog(
            "   localStorage check:",
            localStorage.getItem("MGA_seedsToDelete")
              ? "Data exists"
              : "No data",
          );
        }

        // Enhanced debugging for seeds (debug mode only)
        if (UnifiedState.data.settings?.debugMode) {
          const rawSeedsData = localStorage.getItem("MGA_seedsToDelete");
          if (rawSeedsData) {
            const dataAsString =
              typeof rawSeedsData === "string"
                ? rawSeedsData
                : JSON.stringify(rawSeedsData);
            productionLog("   Raw seeds data length:", dataAsString.length);
            productionLog(
              "   Raw seeds data preview:",
              dataAsString.substring(0, 100),
            );
            productionLog(
              "   Seeds data type:",
              typeof rawSeedsData,
              Array.isArray(rawSeedsData)
                ? `array with ${rawSeedsData.length} items`
                : "not array",
            );
            if (typeof rawSeedsData !== "object") {
              console.error(
                "❌ [STORAGE-ERROR] Seeds data exists but is not an object - storage wrapper issue!",
              );
            }
          }
        }
      }

      // Load crop protection settings from MGA_data
      if (loadedData && loadedData.lockedCrops) {
        UnifiedState.data.lockedCrops = loadedData.lockedCrops;

        // MIGRATION: Convert old "No Mutation" to "Lock All Mutations"
        if (UnifiedState.data.lockedCrops.mutations) {
          const mutations = UnifiedState.data.lockedCrops.mutations;
          const oldIndex = mutations.indexOf("No Mutation");
          if (oldIndex !== -1) {
            mutations[oldIndex] = "Lock All Mutations";
            productionLog(
              '📦 [MIGRATION] Converted old "No Mutation" to "Lock All Mutations"',
            );
          }
        }

        productionLog(
          "📦 [STORAGE] Loaded crop protection locks from MGA_data:",
          {
            species: loadedData.lockedCrops.species?.length || 0,
            mutations: loadedData.lockedCrops.mutations?.length || 0,
          },
        );
      } else {
        UnifiedState.data.lockedCrops = { species: [], mutations: [] };
        productionLog("📦 [STORAGE] Initialized crop protection with defaults");
      }

      // Load decor protection settings from MGA_data
      if (
        loadedData &&
        loadedData.lockedDecor &&
        Array.isArray(loadedData.lockedDecor)
      ) {
        UnifiedState.data.lockedDecor = loadedData.lockedDecor;
        productionLog(
          "📦 [STORAGE] Loaded decor protection locks from MGA_data:",
          UnifiedState.data.lockedDecor.length,
        );
      } else {
        UnifiedState.data.lockedDecor = [];
        productionLog(
          "📦 [STORAGE] Initialized decor protection with defaults",
        );
      }

      // Load pet abilities protection settings from MGA_data
      if (
        loadedData &&
        loadedData.lockedPetAbilities &&
        Array.isArray(loadedData.lockedPetAbilities)
      ) {
        UnifiedState.data.lockedPetAbilities = loadedData.lockedPetAbilities;
        productionLog(
          "📦 [STORAGE] Loaded pet abilities protection locks from MGA_data:",
          UnifiedState.data.lockedPetAbilities.length,
        );
      } else {
        UnifiedState.data.lockedPetAbilities = [];
        productionLog(
          "📦 [STORAGE] Initialized pet abilities protection with defaults",
        );
      }

      if (loadedData && loadedData.sellBlockThreshold !== undefined) {
        UnifiedState.data.sellBlockThreshold = loadedData.sellBlockThreshold;
        productionLog(
          "📦 [STORAGE] Loaded sell block threshold:",
          UnifiedState.data.sellBlockThreshold,
        );
      } else {
        UnifiedState.data.sellBlockThreshold = 1.0;
        productionLog(
          "📦 [STORAGE] Initialized sell block threshold to default (1.0)",
        );
      }

      // Load persisted ability timestamps to prevent duplicate logging after refresh
      UnifiedState.data.lastAbilityTimestamps = MGA_loadJSON(
        "MGA_lastAbilityTimestamps",
        {},
      );

      // Clean up old ability timestamps (keep only last 24 hours to prevent memory bloat)
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      Object.keys(UnifiedState.data.lastAbilityTimestamps).forEach((petId) => {
        if (UnifiedState.data.lastAbilityTimestamps[petId] < dayAgo) {
          delete UnifiedState.data.lastAbilityTimestamps[petId];
        }
      });

      // ==================== SAVE COMPLETE STATE ====================
      // CRITICAL: Save AFTER all data has been loaded from loadedData to prevent data loss
      MGA_saveJSON("MGA_data", UnifiedState.data);
      productionLog(
        "💾 [STORAGE] Saved complete merged state (settings, customRooms, seedsToDelete, lockedCrops, sellBlockThreshold)",
      );

      // PERSISTENCE GUARD v3.8.6: Clear guard - initialization complete, saves now allowed
      if (window.MGA_PERSISTENCE_GUARD) {
        window.MGA_PERSISTENCE_GUARD.initializationSavesBlocked = false;
        productionLog(
          "🛡️ [PERSISTENCE-GUARD] Cleared - initialization complete, saves now allowed",
        );
      }

      // ==================== STORAGE LOADING SUMMARY ====================
      productionLog("📊 [STORAGE-SUMMARY] Data loading complete:", {
        petPresets: {
          loaded: Object.keys(UnifiedState.data.petPresets).length,
          presets: Object.keys(UnifiedState.data.petPresets),
          rawExists: !!rawPresets,
        },
        abilityLogs: {
          loaded: UnifiedState.data.petAbilityLogs.length,
          rawExists: !!localStorage.getItem("MGA_petAbilityLogs"),
        },
        seedSettings: {
          seedsToDelete: UnifiedState.data.seedsToDelete.length,
          autoDeleteEnabled: UnifiedState.data.autoDeleteEnabled,
          rawSeedsExists: !!rawSeedsData,
          rawAutoDeleteExists: !!rawAutoDeleteData,
        },
        settings: {
          loaded: Object.keys(UnifiedState.data.settings).length,
          rawExists: !!localStorage.getItem("MGA_settings"),
        },
        allMgaKeys: Object.keys(localStorage).filter((k) =>
          k.startsWith("MGA_"),
        ),
        timestamp: new Date().toISOString(),
      });

      // Persistence verification test
      setTimeout(() => {
        // productionLog('🔍 [STORAGE-VERIFICATION] Testing immediate save/load cycle...');
        const testKey = "MGA_persistenceTest";
        const testData = { test: true, timestamp: Date.now() };

        try {
          MGA_saveJSON(testKey, testData);
          const retrieved = MGA_loadJSON(testKey, null);
          const success = retrieved && retrieved.test === true;

          productionLog("📊 [STORAGE-VERIFICATION] Persistence test result:", {
            success: success,
            saved: testData,
            retrieved: retrieved,
            matching: JSON.stringify(testData) === JSON.stringify(retrieved),
          });

          // Clean up test data
          localStorage.removeItem(testKey);

          if (!success) {
            console.error(
              "❌ [STORAGE-VERIFICATION] Persistence test FAILED - data may not be saving correctly",
            );
          } else {
            productionLog(
              "✅ [STORAGE-VERIFICATION] Persistence test PASSED - storage is working correctly",
            );
          }
        } catch (error) {
          console.error(
            "❌ [STORAGE-VERIFICATION] Persistence test ERROR:",
            error,
          );
        }
      }, 100);
    }

    function startIntervals() {
      productionLog("🚨🚨🚨 [CRITICAL] startIntervals() CALLED 🚨🚨🚨");

      // Mark that intervals have been started
      window._mgaIntervalsStarted = true;

      // Initialize event-driven shop watcher
      productionLog("🔄 Initializing event-driven shop monitoring...");
      initializeShopWatcher();

      // Initialize the enhanced TimerManager (make it global for debugging)
      window.timerManager = initializeTimerManager();

      // OPTIMIZED: Monitor abilities every 5 seconds (performance improvement)
      productionLog("🚨 [CRITICAL] Setting up ability monitoring timer...");
      window.abilityMonitoringInterval = setInterval(() => {
        monitorPetAbilities();
      }, 5000);
      productionLog(
        "🚨 [CRITICAL] Ability monitoring started with simple setInterval (3s)",
      );

      // OPTIMIZED: Update timers every 2 seconds (reduced from 1s)
      window.timerManager.startTimer("timers", () => updateTimers(), 2000);

      // OPTIMIZED: Update values every 3 seconds (reduced from 2s)
      window.timerManager.startTimer("values", () => updateValues(), 3000);

      // Optimized notification timer with performance monitoring
      productionLog("🚨 [CRITICAL] Setting up optimized notification timer...");

      let notificationCheckCounter = 0;
      let skipNextChecks = 0;

      // Make notificationInterval global so we can check if it's running
      // OPTIMIZED: Increased to 10 seconds to dramatically reduce FPS impact
      window.notificationInterval = setInterval(() => {
        // Skip checks if we're in a performance-critical situation
        if (skipNextChecks > 0) {
          skipNextChecks--;
          productionLog(
            "⏭️ [PERFORMANCE] Skipping notification checks to improve FPS",
          );
          return;
        }

        // Check if we're in a weather event and should throttle
        const currentWeather =
          window.roomState?.child?.data?.weather ||
          window.roomState?.weather ||
          null;
        const isWeatherActive =
          currentWeather &&
          currentWeather !== "none" &&
          currentWeather !== "clear";

        notificationCheckCounter++;

        // OPTIMIZED: During weather events, only check every 2nd interval (20s instead of 10s)
        if (isWeatherActive && notificationCheckCounter % 2 !== 0) {
          productionLog(
            "🌤️ [PERFORMANCE] Throttling checks during weather event:",
            currentWeather,
          );
          return;
        }

        // Measure performance impact
        const startTime = performance.now();

        try {
          // Run checks with try-catch to prevent errors from breaking the interval
          try {
            checkForWatchedItems();
          } catch (e) {
            console.error("❌ Error in checkForWatchedItems:", e);
          }

          try {
            checkPetHunger();
          } catch (e) {
            console.error("❌ Error in checkPetHunger:", e);
          }

          // Only check weather if enabled and not already in weather event
          if (!isWeatherActive) {
            try {
              detectWeatherEvents();
            } catch (e) {
              console.error("❌ Error in detectWeatherEvents:", e);
            }
          }

          // Check if we're taking too long
          const elapsed = performance.now() - startTime;
          if (elapsed > 50) {
            // If checks take more than 50ms
            productionWarn(
              `⚠️ [PERFORMANCE] Notification checks took ${elapsed.toFixed(2)}ms - throttling next checks`,
            );
            skipNextChecks = 2; // Skip next 2 checks (20 seconds total)
          }
        } catch (error) {
          console.error("❌ [CRITICAL] Error in notification interval:", error);
        }
      }, 15000); // OPTIMIZED: Check every 15 seconds for better performance

      // Store interval reference for cleanup
      MGA_addInterval(window.notificationInterval);

      productionLog(
        "🚨 [CRITICAL] Optimized notification timer started with performance monitoring",
      );

      // HUNGER TIMER: Update hunger countdown timers
      // PERFORMANCE OPTIMIZATION: Reduced from 1000ms to 2000ms, cache timer elements
      productionLog("🍖 [HUNGER-TIMER] Setting up hunger timer updates...");

      // Cache for timer elements (refreshed when pets tab is opened/updated)
      let cachedTimerElements = [];
      let lastTimerCacheTime = 0;
      const TIMER_CACHE_DURATION = 5000; // Refresh cache every 5 seconds

      window.hungerTimerInterval = setInterval(() => {
        try {
          const activePets =
            window.activePets || UnifiedState.atoms.activePets || [];

          // Refresh timer element cache if needed
          const now = Date.now();
          if (
            cachedTimerElements.length === 0 ||
            now - lastTimerCacheTime > TIMER_CACHE_DURATION
          ) {
            cachedTimerElements = Array.from(
              document.querySelectorAll(".mga-hunger-timer"),
            );
            lastTimerCacheTime = now;
          }

          if (UnifiedState.data.settings?.debugMode) {
            productionLog(
              "🍖 [TIMER-UPDATE] Cached timer elements:",
              cachedTimerElements.length,
            );
            productionLog("🍖 [TIMER-UPDATE] Active pets:", activePets.length);
            if (activePets.length > 0) {
              activePets.forEach((p, i) => {
                productionLog(`🍖 [TIMER-UPDATE] Pet ${i}:`, {
                  species: p.petSpecies,
                  hunger: p.hunger,
                  abilities: p.abilities,
                  strength: p.strength,
                  str: p.str,
                });
              });
            }
          }

          if (cachedTimerElements.length > 0) {
            cachedTimerElements.forEach((element) => {
              // Skip if element was removed from DOM
              if (!document.contains(element)) {
                cachedTimerElements = []; // Force cache refresh
                return;
              }

              const petIndex = parseInt(element.dataset.petIndex);
              if (petIndex >= 0 && petIndex < activePets.length) {
                const pet = activePets[petIndex];
                const timeUntilHungry = calculateTimeUntilHungry(pet);
                const timerText = formatHungerTimer(timeUntilHungry);
                const timerColor =
                  timeUntilHungry === null
                    ? "#999"
                    : timeUntilHungry <= 0
                      ? "#8B0000"
                      : timeUntilHungry < 5 * 60 * 1000
                        ? "#ff4444"
                        : timeUntilHungry < 15 * 60 * 1000
                          ? "#ffa500"
                          : "#4caf50";
                element.textContent = timerText;
                element.style.color = timerColor;
              }
            });
          }
        } catch (error) {
          console.error("❌ Error updating hunger timers:", error);
        }
      }, 2000); // OPTIMIZED: Update every 2 seconds (was 1s)

      MGA_addInterval(window.hungerTimerInterval);
      productionLog(
        "🍖 [HUNGER-TIMER] Hunger timer updates started (1s interval)",
      );

      debugLog("INTERVALS", "All intervals started with TimerManager", {
        timerCount: timerManager.activeTimers.size,
        status: timerManager.getStatus(),
      });

      // BUGFIX: Visibility-aware performance optimization (from v1.11.3)
      // Slower refresh when tab is hidden to save CPU/battery
      document.addEventListener(
        "visibilitychange",
        function () {
          const hidden = document.hidden;
          productionLog(
            `👁️ [VISIBILITY] Tab ${hidden ? "hidden" : "visible"} - adjusting intervals`,
          );

          // Adjust ability monitoring interval
          if (window.abilityMonitoringInterval) {
            clearInterval(window.abilityMonitoringInterval);
          }
          window.abilityMonitoringInterval = setInterval(
            () => {
              monitorPetAbilities();
            },
            hidden ? 5000 : 3000,
          ); // 5s when hidden, 3s when visible

          // Adjust notification interval
          if (window.notificationInterval) {
            clearInterval(window.notificationInterval);
          }
          window.notificationInterval = setInterval(
            () => {
              // ... notification logic (same as above)
              if (skipNextChecks > 0) {
                skipNextChecks--;
                return;
              }
              const currentWeather =
                window.roomState?.child?.data?.weather ||
                window.roomState?.weather ||
                null;
              const isWeatherActive =
                currentWeather &&
                currentWeather !== "none" &&
                currentWeather !== "clear";
              notificationCheckCounter++;
              if (isWeatherActive && notificationCheckCounter % 2 !== 0) return;

              const startTime = performance.now();
              try {
                try {
                  checkPetHunger();
                } catch (hungerError) {
                  console.error("Error in checkPetHunger:", hungerError);
                }
              } catch (error) {
                console.error("Critical error in notification checks:", error);
              }

              const checkDuration = performance.now() - startTime;
              if (checkDuration > 50) {
                productionLog(
                  `⏱️ [PERFORMANCE] Notification checks took ${checkDuration.toFixed(2)}ms`,
                );
                skipNextChecks = 2;
              }
            },
            hidden ? 20000 : 10000,
          ); // 20s when hidden, 10s when visible

          productionLog(
            `👁️ [VISIBILITY] Intervals adjusted for ${hidden ? "background" : "foreground"} mode`,
          );
        },
        { passive: true },
      );
    }

    // ==================== NAVIGATION HELPERS ====================
    function handleTabNavigation(e, forward) {
      const focusableElements = getFocusableElements();
      const currentIndex = focusableElements.indexOf(e.target);

      if (currentIndex === -1) return;

      const nextIndex = forward
        ? (currentIndex + 1) % focusableElements.length
        : (currentIndex - 1 + focusableElements.length) %
          focusableElements.length;

      focusableElements[nextIndex]?.focus();
    }

    function handleArrowNavigation(e, direction) {
      const focusable = getFocusableElements();
      const current = e.target;

      if (
        current.classList.contains("mga-btn") ||
        current.classList.contains("mga-tab")
      ) {
        const siblings = getSiblingsInDirection(current, direction);
        if (siblings.length > 0) {
          siblings[0].focus();
        }
      }
    }

    function getFocusableElements() {
      return Array.from(
        targetDocument.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null); // Only visible elements
    }

    function getSiblingsInDirection(element, direction) {
      const parent = element.parentElement;
      const siblings = Array.from(parent.children).filter(
        (el) => el !== element && getFocusableElements().includes(el),
      );

      // Simple directional logic - could be enhanced with position calculations
      return siblings;
    }

    function openCommandPalette(e) {
      createCommandPalette();
    }

    function openQuickSearch(e) {
      createQuickSearchOverlay();
    }

    function handleEnterKey(e) {
      const target = e.target;
      if (target.classList.contains("mga-btn")) {
        target.click();
      }
    }

    function handleSpaceKey(e) {
      const target = e.target;
      if (target.classList.contains("mga-btn")) {
        target.click();
      }
    }

    function handleEscapeKey() {
      // Close any open modals/overlays in order of priority
      const commandPalette = targetDocument.querySelector(
        "#mga-command-palette",
      );
      if (commandPalette) {
        commandPalette.remove();
        return;
      }

      const searchOverlay = targetDocument.querySelector("#mga-search-overlay");
      if (searchOverlay) {
        searchOverlay.remove();
        return;
      }

      // Close focused popout
      targetDocument.querySelectorAll(".mga-overlay").forEach((overlay) => {
        if (overlay.style.display !== "none") {
          overlay.style.display = "none";
        }
      });
    }

    function closeAllPopouts() {
      targetDocument.querySelectorAll(".mga-overlay").forEach((overlay) => {
        overlay.style.display = "none";
      });

      // Close separate windows
      UnifiedState.popoutWindows.forEach((window) => {
        try {
          window.close();
        } catch (e) {}
      });
      UnifiedState.popoutWindows.clear();
    }

    function refreshAllContent() {
      updateTabContent();
      refreshSeparateWindowPopouts();
      productionLog("🔄 All content refreshed");
    }

    function loadPetPreset(preset) {
      if (!preset || !Array.isArray(preset)) {
        productionWarn("[PETS] Invalid preset data");
        return;
      }

      // Always use SwapPet for atomic swapping (works regardless of inventory space)
      productionLog("[PETS] Using SwapPet for atomic swapping");

      preset.forEach((presetPet, i) => {
        // BUGFIX: Read current state INSIDE timeout to get fresh data after previous swaps
        // This fixes race condition where slow networks don't update activePets fast enough
        setTimeout(() => {
          // Get FRESH state each time (not stale reference from before loop)
          const currentPets =
            UnifiedState.atoms.activePets || window.activePets || [];
          const currentPet = currentPets[i];

          if (currentPet) {
            // Check if desired pet is already equipped
            if (currentPet.id === presetPet.id) {
              if (UnifiedState.data.settings?.debugMode) {
                productionLog(
                  `[PET-SWAP] Slot ${i + 1}: Already equipped (${currentPet.id}), skipping`,
                );
              }
              return; // Skip swap, pet already in place
            }

            // Swap: active pet <-> inventory pet
            if (UnifiedState.data.settings?.debugMode) {
              productionLog(
                `[PET-SWAP] Slot ${i + 1}: Swapping ${currentPet.id} → ${presetPet.id}`,
              );
            }

            safeSendMessage({
              scopePath: ["Room", "Quinoa"],
              type: "SwapPet",
              petSlotId: currentPet.id,
              petInventoryId: presetPet.id,
            });
          } else {
            // No pet in this slot, just place
            if (UnifiedState.data.settings?.debugMode) {
              productionLog(
                `[PET-SWAP] Slot ${i + 1}: Placing ${presetPet.id} (empty slot)`,
              );
            }

            safeSendMessage({
              scopePath: ["Room", "Quinoa"],
              type: "PlacePet",
              itemId: presetPet.id,
              position: { x: 17 + i * 2, y: 13 },
              localTileIndex: 64,
              tileType: "Boardwalk",
            });
          }
        }, i * 200); // Increased delay from 100ms → 200ms for network latency tolerance
      });

      productionLog(`✅ [PETS] Loaded pet preset (${preset.length} pets)`);
    }

    function loadPresetByNumber(number) {
      const presets = Object.keys(UnifiedState.data.petPresets);
      if (presets[number - 1]) {
        const presetName = presets[number - 1];
        const preset = UnifiedState.data.petPresets[presetName];
        loadPetPreset(preset);
        productionLog(`🐾 Loaded preset ${number}: ${presetName}`);
      }
    }

    function createCommandPalette() {
      // Remove existing palette
      const existing = targetDocument.querySelector("#mga-command-palette");
      if (existing) existing.remove();

      const overlay = targetDocument.createElement("div");
      overlay.id = "mga-command-palette";
      overlay.style.cssText = `
              position: fixed;
              top: 0;
              left: 0;
              width: 100vw;
              height: 100vh;
              background: rgba(0, 0, 0, 0.5);
              z-index: 20000;
              display: flex;
              align-items: flex-start;
              justify-content: center;
              padding-top: 100px;
          `;

      const palette = targetDocument.createElement("div");
      palette.style.cssText = `
              background: #1f2937;
              border: 1px solid #4b5563;
              border-radius: 8px;
              width: 500px;
              max-height: 400px;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
              overflow: hidden;
          `;

      const input = targetDocument.createElement("input");
      input.type = "text";
      input.placeholder = "Type a command...";
      input.style.cssText = `
              width: 100%;
              padding: 16px;
              background: transparent;
              border: none;
              color: white;
              font-size: 16px;
              outline: none;
          `;

      const commands = [
        {
          name: "Open Pets",
          action: () => openTabInPopout("pets"),
          key: "Alt+P",
        },
        {
          name: "Open Values",
          action: () => openTabInPopout("values"),
          key: "Alt+V",
        },
        {
          name: "Open Abilities",
          action: () => openTabInPopout("abilities"),
          key: "Alt+A",
        },
        {
          name: "Open Seeds",
          action: () => openTabInPopout("seeds"),
          key: "Alt+S",
        },
        {
          name: "Open Settings",
          action: () => openTabInPopout("settings"),
          key: "Alt+G",
        },
        {
          name: "Close All Windows",
          action: () => closeAllPopouts(),
          key: "Alt+W",
        },
        {
          name: "Refresh All Content",
          action: () => refreshAllContent(),
          key: "Alt+R",
        },
      ];

      const commandsList = targetDocument.createElement("div");
      commandsList.style.cssText = `
              max-height: 300px;
              overflow-y: auto;
          `;

      const renderCommands = (filter = "") => {
        commandsList.innerHTML = "";
        const filtered = commands.filter((cmd) =>
          cmd.name.toLowerCase().includes(filter.toLowerCase()),
        );

        filtered.forEach((cmd, index) => {
          const item = targetDocument.createElement("div");
          item.style.cssText = `
                      padding: 12px 16px;
                      color: white;
                      cursor: pointer;
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                      ${index === 0 ? "background: #374151;" : ""}
                  `;
          item.innerHTML = `
                      <span>${cmd.name}</span>
                      <span style="color: #9ca3af; font-size: 12px;">${cmd.key}</span>
                  `;

          item.addEventListener("click", () => {
            cmd.action();
            overlay.remove();
          });

          commandsList.appendChild(item);
        });
      };

      input.addEventListener("input", (e) => {
        renderCommands(e.target.value);
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          overlay.remove();
        } else if (e.key === "Enter") {
          const firstCommand = commandsList.firstElementChild;
          if (firstCommand) firstCommand.click();
        }
      });

      renderCommands();
      palette.appendChild(input);
      palette.appendChild(commandsList);
      overlay.appendChild(palette);
      targetDocument.body.appendChild(overlay);

      input.focus();
    }

    function createQuickSearchOverlay() {
      // Remove existing search
      const existing = targetDocument.querySelector("#mga-search-overlay");
      if (existing) existing.remove();

      const overlay = targetDocument.createElement("div");
      overlay.id = "mga-search-overlay";
      overlay.style.cssText = `
              position: fixed;
              top: 20px;
              right: 20px;
              background: #1f2937;
              border: 1px solid #4b5563;
              border-radius: 8px;
              padding: 16px;
              z-index: 15000;
              width: 300px;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
          `;

      const input = targetDocument.createElement("input");
      input.type = "text";
      input.placeholder = "Search content...";
      input.style.cssText = `
              width: 100%;
              padding: 8px;
              background: #374151;
              border: 1px solid #4b5563;
              border-radius: 4px;
              color: white;
              outline: none;
          `;

      const results = targetDocument.createElement("div");
      results.style.cssText = `
              margin-top: 8px;
              max-height: 200px;
              overflow-y: auto;
          `;

      input.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        if (query.length < 2) {
          results.innerHTML = "";
          return;
        }

        // Search through all content
        const searchResults = searchAllContent(query);
        results.innerHTML = searchResults
          .map(
            (result) => `
                  <div style="padding: 8px; cursor: pointer; border-radius: 4px; margin: 4px 0;"
                       onmouseover="this.style.background='#374151'"
                       onmouseout="this.style.background='transparent'"
                       onclick="window.${result.action}">
                      <div style="color: #60a5fa; font-size: 12px;">${result.tab}</div>
                      <div style="color: white; font-size: 14px;">${result.title}</div>
                      <div style="color: #9ca3af; font-size: 11px;">${result.preview}</div>
                  </div>
              `,
          )
          .join("");
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          overlay.remove();
        }
      });

      overlay.appendChild(input);
      overlay.appendChild(results);
      targetDocument.body.appendChild(overlay);

      input.focus();
    }

    // ==================== CROP HIGHLIGHTING SYSTEM ====================
    // Ctrl+H clears highlights, UI in settings for crop highlighting
    function setupCropHighlightingSystem() {
      productionLog(
        "🌱 [DEBUG] setupCropHighlightingSystem() called - setting up crop highlighting...",
      );
      // FIRST: Verify crop highlighting utilities are installed
      if (typeof window.removeAllTileOverrides !== "function") {
        debugLog(
          "CROP_HIGHLIGHT",
          "Crop highlighting utilities not available - they should have been installed earlier",
        );
      } else {
        debugLog(
          "CROP_HIGHLIGHT",
          "Crop highlighting utilities confirmed available",
        );
      }

      if (window.__cropHighlightInstalled) {
        debugLog(
          "CROP_HIGHLIGHT",
          "Crop highlighting system already installed",
        );
        return;
      }

      function cropHighlightHandler(e) {
        // Ctrl+H clears all highlights
        if (e.ctrlKey && e.key === "h") {
          e.preventDefault();
          e.stopPropagation();

          try {
            if (typeof window.removeAllTileOverrides === "function") {
              window.removeAllTileOverrides();
              debugLog(
                "CROP_HIGHLIGHT",
                "Ctrl+H → cleared all tile highlights",
              );
            } else {
              debugLog(
                "CROP_HIGHLIGHT",
                "removeAllTileOverrides function not available",
              );
            }
          } catch (err) {
            debugError("CROP_HIGHLIGHT", "Failed to clear highlights", err);
          }
        }
      }

      window.addEventListener("keydown", cropHighlightHandler, true);
      window.__cropHighlightInstalled = true;
      debugLog("CROP_HIGHLIGHT", "Ctrl+H crop highlight hotkey installed");
    }

    // Crop highlighting function moved to settings section (line 5505) to avoid duplication

    function searchAllContent(query) {
      const results = [];
      const tabs = [
        "pets",
        "abilities",
        "seeds",
        "values",
        "timers",
        "settings",
      ];

      tabs.forEach((tab) => {
        // Mock search results - in real implementation would search actual content
        if (tab.includes(query)) {
          results.push({
            tab: tab.charAt(0).toUpperCase() + tab.slice(1),
            title: `${tab.charAt(0).toUpperCase() + tab.slice(1)} Tab`,
            preview: `Open the ${tab} management interface`,
            action: `openTabInPopout('${tab}')`,
          });
        }
      });

      return results;
    }

    // ==================== KEYBOARD SHORTCUTS ====================
    function initializeKeyboardShortcuts() {
      const shortcuts = {
        // Panel Management
        // NOTE: Alt+M is handled by setupToolbarToggle() in TEST VERSION - disabled here to prevent conflict
        /* 'Alt+M': () => {
          const panel = UnifiedState.panels.main;
          if (panel) {
            const isVisible = panel.style.display !== 'none';
            panel.style.display = isVisible ? 'none' : 'block';

            // Hide any stuck tooltips when panel is toggled via keyboard
            if (window.MGA_Tooltips && window.MGA_Tooltips.hide) {
              window.MGA_Tooltips.hide();
            }

            UnifiedState.data.settings.panelVisible = !isVisible;
            productionLog(`🎮 MGA Keyboard shortcut: Panel ${isVisible ? 'hidden' : 'shown'}`);
          }
        }, */

        // Quick Tab Access
        "Alt+V": () => openTabInPopout("values"),
        "Alt+P": () => openTabInPopout("pets"),
        "Alt+A": () => openTabInPopout("abilities"),
        "Alt+T": () => openTabInPopout("timers"),
        "Alt+S": () => openTabInPopout("seeds"),
        "Alt+G": () => openTabInPopout("settings"),

        // Navigation
        Tab: (e) => handleTabNavigation(e, true),
        "Shift+Tab": (e) => handleTabNavigation(e, false),
        ArrowUp: (e) => handleArrowNavigation(e, "up"),
        ArrowDown: (e) => handleArrowNavigation(e, "down"),
        ArrowLeft: (e) => handleArrowNavigation(e, "left"),
        ArrowRight: (e) => handleArrowNavigation(e, "right"),

        // Quick Actions
        "Ctrl+K": (e) => openCommandPalette(e),
        "Ctrl+F": (e) => openQuickSearch(e),
        "Ctrl+B": () => toggleShopWindows(),
        Enter: (e) => handleEnterKey(e),
        Space: (e) => handleSpaceKey(e),

        // Window Management
        Escape: () => handleEscapeKey(),
        "Alt+W": () => closeAllPopouts(),
        "Alt+R": () => refreshAllContent(),

        // Quick Pet Actions
        "Shift+1": () => loadPresetByNumber(1),
        "Shift+2": () => loadPresetByNumber(2),
        "Shift+3": () => loadPresetByNumber(3),
        "Shift+4": () => loadPresetByNumber(4),
        "Shift+5": () => loadPresetByNumber(5),

        // Crop Highlighting
        "Ctrl+H": () => clearCropHighlighting(),
        "Ctrl+Shift+H": () => {
          // Open settings tab and focus on crop highlighting section
          UnifiedState.activeTab = "settings";
          updateTabContent();
          setTimeout(() => {
            const highlightSection = targetDocument.querySelector(
              "#highlight-species-select",
            );
            if (highlightSection) {
              highlightSection.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
              highlightSection.focus();
            }
          }, 100);
          productionLog("🌱 Opened crop highlighting settings");
        },
      };

      document.addEventListener("keydown", (e) => {
        // BUGFIX v3.7.5: Ignore controller-generated keyboard events to prevent conflicts
        if (!e.isTrusted) return;
        // Skip if typing in input/textarea or contenteditable
        if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) {
          return;
        }
        // Skip if typing in contenteditable element (chat, etc.)
        if (
          e.target.isContentEditable ||
          e.target.getAttribute?.("contenteditable") === "true"
        ) {
          return;
        }
        // Skip if active element is an input (chat focus)
        if (
          document.activeElement &&
          (document.activeElement.tagName === "INPUT" ||
            document.activeElement.tagName === "TEXTAREA" ||
            document.activeElement.isContentEditable)
        ) {
          return;
        }

        const key = [];
        if (e.altKey) key.push("Alt");
        if (e.ctrlKey) key.push("Ctrl");
        if (e.shiftKey) key.push("Shift");

        // Special key handling
        if (e.key === "Escape") key.push("Escape");
        else if (e.key === "Tab") key.push("Tab");
        else if (e.key === "Enter") key.push("Enter");
        else if (e.key === " ") key.push("Space");
        else if (e.key.startsWith("Arrow")) key.push(e.key);
        else if (e.key.length === 1) key.push(e.key.toUpperCase());

        const shortcut = key.join("+");
        if (shortcuts[shortcut]) {
          e.preventDefault();
          shortcuts[shortcut](e);
        }
      });

      productionLog(
        "⌨️ Keyboard shortcuts initialized:",
        Object.keys(shortcuts),
      );
    }

    // ==================== LOCAL TELEPORT UTILITIES ====================
    // Install window.localTeleport function for client-side position updates
    function installLocalTeleport() {
      if (window.localTeleport && window.localTeleport.__installed) {
        debugLog("TELEPORT", "localTeleport already installed");
        return;
      }

      window.localTeleport = async function localTeleport(x, y, opts = {}) {
        const timeout = typeof opts.timeout === "number" ? opts.timeout : 3000;

        // 1) Prefer built-in PlayerService if available (clean)
        try {
          const PS =
            targetWindow.PlayerService ||
            (targetWindow.Quinoa && targetWindow.Quinoa.PlayerService) ||
            null;
          if (PS && typeof PS.setPosition === "function") {
            await PS.setPosition(x, y);
            targetWindow.MagicCircle_RoomConnection.sendMessage({
              scopePath: ["Room", "Quinoa"],
              type: "PlayerPosition",
              position: {
                x: x,
                y: y,
              },
            });
            try {
              globalThis.__lastLocalTeleport = { x, y, at: Date.now() };
            } catch (e) {}
            return { ok: true, x, y, method: "PlayerService.setPosition" };
          }
        } catch (e) {
          // ignore and continue to fallback
        }

        // 2) Fallback: use jotai atom cache capture technique (captures store.set)
        try {
          const cache = targetWindow.jotaiAtomCache?.cache;
          if (!cache)
            return { ok: false, error: "jotaiAtomCache.cache not found" };

          // find positionAtom
          let positionAtom = null;
          for (const a of cache.values()) {
            const lbl = a?.debugLabel || a?.label || "";
            if (String(lbl) === "positionAtom") {
              positionAtom = a;
              break;
            }
          }
          if (!positionAtom)
            return { ok: false, error: "positionAtom not found in atom cache" };

          // capture set by temporarily wrapping write functions
          let capturedSet = null;
          const patched = [];
          try {
            for (const atom of cache.values()) {
              if (!atom || typeof atom.write !== "function") continue;
              const orig = atom.write;
              // avoid double-wrap
              if (atom.__lt_origWrite) {
                patched.push(atom);
                continue;
              }

              atom.__lt_origWrite = orig;
              atom.write = function (get, set, ...args) {
                if (!capturedSet) {
                  capturedSet = set;
                  // restore patched writes immediately after capture (so we don't keep wrappers)
                  for (const p of patched) {
                    if (p.__lt_origWrite) {
                      try {
                        p.write = p.__lt_origWrite;
                      } catch (e) {}
                      try {
                        delete p.__lt_origWrite;
                      } catch (e) {}
                    }
                  }
                }
                return orig.call(this, get, set, ...args);
              };
              patched.push(atom);
            }

            // trigger the app to call writes (same trick used before)
            try {
              globalThis.dispatchEvent?.(new Event("visibilitychange"));
            } catch (e) {}

            // wait for capture (short loop)
            const until = Date.now() + timeout;
            while (!capturedSet && Date.now() < until) {
              await new Promise((r) => setTimeout(r, 40));
            }
          } finally {
            // restore any remaining patched atoms
            for (const p of patched) {
              if (p.__lt_origWrite) {
                try {
                  p.write = p.__lt_origWrite;
                } catch (e) {}
                try {
                  delete p.__lt_origWrite;
                } catch (e) {}
              }
            }
          }

          if (!capturedSet)
            return {
              ok: false,
              error: "Could not capture store.set from atom writes (timeout)",
            };

          // perform the local-only set (this does NOT send teleport packet)
          try {
            capturedSet(positionAtom, { x, y });
            try {
              globalThis.__lastLocalTeleport = { x, y, at: Date.now() };
            } catch (e) {}
            return { ok: true, x, y, method: "jotai-capture" };
          } catch (err) {
            return { ok: false, error: "capturedSet failed: " + String(err) };
          }
        } catch (err) {
          return { ok: false, error: "unexpected error: " + String(err) };
        }
      };

      window.localTeleport.__installed = true;
      debugLog("TELEPORT", "localTeleport(x,y) installed on window");
    }

    // ==================== TELEPORT SYSTEM ====================
    function initializeTeleportSystem() {
      productionLog(
        "🚀 [DEBUG] initializeTeleportSystem() called - setting up teleport system...",
      );
      // FIRST: Install window.localTeleport if not already installed
      if (
        typeof window.localTeleport !== "function" ||
        !window.localTeleport.__installed
      ) {
        installLocalTeleport();
      }

      if (window.__altSlotTeleportInstalled) {
        debugLog("TELEPORT", "Alt-slot teleport hotkeys already installed");
        return;
      }

      async function teleportHandler(e) {
        if (!e.altKey) return;
        const num = parseInt(e.key, 10);
        if (!(num >= 1 && num <= 6)) return;

        e.preventDefault();
        e.stopPropagation();

        try {
          const slots =
            targetWindow.MagicCircle_RoomConnection?.lastRoomStateJsonable
              ?.child?.data?.userSlots;
          if (!Array.isArray(slots)) {
            productionWarn("⚠️ userSlots not found in room state");
            return;
          }

          const slot = slots[num - 1];
          const pos = slot?.position;
          if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") {
            productionWarn(`⚠️ userSlots[${num - 1}] has no valid position`);
            return;
          }

          productionLog(
            `🎯 TELEPORTING Alt+${num} to userSlots[${num - 1}] @ (${pos.x}, ${pos.y})`,
          );

          let clientUpdateSuccess = false;
          let serverSyncSuccess = false;

          // Method 1: CLIENT-SIDE POSITION UPDATE (using jotai atom access)
          try {
            productionLog(
              `🔧 CLIENT: Updating local position via jotai atoms...`,
            );

            // Method 1A: Try jotaiAtomCache for player position
            if (targetWindow.jotaiAtomCache) {
              productionLog(
                `🔍 CLIENT: Searching jotaiAtomCache for player position atom...`,
              );

              // Common player position atom paths to try
              const playerPositionPaths = [
                "/home/runner/work/magiccircle.gg/magiccircle.gg/client/src/games/Quinoa/atoms/myAtoms.ts/myPositionAtom",
                "/home/runner/work/magiccircle.gg/magiccircle.gg/client/src/games/Quinoa/atoms/myAtoms.ts/playerPositionAtom",
                "/home/runner/work/magiccircle.gg/magiccircle.gg/client/src/games/Quinoa/atoms/playerAtoms.ts/myPositionAtom",
              ];

              let playerPositionAtom = null;
              for (const atomPath of playerPositionPaths) {
                const atom = targetWindow.jotaiAtomCache.get(atomPath);
                if (atom) {
                  productionLog(
                    `✅ CLIENT: Found player position atom at: ${atomPath}`,
                  );
                  playerPositionAtom = atom;
                  break;
                }
              }

              // If we found the atom, try to use it
              if (playerPositionAtom && playerPositionAtom.write) {
                try {
                  // Try to get the jotai store from window
                  const store = targetWindow.jotaiStore || targetWindow.store;
                  if (store && store.set) {
                    await store.set(playerPositionAtom, { x: pos.x, y: pos.y });
                    clientUpdateSuccess = true;
                    productionLog(
                      `✅ CLIENT: jotai atom position update successful to (${pos.x}, ${pos.y})`,
                    );
                  } else {
                    productionLog(
                      `⚠️ CLIENT: Found atom but no jotai store available`,
                    );
                  }
                } catch (atomError) {
                  productionLog(
                    `❌ CLIENT: jotai atom update failed:`,
                    atomError,
                  );
                }
              } else {
                productionLog(
                  `❌ CLIENT: No player position atom found in jotaiAtomCache`,
                );

                // Debug: List available atoms
                if (UnifiedState.data.settings.debugMode) {
                  productionLog(
                    `🔍 CLIENT: Available atoms in cache:`,
                    Array.from(targetWindow.jotaiAtomCache.keys()).filter(
                      (key) =>
                        key.includes("position") ||
                        key.includes("Position") ||
                        key.includes("player") ||
                        key.includes("Player"),
                    ),
                  );
                }
              }
            }

            // Method 1B: Try direct Atoms access (from reference script)
            if (!clientUpdateSuccess && window.Atoms?.player?.position?.set) {
              await window.Atoms.player.position.set({ x: pos.x, y: pos.y });
              clientUpdateSuccess = true;
              productionLog(
                `✅ CLIENT: Atoms.player.position.set successful to (${pos.x}, ${pos.y})`,
              );
            }

            // Method 1C: Fallback to existing localTeleport
            if (
              !clientUpdateSuccess &&
              typeof window.localTeleport === "function"
            ) {
              const res = await window.localTeleport(pos.x, pos.y);
              if (res?.ok) {
                clientUpdateSuccess = true;
                productionLog(
                  `✅ CLIENT: window.localTeleport successful to (${pos.x}, ${pos.y})`,
                );
              }
            }

            // Method 1D: Fallback to PlayerService
            if (!clientUpdateSuccess) {
              const PS =
                targetWindow.PlayerService ||
                targetWindow.Quinoa?.PlayerService;
              if (PS?.setPosition) {
                await PS.setPosition(pos.x, pos.y);
                clientUpdateSuccess = true;
                productionLog(
                  `✅ CLIENT: PlayerService.setPosition successful to (${pos.x}, ${pos.y})`,
                );
              }
            }

            if (!clientUpdateSuccess) {
              productionLog(
                `❌ CLIENT: All client-side position update methods failed`,
              );
              productionLog(`🔍 CLIENT: Available globals:`, {
                jotaiAtomCache: !!targetWindow.jotaiAtomCache,
                windowAtoms: !!window.Atoms,
                localTeleport: typeof window.localTeleport,
                PlayerService: !!(
                  targetWindow.PlayerService ||
                  targetWindow.Quinoa?.PlayerService
                ),
              });
            }
          } catch (error) {
            productionLog(
              `❌ CLIENT: Client-side position update failed:`,
              error,
            );
          }

          // Method 2: SERVER SYNC (using reference script pattern)
          try {
            productionLog(`🌐 SERVER: Syncing position for multiplayer...`);

            // Use the proven working pattern: sendToGame with "Teleport" type
            const teleportSuccess = sendToGame({
              type: "Teleport",
              position: { x: pos.x, y: pos.y },
            });

            if (teleportSuccess) {
              serverSyncSuccess = true;
              productionLog(`✅ SERVER: Teleport message sent successfully`);
            } else {
              // Fallback to PlayerPosition message
              productionLog(`🔄 SERVER: Trying PlayerPosition fallback...`);
              const fallbackSuccess = sendToGame({
                type: "PlayerPosition",
                position: { x: pos.x, y: pos.y },
              });

              if (fallbackSuccess) {
                serverSyncSuccess = true;
                productionLog(`✅ SERVER: PlayerPosition fallback successful`);
              }
            }

            if (!serverSyncSuccess) {
              productionLog(`❌ SERVER: All server sync methods failed`);
            }
          } catch (error) {
            productionLog(`❌ SERVER: Server sync failed:`, error);
          }

          // FINAL STATUS REPORT
          productionLog(`🎯 TELEPORT RESULT for Alt+${num}:`);
          productionLog(
            `   👤 Client Update: ${clientUpdateSuccess ? "✅ SUCCESS" : "❌ FAILED"}`,
          );
          productionLog(
            `   🌐 Server Sync: ${serverSyncSuccess ? "✅ SUCCESS" : "❌ FAILED"}`,
          );

          if (clientUpdateSuccess && serverSyncSuccess) {
            productionLog(
              `🎉 COMPLETE SUCCESS: Player teleported to (${pos.x}, ${pos.y})!`,
            );
            debugLog(
              "TELEPORT",
              `Complete teleport success for Alt+${num} to userSlots[${num - 1}] @ (${pos.x}, ${pos.y})`,
            );
          } else if (clientUpdateSuccess) {
            productionWarn(
              `⚠️ PARTIAL: You moved but others may not see it (server sync failed)`,
            );
          } else if (serverSyncSuccess) {
            productionWarn(
              `⚠️ PARTIAL: Server updated but you didn't move visually (client update failed)`,
            );
          } else {
            console.error(
              `❌ TOTAL FAILURE: Neither client nor server teleport worked`,
            );
          }
        } catch (err) {
          console.error("❌ Alt-slot teleport error:", err);
          debugError("TELEPORT", "Alt-slot teleport error", err);
        }
      }

      window.addEventListener("keydown", teleportHandler, true);
      window.__altSlotTeleportInstalled = true;
      productionLog("🚀 Alt+1..Alt+6 teleport hotkeys installed");
      debugLog("TELEPORT", "Teleport system initialized successfully");
    }

    // ==================== STANDALONE INITIALIZATION ====================
    function initializeStandalone() {
      if (UnifiedState.initialized) {
        productionLog(
          "⚠️ Magic Garden Unified Assistant already initialized, skipping...",
        );
        return;
      }

      productionLog("🎮 Magic Garden Assistant - Demo Mode");
      productionLog("💡 Running in standalone mode with demo data");
      productionLog(
        "📝 Note: This is a demonstration - no real game integration",
      );

      // Ensure DOM is ready
      if (document.readyState === "loading") {
        productionLog("⏳ DOM not ready, waiting for DOMContentLoaded...");
        document.addEventListener("DOMContentLoaded", initializeStandalone);
        return;
      }

      try {
        // Initialize demo data
        const demoData = createDemoData();

        // Populate UnifiedState with demo data
        UnifiedState.atoms.inventory = demoData.inventory;
        UnifiedState.atoms.myGarden = {
          garden: {
            tileObjects: generateDemoTiles(demoData.garden.readyTiles),
          },
        };
        UnifiedState.atoms.friendBonus = 1.2; // Demo bonus
        // Demo data disabled - only use real ability logs from users actual gameplay
        // UnifiedState.data.petAbilityLogs = demoData.abilityLogs;
        logDebug(
          "DEMO",
          "📝 Skipping demo ability logs injection - using real logs only",
        );
        UnifiedState.data.timers = demoData.timers;

        // Load saved data (or use defaults)
        productionLog("💾 Loading saved settings...");
        loadSavedData();

        // Create UI with demo banner
        productionLog("🎨 Creating Demo UI...");
        // Clean up any corrupted dock position data before creating UI
        cleanupCorruptedDockPosition();
        createUnifiedUI();

        // TEST VERSION: Add UI health check and Alt+M toggle
        ensureUIHealthy();
        setupToolbarToggle();
        setupDockSizeControl();

        addDemoBanner();

        // Setup demo timers
        productionLog("⏰ Setting up demo timers...");
        setupDemoTimers();

        // Mark as initialized
        UnifiedState.initialized = true;
        productionLog(
          "✅ Magic Garden Assistant Demo initialized successfully!",
        );
        productionLog(
          "🎯 Try the features - they work with realistic demo data",
        );
      } catch (error) {
        console.error("❌ Failed to initialize demo mode:", error);
        debugError("STANDALONE_INIT", "Demo initialization failed", error);
        UnifiedState.initialized = false;
      }
    }

    function generateDemoTiles(count) {
      const tiles = {};
      const species = ["Carrot", "Apple", "Banana", "Lily", "Dragon Fruit"];

      for (let i = 0; i < count; i++) {
        tiles[i] = {
          objectType: "plant",
          slots: [
            {
              species: species[i % species.length],
              endTime: Date.now() - 1000, // Ready for harvest
              targetScale: 1 + Math.random() * 0.5, // Random scale
              mutations: i % 3 === 0 ? ["Gold"] : [], // Some have mutations
            },
          ],
        };
      }

      return tiles;
    }

    function addDemoBanner() {
      // Add a demo mode banner to the main panel
      const panel = UnifiedState.panels.main;
      if (!panel) return;

      const banner = targetDocument.createElement("div");
      banner.style.cssText = `
              background: linear-gradient(90deg, #3b82f6, #8b5cf6);
              color: white;
              text-align: center;
              padding: 6px 12px;
              font-size: 11px;
              font-weight: 600;
              position: relative;
              margin: -1px -1px 8px -1px;
              border-radius: 6px 6px 0 0;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.30);
          `;
      banner.innerHTML =
        "🎮 DEMO MODE - Showcasing full functionality with sample data";

      // Insert banner at the top of the panel
      const header = panel.querySelector(".mga-header");
      if (header) {
        panel.insertBefore(banner, header.nextSibling);
      }
    }

    function setupDemoTimers() {
      // Start demo timer countdown
      const timerManager = globalTimerManager || initializeTimerManager();

      timerManager.startTimer("demo-timer", 1000, () => {
        // Update demo timers
        if (UnifiedState.data.timers.seed > 0) UnifiedState.data.timers.seed--;
        if (UnifiedState.data.timers.egg > 0) UnifiedState.data.timers.egg--;
        if (UnifiedState.data.timers.tool > 0) UnifiedState.data.timers.tool--;

        // Update timer displays
        updateTimerDisplay();
      });
    }

