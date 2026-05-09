/* ==== MGTP Overlay + Ability Logs Proxy + Rooms /info + WS Watcher (2025-10-07) ==== */
(function () {
  "use strict";
  const d = document;

  // ---------- Slot/Estimate Overlay ----------
  const rootHost = d.createElement("div");
  rootHost.id = "mgtp-overlay-root";
  rootHost.style.cssText =
    "position:fixed;left:0;top:0;width:0;height:0;z-index:2147483646;pointer-events:none;";
  const shadow = rootHost.attachShadow({ mode: "open" });
  const style = d.createElement("style");
  style.textContent = `
      .wrap{position:absolute;transform:translate(-50%,-100%); background:transparent; pointer-events:none; font-family: system-ui, sans-serif;}
      .line{display:block; white-space:nowrap; text-shadow:0 1px 1px rgba(0,0,0,.6); font-weight:700; text-align:center;}
      .estimate{font-size:13px; color:#70ff70;}
      .slot{font-size:14px; color:#ffd24d;}
      .hidden{display:none;}
    `;
  const wrap = d.createElement("div");
  wrap.className = "wrap hidden";
  const est = d.createElement("div");
  est.className = "line estimate";
  const slot = d.createElement("div");
  slot.className = "line slot";
  wrap.appendChild(est);
  wrap.appendChild(slot);
  shadow.appendChild(style);
  shadow.appendChild(wrap);
  d.documentElement.appendChild(rootHost);

  function placeAtRect(rect) {
    wrap.style.left = rect.left + rect.width / 2 + "px";
    wrap.style.top = rect.top + 2 + "px";
  }
  function visible(v) {
    wrap.classList.toggle("hidden", !v);
  }

  function bestAnchorFrom(el) {
    try {
      if (el && el.getBoundingClientRect) return el.getBoundingClientRect();
    } catch {}
    // fallback: any visible tooltip-like container
    const cand = d.querySelectorAll(
      '[role="tooltip"], [data-popper-placement], .chakra-tooltip, .chakra-tooltip__popper',
    );
    let best = null,
      bestArea = -1;
    cand.forEach((e) => {
      const r = e.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        // avoid pet panel/sidebar
        if (e.closest('[data-panel="pet-stats"], .pet-panel, [data-sidebar]'))
          return;
        const area = r.width * r.height;
        if (area > bestArea) {
          bestArea = area;
          best = r;
        }
      }
    });
    if (best) return best;
    // viewport fallback
    return {
      left: innerWidth / 2 - 1,
      top: innerHeight / 2 - 1,
      width: 2,
      height: 2,
    };
  }

  window.MGTP_slotOverlay = {
    update({ estimateText, slotValueText, anchorElement } = {}) {
      const hasEst = !!(estimateText && String(estimateText).trim());
      const hasSlot = !!(slotValueText && String(slotValueText).trim());
      est.textContent = hasEst ? String(estimateText) : "";
      slot.textContent = hasSlot ? String(slotValueText) : "";
      if (!hasEst && !hasSlot) {
        visible(false);
        return;
      }
      const r = bestAnchorFrom(anchorElement);
      placeAtRect(r);
      visible(true);
    },
    hide() {
      visible(false);
    },
  };

  // ---------- Ability Logs: Sticky Clear + Proxy dedupe ----------
  const CLEAR_FLAG = "MGA_logs_manually_cleared";
  const SESSION_FLAG = "MGA_logs_clear_session";
  function clearFlagIfNeededOnAdd() {
    // BUGFIX v3.7.8: Clear BOTH flags when new logs are added
    if (localStorage.getItem(CLEAR_FLAG) === "true") {
      try {
        localStorage.removeItem(CLEAR_FLAG);
      } catch {}
    }
    if (localStorage.getItem(SESSION_FLAG)) {
      try {
        localStorage.removeItem(SESSION_FLAG);
      } catch {}
    }
  }
  function wrapLogsArray(arr) {
    let arrLocal = arr;
    if (!Array.isArray(arrLocal)) arrLocal = [];
    const seen = new Set();
    const fp = (l) => {
      const t = (l && l.abilityType) || "",
        p = (l && l.petName) || "";
      const ts = String((l && l.timestamp) || 0);
      let h = 2166136261 >>> 0,
        s = t + "|" + p + "|" + ts;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return (h >>> 0).toString(36);
    };
    const dedupePush = (item) => {
      const id = item.id || fp(item);
      if (seen.has(id)) return 0;
      seen.add(id);
      arrLocal.push({ ...item, id });
      return 1;
    };
    // seed seen
    for (const it of arrLocal) {
      seen.add(it.id || fp(it));
    }
    return new Proxy(arrLocal, {
      get(target, prop, recv) {
        if (["push", "unshift", "splice", "concat"].includes(prop)) {
          return function (...args) {
            let added = 0;
            if (prop === "push" || prop === "unshift") {
              for (const it of args) {
                added += dedupePush(it);
              }
              if (added > 0) clearFlagIfNeededOnAdd();
              return target.length;
            }
            if (prop === "splice") {
              // if items provided after start/deleteCount, dedupe them
              if (args.length > 2) {
                const start = args[0] >>> 0,
                  del = args[1] >>> 0,
                  newItems = args.slice(2);
                const before = target.slice(0, start);
                const after = target.slice(start + del);
                const rebuilt = wrapLogsArray(before);
                for (const it of newItems) {
                  dedupePush.call({ arr: rebuilt }, it);
                }
                for (const it of after) {
                  dedupePush.call({ arr: rebuilt }, it);
                }
                while (target.length) target.pop();
                for (const it of rebuilt) target.push(it);
                clearFlagIfNeededOnAdd();
                return [];
              }
            }
            return Array.prototype[prop].apply(target, args);
          };
        }
        return Reflect.get(target, prop, recv);
      },
      set(target, key, val) {
        // direct index sets count as add
        if (!isNaN(key)) {
          const added = dedupePush(val);
          if (added > 0) clearFlagIfNeededOnAdd();
          return true;
        }
        return Reflect.set(target, key, val);
      },
    });
  }

  // Install proxy once UnifiedState is ready
  (function waitUnified() {
    const us = window.UnifiedState && UnifiedState.data;
    if (us) {
      if (!us.petAbilityLogs || !us.petAbilityLogs.__proxied) {
        us.petAbilityLogs = wrapLogsArray(us.petAbilityLogs || []);
        Object.defineProperty(us.petAbilityLogs, "__proxied", { value: true });
      }
      // Intercept clear button globally to ensure sticky clear + full purge
      d.addEventListener(
        "click",
        function (e) {
          const tgt = e.target;
          if (tgt && tgt.id === "clear-ability-logs") {
            e.preventDefault();
            e.stopImmediatePropagation();
            try {
              us.petAbilityLogs.length = 0;
              if (typeof GM_setValue !== "undefined") {
                GM_setValue("MGA_petAbilityLogs", JSON.stringify([]));
              }
              localStorage.setItem("MGA_petAbilityLogs", JSON.stringify([]));
              localStorage.setItem(CLEAR_FLAG, "true"); // keep sticky until next new log
              const archKeys = ["MGA_petAbilityLogs_archive"];
              archKeys.forEach((k) => {
                try {
                  if (typeof GM_setValue !== "undefined")
                    GM_setValue(k, JSON.stringify([]));
                } catch {}
                try {
                  localStorage.removeItem(k);
                } catch {}
              });
              if (window.updateAbilityLogDisplay) {
                try {
                  window.updateAbilityLogDisplay(document);
                } catch {}
              }
            } catch (err) {
              console.error("[MGTP] clear logs failed", err);
            }
          }
        },
        true,
      );
      return;
    }
    setTimeout(waitUnified, 200);
  })();

  function rerenderRoomsUI() {
    try {
      // BUGFIX: Use getRoomStatusTabContent directly (not window.getRoomStatusTabContent) - same scope
      if (typeof getRoomStatusTabContent !== "function") {
        return;
      }

      // Find any active rooms tab content areas (main or overlays)
      const candidates = document.querySelectorAll(
        '[data-tab="rooms"], .mga-tab-content, .mga-overlay-content',
      );
      let updated = false;

      candidates.forEach((c, idx) => {
        // Check if this element contains or is a rooms UI
        const list = c.querySelector("#room-status-list");
        const isRoomsTab =
          c.getAttribute && c.getAttribute("data-tab") === "rooms";

        if (list || isRoomsTab) {
          const html = getRoomStatusTabContent();
          c.innerHTML = html;
          if (typeof setupRoomJoinButtons === "function") {
            setupRoomJoinButtons();
            setupRoomsTabButtons();
          }
          updated = true;
        }
      });
    } catch (e) {
      if (typeof logDebug === "function") {
        logDebug("ROOMS-UI", "❌ Render error:", e);
      }
    }
  }

  // ---------- Rooms via /api/rooms/{code}/info with Fallbacks ----------
  /* global firebase, GM_xmlhttpRequest, MGA_saveJSON, rerenderRoomsUI */

  (function roomsInfo() {
    // CRITICAL: Detect correct window scope (Tampermonkey uses unsafeWindow)
    const isUserscript = typeof unsafeWindow !== "undefined";
    const correctWindow = isUserscript ? unsafeWindow : window;

    // --- FIREBASE CONFIGURATION & Initialization (Copied from public-rooms.user.js) ---
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

    let database;
    let isFirebaseReady = false;

    // NEW: Initialize Firebase
    try {
      if (
        typeof firebase !== "undefined" &&
        typeof firebase.apps !== "undefined"
      ) {
        if (!firebase.apps.length) {
          firebase.initializeApp(FIREBASE_CONFIG);
        }
        database = firebase.database();
        isFirebaseReady = true;
        productionLog(
          "[ROOMCODE] Firebase initialized for room status fetching.",
        );
      } else {
        console.error("[ROOMCODE] Firebase SDK is missing. Cannot initialize.");
      }
    } catch (e) {
      console.error("[ROOMCODE] Firebase initialization failed:", e);
    }
    // ---------------------------------------------------------------------------------

    const TRACKED = correctWindow.UnifiedState?.data?.customRooms ||
      correctWindow.TRACKED_ROOMS || [
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
        "SLAY",
      ];
    let extra = new Set();
    // NEW: 'counts' will now be populated by the Firebase data
    const counts = {};

    // Removed API Base URL, API_V1, fetchWithFetch, fetchWithGM, fetchOne as they are deprecated.

    // Removed roomIdToName and parsePlayerCount as we use the Firebase room data directly.

    // Track last poll time when UI was hidden (for reduced frequency)
    let lastTickWhenHidden = 0;

    // Cache room UI visibility check
    let cachedRoomsUIVisible = null;
    let lastUICheckTime = 0;

    // MODIFIED: 'tick' function to fetch from Firebase
    async function tick() {
      if (!isFirebaseReady) {
        console.error("[ROOMCODE] Skipping tick: Firebase not ready.");
        return;
      }

      const roomDebugMode =
        correctWindow.UnifiedState?.data?.settings?.roomDebugMode;

      // SMART POLLING: Check visibility (Original logic retained)
      const now = Date.now();
      if (!cachedRoomsUIVisible || now - lastUICheckTime > 5000) {
        cachedRoomsUIVisible =
          document.querySelector(
            '.mga-sidebar[data-visible="true"] [data-tab="rooms"]',
          ) ||
          document.querySelector("#room-status-list") ||
          document.querySelector('[data-mga-popout="rooms"]');
        lastUICheckTime = now;
      }
      const roomsUIVisible = cachedRoomsUIVisible;

      if (!roomsUIVisible) {
        const now = Date.now();
        if (lastTickWhenHidden > 0 && now - lastTickWhenHidden < 30000) {
          if (roomDebugMode) {
            const secondsSinceLastPoll = Math.floor(
              (now - lastTickWhenHidden) / 1000,
            );
            productionLog(
              `[ROOMS] ⏸️ Skipping tick - UI hidden (last poll ${secondsSinceLastPoll}s ago)`,
            );
          }
          return;
        }
        lastTickWhenHidden = now;
        if (roomDebugMode) {
          productionLog("[ROOMS] 🔄 Polling while UI hidden (30s interval)");
        }
      } else {
        lastTickWhenHidden = 0;
      }
      // END SMART POLLING

      // NEW CORE LOGIC: Fetch all public rooms from Firebase
      try {
        const snapshot = await database.ref("rooms/").once("value");
        const firebaseRooms = snapshot.val() || {};
        const roomCodes = Object.keys(firebaseRooms);

        // Clear previous counts and populate with Firebase data
        Object.keys(counts).forEach((key) => delete counts[key]);

        roomCodes.forEach((code) => {
          const room = firebaseRooms[code];
          // Use the uppercase room code as the key, as expected by the original UI
          const key = code.toUpperCase();
          const playerCount = room.playerCount ?? 0;

          counts[key] = playerCount;

          if (roomDebugMode && playerCount > 0) {
            productionLog(
              `[ROOMS] 📊 Firebase Room ${key}: ${playerCount} players`,
            );
          }
        });

        if (roomDebugMode) {
          productionLog(
            `[ROOMS] ✅ Fetched ${roomCodes.length} room counts from Firebase`,
          );
        }
      } catch (e) {
        console.error("[ROOMS] ❌ Firebase fetch error:", e);
        // On failure, keep existing counts or set all to 0 (we'll keep existing counts for resilience)
      }

      // write into UnifiedState so UI updates (Original logic retained)
      if (
        typeof correctWindow.UnifiedState !== "undefined" &&
        correctWindow.UnifiedState?.data
      ) {
        correctWindow.UnifiedState.data.roomStatus =
          correctWindow.UnifiedState.data.roomStatus || {};
        // CRITICAL: Directly replace counts to ensure fresh data
        correctWindow.UnifiedState.data.roomStatus.counts = { ...counts };

        // ADDED: Persist to storage
        if (typeof MGA_saveJSON === "function") {
          MGA_saveJSON(
            "MGA_roomStatus",
            correctWindow.UnifiedState.data.roomStatus,
          );
        }

        if (roomDebugMode) {
          productionLog(
            `[ROOMS] ✅ Updated ${Object.keys(counts).length} room counts in UnifiedState`,
          );
        }

        // refresh any open rooms views
        if (typeof window.refreshSeparateWindowPopouts === "function") {
          try {
            window.refreshSeparateWindowPopouts("rooms");
          } catch {}
        }
        try {
          if (typeof rerenderRoomsUI === "function") {
            rerenderRoomsUI();
          }
          // Force update room counts in any visible room UI
          document
            .querySelectorAll('.mga-tab-item[data-tab="rooms"]')
            .forEach((tab) => tab.click());
        } catch {}
        // Inline rooms lists
        const list = document.getElementById("room-status-list");
        if (list) {
          // trigger the existing re-render path if available
          if (typeof window.updateRoomStatusUI === "function") {
            window.updateRoomStatusUI();
          } else {
            // minimal DOM update: replace counts in .room-count els
            list.querySelectorAll(".room-row").forEach((row) => {
              const code = (row.getAttribute("data-room") || "").toUpperCase();
              const span = row.querySelector(".room-count");
              if (span && code) {
                span.textContent = String(
                  counts[code] ??
                    window.UnifiedState.data.roomStatus.counts[code] ??
                    0,
                );
              }
            });
          }
        }
      }
    }

    // MutationObserver to watch for room-search-input (Original logic retained)
    const obs = new MutationObserver(() => {
      const inp = document.getElementById("room-search-input");
      if (inp && !inp.__mgtpBound) {
        inp.__mgtpBound = true;
        inp.addEventListener("input", () => {
          const q = (inp.value || "").trim().toUpperCase();
          extra = new Set(
            q
              ? q
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : [],
          );
        });
      }
    });

    // Watch only the sidebar container instead of entire document (Original logic retained)
    const observeRoomSearch = () => {
      const sidebar =
        document.getElementById("mgh-sidebar") ||
        document.querySelector(".mga-sidebar");
      const targetElement = sidebar || document.documentElement;

      obs.observe(targetElement, {
        subtree: true,
        childList: true,
        attributes: false,
        characterData: false,
      });

      if (!sidebar) {
        setTimeout(() => {
          obs.disconnect();
          observeRoomSearch();
        }, 1000);
      }
    };

    observeRoomSearch();

    // Wait for UnifiedState and Firebase to be ready before starting polling
    function startPollingWhenReady() {
      const hasUnifiedState =
        typeof correctWindow.UnifiedState !== "undefined" &&
        correctWindow.UnifiedState?.data;

      // NEW: Check for Firebase readiness instead of RoomRegistry
      if (hasUnifiedState && isFirebaseReady) {
        // PERFORMANCE OPTIMIZATION: Retained 10s interval
        setTimeout(tick, 1000); // First tick after 1 second
        setInterval(tick, 10000); // Then every 10 seconds
      } else {
        // Only log if UnifiedState is not ready, as Firebase readiness is checked by `isFirebaseReady`
        if (!hasUnifiedState) {
          productionLog("[ROOMCODE] Waiting for UnifiedState to be ready...");
        } else if (!isFirebaseReady) {
          productionLog("[ROOMCODE] Waiting for Firebase to initialize...");
        }
        setTimeout(startPollingWhenReady, 500);
      }
    }

    startPollingWhenReady();

    // Removed testDiscordRoomFetch
  })();

  // ==================== ENHANCED WEBSOCKET AUTO-RECONNECT SYSTEM ====================
  (function enhancedSocketReconnect() {
    const Native = window.WebSocket;
    if (!Native || Native.__mgtoolsPatched) return; // Prevent double-patching

    let attempts = 0;
    const MAX_ATTEMPTS = 6;
    let reconnectTimer = null;
    let userNotified = false;

    // Platform detection for context-aware reconnection
    const isDiscord =
      /discord|overlay|electron/i.test(navigator.userAgent) ||
      !!(window.DiscordNative || window.__discordApp);
    const isIframe = window !== window.top;
    const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(
      navigator.userAgent,
    );

    // ==================== DOCUMENT.HIDDEN OVERRIDE FOR COMPAT MODE ====================
    // The game checks document.hidden and refuses to reconnect when hidden
    // In compat mode (Discord/managed devices), we override this to always return false
    if (
      typeof CompatibilityMode !== "undefined" &&
      CompatibilityMode.flags.wsReconnectWhenHidden
    ) {
      try {
        const originalDescriptor =
          Object.getOwnPropertyDescriptor(Document.prototype, "hidden") ||
          Object.getOwnPropertyDescriptor(document, "hidden");

        if (originalDescriptor && originalDescriptor.get) {
          Object.defineProperty(document, "hidden", {
            get: function () {
              // Always return false in compat mode to allow reconnection
              return false;
            },
            configurable: true,
          });

          logInfo(
            "COMPAT-WS",
            "Overrode document.hidden to enable reconnection in hidden state",
          );
        }

        // Also patch visibilityState
        const originalVisibilityDescriptor =
          Object.getOwnPropertyDescriptor(
            Document.prototype,
            "visibilityState",
          ) || Object.getOwnPropertyDescriptor(document, "visibilityState");

        if (originalVisibilityDescriptor && originalVisibilityDescriptor.get) {
          Object.defineProperty(document, "visibilityState", {
            get: function () {
              // Always return 'visible' in compat mode
              return "visible";
            },
            configurable: true,
          });
        }
      } catch (e) {
        logWarn("COMPAT-WS", "Failed to override document.hidden", e);
      }
    }

    // Add CSS animations
    const style = document.createElement("style");
    style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(400px); opacity: 0; }
            }
        `;
    document.head.appendChild(style);

    // User feedback: Visual toast notification
    function showReconnectToast(attemptNum, maxAttempts, nextWait) {
      let toast = document.getElementById("mga-reconnect-toast");

      const toastHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="font-size: 24px;">🔄</div>
                    <div>
                        <div style="font-weight: 600; margin-bottom: 4px;">Connection Lost</div>
                        <div style="font-size: 12px; opacity: 0.9;">
                            Reconnecting... (${attemptNum}/${maxAttempts})
                            <br>Next attempt in ${Math.round(nextWait / 1000)}s
                        </div>
                    </div>
                </div>
            `;

      if (!toast) {
        toast = document.createElement("div");
        toast.id = "mga-reconnect-toast";
        toast.style.cssText = `
                    position: fixed; top: 20px; right: 20px; z-index: 2147483647;
                    background: linear-gradient(135deg, rgba(59, 130, 246, 0.95), rgba(37, 99, 235, 0.95));
                    color: white; padding: 16px 24px; border-radius: 12px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    font-size: 14px; font-weight: 500; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                    animation: slideInRight 0.3s ease-out; max-width: 320px; pointer-events: auto;
                `;
        document.body.appendChild(toast);
      }

      toast.innerHTML = toastHTML;
      userNotified = true;

      setTimeout(() => {
        if (toast && toast.parentNode) {
          toast.style.animation = "slideOutRight 0.3s ease-out";
          setTimeout(() => toast.remove(), 300);
        }
      }, 5000);
    }

    // Show max attempts failure with manual reload button
    function showFailureToast() {
      const failToast = document.createElement("div");
      failToast.id = "mga-reconnect-fail-toast";
      failToast.style.cssText = `
                position: fixed; top: 20px; right: 20px; z-index: 2147483647;
                background: linear-gradient(135deg, rgba(220, 38, 38, 0.95), rgba(185, 28, 28, 0.95));
                color: white; padding: 16px 24px; border-radius: 12px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                font-size: 14px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3); max-width: 320px;
            `;

      failToast.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 8px;">⚠️ Connection Failed</div>
                <div style="font-size: 12px; opacity: 0.9; margin-bottom: 12px;">
                    Unable to reconnect after ${MAX_ATTEMPTS} attempts
                </div>
                <button onclick="location.reload()" style="
                    background: white; color: #dc2626; border: none; padding: 8px 16px;
                    border-radius: 6px; cursor: pointer; font-weight: 600; width: 100%; font-size: 13px;
                ">Reload Page</button>
            `;

      document.body.appendChild(failToast);
    }

    // Schedule reconnect with exponential backoff
    function scheduleReload(code, wasClean, reason) {
      // Handle version expired (4710) immediately - auto-refresh with notification
      if (code === 4710 || /version.?expired/i.test(reason || "")) {
        if (typeof productionLog === "function") {
          productionLog(
            "[WebSocket] Version expired detected (code 4710) - auto-refreshing in 5 seconds",
          );
        }

        // Show friendly update notification with countdown
        let countdown = 5;
        const updateToast = document.createElement("div");
        updateToast.id = "mga-update-toast";
        updateToast.style.cssText = `
                    position: fixed; top: 20px; right: 20px; z-index: 2147483647;
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95));
                    color: white; padding: 16px 24px; border-radius: 12px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    font-size: 14px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                    animation: slideInRight 0.3s ease-out; max-width: 320px;
                `;

        updateToast.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="font-size: 24px;">🎮</div>
                        <div>
                            <div style="font-weight: 600; margin-bottom: 4px;">Game Update Available</div>
                            <div style="font-size: 12px; opacity: 0.9;">
                                Refreshing in <span id="mga-countdown">${countdown}</span>s...
                            </div>
                        </div>
                    </div>
                `;

        document.body.appendChild(updateToast);

        // Update countdown every second
        const countdownInterval = setInterval(() => {
          countdown--;
          const countdownEl = document.getElementById("mga-countdown");
          if (countdownEl) {
            countdownEl.textContent = countdown;
          }
          if (countdown <= 0) {
            clearInterval(countdownInterval);
          }
        }, 1000);

        // Auto-refresh after 5 seconds
        setTimeout(() => {
          if (typeof productionLog === "function") {
            productionLog("[WebSocket] Auto-refreshing for game update...");
          }
          window.location.reload();
        }, 5000);

        return;
      }

      // Only reconnect for 1006 (abnormal) or if reason mentions update
      if (wasClean && code !== 1006 && !/update/i.test(reason || "")) {
        if (typeof productionLog === "function") {
          productionLog(
            "[WebSocket] Clean close detected - no reconnect needed",
          );
        }
        return;
      }

      // Clear any existing timer
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      // Check if max attempts exceeded
      if (attempts >= MAX_ATTEMPTS) {
        if (typeof productionWarn === "function") {
          productionWarn(
            `[WebSocket] Max reconnect attempts (${MAX_ATTEMPTS}) reached - manual refresh required`,
          );
        }
        showFailureToast();
        return;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, 15s, 15s
      const wait = Math.min(1000 * Math.pow(2, attempts), 15000);
      attempts++;

      if (typeof productionLog === "function") {
        productionLog(
          `[WebSocket] Reconnect attempt ${attempts}/${MAX_ATTEMPTS} in ${wait}ms (code: ${code}, reason: "${reason || "none"}")`,
        );
      }

      // Show user feedback
      showReconnectToast(attempts, MAX_ATTEMPTS, wait);

      reconnectTimer = setTimeout(() => {
        try {
          // Add timestamp to force reload and bypass cache
          const u = new URL(location.href);
          u.searchParams.set("_mgtp", Date.now().toString());

          // Platform-specific reload strategy
          if (isDiscord && isIframe) {
            // Discord iframe: try parent reload first
            try {
              window.parent.location.reload();
            } catch (e) {
              // Fallback to self reload if parent is inaccessible
              location.replace(u.toString());
            }
          } else if (isMobile) {
            // Mobile: hard reload to clear any cached state
            location.href = u.toString();
          } else {
            // Desktop: use replace to avoid back button issues
            location.replace(u.toString());
          }
        } catch (e) {
          if (typeof productionError === "function") {
            productionError("[WebSocket] Reload failed:", e);
          }
          // Last resort: simple reload
          location.href = location.href + "?_t=" + Date.now();
        }
      }, wait);
    }

    // Patch WebSocket constructor
    window.WebSocket = function (url, protocols) {
      const ws = new Native(url, protocols);

      // Reset attempts on successful connection
      ws.addEventListener("open", () => {
        if (typeof productionLog === "function") {
          productionLog("[WebSocket] Connection established successfully");
        }
        attempts = 0;
        userNotified = false;

        // Remove any reconnect toasts
        const toast = document.getElementById("mga-reconnect-toast");
        if (toast) toast.remove();
      });

      // Handle close events
      ws.addEventListener("close", (e) => {
        if (typeof productionLog === "function") {
          productionLog(
            `[WebSocket] Closed - Code: ${e.code}, Clean: ${e.wasClean}, Reason: "${e.reason || "none"}"`,
          );
        }
        scheduleReload(e.code, e.wasClean, e.reason);
      });

      // Handle errors
      ws.addEventListener("error", (e) => {
        if (typeof productionError === "function") {
          productionError("[WebSocket] Error detected:", e);
        }
      });

      return ws;
    };

    // Preserve prototype and static properties
    Object.setPrototypeOf(window.WebSocket, Native);
    window.WebSocket.prototype = Native.prototype;
    window.WebSocket.__mgtoolsPatched = true;

    // Network state listeners for smarter reconnection
    window.addEventListener("online", () => {
      if (typeof productionLog === "function") {
        productionLog(
          "[Network] Back online - reducing reconnect attempt counter",
        );
      }
      attempts = Math.max(0, attempts - 2); // Give extra chances when network returns

      // If we have a toast, update it
      const toast = document.getElementById("mga-reconnect-toast");
      if (toast) toast.remove();
    });

    window.addEventListener("offline", () => {
      if (typeof productionWarn === "function") {
        productionWarn(
          "[Network] Offline detected - pausing reconnection attempts",
        );
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      // Update toast if visible
      const toast = document.getElementById("mga-reconnect-toast");
      if (toast) {
        toast.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="font-size: 24px;">📡</div>
                        <div>
                            <div style="font-weight: 600; margin-bottom: 4px;">Network Offline</div>
                            <div style="font-size: 12px; opacity: 0.9;">
                                Reconnection paused<br>Waiting for network...
                            </div>
                        </div>
                    </div>
                `;
      }
    });

    if (typeof productionLog === "function") {
      productionLog(
        "✅ [WebSocket] Enhanced auto-reconnect system initialized (max attempts: " +
          MAX_ATTEMPTS +
          ")",
      );
    }
  })();

  // ==================== DOM UPDATE DETECTION (BACKUP METHOD) ====================
  // BUGFIX v3.7.8: Re-enabled with smarter detection to avoid false positives
  (function () {
    let updateDetected = false; // Shared flag to prevent duplicate refreshes

    function checkForGameUpdatePopup() {
      if (updateDetected) return false;

      // Look for Chakra UI alert dialog (game's update modal)
      const popup = document.querySelector(
        'section.chakra-modal__content[role="alertdialog"]',
      );
      if (!popup) return false;

      // Ensure it's not an MGTools element
      if (popup.closest(".mga-overlay, .mgh-sidebar, .mgh-dock, .mga-popout")) {
        return false;
      }

      // Check for game update text in header
      const header = popup.querySelector("header.chakra-modal__header");
      if (header && /game update available/i.test(header.textContent)) {
        updateDetected = true;
        if (typeof productionLog === "function") {
          productionLog(
            "[DOM] Game update popup detected - attempting auto-click CONTINUE button",
          );
        }

        // Find and click the CONTINUE button before reloading
        const continueBtn = popup.querySelector("button");
        if (continueBtn && /continue/i.test(continueBtn.textContent)) {
          if (typeof productionLog === "function") {
            productionLog("[DOM] Clicking CONTINUE button...");
          }
          continueBtn.click();

          // Small delay to let the click process, then trigger reload
          setTimeout(() => {
            if (typeof productionLog === "function") {
              productionLog("[DOM] CONTINUE clicked - triggering refresh");
            }
            // Trigger the same refresh logic as WebSocket code 4710
            if (typeof scheduleReload === "function") {
              scheduleReload(4710, true, "DOM detection after button click");
            }
          }, 500);
        } else {
          // Fallback: if button not found, proceed with immediate reload
          if (typeof productionLog === "function") {
            productionLog(
              "[DOM] CONTINUE button not found - proceeding with immediate refresh",
            );
          }
          // Trigger the same refresh logic as WebSocket code 4710
          if (typeof scheduleReload === "function") {
            scheduleReload(4710, true, "DOM detection");
          }
        }
        return true;
      }

      return false;
    }

    // MutationObserver to watch for popup appearance
    const observer = new MutationObserver(() => {
      if (!updateDetected) {
        checkForGameUpdatePopup();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Periodic check as backup (every 10 seconds - performance optimized)
    setInterval(checkForGameUpdatePopup, 10000);

    if (typeof productionLog === "function") {
      productionLog("✅ [DOM] Game update popup monitor initialized");
    }
  })();
})();

