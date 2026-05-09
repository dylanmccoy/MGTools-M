    /* ============================================================================
     * 9. STATE MODULE - START
     * ============================================================================
     * Global state management and data persistence
     */

    /**
     * Unified global state container
     * Manages all application state, settings, and runtime data
     * @namespace UnifiedState
     */
    const NUM_COM = 0;
    const NUM_UNCOM = 1;
    const NUM_RARE = 2;
    const NUM_LEG = 3;
    const NUM_MYTH = 4;
    const NUM_DIV = 5;
    const NUM_CEL = 6;

    const UnifiedState = {
      initialized: false,
      jotaiReady: false, // NEW: Track when Jotai store is ready
      atomsSubscribed: false, // NEW: Track when atom subscriptions are active
      connectionStatus: false,
      panels: {
        main: null,
        toggle: null,
      },
      activeTab: "pets",
      // Interval Management System
      intervals: {
        autoDelete: null,
        heartbeat: null,
        activitySimulator: null,
        gameCheck: null,
        connectionCheck: null,
        autoSave: null,
      },
      popoutWindows: new Set(), // Track all popout windows
      firebase: {
        app: null,
        database: null,
        reportInterval: null,
        unsubscribe: null,
      },
      data: {
        petPresets: {},
        petPresetsOrder: [], // Array to maintain preset display order
        currentPresetIndex: -1, // Track position for cycling through presets
        petAbilityLogs: [],
        seedsToDelete: [],
        autoDeleteEnabled: false,
        inventoryValue: 0,
        gardenValue: 0,
        tileValue: 0,
        lastAbilityTimestamps: {},
        roomStatus: {
          counts: {}, // Store room counts {MG1: 3, MG2: 2, ...}
          currentRoom: null,
          reporterId: null,
        },
        customRooms: [], // Dynamic list of tracked rooms (initialized with defaults below)
        timers: {
          seed: null,
          egg: null,
          tool: null,
          lunar: null,
        },
        settings: {
          opacity: 95,
          popoutOpacity: 50,
          theme: "default",
          gradientStyle: "blue-purple",
          effectStyle: "none",
          compactMode: false,
          ultraCompactMode: false,
          useInGameOverlays: true,
          notifications: {
            enabled: true,
            volume: 0.3,
            notificationType: "epic", // Options: 'simple', 'triple', 'alarm', 'epic', 'continuous'
            previousNotificationType: "epic", // Stores previous selection when switching to continuous
            requiresAcknowledgment: false,
            continuousEnabled: false, // Controls whether continuous option is available
            watchedSeeds: [
              "Carrot",
              "Sunflower",
              "Moonbinder",
              "Dawnbinder",
              "Starweaver",
            ],
            watchedEggs: ["CommonEgg", "MythicalEgg"],
            // Pet hunger notifications
            petHungerEnabled: false,
            petHungerThreshold: 25, // Notify when hunger drops below this % (percentage of observed max)
            petHungerSound: "double", // Different sound than shop notifications
            // Ability trigger notifications
            abilityNotificationsEnabled: false,
            watchedAbilities: [], // Legacy - kept for backward compatibility
            watchedAbilityCategories: {
              // Category-based notification control
              xpBoost: true,
              cropSizeBoost: true,
              selling: true,
              harvesting: true,
              growthSpeed: true,
              specialMutations: true,
              other: true,
            },
            abilityNotificationSound: "single", // 'single', 'double', 'triple', 'chime', 'alert', 'buzz', 'ding', 'chirp'
            abilityNotificationVolume: 0.2, // Separate volume for abilities (quieter by default)
            // Weather event notifications
            weatherNotificationsEnabled: false,
            watchedWeatherEvents: ["Snow", "Rain", "AmberMoon", "Dawn"],
            // Shop UI Firebase integration toggle
            shopFirebaseEnabled: false,
            lastSeenTimestamps: {},
          },
          detailedTimestamps: true, // Show HH:MM:SS 24-hour format instead of 12-hour AM/PM
          debugMode: false, // Enable debug logging for troubleshooting
          roomDebugMode: false, // Enable detailed room API logging for troubleshooting
          hideWeather: false, // Hide weather visual effects (snow, rain, etc)
          keepAliveAudio: {
            enabled: false,
            volume: 0.008,
            frequency: 72,
          },
          autoFavorite: {
            enabled: false,
            species: [], // List of species names to auto-favorite
            mutations: [], // List of mutations to auto-favorite (Rainbow, Gold, Frozen, Dawnlit, Amberlit, Dawnbound, Amberbound, etc)
            petAbilities: [], // List of pet abilities to auto-favorite (Rainbow Granter, Gold Granter)
          },
          // FIX ISSUE B: Setting to hide/show instant feed buttons
          hideFeedButtons: false, // Default: show feed buttons (current behavior)
          autoBuy: {
            enabled: true,
            categories: {
              seed: false,
              egg: false,
              tool: false,
            },
            items: {
              seed: {},
              egg: {},
              tool: {},
            },
          },
        },
        hotkeys: {
          enabled: true,
          gameKeys: {
            inventory: { name: "Open Inventory", original: "e", custom: null },
            harvest: { name: "Harvest/Select", original: " ", custom: null },
            selectLeft: {
              name: "Select Left Crop",
              original: "x",
              custom: null,
            },
            selectRight: {
              name: "Select Right Crop",
              original: "c",
              custom: null,
            },
            hotbar1: { name: "Hotbar Slot 1", original: "1", custom: null },
            hotbar2: { name: "Hotbar Slot 2", original: "2", custom: null },
            hotbar3: { name: "Hotbar Slot 3", original: "3", custom: null },
            hotbar4: { name: "Hotbar Slot 4", original: "4", custom: null },
            hotbar5: { name: "Hotbar Slot 5", original: "5", custom: null },
            hotbar6: { name: "Hotbar Slot 6", original: "6", custom: null },
            hotbar7: { name: "Hotbar Slot 7", original: "7", custom: null },
            hotbar8: { name: "Hotbar Slot 8", original: "8", custom: null },
            hotbar9: { name: "Hotbar Slot 9", original: "9", custom: null },
            teleportShop: {
              name: "Teleport to Shop",
              original: "shift+1",
              custom: null,
            },
            teleportGarden: {
              name: "Teleport to Garden",
              original: "shift+2",
              custom: null,
            },
            teleportSell: {
              name: "Teleport to Sell",
              original: "shift+3",
              custom: null,
            },
            toggleQuickShop: {
              name: "Toggle Quick Shop",
              original: "ctrl+b",
              custom: null,
            },
          },
          mgToolsKeys: {
            openPets: { name: "Open Pets Tab", custom: null },
            openAbilities: { name: "Open Abilities Tab", custom: null },
            openSeeds: { name: "Open Seeds Tab", custom: null },
            openValues: { name: "Open Values Tab", custom: null },
            openTimers: { name: "Open Timers Tab", custom: null },
            openRooms: { name: "Open Rooms Tab", custom: null },
            openShop: { name: "Open Shop Tab", custom: null },
            cyclePresets: { name: "Cycle Pet Presets", custom: null },
          },
        },
        petPresetHotkeys: {},
        popouts: {
          overlays: new Map(), // Track in-game overlays (Alt+key)
          windows: new Map(), // Track separate windows
          widgets: new Map(), // Track shift+click popout widgets
        },
        // PAL4-style filter system
        filterMode: "categories", // categories, byPet, custom
        abilityFilters: {
          xpBoost: true,
          cropSizeBoost: true,
          selling: true,
          harvesting: true,
          growthSpeed: true,
          specialMutations: true,
          other: true,
        },
        customMode: {
          selectedAbilities: {},
        },
        petFilters: {
          selectedPets: {},
        },
      },
      atoms: {
        activePets: [], // Initialize as empty array to prevent null errors
        petAbility: null,
        inventory: null,
        currentCrop: null,
        friendBonus: 1,
        myGarden: null,
        quinoaData: null,
      },

      // --- Database (Remember to include delphinium!!!!!!) ---

      plantsDatabase: await fetchPlantsFromMGAPI(),
    };

    // Export UnifiedState for debugging and external access
    targetWindow.UnifiedState = UnifiedState;

    /* CHECKPOINT removed: UNIFIED_STATE_COMPLETE */

    // ==================== DEBUG FUNCTIONS ====================
    window.debugSettingsPersistence = function () {
      productionLog("=== SETTINGS PERSISTENCE DEBUG ===");
      productionLog("Current settings in memory:", UnifiedState.data.settings);
      productionLog("Settings in GM storage:", GM_getValue("MGA_data"));
      productionLog(
        "Settings in localStorage:",
        localStorage.getItem("MGA_data"),
      );
      productionLog("Handlers attached:", {
        settings: !!document.querySelector("[data-handler-setup]"),
        count: document.querySelectorAll("[data-handler-setup]").length,
      });
      productionLog("===================================");
    };

    // Emergency save on page unload
    window.addEventListener("beforeunload", () => {
      // Force save all settings before page unload
      if (UnifiedState && UnifiedState.data) {
        try {
          MGA_saveJSON("MGA_data", UnifiedState.data);
          productionLog("🚨 Emergency save triggered on page unload");
        } catch (error) {
          console.error("Emergency save failed:", error);
        }
      }
    });

    // ==================== ROOM STATUS & FIREBASE ====================

    const FIREBASE_CONFIG = {
      apiKey: "AIzaSyBfFW74PLBfLIpYj5dakmKar2wRpLu1ZOA",
      authDomain: "mg-rooms.firebaseapp.com",
      databaseURL: "https://mg-rooms-default-rtdb.firebaseio.com",
      projectId: "mg-rooms",
      storageBucket: "mg-rooms.firebasestorage.app",
      messagingSenderId: "175773159635",
      appId: "1:175773159635:web:6676c5a625c3fe1da74426",
    };

    const REPORT_INTERVAL = 5000; // Report room count every 5 seconds
    const DEFAULT_ROOMS = [
      "MG1",
      "MG2",
      "MG3",
      "MG4",
      "MG5",
      "MG6",
      "MG7",
      "MG8",
      "MG9",
      "MG10",
      "MG11",
      "MG12",
      "MG13",
      "MG14",
      "MG15",
      "SLAY",
      "12MANY",
    ]; // Default tracked rooms
    // REMOVED v3.7.3: Discord activity rooms removed - they use numeric IDs and can't be joined from external browser
    // Discord users see play#1-40 natively in Discord's activity sidebar
    // Browser users should use MG1-10 rooms instead
    const DISCORD_PLAY_ROOMS = []; // Legacy constant kept for compatibility

    // ==================== ROOM REGISTRY ====================
    // Centralized room data with categories for the 2-tab interface
    const RoomRegistry = {
      discord: [
        { id: "12MANY", name: "12MANY", category: "discord" },
        { id: "SLAY", name: "SLAY", category: "discord" },
      ],

      // Magic Circle public rooms (v3.7.4: Renamed to short codes, added MG11-15)
      magicCircle: [
        { id: "MG1", name: "MG1", category: "public" },
        { id: "MG2", name: "MG2", category: "public" },
        { id: "MG3", name: "MG3", category: "public" },
        { id: "MG4", name: "MG4", category: "public" },
        { id: "MG5", name: "MG5", category: "public" },
        { id: "MG6", name: "MG6", category: "public" },
        { id: "MG7", name: "MG7", category: "public" },
        { id: "MG8", name: "MG8", category: "public" },
        { id: "MG9", name: "MG9", category: "public" },
        { id: "MG10", name: "MG10", category: "public" },
        { id: "MG11", name: "MG11", category: "public" },
        { id: "MG12", name: "MG12", category: "public" },
        { id: "MG13", name: "MG13", category: "public" },
        { id: "MG14", name: "MG14", category: "public" },
        { id: "MG15", name: "MG15", category: "public" },
      ],

      // Get all rooms (discord + MG + custom)
      getAllRooms() {
        const custom = (UnifiedState.data.customRooms || [])
          .filter(
            (code) =>
              !this.discord.some((r) => r.id === code) &&
              !this.magicCircle.some((r) => r.id === code),
          )
          .map((code) => ({ id: code, name: code, category: "custom" }));
        return [...this.discord, ...this.magicCircle, ...custom];
      },

      // Get combined MG + custom rooms
      getMGAndCustomRooms() {
        const custom = (UnifiedState.data.customRooms || [])
          .filter(
            (code) =>
              !this.discord.some((r) => r.id === code) &&
              !this.magicCircle.some((r) => r.id === code),
          )
          .map((code) => ({ id: code, name: code, category: "custom" }));
        return [...this.magicCircle, ...custom];
      },
    };

    // Expose RoomRegistry to correct window for room polling system
    // Use targetWindow (unsafeWindow in Tampermonkey, window in regular browser)
    targetWindow.RoomRegistry = RoomRegistry;

    // Detect if running in Discord environment
    function isDiscordEnvironment() {
      try {
        // Check if in Discord iframe or Discord-hosted URL
        const isIframe = window.location !== window.parent.location;
        const isDiscordHost =
          window.location.host.includes("discordsays.com") ||
          window.location.host.endsWith(".discordsays.com");
        const isDiscordActivity = isIframe || isDiscordHost;

        if (UnifiedState.data.settings?.debugMode) {
          productionLog("[Discord Detection]", {
            isIframe,
            isDiscordHost,
            isDiscordActivity,
            host: window.location.host,
          });
        }

        return isDiscordActivity;
      } catch (err) {
        console.error("Failed to detect Discord environment:", err);
        return false;
      }
    }
    // Get current room code from URL
    function getCurrentRoomCode() {
      try {
        const match = window.location.pathname.match(/\/r\/([^/]+)/);
        return match ? match[1].toUpperCase() : null;
      } catch (err) {
        console.error("Failed to get room code:", err);
        return null;
      }
    }

    // Get actual player count from game's room state
    function getActualPlayerCount() {
      try {
        const roomState =
          targetWindow.MagicCircle_RoomConnection?.lastRoomStateJsonable;
        if (!roomState?.child?.data?.userSlots) {
          if (UnifiedState.data.settings.roomDebugMode) {
            productionLog("[Room Status] No userSlots data available", {
              hasRoomConnection: !!targetWindow.MagicCircle_RoomConnection,
              hasRoomState: !!roomState,
              hasChild: !!roomState?.child,
              hasData: !!roomState?.child?.data,
            });
          }
          return null;
        }
        const userSlots = roomState.child.data.userSlots;
        const count = userSlots.filter(
          (slot) => slot !== null && slot !== undefined,
        ).length;
        if (UnifiedState.data.settings.roomDebugMode) {
          productionLog(
            "[Room Status] Player count:",
            count,
            "userSlots:",
            userSlots,
          );
        }
        return count;
      } catch (err) {
        console.error("[Room Status] Failed to get player count:", err);
        return null;
      }
    }

    // Generate unique reporter ID
    function getReporterId() {
      if (!UnifiedState.data.roomStatus.reporterId) {
        if (typeof crypto !== "undefined" && crypto.randomUUID) {
          UnifiedState.data.roomStatus.reporterId = crypto.randomUUID();
        } else {
          UnifiedState.data.roomStatus.reporterId =
            "reporter_" +
            Date.now() +
            "_" +
            Math.random().toString(36).substr(2, 9);
        }
      }
      return UnifiedState.data.roomStatus.reporterId;
    }

    // Room API helpers - matches endpoint used by community scripts
    function buildRoomApiUrl(roomIdOrCode, endpoint = "info") {
      return `${location.origin}/api/rooms/${encodeURIComponent(roomIdOrCode)}/${endpoint}`;
    }

    async function requestRoomEndpoint(roomIdOrCode, options = {}) {
      const endpoint = options.endpoint ?? "info";
      const url = buildRoomApiUrl(roomIdOrCode, endpoint);
      const timeoutMs = options.timeoutMs ?? 10000;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await Network.fetch(url, {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });
        const body = await res.text();
        const parsed = res.ok ? JSON.parse(body) : undefined;
        return { status: res.status, ok: res.ok, body, parsed };
      } catch (err) {
        throw new Error(`Room endpoint fetch failed: ${err.message}`);
      } finally {
        clearTimeout(timeout);
      }
    }

    // Load Firebase SDK and initialize with authentication

    async function initializeFirebase() {
      // Replaced Firebase with /info poller stub - integrates with existing listener
      try {
        const firebase = {
          __useInfo: true,
          getDatabase() {
            return {};
          },
          ref(db, path) {
            return { path };
          },
          onValue(refObj, callback) {
            let abort = false;
            const fetchInfo = async (room) => {
              try {
                // Use /api/rooms/{id}/info endpoint - works for both simple codes and Discord IDs
                const response = await requestRoomEndpoint(room, {
                  endpoint: "info",
                  timeoutMs: 10000,
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const payload = response.parsed;
                // Extract numPlayers from response (standard pattern)
                const players =
                  typeof payload?.numPlayers === "number"
                    ? payload.numPlayers
                    : 0;
                const count = Math.max(0, Math.min(6, Math.floor(players)));

                return {
                  count,
                  lastUpdate: Date.now(),
                  reporter: getReporterId(),
                };
              } catch (err) {
                if (UnifiedState.data.settings?.roomDebugMode) {
                  console.warn(
                    `[Room API] Failed to fetch ${room}:`,
                    err.message,
                  );
                }
                return {
                  count: 0,
                  lastUpdate: Date.now(),
                  reporter: getReporterId(),
                };
              }
            };
            async function tick() {
              if (abort) return;
              const out = {};

              // Poll custom rooms (MG1-15, SLAY, user-added)
              for (const rc of UnifiedState.data.customRooms) {
                out[rc] = await fetchInfo(rc);
              }

              // Poll Discord rooms (play1-play50, country rooms)
              if (RoomRegistry && RoomRegistry.discord) {
                for (const room of RoomRegistry.discord) {
                  out[room.id] = await fetchInfo(room.id);
                }
              }

              const snapshot = { val: () => out };
              try {
                callback(snapshot);
              } catch (e) {
                console.error("rooms onValue cb error", e);
              }
            }
            tick();
            const iv = setInterval(tick, 5000);
            return function unsubscribe() {
              abort = true;
              clearInterval(iv);
            };
          },
          set() {
            /* no-op in /info mode */
          },
          onDisconnect() {
            return { remove() {} };
          },
        };
        productionLog("✅ /info rooms mode enabled (Firebase stubbed)");
        return firebase;
      } catch (err) {
        console.error("❌ initializeFirebase (/info) failed", err);
        return null;
      }
    }

    // Start reporting current room's player count
    async function startRoomReporting(firebases) {
      const FIREBASE_CONFIG = {
        apiKey: "AIzaSyDW_p602lr7Itqe0-JrSVwaeVt7Y5bxciQ",
        authDomain: "public-rooms.firebaseapp.com",
        databaseURL: "https://public-rooms-default-rtdb.firebaseio.com",
        projectId: "public-rooms",
        storageBucket: "public-rooms.firebasestorage.app",
        messagingSenderId: "479424427769",
        appId: "1:479424427769:web:eddee292003df0a8659428",
        measurementId: "G-3EZQXLXWZN",
      };

      let database, app;
      if (
        typeof firebase !== "undefined" &&
        typeof firebase.apps !== "undefined"
      ) {
        if (!firebase.apps.length) {
          app = firebase.initializeApp(FIREBASE_CONFIG);
        } else {
          app = firebase.app();
        }
        database = firebase.database();
        productionLog(
          "[Public Rooms] Firebase initialized for background operations",
        );
      } else {
        console.error(
          "[Public Rooms] Firebase SDK is missing. Cannot initialize.",
        );
      }

      const roomCode = getCurrentRoomCode();
      if (!roomCode) return;

      UnifiedState.data.roomStatus.currentRoom = roomCode;

      try {
        const { ref, set, onDisconnect } = database;
        const currentRoomRef = database.ref(`rooms/${roomCode}`);

        // Try to report immediately, with retry logic
        let count = getActualPlayerCount();
        let retryCount = 0;
        const maxRetries = 10;

        // If no data yet, retry every 500ms for up to 5 seconds
        while (count === null && retryCount < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          count = getActualPlayerCount();
          retryCount++;
          if (UnifiedState.data.settings.roomDebugMode) {
            productionLog(
              `[Room Status] Retry ${retryCount}/${maxRetries} for ${roomCode}...`,
            );
          }
        }

        if (count === null) {
          console.warn(
            `[Room Status] No player data available after ${maxRetries} retries for ${roomCode}`,
          );
          // Still start the interval reporting - it will catch it later
        } else {
          console.error("rooms/" + roomCode.toUpperCase() + "/playerCount");
          await database
            .ref("rooms/" + roomCode.toUpperCase() + "/playerCount")
            .set(count);

          // Update local state immediately so user sees their own room count
          if (!UnifiedState.data.roomStatus.counts) {
            UnifiedState.data.roomStatus.counts = {};
          }
          UnifiedState.data.roomStatus.counts[roomCode] = count;

          productionLog(`📊 Reported ${count} players in ${roomCode}`);
        }

        // Set up onDisconnect cleanup

        // Start interval reporting
        // Debounced reporting: Only update Firebase if count actually changed
        let lastReportedCount = count !== null ? count : -1; // Initialize with actual count or -1 if no data yet
        let lastForceReportTime = Date.now();
        const FORCE_REPORT_INTERVAL = 60000; // Force report every 60 seconds even if no change

        UnifiedState.firebase.reportInterval = setInterval(async () => {
          try {
            const currentCount = getActualPlayerCount();

            // Skip if we don't have valid data yet
            if (currentCount === null) {
              if (UnifiedState.data.settings.roomDebugMode) {
                productionLog(
                  "[Room Status] Skipping report - no player data available yet",
                );
              }
              return;
            }

            const now = Date.now();
            const timeSinceLastReport = now - lastForceReportTime;
            const shouldForceReport =
              timeSinceLastReport >= FORCE_REPORT_INTERVAL;

            // Only report if count changed OR it's time for a forced update
            if (currentCount === lastReportedCount && !shouldForceReport) {
              return;
            }

            const previousCount = lastReportedCount;
            lastReportedCount = currentCount;
            lastForceReportTime = now;

            console.error("rooms/" + roomCode.toUpperCase() + "/playerCount");
            await database
              .ref("rooms/" + roomCode.toUpperCase() + "/playerCount")
              .set(currentCount);

            // Update local state immediately
            UnifiedState.data.roomStatus.counts[roomCode] = currentCount;

            if (UnifiedState.data.settings.roomDebugMode) {
              productionLog(
                `[Room Status] Reported count: ${currentCount} (changed from ${previousCount}, forced: ${shouldForceReport})`,
              );
            }
          } catch (err) {
            console.error("Failed to report room count:", err);
          }
        }, REPORT_INTERVAL);
      } catch (err) {
        console.error("Failed to start room reporting:", err);
      }
    }

    startRoomReporting({
      apiKey: "AIzaSyDW_p602lr7Itqe0-JrSVwaeVt7Y5bxciQ",
      authDomain: "public-rooms.firebaseapp.com",
      databaseURL: "https://public-rooms-default-rtdb.firebaseio.com",
      projectId: "public-rooms",
      storageBucket: "public-rooms.firebasestorage.app",
      messagingSenderId: "479424427769",
      appId: "1:479424427769:web:eddee292003df0a8659428",
      measurementId: "G-3EZQXLXWZN",
    });
    // Listen to all room counts
    function startRoomListener(firebase) {
      if (!firebase) return;

      try {
        const { ref, onValue } = firebase;
        const allRoomsRef = ref(UnifiedState.firebase.database, "roomCounts");

        UnifiedState.firebase.unsubscribe = onValue(allRoomsRef, (snapshot) => {
          const roomData = snapshot.val() || {};
          productionLog(
            "[Room Status] Received update from Firebase:",
            roomData,
          );

          // Update room counts - use the highest count from fresh data to prevent flickering
          const counts = {};
          UnifiedState.data.customRooms.forEach((roomCode) => {
            if (roomData[roomCode]) {
              const age = Date.now() - (roomData[roomCode].lastUpdate || 0);
              const newCount = age < 30000 ? roomData[roomCode].count || 0 : 0;

              // Use the higher of the new count or existing count (prevents flickering from 6->0->6)
              // Only accept decreases if the data is very fresh (< 3s old) - prevents stale 0 reports from overwriting real data
              const existingCount =
                UnifiedState.data.roomStatus.counts[roomCode] || 0;
              if (newCount >= existingCount || age < 3000) {
                counts[roomCode] = newCount;
              } else {
                counts[roomCode] = existingCount;
              }

              productionLog(
                `[Room Status] ${roomCode}: ${counts[roomCode]} players (new: ${newCount}, existing: ${existingCount}, age: ${Math.round(age / 1000)}s)`,
              );
            } else {
              counts[roomCode] = 0;
            }
          });

          UnifiedState.data.roomStatus.counts = counts;
          productionLog("[Room Status] Updated counts:", counts);

          // Update display if rooms tab is active
          updateRoomStatusDisplay();
        });

        productionLog("✅ Listening to all room counts");
      } catch (err) {
        console.error("Failed to start room listener:", err);
      }
    }

    // Update room status display
    function updateRoomStatusDisplay() {
      // BUGFIX v3.7.3: Rewritten to properly handle 2-tab UI (MG vs Discord)
      // OLD: Only updated single #room-status-list (broken for 2-tab layout)
      // NEW: Re-renders entire rooms tab content for both tabs

      // BUGFIX v3.7.7: Only update if rooms tab is currently active
      if (UnifiedState.activeTab !== "rooms") {
        productionLog("[Rooms] Rooms tab not active - skipping update");
        return;
      }

      // Find the main tab content container
      const container = document.getElementById("mga-tab-content");
      if (!container) {
        productionLog(
          "[Rooms] Tab content container not found - skipping update",
        );
        return;
      }

      // Re-generate complete rooms tab HTML with current state
      const freshHTML = getRoomStatusTabContent();

      // Update the container
      container.innerHTML = freshHTML;

      // Re-attach ALL event handlers after DOM update
      setupRoomJoinButtons(); // Handle ALL room interactions (join, delete, drag-drop, search, add)
      setupRoomsTabButtons(); // Handle MG/Discord tab switching

      // Update popout window if it exists
      refreshSeparateWindowPopouts("rooms");

      productionLog("[Rooms] Room status display updated successfully");
    }

    // Setup join button handlers
    function setupRoomJoinButtons() {
      document
        .querySelectorAll(".room-join-btn:not([data-handler-attached])")
        .forEach((btn) => {
          btn.setAttribute("data-handler-attached", "true");
          btn.addEventListener("click", () => {
            const roomCode = btn.getAttribute("data-room");
            const host = window.location.host;
            window.location.href = `https://${host}/r/${roomCode}`;
          });
        });

      // Setup room search input - aggressive event blocking
      const searchInput = document.getElementById("room-search-input");
      if (searchInput && !searchInput.hasAttribute("data-handler-attached")) {
        searchInput.setAttribute("data-handler-attached", "true");

        // Prevent game from stealing focus on ANY key
        let isFocused = false;
        searchInput.addEventListener("focus", () => {
          isFocused = true;
        });
        searchInput.addEventListener("blur", (e) => {
          // Re-focus immediately if we're supposed to be focused
          if (isFocused && searchInput.value.length >= 0) {
            e.preventDefault();
            setTimeout(() => searchInput.focus(), 0);
          } else {
            isFocused = false;
          }
        });

        // Block ALL key events from reaching game - document level capture
        ["keydown", "keypress", "keyup"].forEach((eventType) => {
          document.addEventListener(
            eventType,
            (e) => {
              if (
                e.target === searchInput ||
                document.activeElement === searchInput
              ) {
                e.stopPropagation();
                e.stopImmediatePropagation();
              }
            },
            true,
          );
        });

        searchInput.addEventListener("input", (e) => {
          const query = e.target.value.trim().toUpperCase();
          const roomList = document.getElementById("room-status-list");

          // NEVER call updateTabContent() during typing - it rebuilds everything!

          if (!query) {
            // Show all rooms without rebuilding
            const allRooms = document.querySelectorAll(".room-status-item");
            allRooms.forEach((room) => (room.style.display = "flex"));

            // Hide search result div if it exists
            const searchResult = document.getElementById("room-search-result");
            if (searchResult) searchResult.style.display = "none";
            return;
          }

          // Check if this is a tracked room
          const isTrackedRoom = UnifiedState.data.customRooms.includes(query);

          if (isTrackedRoom) {
            // Filter tracked rooms WITHOUT rebuilding
            const roomItems = document.querySelectorAll(".room-status-item");
            roomItems.forEach((item) => {
              const roomCode =
                item.dataset.roomCode ||
                item.querySelector(".room-code")?.textContent;
              if (roomCode && roomCode.includes(query)) {
                item.style.display = "flex";
              } else {
                item.style.display = "none";
              }
            });

            // Hide search result if showing
            const searchResult = document.getElementById("room-search-result");
            if (searchResult) searchResult.style.display = "none";
          } else {
            // Show search UI for non-tracked rooms
            let searchResultDiv = document.getElementById("room-search-result");
            if (!searchResultDiv) {
              // Create the search result div once
              searchResultDiv = document.createElement("div");
              searchResultDiv.id = "room-search-result";
              roomList.insertBefore(searchResultDiv, roomList.firstChild);
            }

            const currentRoom = getCurrentRoomCode();
            const roomCounts = UnifiedState.data.roomStatus?.counts || {};
            const count = roomCounts[query] || 0;

            searchResultDiv.innerHTML = `
                          <div style="padding: 12px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255, 255, 255, 0.73); border-radius: 6px; margin-bottom: 8px;">
                              <div style="display: flex; align-items: center; justify-content: space-between;">
                                  <div style="display: flex; align-items: center; gap: 12px;">
                                      <span style="font-weight: bold; color: #e5e7eb; font-size: 14px;">${query}</span>
                                      <span style="color: ${count > 0 ? "#4ade80" : "#94a3b8"}; font-size: 13px;">${count > 0 ? `${count} online` : "No data"}</span>
                                  </div>
                                  <button class="mga-button" onclick="window.location.href='https://${window.location.host}/r/${query}'"
                                      style="padding: 6px 14px; font-size: 12px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                      Join
                                  </button>
                              </div>
                              <div style="font-size: 10px; color: #888; margin-top: 4px;">
                                  ${count > 0 ? "At least one MGTools user is in this room" : "Room may be empty or no MGTools users reporting"}
                              </div>
                          </div>
                      `;
            searchResultDiv.style.display = "block";

            // Hide all tracked rooms
            const roomItems = document.querySelectorAll(".room-status-item");
            roomItems.forEach((item) => (item.style.display = "none"));
          }
        });
      }

      // Setup add room button handler
      const addRoomBtn = document.getElementById("add-room-btn");
      const addRoomInput = document.getElementById("add-room-input");

      if (
        addRoomBtn &&
        addRoomInput &&
        !addRoomBtn.hasAttribute("data-handler-attached")
      ) {
        addRoomBtn.setAttribute("data-handler-attached", "true");

        const handleAddRoom = () => {
          const roomCode = addRoomInput.value.trim().toUpperCase();

          // Validate room code
          if (!roomCode) {
            alert("Please enter a room code");
            return;
          }

          // Check if already exists
          if (UnifiedState.data.customRooms.includes(roomCode)) {
            alert(`Room "${roomCode}" is already in your list`);
            return;
          }

          // Add to custom rooms
          UnifiedState.data.customRooms.push(roomCode);
          MGA_saveJSON("MGA_data", UnifiedState.data);

          productionLog(
            "[FIX_ROOMS] Added to polling:",
            roomCode,
            "Total rooms:",
            UnifiedState.data.customRooms.length,
          );

          // Clear input
          addRoomInput.value = "";

          // Immediately fetch room info instead of waiting for next poll
          (async () => {
            try {
              const apiBase = window.getGameApiBaseUrl
                ? window.getGameApiBaseUrl()
                : location.origin;
              const url = `${apiBase}/api/rooms/${encodeURIComponent(roomCode)}/info`;

              if (CONFIG.DEBUG.FLAGS.FIX_VALIDATION) {
                productionLog(
                  "[FIX_ROOMS] Immediately fetching room info:",
                  url,
                );
              }

              const response = await fetch(url);
              if (response.ok) {
                const data = await response.json();

                if (CONFIG.DEBUG.FLAGS.FIX_VALIDATION) {
                  productionLog("[FIX_ROOMS] Got immediate room data:", data);
                }

                // Extract player count and store it in UnifiedState
                if (data && typeof data.numPlayers === "number") {
                  if (!UnifiedState.data.roomStatus) {
                    UnifiedState.data.roomStatus = {
                      counts: {},
                      lastUpdate: {},
                    };
                  }
                  if (!UnifiedState.data.roomStatus.counts) {
                    UnifiedState.data.roomStatus.counts = {};
                  }

                  UnifiedState.data.roomStatus.counts[roomCode] = Math.max(
                    0,
                    Math.min(6, data.numPlayers),
                  );
                  UnifiedState.data.roomStatus.lastUpdate[roomCode] =
                    Date.now();

                  // ADDED: Save to persistent storage
                  MGA_saveJSON("MGA_roomStatus", UnifiedState.data.roomStatus);

                  if (
                    UnifiedState.data.settings?.debugMode ||
                    UnifiedState.data.settings?.roomDebugMode
                  ) {
                    productionLog(
                      "[FIX_ROOMS] Stored player count for",
                      roomCode,
                      ":",
                      UnifiedState.data.roomStatus.counts[roomCode],
                    );
                    productionLog("[FIX_ROOMS] Saved roomStatus to storage");
                  }
                }

                // Update display with fresh data
                updateRoomStatusDisplay();
              } else {
                if (
                  UnifiedState.data.settings?.debugMode ||
                  UnifiedState.data.settings?.roomDebugMode
                ) {
                  console.warn(
                    "[FIX_ROOMS] Failed to fetch room info:",
                    response.status,
                  );
                }
                // Still refresh display to show the room was added (will show 0/6 initially)
                updateRoomStatusDisplay();
              }
            } catch (error) {
              if (
                UnifiedState.data.settings?.debugMode ||
                UnifiedState.data.settings?.roomDebugMode
              ) {
                console.error("[FIX_ROOMS] Error fetching room info:", error);
              }
              // Still refresh display
              updateRoomStatusDisplay();
            }
          })();

          productionLog(`[Rooms] Added custom room: ${roomCode}`);
        };

        addRoomBtn.addEventListener("click", handleAddRoom);

        // Also add on Enter key
        addRoomInput.addEventListener("keypress", (e) => {
          if (e.key === "Enter") {
            handleAddRoom();
          }
        });

        // Stop hotkeys from triggering when typing in add room input
        addRoomInput.addEventListener("keydown", (e) => {
          e.stopPropagation();
        });
        addRoomInput.addEventListener("keyup", (e) => {
          e.stopPropagation();
        });
        addRoomInput.addEventListener("keypress", (e) => {
          e.stopPropagation();
        });
      }

      // Setup delete room button handlers
      document
        .querySelectorAll(".room-delete-btn:not([data-handler-attached])")
        .forEach((btn) => {
          btn.setAttribute("data-handler-attached", "true");
          btn.addEventListener("click", (e) => {
            e.stopPropagation(); // Don't trigger parent clicks

            const roomCode = btn.getAttribute("data-room");

            // Confirm deletion
            if (!confirm(`Remove "${roomCode}" from your tracked rooms?`)) {
              return;
            }

            // Remove from custom rooms
            UnifiedState.data.customRooms =
              UnifiedState.data.customRooms.filter((code) => code !== roomCode);
            MGA_saveJSON("MGA_data", UnifiedState.data);

            if (CONFIG.DEBUG.FLAGS.FIX_VALIDATION) {
              productionLog(
                "[FIX_ROOMS] Removed from polling:",
                roomCode,
                "Remaining rooms:",
                UnifiedState.data.customRooms.length,
              );
            }

            // Refresh display
            updateRoomStatusDisplay();

            productionLog(`[Rooms] Removed custom room: ${roomCode}`);
          });
        });

      // Setup drag-and-drop reordering
      let draggedElement = null;
      let draggedRoomCode = null;

      document.querySelectorAll(".room-item").forEach((item) => {
        // Dragstart
        item.addEventListener("dragstart", (e) => {
          draggedElement = item;
          draggedRoomCode = item.getAttribute("data-room");
          item.style.opacity = "0.5";
          item.style.cursor = "grabbing";
          e.dataTransfer.effectAllowed = "move";

          // Create transparent 1x1 canvas to completely hide drag image
          const canvas = document.createElement("canvas");
          canvas.width = 1;
          canvas.height = 1;
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, 1, 1); // Transparent pixel

          // Set as drag image (offset by -10, -10 to hide completely)
          e.dataTransfer.setDragImage(canvas, -10, -10);
        });

        // Dragend
        item.addEventListener("dragend", (e) => {
          item.style.opacity = "1";
          item.style.cursor = "grab";
          draggedElement = null;
          draggedRoomCode = null;
        });

        // Dragover
        item.addEventListener("dragover", (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";

          if (draggedElement && draggedElement !== item) {
            // Visual feedback
            item.style.borderTop = "2px solid #4a9eff";
          }
        });

        // Dragleave
        item.addEventListener("dragleave", (e) => {
          item.style.borderTop = "";
        });

        // Drop
        item.addEventListener("drop", (e) => {
          e.preventDefault();
          item.style.borderTop = "";

          if (!draggedRoomCode || !draggedElement) return;

          const targetRoomCode = item.getAttribute("data-room");

          if (draggedRoomCode === targetRoomCode) return;

          // Reorder the customRooms array
          const newOrder = [...UnifiedState.data.customRooms];
          const draggedIndex = newOrder.indexOf(draggedRoomCode);
          const targetIndex = newOrder.indexOf(targetRoomCode);

          if (draggedIndex === -1 || targetIndex === -1) return;

          // Remove dragged item
          newOrder.splice(draggedIndex, 1);

          // Insert at new position
          const insertIndex =
            draggedIndex < targetIndex ? targetIndex : targetIndex;
          newOrder.splice(insertIndex, 0, draggedRoomCode);

          // Update state
          UnifiedState.data.customRooms = newOrder;
          MGA_saveJSON("MGA_data", UnifiedState.data);

          // Refresh display
          updateRoomStatusDisplay();

          productionLog(
            `[Rooms] Reordered: moved ${draggedRoomCode} to position ${insertIndex + 1}`,
          );
        });
      });
    }

    // Setup rooms tab switching buttons
    function setupRoomsTabButtons() {
      document
        .querySelectorAll(".rooms-tab-btn:not([data-handler-attached])")
        .forEach((btn) => {
          btn.setAttribute("data-handler-attached", "true");
          btn.addEventListener("click", () => {
            const tabName = btn.getAttribute("data-tab");

            // Update state
            UnifiedState.data.activeRoomsTab = tabName;
            MGA_saveJSON("MGA_data", UnifiedState.data);

            // Refresh the rooms display to show the correct tab
            updateRoomStatusDisplay();
          });
        });
    }

    // ==================== SIMPLE PET DETECTION ====================
    function getActivePetsFromRoomState() {
      productionLog(
        "🔧 [DEBUG] getActivePetsFromRoomState() called - checking for pets...",
      );
      try {
        // CORRECT path: Get the actual atom value that console shows
        const roomState =
          targetWindow.MagicCircle_RoomConnection?.lastRoomStateJsonable;
        // Reduced logging for performance
        // productionLog('🔧 [DEBUG] roomState available:', !!roomState, roomState?.child?.data ? 'data exists' : 'no data');
        if (!roomState?.child?.data) {
          productionLog("🐾 [SIMPLE-PETS] No room state data");
          return [];
        }

        // Debug: Log the actual structure (disabled for performance)
        // productionLog('🐾 [DEBUG] Actual roomState.child.data structure:', JSON.stringify(roomState.child.data, null, 2).substring(0, 500));
        // productionLog('🐾 [DEBUG] roomState.child.data keys:', Object.keys(roomState.child.data || {}));

        // Try multiple data sources in priority order
        let petData = null;

        // Source 1: Check if pet data is directly in child.data (field1, field2, field3 format)
        if (roomState.child.data.field1 !== undefined) {
          petData = roomState.child.data;
          productionLog(
            "🐾 [SIMPLE-PETS] Found pet data in child.data directly",
          );
        }

        // Source 2: No longer needed - using myPetSlotsAtom instead
        // Room state userSlots doesn't contain species info

        if (!petData) {
          if (UnifiedState.data.settings?.debugMode) {
            productionLog("🐾 [SIMPLE-PETS] No pet data found in room state");
          }

          // FALLBACK: Use atom data if available
          if (window.activePets && window.activePets.length > 0) {
            if (UnifiedState.data.settings?.debugMode) {
              productionLog(
                "🐾 [FALLBACK] Using pets from myPetSlotsAtom:",
                window.activePets,
              );
            }
            return window.activePets;
          }

          if (UnifiedState.data.settings?.debugMode) {
            productionLog(
              "🐾 [SIMPLE-PETS] No pet data found in room state or atoms",
            );
          }
          return [];
        }

        // Extract pets from field1, field2, field3 format (the actual console format)
        const pets = [];
        const fields = [petData.field1, petData.field2, petData.field3];
        fields.forEach((species, index) => {
          if (species && species !== "" && typeof species === "string") {
            pets.push({ petSpecies: species, slot: index + 1 });
          }
        });

        productionLog("🐾 [SIMPLE-PETS] Extracted pets:", pets);
        return pets;
      } catch (error) {
        productionLog("🐾 [SIMPLE-PETS] Error:", error.message);
        return [];
      }
    }

    function updateActivePetsFromRoomState() {
      // Removed excessive debug logging to improve performance
      // productionLog('🔧 [DEBUG] updateActivePetsFromRoomState() called');
      const roomPets = getActivePetsFromRoomState();
      const previousCount = UnifiedState.atoms.activePets?.length || 0;

      // CRITICAL BUGFIX: Don't overwrite if we already have better data from atom hook
      // The atom gives us FULL pet data with hunger, abilities, etc.
      // Room state only gives us petSpecies and slot - incomplete data!
      if (
        window.activePets &&
        window.activePets.length > 0 &&
        window.activePets[0] &&
        window.activePets[0].hunger !== undefined
      ) {
        // We have full atom data with hunger - preserve it!
        productionLog(
          "🐾 [SIMPLE-PETS] Preserving existing full pet data from atom (has hunger)",
        );

        // Only update species info if it's missing
        roomPets.forEach((roomPet, index) => {
          if (
            window.activePets[index] &&
            !window.activePets[index].petSpecies &&
            roomPet.petSpecies
          ) {
            window.activePets[index].petSpecies = roomPet.petSpecies;
            productionLog(
              `🐾 [SIMPLE-PETS] Added missing species ${roomPet.petSpecies} to slot ${index + 1}`,
            );
          }
        });

        UnifiedState.atoms.activePets = window.activePets;
        return window.activePets; // Return the good data
      }

      // Only use room state data if we have NO atom data or it's incomplete
      UnifiedState.atoms.activePets = roomPets;
      window.activePets = roomPets; // Expose globally for debugging (use window to avoid modifying page)

      const newCount = roomPets.length;
      if (newCount !== previousCount) {
        productionLog(
          `🐾 [SIMPLE-PETS] Pet count changed: ${previousCount} → ${newCount}`,
        );

        // Update UI if pets tab is active
        if (UnifiedState.activeTab === "pets") {
          const context = document.getElementById("mga-tab-content");
          if (context && typeof updateActivePetsDisplay === "function") {
            updateActivePetsDisplay(context);
          }
        }
      }

      return roomPets;
    }

    // ==================== INTERVAL MANAGEMENT ====================
    function setManagedInterval(name, callback, delay) {
      // Clear existing interval if it exists
      if (UnifiedState.intervals[name]) {
        clearInterval(UnifiedState.intervals[name]);
      }

      // Set new interval and store reference
      UnifiedState.intervals[name] = setInterval(callback, delay);
      debugLog("PERFORMANCE", `Created managed interval: ${name} (${delay}ms)`);
      return UnifiedState.intervals[name];
    }

    function clearManagedInterval(name) {
      if (UnifiedState.intervals[name]) {
        clearInterval(UnifiedState.intervals[name]);
        UnifiedState.intervals[name] = null;
        debugLog("PERFORMANCE", `Cleared managed interval: ${name}`);
      }
    }

    function clearAllManagedIntervals() {
      Object.keys(UnifiedState.intervals).forEach((name) => {
        clearManagedInterval(name);
      });
      debugLog("PERFORMANCE", "Cleared all managed intervals");
    }

    function trackPopoutWindow(popoutWindow) {
      UnifiedState.popoutWindows.add(popoutWindow);

      // Add cleanup listener
      popoutWindow.addEventListener("beforeunload", () => {
        UnifiedState.popoutWindows.delete(popoutWindow);
      });
    }

    function closeAllPopoutWindows() {
      UnifiedState.popoutWindows.forEach((window) => {
        try {
          window.close();
        } catch (e) {
          debugError("PERFORMANCE", "Error closing popout window", e);
        }
      });
      UnifiedState.popoutWindows.clear();
    }

    /* CHECKPOINT removed: INTERVAL_MANAGEMENT_COMPLETE */

    // ==================== ENVIRONMENT DETECTION ====================
    function detectEnvironment() {
      const environment = {
        isGameEnvironment: false,
        isStandalone: false,
        isDiscordEmbed: false,
        gameReady: false,
        url: targetWindow.location.href,
        hasJotaiAtoms: !!(
          (targetWindow.jotaiAtomCache?.cache || targetWindow.jotaiAtomCache)
            ?.size > 0
        ),
        hasMagicCircleConnection: !!(
          targetWindow.MagicCircle_RoomConnection &&
          typeof targetWindow.MagicCircle_RoomConnection === "object"
        ),
        domain: targetWindow.location.hostname,
        readyState: document.readyState,
      };

      // DEBUG: Log environment details at start
      productionLog("🔍 [ENV-DEBUG] Detecting environment:", {
        domain: environment.domain,
        pathname: targetWindow.location.pathname,
        url: environment.url,
        hasAtoms: environment.hasJotaiAtoms,
        hasConnection: environment.hasMagicCircleConnection,
      });

      // PRIORITY FIX: Check for game environment FIRST (before Discord check)
      // This ensures that when running inside game iframe in Discord, we detect game mode
      const gameHosts = [
        "magiccircle.gg",
        "magicgarden.gg",
        "starweaver.org",
        "discordsays.com",
      ];
      const isGameDomain = gameHosts.some((host) =>
        environment.domain.includes(host),
      );
      const hasGamePath = targetWindow.location.pathname.includes("/r/");
      const isDiscordActivity = environment.domain.includes("discordsays.com");

      productionLog("🔍 [ENV-DEBUG] Game checks:", {
        isGameDomain,
        hasGamePath,
        isDiscordActivity,
        willEnterGameMode: isGameDomain && (hasGamePath || isDiscordActivity),
      });

      // Game environment: Regular game domains with /r/ path OR Discord Activities (no /r/ needed)
      if (isGameDomain && (hasGamePath || isDiscordActivity)) {
        // We're in the game environment (works in Discord iframes, standalone, and everywhere)
        const isInIframe = window.location !== window.parent.location;
        const isDiscordDesktopApp = window.DiscordNative !== undefined;

        productionLog(
          "🎮 [ENV] Running in game environment:",
          environment.domain,
        );
        if (isDiscordActivity) {
          productionLog(
            "🎮 [DISCORD-ACTIVITY] Detected Discord Activity iframe!",
          );
        }
        productionLog(
          "🎮 [ENV] IsIframe:",
          isInIframe,
          "| DiscordNative:",
          isDiscordDesktopApp,
        );
        environment.isGameEnvironment = true;
        environment.isStandalone = false;
        environment.gameReady =
          environment.hasJotaiAtoms &&
          environment.hasMagicCircleConnection &&
          document.readyState === "complete";

        // Determine initialization strategy
        let initStrategy = "unknown";
        if (environment.gameReady) {
          initStrategy = "game-ready";
        } else {
          initStrategy = "game-wait";
        }
        environment.initStrategy = initStrategy;

        return environment;
      }

      // Check if we're on Discord page (not in game iframe)
      const isDiscordDomain = environment.domain.includes("discord.com");
      if (isDiscordDomain) {
        environment.isDiscordEmbed = true;
        productionLog(
          "🎮 [DISCORD] Running on Discord page - looking for game iframe...",
        );

        // Try to find the game iframe (gameHosts already includes discordsays.com)
        const gameIframes = document.querySelectorAll("iframe");
        let foundGameIframe = false;
        for (const iframe of gameIframes) {
          try {
            const iframeSrc = iframe.src || "";
            // gameHosts includes all game domains plus discordsays.com
            if (gameHosts.some((host) => iframeSrc.includes(host))) {
              productionLog("✅ [DISCORD] Found game iframe:", iframeSrc);
              productionLog(
                "💡 [DISCORD] Script should be running inside that iframe",
              );
              foundGameIframe = true;
            }
          } catch (e) {
            // Cross-origin iframe, can't access
          }
        }

        if (foundGameIframe) {
          productionLog(
            "⚠️ [DISCORD] On Discord page - script will only run inside the game iframe, not on Discord page itself",
          );
        } else {
          productionLog(
            "⚠️ [DISCORD] On Discord page but no game iframe found yet",
          );
        }

        // Skip initialization on Discord page - only run inside the iframe
        environment.isStandalone = false;
        environment.initStrategy = "skip";
        return environment;
      }

      // Not a game domain or Discord - standalone mode
      environment.isGameEnvironment = false;
      environment.isStandalone = true;
      environment.gameReady = false;

      // Determine initialization strategy
      let initStrategy = "unknown";
      if (environment.gameReady) {
        initStrategy = "game-ready";
      } else if (environment.isGameEnvironment) {
        initStrategy = "game-wait";
      } else {
        initStrategy = "standalone";
      }

      environment.initStrategy = initStrategy;

      // ==================== PLATFORM & DEVICE DETECTION ====================
      window.MGA_Platform = {
        // Platform detection
        isDiscord:
          /discord|overlay|electron/i.test(navigator.userAgent) ||
          !!(window.DiscordNative || window.__discordApp),

        isMobile:
          /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
          window.matchMedia?.("(max-width: 768px)").matches,

        isIframe: window !== window.top,

        isTouch: "ontouchstart" in window || navigator.maxTouchPoints > 0,

        // Get current layout mode
        getLayout() {
          if (this.isMobile) return "mobile";
          if (this.isDiscord) return "discord";
          return "desktop";
        },

        // Get UI scale factor based on platform
        getScaleFactor() {
          if (this.isMobile) return 0.85; // Smaller UI for mobile
          if (this.isDiscord) return 0.95; // Slightly smaller for Discord
          return 1.0; // Full size for desktop
        },

        // Apply responsive styles based on platform
        applyResponsiveStyles() {
          const layout = this.getLayout();
          const scale = this.getScaleFactor();

          const root = document.documentElement;
          root.style.setProperty("--mga-scale", scale.toString());
          root.style.setProperty("--mga-layout", layout);
          root.setAttribute("data-mga-platform", layout);

          productionLog(
            `[Platform] Detected: ${layout} (scale: ${scale}, touch: ${this.isTouch})`,
          );
        },

        // Get optimized fetch timeout based on platform
        getFetchTimeout() {
          if (this.isMobile) return 8000; // Longer timeout for mobile networks
          if (this.isDiscord) return 6000; // Medium timeout for Discord
          return 5000; // Fast timeout for desktop
        },

        // Get UI animation duration based on platform
        getAnimationDuration() {
          if (this.isMobile) return 200; // Faster animations on mobile
          return 300; // Standard animations on desktop
        },
      };

      // Initialize platform detection
      MGA_Platform.applyResponsiveStyles();

      // Re-apply on resize (debounced)
      let resizeTimer;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          // Re-check mobile status (window size may have changed)
          MGA_Platform.isMobile =
            /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
            window.matchMedia?.("(max-width: 768px)").matches;
          MGA_Platform.applyResponsiveStyles();
        }, 250);
      });

      // Platform-specific initialization
      if (MGA_Platform.isDiscord) {
        productionLog(
          "[Platform] Discord mode: External resources restricted, using bundled assets",
        );
      }

      if (MGA_Platform.isMobile) {
        productionLog("[Platform] Mobile mode: Touch-optimized UI enabled");
      }

      if (MGA_Platform.isTouch) {
        productionLog(
          "[Platform] Touch device detected: Increasing button tap targets",
        );
      }

      return environment;
    }

    function createDemoData() {
      // Create realistic demo data for standalone mode
      const demoData = {
        pets: [
          {
            petSpecies: "Bunny",
            level: 15,
            abilities: ["Harvesting", "Selling"],
            rarity: "Common",
          },
          {
            petSpecies: "Dragon",
            level: 32,
            abilities: ["Growth Speed", "Special Mutations"],
            rarity: "Legendary",
          },
          {
            petSpecies: "Phoenix",
            level: 28,
            abilities: ["Selling", "Harvesting"],
            rarity: "Epic",
          },
          {
            petSpecies: "Unicorn",
            level: 21,
            abilities: ["Growth Speed", "Harvesting"],
            rarity: "Rare",
          },
        ],
        inventory: {
          items: [
            { species: "Carrot", quantity: 145, value: 20 },
            { species: "Apple", quantity: 82, value: 73 },
            { species: "Banana", quantity: 23, value: 1750 },
            { species: "Dragon Fruit", quantity: 7, value: 15000 },
            { species: "Magic Beans", quantity: 3, value: 50000 },
          ],
          totalValue: 285450,
        },
        garden: [
          { species: "Carrot", quantity: 25, value: 15 },
          { species: "Apple", quantity: 12, value: 65 },
          { species: "Banana", quantity: 8, value: 1200 },
        ],
        totalValue: 295875,
        abilityLogs: [
          {
            timestamp: Date.now() - 300000,
            pet: "Dragon",
            ability: "Growth Speed",
            description: "Reduced growth time by 15%",
          },
          {
            timestamp: Date.now() - 240000,
            pet: "Bunny",
            ability: "Harvesting",
            description: "Extra harvest yield +2 items",
          },
          {
            timestamp: Date.now() - 180000,
            pet: "Phoenix",
            ability: "Selling",
            description: "Increased selling price by 8%",
          },
          {
            timestamp: Date.now() - 120000,
            pet: "Unicorn",
            ability: "Growth Speed",
            description: "Reduced growth time by 12%",
          },
          {
            timestamp: Date.now() - 60000,
            pet: "Dragon",
            ability: "Special Mutations",
            description: "Triggered rare mutation chance",
          },
        ],
      };

      return demoData;
    }

    /* CHECKPOINT removed: ENVIRONMENT_DETECTION_COMPLETE */

    // ==================== UTILITIES ====================
    // MGA-specific storage functions using GM_setValue/GM_getValue for reliable persistence

    // ==================== GM STORAGE SYSTEM ====================
    // Reliable storage using Tampermonkey's GM API instead of unreliable localStorage

    function MGA_loadJSON(key, fallback = null) {
      let keyLocal = key;
      // Enforce MGA_ namespace
      if (keyLocal && !String(keyLocal).startsWith("MGA_")) {
        console.error(
          `❌ [MGA-ISOLATION] CRITICAL: Attempted to load with non-MGA key: ${keyLocal}`,
        );
        try {
          console.trace();
        } catch (_) {}
        keyLocal = "MGA_" + keyLocal;
      }
      try {
        const gmAvailable =
          typeof GM_getValue === "function" &&
          typeof GM_setValue === "function";

        // Collect ALL accessible localStorage contexts
        const lsMain =
          typeof window !== "undefined" && window && window.localStorage
            ? window.localStorage
            : null;
        const lsTarg =
          typeof targetWindow !== "undefined" &&
          targetWindow &&
          targetWindow.localStorage
            ? targetWindow.localStorage
            : null;

        const readLS = (ls, k) => {
          if (!ls) return null;
          try {
            return ls.getItem(k);
          } catch (e) {
            return null;
          }
        };

        const toStr = (val) =>
          val == null
            ? null
            : typeof val === "string"
              ? val
              : JSON.stringify(val);
        const tryParseDeep = (val) => {
          if (val == null) return null;
          if (typeof val === "string") {
            const s = val;
            if (s === "" || s === "null" || s === "undefined") return null;
            try {
              let first = JSON.parse(s);
              if (typeof first === "string") {
                try {
                  first = JSON.parse(first);
                } catch (e) {
                  /* keep as string */
                }
              }
              return first;
            } catch (e) {
              return null;
            }
          }
          if (typeof val === "object") return val;
          return null;
        };
        const score = (obj) => {
          if (!obj) return -1;
          if (Array.isArray(obj)) return obj.length;
          if (typeof obj === "object") return Object.keys(obj).length;
          return 0;
        };
        const isEmpty = (obj) => {
          if (!obj) return true;
          if (Array.isArray(obj)) return obj.length === 0;
          if (typeof obj === "object") return Object.keys(obj).length === 0;
          return false;
        };

        // Read raw values
        let gmRaw = null;
        try {
          gmRaw = gmAvailable ? GM_getValue(keyLocal, null) : null;
        } catch (e) {}

        const mainRaw = readLS(lsMain, keyLocal);
        const targRaw = readLS(lsTarg, keyLocal);

        // Parse candidates
        const gmParsed =
          typeof gmRaw === "string"
            ? tryParseDeep(gmRaw)
            : tryParseDeep(toStr(gmRaw));
        const mainParsed =
          tryParseDeep(mainRaw) || tryParseDeep(toStr(mainRaw));
        const targParsed =
          tryParseDeep(targRaw) || tryParseDeep(toStr(targRaw));

        // Choose the best non-empty candidate
        const gmScore = score(gmParsed);
        const mnScore = score(mainParsed);
        const tgScore = score(targParsed);

        let best = null;
        let bestSrc = "none";
        // Prioritize GM storage, then window.localStorage, then targetWindow.localStorage
        // Reject empty objects and arrays explicitly
        if (gmParsed && !isEmpty(gmParsed)) {
          best = gmParsed;
          bestSrc = "GM";
        } else if (mainParsed && !isEmpty(mainParsed)) {
          best = mainParsed;
          bestSrc = "WIN";
        } else if (targParsed && !isEmpty(targParsed)) {
          best = targParsed;
          bestSrc = "TGT";
        }

        try {
          productionLog(
            `[STORAGE-CHOICE] ${keyLocal}: gm=${gmScore} win=${mnScore} tgt=${tgScore} chosen=${bestSrc}`,
          );
        } catch (_) {}

        if (best && (typeof best === "object" || Array.isArray(best))) {
          // Do NOT write during load - only read and return
          // Writing during load was overwriting newer data with older data from other storage locations
          return best;
        }

        // Nothing usable, honor fallback
        return typeof fallback === "undefined" ? null : fallback;
      } catch (err) {
        console.error(
          "[MGA_loadJSON] Unexpected failure for key",
          keyLocal,
          err,
        );
        return typeof fallback === "undefined" ? null : fallback;
      }
    }

    /* ==================== STORAGE SYNC (GM <-> localStorage) ==================== */
    /* ==================== STORAGE SYNC (GM <-> localStorage (both contexts)) ==================== */
    function _MGA_syncStorageBothWays() {
      try {
        const keys = [
          "MGA_data",
          "MGA_petPresets",
          "MGA_petPresetsOrder",
          "MGA_petAbilityLogs",
          "MGA_petAbilityLogs_archive",
          "MGA_seedsToDelete",
          "MGA_autoDeleteEnabled",
          "MGA_filterMode",
          "MGA_abilityFilters",
          "MGA_customMode",
          "MGA_petFilters",
          "MGA_petPresetHotkeys",
          "MGA_hotkeys",
        ];

        const gmAvailable =
          typeof GM_getValue === "function" &&
          typeof GM_setValue === "function";

        const lsMain =
          typeof window !== "undefined" && window && window.localStorage
            ? window.localStorage
            : null;
        const lsTarg =
          typeof targetWindow !== "undefined" &&
          targetWindow &&
          targetWindow.localStorage
            ? targetWindow.localStorage
            : null;

        const readLS = (ls, k) => {
          if (!ls) return null;
          try {
            return ls.getItem(k);
          } catch (e) {
            return null;
          }
        };
        const writeLS = (ls, k, v) => {
          try {
            if (ls) ls.setItem(k, v);
          } catch (e) {}
        };

        const toStr = (val) =>
          val == null
            ? null
            : typeof val === "string"
              ? val
              : JSON.stringify(val);
        const tryParse = (s) => {
          if (s == null) return null;
          try {
            const first = JSON.parse(s);
            if (typeof first === "string") {
              try {
                return JSON.parse(first);
              } catch (e) {
                return first;
              }
            }
            return first;
          } catch (e) {
            return null;
          }
        };
        const score = (obj) => {
          if (!obj) return -1;
          if (Array.isArray(obj)) return obj.length;
          if (typeof obj === "object") return Object.keys(obj).length;
          return 0;
        };
        const isEmpty = (obj) => {
          if (!obj) return true;
          if (Array.isArray(obj)) return obj.length === 0;
          if (typeof obj === "object") return Object.keys(obj).length === 0;
          return false;
        };

        keys.forEach((key) => {
          try {
            const gmRaw = gmAvailable ? GM_getValue(key, null) : null;
            const mainRaw = readLS(lsMain, key);
            const targRaw = readLS(lsTarg, key);

            const gmParsed =
              (typeof gmRaw === "string" ? tryParse(gmRaw) : gmRaw) ||
              tryParse(toStr(gmRaw));
            const mainParsed = tryParse(mainRaw) || tryParse(toStr(mainRaw));
            const targParsed = tryParse(targRaw) || tryParse(toStr(targRaw));

            let best = null;
            // Prioritize GM storage, reject empty data
            if (gmParsed && !isEmpty(gmParsed)) best = gmParsed;
            else if (mainParsed && !isEmpty(mainParsed)) best = mainParsed;
            else if (targParsed && !isEmpty(targParsed)) best = targParsed;

            if (best && (typeof best === "object" || Array.isArray(best))) {
              const stable = JSON.stringify(best);
              try {
                if (gmAvailable) GM_setValue(key, stable);
              } catch (e) {}
              writeLS(lsMain, key, stable);
              writeLS(lsTarg, key, stable);
              productionLog(
                `[STORAGE-SYNC] ${key}: canonicalized across GM/WIN/TGT`,
              );
            }
          } catch (innerErr) {
            console.error(
              "[STORAGE-SYNC] Error while syncing key",
              key,
              innerErr,
            );
          }
        });
      } catch (err) {
        console.error("[STORAGE-SYNC] Sync failed:", err);
      }
    }

    function MGA_saveJSON(key, value, retryCount = 0) {
      let keyLocal = key;
      let valueLocal = value;
      // Dedupe guard for ability logs (same pet, ability, timestamp)
      try {
        if (keyLocal === "MGA_petAbilityLogs" && Array.isArray(valueLocal)) {
          const fp = (l) => {
            const t = (l && l.abilityType) || "",
              p = (l && l.petName) || "",
              ts = (l && l.timestamp) || 0;
            return t + "|" + p + "|" + String(ts);
          };
          const map = new Map();
          for (const l of valueLocal) {
            const id = l.id || fp(l);
            if (!map.has(id)) map.set(id, Object.assign({ id }, l));
          }
          valueLocal = Array.from(map.values()).sort(
            (a, b) => (b.timestamp || 0) - (a.timestamp || 0),
          );
        }
      } catch {}

      // CRITICAL: Ensure we never use external script keys
      if (keyLocal && !keyLocal.startsWith("MGA_")) {
        console.error(
          `❌ [MGA-ISOLATION] CRITICAL: Attempted to save with non-MGA key: ${keyLocal}`,
        );
        console.error(
          `❌ [MGA-ISOLATION] This would conflict with external scripts! Adding MGA_ prefix.`,
        );
        console.trace();
        keyLocal = "MGA_" + keyLocal;
      }

      // PERSISTENCE GUARD v3.8.6: BLOCK premature saves during initialization (prevents data loss)
      if (
        window.MGA_PERSISTENCE_GUARD?.initializationSavesBlocked &&
        keyLocal === "MGA_data"
      ) {
        const stack = new Error().stack;
        if (stack && stack.includes("loadSavedData")) {
          productionLog(
            "[PERSISTENCE-GUARD] Blocked premature save during initialization",
          );
          productionLog(
            "[PERSISTENCE-GUARD] This protects user data from being overwritten",
          );
          productionLog(
            "[PERSISTENCE-GUARD] Save will execute after initialization completes",
          );
          if (UnifiedState?.data?.settings?.debugMode) {
            console.trace("Blocked save location:");
          }
          return false; // BLOCK THE SAVE
        }
      }

      const MAX_RETRIES = 3;
      const RETRY_DELAY = 100;

      try {
        // Enhanced GM API availability check
        if (!isGMApiAvailable()) {
          // Warning already shown by isGMApiAvailable(), just use fallback silently
          return MGA_saveJSON_localStorage_fallback(keyLocal, valueLocal);
        }

        // Enhanced logging for critical operations
        if (keyLocal === "MGA_petPresets" || keyLocal === "MGA_seedsToDelete") {
          productionLog(
            `[GM-STORAGE] Attempting to save critical data: ${keyLocal} (attempt ${retryCount + 1}/${MAX_RETRIES})`,
          );
          productionLog(`[GM-STORAGE] Data type:`, typeof valueLocal);
          productionLog(`[GM-STORAGE] Data content:`, valueLocal);
        }

        // GM can store objects directly, but let's use JSON for consistency and debugging
        const jsonString = JSON.stringify(valueLocal);

        // Save using GM_setValue for reliable persistence
        GM_setValue(keyLocal, jsonString);
        productionLog(`[GM-STORAGE] GM_setValue executed for ${keyLocal}`);

        // Also write to localStorage to keep in sync
        // This prevents stale localStorage data from overriding newer GM data on load
        try {
          if (typeof localStorage !== "undefined" && localStorage) {
            localStorage.setItem(keyLocal, jsonString);
            productionLog(
              `[GM-STORAGE] Also synced to localStorage for consistency`,
            );
          }
        } catch (lsErr) {
          // Non-fatal - GM storage is source of truth
          productionWarn(
            `⚠️ [GM-STORAGE] Could not sync to localStorage (non-fatal):`,
            lsErr.message,
          );
        }

        // Enhanced verification with deep check
        const verification = GM_getValue(keyLocal, null);
        if (!verification) {
          console.error(
            `❌ [GM-STORAGE] Save verification failed for ${keyLocal} - no data retrieved!`,
          );

          // Retry logic
          if (retryCount < MAX_RETRIES - 1) {
            productionLog(
              `🔄 [GM-STORAGE] Retrying save for ${keyLocal} in ${RETRY_DELAY}ms...`,
            );
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve(MGA_saveJSON(key, value, retryCount + 1));
              }, RETRY_DELAY);
            });
          }

          // Final attempt failed - show user alert
          console.error(
            `❌ [GM-STORAGE] All retry attempts failed for ${keyLocal}`,
          );
          if (
            keyLocal === "MGA_petPresets" ||
            keyLocal === "MGA_seedsToDelete"
          ) {
            alert(
              `⚠️ Failed to save ${keyLocal.replace("MGA_", "")}! Your changes may not persist.`,
            );
          }
          return false;
        }

        // Deep verification for critical data
        if (keyLocal === "MGA_petPresets" || keyLocal === "MGA_seedsToDelete") {
          try {
            const parsedVerification = JSON.parse(verification);
            const originalKeys = Object.keys(valueLocal || {}).sort();
            const savedKeys = Object.keys(parsedVerification || {}).sort();

            if (JSON.stringify(originalKeys) !== JSON.stringify(savedKeys)) {
              productionWarn(
                `⚠️ [GM-STORAGE] Data structure mismatch for ${keyLocal}, but save likely succeeded`,
              );
            }

            productionLog(
              `✅ [GM-STORAGE] Critical data verification passed for ${keyLocal}`,
            );
          } catch (e) {
            productionWarn(
              `⚠️ [GM-STORAGE] Could not deep verify ${keyLocal}, but data exists`,
            );
          }
        }

        // Success logging
        if (keyLocal === "MGA_petPresets") {
          productionLog("[GM-STORAGE] Pet presets saved successfully");
        } else if (keyLocal.startsWith("MGA_")) {
          productionLog(`[GM-STORAGE] Saved ${keyLocal}`);
        }

        return true;
      } catch (error) {
        console.error(`❌ [GM-STORAGE] Failed to save ${keyLocal}:`, error);
        console.error(`❌ [GM-STORAGE] Error details:`, {
          name: error.name,
          message: error.message,
          gmApiAvailable: typeof GM_setValue !== "undefined",
          retryCount: retryCount,
        });

        // BUGFIX: Auto-cleanup on storage quota errors (from v1.11.3)
        const errorString = ("" + error).toLowerCase();
        if (
          errorString.indexOf("quota") >= 0 ||
          errorString.indexOf("exceeded") >= 0
        ) {
          productionLog(
            "🧹 [STORAGE-CLEANUP] Quota exceeded - auto-cleaning debug caches...",
          );
          const dropKeys = [
            "console-history",
            "mga-debug-cache",
            "mga-temp-cache",
          ];
          for (let i = 0; i < dropKeys.length; i++) {
            try {
              localStorage.removeItem(dropKeys[i]);
              productionLog(`🧹 [STORAGE-CLEANUP] Removed: ${dropKeys[i]}`);
            } catch (_e) {}
          }
          // Retry save after cleanup (one time only)
          if (retryCount === 0) {
            productionLog(
              `🔄 [STORAGE-CLEANUP] Retrying save after cleanup...`,
            );
            return MGA_saveJSON(key, value, 1);
          }
        }

        // Retry on error
        if (retryCount < MAX_RETRIES - 1) {
          productionLog(
            `🔄 [GM-STORAGE] Retrying save for ${keyLocal} after error...`,
          );
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(MGA_saveJSON(key, value, retryCount + 1));
            }, RETRY_DELAY);
          });
        }

        return false;
      }
    }

    // Fallback function for when GM API is not available
    function MGA_saveJSON_localStorage_fallback(key, value) {
      let valueLocal = value;
      // Dedupe for ability logs in fallback path too
      try {
        if (key === "MGA_petAbilityLogs" && Array.isArray(valueLocal)) {
          const fp = (l) => {
            const t = (l && l.abilityType) || "",
              p = (l && l.petName) || "",
              ts = (l && l.timestamp) || 0;
            return t + "|" + p + "|" + String(ts);
          };
          const map = new Map();
          for (const l of valueLocal) {
            const id = l.id || fp(l);
            if (!map.has(id)) map.set(id, Object.assign({ id }, l));
          }
          valueLocal = Array.from(map.values()).sort(
            (a, b) => (b.timestamp || 0) - (a.timestamp || 0),
          );
        }
      } catch {}

      try {
        const jsonString = JSON.stringify(valueLocal);
        StorageManager.setItem(key, jsonString);

        // Simple verification
        const verification = StorageManager.getItem(key);
        if (verification === jsonString) {
          productionLog(
            `[FALLBACK] Successfully saved ${key} to ${StorageManager.storageType}`,
          );
          return true;
        } else {
          console.error(
            `[FALLBACK] ${StorageManager.storageType} save verification failed for ${key}`,
          );
          return false;
        }
      } catch (error) {
        // Check if it's a quota exceeded error
        const isQuotaError =
          error.name === "QuotaExceededError" ||
          error.message.includes("quota") ||
          error.message.includes("exceeded");

        if (isQuotaError) {
          console.error(`[FALLBACK] localStorage quota exceeded for ${key}!`);
          console.error(
            `[FALLBACK] Try clearing browser console history or other localStorage data`,
          );
          console.error(
            `[FALLBACK] In Chrome DevTools: Application > Storage > Clear site data`,
          );

          // Alert user for critical data
          if (
            key === "MGA_petPresets" ||
            key === "MGA_seedsToDelete" ||
            key === "MGA_data"
          ) {
            alert(
              `⚠️ localStorage quota exceeded!\n\nYour ${key.replace("MGA_", "")} cannot be saved.\n\nFix:\n1. Open DevTools (F12)\n2. Go to Application tab\n3. Click "Clear site data"\n4. Reload the page`,
            );
          }
        } else {
          console.error(
            `[FALLBACK] localStorage save failed for ${key}:`,
            error,
          );
        }
        return false;
      }
    }

    // ==================== STORAGE RECOVERY & BACKUP SYSTEM ====================
    // Emergency data recovery, export/import, and health checks

    /**
     * Emergency Storage Scanner - Checks ALL possible storage locations for lost data
     * @param {string} key - The storage key to search for (e.g., 'MGA_petPresets')
     * @returns {Object} - Report of what was found where
     */
    function emergencyStorageScan(key) {
      const report = {
        key: key,
        timestamp: new Date().toISOString(),
        locations: {},
      };

      // Check GM storage
      try {
        if (typeof GM_getValue === "function") {
          const gmValue = GM_getValue(key, null);
          if (gmValue) {
            const parsed =
              typeof gmValue === "string" ? JSON.parse(gmValue) : gmValue;
            const itemCount = Array.isArray(parsed)
              ? parsed.length
              : Object.keys(parsed || {}).length;
            report.locations.GM = {
              found: true,
              itemCount: itemCount,
              dataType: Array.isArray(parsed) ? "array" : typeof parsed,
              preview: JSON.stringify(parsed).substring(0, 200),
            };
          } else {
            report.locations.GM = { found: false };
          }
        }
      } catch (e) {
        report.locations.GM = { error: e.message };
      }

      // Check window.localStorage
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          const lsValue = window.localStorage.getItem(key);
          if (lsValue) {
            try {
              const parsed = JSON.parse(lsValue);
              const itemCount = Array.isArray(parsed)
                ? parsed.length
                : Object.keys(parsed || {}).length;
              report.locations.windowLocalStorage = {
                found: true,
                itemCount: itemCount,
                dataType: Array.isArray(parsed) ? "array" : typeof parsed,
                preview: lsValue.substring(0, 200),
              };
            } catch (parseErr) {
              report.locations.windowLocalStorage = {
                found: true,
                corrupted: true,
                rawValue: lsValue.substring(0, 200),
              };
            }
          } else {
            report.locations.windowLocalStorage = { found: false };
          }
        }
      } catch (e) {
        report.locations.windowLocalStorage = { error: e.message };
      }

      // Check targetWindow.localStorage (if different from window)
      try {
        if (
          typeof targetWindow !== "undefined" &&
          targetWindow &&
          targetWindow !== window &&
          targetWindow.localStorage
        ) {
          const tgValue = targetWindow.localStorage.getItem(key);
          if (tgValue) {
            try {
              const parsed = JSON.parse(tgValue);
              const itemCount = Array.isArray(parsed)
                ? parsed.length
                : Object.keys(parsed || {}).length;
              report.locations.targetLocalStorage = {
                found: true,
                itemCount: itemCount,
                dataType: Array.isArray(parsed) ? "array" : typeof parsed,
                preview: tgValue.substring(0, 200),
              };
            } catch (parseErr) {
              report.locations.targetLocalStorage = {
                found: true,
                corrupted: true,
                rawValue: tgValue.substring(0, 200),
              };
            }
          } else {
            report.locations.targetLocalStorage = { found: false };
          }
        }
      } catch (e) {
        report.locations.targetLocalStorage = { error: e.message };
      }

      return report;
    }

    /**
     * Export pet presets to JSON file for backup
     */
    function exportPetPresets() {
      try {
        const presets = UnifiedState.data.petPresets || {};
        const presetCount = Object.keys(presets).length;

        if (presetCount === 0) {
          alert("⚠️ No pet presets to export!\n\nCreate some presets first.");
          return;
        }

        // Create export object with metadata
        const exportData = {
          version: "3.8.8",
          exportDate: new Date().toISOString(),
          presetCount: presetCount,
          presets: presets,
          presetsOrder: UnifiedState.data.petPresetsOrder || [],
        };

        // Create downloadable JSON file
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `mgtools-presets-${new Date().toISOString().split("T")[0]}.json`;
        link.click();

        // Cleanup
        URL.revokeObjectURL(url);

        productionLog(
          `✅ [EXPORT] Successfully exported ${presetCount} pet presets`,
        );
        alert(
          `✅ Exported ${presetCount} pet presets!\n\nFile saved to Downloads folder.`,
        );
      } catch (error) {
        console.error("❌ [EXPORT] Failed to export presets:", error);
        alert(`❌ Export failed!\n\nError: ${error.message}`);
      }
    }

    /**
     * Import pet presets from JSON file
     */
    function importPetPresets() {
      try {
        // Create file input
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";

        input.onchange = async (e) => {
          try {
            const file = e.target.files[0];
            if (!file) return;

            const text = await file.text();
            const importData = JSON.parse(text);

            // Validate import data
            if (!importData.presets || typeof importData.presets !== "object") {
              throw new Error("Invalid preset file format");
            }

            const importCount = Object.keys(importData.presets).length;
            const currentCount = Object.keys(
              UnifiedState.data.petPresets || {},
            ).length;

            // Ask for confirmation
            const confirmed = confirm(
              `📥 Import ${importCount} presets?\n\n` +
                `Current presets: ${currentCount}\n` +
                `Import date: ${importData.exportDate || "Unknown"}\n` +
                `Version: ${importData.version || "Unknown"}\n\n` +
                `⚠️ This will OVERWRITE your current presets!`,
            );

            if (!confirmed) {
              productionLog("⏸️ [IMPORT] User cancelled import");
              return;
            }

            // Perform import
            UnifiedState.data.petPresets = importData.presets;
            UnifiedState.data.petPresetsOrder = importData.presetsOrder || [];

            // Save to storage
            MGA_saveJSON("MGA_petPresets", importData.presets);
            MGA_saveJSON("MGA_petPresetsOrder", importData.presetsOrder || []);

            productionLog(
              `✅ [IMPORT] Successfully imported ${importCount} pet presets`,
            );
            alert(
              `✅ Imported ${importCount} presets!\n\nPage will reload to apply changes.`,
            );

            // Reload to refresh UI
            setTimeout(() => window.location.reload(), 1000);
          } catch (error) {
            console.error("❌ [IMPORT] Failed to import presets:", error);
            alert(
              `❌ Import failed!\n\nError: ${error.message}\n\nMake sure you're importing a valid MGTools preset file.`,
            );
          }
        };

        input.click();
      } catch (error) {
        console.error("❌ [IMPORT] Failed to create import dialog:", error);
        alert(`❌ Import failed!\n\nError: ${error.message}`);
      }
    }

    /**
     * Comprehensive storage health check on startup
     * @returns {Object} Health report
     */
    function performStorageHealthCheck() {
      const report = {
        timestamp: new Date().toISOString(),
        gmAvailable: false,
        localStorageAvailable: false,
        writeTest: {},
        quotaCheck: {},
        issues: [],
      };

      // Check GM API availability
      try {
        if (
          typeof GM_setValue === "function" &&
          typeof GM_getValue === "function"
        ) {
          report.gmAvailable = true;

          // Test GM write/read
          const testKey = "MGA_health_check_test";
          const testValue = { test: true, timestamp: Date.now() };
          GM_setValue(testKey, JSON.stringify(testValue));
          const retrieved = GM_getValue(testKey, null);

          if (retrieved) {
            report.writeTest.GM = "PASS";
            GM_deleteValue(testKey); // Cleanup
          } else {
            report.writeTest.GM = "FAIL";
            report.issues.push("GM_setValue/GM_getValue not working properly");
          }
        } else {
          report.issues.push(
            "GM API not available - will use localStorage fallback",
          );
        }
      } catch (e) {
        report.writeTest.GM = "ERROR: " + e.message;
        report.issues.push("GM API error: " + e.message);
      }

      // Check localStorage availability
      try {
        if (typeof localStorage !== "undefined") {
          report.localStorageAvailable = true;

          // Test localStorage write/read
          const testKey = "MGA_health_check_test";
          const testValue = JSON.stringify({
            test: true,
            timestamp: Date.now(),
          });
          localStorage.setItem(testKey, testValue);
          const retrieved = localStorage.getItem(testKey);

          // Parse and compare objects to handle serialization differences
          try {
            const retrievedObj = JSON.parse(retrieved);
            const testObj = JSON.parse(testValue);
            if (retrievedObj && retrievedObj.test === testObj.test) {
              report.writeTest.localStorage = "PASS";
              localStorage.removeItem(testKey); // Cleanup
            } else {
              report.writeTest.localStorage = "FAIL";
              report.issues.push("localStorage read/write mismatch");
            }
          } catch (e) {
            // If parsing fails but string matches, still pass
            if (retrieved === testValue) {
              report.writeTest.localStorage = "PASS";
              localStorage.removeItem(testKey);
            } else {
              report.writeTest.localStorage = "FAIL";
              report.issues.push("localStorage read/write mismatch");
            }
          }

          // Estimate quota usage (if available)
          if ("storage" in navigator && "estimate" in navigator.storage) {
            navigator.storage.estimate().then((estimate) => {
              const percentUsed = (
                (estimate.usage / estimate.quota) *
                100
              ).toFixed(2);
              report.quotaCheck = {
                used: estimate.usage,
                quota: estimate.quota,
                percentUsed: percentUsed,
                warning: percentUsed > 80,
              };

              if (percentUsed > 80) {
                report.issues.push(
                  `Storage ${percentUsed}% full - may cause save failures`,
                );
              }
            });
          }
        } else {
          report.issues.push("localStorage not available");
        }
      } catch (e) {
        report.writeTest.localStorage = "ERROR: " + e.message;
        report.issues.push("localStorage error: " + e.message);
      }

      return report;
    }

    // ==================== ABILITY NAME NORMALIZATION ====================
    // Fix malformed ability names (e.g., "Seed FinderII" → "Seed Finder II")

    function normalizeAbilityName(name) {
      if (!name || typeof name !== "string") return name;

      // Fix missing spaces before roman numerals
      const normalized = name
        .replace(/([a-z])III$/i, "$1 III") // "FinderIII" → "Finder III"
        .replace(/([a-z])II$/i, "$1 II") // "FinderII" → "Finder II"
        .replace(/([a-z])I$/i, "$1 I") // "FinderI" → "Finder I"
        .replace(/produce\s*scale\s*boost/gi, "Crop Size Boost") // Game renamed this ability
        .trim();

      // Log normalization if name was changed
      if (normalized !== name && UnifiedState.data.settings?.debugMode) {
        logDebug(
          "ABILITY-LOGS",
          `📝 Normalized ability name: "${name}" → "${normalized}"`,
        );
      }

      return normalized;
    }

    // List of all known ability types for validation
    const KNOWN_ABILITY_TYPES = [
      // XP Boosts
      "XP Boost I",
      "XP Boost II",
      "XP Boost III",
      "Hatch XP Boost I",
      "Hatch XP Boost II",

      // Crop Size Boosts
      "Crop Size Boost I",
      "Crop Size Boost II",

      // Selling
      "Sell Boost I",
      "Sell Boost II",
      "Sell Boost III",
      "Coin Finder I",
      "Coin Finder II",

      // Harvesting
      "Harvesting",
      "Auto Harvest",

      // Growth Speed
      "Plant Growth Boost I",
      "Plant Growth Boost II",
      "Plant Growth Boost III",
      "Egg Growth Boost I",
      "Egg Growth Boost II",

      // Seeds
      "Seed Finder I",
      "Seed Finder II",
      "Special Mutations",

      // Other
      "Hunger Boost I",
      "Hunger Boost II",
      "Max Strength Boost I",
      "Max Strength Boost II",
    ];

    function isKnownAbilityType(abilityType) {
      if (!abilityType) return false;
      return KNOWN_ABILITY_TYPES.includes(abilityType);
    }

    // ==================== ABILITY LOGS DIAGNOSTIC SYSTEM ====================
    // Comprehensive diagnostic function to identify persistent ability log sources

    function MGA_diagnoseAbilityLogStorage() {
      logDebug(
        "ABILITY-LOGS",
        "🔍 Starting comprehensive ability log storage diagnostic...",
      );

      const report = {
        timestamp: new Date().toISOString(),
        sources: {},
      };

      // Helper to safely get storage
      const safeGet = (fn, label) => {
        try {
          return fn();
        } catch (e) {
          logDebug("ABILITY-LOGS", `  ❌ ${label}: Error - ${e.message}`);
          return null;
        }
      };

      // Helper to parse and count logs with detailed fingerprinting
      const parseAndCount = (raw, label) => {
        if (!raw) return { exists: false, count: 0, logs: [] };
        try {
          const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
          const count = Array.isArray(parsed) ? parsed.length : 0;

          if (Array.isArray(parsed)) {
            // Create detailed log fingerprints for identification
            const logs = parsed.map((l) => {
              const abilityType = l.abilityType || "unknown";
              const normalizedAbility = normalizeAbilityName(abilityType);
              const isKnown = isKnownAbilityType(normalizedAbility);
              const isMalformed = abilityType !== normalizedAbility;

              return {
                ability: abilityType,
                normalizedAbility: isMalformed ? normalizedAbility : null,
                isKnown,
                isMalformed,
                pet: l.petName || l.petSpecies || "unknown",
                timestamp: l.timestamp,
                time: new Date(l.timestamp).toLocaleString(),
                // Create a unique fingerprint for this log
                fingerprint:
                  `${abilityType}_${l.petName}_${l.timestamp}`.substring(0, 50),
              };
            });

            const malformedCount = logs.filter((l) => l.isMalformed).length;
            const unknownCount = logs.filter((l) => !l.isKnown).length;

            return {
              exists: true,
              count,
              logs,
              malformedCount,
              unknownCount,
            };
          } else {
            return { exists: true, count: "not-an-array", logs: [] };
          }
        } catch (e) {
          return {
            exists: true,
            count: "parse-error",
            logs: [],
            error: e.message,
          };
        }
      };

      // 1. GM Storage (Tampermonkey)
      const gmMain = safeGet(
        () => GM_getValue("MGA_petAbilityLogs", null),
        "GM Main",
      );
      const gmArchive = safeGet(
        () => GM_getValue("MGA_petAbilityLogs_archive", null),
        "GM Archive",
      );
      report.sources.gmStorage = {
        main: parseAndCount(gmMain, "GM Main"),
        archive: parseAndCount(gmArchive, "GM Archive"),
      };

      // 2. Window localStorage
      const lsMain = safeGet(
        () => window.localStorage?.getItem("MGA_petAbilityLogs"),
        "LS Main",
      );
      const lsArchive = safeGet(
        () => window.localStorage?.getItem("MGA_petAbilityLogs_archive"),
        "LS Archive",
      );
      const lsClearFlag = safeGet(
        () => window.localStorage?.getItem("MGA_logs_manually_cleared"),
        "LS Clear Flag",
      );
      report.sources.windowLocalStorage = {
        main: parseAndCount(lsMain, "LS Main"),
        archive: parseAndCount(lsArchive, "LS Archive"),
        clearFlag: lsClearFlag,
      };

      // 3. TargetWindow localStorage (if different from window)
      if (
        typeof targetWindow !== "undefined" &&
        targetWindow &&
        targetWindow !== window
      ) {
        const tgMain = safeGet(
          () => targetWindow.localStorage?.getItem("MGA_petAbilityLogs"),
          "TG Main",
        );
        const tgArchive = safeGet(
          () =>
            targetWindow.localStorage?.getItem("MGA_petAbilityLogs_archive"),
          "TG Archive",
        );
        report.sources.targetWindowLocalStorage = {
          main: parseAndCount(tgMain, "TG Main"),
          archive: parseAndCount(tgArchive, "TG Archive"),
        };
      }

      // 4. MGA_data nested logs
      const mgaData = safeGet(() => GM_getValue("MGA_data", null), "MGA_data");
      if (mgaData) {
        try {
          const parsed =
            typeof mgaData === "string" ? JSON.parse(mgaData) : mgaData;
          const nestedLogs = parsed?.petAbilityLogs;
          report.sources.mgaDataNested = {
            logs: parseAndCount(nestedLogs, "MGA_data nested"),
          };
        } catch (e) {
          report.sources.mgaDataNested = { error: e.message };
        }
      }

      // 5. Window compatibility array
      if (typeof window.petAbilityLogs !== "undefined") {
        report.sources.compatibilityArray = {
          count: Array.isArray(window.petAbilityLogs)
            ? window.petAbilityLogs.length
            : "not-an-array",
          sample: Array.isArray(window.petAbilityLogs)
            ? window.petAbilityLogs.slice(0, 3)
            : null,
        };
      }

      // 6. Current memory state
      const memoryLogs = (UnifiedState.data?.petAbilityLogs || []).map((l) => {
        const abilityType = l.abilityType || "unknown";
        const normalizedAbility = normalizeAbilityName(abilityType);
        const isKnown = isKnownAbilityType(normalizedAbility);
        const isMalformed = abilityType !== normalizedAbility;

        return {
          ability: abilityType,
          normalizedAbility: isMalformed ? normalizedAbility : null,
          isKnown,
          isMalformed,
          pet: l.petName || l.petSpecies || "unknown",
          timestamp: l.timestamp,
          time: new Date(l.timestamp).toLocaleString(),
          fingerprint: `${abilityType}_${l.petName}_${l.timestamp}`.substring(
            0,
            50,
          ),
        };
      });

      report.sources.memory = {
        unifiedState: {
          count: memoryLogs.length,
          sample: memoryLogs, // Now includes all logs with fingerprints
        },
      };

      // Calculate total across all sources
      const totals = {
        gmMain: report.sources.gmStorage.main.count || 0,
        gmArchive: report.sources.gmStorage.archive.count || 0,
        lsMain: report.sources.windowLocalStorage.main.count || 0,
        lsArchive: report.sources.windowLocalStorage.archive.count || 0,
        memory: report.sources.memory.unifiedState.count,
      };

      report.summary = {
        totalLocationsWithLogs: Object.values(totals).filter((c) => c > 0)
          .length,
        totals,
        suspectSources: Object.entries(totals)
          .filter(([k, v]) => v > 0)
          .map(([k]) => k),
      };

      // Output report
      productionLog("🔍 ========== ABILITY LOGS STORAGE DIAGNOSTIC ==========");
      productionLog("📊 Summary:", report.summary);
      productionLog("");

      // Show counts for each storage location
      productionLog("📁 GM Storage:");
      productionLog("  Main:", report.sources.gmStorage.main.count, "logs");
      productionLog(
        "  Archive:",
        report.sources.gmStorage.archive.count,
        "logs",
      );

      productionLog("📁 Window localStorage:");
      productionLog(
        "  Main:",
        report.sources.windowLocalStorage.main.count,
        "logs",
      );
      productionLog(
        "  Archive:",
        report.sources.windowLocalStorage.archive.count,
        "logs",
      );
      productionLog(
        "  Clear flag:",
        report.sources.windowLocalStorage.clearFlag,
      );

      if (report.sources.targetWindowLocalStorage) {
        productionLog("📁 Target Window localStorage:");
        productionLog(
          "  Main:",
          report.sources.targetWindowLocalStorage.main.count,
          "logs",
        );
        productionLog(
          "  Archive:",
          report.sources.targetWindowLocalStorage.archive.count,
          "logs",
        );
      }

      if (report.sources.mgaDataNested) {
        productionLog("📁 MGA_data nested:", report.sources.mgaDataNested);
      }

      if (report.sources.compatibilityArray) {
        productionLog(
          "📁 Compatibility array:",
          report.sources.compatibilityArray,
        );
      }

      productionLog(
        "💾 Memory:",
        report.sources.memory.unifiedState.count,
        "logs",
      );
      productionLog("");

      // DETAILED LOG LISTING - Show individual logs from each source
      productionLog("📋 ========== DETAILED LOG LISTING ==========");

      const showLogs = (title, logs) => {
        if (logs && logs.length > 0) {
          productionLog(`\n${title}:`);
          logs.forEach((log, i) => {
            const prefix = log.isMalformed
              ? "⚠️ MALFORMED"
              : log.isKnown
                ? "✅"
                : "❓ UNKNOWN";
            productionLog(`  ${i + 1}. ${prefix} [${log.fingerprint}]`);
            productionLog(`     ${log.ability} - ${log.pet}`);
            if (log.isMalformed) {
              productionLog(`     → Should be: "${log.normalizedAbility}"`);
            }
            productionLog(`     ${log.time}`);
          });
        }
      };

      showLogs("GM Storage (Main)", report.sources.gmStorage.main.logs);
      showLogs("GM Storage (Archive)", report.sources.gmStorage.archive.logs);
      showLogs(
        "Window localStorage (Main)",
        report.sources.windowLocalStorage.main.logs,
      );
      showLogs(
        "Window localStorage (Archive)",
        report.sources.windowLocalStorage.archive.logs,
      );
      if (report.sources.targetWindowLocalStorage) {
        showLogs(
          "TargetWindow localStorage (Main)",
          report.sources.targetWindowLocalStorage.main.logs,
        );
        showLogs(
          "TargetWindow localStorage (Archive)",
          report.sources.targetWindowLocalStorage.archive.logs,
        );
      }
      if (report.sources.mgaDataNested?.logs?.logs) {
        showLogs("MGA_data nested", report.sources.mgaDataNested.logs.logs);
      }
      showLogs(
        "Memory (UnifiedState)",
        report.sources.memory.unifiedState.sample,
      );

      // Count total malformed and unknown logs
      const allSources = [
        report.sources.gmStorage.main,
        report.sources.gmStorage.archive,
        report.sources.windowLocalStorage.main,
        report.sources.windowLocalStorage.archive,
      ];
      if (report.sources.targetWindowLocalStorage) {
        allSources.push(report.sources.targetWindowLocalStorage.main);
        allSources.push(report.sources.targetWindowLocalStorage.archive);
      }

      const totalMalformed = allSources.reduce(
        (sum, src) => sum + (src.malformedCount || 0),
        0,
      );
      const totalUnknown = allSources.reduce(
        (sum, src) => sum + (src.unknownCount || 0),
        0,
      );

      productionLog(
        "\n=======================================================",
      );
      productionLog("💡 TIPS:");
      productionLog(
        "  • Look for logs with identical fingerprints across multiple storage locations",
      );
      productionLog(
        "  • If a log persists after clear, check which storage still contains it",
      );
      if (totalMalformed > 0) {
        productionLog(
          `  • ⚠️ Found ${totalMalformed} MALFORMED ability name(s) - missing spaces before roman numerals`,
        );
        productionLog(
          '  • Malformed logs may not clear properly. Enable Debug Mode and click "Clear Logs".',
        );
      }
      if (totalUnknown > 0) {
        productionLog(
          `  • ❓ Found ${totalUnknown} UNKNOWN ability type(s) - not in known abilities list`,
        );
      }
      productionLog("=======================================================");

      logDebug(
        "ABILITY-LOGS",
        "✅ Diagnostic complete - see console for full report",
      );

      return report;
    }

    // ==================== DATA MIGRATION SYSTEM ====================
    // Migrate existing localStorage data to GM storage for better reliability

    function MGA_migrateFromLocalStorage() {
      try {
        productionLog(
          "🔄 [MIGRATION] Starting data migration from localStorage to GM storage...",
        );

        // Check if migration has already been completed (handle both boolean and string values)
        const migrationComplete = GM_getValue("MGA_migration_completed", false);
        if (migrationComplete === true || migrationComplete === "true") {
          productionLog(
            "✅ [MIGRATION] Migration already completed, skipping...",
          );
          return;
        }

        // List of keys to migrate
        const keysToMigrate = [
          "MGA_petPresets",
          "MGA_seedsToDelete",
          "MGA_autoDeleteEnabled",
          "MGA_petAbilityLogs",
          "MGA_settings",
          "MGA_mainHUDPosition",
          "MGA_toggleButtonPosition",
          "MGA_overlayDimensions",
          "MGA_overlayPositions",
          "MGA_overlayStates",
          "MGA_abilityFilters",
          "MGA_petFilters",
          "MGA_customMode",
          "MGA_filterMode",
          "MGA_timerStates",
        ];

        let migratedCount = 0;
        let totalDataSize = 0;

        // Use requestIdleCallback to avoid blocking the main thread during migration
        const migrateKeys = (keyIndex = 0) => {
          if (keyIndex >= keysToMigrate.length) {
            // Migration complete
            GM_setValue("MGA_migration_completed", true);
            GM_setValue("MGA_migration_timestamp", Date.now());
            GM_setValue("MGA_migration_stats", {
              migratedCount,
              totalDataSize,
              timestamp: Date.now(),
            });

            productionLog(`✅ [MIGRATION] Data migration completed!`);
            productionLog(`📊 [MIGRATION] Statistics:`, {
              migratedKeys: migratedCount,
              totalDataSize: totalDataSize + " chars",
              timestamp: new Date().toISOString(),
            });
            return;
          }

          const key = keysToMigrate[keyIndex];
          try {
            const localStorageData = localStorage.getItem(key);
            if (localStorageData) {
              // Data exists in localStorage, migrate it
              GM_setValue(key, localStorageData);
              migratedCount++;
              totalDataSize += localStorageData.length;

              productionLog(
                `📦 [MIGRATION] Migrated ${key} (${localStorageData.length} chars)`,
              );

              // Verify the migration worked
              const verification = GM_getValue(key, null);
              if (verification === localStorageData) {
                productionLog(`✅ [MIGRATION] Successfully verified ${key}`);

                // Only remove from localStorage after successful verification
                localStorage.removeItem(key);
                productionLog(
                  `🗑️ [MIGRATION] Removed ${key} from localStorage`,
                );
              } else {
                console.error(
                  `❌ [MIGRATION] Verification failed for ${key} - keeping localStorage version`,
                );
              }
            } else {
              // No data in localStorage for this key
              productionLog(
                `📝 [MIGRATION] No data found for ${key} in localStorage`,
              );
            }
          } catch (error) {
            console.error(`❌ [MIGRATION] Failed to migrate ${key}:`, error);
          }

          // Process next key with a small delay to avoid blocking
          if (typeof requestIdleCallback !== "undefined") {
            requestIdleCallback(() => migrateKeys(keyIndex + 1));
          } else {
            setTimeout(() => migrateKeys(keyIndex + 1), 0);
          }
        };

        // Start migration
        migrateKeys();

        return { success: true, migratedCount, totalDataSize };
      } catch (error) {
        console.error(`❌ [MIGRATION] Migration process failed:`, error);
        return { success: false, error: error.message };
      }
    }

    // Function to check migration status for debugging
    function MGA_getMigrationStatus() {
      const migrationComplete = GM_getValue("MGA_migration_completed", false);
      const migrationStats = GM_getValue("MGA_migration_stats", null);
      const migrationTimestamp = GM_getValue("MGA_migration_timestamp", null);

      return {
        completed: migrationComplete,
        stats: migrationStats,
        timestamp: migrationTimestamp
          ? new Date(migrationTimestamp).toISOString()
          : null,
      };
    }

    // Export migration functions for debugging
    targetWindow.MGA_migrateFromLocalStorage = MGA_migrateFromLocalStorage;
    targetWindow.MGA_getMigrationStatus = MGA_getMigrationStatus;
    targetWindow.MGA_saveJSON = MGA_saveJSON;
    targetWindow.MGA_loadJSON = MGA_loadJSON;

    // Export startIntervals for debugging and emergency use
    targetWindow.startIntervals = startIntervals;

    // Pet hunger state tracking
    const lastPetHungerStates = {};

    // ==================== COMPREHENSIVE DEBUG COLLECTION ====================
    targetWindow.collectMGADebug = function () {
      productionLog("🔍 Starting comprehensive MGA debug collection...");

      const debugData = {
        timestamp: new Date().toISOString(),
        version:
          typeof GM_info !== "undefined"
            ? GM_info?.script?.version || "Unknown"
            : "Unknown",
        userAgent: navigator.userAgent,

        // Script State
        scriptState: {
          mainScriptDetected:
            (typeof MGAIsolationSystem !== "undefined"
              ? MGAIsolationSystem?.mainScriptDetected
              : false) || false,
          protectedGlobals:
            (typeof MGAIsolationSystem !== "undefined"
              ? MGAIsolationSystem?.protectedGlobals
              : []) || [],
          globalFunctions: {
            hasLoadJSON: typeof targetWindow.loadJSON !== "undefined",
            hasSaveJSON: typeof targetWindow.saveJSON !== "undefined",
            loadJSONOwner:
              typeof targetWindow.loadJSON !== "undefined" &&
              targetWindow.loadJSON === MGA_loadJSON
                ? "MGA"
                : "Other",
            saveJSONOwner:
              typeof targetWindow.saveJSON !== "undefined" &&
              targetWindow.saveJSON === MGA_saveJSON
                ? "MGA"
                : "Other",
          },
        },

        // Pet Hunger System
        petHungerSystem: {
          enabled:
            UnifiedState?.data?.settings?.notifications?.petHungerEnabled ||
            false,
          threshold:
            UnifiedState?.data?.settings?.notifications?.petHungerThreshold ||
            25,
          activePets:
            UnifiedState?.atoms?.activePets?.map((pet) => ({
              id: pet?.id,
              species: pet?.petSpecies,
              hunger: pet?.hunger,
              health: pet?.health,
              slot: pet?.slot,
            })) || [],
          // eslint-disable-next-line no-use-before-define
          lastStates:
            typeof lastPetHungerStates !== "undefined"
              ? Object.keys(lastPetHungerStates || {}).map((id) => ({
                  petId: id,
                  lastHunger: lastPetHungerStates[id],
                }))
              : [],
        },

        // Shop System
        shopSystem: {
          firebaseEnabled:
            UnifiedState?.data?.settings?.notifications?.shopFirebaseEnabled ||
            false,
          watchedSeeds:
            UnifiedState?.data?.settings?.notifications?.watchedSeeds || [],
          watchedEggs:
            UnifiedState?.data?.settings?.notifications?.watchedEggs || [],
          shopData: {
            globalShop:
              typeof targetWindow.globalShop !== "undefined"
                ? "Present"
                : "Missing",
            quinoaData: UnifiedState?.atoms?.quinoaData ? "Present" : "Missing",
            seedTimer: UnifiedState?.data?.timers?.seed,
            eggTimer: UnifiedState?.data?.timers?.egg,
            toolTimer: UnifiedState?.data?.timers?.tool,
          },
          lastCheck: new Date().toISOString(),
        },

        // Weather System
        weatherSystem: {
          enabled:
            UnifiedState?.data?.settings?.notifications
              ?.weatherNotificationsEnabled || false,
          watchedEvents:
            UnifiedState?.data?.settings?.notifications?.watchedWeatherEvents ||
            [],
          currentWeather:
            targetWindow.roomState?.child?.data?.weather ||
            targetWindow.roomState?.weather ||
            "Unknown",
          // eslint-disable-next-line no-use-before-define
          lastWeatherState:
            typeof lastWeatherState !== "undefined" ? lastWeatherState : null,
        },

        // Performance Metrics
        performance: {
          memoryUsage: performance?.memory
            ? {
                usedJSHeapSize:
                  (performance.memory.usedJSHeapSize / 1048576).toFixed(2) +
                  " MB",
                totalJSHeapSize:
                  (performance.memory.totalJSHeapSize / 1048576).toFixed(2) +
                  " MB",
                jsHeapSizeLimit:
                  (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) +
                  " MB",
              }
            : "Not available",
          intervals: {
            notificationInterval:
              typeof notificationInterval !== "undefined"
                ? "Active"
                : "Inactive",
            firebaseInterval: UnifiedState?.firebase?.reportInterval
              ? "Active"
              : "Inactive",
            timerManagerActive:
              typeof timerManager !== "undefined"
                ? timerManager?.isRunning || false
                : false,
            activeTimers:
              typeof timerManager !== "undefined"
                ? timerManager?.activeTimers?.size || 0
                : 0,
          },
        },

        // Storage Status
        storageStatus: {
          gmApiAvailable:
            typeof isGMApiAvailable !== "undefined"
              ? isGMApiAvailable()
              : false,
          migrationStatus:
            typeof MGA_getMigrationStatus !== "undefined"
              ? MGA_getMigrationStatus()
              : "N/A",
          storedData:
            typeof GM_getValue !== "undefined"
              ? {
                  petPresets: GM_getValue("MGA_petPresets")
                    ? "Present"
                    : "Missing",
                  seedsToDelete: GM_getValue("MGA_seedsToDelete")
                    ? "Present"
                    : "Missing",
                  settings: GM_getValue("MGA_data") ? "Present" : "Missing",
                }
              : "GM API not available",
        },

        // External Feed Protection
        autoFeedStatus: {
          autoFeedEnabled: targetWindow.autoFeedEnabled,
          autoFeedState: targetWindow.autoFeedState,
          autoFeedSkipFavorited: targetWindow.autoFeedSkipFavorited,
          protection:
            typeof MGAIsolationSystem !== "undefined"
              ? MGAIsolationSystem?.isAutofeedProtected || false
              : false,
        },

        // Errors and Warnings
        recentErrors: [],
      };

      productionLog("📊 Collecting performance data for 10 seconds...");
      productionLog("⏳ Monitoring for errors and performance issues...");

      // Note: Error capturing disabled due to browser security restrictions
      const errors = [];

      // Create performance monitor
      let frameCount = 0;
      let lastFrameTime = performance.now();
      const fpsData = [];

      function measureFPS() {
        const currentTime = performance.now();
        const delta = currentTime - lastFrameTime;
        if (delta > 0) {
          const fps = 1000 / delta;
          fpsData.push({
            time: new Date().toISOString(),
            fps: Math.round(fps),
            weather:
              window.roomState?.child?.data?.weather ||
              window.roomState?.weather ||
              "None",
          });
        }
        lastFrameTime = currentTime;
        frameCount++;

        if (frameCount < 600) {
          // Run for ~10 seconds at 60fps
          requestAnimationFrame(measureFPS);
        } else {
          finishDebugCollection();
        }
      }

      requestAnimationFrame(measureFPS);

      function finishDebugCollection() {
        // Add collected data
        debugData.recentErrors = errors;
        debugData.performance.fpsAnalysis = {
          samples: fpsData.length,
          averageFPS: Math.round(
            fpsData.reduce((a, b) => a + b.fps, 0) / fpsData.length,
          ),
          minFPS: Math.min(...fpsData.map((d) => d.fps)),
          maxFPS: Math.max(...fpsData.map((d) => d.fps)),
          weatherDuringTest: [...new Set(fpsData.map((d) => d.weather))],
        };

        // Create downloadable file
        const debugText = JSON.stringify(debugData, null, 2);
        const blob = new Blob([debugText], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `mga-debug-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        productionLog("✅ Debug collection complete!");
        productionLog("📁 Debug file downloaded");
        productionLog("📊 Debug Summary:", {
          petHungerEnabled: debugData.petHungerSystem.enabled,
          activePets: debugData.petHungerSystem.activePets.length,
          weatherEnabled: debugData.weatherSystem.enabled,
          currentWeather: debugData.weatherSystem.currentWeather,
          averageFPS: debugData.performance.fpsAnalysis?.averageFPS,
          errors: debugData.recentErrors.length,
        });

        // Also log to console for immediate viewing
        productionLog("🔍 Full Debug Data:", debugData);

        return debugData;
      }

      // Also set a timeout in case FPS monitoring doesn't complete
      setTimeout(() => {
        if (frameCount < 600) {
          productionLog("⏱️ Timeout reached, finishing collection early...");
          finishDebugCollection();
        }
      }, 12000);

      return "Debug collection started... Will complete in 10 seconds.";
    };

    // ==================== MEMORY MANAGEMENT SYSTEM ====================
    // Prevent memory leaks and accumulation that requires tab restarts

    const mgaCleanupHandlers = [];
    let mgaIntervals = [];
    let mgaTimeouts = [];

    // Register cleanup handler
    function MGA_addCleanupHandler(handler) {
      if (typeof handler === "function") {
        mgaCleanupHandlers.push(handler);
      }
    }

    // Register interval for automatic cleanup
    function MGA_addInterval(interval) {
      mgaIntervals.push(interval);
      return interval;
    }

    // Register timeout for automatic cleanup
    function MGA_addTimeout(timeout) {
      mgaTimeouts.push(timeout);
      return timeout;
    }

    // Clean up all MGA resources
    function MGA_cleanup() {
      productionLog("🧹 [MEMORY] Starting MGA cleanup...");

      try {
        // Clear all intervals
        mgaIntervals.forEach((interval) => {
          if (interval) {
            clearInterval(interval);
          }
        });
        productionLog(`🧹 [MEMORY] Cleared ${mgaIntervals.length} intervals`);
        mgaIntervals = [];

        // Clear all timeouts
        mgaTimeouts.forEach((timeout) => {
          if (timeout) {
            clearTimeout(timeout);
          }
        });
        productionLog(`🧹 [MEMORY] Cleared ${mgaTimeouts.length} timeouts`);
        mgaTimeouts = [];

        // Run custom cleanup handlers
        mgaCleanupHandlers.forEach((handler, index) => {
          try {
            handler();
            productionLog(`🧹 [MEMORY] Executed cleanup handler ${index + 1}`);
          } catch (error) {
            console.error(
              `❌ [MEMORY] Cleanup handler ${index + 1} failed:`,
              error,
            );
          }
        });

        // Clear event listeners
        if (window.MGA_Internal && window.MGA_Internal.eventListeners) {
          window.MGA_Internal.eventListeners.forEach(
            ({ element, event, handler }) => {
              try {
                element.removeEventListener(event, handler);
              } catch (error) {
                productionWarn(
                  `⚠️ [MEMORY] Failed to remove event listener:`,
                  error,
                );
              }
            },
          );
          productionLog(
            `🧹 [MEMORY] Removed ${window.MGA_Internal.eventListeners.length} event listeners`,
          );
          window.MGA_Internal.eventListeners = [];
        }

        // Clear large data structures
        if (window.UnifiedState) {
          // Save critical data before cleanup
          const criticalData = {
            petPresets: window.UnifiedState.data?.petPresets,
            seedsToDelete: window.UnifiedState.data?.seedsToDelete,
            settings: window.UnifiedState.data?.settings,
          };

          // Save critical data
          Object.keys(criticalData).forEach((key) => {
            if (criticalData[key] !== undefined) {
              MGA_saveJSON(`MGA_${key}`, criticalData[key]);
            }
          });

          // BUGFIX v3.7.7: Don't clear ability logs during cleanup - they're persisted to storage
          // The logs are automatically saved via debounced save system when new logs are added
          // Clearing them here causes loss of logs on page refresh
          // (Removed: window.UnifiedState.data.petAbilityLogs = [])
        }

        productionLog("✅ [MEMORY] MGA cleanup completed successfully");
      } catch (error) {
        console.error("❌ [MEMORY] MGA cleanup failed:", error);
      }
    }

    // Set up automatic cleanup on page unload
    window.addEventListener("beforeunload", () => {
      productionLog("🔄 [MEMORY] Page unloading, starting cleanup...");
      MGA_cleanup();
    });

    // Set up cleanup on page hide (for mobile/tab switching)
    window.addEventListener("pagehide", () => {
      productionLog("🔄 [MEMORY] Page hiding, starting cleanup...");
      MGA_cleanup();
    });

    // Export memory management functions
    window.MGA_cleanup = MGA_cleanup;
    window.MGA_addCleanupHandler = MGA_addCleanupHandler;
    window.MGA_addInterval = MGA_addInterval;
    window.MGA_addTimeout = MGA_addTimeout;

    // ==================== MEMORY OPTIMIZATION SYSTEM ====================
    // Smart memory management to reduce footprint while preserving user data

    // Configuration for memory limits
    const MGA_MemoryConfig = {
      maxLogsInMemory: 1000, // Keep latest 1000 logs in memory
      maxLogsInStorage: 10000, // Archive up to 10000 logs in storage
      saveDebounceMs: 2000, // Debounce saves by 2 seconds
      domPoolSize: 50, // Pool size for DOM elements
    };

    // Debounced save system to reduce I/O operations
    const saveTimeouts = new Map();

    function MGA_debouncedSave(key, data) {
      // 1. Immediate Safety Check: Is the environment even alive?
      try {
        // A simple check to see if we can still touch the basic environment
        if (typeof window === "undefined") return;
      } catch (e) {
        return; // Environment is completely dead, don't even try to queue a save
      }

      // Clear existing timeout for this key
      if (saveTimeouts.has(key)) {
        clearTimeout(saveTimeouts.get(key));
      }

      // Set new debounced timeout
      const timeout = setTimeout(() => {
        try {
          // 2. Re-verify everything inside the async callback
          // Firefox might have de-initialized between the call and this execution
          const isFirefox = navigator.userAgent.includes("Firefox");

          // If we are in Firefox, verify the storage API is still linked
          if (
            isFirefox &&
            typeof GM_setValue === "undefined" &&
            typeof localStorage === "undefined"
          ) {
            throw new Error("storage_unreachable");
          }

          // 3. Perform the save
          if (typeof MGA_saveJSON === "function") {
            MGA_saveJSON(key, data);
          }

          // 4. Safe Logging
          // Don't let a logging failure crash a successful save
          try {
            if (typeof productionLog === "function") {
              productionLog(`💾 [MEMORY] Debounced save completed for ${key}`);
            }
          } catch (logError) {
            // Console might be uninitialized, just ignore
          }
        } catch (error) {
          // 5. Handle the "Component not initialized" or "Dead Object"
          if (
            error.message?.includes("initialized") ||
            error.message?.includes("dead")
          ) {
            // Silently fail and perhaps retry in a few seconds if the data is critical
            console.warn(
              `⚠️ [MEMORY] Save postponed: Tab context busy/inactive for ${key}`,
            );
          } else {
            console.error(
              `❌ [MEMORY] Debounced save failed for ${key}:`,
              error,
            );
          }
        } finally {
          // Always cleanup the map to prevent memory leaks
          saveTimeouts.delete(key);
        }
      }, MGA_MemoryConfig?.saveDebounceMs || 1000);

      saveTimeouts.set(key, timeout);
    }

    // Smart log management system
    function MGA_manageLogMemory(logs) {
      if (
        !Array.isArray(logs) ||
        logs.length <= MGA_MemoryConfig.maxLogsInMemory
      ) {
        return logs; // No management needed
      }

      productionLog(
        `🧠 [MEMORY] Managing log memory: ${logs.length} logs, keeping ${MGA_MemoryConfig.maxLogsInMemory} in memory`,
      );

      // Keep the most recent logs in memory
      const recentLogs = logs.slice(0, MGA_MemoryConfig.maxLogsInMemory);

      // Archive older logs to separate storage
      const archivedLogs = logs.slice(MGA_MemoryConfig.maxLogsInMemory);
      if (archivedLogs.length > 0) {
        // Save archived logs to separate storage key
        const existingArchive = MGA_loadJSON("MGA_petAbilityLogs_archive", []);
        const combinedArchive = [...archivedLogs, ...existingArchive].slice(
          0,
          MGA_MemoryConfig.maxLogsInStorage,
        );
        MGA_debouncedSave("MGA_petAbilityLogs_archive", combinedArchive);
        productionLog(
          `📦 [MEMORY] Archived ${archivedLogs.length} logs to storage`,
        );
      }

      return typeof wrapLogsArray === "function"
        ? wrapLogsArray(recentLogs)
        : recentLogs;
    }

    // DOM element pooling for performance
    const MGA_DOMPool = {
      pools: new Map(),

      getElement: function (tagName, className = "") {
        const key = `${tagName}:${className}`;
        if (!this.pools.has(key)) {
          this.pools.set(key, []);
        }

        const pool = this.pools.get(key);
        if (pool.length > 0) {
          const element = pool.pop();
          // Reset element state
          element.innerHTML = "";
          element.removeAttribute("style");
          element.className = className;
          return element;
        }

        // Create new element if pool is empty (using target context)
        const element = targetDocument.createElement(tagName);
        if (className) element.className = className;
        return element;
      },

      returnElement: function (element) {
        if (!element || !element.tagName) return;

        const key = `${element.tagName.toLowerCase()}:${element.className || ""}`;
        if (!this.pools.has(key)) {
          this.pools.set(key, []);
        }

        const pool = this.pools.get(key);
        if (pool.length < MGA_MemoryConfig.domPoolSize) {
          // Clean element before returning to pool
          element.innerHTML = "";
          element.removeAttribute("style");
          element.onclick = null;
          element.onmouseover = null;
          element.onmouseout = null;
          pool.push(element);
        }
      },

      cleanup: function () {
        productionLog("🧹 [MEMORY] Cleaning DOM element pools");
        this.pools.clear();
      },
    };

    // Add DOM pool cleanup to main cleanup handler
    MGA_addCleanupHandler(() => {
      MGA_DOMPool.cleanup();
      // Clear save timeouts
      saveTimeouts.forEach((timeout) => clearTimeout(timeout));
      saveTimeouts.clear();
    });

    // Function to retrieve all logs (memory + archived) when needed
    function MGA_getAllLogs() {
      const memoryLogs = UnifiedState.data?.petAbilityLogs || [];
      const archivedLogs = MGA_loadJSON("MGA_petAbilityLogs_archive", []);

      // Combine and sort by timestamp (newest first)
      const allLogs = [...memoryLogs, ...archivedLogs];
      allLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      productionLog(
        `📜 [MEMORY] Retrieved ${memoryLogs.length} memory logs + ${archivedLogs.length} archived logs = ${allLogs.length} total`,
      );
      return allLogs;
    }

    // Export memory optimization functions
    window.MGA_debouncedSave = MGA_debouncedSave;
    window.MGA_manageLogMemory = MGA_manageLogMemory;
    window.MGA_getAllLogs = MGA_getAllLogs;
    window.MGA_DOMPool = MGA_DOMPool;

    // ==================== DOM QUERY CACHE SYSTEM ====================
    // Performance optimization: Cache frequently accessed DOM queries
    const elementCache = new WeakMap();
    const CACHE_DURATION = 1000; // 1 second cache

    function getCachedElement(selector, context = document) {
      const now = Date.now();
      const key = `${selector}_${context.id || "document"}`;

      let cached = elementCache.get(context);
      if (cached && cached[key] && now - cached[key].time < CACHE_DURATION) {
        return cached[key].element;
      }

      const element = context.querySelector(selector);
      if (!cached) cached = {};
      cached[key] = { element, time: now };
      elementCache.set(context, cached);

      return element;
    }

    function getCachedElements(selector, context = document) {
      const now = Date.now();
      const key = `${selector}_all_${context.id || "document"}`;

      let cached = elementCache.get(context);
      if (cached && cached[key] && now - cached[key].time < CACHE_DURATION) {
        return cached[key].elements;
      }

      const elements = context.querySelectorAll(selector);
      if (!cached) cached = {};
      cached[key] = { elements, time: now };
      elementCache.set(context, cached);

      return elements;
    }

    // Invalidate cache for a specific context (useful after DOM changes)
    function invalidateCache(context = document) {
      elementCache.delete(context);
    }

    window.MGA_DOMCache = {
      getCachedElement,
      getCachedElements,
      invalidateCache,
    };

    // ==================== NAMESPACE ISOLATION ====================
    // Keep MGA functions completely isolated to prevent conflicts with external scripts

    // Export MGA functions to global scope for direct access (MGA_ prefix prevents conflicts)
    window.MGA_loadJSON = MGA_loadJSON;
    window.MGA_saveJSON = MGA_saveJSON;

    // External Script Conflict Detection and Protection
    window.MGA_ConflictDetection = {
      mainScriptDetected: false,
      protectedGlobals: [
        "autoFeedEnabled",
        "autoFeedState",
        "autoFeedSkipFavorited",
        "petAbilityLogs",
      ],

      // Ensure MGA never accesses external script globals
      preventAccess: function () {
        if (!this.mainScriptDetected) return;

        // Create safe accessors that prevent MGA from accidentally touching external script variables
        this.protectedGlobals.forEach((globalVar) => {
          if (window[globalVar] !== undefined) {
            productionLog(
              `🔒 [MGA-ISOLATION] Ensuring MGA cannot access external script global: ${globalVar}`,
            );

            // Define a read-only accessor for debugging
            Object.defineProperty(window, `MGA_SAFE_${globalVar}`, {
              get: function () {
                productionWarn(
                  `⚠️ [MGA-ISOLATION] MGA attempted to access external script global: ${globalVar}`,
                );
                productionWarn(
                  `⚠️ [MGA-ISOLATION] This access was blocked to prevent interference`,
                );
                console.trace();
                return undefined; // Always return undefined to MGA
              },
              configurable: false,
              enumerable: false,
            });
          }
        });

        // Specifically protect external feed variables
        productionLog(
          `🔒 [MGA-ISOLATION] External script feed protection active`,
        );
        productionLog(
          `🔒 [MGA-ISOLATION] MGA will not interfere with external feed functionality`,
        );
      },

      detectMainScript: function () {
        const hasMainScriptFunctions =
          typeof window.loadJSON === "function" ||
          typeof window.saveJSON === "function";
        const hasMainScriptVars =
          typeof window.petAbilityLogs !== "undefined" ||
          typeof window.autoFeedEnabled !== "undefined";
        const hasVisibilityOverride =
          document.hidden === false &&
          typeof Object.getOwnPropertyDescriptor === "function";

        this.mainScriptDetected =
          hasMainScriptFunctions || hasMainScriptVars || hasVisibilityOverride;

        if (this.mainScriptDetected) {
          // productionLog('🔍 [MGA-ISOLATION] External scripts detected - enabling full isolation mode');
          productionLog(
            "🔒 [MGA-ISOLATION] MGA will NOT modify global functions or external script variables",
          );
          productionLog(
            "📝 [MGA-ISOLATION] Protected variables:",
            this.protectedGlobals,
          );
        } else {
          productionLog(
            "📝 [MGA-ISOLATION] No external scripts detected - running in standalone mode",
          );
        }

        return this.mainScriptDetected;
      },

      checkGlobalIntegrity: function () {
        if (!this.mainScriptDetected) return true;

        const violations = [];

        // Check if we accidentally modified protected globals
        this.protectedGlobals.forEach((globalVar) => {
          if (window[globalVar] !== undefined) {
            // External script global exists - make sure we don't interfere
            // productionLog(`🔍 [MGA-ISOLATION] External script global '${globalVar}' is active - ensuring no interference`);
          }
        });

        // Check if global loadJSON/saveJSON are external script's versions
        if (window.loadJSON && window.loadJSON !== MGA_loadJSON) {
          productionLog(
            "🔒 [MGA-ISOLATION] Global loadJSON belongs to external script - MGA using isolated MGA_loadJSON",
          );
        }
        if (window.saveJSON && window.saveJSON !== MGA_saveJSON) {
          productionLog(
            "🔒 [MGA-ISOLATION] Global saveJSON belongs to external script - MGA using isolated MGA_saveJSON",
          );
        }

        return violations.length === 0;
      },

      createIsolationBarrier: function () {
        if (!this.mainScriptDetected) return;

        // Light protection - just store original values for monitoring
        this.protectedGlobals.forEach((globalVar) => {
          if (window[globalVar] !== undefined) {
            const originalValue = window[globalVar];

            // Store original value for later comparison
            try {
              Object.defineProperty(window, `_MGA_ORIGINAL_${globalVar}`, {
                value: originalValue,
                writable: true,
                configurable: true,
              });
              productionLog(
                `🛡️ [MGA-ISOLATION] Stored original value for external script global: ${globalVar}`,
              );
            } catch (protectionError) {
              productionWarn(
                `⚠️ [MGA-ISOLATION] Could not store original value for ${globalVar}:`,
                protectionError.message,
              );
            }
          }
        });

        // Simple function protection - just save references without modifying
        if (window.loadJSON && window.loadJSON !== window.MGA_loadJSON) {
          productionLog(
            `🔒 [MGA-ISOLATION] External script loadJSON detected - storing reference`,
          );
          window._MGA_MAINSCRIPT_loadJSON = window.loadJSON;
        }
        if (window.saveJSON && window.saveJSON !== window.MGA_saveJSON) {
          productionLog(
            `🔒 [MGA-ISOLATION] External script saveJSON detected - storing reference`,
          );
          window._MGA_MAINSCRIPT_saveJSON = window.saveJSON;
        }
      },

      // New method to verify isolation integrity
      validateIsolation: function () {
        const violations = [];

        // Check that MGA never modified protected globals
        this.protectedGlobals.forEach((globalVar) => {
          const original = window[`_MGA_ORIGINAL_${globalVar}`];
          const current = window[globalVar];

          if (original !== undefined && current !== original) {
            violations.push({
              global: globalVar,
              expected: original,
              actual: current,
              type: "global_modification",
            });
          }
        });

        // Check that MGA uses its own storage functions
        if (
          window.MGA_loadJSON &&
          window.loadJSON &&
          window.MGA_loadJSON === window.loadJSON
        ) {
          violations.push({
            issue: "MGA_loadJSON is assigned to global loadJSON",
            type: "function_collision",
          });
        }
        if (
          window.MGA_saveJSON &&
          window.saveJSON &&
          window.MGA_saveJSON === window.saveJSON
        ) {
          violations.push({
            issue: "MGA_saveJSON is assigned to global saveJSON",
            type: "function_collision",
          });
        }

        if (violations.length > 0) {
          console.error(
            `❌ [MGA-ISOLATION] Isolation violations detected:`,
            violations,
          );
          return false;
        }

        productionLog(
          `✅ [MGA-ISOLATION] Isolation validation passed - no violations detected`,
        );
        return true;
      },
    };

    // NEVER set global window.loadJSON or window.saveJSON - this prevents conflicts
    // MGA ALWAYS uses MGA_loadJSON and MGA_saveJSON exclusively

    // ==================== SAVE OPERATION WRAPPER ====================
    // Wrapper function to handle new MGA_saveJSON return format and provide user feedback

    window.MGA_safeSave = function (key, value, options = {}) {
      let keyLocal = key;
      const {
        showUserAlert = true,
        criticalData = false,
        description = keyLocal,
        silent = false,
      } = options;

      // CRITICAL: Ensure we never use external script keys
      if (keyLocal && !keyLocal.startsWith("MGA_")) {
        console.error(
          `❌ [MGA-ISOLATION] CRITICAL: Attempted to save with non-MGA key: ${keyLocal}`,
        );
        console.error(
          `❌ [MGA-ISOLATION] This would conflict with external scripts! Adding MGA_ prefix.`,
        );
        console.trace();
        keyLocal = "MGA_" + keyLocal;
      }

      try {
        // Simple synchronous save
        const success = MGA_saveJSON(keyLocal, value);

        if (success) {
          if (!silent) {
            productionLog(
              `✅ [MGA-SAFE-SAVE] Successfully saved ${description}`,
            );
          }
          return { success: true };
        } else {
          // Save failed
          const errorMsg = `Failed to save ${description}`;
          console.error(`❌ [MGA-SAFE-SAVE] ${errorMsg}`);

          // REMOVED: Alert on save failure - causes modal spam
          // Save failures are logged to console instead

          return { success: false, error: "save_failed" };
        }
      } catch (error) {
        console.error(
          `❌ [MGA-SAFE-SAVE] Exception during save of ${description}:`,
          error,
        );
        return { success: false, error: error.message, exception: true };
      }
    };

    // Helper function for backward compatibility with legacy save calls
    window.MGA_legacySave = function (key, value, description) {
      const result = MGA_safeSave(key, value, {
        description: description || key,
        showUserAlert: true,
        criticalData:
          key.includes("petPresets") || key.includes("seedsToDelete"),
      });
      return result.success;
    };

    // Validation helper for critical data types
    window.MGA_validateSaveData = function (key, value) {
      if (key === "MGA_petPresets") {
        if (!value || typeof value !== "object") {
          return { valid: false, error: "Pet presets must be an object" };
        }
        for (const [presetName, preset] of Object.entries(value)) {
          if (!Array.isArray(preset)) {
            return {
              valid: false,
              error: `Preset '${presetName}' must be an array`,
            };
          }
          if (!preset.every((pet) => pet && pet.id && pet.petSpecies)) {
            return {
              valid: false,
              error: `Preset '${presetName}' contains invalid pet data`,
            };
          }
        }
        return { valid: true };
      }

      if (key === "MGA_seedsToDelete") {
        if (!Array.isArray(value)) {
          return { valid: false, error: "Seeds to delete must be an array" };
        }
        if (!value.every((seed) => typeof seed === "string" && seed.trim())) {
          return { valid: false, error: "All seeds must be non-empty strings" };
        }
        return { valid: true };
      }

      return { valid: true }; // Default: assume valid for other data types
    };

    // Diagnostic function for localStorage issues
    window.MGA_debugStorage = function () {
      productionLog("🔍 [MGA-STORAGE] localStorage Diagnostic Report");
      productionLog("=====================================");

      try {
        // Check basic availability
        productionLog("📊 Basic Info:");
        productionLog(
          "  localStorage available:",
          typeof localStorage !== "undefined",
        );
        productionLog("  Total items in localStorage:", localStorage.length);

        // Check MGA-specific keys
        const mgaKeys = Object.keys(localStorage).filter((k) =>
          k.startsWith("MGA_"),
        );
        productionLog("  MGA-specific keys found:", mgaKeys.length);
        productionLog("  MGA keys:", mgaKeys);

        // Check each MGA key
        productionLog("\n📝 MGA Data Status:");
        mgaKeys.forEach((key) => {
          try {
            const value = localStorage.getItem(key);
            const parsed = JSON.parse(value);
            productionLog(`  ${key}:`, {
              exists: true,
              size: value.length + " chars",
              type: typeof parsed,
              itemCount: Array.isArray(parsed)
                ? parsed.length
                : Object.keys(parsed || {}).length,
            });
          } catch (e) {
            productionLog(`  ${key}: ❌ Invalid JSON - ${e.message}`);
          }
        });

        // Check conflicts
        productionLog("\n⚠️ Potential Conflicts:");
        productionLog(
          "  window.loadJSON defined by:",
          window.loadJSON === MGA_loadJSON ? "MGA" : "Other script",
        );
        productionLog(
          "  window.saveJSON defined by:",
          window.saveJSON === MGA_saveJSON ? "MGA" : "Other script",
        );

        // Storage space test
        productionLog("\n💾 Storage Test:");
        const testKey = "MGA_storageTest";
        const testData = { test: true, timestamp: Date.now() };
        try {
          MGA_saveJSON(testKey, testData);
          const retrieved = MGA_loadJSON(testKey, null);
          productionLog(
            "  Storage test result:",
            retrieved && retrieved.test === true ? "✅ PASSED" : "❌ FAILED",
          );
          localStorage.removeItem(testKey);
        } catch (e) {
          productionLog("  Storage test result: ❌ FAILED -", e.message);
        }
      } catch (error) {
        console.error("❌ [MGA-STORAGE] Diagnostic failed:", error);
      }
    };

    function safeSendMessage(message) {
      try {
        // Check for connection availability
        if (!targetWindow.MagicCircle_RoomConnection) {
          productionWarn("⚠️ MagicCircle_RoomConnection not available");
          return false;
        }

        // Validate that sendMessage exists and is a function
        if (
          typeof targetWindow.MagicCircle_RoomConnection.sendMessage !==
          "function"
        ) {
          productionWarn("⚠️ sendMessage is not a function or not available");
          return false;
        }

        // Send the message
        targetWindow.MagicCircle_RoomConnection.sendMessage(message);
        return true;
      } catch (error) {
        console.error("❌ Error sending message:", error);
        return false;
      }
    }

    // ==================== PROPER GAME MESSAGE SENDER ====================
    function sendToGame(payloadObj) {
      const msg = { scopePath: ["Room", "Quinoa"], ...payloadObj };
      try {
        if (
          !targetWindow.MagicCircle_RoomConnection ||
          !targetWindow.MagicCircle_RoomConnection.sendMessage
        ) {
          productionWarn(
            "⚠️ MagicCircle_RoomConnection not available for sendToGame",
          );
          return false;
        }

        productionLog("🎮 sendToGame:", msg);
        targetWindow.MagicCircle_RoomConnection.sendMessage(msg);
        return true;
      } catch (error) {
        console.error("❌ sendToGame error:", error);
        return false;
      }
    }

    // --- Unified atom access helper (recommended) ---
    function readAtom(atomName) {
      const gw =
        (typeof unsafeWindow !== "undefined" && unsafeWindow) || window;
      try {
        if (gw.MGTools?.store?.getAtomValue)
          return gw.MGTools.store.getAtomValue(atomName);
      } catch {}
      return null;
    }

    // --- Tiered readers for atoms with UnifiedState fallback ---
    const readMyPetSlots = () => {
      try {
        return getAtomValue("myPrimitivePetSlotsAtom");
      } catch {
        /* atom unavailable */
      }
      return UnifiedState?.atoms?.activePets ?? null;
    };

    const readMyInventory = () => {
      try {
        return getAtomValue("myCropInventoryAtom");
      } catch {
        /* atom unavailable */
      }
      return UnifiedState?.atoms?.inventory ?? null;
    };

    // --- RoomConnection wiring ---
    const RC =
      targetWindow.MagicCircle_RoomConnection ||
      window.RoomConnection?.instance ||
      targetWindow?.MagicCircle_RoomConnection ||
      null;

    // Install bulletproof WebSocket tap (doesn't rely on RC._socket)
    (function installWsTap() {
      const WS = targetWindow.WebSocket || window.WebSocket;
      if (!WS || WS.prototype.__mgaTapInstalled) return;
      const origAdd = WS.prototype.addEventListener;
      const subs = new Set();

      function fanout(evt) {
        try {
          let d = evt.data;
          try {
            d = JSON.parse(d);
          } catch {}
          const arr = Array.isArray(d) ? d : [d];
          for (const msg of arr)
            for (const fn of subs) {
              try {
                fn(msg);
              } catch {}
            }
        } catch {}
      }

      WS.prototype.addEventListener = function (type, listener, opts) {
        if (type === "message") {
          const wrapped = (evt) => {
            fanout(evt);
            return listener.call(this, evt);
          };
          return origAdd.call(this, type, wrapped, opts);
        }
        return origAdd.call(this, type, listener, opts);
      };

      // Also hook onmessage setter so we still see messages when code uses ws.onmessage =
      Object.defineProperty(WS.prototype, "onmessage", {
        set(fn) {
          this.__mgaOnMsg = fn;
          this.addEventListener("message", (evt) => fn.call(this, evt));
        },
        get() {
          return this.__mgaOnMsg || null;
        },
      });

      targetWindow.__mgaSubscribeServer = (fn) => {
        subs.add(fn);
        return () => subs.delete(fn);
      };
      window.__mgaSubscribeServer = (fn) => {
        subs.add(fn);
        return () => subs.delete(fn);
      };
      WS.prototype.__mgaTapInstalled = true;
    })();

    // Wait for one matching server message using the bulletproof tap
    async function waitForServer(predicate, timeoutMs = 3500) {
      return new Promise((resolve, reject) => {
        const unsub = (
          window.__mgaSubscribeServer || targetWindow.__mgaSubscribeServer
        )((msg) => {
          try {
            if (predicate(msg)) {
              unsub();
              resolve(msg);
            }
          } catch {}
        });
        const to = setTimeout(() => {
          unsub();
          reject(new Error("timeout"));
        }, timeoutMs);
      });
    }

    // Add debug helper to peek at incoming messages
    async function peekNextMessages(count = 10, windowMs = 1500) {
      const seen = [];
      const unsub = (
        window.__mgaSubscribeServer || targetWindow.__mgaSubscribeServer
      )((m) => {
        if (seen.length < count) seen.push(m?.type || typeof m);
      });
      await new Promise((res) => setTimeout(res, windowMs));
      unsub();
      productionLog("[WS-TAP] next msgs after send:", seen);
    }

    // Resolve a concrete inventory item id for the given species name
    function resolveInventoryItemIdForSpecies(species, inventoryObj) {
      const items = Array.isArray(inventoryObj?.items)
        ? inventoryObj.items
        : [];

      const it = items.find((i) => {
        const sp = i?.species || i?.item?.species;
        const fav = !!(i?.favorite || i?.isFavorited);
        const count = i?.count ?? i?.quantity ?? 1;
        return sp === species && !fav && count > 0;
      });

      // CRITICAL FIX: Game uses 'id' field, not 'inventoryItemId' or 'itemId'
      // Check actual field structure and prioritize correctly
      const resolvedId = it?.id || it?.inventoryItemId || it?.itemId || null;
      if (it && !resolvedId) {
        console.error("[Feed] Item has no valid ID field:", it);
      }
      return resolvedId;
    }

    // Build-and-send FeedPet (simplified - uses new rcSend)
    async function sendFeedPet(petItemId, cropItemId) {
      const payload = {
        type: "FeedPet",
        petItemId: petItemId,
        cropItemId: cropItemId,
      };
      productionLog("[MGA] Feed payload:", payload);
      return rcSend(payload);
    }

    // Send with server ack verification
    async function sendWithAck(
      type,
      payload,
      makePredicate,
      debugPeek = false,
    ) {
      productionLog("[Feed-Debug] 🚀 Sending", { type, ...payload });
      await sendFeedPet(payload.petItemId, payload.cropItemId);

      // Debug: peek at next messages to confirm tap is working (remove after verification)
      if (debugPeek) {
        peekNextMessages(10, 1500);
      }

      const ack = await waitForServer(makePredicate({ type, payload })).catch(
        () => null,
      );
      return !!ack;
    }

    // Feed pet with server event verification (no atom polling)
    async function feedPetEnsureSync(
      petItemId,
      cropItemId,
      petIndex,
      enableDebugPeek = false,
    ) {
      // Predicate matching server events that confirm feed success
      const makePredicate =
        ({ payload }) =>
        (msg) => {
          if (!msg || typeof msg !== "object") return false;

          // Option A: Explicit ack with matching petItemId
          if (
            msg.type === "FeedPetAck" &&
            msg.ok &&
            msg.petItemId === payload.petItemId
          ) {
            return true;
          }

          // Option B: Domain event (PetFed)
          if (msg.type === "PetFed" && msg.petItemId === payload.petItemId) {
            return true;
          }

          // Option C: InventoryDelta removing the crop
          if (msg.type === "InventoryDelta" && msg.removed) {
            if (Array.isArray(msg.removed)) {
              return msg.removed.some(
                (r) => r.id === payload.cropItemId || r === payload.cropItemId,
              );
            }
          }

          // Fallback: Check if message JSON contains our IDs (less precise)
          const msgStr = JSON.stringify(msg);
          if (
            msgStr.includes(payload.petItemId) &&
            msgStr.includes(payload.cropItemId)
          ) {
            productionLog(
              "[Feed-Verify] 🔍 Fallback match on IDs in:",
              msg.type || "unknown",
            );
            return true;
          }

          return false;
        };

      const ok = await sendWithAck(
        "FeedPet",
        { petItemId, cropItemId },
        makePredicate,
        enableDebugPeek,
      );

      if (ok) {
        productionLog("[Feed-Verify] ✅ verified by server event");
        return { verified: true };
      }

      console.warn("[Feed-Verify] ❌ no ack/delta in 3.5s");
      return { verified: false };
    }

    // One-off test snippet (keep behind a debug toggle or run in console)
    async function __mga_testSingleFeed() {
      const pets = readAtom("myPetInfosAtom") || [];
      const pet = pets?.[0];
      const items =
        readAtom("myCropItemsAtom") || readAtom("myCropInventoryAtom") || [];
      const produce = items.find((x) => x?.itemType === "Produce");

      if (!pet?.petItemId) throw new Error("No pet found");
      if (!produce?.id) throw new Error("No produce item found");

      await sendFeedPet(pet.petItemId, produce.id);
      productionLog("[MGA] Test feed sent.");
    }

    // Expose test function to global scope for console access
    if (typeof unsafeWindow !== "undefined" && unsafeWindow) {
      unsafeWindow.__mga_testSingleFeed = __mga_testSingleFeed;
    }
    window.__mga_testSingleFeed = __mga_testSingleFeed;

    // Function to get FRESH data from a hooked atom (bypasses cached data)
    function getAtomValueFresh(windowKey) {
      const ref = atomReferences.get(windowKey);
      if (!ref) {
        console.warn(`[MGTools] No atom reference stored for '${windowKey}'`);
        return null;
      }

      try {
        // Force a fresh read from the atom cache
        const currentState = ref.atomCache.get(ref.atomPath);
        if (!currentState || !currentState.v) {
          console.warn(`[MGTools] Atom '${windowKey}' has no current state`);
          return null;
        }

        // Return the current value directly from the atom cache
        productionLog(
          `[MGTools] 🔄 Got fresh data for '${windowKey}' from atom cache`,
        );
        return currentState.v;
      } catch (error) {
        console.error(
          `[MGTools] Error getting fresh atom value for '${windowKey}':`,
          error,
        );
        return null;
      }
    }

    function hookAtom(atomPath, windowKey, callback, retryCount = 0) {
      const maxRetries = 60; // Max 30 seconds (was 20/10s)
      const hookKey = `${atomPath}_${windowKey}`;

      // Prevent duplicate hooks - only check if retryCount is 0 (first attempt)
      if (retryCount === 0 && hookedAtoms.has(hookKey)) {
        productionLog(
          `[HOOK] Already hooked: ${windowKey} - skipping duplicate`,
        );
        return;
      }

      // DIAGNOSTIC: Check multiple possible locations for jotaiAtomCache
      if (retryCount === 0) {
        productionLog(
          "  - targetWindow.jotaiAtomCache:",
          typeof targetWindow.jotaiAtomCache,
          targetWindow.jotaiAtomCache,
        );
        productionLog(
          "  - isUserscript:",
          isUserscript,
          "(using unsafeWindow:",
          isUserscript ? "YES" : "NO)",
        );
        const jotaiKeys = Object.keys(targetWindow).filter((k) =>
          k.toLowerCase().includes("jotai"),
        );
        productionLog('  - Keys with "jotai" on targetWindow:', jotaiKeys);
      }

      // Try multiple contexts for jotaiAtomCache (cascading fallback)
      let atomCache = null;

      // Priority 1: Check targetWindow (should be window in page context)
      if (targetWindow.jotaiAtomCache) {
        atomCache =
          targetWindow.jotaiAtomCache.cache || targetWindow.jotaiAtomCache;
      }
      // Priority 2: Check window directly
      if (!atomCache && window.jotaiAtomCache) {
        atomCache = window.jotaiAtomCache.cache || window.jotaiAtomCache;
      }
      // Priority 3: Check window.top (in case we're in iframe)
      if (!atomCache && window.top && window.top.jotaiAtomCache) {
        atomCache =
          window.top.jotaiAtomCache.cache || window.top.jotaiAtomCache;
      }
      if (!atomCache || !atomCache.get) {
        if (retryCount >= maxRetries) {
          console.error(
            `❌ [ATOM-HOOK] Gave up waiting for atom store for ${windowKey} after ${maxRetries} retries (${maxRetries / 2}s)`,
          );
          console.error(
            `❌ [ATOM-HOOK] Final check - targetWindow.jotaiAtomCache:`,
            targetWindow.jotaiAtomCache,
          );
          console.error(`❌ [ATOM-HOOK] Using unsafeWindow:`, isUserscript);
          console.error(
            `❌ [ATOM-HOOK] Script will continue with reduced functionality`,
          );
          productionWarn(
            `⚠️ [ATOM-HOOK] Gave up waiting for atom store for ${windowKey} after ${maxRetries} retries`,
          );
          productionWarn(
            `⚠️ [ATOM-HOOK] Script will continue with reduced functionality`,
          );
          return;
        }
        // Exponential backoff: 50ms → 100ms → 200ms → 500ms (cap at 500ms)
        const delay = Math.min(50 * Math.pow(2, Math.min(retryCount, 3)), 500);

        // Log every 5th retry to avoid console spam
        if (retryCount % 5 === 0) {
        }

        setTimeout(
          () => hookAtom(atomPath, windowKey, callback, retryCount + 1),
          delay,
        );
        return;
      }

      // Success - atomCache found!
      if (retryCount > 0) {
      }

      productionLog(
        `🔗 Attempting to hook atom: ${windowKey} at path: ${atomPath}`,
      );

      try {
        const atom = atomCache.get(atomPath);
        if (!atom || !atom.read) {
          productionWarn(`❌ Could not find atom for ${atomPath}`);
          // List available atoms for debugging
          const allAtoms = Array.from(atomCache.keys());
          const petAtoms = allAtoms.filter(
            (key) =>
              key.includes("Pet") ||
              key.includes("pet") ||
              key.includes("Slot"),
          );
          productionLog("🔍 Pet-related atoms:", petAtoms);
          productionLog("🔍 All atoms (first 20):", allAtoms.slice(0, 20));
          return;
        }

        const originalRead = atom.read;
        atom.read = function (get) {
          const rawValue = originalRead.call(this, get);

          // Enhanced debugging for activePets
          if (
            windowKey === "activePets" &&
            UnifiedState.data.settings?.debugMode
          ) {
            productionLog(`🐾 [ATOM-DEBUG] ${windowKey} raw value:`, {
              value: rawValue,
              type: typeof rawValue,
              isArray: Array.isArray(rawValue),
              length: rawValue?.length,
              firstItem: rawValue?.[0],
            });
          }

          // Allow callback to transform the value before storing
          let finalValue = rawValue;
          if (callback) {
            const callbackResult = callback(rawValue);
            // If callback returns a value, use it; otherwise use raw value
            if (callbackResult !== undefined) {
              finalValue = callbackResult;
              if (
                windowKey === "activePets" &&
                UnifiedState.data.settings?.debugMode
              ) {
                productionLog(
                  `🐾 [ATOM-DEBUG] ${windowKey} transformed by callback:`,
                  finalValue,
                );
              }
            }
          }

          // Store the final (possibly transformed) value
          UnifiedState.atoms[windowKey] = finalValue;
          window[windowKey] = finalValue;

          if (
            windowKey === "activePets" &&
            UnifiedState.data.settings?.debugMode
          ) {
            productionLog(
              `🐾 [ATOM-DEBUG] ${windowKey} stored in UnifiedState:`,
              {
                count: finalValue?.length || 0,
                value: finalValue,
              },
            );
          }

          return rawValue; // Return raw value to game
        };

        productionLog(`✅ hookAtom: Successfully hooked ${windowKey}`);

        // Mark this hook as successful to prevent duplicates
        hookedAtoms.add(hookKey);

        // Store atom reference for later re-querying (CRITICAL for fresh data)
        atomReferences.set(windowKey, {
          atom: atom,
          atomCache: atomCache,
          atomPath: atomPath,
        });
        productionLog(
          `📦 Stored atom reference for ${windowKey} (can now re-query for fresh data)`,
        );

        // Don't force an initial read - it might trigger game modals
        // Instead, wait for the game to naturally read the atom
        // Or use the periodic check in updateActivePetsFromRoomState
      } catch (error) {
        console.error(`❌ Error hooking ${atomPath}:`, error);
      }
    }

    // ==================== SLOT INDEX TRACKING - ADVANCED ====================
    // Hook directly into the atom cache to track slot changes
    function listenToSlotIndexAtom() {
      productionLog("🔍 [SLOT-ATOM] Starting slot index atom listener...");

      // Initialize the slot index
      if (typeof window._mgtools_currentSlotIndex === "undefined") {
        window._mgtools_currentSlotIndex = 0;
        productionLog("🎯 [SLOT-ATOM] Initialized slot index to 0");
      }

      // Method 1: Try to hook via jotaiAtomCache
      const tryHookingViaCache = () => {
        const atomCache =
          targetWindow.jotaiAtomCache?.cache || targetWindow.jotaiAtomCache;
        if (!atomCache || !atomCache.get) {
          productionLog("⏳ [SLOT-ATOM] Waiting for jotaiAtomCache...");
          return false;
        }

        // Look for the slot index atom path
        const possiblePaths = [
          "/home/runner/work/magiccircle.gg/magiccircle.gg/client/src/games/Quinoa/atoms/myAtoms.ts/myCurrentGrowSlotIndexAtom",
          "myCurrentGrowSlotIndexAtom",
          "myCurrentGrowSlotIndex",
        ];

        for (const path of possiblePaths) {
          const atom = atomCache.get(path);
          if (atom && atom.read) {
            productionLog(`✅ [SLOT-ATOM] Found slot atom at: ${path}`);

            // Hook the read function
            const originalRead = atom.read;
            atom.read = function (get) {
              const value = originalRead.call(this, get);
              const idx = Number.isFinite(value) ? value : 0;

              // Only update if changed
              if (window._mgtools_currentSlotIndex !== idx) {
                window._mgtools_currentSlotIndex = idx;
                productionLog(
                  `🎯 [SLOT-ATOM-CACHE] Slot index changed to: ${idx}`,
                );

                // Update display
                if (typeof insertTurtleEstimate === "function") {
                  requestAnimationFrame(() => insertTurtleEstimate());
                }
              }

              return value;
            };

            return true;
          }
        }

        // List all atoms to find the right one
        const allAtoms = Array.from(atomCache.keys());
        const slotAtoms = allAtoms.filter(
          (key) =>
            key.includes("Slot") ||
            key.includes("slot") ||
            key.includes("Index") ||
            key.includes("index"),
        );

        productionLog("🔍 [SLOT-ATOM] Slot-related atoms found:", slotAtoms);

        // Try to find it in the list
        const slotIndexAtom = slotAtoms.find(
          (key) =>
            key.includes("GrowSlotIndex") ||
            key.includes("CurrentGrowSlotIndex"),
        );

        if (slotIndexAtom) {
          productionLog(
            `🎯 [SLOT-ATOM] Found potential slot atom: ${slotIndexAtom}`,
          );
          return tryHookingViaCache(); // Retry with the found path
        }

        return false;
      };

      // Method 2: Watch for X/C keypresses and arrow clicks
      const setupKeyWatcher = () => {
        productionLog(
          "🎮 [SLOT-ATOM] Setting up X/C key and arrow click watcher as fallback...",
        );

        let lastCropCount = 0;
        let lastCropHash = "";

        // Helper to get crop hash for change detection
        const getCropHashSimple = (crops) => {
          if (!crops || !crops.length) return "";
          return crops.map((c) => `${c.species}_${c.endTime}`).join("|");
        };

        // ==================== MULTI-HARVEST SYNC HELPERS ====================

        // Define target context for consistent access
        const targetWindow =
          typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
        const targetDocument = targetWindow.document;

        // Polyfill queueMicrotask for older embeds
        // eslint-disable-next-line no-undef
        const qmt =
          typeof queueMicrotask === "function"
            ? queueMicrotask
            : (fn) => Promise.resolve().then(fn);

        // Robust atom finder
        function findAtom(cache, names = ["myCurrentGrowSlotIndexAtom"]) {
          if (!cache) return null;

          if (cache.get) {
            // Try direct lookup first
            for (const n of names) {
              if (cache.get(n)) return cache.get(n);
            }
            // Suffix match fallback
            for (const [k, v] of cache.entries?.() ?? []) {
              if (names.some((n) => k.endsWith(n))) return v;
            }
          } else {
            // Plain object fallback
            for (const k of Object.keys(cache)) {
              if (names.some((n) => k === n || k.endsWith(n))) return cache[k];
            }
          }
          return null;
        }

        // Safe atom value reader
        function readAtomValue(atom) {
          try {
            // Prefer cached "last seen" value if atom watcher tracks it
            if (typeof atom?.lastValue !== "undefined") return atom.lastValue;

            // Otherwise, attempt safe read only if API matches
            if (
              typeof atom?.read === "function" &&
              typeof atom?.init !== "undefined"
            ) {
              const ctx = { get: (a) => (a === atom ? atom.init : undefined) };
              return atom.read(ctx);
            }
          } catch {}
          return undefined;
        }

        // Centralized state setter
        function setSlotIndex(idx) {
          window._mgtools_currentSlotIndex = idx;

          if (CONFIG.DEBUG.FLAGS.FIX_VALIDATION) {
            productionLog("[FIX_SLOT] Set slot index to:", idx);
          }
        }

        // Main sync function - sync from game's Jotai atom state
        function syncSlotIndexFromGame() {
          const atomCache =
            targetWindow.jotaiAtomCache?.cache || targetWindow.jotaiAtomCache;
          if (!atomCache) return null;

          const slotAtom = findAtom(atomCache, ["myCurrentGrowSlotIndexAtom"]);
          if (!slotAtom) return null;

          const gameIndex = readAtomValue(slotAtom);
          if (!Number.isFinite(gameIndex)) return null;

          const currentIndex = window._mgtools_currentSlotIndex || 0;

          // Only update if changed
          if (gameIndex !== currentIndex) {
            setSlotIndex(gameIndex);

            // Trigger value refresh using consistent scheduling
            qmt(() => {
              requestAnimationFrame(() => {
                if (typeof insertTurtleEstimate === "function") {
                  insertTurtleEstimate();
                }
              });
            });

            if (CONFIG.DEBUG.FLAGS.FIX_VALIDATION) {
              window._mgtools_syncCount = (window._mgtools_syncCount || 0) + 1;
              productionLog("[FIX_HARVEST] Synced to game slot:", {
                from: currentIndex,
                to: gameIndex,
                syncCount: window._mgtools_syncCount,
              });
            }

            return gameIndex;
          }

          return null;
        }

        // Expose sync function globally for harvest handler
        window.syncSlotIndexFromGame = syncSlotIndexFromGame;

        // ==================== END MULTI-HARVEST SYNC HELPERS ====================

        // Update function
        const updateSlotIndex = (direction) => {
          const currentCrop =
            UnifiedState.atoms.currentCrop || window.currentCrop || [];
          const sortedIndices =
            UnifiedState.atoms.sortedSlotIndices || window.sortedSlotIndices;

          if (!currentCrop || currentCrop.length <= 1) return;

          // Get the max valid index based on sorted indices or crop length
          const maxIndex = sortedIndices?.length || currentCrop.length;

          if (direction === "forward") {
            window._mgtools_currentSlotIndex =
              (window._mgtools_currentSlotIndex + 1) % maxIndex;
          } else if (direction === "backward") {
            window._mgtools_currentSlotIndex =
              (window._mgtools_currentSlotIndex - 1 + maxIndex) % maxIndex;
          }

          productionLog(
            `🎯 [SLOT-KEY] Cycled ${direction} - slot index: ${window._mgtools_currentSlotIndex}/${maxIndex}`,
          );

          // Update display immediately
          setTimeout(() => {
            if (typeof insertTurtleEstimate === "function") {
              insertTurtleEstimate();
            }
          }, 100);
        };

        // Key listener
        targetDocument.addEventListener(
          "keydown",
          (e) => {
            // Skip if typing in input
            const active = targetDocument.activeElement;
            if (
              active &&
              (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
            )
              return;

            const currentCrop =
              UnifiedState.atoms.currentCrop || window.currentCrop || [];
            if (!currentCrop || currentCrop.length <= 1) return;

            // Check if crop changed (new tile)
            const currentHash = getCropHashSimple(currentCrop);
            if (currentHash !== lastCropHash) {
              window._mgtools_currentSlotIndex = 0;
              lastCropHash = currentHash;
              lastCropCount = currentCrop.length;
              productionLog(
                `🔄 [SLOT-KEY] New crop detected, reset index to 0`,
              );
            }

            if (e.key.toLowerCase() === "x") {
              updateSlotIndex("forward");
            } else if (e.key.toLowerCase() === "c") {
              updateSlotIndex("backward");
            }
          },
          true,
        );

        // Arrow button click detection
        targetDocument.addEventListener(
          "click",
          (e) => {
            const target = e.target;
            if (!target) return;

            // Check for arrow buttons in the tooltip
            const button = target.closest("button");
            if (!button) return;

            // Look for chevron icons or arrow text
            const hasLeftArrow =
              button.querySelector('svg[data-icon="chevron-left"]') ||
              button.innerHTML.includes("chevron-left") ||
              button.getAttribute("aria-label")?.includes("Previous");

            const hasRightArrow =
              button.querySelector('svg[data-icon="chevron-right"]') ||
              button.innerHTML.includes("chevron-right") ||
              button.getAttribute("aria-label")?.includes("Next");

            if (hasLeftArrow) {
              productionLog("⬅️ [SLOT-ARROW] Left arrow clicked");
              updateSlotIndex("backward");
            } else if (hasRightArrow) {
              productionLog("➡️ [SLOT-ARROW] Right arrow clicked");
              updateSlotIndex("forward");
            }
          },
          true,
        );

        productionLog("✅ [SLOT-ATOM] Key and arrow watchers installed");
      };

      // Install key watcher immediately as backup
      setupKeyWatcher();

      // Also try cache hooking for better integration
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;

        if (tryHookingViaCache()) {
          clearInterval(checkInterval);
          productionLog(
            "✅ [SLOT-ATOM] Successfully hooked slot index atom via cache!",
          );
          // Key watcher remains as backup
        } else if (attempts >= 10) {
          clearInterval(checkInterval);
          productionLog("ℹ️ [SLOT-ATOM] Using key watcher for slot tracking");
        }
      }, 1000);
    }

    // ==================== DRAGGABLE & RESIZABLE ====================
    // OPTIMIZED MAIN HUD DRAGGING SYSTEM - Professional and smooth
    function makeDraggable(element, handle) {
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let startLeft = 0;
      let startTop = 0;
      const animationFrame = null;
      let currentX = 0;
      let currentY = 0;

      handle.style.cursor = "grab";

      // Shared drag start logic for both mouse and touch
      const startDrag = (clientX, clientY, event) => {
        if (event.target.tagName === "BUTTON") return;
        // Don't start drag if clicking resize handle
        if (
          event.target.classList &&
          event.target.classList.contains("mga-resize-handle")
        )
          return;

        event.preventDefault();
        event.stopPropagation();

        isDragging = true;
        startX = clientX;
        startY = clientY;
        currentX = startX;
        currentY = startY;

        const rect = element.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;

        // Professional drag start effects with will-change for performance
        element.style.willChange = "transform";
        element.style.transition = "none";
        element.style.transform = "scale(1.01)";
        element.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.3)";
        element.style.zIndex = "999999";
        handle.style.cursor = "grabbing";

        targetDocument.body.style.userSelect = "none";

        debugLog("OVERLAY_LIFECYCLE", "Started dragging main HUD", {
          elementClass: element.className,
          startPosition: { left: startLeft, top: startTop },
        });
      };

      // Shared drag move logic
      const handleDragMove = (clientX, clientY) => {
        if (!isDragging) return;

        const deltaX = clientX - startX;
        const deltaY = clientY - startY;

        // Enhanced boundary constraints with snap zones
        const snapZone = 15;
        let newLeft = startLeft + deltaX;
        let newTop = startTop + deltaY;

        // Viewport constraints
        newLeft = Math.max(
          0,
          Math.min(window.innerWidth - element.offsetWidth, newLeft),
        );
        newTop = Math.max(
          0,
          Math.min(window.innerHeight - element.offsetHeight, newTop),
        );

        // Snap to edges with visual feedback
        if (newLeft < snapZone) {
          newLeft = 0;
          element.style.borderLeft = "2px solid rgba(74, 158, 255, 0.5)";
        } else if (
          newLeft >
          window.innerWidth - element.offsetWidth - snapZone
        ) {
          newLeft = window.innerWidth - element.offsetWidth;
          element.style.borderRight = "2px solid rgba(74, 158, 255, 0.5)";
        } else {
          element.style.borderLeft = "";
          element.style.borderRight = "";
        }

        if (newTop < snapZone) {
          newTop = 0;
          element.style.borderTop = "2px solid rgba(74, 158, 255, 0.5)";
        } else if (
          newTop >
          window.innerHeight - element.offsetHeight - snapZone
        ) {
          newTop = window.innerHeight - element.offsetHeight;
          element.style.borderBottom = "2px solid rgba(74, 158, 255, 0.5)";
        } else {
          element.style.borderTop = "";
          element.style.borderBottom = "";
        }

        // Use direct positioning for more reliable movement
        element.style.left = `${newLeft}px`;
        element.style.top = `${newTop}px`;
      };

      // Shared drag end logic
      const endDrag = () => {
        if (isDragging) {
          isDragging = false;

          // Clean up styles
          element.style.transition = "all 0.2s ease";
          element.style.transform = "scale(1)";
          element.style.boxShadow =
            "var(--panel-shadow, 0 4px 12px rgba(0, 0, 0, 0.40))";
          element.style.zIndex = "";
          element.style.borderTop = "";
          element.style.borderBottom = "";
          element.style.borderLeft = "";
          element.style.borderRight = "";
          element.style.willChange = "auto";

          handle.style.cursor = "grab";
          targetDocument.body.style.userSelect = "";

          // Save position
          const finalPosition = {
            left: element.style.left,
            top: element.style.top,
          };

          saveMainHUDPosition(finalPosition);

          debugLog("OVERLAY_LIFECYCLE", "Finished dragging main HUD", {
            elementClass: element.className,
            finalPosition,
          });
        }
      };

      // Mouse event handlers
      handle.addEventListener("mousedown", (e) => {
        startDrag(e.clientX, e.clientY, e);
      });

      document.addEventListener("mousemove", (e) => {
        handleDragMove(e.clientX, e.clientY);
      });

      document.addEventListener("mouseup", (e) => {
        endDrag();
      });

      // Touch event handlers
      handle.addEventListener(
        "touchstart",
        (e) => {
          if (e.touches.length === 1) {
            const touch = e.touches[0];
            startDrag(touch.clientX, touch.clientY, e);
          }
        },
        { passive: false },
      );

      document.addEventListener(
        "touchmove",
        (e) => {
          if (isDragging && e.touches.length === 1) {
            const touch = e.touches[0];
            handleDragMove(touch.clientX, touch.clientY);
            e.preventDefault(); // Prevent scrolling while dragging
          }
        },
        { passive: false },
      );

      document.addEventListener("touchend", (e) => {
        endDrag();
      });

      document.addEventListener("touchcancel", (e) => {
        endDrag();
      });
    }

    // Save main HUD position
    function saveMainHUDPosition(position) {
      try {
        MGA_saveJSON("MGA_mainHUDPosition", position);
        debugLog("OVERLAY_LIFECYCLE", "Saved main HUD position", { position });
      } catch (error) {
        debugError(
          "OVERLAY_LIFECYCLE",
          "Failed to save main HUD position",
          error,
          { position },
        );
      }
    }

    // Load main HUD position on startup
    function loadMainHUDPosition(element) {
      try {
        const savedPosition = MGA_loadJSON("MGA_mainHUDPosition", null);
        if (savedPosition && savedPosition.left && savedPosition.top) {
          const leftPx = parseInt(savedPosition.left);
          const topPx = parseInt(savedPosition.top);

          if (
            !isNaN(leftPx) &&
            !isNaN(topPx) &&
            leftPx >= 0 &&
            topPx >= 0 &&
            leftPx < window.innerWidth &&
            topPx < window.innerHeight
          ) {
            element.style.left = savedPosition.left;
            element.style.top = savedPosition.top;

            debugLog("OVERLAY_LIFECYCLE", "Restored main HUD position", {
              position: savedPosition,
            });
          }
        }
      } catch (error) {
        debugError(
          "OVERLAY_LIFECYCLE",
          "Failed to load main HUD position",
          error,
        );
      }
    }

    // ==================== UNIFIED RESIZE SYSTEM ====================
    function makeElementResizable(element, options = {}) {
      const {
        minWidth = 300,
        minHeight = 250,
        maxWidth = window.innerWidth * 0.9,
        maxHeight = window.innerHeight * 0.9,
        handleSize = 12,
        showHandleOnHover = true,
      } = options;

      // Check if element already has a resize handle - remove it to prevent duplicates
      const existingHandle = element.querySelector(".mga-resize-handle");
      if (existingHandle) {
        existingHandle.remove();
      }

      // Create resize handle
      const resizeHandle = document.createElement("div");
      resizeHandle.className = "mga-resize-handle";
      resizeHandle.title = "Drag to resize";
      resizeHandle.style.cssText = `
          position: absolute;
          bottom: 0;
          right: 0;
          width: ${handleSize}px;
          height: ${handleSize}px;
          cursor: se-resize;
          background: linear-gradient(-45deg, transparent 35%, rgba(74, 158, 255, 0.7) 45%, rgba(74, 158, 255, 0.9) 50%, rgba(74, 158, 255, 0.7) 55%, transparent 65%);
          border-radius: 0 0 4px 0;
          opacity: ${showHandleOnHover ? "0.5" : "0.7"};
          transition: opacity 0.2s ease, background 0.2s ease;
          z-index: 10;
          pointer-events: auto;
      `;
      element.appendChild(resizeHandle);

      if (showHandleOnHover) {
        element.addEventListener("mouseenter", () => {
          resizeHandle.style.opacity = "1.0";
        });
        element.addEventListener("mouseleave", () => {
          if (!element.hasAttribute("data-resizing")) {
            resizeHandle.style.opacity = "0.5";
          }
        });
      }

      let isResizing = false;
      let startX, startY, startWidth, startHeight;
      let rafId = null;

      const onMouseMove = (e) => {
        if (!isResizing) return;

        // Throttle with rAF for smoothness
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          const newWidth = Math.max(
            minWidth,
            Math.min(maxWidth, startWidth + (e.clientX - startX)),
          );
          const newHeight = Math.max(
            minHeight,
            Math.min(maxHeight, startHeight + (e.clientY - startY)),
          );
          element.style.width = `${newWidth}px`;
          element.style.height = `${newHeight}px`;
        });
      };

      const stopResizing = () => {
        if (!isResizing) return;
        isResizing = false;
        element.removeAttribute("data-resizing");
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        resizeHandle.style.opacity = showHandleOnHover ? "0.5" : "0.7";

        // Unbind listeners safely
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", stopResizing);
      };

      resizeHandle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();

        isResizing = true;
        element.setAttribute("data-resizing", "true");

        startX = e.clientX;
        startY = e.clientY;
        startWidth = element.offsetWidth;
        startHeight = element.offsetHeight;

        document.body.style.cursor = "se-resize";
        document.body.style.userSelect = "none";

        // Bind move/up only for duration of resize
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", stopResizing);
      });

      return resizeHandle;
    }

    // Legacy function for backward compatibility
    function makeResizable(element, handle) {
      // If a handle is provided, we're using the old system - just add simple resize
      if (handle) {
        return makeElementResizable(element, { showHandleOnHover: false });
      }
      return makeElementResizable(element);
    }

    // ==================== TOGGLE BUTTON DRAGGING ====================
    function makeToggleButtonDraggable(toggleBtn) {
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let startLeft = 0;
      let startTop = 0;
      let clickStarted = false;
      const animationFrame = null;
      let currentX = 0;
      let currentY = 0;

      toggleBtn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();

        clickStarted = true;
        isDragging = false; // Don't start dragging immediately
        startX = e.clientX;
        startY = e.clientY;
        currentX = startX;
        currentY = startY;

        const rect = toggleBtn.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;

        // Add will-change for better performance
        toggleBtn.style.willChange = "transform";
        toggleBtn.style.cursor = "grabbing";
      });

      document.addEventListener("pointermove", (e) => {
        if (!clickStarted) return;

        // Once dragging starts, don't check for MGA events to prevent dropping
        if (!isDragging) {
          // Only check isMGAEvent before drag starts
          if (!isMGAEvent(e)) {
            return;
          }
        }

        currentX = e.clientX;
        currentY = e.clientY;

        const deltaX = Math.abs(currentX - startX);
        const deltaY = Math.abs(currentY - startY);

        // Only start dragging if mouse moved more than 3px (more responsive)
        if (!isDragging && (deltaX > 3 || deltaY > 3)) {
          isDragging = true;
          toggleBtn.style.transition = "none";
          toggleBtn.style.boxShadow = "0 8px 32px rgba(74, 158, 255, 0.6)";
          toggleBtn.style.zIndex = "999999";
          // Capture pointer for reliable tracking
          toggleBtn.setPointerCapture(e.pointerId);
        }

        if (isDragging) {
          // Direct position update without transform
          const moveX = currentX - startX;
          const moveY = currentY - startY;

          let newLeft = startLeft + moveX;
          let newTop = startTop + moveY;

          // Constrain within viewport with padding
          const padding = 10;
          newLeft = Math.max(
            padding,
            Math.min(
              window.innerWidth - toggleBtn.offsetWidth - padding,
              newLeft,
            ),
          );
          newTop = Math.max(
            padding,
            Math.min(
              window.innerHeight - toggleBtn.offsetHeight - padding,
              newTop,
            ),
          );

          // Use direct positioning instead of transform for more reliable movement
          toggleBtn.style.right = "";
          toggleBtn.style.bottom = "";
          toggleBtn.style.left = `${newLeft}px`;
          toggleBtn.style.top = `${newTop}px`;
        }
      });

      document.addEventListener("pointerup", (e) => {
        if (clickStarted) {
          // Once drag is active, don't check MGA event
          if (!isDragging && !isMGAEvent(e)) {
            return;
          }

          if (isDragging) {
            // Release pointer capture
            toggleBtn.releasePointerCapture(e.pointerId);

            // Finish dragging
            isDragging = false;
            toggleBtn.style.transition = "all 0.2s ease";
            toggleBtn.style.boxShadow = "0 4px 20px rgba(74, 158, 255, 0.4)";
            toggleBtn.style.zIndex = "999998";
            toggleBtn.style.cursor = "grab";
            toggleBtn.style.willChange = "auto";

            // Save position (already applied directly)
            const finalPosition = {
              left: toggleBtn.style.left,
              top: toggleBtn.style.top,
              right: "", // Clear right positioning
              bottom: "", // Clear bottom positioning
            };
            saveToggleButtonPosition(finalPosition);

            debugLog(
              "OVERLAY_LIFECYCLE",
              "Toggle button dragged to new position",
              finalPosition,
            );
          } else {
            // This was a click, not a drag - trigger the toggle functionality
            toggleBtn.style.willChange = "auto";
            toggleBtn.style.cursor = "grab";

            const panel = UnifiedState.panels.main;
            const isCurrentlyVisible = panel.style.display !== "none";
            const newVisibility = !isCurrentlyVisible;

            panel.style.display = newVisibility ? "block" : "none";

            // Hide any stuck tooltips when panel is toggled
            if (window.MGA_Tooltips && window.MGA_Tooltips.hide) {
              window.MGA_Tooltips.hide();
            }

            // Save visibility state
            UnifiedState.data.settings.panelVisible = newVisibility;
            MGA_saveJSON("MGA_data", UnifiedState.data);

            debugLog(
              "OVERLAY_LIFECYCLE",
              `Panel toggled: ${newVisibility ? "visible" : "hidden"}`,
            );
          }

          clickStarted = false;
        }
      });
    }

    // Save toggle button position
    function saveToggleButtonPosition(position) {
      try {
        MGA_saveJSON("MGA_toggleButtonPosition", position);
        debugLog("OVERLAY_LIFECYCLE", "Saved toggle button position", {
          position,
        });
      } catch (error) {
        debugError(
          "OVERLAY_LIFECYCLE",
          "Failed to save toggle button position",
          error,
          { position },
        );
      }
    }

    // Load toggle button position on startup
    function loadToggleButtonPosition(toggleBtn) {
      try {
        const savedPosition = MGA_loadJSON("MGA_toggleButtonPosition", null);
        if (savedPosition) {
          if (savedPosition.left && savedPosition.top) {
            const leftPx = parseInt(savedPosition.left);
            const topPx = parseInt(savedPosition.top);

            if (
              !isNaN(leftPx) &&
              !isNaN(topPx) &&
              leftPx >= 0 &&
              topPx >= 0 &&
              leftPx < window.innerWidth &&
              topPx < window.innerHeight
            ) {
              toggleBtn.style.right = "";
              toggleBtn.style.bottom = "";
              toggleBtn.style.left = savedPosition.left;
              toggleBtn.style.top = savedPosition.top;

              debugLog("OVERLAY_LIFECYCLE", "Restored toggle button position", {
                position: savedPosition,
              });
            }
          }
        }
      } catch (error) {
        debugError(
          "OVERLAY_LIFECYCLE",
          "Failed to load toggle button position",
          error,
        );
      }
    }

    // ==================== VERSION CHECKER ====================
    async function checkVersion(indicatorElement) {
      // Skip version check on Discord to avoid CSP violations
      if (isDiscordPage) {
        const branchLabel = IS_LIVE_BETA ? "BETA" : "STABLE";
        indicatorElement.style.color = IS_LIVE_BETA ? "#ff9500" : "#00ff00"; // Orange for beta, green for stable

        const tooltipLines = [
          `CURRENT VERSION: v${CURRENT_VERSION} (Maintenence Mode)`,
          `STATUS: Version check disabled on Discord`,
          "",
          "Shift+Click: Update to Latest",
        ];

        indicatorElement.title = tooltipLines.join("\n");
        indicatorElement.style.cursor = "pointer";

        indicatorElement.addEventListener("click", (e) => {
          e.stopPropagation();
          if (e.shiftKey) {
            window.open(STABLE_DOWNLOAD_URL, "_blank");
          }
        });
        return;
      }

      // Fetch BOTH stable and beta versions
      const cacheBust = `?t=${Date.now()}`;

      async function fetchVersion(branch) {
        const urls = [
          `https://raw.githubusercontent.com/Umm12many/MGTools-M/main/MGTools.user.js${cacheBust}`,
          `https://api.github.com/repos/Umm12many/MGTools-M/contents/MGTools.user.js`,
        ];

        for (const url of urls) {
          try {
            const isGitHubAPI = url.includes("api.github.com");
            const response = await fetch(url, {
              method: "GET",
              cache: "no-cache",
              headers: isGitHubAPI
                ? { Accept: "application/vnd.github.v3.raw" }
                : {},
            });

            if (response.ok) {
              const text = await response.text();
              const match = text.match(/@version\s+([\d.]+)/);
              if (match) return match[1];
            }
          } catch (e) {
            continue;
          }
        }
        return null;
      }

      try {
        const [stableVersion, betaVersion] = await Promise.all([
          fetchVersion("main"),
        ]);

        if (!stableVersion && !betaVersion) {
          // Both failed
          const branchLabel = IS_LIVE_BETA ? "BETA" : "STABLE";
          indicatorElement.style.color = IS_LIVE_BETA ? "#ff9500" : "#ffa500";

          const tooltipLines = [
            `CURRENT VERSION: v${CURRENT_VERSION} (Maintenence Mode)`,
            `STATUS: Version check failed`,
            "",
            "Click: Retry",
            "Shift+Click: Update to Latest",
          ];

          indicatorElement.title = tooltipLines.join("\n");
          indicatorElement.style.cursor = "pointer";

          const newIndicator = indicatorElement.cloneNode(true);
          indicatorElement.parentNode.replaceChild(
            newIndicator,
            indicatorElement,
          );

          newIndicator.addEventListener("click", (e) => {
            e.stopPropagation();
            if (e.shiftKey) {
              window.open(STABLE_DOWNLOAD_URL, "_blank");
            } else {
              newIndicator.style.color = "#888";
              newIndicator.title = "Checking for updates...";
              checkVersion(newIndicator);
            }
          });
          return;
        }

        // Compare current version with the appropriate branch version
        const relevantVersion = IS_LIVE_BETA ? betaVersion : stableVersion;
        const versionComparison = compareVersions(
          CURRENT_VERSION,
          relevantVersion,
        );

        // Determine color and status
        let color, statusMsg;
        const branchLabel = IS_LIVE_BETA ? "BETA" : "STABLE";

        if (IS_LIVE_BETA) {
          // On Live Beta branch - use orange/yellow colors
          if (versionComparison === 0) {
            color = "#48ff00ff"; // Orange for up-to-date beta
            statusMsg = "MAINTENANCE MODE VERSION";
          } else if (versionComparison > 0) {
            color = "#48ff00ff"; // Yellow for dev beta
            statusMsg = "MAINTENANCE MODE VERSION";
          } else {
            color = "#ff00ff"; // Magenta for outdated beta
            statusMsg = "UPDATE AVAILABLE";
          }
        } else {
          // On Stable branch - use green colors
          if (versionComparison === 0) {
            color = "#48ff00ff"; // Bright green for up-to-date stable
            statusMsg = "MAINTENANCE MODE VERSION";
          } else if (versionComparison > 0) {
            color = "#48ff00ff"; // Light green for dev stable
            statusMsg = "MAINTENANCE MODE VERSION";
          } else {
            color = "#ff0000"; // Red for outdated stable
            statusMsg = "UPDATE AVAILABLE";
          }
        }

        // Build clear, easy-to-read tooltip
        const tooltipLines = [
          `CURRENT VERSION: v${CURRENT_VERSION} (${branchLabel})`,
          `STATUS: ${statusMsg}`,
          "",
          `GitHub Versions:`,
          `  Maintenence Version: v${stableVersion || "Loading..."}`,
          "",
          "Click: Recheck",
          "Shift+Click: Update to Latest",
        ];

        indicatorElement.style.color = color;
        indicatorElement.title = tooltipLines.join("\n");
        indicatorElement.style.cursor = "pointer";

        // Add click handler
        const newIndicator = indicatorElement.cloneNode(true);
        indicatorElement.parentNode.replaceChild(
          newIndicator,
          indicatorElement,
        );

        newIndicator.addEventListener("click", (e) => {
          e.stopPropagation();
          if (e.shiftKey && e.altKey) {
            window.open(BETA_DOWNLOAD_URL, "_blank");
          } else if (e.shiftKey) {
            window.open(STABLE_DOWNLOAD_URL, "_blank");
          } else {
            newIndicator.style.color = "#888";
            newIndicator.title = `v${CURRENT_VERSION} - Checking for updates...`;
            checkVersion(newIndicator);
          }
        });
      } catch (e) {
        // Unexpected error
        const branchLabel = IS_LIVE_BETA ? "BETA" : "STABLE";
        indicatorElement.style.color = IS_LIVE_BETA ? "#ff9500" : "#ffa500";

        const tooltipLines = [
          `CURRENT VERSION: v${CURRENT_VERSION} (Maintenence Mode)`,
          `STATUS: Version check failed`,
          "",
          "Click: Retry",
          "Shift+Click: Update to Latest",
        ];

        indicatorElement.title = tooltipLines.join("\n");
        indicatorElement.style.cursor = "pointer";

        const newIndicator = indicatorElement.cloneNode(true);
        indicatorElement.parentNode.replaceChild(
          newIndicator,
          indicatorElement,
        );

        newIndicator.addEventListener("click", (e) => {
          e.stopPropagation();
          if (e.shiftKey) {
            window.open(STABLE_DOWNLOAD_URL, "_blank");
          } else {
            newIndicator.style.color = "#888";
            newIndicator.title = "Checking for updates...";
            checkVersion(newIndicator);
          }
        });
        productionLog("[VERSION CHECK] Error:", e);
      }
    }

