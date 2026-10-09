// ==UserScript==
// @name         TypingTube アシスト＋曲ID検索
// @namespace    https://typing-tube.net/
// @version      7.1.0
// @description  チャット識別・フォロー・ブロック・オンライン表示・ドラッグ移動可能なフォロー/ブロック一覧・ライブリアクション・月間ランキング曲ID検索
// @match        https://typing-tube.net/*
// @match        https://www.typing-tube.net/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_addStyle
// @connect      raw.githubusercontent.com
// @updateURL    https://raw.githubusercontent.com/takesann55/typingtube-ranking-data/main/TypingTube_Assist_Combined.user.js
// @downloadURL  https://raw.githubusercontent.com/takesann55/typingtube-ranking-data/main/TypingTube_Assist_Combined.user.js
// @homepageURL  https://github.com/takesann55/typingtube-ranking-data
// @run-at       document-idle
// ==/UserScript==

/*
 * TypingTube本体のWebSocketは上書き・差し替えしません。
 * オンライン表示は、現在のページで確認できたチャット活動を基準にします。
 * ブロック情報は自分のTampermonkey内に保存します。
 */

GM_addStyle(String.raw`
.lobby-chat-msg-user[data-tt-user-color-id],
.le-chat-msg-user[data-tt-user-color-id],
.room-chat-msg-user[data-tt-user-color-id] {
  display: inline-block;
  box-sizing: border-box;
  margin-inline: 1px 3px;
  padding: 1px 6px;
  border: 1px solid hsl(var(--tt-user-hue) 68% 38%);
  border-radius: 999px;
  background-color: hsl(var(--tt-user-hue) 78% 86%);
  color: hsl(var(--tt-user-hue) 72% 20%) !important;
  font-weight: 700;
  line-height: 1.45;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 35%);
}
.lobby-chat-msg-user[data-tt-user-color-id]:hover,
.le-chat-msg-user[data-tt-user-color-id]:hover,
.room-chat-msg-user[data-tt-user-color-id]:hover {
  background-color: hsl(var(--tt-user-hue) 82% 79%);
}
.lobby-chat-msg-user[data-tt-following]::after,
.le-chat-msg-user[data-tt-following]::after,
.room-chat-msg-user[data-tt-following]::after {
  content: "★";
  color: #b16a00;
  text-shadow: 0 1px 0 rgb(255 255 255 / 60%);
}
.tt-user-profile-button {
  display: inline-block;
  box-sizing: border-box;
  margin-inline: 4px;
  padding: 2px 7px;
  border: 1px solid #54708f;
  border-radius: 5px;
  background: #f4f8fc;
  color: #244b73 !important;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.3;
  text-decoration: none !important;
  vertical-align: middle;
  cursor: pointer;
}
.tt-user-profile-button:hover {
  background: #dcecff;
  border-color: #315f8e;
}
.tt-user-profile-button:focus-visible {
  outline: 2px solid #1976d2;
  outline-offset: 2px;
}
.tt-reaction-quantity-controls {
  display: flex !important;
  flex-wrap: wrap;
  align-items: center;
  flex: 0 0 100%;
  box-sizing: border-box;
  width: 100%;
  gap: 8px;
  margin: 0 0 8px;
  padding: 8px 10px;
  border: 1px solid #6b7280;
  border-radius: 6px;
  background: #f4f8fc;
  color: #111827;
  font-size: 0.82rem;
}
.tt-reaction-quantity-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 700;
  white-space: nowrap;
}
.tt-reaction-quantity-input {
  box-sizing: border-box;
  width: 72px;
  padding: 4px 6px;
  border: 1px solid #6b7280;
  border-radius: 5px;
  background: #fff;
  color: #111827;
  font: inherit;
  text-align: right;
}
.tt-reaction-quantity-input:focus-visible {
  outline: 2px solid #1976d2;
  outline-offset: 1px;
}
.tt-reaction-quantity-status {
  min-width: 6em;
  color: #256029;
  font-weight: 600;
}
.tt-reaction-quantity-status.is-error {
  color: #b42318;
}
.tt-reaction-quantity-controls.is-sending {
  opacity: 0.7;
  pointer-events: none;
}
.tt-prepurchase-bulk-controls {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: 5px;
}
.tt-prepurchase-bulk-input {
  box-sizing: border-box;
  width: 72px;
  padding: 4px 6px;
  border: 1px solid #61705a;
  border-radius: 5px;
  background: #11180f;
  color: #f2f7ef;
  font: inherit;
  text-align: right;
}
.tt-prepurchase-bulk-button {
  box-sizing: border-box;
  padding: 5px 8px;
  border: 1px solid #5f843d;
  border-radius: 5px;
  background: #172611;
  color: #cfeeaf;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
}
.tt-prepurchase-bulk-button:hover {
  background: #263c1b;
}
.tt-prepurchase-bulk-input:focus-visible,
.tt-prepurchase-bulk-button:focus-visible {
  outline: 2px solid #8dcc56;
  outline-offset: 1px;
}
.tt-prepurchase-bulk-status {
  max-width: 13em;
  color: #a9dc7f;
  font-size: 0.72rem;
  font-weight: 600;
}
.tt-prepurchase-bulk-status.is-error {
  color: #ff8b82;
}
.tt-prepurchase-bulk-controls.is-sending {
  opacity: 0.65;
  pointer-events: none;
}
.tt-user-profile-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
  vertical-align: middle;
}
.tt-user-follow-button,
.tt-user-nickname-button {
  box-sizing: border-box;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.2;
  cursor: pointer;
}
.tt-user-follow-button {
  border: 1px solid #3478bd;
  background: #eaf4ff;
  color: #17578f;
}
.tt-user-follow-button:hover {
  background: #d5eaff;
}
.tt-user-follow-button.is-following {
  border-color: #9a7318;
  background: #ffedb8;
  color: #694800;
}
.tt-user-follow-button.is-following::before {
  content: "★";
}
.tt-user-nickname-button {
  border: 1px solid #6b7280;
  background: #f7f7f8;
  color: #374151;
}
.tt-user-nickname-button:hover,
.tt-user-nickname-button.has-nickname {
  background: #e8eaed;
  border-color: #4b5563;
}
.tt-user-follow-button:focus-visible,
.tt-user-nickname-button:focus-visible {
  outline: 2px solid #1976d2;
  outline-offset: 2px;
}
.lobby-chat-msg[data-tt-blocked],
.le-chat-msg[data-tt-blocked],
.room-chat-msg[data-tt-blocked] {
  display: none !important;
}
.tt-user-block-button {
  box-sizing: border-box;
  padding: 5px 10px;
  border: 1px solid #b33a3a;
  border-radius: 6px;
  background: #fff0f0;
  color: #8f2020;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.2;
  cursor: pointer;
}
.tt-user-block-button:hover {
  background: #ffe0e0;
}
.tt-user-block-button.is-blocked {
  border-color: #555;
  background: #e8e8e8;
  color: #333;
}
.tt-user-block-button:focus-visible {
  outline: 2px solid #d33;
  outline-offset: 2px;
}
.tt-user-lists-toolbar {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 2147483000;
  display: flex;
  gap: 6px;
  align-items: center;
  font-family: sans-serif;
  touch-action: none;
  user-select: none;
}
.tt-user-list-drag-handle {
  box-sizing: border-box;
  width: 28px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #777;
  border-radius: 7px;
  background: #fff;
  color: #555;
  font-size: 16px;
  cursor: grab;
  box-shadow: 0 2px 8px rgba(0,0,0,.12);
  touch-action: none;
}
.tt-user-list-drag-handle:active {
  cursor: grabbing;
}
.tt-user-list-toggle {
  box-sizing: border-box;
  padding: 7px 10px;
  border: 1px solid #777;
  border-radius: 7px;
  background: #fff;
  color: #333;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,.12);
}
.tt-user-list-toggle:hover {
  background: #f1f1f1;
}
.tt-user-list-panel {
  position: fixed;
  top: 52px;
  right: 12px;
  z-index: 2147483001;
  width: min(360px, calc(100vw - 24px));
  max-height: min(70vh, 560px);
  overflow: auto;
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid #bbb;
  border-radius: 10px;
  background: #fff;
  color: #222;
  font-family: sans-serif;
  font-size: 13px;
  box-shadow: 0 6px 24px rgba(0,0,0,.18);
  user-select: none;
}
.tt-user-list-panel[hidden] {
  display: none !important;
}
.tt-user-list-panel h3 {
  margin: 0 0 8px;
  padding: 3px 0 6px;
  font-size: 15px;
  cursor: grab;
  touch-action: none;
}
.tt-user-list-panel h3:active {
  cursor: grabbing;
}
.tt-user-list-search {
  box-sizing: border-box;
  width: 100%;
  margin: 0 0 8px;
  padding: 7px 9px;
  border: 1px solid #aaa;
  border-radius: 6px;
  background: #fff;
  color: #222;
  font: inherit;
}
.tt-user-list-search:focus-visible {
  outline: 2px solid #1976d2;
  outline-offset: 1px;
}
.tt-user-list-search-status {
  margin: 0 0 7px;
  color: #666;
  font-size: 11px;
}
.tt-user-list-empty {
  margin: 8px 0;
  color: #666;
}
.tt-user-list-item {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 0;
  border-top: 1px solid #eee;
}
.tt-user-list-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tt-user-list-name-line {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.tt-user-online-status {
  flex: none;
  font-size: 11px;
  font-weight: 700;
}
.tt-user-online-status.is-online {
  color: #16833a;
}
.tt-user-online-status.is-offline {
  color: #8a8a8a;
}
.tt-user-list-name-line > span:last-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tt-user-list-name small {
  display: block;
  color: #777;
  font-size: 11px;
}
.tt-user-list-action {
  flex: none;
  padding: 4px 7px;
  border: 1px solid #999;
  border-radius: 5px;
  background: #f8f8f8;
  cursor: pointer;
  font-size: 11px;
}
.tt-user-list-action:hover {
  background: #eaeaea;
}
@media (max-width: 700px) {
  .tt-user-profile-actions {
    display: flex;
    width: fit-content;
    margin-top: 7px;
    margin-left: 0;
  }
  .tt-reaction-quantity-controls {
    width: 100%;
    margin-top: 6px;
    margin-left: 0;
    padding-left: 0;
  }
  .tt-prepurchase-bulk-controls {
    flex-wrap: wrap;
  }
}
`);

(() => {
  "use strict";

  if (
    window.top !== window ||
    document.documentElement.hasAttribute("data-tt-assist-combined-v006")
  ) {
    return;
  }

  document.documentElement.setAttribute("data-tt-assist-combined-v006", "");

  const MESSAGE_SELECTOR = [
    ".lobby-chat-msg",
    ".le-chat-msg",
    ".room-chat-msg"
  ].join(", ");

  const USER_SELECTOR = [
    ".lobby-chat-msg-user",
    ".le-chat-msg-user",
    ".room-chat-msg-user"
  ].join(", ");

  const REPORT_SELECTOR = [
    ".chat-report-btn[data-reported-user-id]",
    ".room-chat-report-btn[data-reported-user-id]"
  ].join(", ");

  const PROFILE_BUTTON_CLASS = "tt-user-profile-button";
  const OLD_FAVORITE_BUTTON_CLASS = "tt-user-favorite-button";
  const PROFILE_ACTIONS_CLASS = "tt-user-profile-actions";
  const FOLLOW_BUTTON_CLASS = "tt-user-follow-button";
  const NICKNAME_BUTTON_CLASS = "tt-user-nickname-button";
  const BLOCK_BUTTON_CLASS = "tt-user-block-button";

  const LISTS_TOOLBAR_CLASS = "tt-user-lists-toolbar";
  const LIST_PANEL_CLASS = "tt-user-list-panel";

  const REACTION_SHOP_SELECTOR = '[data-live-event-target~="reactionShop"]';
  const REACTION_CARD_SELECTOR = ".lh-reaction-card[data-slot-id]";
  const REACTION_CONTROLS_CLASS = "tt-reaction-quantity-controls";
  const REACTION_QUANTITY_CLASS = "tt-reaction-quantity-input";
  const REACTION_STATUS_CLASS = "tt-reaction-quantity-status";
  const MAX_REACTION_QUANTITY = 10;

  const PREPURCHASE_SECTION_SELECTOR =
    ".lh-prepurchase-section[data-live-event-prepurchase-event-id-value]";
  const PREPURCHASE_ITEM_SELECTOR = ".lh-prepurchase-item";
  const PREPURCHASE_CONTROLS_CLASS = "tt-prepurchase-bulk-controls";
  const PREPURCHASE_INPUT_CLASS = "tt-prepurchase-bulk-input";
  const PREPURCHASE_BUTTON_CLASS = "tt-prepurchase-bulk-button";
  const PREPURCHASE_STATUS_CLASS = "tt-prepurchase-bulk-status";

  const PROCESSED_ATTRIBUTE = "data-tt-user-color-id";
  const ORIGINAL_NAME_ATTRIBUTE = "data-tt-original-user-name";
  const FOLLOWING_ATTRIBUTE = "data-tt-following";

  const STORAGE_KEY = "ttFollowedUsers";
  const LEGACY_STORAGE_KEY = "ttUserFavorites";
  const BLOCKED_STORAGE_KEY = "ttBlockedUsers";
  const USER_NAMES_STORAGE_KEY = "ttUserNames";
  const LISTS_TOOLBAR_POSITION_KEY = "ttUserListsToolbarPosition";
  const LIST_PANEL_POSITION_KEY = "ttUserListPanelPosition";

  let followedUsers = {};
  let blockedUsers = {};
  const knownUserNames = new Map();
  const lastSeenByUser = new Map();
  const wsOnlineUsers = new Set();
  let wsPresenceAvailable = false;
  let wsHookInstalled = false;
  let userListsPanel = null;
  let reactionRequestPending = false;
  let prepurchaseRequestPending = false;

  function colorFromUserId(userId) {
    const numericId = Number(userId);

    if (Number.isSafeInteger(numericId) && numericId >= 0) {
      return (numericId * 137.50776405003785) % 360;
    }

    let hash = 2166136261;
    for (const character of String(userId)) {
      hash ^= character.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) % 360;
  }

  function getUserState(userId) {
    const storedState = followedUsers[userId];

    return {
      following: storedState?.following === true,
      nickname: typeof storedState?.nickname === "string"
        ? storedState.nickname.trim()
        : ""
    };
  }

  function isUserBlocked(userId) {
    return blockedUsers[userId] === true;
  }

  function applyBlockState(message, userId) {
    if (!(message instanceof Element) || !userId) return;

    const blocked = isUserBlocked(userId);
    message.hidden = blocked;
    message.toggleAttribute("data-tt-blocked", blocked);

    const button = message.querySelector(`.${BLOCK_BUTTON_CLASS}`);
    if (button) {
      button.textContent = blocked ? "ブロック解除" : "ブロック";
      button.classList.toggle("is-blocked", blocked);
      button.setAttribute("aria-pressed", String(blocked));
      button.title = blocked
        ? "このユーザーのブロックを解除します"
        : "このユーザーのチャット発言を非表示にします";
    }
  }

  function getOriginalName(userName) {
    let originalName = userName.getAttribute(ORIGINAL_NAME_ATTRIBUTE);

    if (originalName === null) {
      originalName = userName.textContent.trim();
      userName.setAttribute(ORIGINAL_NAME_ATTRIBUTE, originalName);
    }

    return originalName;
  }

  function applyUserState(userName, userId) {
    const originalName = getOriginalName(userName);
    const state = getUserState(userId);

    if (state.nickname) {
      userName.textContent =
        `${originalName}/${state.nickname}${state.following ? " " : ""}`;
    } else if (state.following) {
      userName.textContent = `${originalName}/`;
    } else {
      userName.textContent = originalName;
    }

    userName.toggleAttribute(FOLLOWING_ATTRIBUTE, state.following);

    const titleLines = [
      `TypingTube上の名前: ${originalName}`,
      `ユーザーID: ${userId}`
    ];

    if (state.following) {
      titleLines.unshift("フォロー中");
    }

    if (state.nickname) {
      titleLines.splice(
        state.following ? 1 : 0,
        0,
        `独自の名前: ${state.nickname}`
      );
    }

    userName.title = titleLines.join("\n");
    userName.setAttribute(
      "aria-label",
      `${originalName}` +
      `${state.nickname ? `、独自の名前は${state.nickname}` : ""}` +
      `${state.following ? "、フォロー中" : ""}、ユーザーID ${userId}`
    );
  }

  function rememberUserName(userId, userNameElement) {
    if (!userId || !(userNameElement instanceof Element)) return;

    const originalName = getOriginalName(userNameElement).trim();
    if (!originalName) return;

    const key = String(userId);
    knownUserNames.set(key, originalName);

    try {
      const savedNames = GM_getValue(USER_NAMES_STORAGE_KEY, {});
      if (savedNames[key] !== originalName) {
        GM_setValue(USER_NAMES_STORAGE_KEY, {
          ...(savedNames && typeof savedNames === "object" ? savedNames : {}),
          [key]: originalName
        });
      }
    } catch (error) {
      console.warn("TypingTubeのユーザー名を保存できませんでした。", error);
    }
  }

  function markUserOnline(userId) {
    if (!userId) return;
    lastSeenByUser.set(String(userId), Date.now());
    renderUserLists();
  }

  function isUserOnline(userId) {
    const key = String(userId);
    if (wsPresenceAvailable) return wsOnlineUsers.has(key);

    const lastSeen = lastSeenByUser.get(key);
    return Number.isFinite(lastSeen) &&
      Date.now() - lastSeen <= 5 * 60 * 1000;
  }

  function getOnlineSortKey(userId) {
    const lastSeen = lastSeenByUser.get(String(userId));
    return Number.isFinite(lastSeen) ? lastSeen : 0;
  }

  function getKnownUserName(userId) {
    return knownUserNames.get(String(userId)) || `ユーザーID ${userId}`;
  }

  function normalizeWsUserId(value) {
    if (value == null) return null;

    if (
      typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value >= 0
    ) {
      return String(value);
    }

    if (typeof value === "string" && /^\d+$/.test(value.trim())) {
      return value.trim();
    }

    return null;
  }

  function collectWsUserIds(value, output = new Set()) {
    if (value == null) return output;

    if (Array.isArray(value)) {
      value.forEach(item => collectWsUserIds(item, output));
      return output;
    }

    if (typeof value !== "object") return output;

    const directKeys = [
      "userId",
      "user_id",
      "userid",
      "uid",
      "memberId",
      "member_id",
      "playerId",
      "player_id"
    ];

    for (const key of directKeys) {
      const id = normalizeWsUserId(value[key]);
      if (id) output.add(id);
    }

    for (const key of Object.keys(value)) {
      if (/^\d+$/.test(key) && value[key] === true) {
        output.add(key);
      }
    }

    const collectionKeys = [
      "users",
      "online",
      "onlineUsers",
      "online_users",
      "participants",
      "members",
      "players",
      "userList",
      "user_list"
    ];

    for (const [key, child] of Object.entries(value)) {
      if (collectionKeys.includes(key)) {
        collectWsUserIds(child, output);
      }
    }

    return output;
  }

  function classifyPresenceEvent(root) {
    if (!root || typeof root !== "object") return null;

    const text = JSON.stringify(root).toLowerCase();
    const typeText = [
      root.type,
      root.event,
      root.action,
      root.kind,
      root.name,
      root.topic
    ]
      .filter(value => typeof value === "string")
      .join(" ")
      .toLowerCase();

    const hasPresenceWord =
      /presence|online|offline|connect|disconnect|join|leave|member|participant/
        .test(typeText);

    if (
      !hasPresenceWord &&
      !/("online"|"offline"|"onlineusers"|"online_users"|"participants"|"members")/
        .test(text)
    ) {
      return null;
    }

    const ids = collectWsUserIds(root);
    if (!ids.size) return null;

    const isOffline =
      /offline|disconnect|disconnected|leave|left|removed/.test(typeText);

    const isSnapshot =
      /snapshot|onlineusers|online_users|participants|members|userlist|user_list/
        .test(typeText) ||
      Object.prototype.hasOwnProperty.call(root, "online") ||
      Object.prototype.hasOwnProperty.call(root, "onlineUsers") ||
      Object.prototype.hasOwnProperty.call(root, "online_users");

    return {
      ids,
      isOffline,
      isSnapshot
    };
  }

  function handleWebSocketPayload(raw) {
    if (typeof raw !== "string" || !raw.trim()) return;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      return;
    }

    const candidates = Array.isArray(parsed) ? parsed : [parsed];
    let changed = false;

    for (const root of candidates) {
      const event = classifyPresenceEvent(root);
      if (!event) continue;

      wsPresenceAvailable = true;

      if (event.isSnapshot) {
        wsOnlineUsers.clear();
      }

      for (const id of event.ids) {
        if (event.isOffline) {
          if (wsOnlineUsers.delete(id)) changed = true;
        } else if (!wsOnlineUsers.has(id)) {
          wsOnlineUsers.add(id);
          changed = true;
        }
      }
    }

    if (changed || wsPresenceAvailable) {
      renderUserLists();
    }
  }

  function installWebSocketMonitor() {
    window.addEventListener("message", event => {
      if (
        event.source !== window ||
        !event.data ||
        event.data.source !== "TT_WS_MONITOR"
      ) {
        return;
      }

      if (event.data.kind === "hook_installed") {
        wsHookInstalled = event.data.payload?.ok === true;
        renderUserLists();
        return;
      }

      if (event.data.kind === "message") {
        handleWebSocketPayload(event.data.payload?.data);
      }
    });
  }

  function normalizeUserSearch(value) {
    return String(value ?? "")
      .normalize("NFKC")
      .toLocaleLowerCase("ja-JP")
      .trim();
  }

  function getUserListIds(mode) {
    return mode === "follow"
      ? Object.entries(followedUsers)
          .filter(([, state]) => state?.following === true)
          .map(([userId]) => userId)
      : Object.keys(blockedUsers);
  }

  function filterUserListIds(ids, query) {
    const normalizedQuery = normalizeUserSearch(query);
    if (!normalizedQuery) return ids;

    return ids.filter((userId) => {
      const name = getKnownUserName(userId);

      return normalizeUserSearch(name).includes(normalizedQuery) ||
        String(userId).includes(normalizedQuery);
    });
  }

  function createUserListItem(userId, type) {
    const item = document.createElement("div");
    item.className = "tt-user-list-item";

    const name = document.createElement("div");
    name.className = "tt-user-list-name";

    const nameLine = document.createElement("div");
    nameLine.className = "tt-user-list-name-line";

    const status = document.createElement("span");
    status.className = isUserOnline(userId)
      ? "tt-user-online-status is-online"
      : "tt-user-online-status is-offline";

    status.textContent = isUserOnline(userId)
      ? "● オンライン"
      : "● オフライン";

    status.title = wsPresenceAvailable
      ? "TypingTubeのWebSocket通信からオンライン状態を判定しています"
      : (
          isUserOnline(userId)
            ? "WebSocketのオンライン情報が見つかるまで、5分以内の発言を基準にしています"
            : "WebSocketのオンライン情報が見つかるまで、5分以内の発言を確認できていません"
        );

    const displayName = document.createElement("span");
    displayName.textContent = getKnownUserName(userId);
    nameLine.append(status, displayName);

    const id = document.createElement("small");
    id.textContent = `ID: ${userId}`;
    name.append(nameLine, id);

    const profile = document.createElement("a");
    profile.className = "tt-user-list-action";
    profile.href = `/user/${encodeURIComponent(userId)}`;
    profile.target = "_blank";
    profile.rel = "noopener noreferrer";
    profile.textContent = "プロフィール";

    const action = document.createElement("button");
    action.type = "button";
    action.className = "tt-user-list-action";
    action.textContent = "解除";

    if (type === "follow") {
      action.title = "フォローを解除";
      action.addEventListener("click", async () => {
        await toggleFollow(userId);
        renderUserLists();
      });
    } else {
      action.title = "ブロックを解除";
      action.addEventListener("click", async () => {
        await toggleBlock(userId);
        renderUserLists();
      });
    }

    item.append(name, profile, action);
    return item;
  }

  function renderUserLists() {
    if (!userListsPanel) return;

    const mode = userListsPanel.dataset.mode || "follow";
    const title = userListsPanel.querySelector(".tt-user-list-title");
    const body = userListsPanel.querySelector(".tt-user-list-body");
    const search = userListsPanel.querySelector(".tt-user-list-search");
    const searchStatus =
      userListsPanel.querySelector(".tt-user-list-search-status");

    if (!title || !body) return;

    const query = search?.value || "";
    const allIds = getUserListIds(mode);
    const ids = filterUserListIds(allIds, query);
    const titleText = title.querySelector(".tt-user-list-title-text");

    if (titleText) {
      titleText.textContent = mode === "follow"
        ? "フォローしている人"
        : "ブロックしている人";
    }

    if (searchStatus) {
      searchStatus.textContent = query.trim()
        ? `${ids.length}人 / ${allIds.length}人`
        : `${allIds.length}人`;
    }

    body.replaceChildren();

    ids.sort((a, b) => {
      const aOnline = isUserOnline(a);
      const bOnline = isUserOnline(b);

      if (aOnline !== bOnline) {
        return aOnline ? -1 : 1;
      }

      const aSeen = getOnlineSortKey(a);
      const bSeen = getOnlineSortKey(b);

      if (aSeen !== bSeen) {
        return bSeen - aSeen;
      }

      return getKnownUserName(a).localeCompare(getKnownUserName(b), "ja");
    });

    if (allIds.length === 0) {
      const empty = document.createElement("p");
      empty.className = "tt-user-list-empty";
      empty.textContent = mode === "follow"
        ? "フォローしている人はいません。"
        : "ブロックしている人はいません。";
      body.append(empty);
      return;
    }

    if (ids.length === 0) {
      const empty = document.createElement("p");
      empty.className = "tt-user-list-empty";
      empty.textContent = `「${query}」に一致するユーザーはいません。`;
      body.append(empty);
      return;
    }

    ids.forEach((userId) => {
      body.append(createUserListItem(userId, mode));
    });
  }

  function openUserList(mode) {
    if (!userListsPanel) return;

    userListsPanel.dataset.mode = mode;
    userListsPanel.hidden = false;
    userListsPanel.style.removeProperty("display");

    const search = userListsPanel.querySelector(".tt-user-list-search");
    if (search) search.value = "";

    renderUserLists();
  }

  function readStoredPosition(key) {
    try {
      const value = GM_getValue(key, null);

      if (
        value &&
        Number.isFinite(Number(value.left)) &&
        Number.isFinite(Number(value.top))
      ) {
        return {
          left: Number(value.left),
          top: Number(value.top)
        };
      }
    } catch (_) {
    }

    return null;
  }

  function clampPosition(element, left, top) {
    const rect = element.getBoundingClientRect();
    const maxLeft = Math.max(0, window.innerWidth - rect.width);
    const maxTop = Math.max(0, window.innerHeight - rect.height);

    return {
      left: Math.min(Math.max(0, left), maxLeft),
      top: Math.min(Math.max(0, top), maxTop)
    };
  }

  function setElementPosition(element, position) {
    if (!element) return;

    const safe = clampPosition(
      element,
      Number(position.left),
      Number(position.top)
    );

    element.style.left = `${safe.left}px`;
    element.style.top = `${safe.top}px`;
    element.style.right = "auto";
    element.style.bottom = "auto";
  }

  function saveElementPosition(key, element) {
    if (!element) return;

    const rect = element.getBoundingClientRect();

    try {
      GM_setValue(key, {
        left: Math.round(rect.left),
        top: Math.round(rect.top)
      });
    } catch (_) {
    }
  }

  function makeDraggable(element, handle, storageKey) {
    if (!element || !handle || handle.dataset.ttDraggable === "1") return;

    handle.dataset.ttDraggable = "1";

    const stored = readStoredPosition(storageKey);
    if (stored) setElementPosition(element, stored);

    let dragging = false;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    const onPointerMove = (event) => {
      if (!dragging || event.pointerId !== pointerId) return;

      event.preventDefault();

      const next = clampPosition(
        element,
        startLeft + event.clientX - startX,
        startTop + event.clientY - startY
      );

      element.style.left = `${next.left}px`;
      element.style.top = `${next.top}px`;
      element.style.right = "auto";
      element.style.bottom = "auto";
    };

    const stop = (event) => {
      if (
        !dragging ||
        (event && event.pointerId !== pointerId)
      ) {
        return;
      }

      dragging = false;

      try {
        handle.releasePointerCapture(pointerId);
      } catch (_) {
      }

      document.removeEventListener("pointermove", onPointerMove, true);
      document.removeEventListener("pointerup", stop, true);
      document.removeEventListener("pointercancel", stop, true);

      saveElementPosition(storageKey, element);
      pointerId = null;
    };

    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 && event.pointerType !== "touch") return;

      dragging = true;
      pointerId = event.pointerId;

      const rect = element.getBoundingClientRect();
      startX = event.clientX;
      startY = event.clientY;
      startLeft = rect.left;
      startTop = rect.top;

      try {
        handle.setPointerCapture(pointerId);
      } catch (_) {
      }

      document.addEventListener("pointermove", onPointerMove, true);
      document.addEventListener("pointerup", stop, true);
      document.addEventListener("pointercancel", stop, true);

      event.preventDefault();
      event.stopPropagation();
    });
  }

  function createUserListsToolbar() {
    if (document.querySelector(`.${LISTS_TOOLBAR_CLASS}`)) {
      userListsPanel = document.querySelector(`.${LIST_PANEL_CLASS}`);
      return;
    }

    const toolbar = document.createElement("div");
    toolbar.className = LISTS_TOOLBAR_CLASS;

    const dragHandle = document.createElement("button");
    dragHandle.type = "button";
    dragHandle.className = "tt-user-list-drag-handle";
    dragHandle.textContent = "⠿";
    dragHandle.title = "ここをドラッグして一覧ボタンを移動";
    dragHandle.setAttribute("aria-label", "一覧ボタンを移動");

    const followButton = document.createElement("button");
    followButton.type = "button";
    followButton.className = "tt-user-list-toggle";
    followButton.textContent = "★ フォロー一覧";
    followButton.addEventListener("click", () => openUserList("follow"));

    const blockButton = document.createElement("button");
    blockButton.type = "button";
    blockButton.className = "tt-user-list-toggle";
    blockButton.textContent = "🚫 ブロック一覧";
    blockButton.addEventListener("click", () => openUserList("block"));

    toolbar.append(dragHandle, followButton, blockButton);
    document.body.append(toolbar);

    const panel = document.createElement("div");
    panel.className = LIST_PANEL_CLASS;
    panel.hidden = true;
    panel.dataset.mode = "follow";

    const title = document.createElement("h3");
    title.className = "tt-user-list-title";

    const titleText = document.createElement("span");
    titleText.className = "tt-user-list-title-text";
    titleText.textContent = "フォローしている人";

    const titleDrag = document.createElement("span");
    titleDrag.className = "tt-user-list-title-drag";
    titleDrag.textContent = "⠿";
    titleDrag.title = "ここをドラッグして一覧を移動";
    titleDrag.style.cssText =
      "float:left; margin-right:8px; cursor:grab; user-select:none; touch-action:none;";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "tt-user-list-action";
    closeButton.textContent = "閉じる";
    closeButton.style.float = "right";

    closeButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      panel.hidden = true;
      panel.style.setProperty("display", "none", "important");
    });

    title.append(titleDrag, titleText, closeButton);

    const searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.className = "tt-user-list-search";
    searchInput.placeholder = "ユーザー名で検索";
    searchInput.autocomplete = "off";
    searchInput.spellcheck = false;
    searchInput.setAttribute("aria-label", "ユーザー名で検索");

    searchInput.addEventListener("input", () => renderUserLists());

    const searchStatus = document.createElement("div");
    searchStatus.className = "tt-user-list-search-status";
    searchStatus.setAttribute("aria-live", "polite");

    const body = document.createElement("div");
    body.className = "tt-user-list-body";

    panel.append(title, searchInput, searchStatus, body);
    document.body.append(panel);
    userListsPanel = panel;

    makeDraggable(toolbar, dragHandle, LISTS_TOOLBAR_POSITION_KEY);
    makeDraggable(panel, titleDrag, LIST_PANEL_POSITION_KEY);

    window.addEventListener("resize", () => {
      if (toolbar.isConnected) {
        setElementPosition(toolbar, {
          left: toolbar.getBoundingClientRect().left,
          top: toolbar.getBoundingClientRect().top
        });
      }

      if (panel.isConnected && !panel.hidden) {
        setElementPosition(panel, {
          left: panel.getBoundingClientRect().left,
          top: panel.getBoundingClientRect().top
        });
      }
    });

    renderUserLists();
  }

  function getProfileUserId() {
    const match = location.pathname.match(/^\/user\/(\d+)\/?$/);
    return match ? match[1] : null;
  }

  function getProfileUserName(profileUsername) {
    const directText = Array.from(profileUsername.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent.trim())
      .filter(Boolean)
      .join(" ");

    return directText || "このユーザー";
  }

  function updateProfileActions(actions, userId) {
    const state = getUserState(userId);
    const followButton = actions.querySelector(`.${FOLLOW_BUTTON_CLASS}`);
    const nicknameButton = actions.querySelector(`.${NICKNAME_BUTTON_CLASS}`);
    const blockButton = actions.querySelector(`.${BLOCK_BUTTON_CLASS}`);

    if (followButton) {
      followButton.textContent = state.following ? "フォロー中" : "フォロー";
      followButton.classList.toggle("is-following", state.following);
      followButton.setAttribute("aria-pressed", String(state.following));
      followButton.title = state.following
        ? "フォローを解除します"
        : "ユーザーをフォローします(★マークで強調)";
    }

    if (nicknameButton) {
      nicknameButton.textContent = state.nickname
        ? "独自の名前を変更"
        : "独自の名前を設定";
      nicknameButton.classList.toggle("has-nickname", Boolean(state.nickname));
      nicknameButton.title = state.nickname
        ? `現在の独自名: ${state.nickname}（空欄で解除）`
        : "自分のブラウザ内だけで表示する名前を設定";
    }

    if (blockButton) {
      const blocked = isUserBlocked(userId);
      blockButton.textContent = blocked ? "ブロック解除" : "ブロック";
      blockButton.classList.toggle("is-blocked", blocked);
      blockButton.setAttribute("aria-pressed", String(blocked));
      blockButton.title = blocked
        ? "このユーザーのブロックを解除します"
        : "このユーザーのチャット発言を非表示にします";
    }
  }

  function refreshUser(userId) {
    document.querySelectorAll(`[${PROCESSED_ATTRIBUTE}]`).forEach((userName) => {
      if (userName.getAttribute(PROCESSED_ATTRIBUTE) === userId) {
        applyUserState(userName, userId);
        const message = userName.closest(MESSAGE_SELECTOR);
        if (message) applyBlockState(message, userId);
      }
    });

    document.querySelectorAll(`.${PROFILE_ACTIONS_CLASS}`).forEach((actions) => {
      if (actions.dataset.userId === userId) {
        updateProfileActions(actions, userId);
      }
    });
  }

  function refreshAllUsers() {
    document.querySelectorAll(`[${PROCESSED_ATTRIBUTE}]`).forEach((userName) => {
      const userId = userName.getAttribute(PROCESSED_ATTRIBUTE);

      if (userId) {
        applyUserState(userName, userId);
        const message = userName.closest(MESSAGE_SELECTOR);
        if (message) applyBlockState(message, userId);
      }
    });

    document.querySelectorAll(`.${PROFILE_ACTIONS_CLASS}`).forEach((actions) => {
      if (actions.dataset.userId) {
        updateProfileActions(actions, actions.dataset.userId);
      }
    });

    renderUserLists();
  }

  async function saveUserState(userId, nextState) {
    const updatedUsers = { ...followedUsers };
    const normalizedState = {
      following: nextState.following === true,
      nickname: typeof nextState.nickname === "string"
        ? nextState.nickname.trim()
        : "",
      updatedAt: new Date().toISOString()
    };

    if (!normalizedState.following && !normalizedState.nickname) {
      delete updatedUsers[userId];
    } else {
      updatedUsers[userId] = normalizedState;
    }

    await GM_setValue(STORAGE_KEY, updatedUsers);
    followedUsers = updatedUsers;
    refreshUser(userId);
    renderUserLists();
  }

  async function toggleFollow(userId) {
    const state = getUserState(userId);

    try {
      await saveUserState(userId, {
        following: !state.following,
        nickname: state.nickname
      });
    } catch (error) {
      console.error("TypingTubeのフォロー情報を保存できませんでした。", error);
      window.alert(
        "フォロー情報を保存できませんでした。拡張機能を再読み込みして、もう一度お試しください。"
      );
    }
  }

  async function editNickname(userId, typingTubeName) {
    const state = getUserState(userId);

    const input = window.prompt(
      [
        "このユーザーの新しい名前を入力してください。",
        "空欄でも大丈夫です。",
        "フォロー状態には影響しません。",
        "",
        `TypingTube上の名前: ${typingTubeName}`,
        `ユーザーID: ${userId}`
      ].join("\n"),
      state.nickname
    );

    if (input === null) return;

    const nickname = input.trim();

    if (Array.from(nickname).length > 20) {
      window.alert("独自の名前は20文字以内にしてください。");
      return;
    }

    try {
      await saveUserState(userId, {
        following: state.following,
        nickname
      });
    } catch (error) {
      console.error("TypingTubeの独自名を保存できませんでした。", error);
      window.alert(
        "独自の名前を保存できませんでした。拡張機能を再読み込みしてください"
      );
    }
  }

  async function toggleBlock(userId) {
    if (!/^\d+$/.test(String(userId))) return;

    const nextBlocked = !isUserBlocked(userId);
    const updatedBlocks = { ...blockedUsers };

    if (nextBlocked) {
      updatedBlocks[userId] = true;
    } else {
      delete updatedBlocks[userId];
    }

    try {
      await GM_setValue(BLOCKED_STORAGE_KEY, updatedBlocks);
      blockedUsers = updatedBlocks;
      refreshUser(userId);
      renderUserLists();
    } catch (error) {
      console.error("TypingTubeのブロック情報を保存できませんでした。", error);
      window.alert(
        "ブロック情報を保存できませんでした。拡張機能を再読み込みして、もう一度お試しください。"
      );
    }
  }

  function decorateProfilePage() {
    const userId = getProfileUserId();
    const profileUsername =
      document.querySelector(".profile-header .profile-username");

    if (!userId || !profileUsername) return;

    let actions = profileUsername.querySelector(`.${PROFILE_ACTIONS_CLASS}`);

    if (actions && actions.dataset.userId !== userId) {
      actions.remove();
      actions = null;
    }

    if (!actions) {
      const typingTubeName = getProfileUserName(profileUsername);
      rememberUserName(userId, profileUsername);

      actions = document.createElement("span");
      actions.className = PROFILE_ACTIONS_CLASS;
      actions.dataset.userId = userId;

      const followButton = document.createElement("button");
      followButton.type = "button";
      followButton.className = FOLLOW_BUTTON_CLASS;
      followButton.addEventListener("click", () => toggleFollow(userId));

      const nicknameButton = document.createElement("button");
      nicknameButton.type = "button";
      nicknameButton.className = NICKNAME_BUTTON_CLASS;
      nicknameButton.addEventListener(
        "click",
        () => editNickname(userId, typingTubeName)
      );

      const blockButton = document.createElement("button");
      blockButton.type = "button";
      blockButton.className = BLOCK_BUTTON_CLASS;
      blockButton.addEventListener("click", () => toggleBlock(userId));

      actions.append(followButton, nicknameButton, blockButton);

      const ratingBadge = profileUsername.querySelector(".battle-rating-badge");
      if (ratingBadge) {
        ratingBadge.insertAdjacentElement("afterend", actions);
      } else {
        profileUsername.append(actions);
      }
    }

    updateProfileActions(actions, userId);
  }

  function decorateMessage(message) {
    if (!(message instanceof Element) || !message.matches(MESSAGE_SELECTOR)) {
      return;
    }

    const userName = message.querySelector(USER_SELECTOR);
    const reportButton = message.querySelector(REPORT_SELECTOR);
    const userId = reportButton?.dataset.reportedUserId?.trim();

    message.querySelectorAll(`.${OLD_FAVORITE_BUTTON_CLASS}`)
      .forEach((button) => button.remove());

    if (!userName || !reportButton || !userId) return;

    let profileButton = message.querySelector(`.${PROFILE_BUTTON_CLASS}`);

    if (!profileButton) {
      profileButton = document.createElement("a");
      profileButton.className = PROFILE_BUTTON_CLASS;
      profileButton.textContent = "プロフィール";
      profileButton.target = "_blank";
      profileButton.rel = "noopener noreferrer";
      profileButton.setAttribute("role", "button");
      reportButton.insertAdjacentElement("afterend", profileButton);
    }

    profileButton.href = `/user/${encodeURIComponent(userId)}`;
    profileButton.title = `ユーザーID ${userId} のプロフィールを開く`;

    let blockButton = message.querySelector(`.${BLOCK_BUTTON_CLASS}`);

    if (!blockButton) {
      blockButton = document.createElement("button");
      blockButton.type = "button";
      blockButton.className = BLOCK_BUTTON_CLASS;
      blockButton.addEventListener("click", () => toggleBlock(userId));
      profileButton.insertAdjacentElement("afterend", blockButton);
    }

    blockButton.dataset.userId = userId;

    if (userName.getAttribute(PROCESSED_ATTRIBUTE) !== userId) {
      const hue = colorFromUserId(userId);
      userName.style.setProperty("--tt-user-hue", hue.toFixed(2));
      userName.setAttribute(PROCESSED_ATTRIBUTE, userId);
      getOriginalName(userName);
    }

    rememberUserName(userId, userName);
    markUserOnline(userId);
    applyUserState(userName, userId);
    applyBlockState(message, userId);

    blockButton.textContent = isUserBlocked(userId)
      ? "ブロック解除"
      : "ブロック";
    blockButton.classList.toggle("is-blocked", isUserBlocked(userId));
    blockButton.setAttribute("aria-pressed", String(isUserBlocked(userId)));
    blockButton.title = isUserBlocked(userId)
      ? "このユーザーのブロックを解除します"
      : "このユーザーのチャット発言を非表示にします";

    profileButton.setAttribute(
      "aria-label",
      `${getOriginalName(userName)}のプロフィールを開く`
    );
  }

  function decorateMessagesInside(root) {
    if (!(root instanceof Element || root instanceof Document)) return;

    if (root instanceof Element && root.matches(MESSAGE_SELECTOR)) {
      decorateMessage(root);
    }

    root.querySelectorAll(MESSAGE_SELECTOR).forEach(decorateMessage);
  }

  function getLiveEventId() {
    const match = location.pathname.match(/\/live_events\/(\d+)(?:\/|$)/);
    return match ? match[1] : null;
  }

  function readReactionQuantity(input) {
    const quantity = Number(input.value);

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_REACTION_QUANTITY
    ) {
      window.alert(
        `個数は1～${MAX_REACTION_QUANTITY}の整数で指定してください。`
      );
      input.focus();
      return null;
    }

    return quantity;
  }

  function setReactionStatus(controls, text, isError = false) {
    const status = controls.querySelector(`.${REACTION_STATUS_CLASS}`);
    if (!status) return;

    status.textContent = text;
    status.classList.toggle("is-error", isError);
  }

  function decorateReactionShop(shop) {
    if (
      !(shop instanceof Element) ||
      shop.querySelector(`.${REACTION_CONTROLS_CLASS}`)
    ) {
      return;
    }

    const controls = document.createElement("div");
    controls.className = REACTION_CONTROLS_CLASS;

    const label = document.createElement("label");
    label.className = "tt-reaction-quantity-label";
    label.textContent = "まとめて購入 ";

    const input = document.createElement("input");
    input.type = "number";
    input.className = REACTION_QUANTITY_CLASS;
    input.min = "1";
    input.max = String(MAX_REACTION_QUANTITY);
    input.step = "1";
    input.value = "1";
    input.inputMode = "numeric";
    input.setAttribute("aria-label", "まとめて購入するリアクションの個数");
    input.title = "1個の場合はTypingTube標準の通信方法を使用します";

    const unit = document.createElement("span");
    unit.textContent = "個";

    const status = document.createElement("span");
    status.className = REACTION_STATUS_CLASS;
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    label.append(input, unit);

    const hint = document.createElement("span");
    hint.textContent =
      `1～${MAX_REACTION_QUANTITY}個。個数を指定してアイテムをクリック`;
    hint.style.cssText = "font-size:0.75rem;color:#4b5563;";

    controls.append(label, hint, status);
    shop.prepend(controls);
  }

  function decorateReactionShopsInside(root) {
    if (!(root instanceof Element || root instanceof Document)) return;

    if (root instanceof Element) {
      const shop = root.closest(REACTION_SHOP_SELECTOR);
      if (shop) decorateReactionShop(shop);
    }

    root.querySelectorAll(REACTION_SHOP_SELECTOR)
      .forEach(decorateReactionShop);
  }

  async function sendBulkReaction(card, controls, quantity) {
    if (reactionRequestPending) {
      setReactionStatus(controls, "送信中です。", true);
      return;
    }

    const eventId = getLiveEventId();
    const slotId = card.dataset.slotId?.trim();
    const slotCost = Number(card.dataset.slotCost);
    const csrfToken =
      document.querySelector('meta[name="csrf-token"]')?.content;

    if (!eventId || !slotId) {
      window.alert("ライブイベント、リアクションIDを取得できませんでした。");
      return;
    }

    if (!csrfToken) {
      window.alert("送信用のCSRFトークンを取得できませんでした。");
      return;
    }

    const totalCost = Number.isFinite(slotCost)
      ? slotCost * quantity
      : null;
    const costText = totalCost === null ? "" : `\n必要Beat: ${totalCost}`;

    const confirmed = window.confirm(
      `このリアクションを${quantity}個まとめて購入しますか？${costText}` +
      "\n\n複数購入リクエストは1回だけ送信されます。"
    );

    if (!confirmed) return;

    reactionRequestPending = true;
    controls.classList.add("is-sending");
    setReactionStatus(controls, `${quantity}個を送信中…`);

    try {
      const response = await fetch(
        `/api/live_events/${encodeURIComponent(eventId)}/reactions`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken
          },
          body: JSON.stringify({
            slot_id: slotId,
            quantity
          })
        }
      );

      let responseData = null;
      try {
        responseData = await response.json();
      } catch (_error) {
      }

      if (!response.ok) {
        const message =
          responseData?.error ||
          responseData?.message ||
          `${response.status} ${response.statusText}`;
        throw new Error(message);
      }

      setReactionStatus(controls, `${quantity}個の購入が受理されました。`);
    } catch (error) {
      console.error("リアクションのまとめて購入に失敗しました。", error);
      setReactionStatus(controls, "送信に失敗しました。", true);
      window.alert(
        `リアクションを購入できませんでした。\n${error.message || error}`
      );
    } finally {
      reactionRequestPending = false;
      controls.classList.remove("is-sending");
    }
  }

  function startReactionQuantityHandler() {
    document.addEventListener("click", (event) => {
      const card = event.target.closest?.(REACTION_CARD_SELECTOR);
      if (!card) return;

      const shop = card.closest(REACTION_SHOP_SELECTOR);
      const controls = shop?.querySelector(`.${REACTION_CONTROLS_CLASS}`);
      const input = controls?.querySelector(`.${REACTION_QUANTITY_CLASS}`);

      if (!controls || !input) return;

      const quantity = readReactionQuantity(input);

      if (quantity === null) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      if (quantity === 1) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      void sendBulkReaction(card, controls, quantity);
    }, true);
  }

  function getPrepurchaseQuantity(item) {
    const text =
      item.querySelector(".lh-prepurchase-item-qty")?.textContent || "";
    const match = text.match(/(\d+)/);
    return match ? Number(match[1]) : 0;
  }

  function getPrepurchaseUnitCost(section, slotId) {
    const card = Array.from(
      section.querySelectorAll(
        ".lh-reaction-card[data-slot-id][data-slot-cost]"
      )
    ).find((candidate) => candidate.dataset.slotId === slotId);

    const cost = Number(card?.dataset.slotCost);
    return Number.isFinite(cost) && cost >= 0 ? cost : null;
  }

  function setPrepurchaseStatus(controls, text, isError = false) {
    const status = controls.querySelector(`.${PREPURCHASE_STATUS_CLASS}`);
    if (!status) return;

    status.textContent = text;
    status.classList.toggle("is-error", isError);
  }

  function readPrepurchaseAddQuantity(input) {
    const quantity = Number(input.value);

    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      window.alert("追加数は1以上の整数で指定してください。");
      input.focus();
      return null;
    }

    return quantity;
  }

  function syncPrepurchaseDisplay(
    section,
    responseData,
    slotId,
    previousQuantity,
    unitCost
  ) {
    if (!responseData || !Array.isArray(responseData.prepurchases)) {
      return false;
    }

    const activePurchases = responseData.prepurchases.filter(
      (purchase) => purchase?.active !== false
    );
    const updated = activePurchases.find(
      (purchase) => String(purchase.slot_id) === slotId
    );

    if (!updated || !Number.isSafeInteger(Number(updated.quantity))) {
      return false;
    }

    const plusButton = Array.from(
      section.querySelectorAll(".lh-prepurchase-plus[data-slot-id]")
    ).find((button) => button.dataset.slotId === slotId);

    const item = plusButton?.closest(PREPURCHASE_ITEM_SELECTOR);
    const newQuantity = Number(updated.quantity);

    if (item) {
      const quantityDisplay =
        item.querySelector(".lh-prepurchase-item-qty");
      const costDisplay =
        item.querySelector(".lh-prepurchase-item-cost");
      const removeButton =
        item.querySelector(".lh-prepurchase-remove");

      if (quantityDisplay) {
        quantityDisplay.textContent = `×${newQuantity}`;
      }

      if (
        costDisplay &&
        Number.isFinite(Number(updated.beat_cost_total))
      ) {
        costDisplay.innerHTML =
          `<i class="bi bi-coin"></i> ${Number(updated.beat_cost_total)}`;
      }

      if (removeButton) {
        removeButton.dataset.quantity = String(newQuantity);

        if (Number.isFinite(Number(updated.beat_cost_total))) {
          removeButton.dataset.refund =
            String(Number(updated.beat_cost_total));
        }
      }
    }

    const mineCount = section.querySelector(
      '[data-live-event-prepurchase-target="mineCount"]'
    );

    if (mineCount) {
      mineCount.textContent = `(${activePurchases.length})`;
    }

    const addedQuantity = Math.max(0, newQuantity - previousQuantity);
    const balanceDisplay = section.querySelector(
      '[data-live-event-prepurchase-target="balance"]'
    );
    const currentBalance = Number(
      balanceDisplay?.textContent.replace(/[^0-9-]/g, "")
    );

    if (
      balanceDisplay &&
      unitCost !== null &&
      Number.isFinite(currentBalance)
    ) {
      const nextBalance = Math.max(
        0,
        currentBalance - addedQuantity * unitCost
      );
      balanceDisplay.textContent = String(nextBalance);
      section.dataset.liveEventPrepurchaseBeatBalanceValue =
        String(nextBalance);
    }

    return true;
  }

  async function addPrepurchaseQuantity(item, controls, quantity) {
    if (prepurchaseRequestPending) {
      setPrepurchaseStatus(
        controls,
        "※別の事前購入を送信中です。",
        true
      );
      return;
    }

    const section = item.closest(PREPURCHASE_SECTION_SELECTOR);
    const plusButton =
      item.querySelector(".lh-prepurchase-plus[data-slot-id]");
    const eventId =
      section?.dataset.liveEventPrepurchaseEventIdValue?.trim();
    const slotId = plusButton?.dataset.slotId?.trim();
    const csrfToken =
      document.querySelector('meta[name="csrf-token"]')?.content;

    if (!section || !eventId || !slotId) {
      window.alert("イベントID、リアクションIDを取得できませんでした。");
      return;
    }

    if (!csrfToken) {
      window.alert("送信用のCSRFトークンを取得できませんでした。");
      return;
    }

    const previousQuantity = getPrepurchaseQuantity(item);
    const unitCost = getPrepurchaseUnitCost(section, slotId);
    const costText = unitCost === null
      ? ""
      : `\n必要Beat: ${unitCost * quantity}`;

    const confirmed = window.confirm(
      `この事前リアクションを${quantity}個追加しますか？${costText}` +
      "\n\nまとめて購入リクエストは1回だけ送信します。"
    );

    if (!confirmed) return;

    prepurchaseRequestPending = true;
    controls.classList.add("is-sending");
    setPrepurchaseStatus(controls, `${quantity}個を追加中…`);

    const endpoint =
      `/api/live_events/${encodeURIComponent(eventId)}/prepurchases`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken
        },
        body: JSON.stringify({
          slot_id: slotId,
          quantity
        })
      });

      let responseData = null;
      try {
        responseData = await response.json();
      } catch (_error) {
      }

      if (!response.ok) {
        const message =
          responseData?.error ||
          responseData?.message ||
          `${response.status} ${response.statusText}`;
        throw new Error(message);
      }

      const refreshResponse = await fetch(endpoint, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      });

      if (refreshResponse.ok) {
        responseData = await refreshResponse.json();
      }

      const synced = syncPrepurchaseDisplay(
        section,
        responseData,
        slotId,
        previousQuantity,
        unitCost
      );

      const actual = responseData?.prepurchases?.find(
        (purchase) => String(purchase.slot_id) === slotId
      );
      const added = actual
        ? Math.max(0, Number(actual.quantity) - previousQuantity)
        : quantity;

      controls.querySelector(`.${PREPURCHASE_INPUT_CLASS}`).value = "1";

      setPrepurchaseStatus(
        controls,
        synced
          ? `${added}個追加しました。`
          : "追加しました。表示更新にはページを再読み込みしてください"
      );
    } catch (error) {
      console.error("事前リアクションのまとめて追加に失敗しました。", error);
      setPrepurchaseStatus(controls, "追加に失敗しました。", true);
      window.alert(
        `事前リアクションを追加できませんでした。\n${error.message || error}`
      );
    } finally {
      prepurchaseRequestPending = false;
      controls.classList.remove("is-sending");
    }
  }

  function decoratePrepurchaseItem(item) {
    if (
      !(item instanceof Element) ||
      item.querySelector(`.${PREPURCHASE_CONTROLS_CLASS}`)
    ) {
      return;
    }

    const plusButton =
      item.querySelector(".lh-prepurchase-plus[data-slot-id]");
    const actions =
      item.querySelector(".lh-prepurchase-item-actions");

    if (!plusButton || !actions) return;

    const controls = document.createElement("span");
    controls.className = PREPURCHASE_CONTROLS_CLASS;

    const input = document.createElement("input");
    input.type = "number";
    input.className = PREPURCHASE_INPUT_CLASS;
    input.min = "1";
    input.step = "1";
    input.value = "1";
    input.inputMode = "numeric";
    input.setAttribute("aria-label", "追加する事前リアクションの個数");

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = PREPURCHASE_BUTTON_CLASS;
    addButton.textContent = "指定数を追加";

    const status = document.createElement("span");
    status.className = PREPURCHASE_STATUS_CLASS;
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    addButton.addEventListener("click", () => {
      const quantity = readPrepurchaseAddQuantity(input);

      if (quantity !== null) {
        void addPrepurchaseQuantity(item, controls, quantity);
      }
    });

    controls.append(input, addButton, status);
    plusButton.insertAdjacentElement("afterend", controls);
  }

  function decoratePrepurchaseItemsInside(root) {
    if (!(root instanceof Element || root instanceof Document)) return;

    if (root instanceof Element && root.matches(PREPURCHASE_ITEM_SELECTOR)) {
      decoratePrepurchaseItem(root);
    }

    root.querySelectorAll(PREPURCHASE_ITEM_SELECTOR)
      .forEach(decoratePrepurchaseItem);
  }

  function startObserver() {
    const observer = new MutationObserver((mutations) => {
      let profileHeaderAdded = false;

      for (const mutation of mutations) {
        if (mutation.target instanceof Element) {
          const shop = mutation.target.closest(REACTION_SHOP_SELECTOR);
          if (shop) decorateReactionShop(shop);

          if (
            mutation.type === "attributes" &&
            mutation.attributeName === "data-live-event-target"
          ) {
            decorateReactionShopsInside(mutation.target);
          }
        }

        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;

          decorateMessagesInside(node);
          decorateReactionShopsInside(node);
          decoratePrepurchaseItemsInside(node);

          if (
            node.matches(".profile-header") ||
            node.querySelector(".profile-header")
          ) {
            profileHeaderAdded = true;
          }
        }

        if (mutation.type === "attributes") {
          const message = mutation.target.closest?.(MESSAGE_SELECTOR);
          if (message) decorateMessage(message);
        }
      }

      if (profileHeaderAdded) {
        decorateProfilePage();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "data-reported-user-id",
        "data-live-event-target"
      ]
    });
  }

  function normalizeStoredUsers(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    const normalized = {};

    for (const [userId, state] of Object.entries(value)) {
      if (
        !/^\d+$/.test(userId) ||
        !state ||
        typeof state !== "object"
      ) {
        continue;
      }

      const following = state.following === true;
      const nickname = typeof state.nickname === "string"
        ? state.nickname.trim()
        : "";

      if (following || nickname) {
        normalized[userId] = {
          following,
          nickname
        };
      }
    }

    return normalized;
  }

  function migrateLegacyFavorites(legacyFavorites) {
    if (
      !legacyFavorites ||
      typeof legacyFavorites !== "object" ||
      Array.isArray(legacyFavorites)
    ) {
      return {};
    }

    const migrated = {};

    for (const [userId, favorite] of Object.entries(legacyFavorites)) {
      if (
        !/^\d+$/.test(userId) ||
        !favorite ||
        typeof favorite !== "object"
      ) {
        continue;
      }

      migrated[userId] = {
        following: true,
        nickname: typeof favorite.nickname === "string"
          ? favorite.nickname.trim()
          : "",
        migratedAt: new Date().toISOString()
      };
    }

    return migrated;
  }

  function normalizeBlockedUsers(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    const normalized = {};

    for (const [userId, blocked] of Object.entries(value)) {
      if (/^\d+$/.test(userId) && blocked === true) {
        normalized[userId] = true;
      }
    }

    return normalized;
  }

  async function initialize() {
    try {
      const current = GM_getValue(STORAGE_KEY, null);
      const blocked = GM_getValue(BLOCKED_STORAGE_KEY, {});
      const savedNames = GM_getValue(USER_NAMES_STORAGE_KEY, {});

      if (savedNames && typeof savedNames === "object") {
        Object.entries(savedNames).forEach(([userId, name]) => {
          if (
            /^\d+$/.test(String(userId)) &&
            typeof name === "string" &&
            name.trim()
          ) {
            knownUserNames.set(String(userId), name.trim());
          }
        });
      }

      const stored = {
        [STORAGE_KEY]: current,
        [LEGACY_STORAGE_KEY]: GM_getValue(LEGACY_STORAGE_KEY, null)
      };

      const hasNewStorage = current !== null;
      blockedUsers = normalizeBlockedUsers(blocked);

      if (hasNewStorage) {
        followedUsers = normalizeStoredUsers(stored[STORAGE_KEY]);
      } else {
        followedUsers = migrateLegacyFavorites(stored[LEGACY_STORAGE_KEY]);

        if (Object.keys(followedUsers).length > 0) {
          await GM_setValue(STORAGE_KEY, followedUsers);
        }
      }
    } catch (error) {
      console.error("TypingTubeのフォロー情報を読み込めませんでした。", error);
    }

    createUserListsToolbar();

    window.setInterval(() => {
      if (userListsPanel && !userListsPanel.hidden) {
        renderUserLists();
      }
    }, 30 * 1000);

    decorateMessagesInside(document);
    decorateProfilePage();
    decorateReactionShopsInside(document);
    decoratePrepurchaseItemsInside(document);
    startReactionQuantityHandler();
    startObserver();

    document.addEventListener("turbo:load", () => {
      createUserListsToolbar();
      decorateMessagesInside(document);
      decorateProfilePage();
      decorateReactionShopsInside(document);
      decoratePrepurchaseItemsInside(document);
    });

    GM_addValueChangeListener(
      STORAGE_KEY,
      (_key, _oldValue, newValue) => {
        followedUsers = normalizeStoredUsers(newValue);
        refreshAllUsers();
      }
    );

    GM_addValueChangeListener(
      BLOCKED_STORAGE_KEY,
      (_key, _oldValue, newValue) => {
        blockedUsers = normalizeBlockedUsers(newValue);
        refreshAllUsers();
      }
    );

    GM_addValueChangeListener(
      USER_NAMES_STORAGE_KEY,
      (_key, _oldValue, newValue) => {
        knownUserNames.clear();

        if (newValue && typeof newValue === "object") {
          Object.entries(newValue).forEach(([userId, name]) => {
            if (
              /^\d+$/.test(String(userId)) &&
              typeof name === "string" &&
              name.trim()
            ) {
              knownUserNames.set(String(userId), name.trim());
            }
          });
        }

        renderUserLists();
      }
    );
  }

  initialize();
})();

(() => {
  "use strict";

  if (
    window.top !== window ||
    document.getElementById("tt-cloud-id-search-v006")
  ) {
    return;
  }

  const DEFAULT_DATA_URL =
    "https://raw.githubusercontent.com/takesann55/typingtube-ranking-data/main/typingtube_rankings_v001.bin";
  const STORAGE_KEY = "tt-cloud-rank-data-url-v006";
  const MAX_RESULTS = 100;

  let rows = [];
  let anchor = null;
  let open = false;
  let settingsOpen = false;

  const normalize = value =>
    String(value).normalize("NFKC").toLocaleLowerCase("ja-JP");

  const make = (tag, className, label) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (label !== undefined) element.textContent = label;
    return element;
  };

  const host = make("div");
  host.id = "tt-cloud-id-search-v006";

  const root = host.attachShadow({
    mode: "open"
  });

  const css = make("style");
  css.textContent = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    button, input { font: inherit; }
    .search-row {
      display: flex;
      gap: 5px;
      align-items: center;
      height: 100%;
      font: 14px sans-serif;
    }
    .query {
      flex: 1;
      min-width: 0;
      width: 100%;
      height: 100%;
      padding: 0 10px;
      border: 1px solid #aab6c1;
      border-radius: 6px;
      background: #fff;
      color: #17202a;
      outline: none;
    }
    .query:focus {
      border-color: #2680c2;
      box-shadow: 0 0 0 2px #2680c233;
    }
    .gear, .load, .copy, .close {
      border: 1px solid #aab6c1;
      border-radius: 6px;
      background: #fff;
      color: #17202a;
      cursor: pointer;
      padding: 5px 8px;
    }
    .gear { height: 100%; flex: none; }
    .drop {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      width: min(420px, calc(100vw - 24px));
      max-height: min(560px, calc(100vh - 100px));
      overflow: auto;
      background: #fff;
      color: #17202a;
      border: 1px solid #bbc8d3;
      border-radius: 10px;
      box-shadow: 0 8px 28px #0005;
      padding: 12px;
      font: 14px/1.5 sans-serif;
    }
    .drop[hidden], .settings[hidden] { display: none; }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .head strong { font-size: 15px; }
    .head-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: none;
    }
    .status {
      color: #425568;
      margin: 8px 0;
      overflow-wrap: anywhere;
    }
    .settings {
      border: 1px solid #d9e2ea;
      border-radius: 7px;
      padding: 8px;
      margin: 8px 0;
    }
    .settings label {
      display: block;
      font-size: 12px;
      margin-bottom: 4px;
    }
    .settings-row { display: flex; gap: 6px; }
    .url {
      min-width: 0;
      flex: 1;
      padding: 6px;
      border: 1px solid #aab6c1;
      border-radius: 5px;
      background: #fff;
      color: #17202a;
    }
    .results { list-style: none; padding: 0; margin: 0; }
    .item {
      border-top: 1px solid #e1e7ed;
      padding: 9px 0;
      overflow-wrap: anywhere;
    }
    .title { font-weight: 600; }
    .meta { color: #425568; margin: 4px 0; }
    .actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    a { color: #07569d; text-decoration: underline; }
  `;

  root.append(css);

  const searchRow = make("div", "search-row");

  const query = make("input", "query");
  query.type = "search";
  query.placeholder = "ランキングから曲ID検索";
  query.autocomplete = "off";
  query.setAttribute(
    "aria-label",
    "月間ランキングの曲名からIDを検索"
  );

  const gear = make("button", "gear", "⚙");
  gear.type = "button";
  gear.title = "データURLを設定";

  searchRow.append(query, gear);

  const drop = make("div", "drop");
  drop.hidden = true;

  const head = make("div", "head");
  const heading = make("strong", "", "月間ランキング 曲ID検索");

  const repoLink = make("a", "", "GitHubで更新履歴を見る");
  repoLink.href =
    "https://github.com/takesann55/typingtube-ranking-data";
  repoLink.target = "_blank";
  repoLink.rel = "noopener noreferrer";

  const close = make("button", "close", "×");
  close.type = "button";
  close.setAttribute("aria-label", "結果を閉じる");

  const headActions = make("div", "head-actions");
  headActions.append(repoLink, close);
  head.append(heading, headActions);

  const status = make(
    "div",
    "status",
    "公開データのURLを設定してください。"
  );

  const settings = make("div", "settings");
  settings.hidden = true;

  const label = make("label", "", "GitHubのRaw URL");
  const settingsRow = make("div", "settings-row");

  const urlInput = make("input", "url");
  urlInput.type = "url";
  urlInput.placeholder =
    "https://raw.githubusercontent.com/.../typingtube_rankings_v001.bin";
  urlInput.value = GM_getValue(STORAGE_KEY, DEFAULT_DATA_URL);

  const load = make("button", "load", "読込");
  load.type = "button";

  settingsRow.append(urlInput, load);
  settings.append(label, settingsRow);

  const results = make("ul", "results");

  drop.append(head, status, settings, results);
  root.append(searchRow, drop);
  document.body.append(host);

  function showDrop() {
    open = true;
    drop.hidden = false;
  }

  function hideDrop() {
    open = false;
    drop.hidden = true;
  }

  function toggleSettings() {
    settingsOpen = !settingsOpen;
    settings.hidden = !settingsOpen;
    showDrop();
    if (settingsOpen) urlInput.focus();
  }

  function position() {
    const found = document.querySelector(
      "#topbarSearchInput.topbar-search-input"
    );

    if (
      !found ||
      !found.isConnected ||
      found.getClientRects().length === 0
    ) {
      anchor = null;
      host.style.display = "none";
      hideDrop();
      return;
    }

    anchor = found;

    const rect = found.getBoundingClientRect();
    const rightSpace = window.innerWidth - rect.right - 12;
    const width = Math.min(265, rightSpace - 8);

    host.style.position = "fixed";
    host.style.zIndex = "2147483000";

    if (width >= 160) {
      host.style.left = `${Math.round(rect.right + 8)}px`;
      host.style.top = `${Math.round(rect.top)}px`;
      host.style.width = `${Math.round(width)}px`;
    } else {
      host.style.left = `${Math.max(8, Math.round(rect.left))}px`;
      host.style.top = `${Math.round(rect.bottom + 5)}px`;
      host.style.width =
        `${Math.round(Math.min(265, window.innerWidth - rect.left - 12))}px`;
    }

    host.style.height =
      `${Math.max(30, Math.round(rect.height))}px`;
    host.style.display = "block";
  }

  function requestBinary(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url,
        responseType: "arraybuffer",
        timeout: 30000,
        nocache: true,
        anonymous: true,

        onload: response => response.status === 200
          ? resolve(response.response)
          : reject(new Error(`HTTP ${response.status}`)),

        onerror: () => {
          reject(new Error("通信に失敗しました"));
        },

        ontimeout: () => {
          reject(new Error("読込が時間切れになりました"));
        }
      });
    });
  }

  async function loadData() {
    let address;

    try {
      address = new URL(urlInput.value.trim());

      if (
        address.protocol !== "https:" ||
        address.hostname !== "raw.githubusercontent.com"
      ) {
        throw new Error(
          "raw.githubusercontent.com のURLを入力してください"
        );
      }
    } catch (error) {
      status.textContent = `URLが不正です: ${error.message}`;
      showDrop();
      return;
    }

    status.textContent = "公開データを読み込み中...";
    load.disabled = true;

    try {
      const bytes = await requestBinary(address.href);

      if (!(bytes instanceof ArrayBuffer)) {
        throw new Error("不正なバイナリ");
      }

      const stream = new Blob([bytes])
        .stream()
        .pipeThrough(new DecompressionStream("gzip"));

      const data = JSON.parse(
        await new Response(stream).text()
      );

      if (
        data.format !== "typingtube-rankings" ||
        data.version !== 1 ||
        !Array.isArray(data.rows)
      ) {
        throw new Error("対応していないデータ形式です");
      }

      rows = data.rows.filter(row =>
        Array.isArray(row) &&
        typeof row[0] === "string" &&
        Number.isSafeInteger(row[1]) &&
        row[1] > 0
      );

      GM_setValue(STORAGE_KEY, address.href);

      status.textContent =
        `${rows.length.toLocaleString()}件の譜面を読み込みました。`;

      settings.hidden = true;
      settingsOpen = false;

      if (query.value.trim()) search();
    } catch (error) {
      status.textContent = `読込失敗: ${error.message}`;
      showDrop();
    } finally {
      load.disabled = false;
    }
  }

  function search() {
    results.replaceChildren();

    const terms = normalize(query.value)
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!terms.length) {
      if (rows.length) {
        status.textContent =
          `${rows.length.toLocaleString()}件を読込済み。曲名を入力してください。`;
      }
      return;
    }

    showDrop();

    if (!rows.length) {
      status.textContent =
        "先に⚙から公開データのURLを設定してください。";
      return;
    }

    let total = 0;

    for (const [title, id, rank, level] of rows) {
      if (!terms.every(term => normalize(title).includes(term))) {
        continue;
      }

      total++;
      if (total > MAX_RESULTS) continue;

      const item = make("li", "item");

      const info = make(
        "div",
        "meta",
        `譜面ID: ${id}` +
        (Number.isInteger(rank) ? ` ／ 順位: ${rank}` : "") +
        (level ? ` ／ 難易度: ${level}` : "")
      );

      const actions = make("div", "actions");

      const link = make("a", "", "譜面を開く");
      link.href = `https://typing-tube.net/movie/show/${id}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      const copy = make("button", "copy", "IDをコピー");
      copy.type = "button";

      copy.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(String(id));
          copy.textContent = "コピーしました";
        } catch (_) {
          copy.textContent = "コピーできませんでした";
        }
      });

      actions.append(link, copy);
      item.append(make("div", "title", title), info, actions);
      results.append(item);
    }

    status.textContent =
      `${total}件が一致` +
      (
        total > MAX_RESULTS
          ? `（先頭${MAX_RESULTS}件を表示）`
          : ""
      );
  }

  query.addEventListener("focus", () => {
    showDrop();
    if (query.value.trim()) search();
  });

  query.addEventListener("input", search);

  query.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === "Escape") {
        hideDrop();
      } else {
        search();
      }
    }
  });

  gear.addEventListener("click", toggleSettings);
  close.addEventListener("click", hideDrop);

  load.addEventListener("click", () => {
    void loadData();
  });

  urlInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      void loadData();
    }
  });

  document.addEventListener("pointerdown", event => {
    if (open && !host.contains(event.target)) {
      hideDrop();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && open) {
      hideDrop();
    }
  });

  window.addEventListener("resize", position);
  window.addEventListener("scroll", position, true);

  const observer = new MutationObserver(() => {
    if (
      !anchor ||
      !anchor.isConnected ||
      document.querySelector(
        "#topbarSearchInput.topbar-search-input"
      ) !== anchor
    ) {
      position();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  position();

  if (urlInput.value.trim()) {
    void loadData();
  }
})();