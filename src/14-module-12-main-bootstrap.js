    /* ============================================================================
     * 12. INITIALIZATION MODULE - MAIN BOOTSTRAP
     * ============================================================================
     * Main script initialization and startup sequence
     */

    /**
     * Main script initialization function
     * Bootstraps all modules and starts the application
     * @function initializeScript
     * @returns {void}
     */
    function initializeScript() {
      // DEBUG: Log initialization attempt
      if (window.MGA_DEBUG) {
        window.MGA_DEBUG.logStage("INITIALIZE_SCRIPT_CALLED", {
          initialized: UnifiedState.initialized,
          domState: document.readyState,
          retryAttempt: window.MGA_initRetryCount || 0,
        });
      }

      if (UnifiedState.initialized) {
        productionLog(
          "⚠️ Magic Garden Unified Assistant already initialized, skipping...",
        );
        if (window.MGA_DEBUG) {
          window.MGA_DEBUG.logStage("ALREADY_INITIALIZED", {
            skipReason: "UnifiedState.initialized is true",
          });
        }
        return;
      }

      // Ensure DOM is ready
      if (document.readyState === "loading") {
        productionLog("⏳ DOM not ready, waiting for DOMContentLoaded...");
        if (window.MGA_DEBUG) {
          window.MGA_DEBUG.logStage("DOM_NOT_READY", {
            domState: document.readyState,
          });
        }
        document.addEventListener("DOMContentLoaded", initializeScript);
        return;
      }

      // REMOVED: Modal check - was causing false positives and infinite retry loops

      // Improved initialization timing to prevent splash screen stall
      productionLog("⏳ Waiting for game initialization to complete...");
      let retryCount = 0;
      const maxRetries = 3;
      // CRITICAL FIX: If game is already ready, don't delay! Only delay if we need to retry
      const gameAlreadyReady =
        (targetWindow.jotaiAtomCache?.cache || targetWindow.jotaiAtomCache) &&
        targetWindow.MagicCircle_RoomConnection;
      const initialDelay = gameAlreadyReady ? 0 : 2000;

      const attemptInit = () => {
        // Check if game is ready
        const gameReadiness = {
          jotaiAtomCache: !!targetWindow.jotaiAtomCache,
          magicCircleConnection: !!targetWindow.MagicCircle_RoomConnection,
          jotaiType: typeof targetWindow.jotaiAtomCache,
          connectionType: typeof targetWindow.MagicCircle_RoomConnection,
        };

        if (window.MGA_DEBUG) {
          window.MGA_DEBUG.logStage("GAME_READINESS_CHECK", {
            retryCount,
            maxRetries,
            gameReadiness,
            timestamp: performance.now(),
          });
        }

        if (
          targetWindow.jotaiAtomCache &&
          targetWindow.MagicCircle_RoomConnection
        ) {
          productionLog("✅ Game ready, initializing script...");
          if (window.MGA_DEBUG) {
            window.MGA_DEBUG.logStage("GAME_READY", gameReadiness);
            // Safe performance metric setting
            if (window.MGA_DEBUG.performanceMetrics) {
              window.MGA_DEBUG.performanceMetrics.gameReady = performance.now();
            }
          }
          continueInitialization();
        } else if (retryCount < maxRetries) {
          retryCount++;
          productionLog(
            `⏳ Game not ready (jotaiAtomCache: ${!!targetWindow.jotaiAtomCache}, RoomConnection: ${!!targetWindow.MagicCircle_RoomConnection}), retry ${retryCount}/${maxRetries} in 1s...`,
          );
          if (window.MGA_DEBUG) {
            window.MGA_DEBUG.logStage("GAME_NOT_READY_RETRYING", {
              retryCount,
              gameReadiness,
            });
          }
          setTimeout(attemptInit, 1000);
        } else {
          productionWarn("⚠️ Max retries reached, initializing anyway...");
          if (window.MGA_DEBUG) {
            window.MGA_DEBUG.logStage("MAX_RETRIES_REACHED", {
              retryCount,
              gameReadiness,
            });
          }
          continueInitialization();
        }
      };

      setTimeout(attemptInit, initialDelay);

      // CRITICAL: Ensure intervals start even if initialization partially fails
      setTimeout(() => {
        if (
          typeof window.notificationInterval === "undefined" ||
          !window._mgaIntervalsStarted
        ) {
          productionWarn(
            "⚠️ [FAILSAFE] Intervals not started after 30s, forcing start...",
          );
          try {
            if (typeof startIntervals === "function") {
              startIntervals();
              productionLog("✅ [FAILSAFE] Successfully started intervals");
            } else {
              console.error("❌ [FAILSAFE] startIntervals function not found!");
            }
          } catch (e) {
            console.error("❌ [FAILSAFE] Could not start intervals:", e);
          }
        } else {
          productionLog(
            "✅ [FAILSAFE] Intervals already running, no action needed",
          );
        }
      }, 30000); // Failsafe after 30 seconds

      function continueInitialization() {
        productionLog("🌱 Magic Garden Unified Assistant initializing...");
        productionLog(
          "📊 Connection Status:",
          targetWindow.MagicCircle_RoomConnection
            ? "✅ Available"
            : "❌ Not found",
        );

        if (window.MGA_DEBUG) {
          window.MGA_DEBUG.logStage("CONTINUE_INITIALIZATION", {
            connectionStatus: !!targetWindow.MagicCircle_RoomConnection,
            jotaiStatus: !!targetWindow.jotaiAtomCache,
            domState: document.readyState,
            timestamp: performance.now(),
          });
        }

        // ==================== IDLE PREVENTION MOVED ====================
        // NOTE: Idle prevention code has been moved to line ~380 to execute immediately
        // This ensures the game doesn't kick users out while the script loads
        productionLog(
          "📝 [IDLE-PREVENTION] Idle prevention already applied at script start",
        );

        try {
          // Load saved data
          productionLog("💾 Loading saved data...");
          loadSavedData();
          if (typeof syncKeepAliveAudio === "function") {
            syncKeepAliveAudio();
          }

          // Room polling handled by anonymous IIFE system (lines 28200-28365)
          // This system already polls all rooms including Discord rooms

          // ==================== SORT INVENTORY BUTTON (FIX ISSUE D) ====================

          // FIX BUG #1: Full autosort.txt implementation (v3.8.6) - replaces stub

          // ==================== INSTANT FEED BUTTONS ====================
          // Pet species and their compatible crops (from game data)
          const PET_FEED_CATALOG = {
            Worm: ["Carrot", "Strawberry", "Aloe", "Tomato", "Apple"],
            Snail: ["Blueberry", "Tomato", "Corn", "Daffodil", "Chrysanthemum"],
            Bee: [
              "Strawberry",
              "Blueberry",
              "Chrysanthemum",
              "Daffodil",
              "Lily",
            ],
            Chicken: ["Aloe", "Corn", "Watermelon", "Pumpkin"],
            Bunny: [
              "Carrot",
              "Strawberry",
              "Blueberry",
              "OrangeTulip",
              "Apple",
            ],
            Dragonfly: ["Apple", "OrangeTulip", "Echeveria"],
            Pig: ["Watermelon", "Pumpkin", "Mushroom", "Bamboo"],
            Cow: ["Coconut", "Banana", "BurrosTail", "Mushroom"],
            Turkey: ["FavaBean", "Corn", "Squash"],
            SnowFox: ["Echeveria", "Squash", "Grape"],
            Stoat: ["Banana", "Pepper", "Cactus"],
            Caribou: ["Camellia", "BurrosTail", "Mushroom"],
            Squirrel: ["Pumpkin", "Banana", "Grape"],
            Turtle: ["Watermelon", "BurrosTail", "Bamboo", "Pepper"],
            Goat: ["Pumpkin", "Coconut", "Pepper", "Camellia", "PassionFruit"],
            Butterfly: ["Daffodil", "Lily", "Grape", "Lemon", "Sunflower"],
            Peacock: ["Cactus", "Sunflower", "Lychee"],
            Capybara: ["Lemon", "PassionFruit", "DragonFruit", "Lychee"],
            Copycat: [],
          };

          // Safely derive the inventory item id the server expects
          const getInventoryItemId = (item) =>
            item?.itemId ?? item?.inventoryItemId ?? item?.id ?? null;

          // Create instant feed button with game-native styling
          const createInstantFeedButton = function (petIndex) {
            const btn = targetDocument.createElement("button");
            btn.className = "mgtools-instant-feed-btn";
            btn.textContent = "Feed"; // Always start with "Feed" text
            btn.setAttribute("data-pet-index", petIndex);
            btn.setAttribute("data-cooldown", "false"); // Track cooldown state

            // FIX ISSUE B: Check if feed buttons should be hidden
            const shouldHide = UnifiedState.data.settings.hideFeedButtons;

            // Use ABSOLUTE positioning relative to pet panel container
            // This scales with zoom and hides when container is hidden
            btn.style.cssText = `
                      position: absolute !important;
                      right: -50px !important;
                      top: 50% !important;
                      transform: translateY(-50%) !important;
                      width: 48px !important;
                      height: 24px !important;
                      border: 2px solid #FFC83D !important;
                      background: rgba(0, 0, 0, 0.75) !important;
                      color: rgb(205, 200, 193) !important;
                      border-radius: 6px !important;
                      font-size: 11px !important;
                      font-weight: bold !important;
                      cursor: pointer !important;
                      z-index: 9999 !important;
                      transition: all 0.2s ease !important;
                      pointer-events: auto !important;
                      display: ${shouldHide ? "none" : "block"} !important;
                      visibility: visible !important;
                      opacity: 1 !important;
                  `;

            btn.addEventListener("mouseenter", () => {
              btn.style.setProperty(
                "box-shadow",
                "0 0 8px rgba(255, 200, 61, 0.6)",
                "important",
              );
              btn.style.setProperty(
                "transform",
                "translateY(-50%) scale(1.05)",
                "important",
              );
            });

            btn.addEventListener("mouseleave", () => {
              btn.style.setProperty("box-shadow", "none", "important");
              btn.style.setProperty(
                "transform",
                "translateY(-50%) scale(1)",
                "important",
              );
            });

            btn.addEventListener("click", (e) => {
              e.preventDefault();
              e.stopPropagation();
              // eslint-disable-next-line no-use-before-define -- definition below; function wired via event listener
              handleInstantFeed(petIndex, btn);
            });

            return btn;
          };

          // Track used crop IDs to avoid feeding same crop twice
          const usedCropIds = new Set();

          // Visual feedback for feed action
          const flashButton = function (btn, type) {
            const color = type === "success" ? "#4CAF50" : "#F44336";
            const originalBorder = btn.style.borderColor;
            const originalShadow = btn.style.boxShadow;

            btn.style.borderColor = color;
            btn.style.boxShadow = `0 0 10px ${color}`;

            setTimeout(() => {
              btn.style.borderColor = originalBorder || "#FFC83D";
              btn.style.boxShadow = originalShadow || "none";
            }, 300);
          };

          // Handle instant feed logic with auto-favorite protection (ASYNC)
          // SIMPLE INSTANT FEED - Just like native button
          const handleInstantFeed = async function (petIndex, buttonEl) {
            if (buttonEl.disabled) return;

            // Show loading state AFTER click (not before)
            buttonEl.disabled = true;
            buttonEl.textContent = "...";
            buttonEl.style.opacity = "0.6";

            try {
              // FIX ISSUE A: 3-tier fallback for pet data
              let pet = null;

              // Tier 1: Try Jotai atom cache (only need cache, not store!)
              if (targetWindow.jotaiAtomCache) {
                try {
                  const freshPetSlots = await getAtomValue(
                    "myPrimitivePetSlotsAtom",
                  );
                  if (freshPetSlots?.[petIndex]) {
                    pet = freshPetSlots[petIndex];
                    productionLog(
                      "[MGTOOLS-FIX-A] Using fresh pet data from Jotai atom cache (Tier 1)",
                    );
                  }
                } catch (e) {
                  console.warn(
                    "[MGTOOLS-FIX-A] Tier 1 (atom cache) failed:",
                    e.message,
                  );
                }
              }

              // Tier 2: UnifiedState atoms (updated by subscriptions)
              if (!pet && UnifiedState.atoms.activePets?.[petIndex]) {
                pet = UnifiedState.atoms.activePets[petIndex];
                productionLog(
                  "[MGTOOLS-FIX-A] Using UnifiedState atoms (Tier 2)",
                );
              }

              // Tier 3: window.myData (game global)
              if (!pet && targetWindow.myData?.petSlots?.[petIndex]) {
                pet = targetWindow.myData.petSlots[petIndex];
                productionLog("[MGTOOLS-FIX-A] Using window.myData (Tier 3)");
              }

              if (!pet) {
                console.error(
                  "[MGTOOLS-FIX-A] ❌ No pet data available from any source",
                );
                alert(
                  "Pet data not ready. Please wait a moment and try again.",
                );
                flashButton(buttonEl, "error");
                // Re-enable button after error
                buttonEl.disabled = false;
                buttonEl.textContent = "Feed";
                buttonEl.style.opacity = "1";
                return;
              }

              const species = pet.petSpecies;
              const petItemId = pet.id;

              // STEP 1: Log active pet data
              productionLog("[Feed-Flow-1] 🐾 Active Pet:", {
                species,
                petItemId: petItemId.substring(0, 8) + "...",
                hunger: pet.hunger,
                hungerPercentage: pet.hunger ? `${pet.hunger}%` : "N/A",
              });

              // Get compatible crops
              const compatibleCrops = PET_FEED_CATALOG[species];

              // STEP 2: Log compatible crops list for this species
              productionLog(
                `[Feed-Flow-2] 🌾 Compatible crops for ${species}:`,
                compatibleCrops || [],
              );

              if (!compatibleCrops || compatibleCrops.length === 0) {
                console.error(
                  "[MGTools Feed] No compatible crops for",
                  species,
                );
                flashButton(buttonEl, "error");
                // Re-enable button after error
                buttonEl.disabled = false;
                buttonEl.textContent = "Feed";
                buttonEl.style.opacity = "1";
                return;
              }

              // FIX ISSUE A: 3-tier fallback for inventory data with cache clearing
              // Force fresh inventory read - clear any cached data first
              if (
                typeof unsafeWindow !== "undefined" &&
                unsafeWindow.__mga_cachedInventory
              ) {
                delete unsafeWindow.__mga_cachedInventory;
              }

              let inventoryItems = null;

              // Tier 1: Try Jotai atom cache (only need cache, not store!)
              if (targetWindow.jotaiAtomCache) {
                try {
                  const freshInventory = await getAtomValue(
                    "myCropInventoryAtom",
                  );
                  if (freshInventory?.items) {
                    inventoryItems = freshInventory.items;
                    productionLog(
                      "[MGTOOLS-FIX-A] Using fresh inventory from Jotai atom cache (Tier 1)",
                    );
                  }
                } catch (e) {
                  console.warn(
                    "[MGTOOLS-FIX-A] Inventory Tier 1 (atom cache) failed:",
                    e.message,
                  );
                }
              }

              // Try alternate atom if first failed
              if (!inventoryItems) {
                try {
                  inventoryItems = readAtom("myCropItemsAtom") || [];
                  if (inventoryItems.length > 0) {
                    productionLog(
                      "[MGTOOLS-FIX-A] Using myCropItemsAtom (Tier 1.5)",
                    );
                  }
                } catch (e) {
                  console.warn(
                    "[MGTOOLS-FIX-A] myCropItemsAtom failed:",
                    e.message,
                  );
                }
              }

              // Tier 2: UnifiedState atoms
              if (!inventoryItems || inventoryItems.length === 0) {
                if (UnifiedState.atoms.inventory?.items) {
                  inventoryItems = UnifiedState.atoms.inventory.items.filter(
                    (i) => i.itemType === "Produce" || i.itemType === "Crop",
                  );
                  productionLog(
                    "[MGTOOLS-FIX-A] Using UnifiedState inventory (Tier 2)",
                  );
                }
              }

              // Tier 3: window.myData
              if (!inventoryItems || inventoryItems.length === 0) {
                if (targetWindow.myData?.inventory?.items) {
                  inventoryItems = targetWindow.myData.inventory.items;
                  productionLog(
                    "[MGTOOLS-FIX-A] Using window.myData inventory (Tier 3)",
                  );
                }
              }

              productionLog(
                "[Feed-Inventory] Fresh read:",
                inventoryItems?.length || 0,
                "items",
              );

              if (!inventoryItems || inventoryItems.length === 0) {
                console.error(
                  "[MGTOOLS-FIX-A] ❌ No inventory data available from any source",
                );
                alert("Inventory not ready. Please wait a moment.");
                flashButton(buttonEl, "error");
                // Re-enable button after error
                buttonEl.disabled = false;
                buttonEl.textContent = "Feed";
                buttonEl.style.opacity = "1";
                return;
              }

              // STEP 3: Log full crop inventory
              productionLog("[Feed-Flow-3] 📦 Full inventory:", {
                count: inventoryItems.length,
                species: inventoryItems.map((item) => item.species),
                items: inventoryItems,
              });

              // Get MGTools favorited species
              const favoritedSpecies =
                UnifiedState.data?.autoFavorite?.selectedSpecies || [];

              // STEP 4: Log favorited species list
              productionLog(
                "[Feed-Flow-4] 🚫 Favorited species:",
                favoritedSpecies,
              );

              // Find first compatible, non-favorited crop that we haven't used yet
              const nonFavoritedCompatibleCrops = inventoryItems.filter(
                (item) => {
                  if (!item || !item.species || !item.id) return false;
                  const isCompatible = compatibleCrops.includes(item.species);
                  const isFavorited = favoritedSpecies.includes(item.species);
                  const notUsed = !usedCropIds.has(item.id);
                  return isCompatible && !isFavorited && notUsed;
                },
              );

              // STEP 5: Log non-favorited compatible crops available
              productionLog(
                "[Feed-Flow-5] ✅ Non-favorited compatible crops available:",
                {
                  count: nonFavoritedCompatibleCrops.length,
                  species: nonFavoritedCompatibleCrops.map(
                    (item) => item.species,
                  ),
                  items: nonFavoritedCompatibleCrops,
                },
              );

              const cropToFeed = nonFavoritedCompatibleCrops[0];

              // STEP 6: Log boolean check if compatible crop exists
              productionLog(
                `[Feed-Flow-6] ❓ Compatible crop exists: ${!!cropToFeed}`,
              );

              if (!cropToFeed) {
                console.error(
                  "[MGTools Feed] No feedable crops (compatible, non-favorited, unused)",
                );
                productionLog(
                  "[MGTools Feed] Compatible species:",
                  compatibleCrops,
                );
                productionLog(
                  "[MGTools Feed] Favorited species:",
                  favoritedSpecies,
                );
                productionLog(
                  "[MGTools Feed] Used crop IDs:",
                  Array.from(usedCropIds),
                );
                // Clear used crops and try again
                usedCropIds.clear();
                flashButton(buttonEl, "error");
                // Re-enable button after error
                buttonEl.disabled = false;
                buttonEl.textContent = "Feed";
                buttonEl.style.opacity = "1";
                return;
              }

              // Mark this crop as used BEFORE sending
              usedCropIds.add(cropToFeed.id);

              // 1) Resolve the correct ID field (prioritize 'id' over others)
              const cropItemId =
                cropToFeed?.id ||
                cropToFeed?.inventoryItemId ||
                cropToFeed?.itemId;

              productionLog("[Feed-Flow-7a] 🧪 Selected crop:", {
                species: cropToFeed?.species,
                fullItem: cropToFeed,
                resolvedId: cropItemId,
              });

              // Validate the crop ID exists and is fresh
              if (!cropItemId) {
                console.error(
                  "[Feed] No valid ID found in crop item:",
                  cropToFeed,
                );
                flashButton(buttonEl, "error");
                buttonEl.disabled = false;
                buttonEl.textContent = "Feed";
                buttonEl.style.opacity = "1";
                return;
              }

              // Double-check crop still exists in current inventory
              const currentInventory = inventoryItems || [];
              const cropStillExists = currentInventory.some(
                (item) =>
                  item.id === cropItemId ||
                  item.inventoryItemId === cropItemId ||
                  item.itemId === cropItemId,
              );

              if (!cropStillExists) {
                console.error(
                  "[Feed] Crop no longer in inventory! ID:",
                  cropItemId,
                );
                productionLog(
                  "[Feed] Current inventory IDs:",
                  currentInventory.map(
                    (i) => i.id || i.inventoryItemId || i.itemId,
                  ),
                );
                // Remove from usedCropIds to allow selecting a different crop
                usedCropIds.delete(cropItemId);
                flashButton(buttonEl, "error");
                buttonEl.disabled = false;
                buttonEl.textContent = "Feed";
                buttonEl.style.opacity = "1";
                return;
              }

              // 2) Rebind/refresh petItemId from current slots (prevents stale ids)
              const slotsNow = readMyPetSlots() || [];
              const reboundPetItemId = slotsNow?.[petIndex]?.id || petItemId;
              if (reboundPetItemId !== petItemId) {
                console.warn("[Feed-Guard] Rebound petItemId from slots", {
                  old: petItemId,
                  new: reboundPetItemId,
                  petIndex,
                });
              }

              // 3) Send with proper inventory item id
              productionLog(
                "[Feed-Debug] 🚀 Sending FeedPet message with inventoryItemId",
              );

              // 4) Continue to feedPetEnsureSync(...) as before
              try {
                // Fire-and-forget - send feed immediately
                await sendFeedPet(reboundPetItemId, cropItemId);
                productionLog(
                  `[MGTools Feed] 🚀 Sent feed: ${species} with ${cropToFeed.species}`,
                );

                // Immediate success UI - atoms will update naturally
                flashButton(buttonEl, "success");

                // Re-enable button quickly for responsive spam-feeding
                setTimeout(() => {
                  buttonEl.disabled = false;
                  buttonEl.textContent = "Feed";
                  buttonEl.style.opacity = "1";
                }, 200); // Short delay for visual feedback only

                // Verify in background (non-blocking) for debugging
                feedPetEnsureSync(reboundPetItemId, cropItemId, petIndex, false)
                  .then((result) => {
                    if (!result?.verified) {
                      console.warn(
                        "[MGTools Feed] ⚠️ Background verification failed (feed may have worked anyway)",
                      );
                    } else {
                      productionLog(
                        "[MGTools Feed] ✅ Background verification succeeded",
                      );
                    }
                  })
                  .catch((err) =>
                    console.warn(
                      "[MGTools Feed] Background verification error:",
                      err,
                    ),
                  );
              } catch (err) {
                console.warn("[MGTools Feed] ⚠️ Feed failed:", err.message);
                flashButton(buttonEl, "error");
                usedCropIds.delete(cropToFeed.id);
                buttonEl.disabled = false;
                buttonEl.textContent = "Feed";
                buttonEl.style.opacity = "1";
              }
            } catch (error) {
              console.error("[MGTools Feed] Error:", error);
              flashButton(buttonEl, "error");

              // Re-enable button after error
              buttonEl.disabled = false;
              buttonEl.textContent = "Feed";
              buttonEl.style.opacity = "1";
            }
          };

          // Wait for pet hunger to increase (like reference implementation does)
          const waitForHungerIncrease = async function (
            petIndex,
            previousHunger,
            timeout = 2000,
          ) {
            const startTime = performance.now();
            const HUNGER_EPSILON = 0.1; // Minimum hunger increase to consider success (0.1%)

            // Small initial delay to let server process
            await new Promise((resolve) => setTimeout(resolve, 150));

            while (performance.now() - startTime < timeout) {
              try {
                // Get TRULY FRESH pet data using stored atom reference
                const freshPets = getAtomValueFresh("activePets");
                const pets = freshPets || UnifiedState.atoms.activePets;

                if (!pets || !pets[petIndex]) {
                  await new Promise((resolve) => setTimeout(resolve, 100));
                  continue;
                }

                const currentPet = pets[petIndex];
                const currentHunger = currentPet.hunger;

                if (
                  currentHunger !== undefined &&
                  previousHunger !== undefined
                ) {
                  // Check if hunger decreased by at least epsilon (hunger goes DOWN when fed)
                  const hungerChange = previousHunger - currentHunger;

                  if (hungerChange >= HUNGER_EPSILON || currentHunger <= 1) {
                    // Hunger decreased (pet was fed) or pet is full
                    productionLog(
                      `[MGTools Feed] Pet ${petIndex + 1} hunger decreased by ${hungerChange.toFixed(2)}ms (${previousHunger.toFixed(2)}ms → ${currentHunger.toFixed(2)}ms)`,
                    );
                    return {
                      success: true,
                      hungerBefore: previousHunger,
                      hungerAfter: currentHunger,
                    };
                  }
                }
              } catch (err) {
                console.warn("[MGTools Feed] Error checking hunger:", err);
              }

              // Wait 100ms before checking again
              await new Promise((resolve) => setTimeout(resolve, 100));
            }

            // Timeout - operation may have failed
            console.warn(
              `[MGTools Feed] Timeout waiting for pet ${petIndex + 1} hunger to change from ${previousHunger?.toFixed(2)}ms`,
            );
            return {
              success: false,
              hungerBefore: previousHunger,
              hungerAfter: previousHunger,
            };
          };

          // Get TRULY FRESH inventory data using stored atom reference
          const getFreshInventoryFromAtoms = async function () {
            try {
              // Use getAtomValueFresh to get fresh inventory from the hooked atom
              const freshInventory = getAtomValueFresh("inventory");

              if (
                freshInventory &&
                freshInventory.items &&
                Array.isArray(freshInventory.items)
              ) {
                productionLog(
                  `[MGTools Feed] 🔄 Got FRESH inventory from hooked atom: ${freshInventory.items.length} items`,
                );
                return freshInventory.items;
              }

              // Fallback: Try to get from UnifiedState.atoms (might be stale but better than nothing)
              console.warn(
                "[MGTools Feed] Could not get fresh inventory from atom, trying UnifiedState...",
              );
              if (UnifiedState.atoms.inventory?.items) {
                console.warn(
                  "[MGTools Feed] Using UnifiedState.atoms.inventory (might be stale)",
                );
                return UnifiedState.atoms.inventory.items;
              }

              // Last resort: targetWindow.myData
              if (targetWindow.myData?.inventory?.items) {
                console.warn(
                  "[MGTools Feed] Using targetWindow.myData.inventory (likely stale)",
                );
                return targetWindow.myData.inventory.items;
              }

              console.error(
                "[MGTools Feed] No inventory data available from any source!",
              );
              return [];
            } catch (error) {
              console.error(
                "[MGTools Feed] Error getting fresh inventory:",
                error,
              );
              // Final fallback
              return (
                UnifiedState.atoms.inventory?.items ||
                targetWindow.myData?.inventory?.items ||
                []
              );
            }
          };

          // Re-entry guard to prevent infinite loop
          /**
           * MGTools Feed Overlay Module
           * This script creates a fixed-screen overlay that uses a hidden copy of the
           * game's sidebar HTML to perfectly align feed buttons with the game's UI scaling.
           */

          let isInjecting = false;
          const FEED_OVERLAY_ID = "mgtools-feed-overlay-container";

          /**
           * Creates the ghost UI structure and injects the feed buttons into it.
           * This ensures they scale and position exactly like the original game UI.
           */
          const injectInstantFeedButtons = function () {
            if (isInjecting) return;

            try {
              isInjecting = true;

              let overlay = targetDocument.getElementById(FEED_OVERLAY_ID);

              if (!overlay) {
                productionLog(
                  "[MGTools Feed] 🛠️ Creating scaling ghost overlay...",
                );
                overlay = targetDocument.createElement("div");
                overlay.id = FEED_OVERLAY_ID;

                // Container styles: Covers screen, allows clicks through, but houses our scaling sidebar
                Object.assign(overlay.style, {
                  position: "fixed",
                  top: "0",
                  left: "0",
                  width: "100vw",
                  height: "100vh",
                  pointerEvents: "none",
                  zIndex: "100",
                  // CSS Variables to match the game's scaling logic
                  "--mc-bg-black": "rgba(0, 0, 0, 0.65)",
                  "--mc-border-grey": "#A3A3A3",
                  "--mc-green-magic": "#5EAC46",
                  "--mc-text-white": "#F5F5F5",
                  "--mc-slot-size": "74px",
                  "--mc-gap": "4px",
                  "--system-header-height": "60px",
                });

                // Inject the ghost sidebar structure using the exact HTML pattern provided.
                // The .ghost-sidebar handles the vertical centering logic.
                overlay.innerHTML = `
                  <style>
                    #${FEED_OVERLAY_ID} .ghost-sidebar {
                      position: absolute;
                      left: 4px;
                      /* Vertically centered between header and inventory */
                      top: calc(var(--system-header-height) + (100vh - var(--system-header-height) - 100px) / 2);
                      transform: translateY(-40%);
                      display: flex;
                      flex-direction: column;
                      gap: 4px;
                      visibility: hidden; /* Hide the entire ghost structure */
                    }

                    /* Individual Slot Styles (from the provided example) */
                    #${FEED_OVERLAY_ID} .mc-pet-slot-button {
                      background-color: var(--mc-bg-black);
                      width: 74px;
                      height: 74px;
                      border-radius: 10px;
                      border: 2px solid transparent;
                      display: flex;
                      flex-direction: column;
                      color: var(--mc-text-white);
                      box-sizing: border-box;
                      position: relative; /* Anchor for our absolute button */
                    }

                    #${FEED_OVERLAY_ID} .mc-pet-strength {
                      font-size: 10px;
                      font-weight: bold;
                      text-align: center;
                      margin-top: 2px;
                    }

                    #${FEED_OVERLAY_ID} .mc-pet-content {
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      flex-grow: 1;
                    }

                    #${FEED_OVERLAY_ID} .mc-pet-sprite {
                      width: 30px;
                      height: 30px;
                      background: rgba(255,255,255,0.1);
                      border-radius: 50%;
                    }

                    #${FEED_OVERLAY_ID} .mc-hunger-bar-container {
                      padding: 0 10px;
                      height: 5px;
                      margin-bottom: 4px;
                    }

                    #${FEED_OVERLAY_ID} .mc-hunger-bar {
                      width: 100%;
                      height: 100%;
                      border: 1px solid var(--mc-border-grey);
                      border-radius: 3px;
                    }

                    #${FEED_OVERLAY_ID} .mc-hunger-bar-fill {
                      height: 100%;
                      background-color: var(--mc-green-magic);
                      width: 70%;
                    }

                    /* The actual interactive Feed Button */
                    #${FEED_OVERLAY_ID} .mgtools-instant-feed-btn {
                      visibility: visible; /* Override parent hidden state */
                      pointer-events: auto; /* Enable clicks */
                      position: absolute;
                    }
                  </style>
                  <div class="ghost-sidebar">
                    ${[0, 1, 2]
                      .map(
                        (i) => `
                      <div class="mc-pet-slot-button" data-ghost-index="${i}">
                        <div class="mc-pet-strength">STR 100</div>
                        <div class="mc-pet-content"><div class="mc-pet-sprite"></div></div>
                        <div class="mc-hunger-bar-container">
                          <div class="mc-hunger-bar">
                            <div class="mc-hunger-bar-fill"></div>
                          </div>
                        </div>
                      </div>
                    `,
                      )
                      .join("")}
                  </div>
                `;

                targetDocument.body.appendChild(overlay);
              }

              // Ensure buttons are inside our ghost slots
              const ghostSlots = overlay.querySelectorAll(
                ".mc-pet-slot-button",
              );
              ghostSlots.forEach((slot, i) => {
                const btnId = `mgtools-btn-pet-${i}`;
                if (!targetDocument.getElementById(btnId)) {
                  const btn = createInstantFeedButton(i);
                  btn.id = btnId;
                  slot.appendChild(btn);
                }
              });

              isInjecting = false;
            } catch (error) {
              console.error(
                "[MGTools Feed] Error in injectInstantFeedButtons:",
                error,
              );
              isInjecting = false;
            }
          };

          /**
           * Initialization with polling to ensure the overlay stays active.
           */
          const initializeInstantFeedButtons = function () {
            productionLog(
              "[MGTools Feed] 🚀 Initializing scaling ghost feed buttons...",
            );

            if (!jotaiStore) {
              jotaiStore = captureJotaiStore();
            }

            // Initial render
            injectInstantFeedButtons();

            const pollInterval = setInterval(() => {
              try {
                const overlay = targetDocument.getElementById(FEED_OVERLAY_ID);
                const buttons = targetDocument.querySelectorAll(
                  ".mgtools-instant-feed-btn",
                );

                if (!overlay || buttons.length < 3) {
                  injectInstantFeedButtons();
                }
              } catch (err) {
                console.error("[MGTools Feed] Error in polling:", err);
              }
            }, 2000);

            if (!targetWindow.MGToolsIntervals) {
              targetWindow.MGToolsIntervals = [];
            }
            targetWindow.MGToolsIntervals.push(pollInterval);
          };

          // Verify data loaded before UI creation
          // productionLog('🔍 [STARTUP-VERIFY] Data loaded before UI creation:', {
          //     petPresets: Object.keys(UnifiedState.data.petPresets).length,
          //     seedsToDelete: UnifiedState.data.seedsToDelete.length,
          //     autoDeleteEnabled: UnifiedState.data.autoDeleteEnabled,
          //     dataLoaded: !!UnifiedState.data
          // });

          // Create UI
          // productionLog('🎨 Creating UI...');
          if (window.MGA_DEBUG) {
            window.MGA_DEBUG.logStage("CREATE_UI_STARTING", {
              dataLoaded: !!UnifiedState.data,
              petPresets: Object.keys(UnifiedState.data?.petPresets || {})
                .length,
              targetDocumentReady: !!targetDocument.body,
            });
          }

          try {
            // Clean up any corrupted dock position data before creating UI
            cleanupCorruptedDockPosition();

            createUnifiedUI();

            // TEST VERSION: Add UI health check and Alt+M toggle
            ensureUIHealthy();
            setupToolbarToggle();
            setupDockSizeControl();

            if (window.MGA_DEBUG) {
              window.MGA_DEBUG.logStage("CREATE_UI_COMPLETED", {
                uiElements: targetDocument.querySelectorAll(
                  ".mga-panel, .mga-toggle-btn",
                ).length,
                mainPanelExists: !!targetDocument.querySelector(".mga-panel"),
                toggleBtnExists:
                  !!targetDocument.querySelector(".mga-toggle-btn"),
              });
              // Safe performance metric setting
              if (window.MGA_DEBUG.performanceMetrics) {
                window.MGA_DEBUG.performanceMetrics.uiCreated =
                  performance.now();
              }
            }

            // Initialize instant feed buttons after UI is created AND atom cache is ready
            (async () => {
              try {
                productionLog(
                  "[MGTools Feed] 🔍 Waiting for Jotai atom cache before initializing feed buttons...",
                );

                // Wait for atom cache to be ready (max 10 seconds)
                const maxWait = 10000;
                const startTime = Date.now();
                let atomCacheReady = false;

                while (Date.now() - startTime < maxWait) {
                  // Check if atom cache is ready (this is what we actually need!)
                  if (targetWindow.jotaiAtomCache) {
                    const elapsed = Date.now() - startTime;
                    productionLog(
                      `[MGTools Feed] ✅ Jotai atom cache ready after ${elapsed}ms`,
                    );
                    UnifiedState.jotaiReady = true; // Mark as ready in UnifiedState
                    atomCacheReady = true;

                    // Try to capture store (nice to have but not required)
                    if (!jotaiStore) {
                      jotaiStore = captureJotaiStore();
                      if (jotaiStore) {
                        productionLog(
                          "[MGTools Feed] ✅ Also captured Jotai store",
                        );
                      } else {
                        productionLog(
                          "[MGTools Feed] ℹ️ Store not captured, will use direct atom cache reading",
                        );
                      }
                    }
                    break;
                  }

                  // Wait 200ms before next check
                  await new Promise((r) => setTimeout(r, 200));
                }

                if (!atomCacheReady) {
                  console.warn(
                    "[MGTools Feed] ⚠️ Jotai atom cache not ready after timeout - initializing anyway",
                  );
                  UnifiedState.jotaiReady = false;
                }

                // Now initialize feed buttons
                initializeInstantFeedButtons();
              } catch (error) {
                console.error(
                  "[MGTools] Error initializing instant feed buttons:",
                  error,
                );
              }
            })();
          } catch (error) {
            console.error("❌ Error creating UI:", error);

            // Show visible error popup for user (especially important in Discord browser)
            try {
              const errorDiv = targetDocument.createElement("div");
              errorDiv.style.cssText = `
                          position: fixed;
                          top: 50%;
                          left: 50%;
                          transform: translate(-50%, -50%);
                          background: rgba(220, 38, 38, 0.95);
                          color: white;
                          padding: 20px;
                          border-radius: 8px;
                          z-index: 9999999;
                          font-family: monospace;
                          max-width: 500px;
                          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                      `;
              errorDiv.innerHTML = `
                          <div style="font-weight: bold; margin-bottom: 10px; font-size: 14px;">❌ MGTools UI Failed to Load</div>
                          <div style="font-size: 12px; margin-bottom: 10px; color: #fecaca;">${error.message}</div>
                          <div style="font-size: 11px; color: #fef2f2;">Press F12 and check Console for details</div>
                          <button onclick="this.parentElement.remove()" style="margin-top: 10px; padding: 8px 16px; background: white; color: #dc2626; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Close</button>
                      `;
              targetDocument.body.appendChild(errorDiv);
            } catch (e) {
              // If even error display fails, log it
              console.error("Failed to show error UI:", e);
            }

            if (window.MGA_DEBUG) {
              window.MGA_DEBUG.logError(error, "createUnifiedUI");
            }
            productionWarn(
              "⚠️ UI creation failed, but continuing with initialization...",
            );
            // DON'T throw error - continue with intervals even if UI fails
          }

          // Verify UI reflects loaded data immediately after creation
          setTimeout(() => {
            const checkedSeeds = targetDocument.querySelectorAll(
              ".seed-checkbox:checked",
            );
            // productionLog('🔍 [UI-VERIFY] UI state after creation:', {
            //     checkedSeedsInUI: checkedSeeds.length,
            //     seedsInState: UnifiedState.data.seedsToDelete.length,
            //     matches: checkedSeeds.length === UnifiedState.data.seedsToDelete.length
            // });
          }, 100);

          // Initialize atom hooks
          productionLog("🔗 Initializing atom hooks...");
          initializeAtoms();

          // Initialize turtle timer
          productionLog("🐢 Initializing turtle timer...");
          initializeTurtleTimer();

          // Start monitoring intervals
          productionLog("⏱️ Starting monitoring intervals...");
          startIntervals();

          // Apply saved theme settings
          productionLog("🎨 Applying saved theme settings...");
          applyTheme();

          // Apply saved UI mode
          if (UnifiedState.data.settings.ultraCompactMode) {
            productionLog("📱 Applying saved ultra-compact mode...");
            applyUltraCompactMode(true);
          }

          // Apply saved weather setting
          productionLog("🌧️ Applying saved weather setting...");
          applyWeatherSetting();

          // Initialize keyboard shortcuts
          initializeKeyboardShortcuts();

          // Force UI refresh to apply saved state (timing fix for data persistence)
          productionLog(
            "🔄 Applying delayed UI refresh to ensure saved state is displayed...",
          );
          setTimeout(() => {
            productionLog(
              "🔄 [DATA-PERSISTENCE] Applying delayed UI refresh...",
            );

            // Verify data before refreshing UI
            productionLog("📊 [DATA-PERSISTENCE] Current state:", {
              petPresets: Object.keys(UnifiedState.data.petPresets).length,
              seedsToDelete: UnifiedState.data.seedsToDelete.length,
              autoDeleteEnabled: UnifiedState.data.autoDeleteEnabled,
            });

            // Update main tab content to reflect loaded data
            if (typeof updateTabContent === "function") {
              updateTabContent();
              productionLog(
                "✅ [DATA-PERSISTENCE] UI refreshed with saved state",
              );
            }

            // Update any open popout overlays
            if (UnifiedState.data?.popouts?.overlays) {
              UnifiedState.data.popouts.overlays.forEach((overlay, tabName) => {
                if (overlay && document.contains(overlay)) {
                  try {
                    const content = getContentForTab(tabName, true);
                    const contentEl = overlay.querySelector(
                      ".mga-overlay-content, .mga-content",
                    );
                    if (contentEl) {
                      contentEl.innerHTML = content;
                      // Set up handlers for the refreshed content
                      if (
                        tabName === "seeds" &&
                        typeof setupSeedsTabHandlers === "function"
                      ) {
                        setupSeedsTabHandlers(overlay);
                      } else if (
                        tabName === "pets" &&
                        typeof setupPetsTabHandlers === "function"
                      ) {
                        setupPetsTabHandlers(overlay);
                      }
                      productionLog(
                        `✅ [DATA-PERSISTENCE] Refreshed ${tabName} overlay with saved state`,
                      );
                    }
                  } catch (error) {
                    productionWarn(
                      `⚠️ [DATA-PERSISTENCE] Failed to refresh ${tabName} overlay:`,
                      error,
                    );
                  }
                }
              });
            }
          }, 1000); // 1000ms delay to ensure all data loading is complete (increased for refresh stability)

          // Initialize teleport system
          initializeTeleportSystem();

          // Initialize crop highlighting system
          setupCropHighlightingSystem();

          // Initialize hotkey system
          initializeHotkeySystem();

          // Initialize tooltip system
          if (window.MGA_Tooltips) {
            window.MGA_Tooltips.init();
            productionLog("💬 Tooltip system initialized");
          }

          UnifiedState.initialized = true;
          window._MGA_INITIALIZED = true;
          try {
            delete window._MGA_INITIALIZING;
          } catch (e) {
            window._MGA_INITIALIZING = false;
          }
          window._MGA_TIMESTAMP = Date.now(); // Update timestamp on completion

          // NOW run conflict detection after game has loaded successfully
          // productionLog('🔍 [MGA-ISOLATION] Running post-initialization external script conflict detection...');
          if (window.MGA_ConflictDetection) {
            // Detect external script presence
            const mainScriptDetected =
              window.MGA_ConflictDetection.detectMainScript();

            // Only create barriers if external scripts detected
            if (mainScriptDetected) {
              productionLog(
                "🔒 [MGA-ISOLATION] External scripts detected - creating protective barriers",
              );
              window.MGA_ConflictDetection.createIsolationBarrier();
              window.MGA_ConflictDetection.preventAccess();
            }

            // Run integrity checks
            const integrityOk =
              window.MGA_ConflictDetection.checkGlobalIntegrity();
            const isolationOk =
              window.MGA_ConflictDetection.validateIsolation();

            if (integrityOk && isolationOk) {
              productionLog(
                "✅ [MGA-ISOLATION] Final integrity check passed - no conflicts detected",
              );
              if (mainScriptDetected) {
                productionLog(
                  "✅ [MGA-ISOLATION] Complete isolation validated - external script protection active",
                );
              }
            } else {
              productionWarn(
                "⚠️ [MGA-ISOLATION] Final integrity check found potential conflicts",
              );
              if (!integrityOk)
                productionWarn(
                  "⚠️ [MGA-ISOLATION] Global integrity issues detected",
                );
              if (!isolationOk)
                productionWarn(
                  "⚠️ [MGA-ISOLATION] Isolation validation failed",
                );
            }
          } else {
            productionWarn(
              "⚠️ [MGA-ISOLATION] ConflictDetection not available - running without isolation",
            );
          }

          productionLog(
            "✅ Magic Garden Unified Assistant initialized successfully!",
          );

          // Add global recovery function for users whose UI disappears
          targetWindow.MGA_SHOW_UI = function () {
            productionLog(
              "%c🔧 MGTools Recovery",
              "color: #4CAF50; font-weight: bold; font-size: 14px",
            );
            productionLog("Clearing corrupted UI state...");
            try {
              localStorage.removeItem("mgh_toolbar_visible");
              localStorage.removeItem("mgh_dock_position");
              localStorage.removeItem("mgh_dock_orientation");
              productionLog("✅ State cleared. Reloading page...");
              setTimeout(() => location.reload(), 500);
            } catch (e) {
              console.error("❌ Recovery failed:", e);
              productionLog("Try manually: localStorage.clear() then refresh");
            }
          };

          // Startup banner with recovery instructions
          productionLog(
            "%c🎮 MGTools v" +
              (typeof GM_info !== "undefined"
                ? GM_info.script.version
                : "2.4.0") +
              " Loaded",
            "color: #4CAF50; font-weight: bold; font-size: 14px",
          );
          productionLog(
            "%c💡 UI not showing? Run in console: MGA_SHOW_UI()",
            "color: #FFC107; font-size: 12px",
          );

          // Remove test UI after successful initialization
          const testUI =
            targetDocument.querySelector('div[style*="Test UI Active"]') ||
            targetDocument.querySelector('div[style*="MGA Test UI"]') ||
            Array.from(targetDocument.querySelectorAll("div")).find(
              (div) =>
                div.textContent && div.textContent.includes("Test UI Active"),
            );
          if (testUI) {
            testUI.remove();
            debugLog(
              "UI_LIFECYCLE",
              "Test UI removed after successful initialization",
            );
          }

          // Check connection status periodically using managed interval
          setManagedInterval(
            "connectionCheck",
            () => {
              const hasConnection =
                targetWindow.MagicCircle_RoomConnection &&
                typeof targetWindow.MagicCircle_RoomConnection.sendMessage ===
                  "function";
              if (!UnifiedState.connectionStatus && hasConnection) {
                productionLog("🔌 Game connection established!");
                UnifiedState.connectionStatus = true;
              } else if (UnifiedState.connectionStatus && !hasConnection) {
                productionWarn("⚠️ Game connection lost!");
                UnifiedState.connectionStatus = false;
              }
            },
            5000,
          );
        } catch (error) {
          console.error(
            "❌ Failed to initialize Magic Garden Unified Assistant:",
            error,
          );
          console.error("Stack trace:", error.stack);
          UnifiedState.initialized = false; // Allow retry
        }
      } // End continueInitialization function
    }

    // ==================== ENVIRONMENT-AWARE INITIALIZATION ====================
    /* CHECKPOINT removed: ENVIRONMENT_INITIALIZATION_START */

    function initializeBasedOnEnvironment() {
      productionLog(
        "🔍🔍🔍 [EXECUTION] ENTERED initializeBasedOnEnvironment()",
      );
      /* CHECKPOINT removed: DETECT_ENVIRONMENT_CALL */
      productionLog("🔍 [EXECUTION] About to call detectEnvironment()");
      const environment = detectEnvironment();
      productionLog(
        "🔍 [EXECUTION] detectEnvironment() returned:",
        environment,
      );
      /* CHECKPOINT removed: DETECT_ENVIRONMENT_COMPLETE */

      productionLog("📊 Environment Analysis:", {
        domain: environment.domain,
        strategy: environment.initStrategy,
        isGame: environment.isGameEnvironment,
        hasAtoms: environment.hasJotaiAtoms,
        hasConnection: environment.hasMagicCircleConnection,
      });

      switch (environment.initStrategy) {
        case "game-ready":
          productionLog(
            "✅ Game environment ready - initializing with full integration",
          );
          initializeScript();
          break;

        case "game-wait":
          productionLog(
            "⏳ Game environment detected - waiting for game atoms...",
          );
          waitForGameReady();
          break;

        case "standalone":
          productionLog("🎮 Standalone environment - initializing demo mode");
          initializeStandalone();
          break;

        case "skip":
          productionLog(
            "⏭️ Skipping initialization - script will run in game iframe only",
          );
          // Do not initialize on Discord page itself
          break;

        default:
          productionLog("❓ Unknown environment - attempting standalone mode");
          initializeStandalone();
          break;
      }
    }

    function waitForGameReady() {
      let attempts = 0;
      const maxAttempts = 20; // 10 seconds at 500ms intervals

      const checkGameReady = () => {
        // More flexible game readiness check - be less strict about requirements
        const atomCache =
          targetWindow.jotaiAtomCache?.cache || targetWindow.jotaiAtomCache;
        const hasAtoms = atomCache && typeof atomCache === "object";
        const hasConnection =
          targetWindow.MagicCircle_RoomConnection &&
          typeof targetWindow.MagicCircle_RoomConnection === "object";
        const hasBasicDom =
          targetDocument.body && document.readyState === "complete";

        // Check for alternative game indicators if primary ones fail (use regular document for game detection)
        const hasGameElements =
          document.querySelector("canvas") ||
          document.querySelector('[class*="game"]') ||
          document.querySelector('[id*="game"]') ||
          document.querySelector('div[style*="position"]');

        // Additional check: verify atoms actually contain expected keys
        const atomsReady = hasAtoms && atomCache.size > 0;

        // Be more lenient - initialize if we have DOM ready and some game indicators
        if (
          (atomsReady && hasConnection && hasBasicDom) ||
          (hasBasicDom && hasGameElements && attempts >= 10)
        ) {
          if (atomsReady && hasConnection) {
            productionLog(
              "✅ Game atoms and connection fully ready - switching to full mode",
            );
            productionLog("📊 [GAME-READY] Atoms count:", atomCache.size);
          } else {
            productionLog(
              "✅ Game elements detected, proceeding with reduced functionality mode",
            );
          }

          initializeScript();
          return true;
        }

        // Debug logging for what's missing
        if (attempts % 8 === 0) {
          // Every 4 seconds
          productionLog("⏳ [GAME-WAIT] Still waiting...", {
            hasAtoms,
            atomsCount: hasAtoms ? atomCache.size : 0,
            hasConnection,
            hasBasicDom,
            hasGameElements,
            readyState: document.readyState,
            attempt: attempts,
            willProceedAt:
              attempts >= 10
                ? "Next check (fallback mode)"
                : `Attempt ${10 - attempts} more`,
          });
        }

        return false;
      };

      if (!checkGameReady()) {
        // Use managed interval for game check
        setManagedInterval(
          "gameCheck",
          () => {
            attempts++;

            if (checkGameReady() || attempts >= maxAttempts) {
              clearManagedInterval("gameCheck");

              if (attempts >= maxAttempts) {
                productionLog(
                  "⚠️ Game readiness timeout - falling back to demo mode",
                );
                productionLog(
                  "💡 You can try MGA.init() later if the game loads",
                );
                initializeStandalone();
              }
            }
          },
          500,
        );
      }
    }

    // Start environment-based initialization
    /* CHECKPOINT removed: CALLING_MAIN_INITIALIZATION */
    productionLog(
      "🔍🔍🔍 [EXECUTION] Reached end of startMGAInitialization, about to call initializeBasedOnEnvironment()",
    );
    try {
      productionLog("🔍 [EXECUTION] Calling initializeBasedOnEnvironment()...");
      initializeBasedOnEnvironment();
      productionLog("🔍 [EXECUTION] initializeBasedOnEnvironment() returned!");
      /* CHECKPOINT removed: MAIN_INITIALIZATION_COMPLETE */

      // Initialize crop protection hooks
      setTimeout(() => {
        initializeProtectionHooks();
      }, 3000);
    } catch (error) {
      console.error("❌❌❌ [EXECUTION] MAIN_INITIALIZATION_FAILED:", error);
      console.error("❌ [EXECUTION] Error stack:", error.stack);
      console.error("🔧 This error caused the script to stop working");
    }
    productionLog(
      "🔍 [EXECUTION] Completed startMGAInitialization try-catch block",
    );

    // ==================== IMMEDIATE TEST INITIALIZATION ====================
    // Additional fallback for manual testing - only if initialization failed
    productionLog("🧪 Setting up fallback timer for manual testing...");
    setTimeout(() => {
      // Only run demo mode if game mode completely failed to initialize
      if (!UnifiedState.initialized && !window._MGA_INITIALIZING) {
        productionLog("🔧 Final fallback - trying demo mode");
        productionLog(
          "💡 Use MGA.init() to force game mode initialization if needed",
        );
        initializeStandalone();
      } else if (UnifiedState.initialized) {
        productionLog(
          "✅ Game mode already initialized - skipping demo fallback",
        );
      }
    }, 5000);

