// ==UserScript==
// @name         TypingTube アシスト＋曲ID検索
// @namespace    https://typing-tube.net/
// @version      8.0.4
// @description  チャット識別・フォロー・ブロック・コメントリアクション表示切替・オンライン表示・コメントメニュー・入力欄横のフォロー/ブロック一覧・ライブリアクション・ランキング版選択・公開日時付き履歴・曲ID検索
// @match        https://typing-tube.net/*
// @match        https://www.typing-tube.net/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_addStyle
// @connect      raw.githubusercontent.com
// @connect      api.github.com
// @updateURL    https://raw.githubusercontent.com/takesann55/typingtube-ranking-data/main/TypingTube_Assist_Combined.user.js
// @downloadURL  https://raw.githubusercontent.com/takesann55/typingtube-ranking-data/main/TypingTube_Assist_Combined.user.js
// @homepageURL  https://github.com/takesann55/typingtube-ranking-data
// @run-at       document-idle
// ==/UserScript==

GM_addStyle(String.raw`
html[data-tt-hide-chat-reactions] :is(
  .lobby-chat-msg-reactions,
  .lobby-chat-msg-react-btn,
  .le-chat-msg-reactions,
  .le-chat-msg-react-btn,
  .room-chat-msg-reactions,
  .room-chat-msg-react-btn
) {
  display: none !important;
}
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
if(window.top!==window||document.documentElement.hasAttribute("data-tt-assist-combined-v006"))return;
document.documentElement.setAttribute("data-tt-assist-combined-v006","");
const MESSAGE_SELECTOR=[".lobby-chat-msg",".le-chat-msg",".room-chat-msg"].join(", ");
const USER_SELECTOR=[".lobby-chat-msg-user",".le-chat-msg-user",".room-chat-msg-user"].join(", ");
const REPORT_SELECTOR=[".chat-report-btn[data-reported-user-id]",".room-chat-report-btn[data-reported-user-id]"].join(", ");
const PROFILE_BUTTON_CLASS="tt-user-profile-button";
const OLD_FAVORITE_BUTTON_CLASS="tt-user-favorite-button";
const PROFILE_ACTIONS_CLASS="tt-user-profile-actions";
const FOLLOW_BUTTON_CLASS="tt-user-follow-button";
const NICKNAME_BUTTON_CLASS="tt-user-nickname-button";
const BLOCK_BUTTON_CLASS="tt-user-block-button";
const LISTS_TOOLBAR_CLASS="tt-user-lists-toolbar";
const LIST_PANEL_CLASS="tt-user-list-panel";
const REACTION_SHOP_SELECTOR='[data-live-event-target~="reactionShop"]';
const REACTION_CARD_SELECTOR=".lh-reaction-card[data-slot-id]";
const REACTION_CONTROLS_CLASS="tt-reaction-quantity-controls";
const REACTION_QUANTITY_CLASS="tt-reaction-quantity-input";
const REACTION_STATUS_CLASS="tt-reaction-quantity-status";
const MAX_REACTION_QUANTITY=10;
const PREPURCHASE_SECTION_SELECTOR=".lh-prepurchase-section[data-live-event-prepurchase-event-id-value]";
const PREPURCHASE_ITEM_SELECTOR=".lh-prepurchase-item";
const PREPURCHASE_CONTROLS_CLASS="tt-prepurchase-bulk-controls";
const PREPURCHASE_INPUT_CLASS="tt-prepurchase-bulk-input";
const PREPURCHASE_BUTTON_CLASS="tt-prepurchase-bulk-button";
const PREPURCHASE_STATUS_CLASS="tt-prepurchase-bulk-status";
const PROCESSED_ATTRIBUTE="data-tt-user-color-id";
const ORIGINAL_NAME_ATTRIBUTE="data-tt-original-user-name";
const FOLLOWING_ATTRIBUTE="data-tt-following";
const STORAGE_KEY="ttFollowedUsers";
const LEGACY_STORAGE_KEY="ttUserFavorites";
const BLOCKED_STORAGE_KEY="ttBlockedUsers";
const USER_NAMES_STORAGE_KEY="ttUserNames";
const HIDE_CHAT_REACTIONS_KEY="ttHideChatReactions";
let followedUsers={};
let blockedUsers={};
let hideChatReactions=false;
const knownUserNames=new Map();
const lastSeenByUser=new Map();
const wsOnlineUsers=new Set();
let wsPresenceAvailable=false;
let wsHookInstalled=false;
let userListsPanel=null;
let reactionRequestPending=false;
let prepurchaseRequestPending=false;

function colorFromUserId(userId) {
  const numericId=Number(userId);
  if(Number.isSafeInteger(numericId)&&numericId>=0)return(numericId*137.50776405003785)%360;
  let hash=2166136261;
  for(const character of String(userId)){
    hash^=character.codePointAt(0);
    hash=Math.imul(hash,16777619);
  }
  return(hash>>>0)%360;
}

function getUserState(userId) {
  const storedState=followedUsers[userId];
  return{
    following:storedState?.following===true,
    nickname:typeof storedState?.nickname==="string"?storedState.nickname.trim():""
  };
}

function isUserBlocked(userId) {
  return blockedUsers[userId]===true;
}

function applyBlockState(message,userId) {
  if(!(message instanceof Element)||!userId)return;
  const blocked=isUserBlocked(userId);
  message.hidden=blocked;
  message.toggleAttribute("data-tt-blocked",blocked);
  if(blocked&&activeUserMenu?.trigger.closest(MESSAGE_SELECTOR)===message)closeUserMenu();
  const button=message.querySelector(`.${BLOCK_BUTTON_CLASS}`);
  if(button){
    button.textContent=blocked?"ブロック解除":"ブロック";
    button.classList.toggle("is-blocked",blocked);
    button.setAttribute("aria-pressed",String(blocked));
    button.title=blocked?"このユーザーのブロックを解除します":"このユーザーのチャット発言を非表示にします";
  }
}

function getOriginalName(userName) {
  let originalName=userName.getAttribute(ORIGINAL_NAME_ATTRIBUTE);
  if(originalName===null){
    originalName=userName.textContent.trim();
    userName.setAttribute(ORIGINAL_NAME_ATTRIBUTE,originalName);
  }
  return originalName;
}

function applyUserState(userName,userId) {
  const originalName=getOriginalName(userName);
  const state=getUserState(userId);
  if(state.nickname){
    userName.textContent=`${originalName}/${state.nickname}${state.following?" ":""}`;
  }else if(state.following){
    userName.textContent=`${originalName}/`;
  }else{
    userName.textContent=originalName;
  }
  userName.toggleAttribute(FOLLOWING_ATTRIBUTE,state.following);
  const titleLines=[`TypingTube上の名前: ${originalName}`,`ユーザーID: ${userId}`];
  if(state.following)titleLines.unshift("フォロー中");
  if(state.nickname)titleLines.splice(state.following?1:0,0,`独自の名前: ${state.nickname}`);
  userName.title=titleLines.join("\n");
  userName.setAttribute("aria-label",`${originalName}`+`${state.nickname?`、独自の名前は${state.nickname}`:""}`+`${state.following?"、フォロー中":""}、ユーザーID ${userId}`);
}

function rememberUserName(userId,userNameElement) {
  if(!userId||!(userNameElement instanceof Element))return;
  const originalName=getOriginalName(userNameElement).trim();
  if(!originalName)return;
  const key=String(userId);
  knownUserNames.set(key,originalName);
  try{
    const savedNames=GM_getValue(USER_NAMES_STORAGE_KEY,{});
    if(savedNames[key]!==originalName){
      GM_setValue(USER_NAMES_STORAGE_KEY,{...(savedNames&&typeof savedNames==="object"?savedNames:{}),[key]:originalName});
    }
  }catch(error){
    console.warn("TypingTubeのユーザー名を保存できませんでした。",error);
  }
}

function markUserOnline(userId) {
  if(!userId)return;
  lastSeenByUser.set(String(userId),Date.now());
  renderUserLists();
}

function isUserOnline(userId) {
  const key=String(userId);
  if(wsPresenceAvailable)return wsOnlineUsers.has(key);
  const lastSeen=lastSeenByUser.get(key);
  return Number.isFinite(lastSeen)&&Date.now()-lastSeen<=5*60*1000;
}

function getOnlineSortKey(userId) {
  const lastSeen=lastSeenByUser.get(String(userId));
  return Number.isFinite(lastSeen)?lastSeen:0;
}

function getKnownUserName(userId) {
  return knownUserNames.get(String(userId))||`ユーザーID ${userId}`;
}

function normalizeWsUserId(value) {
  if(value==null)return null;
  if(typeof value==="number"&&Number.isSafeInteger(value)&&value>=0)return String(value);
  if(typeof value==="string"&&/^\d+$/.test(value.trim()))return value.trim();
  return null;
}

function collectWsUserIds(value,output=new Set()) {
  if(value==null)return output;
  if(Array.isArray(value)){
    value.forEach(item=>collectWsUserIds(item,output));
    return output;
  }
  if(typeof value!=="object")return output;
  const directKeys=["userId","user_id","userid","uid","memberId","member_id","playerId","player_id"];
  for(const key of directKeys){
    const id=normalizeWsUserId(value[key]);
    if(id)output.add(id);
  }
  for(const key of Object.keys(value)){
    if(/^\d+$/.test(key)&&value[key]===true)output.add(key);
  }
  const collectionKeys=["users","online","onlineUsers","online_users","participants","members","players","userList","user_list"];
  for(const[key,child]of Object.entries(value)){
    if(collectionKeys.includes(key))collectWsUserIds(child,output);
  }
  return output;
}

function classifyPresenceEvent(root) {
  if(!root||typeof root!=="object")return null;
  const text=JSON.stringify(root).toLowerCase();
  const typeText=[root.type,root.event,root.action,root.kind,root.name,root.topic].filter(value=>typeof value==="string").join(" ").toLowerCase();
  const hasPresenceWord=/presence|online|offline|connect|disconnect|join|leave|member|participant/.test(typeText);
  if(!hasPresenceWord&&!/("online"|"offline"|"onlineusers"|"online_users"|"participants"|"members")/.test(text))return null;
  const ids=collectWsUserIds(root);
  if(!ids.size)return null;
  const isOffline=/offline|disconnect|disconnected|leave|left|removed/.test(typeText);
  const isSnapshot=/snapshot|onlineusers|online_users|participants|members|userlist|user_list/.test(typeText)||Object.prototype.hasOwnProperty.call(root,"online")||Object.prototype.hasOwnProperty.call(root,"onlineUsers")||Object.prototype.hasOwnProperty.call(root,"online_users");
  return{ids,isOffline,isSnapshot};
}

function handleWebSocketPayload(raw) {
  if(typeof raw!=="string"||!raw.trim())return;
  let parsed;
  try{
    parsed=JSON.parse(raw);
  }catch(_){
    return;
  }
  const candidates=Array.isArray(parsed)?parsed:[parsed];
  let changed=false;
  for(const root of candidates){
    const event=classifyPresenceEvent(root);
    if(!event)continue;
    wsPresenceAvailable=true;
    if(event.isSnapshot)wsOnlineUsers.clear();
    for(const id of event.ids){
      if(event.isOffline){
        if(wsOnlineUsers.delete(id))changed=true;
      }else if(!wsOnlineUsers.has(id)){
        wsOnlineUsers.add(id);
        changed=true;
      }
    }
  }
  if(changed||wsPresenceAvailable)renderUserLists();
}

function installWebSocketMonitor() {
  window.addEventListener("message",event=>{
    if(event.source!==window||!event.data||event.data.source!=="TT_WS_MONITOR")return;
    if(event.data.kind==="hook_installed"){
      wsHookInstalled=event.data.payload?.ok===true;
      renderUserLists();
      return;
    }
    if(event.data.kind==="message")handleWebSocketPayload(event.data.payload?.data);
  });
}

function normalizeUserSearch(value) {
  return String(value??"").normalize("NFKC").toLocaleLowerCase("ja-JP").trim();
}

function getUserListIds(mode) {
  return mode==="follow"?Object.entries(followedUsers).filter(([,state])=>state?.following===true).map(([userId])=>userId):Object.keys(blockedUsers);
}

function filterUserListIds(ids,query) {
  const normalizedQuery=normalizeUserSearch(query);
  if(!normalizedQuery)return ids;
  return ids.filter(userId=>{
    const name=getKnownUserName(userId);
    return normalizeUserSearch(name).includes(normalizedQuery)||String(userId).includes(normalizedQuery);
  });
}

function createUserListItem(userId,type) {
  const item=document.createElement("div");
  item.className="tt-user-list-item";
  const name=document.createElement("div");
  name.className="tt-user-list-name";
  const nameLine=document.createElement("div");
  nameLine.className="tt-user-list-name-line";
  const status=document.createElement("span");
  status.className=isUserOnline(userId)?"tt-user-online-status is-online":"tt-user-online-status is-offline";
  status.textContent=isUserOnline(userId)?"● オンライン":"● オフライン";
  status.title=wsPresenceAvailable?"TypingTubeのWebSocket通信からオンライン状態を判定しています":(isUserOnline(userId)?"WebSocketのオンライン情報が見つかるまで、5分以内の発言を基準にしています":"WebSocketのオンライン情報が見つかるまで、5分以内の発言を確認できていません");
  const displayName=document.createElement("span");
  displayName.textContent=getKnownUserName(userId);
  nameLine.append(status,displayName);
  const id=document.createElement("small");
  id.textContent=`ID: ${userId}`;
  name.append(nameLine,id);
  const profile=document.createElement("a");
  profile.className="tt-user-list-action";
  profile.href=`/user/${encodeURIComponent(userId)}`;
  profile.target="_blank";
  profile.rel="noopener noreferrer";
  profile.textContent="プロフィール";
  const action=document.createElement("button");
  action.type="button";
  action.className="tt-user-list-action";
  action.textContent="解除";
  if(type==="follow"){
    action.title="フォローを解除";
    action.addEventListener("click",async()=>{
      await toggleFollow(userId);
      renderUserLists();
    });
  }else{
    action.title="ブロックを解除";
    action.addEventListener("click",async()=>{
      await toggleBlock(userId);
      renderUserLists();
    });
  }
  item.append(name,profile,action);
  return item;
}

function renderUserLists() {
  if(!userListsPanel)return;
  const mode=userListsPanel.dataset.mode||"follow";
  const title=userListsPanel.querySelector(".tt-user-list-title");
  const body=userListsPanel.querySelector(".tt-user-list-body");
  const search=userListsPanel.querySelector(".tt-user-list-search");
  const searchStatus=userListsPanel.querySelector(".tt-user-list-search-status");
  if(!title||!body)return;
  const query=search?.value||"";
  const allIds=getUserListIds(mode);
  const ids=filterUserListIds(allIds,query);
  const titleText=title.querySelector(".tt-user-list-title-text");
  if(titleText)titleText.textContent=mode==="follow"?"フォローしている人":"ブロックしている人";
  if(searchStatus)searchStatus.textContent=query.trim()?`${ids.length}人 / ${allIds.length}人`:`${allIds.length}人`;
  body.replaceChildren();
  ids.sort((a,b)=>{
    const aOnline=isUserOnline(a);
    const bOnline=isUserOnline(b);
    if(aOnline!==bOnline)return aOnline?-1:1;
    const aSeen=getOnlineSortKey(a);
    const bSeen=getOnlineSortKey(b);
    if(aSeen!==bSeen)return bSeen-aSeen;
    return getKnownUserName(a).localeCompare(getKnownUserName(b),"ja");
  });
  if(allIds.length===0){
    const empty=document.createElement("p");
    empty.className="tt-user-list-empty";
    empty.textContent=mode==="follow"?"フォローしている人はいません。":"ブロックしている人はいません。";
    body.append(empty);
    return;
  }
  if(ids.length===0){
    const empty=document.createElement("p");
    empty.className="tt-user-list-empty";
    empty.textContent=`「${query}」に一致するユーザーはいません。`;
    body.append(empty);
    return;
  }
  ids.forEach(userId=>body.append(createUserListItem(userId,mode)));
}

let activeUserMenu=null;
let commentPopup=null;
let listsPopup=null;
let composerScanPending=false;
let menuEventsStarted=false;
const composerMenus=new Map();
let composerResizeObserver=null;

function applyChatReactionVisibility() {
  document.documentElement.toggleAttribute('data-tt-hide-chat-reactions',hideChatReactions);
  const button=listsPopup?.querySelector('.tt-chat-reactions-toggle');
  if(button){
    button.textContent=hideChatReactions?'リアクションを表示':'リアクションを非表示';
    button.setAttribute('aria-pressed',String(hideChatReactions));
    button.title=hideChatReactions?'コメントのリアクションと＋ボタンを表示します':'すべてのコメントのリアクションと＋ボタンを非表示にします';
  }
}

async function toggleChatReactionVisibility() {
  const next=!hideChatReactions;
  try{
    await GM_setValue(HIDE_CHAT_REACTIONS_KEY,next);
    hideChatReactions=next;
    applyChatReactionVisibility();
    positionUserMenu();
  }catch(error){
    console.error('コメントのリアクション表示設定を保存できませんでした。',error);
    window.alert('リアクション表示の設定を保存できませんでした。');
  }
}

function makeMenuButton(text,className,label) {
  const button=document.createElement('button');
  button.type='button';
  button.className=className;
  button.textContent=text;
  button.title=label;
  button.setAttribute('aria-label',label);
  button.setAttribute('aria-haspopup','menu');
  button.setAttribute('aria-expanded','false');
  return button;
}

function closeUserMenu(returnFocus=false) {
  if(!activeUserMenu)return;
  const{trigger,popup}=activeUserMenu;
  popup.hidden=true;
  trigger.setAttribute('aria-expanded','false');
  activeUserMenu=null;
  if(returnFocus&&trigger.isConnected)trigger.focus();
}

function positionUserMenu() {
  if(!activeUserMenu)return;
  const{trigger,popup}=activeUserMenu;
  if(!trigger.isConnected||trigger.getClientRects().length===0||trigger.closest('[hidden], [data-tt-blocked]')){
    closeUserMenu();
    return;
  }
  const rect=trigger.getBoundingClientRect();
  const width=Math.min(popup.offsetWidth||220,window.innerWidth-16);
  const height=popup.offsetHeight||90;
  const below=window.innerHeight-rect.bottom-14;
  const above=rect.top-14;
  const useAbove=below<Math.min(height,160)&&above>below;
  popup.style.maxHeight=`${Math.max(40,useAbove?above:below)}px`;
  popup.style.left=`${Math.max(8,Math.min(rect.right-width,window.innerWidth-width-8))}px`;
  popup.style.top=`${Math.max(8,useAbove?rect.top-Math.min(height,above)-6:rect.bottom+6)}px`;
}

function showUserMenu(trigger,popup) {
  closeUserMenu();
  if(!popup.isConnected)document.body.append(popup);
  popup.style.removeProperty('display');
  popup.hidden=false;
  trigger.setAttribute('aria-expanded','true');
  if(popup.id)trigger.setAttribute('aria-controls',popup.id);
  activeUserMenu={trigger,popup};
  positionUserMenu();
}

function getCommentPopup() {
  if(commentPopup)return commentPopup;
  const popup=document.createElement('div');
  popup.className='tt-user-popup tt-comment-popup';
  popup.id='tt-comment-user-menu';
  popup.hidden=true;
  popup.setAttribute('role','menu');
  const profile=document.createElement('a');
  profile.className='tt-menu-item';
  profile.textContent='プロフィール';
  profile.target='_blank';
  profile.rel='noopener noreferrer';
  profile.setAttribute('role','menuitem');
  profile.addEventListener('click',()=>closeUserMenu());
  const block=document.createElement('button');
  block.type='button';
  block.className='tt-menu-item';
  block.setAttribute('role','menuitem');
  block.addEventListener('click',event=>{
    event.preventDefault();
    const id=popup.dataset.userId;
    closeUserMenu();
    void toggleBlock(id);
  });
  popup.append(profile,block);
  document.body.append(popup);
  commentPopup=popup;
  return popup;
}

function openUserList(mode) {
  if(!userListsPanel)createUserListsToolbar();
  if(!userListsPanel)return;
  const trigger=activeUserMenu?.trigger||document.querySelector('.tt-composer-meatball');
  if(!trigger)return;
  userListsPanel.dataset.mode=mode;
  const search=userListsPanel.querySelector('.tt-user-list-search');
  if(search)search.value='';
  renderUserLists();
  showUserMenu(trigger,userListsPanel);
  search?.focus();
}

function createUserListsToolbar() {
  if(!userListsPanel||!userListsPanel.isConnected){
    const panel=document.createElement('div');
    panel.className=LIST_PANEL_CLASS+' tt-user-popup';
    panel.id='tt-user-list-popup';
    panel.hidden=true;
    panel.dataset.mode='follow';
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-label','フォロー・ブロック一覧');
    const title=document.createElement('h3');
    title.className='tt-user-list-title';
    const titleText=document.createElement('span');
    titleText.className='tt-user-list-title-text';
    const close=document.createElement('button');
    close.type='button';
    close.className='tt-user-list-action';
    close.textContent='閉じる';
    close.addEventListener('click',()=>closeUserMenu(true));
    title.append(titleText,close);
    const tabs=document.createElement('div');
    tabs.className='tt-list-tabs';
    for(const[mode,label]of[['follow','フォロー一覧'],['block','ブロック一覧']]){
      const tab=document.createElement('button');
      tab.type='button';
      tab.className='tt-user-list-action';
      tab.textContent=label;
      tab.addEventListener('click',()=>{
        panel.dataset.mode=mode;
        search.value='';
        renderUserLists();
        positionUserMenu();
      });
      tabs.append(tab);
    }
    const search=document.createElement('input');
    search.type='search';
    search.className='tt-user-list-search';
    search.placeholder='ユーザー名・IDで検索';
    search.setAttribute('aria-label','ユーザー名・IDで検索');
    search.addEventListener('input',()=>{
      renderUserLists();
      positionUserMenu();
    });
    const count=document.createElement('div');
    count.className='tt-user-list-search-status';
    count.setAttribute('aria-live','polite');
    const body=document.createElement('div');
    body.className='tt-user-list-body';
    panel.append(title,tabs,search,count,body);
    document.body.append(panel);
    userListsPanel=panel;
  }
  if(!listsPopup||!listsPopup.isConnected){
    const popup=document.createElement('div');
    popup.className='tt-user-popup tt-lists-popup';
    popup.id='tt-follow-block-menu';
    popup.hidden=true;
    popup.setAttribute('role','menu');
    for(const[mode,label]of[['follow','★ フォロー一覧'],['block','ブロック一覧']]){
      const button=document.createElement('button');
      button.type='button';
      button.className='tt-menu-item';
      button.textContent=label;
      button.setAttribute('role','menuitem');
      button.addEventListener('click',()=>openUserList(mode));
      popup.append(button);
    }
    document.body.append(popup);
    listsPopup=popup;
    const reactionsButton=document.createElement('button');
    reactionsButton.type='button';
    reactionsButton.className='tt-menu-item tt-chat-reactions-toggle';
    reactionsButton.setAttribute('role','menuitem');
    reactionsButton.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      void toggleChatReactionVisibility();
    });
    popup.append(reactionsButton);
  }
  applyChatReactionVisibility();
  decorateChatComposers();
}

function editableTextboxRect(input) {
  if(
    !input.matches('textarea, input:not([type]), input[type="text"]')||
    input.disabled||
    input.readOnly||
    input.matches(':disabled')||
    input.closest('.tt-user-popup, #tt-cloud-id-search-v006, [hidden], [inert], [aria-hidden="true"]')
  )return null;

  const identity=[
    input.id,
    input.name,
    input.className,
    input.placeholder,
    input.getAttribute('aria-label'),
    input.getAttribute('role'),
    ...Array.from(input.attributes)
      .filter(attr=>/^data-[\w-]+-target$/.test(attr.name))
      .map(attr=>attr.value)
  ].join(' ').replace(/tt-textbox-menu-field/g,'');

  if(
    /search|query|keyword|filter|検索|絞り込/i.test(identity)||
    input.closest('[role="search"]')||
    /search|検索/i.test(input.form?.getAttribute('action')||'')
  )return null;

  if(!input.isConnected||!input.getClientRects().length)return null;

  const style=window.getComputedStyle(input);
  if(
    style.display==='none'||
    style.visibility==='hidden'||
    style.visibility==='collapse'||
    Number(style.opacity)===0
  )return null;

  const rect=input.getBoundingClientRect();
  if(rect.width<48||rect.height<20)return null;

  for(let parent=input.parentElement;parent;parent=parent.parentElement){
    const parentStyle=window.getComputedStyle(parent);
    if(
      parentStyle.display==='none'||
      parentStyle.visibility==='hidden'||
      parentStyle.visibility==='collapse'||
      Number(parentStyle.opacity)===0
    )return null;
  }

  return rect;
}

function positionTextboxMenus() {
  for(const[input,entry]of composerMenus){
    const rect=editableTextboxRect(input);
    let visible=!!rect;
    if(rect){
      const size=Math.min(32,rect.height-4);
      const left=rect.right-size-3;
      const top=rect.top+Math.min(4,(rect.height-size)/2);
      let clipLeft=0;
      let clipTop=0;
      let clipRight=window.innerWidth;
      let clipBottom=window.innerHeight;

      for(let parent=input.parentElement;parent;parent=parent.parentElement){
        const style=window.getComputedStyle(parent);
        const bounds=parent.getBoundingClientRect();

        if(/auto|scroll|hidden|clip/.test(style.overflowX)){
          clipLeft=Math.max(clipLeft,bounds.left);
          clipRight=Math.min(clipRight,bounds.right);
        }

        if(/auto|scroll|hidden|clip/.test(style.overflowY)){
          clipTop=Math.max(clipTop,bounds.top);
          clipBottom=Math.min(clipBottom,bounds.bottom);
        }
      }

      visible=left>=clipLeft&&top>=clipTop&&left+size<=clipRight&&top+size<=clipBottom;

      if(visible&&typeof document.elementsFromPoint==='function'){
        const hit=document.elementsFromPoint(left+size/2,top+size/2)
          .find(element=>!element.classList.contains('tt-composer-meatball'));
        visible=hit===input||!!(hit&&input.contains(hit));
      }

      entry.button.style.left=`${left}px`;
      entry.button.style.top=`${top}px`;
      entry.button.style.setProperty('--tt-textbox-menu-size',`${size}px`);
    }

    if(entry.button.hidden!==!visible)entry.button.hidden=!visible;
    if(!visible&&activeUserMenu?.trigger===entry.button)closeUserMenu();
  }
}

function decorateChatComposers() {
  for(const element of document.querySelectorAll('[data-tt-chat-composer-row]')){
    element.toggleAttribute('data-tt-chat-composer-row',false);
  }

  for(const className of['tt-chat-composer-row','tt-chat-composer-field','tt-chat-composer-send']){
    for(const element of document.querySelectorAll('.'+className)){
      element.classList.toggle(className,false);
    }
  }

  const retained=new Set(Array.from(composerMenus.values(),entry=>entry.button));

  for(const button of document.querySelectorAll('.tt-composer-meatball')){
    if(!retained.has(button)){
      if(activeUserMenu?.trigger===button)closeUserMenu();
      button.remove();
    }
  }

  for(const[input,entry]of composerMenus){
    if(editableTextboxRect(input)&&entry.button.isConnected)continue;
    if(activeUserMenu?.trigger===entry.button)closeUserMenu();
    entry.button.remove();
    input.classList.toggle('tt-textbox-menu-field',false);

    if(entry.paddingValue){
      input.style.setProperty('--tt-textbox-original-padding',entry.paddingValue,entry.paddingPriority);
    }else{
      input.style.removeProperty('--tt-textbox-original-padding');
    }

    composerResizeObserver?.unobserve(input);
    composerMenus.delete(input);
  }

  if(!composerResizeObserver&&typeof ResizeObserver==='function'){
    composerResizeObserver=new ResizeObserver(scheduleComposerMenus);
  }

  for(const input of document.querySelectorAll('textarea, input:not([type]), input[type="text"]')){
    if(composerMenus.has(input)||!editableTextboxRect(input))continue;

    const paddingValue=input.style.getPropertyValue('--tt-textbox-original-padding');
    const paddingPriority=input.style.getPropertyPriority('--tt-textbox-original-padding');
    const padding=window.getComputedStyle(input).paddingRight||'0px';

    input.style.setProperty('--tt-textbox-original-padding',padding);
    input.classList.add('tt-textbox-menu-field');

    const button=makeMenuButton('…','tt-composer-meatball','フォロー・ブロック一覧');
    button.hidden=true;
    document.body.append(button);

    composerMenus.set(input,{button,paddingValue,paddingPriority});
    composerResizeObserver?.observe(input);

    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();

      if(!editableTextboxRect(input)){
        scheduleComposerMenus();
        return;
      }

      if(activeUserMenu?.trigger===button){
        closeUserMenu();
        return;
      }

      showUserMenu(button,listsPopup);
    });
  }

  positionTextboxMenus();
}

function scheduleComposerMenus() {
  if(composerScanPending)return;
  composerScanPending=true;
  window.requestAnimationFrame(()=>{
    composerScanPending=false;
    decorateChatComposers();
    if(activeUserMenu)positionUserMenu();
  });
}

function startUserMenuEvents() {
  if(menuEventsStarted)return;
  menuEventsStarted=true;

  document.addEventListener('pointerdown',event=>{
    if(
      activeUserMenu&&
      !activeUserMenu.trigger.contains(event.target)&&
      !activeUserMenu.popup.contains(event.target)
    )closeUserMenu();
  });

  document.addEventListener('keydown',event=>{
    if(!activeUserMenu)return;

    if(event.key==='Escape'){
      event.preventDefault();
      closeUserMenu(true);
    }else if(
      ['ArrowDown','ArrowUp','Home','End'].includes(event.key)&&
      (activeUserMenu.trigger===event.target||activeUserMenu.popup.contains(event.target))&&
      !event.target.matches('input, textarea')
    ){
      const items=Array.from(activeUserMenu.popup.querySelectorAll('[role="menuitem"]'));
      if(!items.length)return;
      event.preventDefault();
      const index=items.indexOf(document.activeElement);
      const next=event.key==='Home'?0:event.key==='End'?items.length-1:
        (index+(event.key==='ArrowUp'?-1:1)+items.length)%items.length;
      items[next].focus();
    }
  });

  window.addEventListener('resize',positionUserMenu);
  window.addEventListener('resize',scheduleComposerMenus);
  window.addEventListener('scroll',positionTextboxMenus,true);
  window.addEventListener('scroll',positionUserMenu,true);
  document.addEventListener('turbo:before-cache',()=>closeUserMenu());
}

function getProfileUserId() {
  const match=location.pathname.match(/^\/user\/(\d+)\/?$/);
  return match?match[1]:null;
}

function getProfileUserName(profileUsername) {
  const directText=Array.from(profileUsername.childNodes)
    .filter(node=>node.nodeType===Node.TEXT_NODE)
    .map(node=>node.textContent.trim())
    .filter(Boolean)
    .join(" ");
  return directText||"このユーザー";
}

function updateProfileActions(actions,userId) {
  const state=getUserState(userId);
  const followButton=actions.querySelector(`.${FOLLOW_BUTTON_CLASS}`);
  const nicknameButton=actions.querySelector(`.${NICKNAME_BUTTON_CLASS}`);
  const blockButton=actions.querySelector(`.${BLOCK_BUTTON_CLASS}`);

  if(followButton){
    followButton.textContent=state.following?"フォロー中":"フォロー";
    followButton.classList.toggle("is-following",state.following);
    followButton.setAttribute("aria-pressed",String(state.following));
    followButton.title=state.following?"フォローを解除します":"ユーザーをフォローします(★マークで強調)";
  }

  if(nicknameButton){
    nicknameButton.textContent=state.nickname?"独自の名前を変更":"独自の名前を設定";
    nicknameButton.classList.toggle("has-nickname",Boolean(state.nickname));
    nicknameButton.title=state.nickname?`現在の独自名: ${state.nickname}（空欄で解除）`:"自分のブラウザ内だけで表示する名前を設定";
  }

  if(blockButton){
    const blocked=isUserBlocked(userId);
    blockButton.textContent=blocked?"ブロック解除":"ブロック";
    blockButton.classList.toggle("is-blocked",blocked);
    blockButton.setAttribute("aria-pressed",String(blocked));
    blockButton.title=blocked?"このユーザーのブロックを解除します":"このユーザーのチャット発言を非表示にします";
  }
}

function refreshUser(userId) {
  document.querySelectorAll(`[${PROCESSED_ATTRIBUTE}]`).forEach(userName=>{
    if(userName.getAttribute(PROCESSED_ATTRIBUTE)===userId){
      applyUserState(userName,userId);
      const message=userName.closest(MESSAGE_SELECTOR);
      if(message)applyBlockState(message,userId);
    }
  });
  document.querySelectorAll(`.${PROFILE_ACTIONS_CLASS}`).forEach(actions=>{
    if(actions.dataset.userId===userId)updateProfileActions(actions,userId);
  });
}

function refreshAllUsers() {
  document.querySelectorAll(`[${PROCESSED_ATTRIBUTE}]`).forEach(userName=>{
    const userId=userName.getAttribute(PROCESSED_ATTRIBUTE);
    if(userId){
      applyUserState(userName,userId);
      const message=userName.closest(MESSAGE_SELECTOR);
      if(message)applyBlockState(message,userId);
    }
  });
  document.querySelectorAll(`.${PROFILE_ACTIONS_CLASS}`).forEach(actions=>{
    if(actions.dataset.userId)updateProfileActions(actions,actions.dataset.userId);
  });
  renderUserLists();
}

async function saveUserState(userId,nextState) {
  const updatedUsers={...followedUsers};
  const normalizedState={
    following:nextState.following===true,
    nickname:typeof nextState.nickname==="string"?nextState.nickname.trim():"",
    updatedAt:new Date().toISOString()
  };
  if(!normalizedState.following&&!normalizedState.nickname){
    delete updatedUsers[userId];
  }else{
    updatedUsers[userId]=normalizedState;
  }
  await GM_setValue(STORAGE_KEY,updatedUsers);
  followedUsers=updatedUsers;
  refreshUser(userId);
  renderUserLists();
}

async function toggleFollow(userId) {
  const state=getUserState(userId);
  try{
    await saveUserState(userId,{following:!state.following,nickname:state.nickname});
  }catch(error){
    console.error("TypingTubeのフォロー情報を保存できませんでした。",error);
    window.alert("フォロー情報を保存できませんでした。拡張機能を再読み込みして、もう一度お試しください。");
  }
}

async function editNickname(userId,typingTubeName) {
  const state=getUserState(userId);
  const input=window.prompt([
    "このユーザーの新しい名前を入力してください。",
    "空欄でも大丈夫です。",
    "フォロー状態には影響しません。",
    "",
    `TypingTube上の名前: ${typingTubeName}`,
    `ユーザーID: ${userId}`
  ].join("\n"),state.nickname);

  if(input===null)return;
  const nickname=input.trim();
  if(Array.from(nickname).length>20){
    window.alert("独自の名前は20文字以内にしてください。");
    return;
  }
  try{
    await saveUserState(userId,{following:state.following,nickname});
  }catch(error){
    console.error("TypingTubeの独自名を保存できませんでした。",error);
    window.alert("独自の名前を保存できませんでした。拡張機能を再読み込みしてください");
  }
}

async function toggleBlock(userId) {
  if(!/^\d+$/.test(String(userId)))return;
  const nextBlocked=!isUserBlocked(userId);
  const updatedBlocks={...blockedUsers};
  if(nextBlocked){
    updatedBlocks[userId]=true;
  }else{
    delete updatedBlocks[userId];
  }
  try{
    await GM_setValue(BLOCKED_STORAGE_KEY,updatedBlocks);
    blockedUsers=updatedBlocks;
    refreshUser(userId);
    renderUserLists();
  }catch(error){
    console.error("TypingTubeのブロック情報を保存できませんでした。",error);
    window.alert("ブロック情報を保存できませんでした。拡張機能を再読み込みして、もう一度お試しください。");
  }
}

function decorateProfilePage() {
  const userId=getProfileUserId();
  const profileUsername=document.querySelector(".profile-header .profile-username");
  if(!userId||!profileUsername)return;

  let actions=profileUsername.querySelector(`.${PROFILE_ACTIONS_CLASS}`);
  if(actions&&actions.dataset.userId!==userId){
    actions.remove();
    actions=null;
  }

  if(!actions){
    const typingTubeName=getProfileUserName(profileUsername);
    rememberUserName(userId,profileUsername);
    actions=document.createElement("span");
    actions.className=PROFILE_ACTIONS_CLASS;
    actions.dataset.userId=userId;

    const followButton=document.createElement("button");
    followButton.type="button";
    followButton.className=FOLLOW_BUTTON_CLASS;
    followButton.addEventListener("click",()=>toggleFollow(userId));

    const nicknameButton=document.createElement("button");
    nicknameButton.type="button";
    nicknameButton.className=NICKNAME_BUTTON_CLASS;
    nicknameButton.addEventListener("click",()=>editNickname(userId,typingTubeName));

    const blockButton=document.createElement("button");
    blockButton.type="button";
    blockButton.className=BLOCK_BUTTON_CLASS;
    blockButton.addEventListener("click",()=>toggleBlock(userId));

    actions.append(followButton,nicknameButton,blockButton);

    const ratingBadge=profileUsername.querySelector(".battle-rating-badge");
    if(ratingBadge){
      ratingBadge.insertAdjacentElement("afterend",actions);
    }else{
      profileUsername.append(actions);
    }
  }

  updateProfileActions(actions,userId);
}

function decorateMessage(message) {
  if(!(message instanceof Element)||!message.matches(MESSAGE_SELECTOR))return;
  const userName=message.querySelector(USER_SELECTOR);
  const reportButton=message.querySelector(REPORT_SELECTOR);
  const userId=reportButton?.dataset.reportedUserId?.trim();

  message.querySelectorAll(`.${OLD_FAVORITE_BUTTON_CLASS}, .${PROFILE_BUTTON_CLASS}, .${BLOCK_BUTTON_CLASS}`)
    .forEach(button=>button.remove());

  if(!userName||!reportButton||!userId)return;

  let trigger=message.querySelector('.tt-comment-kebab');

  if(!trigger){
    trigger=makeMenuButton('⋮','tt-comment-kebab','このコメントのユーザーメニュー');
    reportButton.insertAdjacentElement('afterend',trigger);

    trigger.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();

      if(activeUserMenu?.trigger===trigger){
        closeUserMenu();
        return;
      }

      const id=trigger.dataset.userId;
      const popup=getCommentPopup();
      popup.dataset.userId=id;

      const profile=popup.querySelector('a');
      profile.href=`/user/${encodeURIComponent(id)}`;
      profile.setAttribute('aria-label',`${trigger.dataset.userName}のプロフィールを開く`);

      const block=popup.querySelector('button');
      block.textContent=isUserBlocked(id)?'ブロック解除':'ブロック';
      block.setAttribute('aria-pressed',String(isUserBlocked(id)));

      showUserMenu(trigger,popup);
    });
  }

  trigger.dataset.userId=userId;
  trigger.dataset.userName=getOriginalName(userName);

  if(userName.getAttribute(PROCESSED_ATTRIBUTE)!==userId){
    userName.style.setProperty('--tt-user-hue',colorFromUserId(userId).toFixed(2));
    userName.setAttribute(PROCESSED_ATTRIBUTE,userId);
    getOriginalName(userName);
  }

  rememberUserName(userId,userName);
  markUserOnline(userId);
  applyUserState(userName,userId);
  applyBlockState(message,userId);
}

function decorateMessagesInside(root) {
  if(!(root instanceof Element||root instanceof Document))return;
  if(root instanceof Element&&root.matches(MESSAGE_SELECTOR))decorateMessage(root);
  root.querySelectorAll(MESSAGE_SELECTOR).forEach(decorateMessage);
}

function getLiveEventId() {
  const match=location.pathname.match(/\/live_events\/(\d+)(?:\/|$)/);
  return match?match[1]:null;
}

function readReactionQuantity(input) {
  const quantity=Number(input.value);
  if(!Number.isInteger(quantity)||quantity<1||quantity>MAX_REACTION_QUANTITY){
    window.alert(`個数は1～${MAX_REACTION_QUANTITY}の整数で指定してください。`);
    input.focus();
    return null;
  }
  return quantity;
}

function setReactionStatus(controls,text,isError=false) {
  const status=controls.querySelector(`.${REACTION_STATUS_CLASS}`);
  if(!status)return;
  status.textContent=text;
  status.classList.toggle("is-error",isError);
}

function decorateReactionShop(shop) {
  if(!(shop instanceof Element)||shop.querySelector(`.${REACTION_CONTROLS_CLASS}`))return;

  const controls=document.createElement("div");
  controls.className=REACTION_CONTROLS_CLASS;

  const label=document.createElement("label");
  label.className="tt-reaction-quantity-label";
  label.textContent="まとめて購入 ";

  const input=document.createElement("input");
  input.type="number";
  input.className=REACTION_QUANTITY_CLASS;
  input.min="1";
  input.max=String(MAX_REACTION_QUANTITY);
  input.step="1";
  input.value="1";
  input.inputMode="numeric";
  input.setAttribute("aria-label","まとめて購入するリアクションの個数");
  input.title="1個の場合はTypingTube標準の通信方法を使用します";

  const unit=document.createElement("span");
  unit.textContent="個";

  const status=document.createElement("span");
  status.className=REACTION_STATUS_CLASS;
  status.setAttribute("role","status");
  status.setAttribute("aria-live","polite");

  label.append(input,unit);

  const hint=document.createElement("span");
  hint.textContent=`1～${MAX_REACTION_QUANTITY}個。個数を指定してアイテムをクリック`;
  hint.style.cssText="font-size:0.75rem;color:#4b5563;";

  controls.append(label,hint,status);
  shop.prepend(controls);
}

function decorateReactionShopsInside(root) {
  if(!(root instanceof Element||root instanceof Document))return;
  if(root instanceof Element){
    const shop=root.closest(REACTION_SHOP_SELECTOR);
    if(shop)decorateReactionShop(shop);
  }
  root.querySelectorAll(REACTION_SHOP_SELECTOR).forEach(decorateReactionShop);
}

async function sendBulkReaction(card,controls,quantity) {
  if(reactionRequestPending){
    setReactionStatus(controls,"送信中です。",true);
    return;
  }

  const eventId=getLiveEventId();
  const slotId=card.dataset.slotId?.trim();
  const slotCost=Number(card.dataset.slotCost);
  const csrfToken=document.querySelector('meta[name="csrf-token"]')?.content;

  if(!eventId||!slotId){
    window.alert("ライブイベント、リアクションIDを取得できませんでした。");
    return;
  }

  if(!csrfToken){
    window.alert("送信用のCSRFトークンを取得できませんでした。");
    return;
  }

  const totalCost=Number.isFinite(slotCost)?slotCost*quantity:null;
  const costText=totalCost===null?"":`\n必要Beat: ${totalCost}`;
  const confirmed=window.confirm(
    `このリアクションを${quantity}個まとめて購入しますか？${costText}`+
    "\n\n複数購入リクエストは1回だけ送信されます。"
  );

  if(!confirmed)return;

  reactionRequestPending=true;
  controls.classList.add("is-sending");
  setReactionStatus(controls,`${quantity}個を送信中…`);

  try{
    const response=await fetch(`/api/live_events/${encodeURIComponent(eventId)}/reactions`,{
      method:"POST",
      credentials:"same-origin",
      headers:{
        Accept:"application/json",
        "Content-Type":"application/json",
        "X-CSRF-Token":csrfToken
      },
      body:JSON.stringify({slot_id:slotId,quantity})
    });

    let responseData=null;
    try{
      responseData=await response.json();
    }catch(_error){}

    if(!response.ok){
      const message=responseData?.error||responseData?.message||`${response.status} ${response.statusText}`;
      throw new Error(message);
    }

    setReactionStatus(controls,`${quantity}個の購入が受理されました。`);
  }catch(error){
    console.error("リアクションのまとめて購入に失敗しました。",error);
    setReactionStatus(controls,"送信に失敗しました。",true);
    window.alert(`リアクションを購入できませんでした。\n${error.message||error}`);
  }finally{
    reactionRequestPending=false;
    controls.classList.remove("is-sending");
  }
}

function startReactionQuantityHandler() {
  document.addEventListener("click",event=>{
    const card=event.target.closest?.(REACTION_CARD_SELECTOR);
    if(!card)return;

    const shop=card.closest(REACTION_SHOP_SELECTOR);
    const controls=shop?.querySelector(`.${REACTION_CONTROLS_CLASS}`);
    const input=controls?.querySelector(`.${REACTION_QUANTITY_CLASS}`);
    if(!controls||!input)return;

    const quantity=readReactionQuantity(input);

    if(quantity===null){
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if(quantity===1)return;

    event.preventDefault();
    event.stopImmediatePropagation();
    void sendBulkReaction(card,controls,quantity);
  },true);
}

function getPrepurchaseQuantity(item) {
  const text=item.querySelector(".lh-prepurchase-item-qty")?.textContent||"";
  const match=text.match(/(\d+)/);
  return match?Number(match[1]):0;
}

function getPrepurchaseUnitCost(section,slotId) {
  const card=Array.from(section.querySelectorAll(".lh-reaction-card[data-slot-id][data-slot-cost]"))
    .find(candidate=>candidate.dataset.slotId===slotId);
  const cost=Number(card?.dataset.slotCost);
  return Number.isFinite(cost)&&cost>=0?cost:null;
}

function setPrepurchaseStatus(controls,text,isError=false) {
  const status=controls.querySelector(`.${PREPURCHASE_STATUS_CLASS}`);
  if(!status)return;
  status.textContent=text;
  status.classList.toggle("is-error",isError);
}

function readPrepurchaseAddQuantity(input) {
  const quantity=Number(input.value);
  if(!Number.isSafeInteger(quantity)||quantity<1){
    window.alert("追加数は1以上の整数で指定してください。");
    input.focus();
    return null;
  }
  return quantity;
}

function syncPrepurchaseDisplay(section,responseData,slotId,previousQuantity,unitCost) {
  if(!responseData||!Array.isArray(responseData.prepurchases))return false;

  const activePurchases=responseData.prepurchases.filter(purchase=>purchase?.active!==false);
  const updated=activePurchases.find(purchase=>String(purchase.slot_id)===slotId);
  if(!updated||!Number.isSafeInteger(Number(updated.quantity)))return false;

  const plusButton=Array.from(section.querySelectorAll(".lh-prepurchase-plus[data-slot-id]"))
    .find(button=>button.dataset.slotId===slotId);

  const item=plusButton?.closest(PREPURCHASE_ITEM_SELECTOR);
  const newQuantity=Number(updated.quantity);

  if(item){
    const quantityDisplay=item.querySelector(".lh-prepurchase-item-qty");
    const costDisplay=item.querySelector(".lh-prepurchase-item-cost");
    const removeButton=item.querySelector(".lh-prepurchase-remove");

    if(quantityDisplay)quantityDisplay.textContent=`×${newQuantity}`;

    if(costDisplay&&Number.isFinite(Number(updated.beat_cost_total))){
      costDisplay.innerHTML=`<i class="bi bi-coin"></i> ${Number(updated.beat_cost_total)}`;
    }

    if(removeButton){
      removeButton.dataset.quantity=String(newQuantity);
      if(Number.isFinite(Number(updated.beat_cost_total))){
        removeButton.dataset.refund=String(Number(updated.beat_cost_total));
      }
    }
  }

  const mineCount=section.querySelector('[data-live-event-prepurchase-target="mineCount"]');
  if(mineCount)mineCount.textContent=`(${activePurchases.length})`;

  const addedQuantity=Math.max(0,newQuantity-previousQuantity);
  const balanceDisplay=section.querySelector('[data-live-event-prepurchase-target="balance"]');
  const currentBalance=Number(balanceDisplay?.textContent.replace(/[^0-9-]/g,""));

  if(balanceDisplay&&unitCost!==null&&Number.isFinite(currentBalance)){
    const nextBalance=Math.max(0,currentBalance-addedQuantity*unitCost);
    balanceDisplay.textContent=String(nextBalance);
    section.dataset.liveEventPrepurchaseBeatBalanceValue=String(nextBalance);
  }

  return true;
}

async function addPrepurchaseQuantity(item,controls,quantity) {
  if(prepurchaseRequestPending){
    setPrepurchaseStatus(controls,"※別の事前購入を送信中です。",true);
    return;
  }

  const section=item.closest(PREPURCHASE_SECTION_SELECTOR);
  const plusButton=item.querySelector(".lh-prepurchase-plus[data-slot-id]");
  const eventId=section?.dataset.liveEventPrepurchaseEventIdValue?.trim();
  const slotId=plusButton?.dataset.slotId?.trim();
  const csrfToken=document.querySelector('meta[name="csrf-token"]')?.content;

  if(!section||!eventId||!slotId){
    window.alert("イベントID、リアクションIDを取得できませんでした。");
    return;
  }

  if(!csrfToken){
    window.alert("送信用のCSRFトークンを取得できませんでした。");
    return;
  }

  const previousQuantity=getPrepurchaseQuantity(item);
  const unitCost=getPrepurchaseUnitCost(section,slotId);
  const costText=unitCost===null?"":`\n必要Beat: ${unitCost*quantity}`;
  const confirmed=window.confirm(
    `この事前リアクションを${quantity}個追加しますか？${costText}`+
    "\n\nまとめて購入リクエストは1回だけ送信します。"
  );

  if(!confirmed)return;

  prepurchaseRequestPending=true;
  controls.classList.add("is-sending");
  setPrepurchaseStatus(controls,`${quantity}個を追加中…`);

  const endpoint=`/api/live_events/${encodeURIComponent(eventId)}/prepurchases`;

  try{
    const response=await fetch(endpoint,{
      method:"POST",
      credentials:"same-origin",
      headers:{
        Accept:"application/json",
        "Content-Type":"application/json",
        "X-CSRF-Token":csrfToken
      },
      body:JSON.stringify({slot_id:slotId,quantity})
    });

    let responseData=null;
    try{
      responseData=await response.json();
    }catch(_error){}

    if(!response.ok){
      const message=responseData?.error||responseData?.message||`${response.status} ${response.statusText}`;
      throw new Error(message);
    }

    const refreshResponse=await fetch(endpoint,{
      method:"GET",
      credentials:"same-origin",
      headers:{Accept:"application/json"},
      cache:"no-store"
    });

    if(refreshResponse.ok)responseData=await refreshResponse.json();

    const synced=syncPrepurchaseDisplay(section,responseData,slotId,previousQuantity,unitCost);
    const actual=responseData?.prepurchases?.find(purchase=>String(purchase.slot_id)===slotId);
    const added=actual?Math.max(0,Number(actual.quantity)-previousQuantity):quantity;

    controls.querySelector(`.${PREPURCHASE_INPUT_CLASS}`).value="1";
    setPrepurchaseStatus(
      controls,
      synced?`${added}個追加しました。`:"追加しました。表示更新にはページを再読み込みしてください"
    );
  }catch(error){
    console.error("事前リアクションのまとめて追加に失敗しました。",error);
    setPrepurchaseStatus(controls,"追加に失敗しました。",true);
    window.alert(`事前リアクションを追加できませんでした。\n${error.message||error}`);
  }finally{
    prepurchaseRequestPending=false;
    controls.classList.remove("is-sending");
  }
}

function decoratePrepurchaseItem(item) {
  if(!(item instanceof Element)||item.querySelector(`.${PREPURCHASE_CONTROLS_CLASS}`))return;
  const plusButton=item.querySelector(".lh-prepurchase-plus[data-slot-id]");
  const actions=item.querySelector(".lh-prepurchase-item-actions");
  if(!plusButton||!actions)return;

  const controls=document.createElement("span");
  controls.className=PREPURCHASE_CONTROLS_CLASS;

  const input=document.createElement("input");
  input.type="number";
  input.className=PREPURCHASE_INPUT_CLASS;
  input.min="1";
  input.step="1";
  input.value="1";
  input.inputMode="numeric";
  input.setAttribute("aria-label","追加する事前リアクションの個数");

  const addButton=document.createElement("button");
  addButton.type="button";
  addButton.className=PREPURCHASE_BUTTON_CLASS;
  addButton.textContent="指定数を追加";

  const status=document.createElement("span");
  status.className=PREPURCHASE_STATUS_CLASS;
  status.setAttribute("role","status");
  status.setAttribute("aria-live","polite");

  addButton.addEventListener("click",()=>{
    const quantity=readPrepurchaseAddQuantity(input);
    if(quantity!==null)void addPrepurchaseQuantity(item,controls,quantity);
  });

  controls.append(input,addButton,status);
  plusButton.insertAdjacentElement("afterend",controls);
}

function decoratePrepurchaseItemsInside(root) {
  if(!(root instanceof Element||root instanceof Document))return;
  if(root instanceof Element&&root.matches(PREPURCHASE_ITEM_SELECTOR))decoratePrepurchaseItem(root);
  root.querySelectorAll(PREPURCHASE_ITEM_SELECTOR).forEach(decoratePrepurchaseItem);
}

function startObserver() {
  const observer=new MutationObserver(mutations=>{
    let profileHeaderAdded=false;
    let composerChanged=false;

    for(const mutation of mutations){
      if(
        mutation.target instanceof Element&&
        mutation.target.closest('.tt-composer-meatball, .tt-user-popup, #tt-cloud-id-search-v006')
      )continue;

      composerChanged=true;

      if(mutation.target instanceof Element){
        const shop=mutation.target.closest(REACTION_SHOP_SELECTOR);
        if(shop)decorateReactionShop(shop);

        if(
          mutation.type==="attributes"&&
          mutation.attributeName==="data-live-event-target"
        ){
          decorateReactionShopsInside(mutation.target);
        }
      }

      for(const node of mutation.addedNodes){
        if(!(node instanceof Element))continue;
        decorateMessagesInside(node);
        decorateReactionShopsInside(node);
        decoratePrepurchaseItemsInside(node);
        if(node.matches(".profile-header")||node.querySelector(".profile-header")){
          profileHeaderAdded=true;
        }
      }

      if(mutation.type==="attributes"&&mutation.attributeName==="data-reported-user-id"){
        const message=mutation.target.closest?.(MESSAGE_SELECTOR);
        if(message)decorateMessage(message);
      }
    }

    if(composerChanged)scheduleComposerMenus();
    if(profileHeaderAdded)decorateProfilePage();
  });

  observer.observe(document.documentElement,{
    childList:true,
    subtree:true,
    attributes:true,
    attributeFilter:[
      "data-reported-user-id",
      "data-live-event-target",
      "data-lobby-chat-target",
      "data-room-chat-target",
      "data-battle-room-target",
      "data-battle-lobby-target",
      "data-battle-play-target",
      "data-action",
      "id",
      "name",
      "type",
      "disabled",
      "placeholder",
      "class",
      "style",
      "hidden",
      "readonly",
      "inert",
      "aria-hidden",
      "aria-label",
      "role"
    ]
  });
}

function normalizeStoredUsers(value) {
  if(!value||typeof value!=="object"||Array.isArray(value))return{};
  const normalized={};
  for(const[userId,state]of Object.entries(value)){
    if(!/^\d+$/.test(userId)||!state||typeof state!=="object")continue;
    const following=state.following===true;
    const nickname=typeof state.nickname==="string"?state.nickname.trim():"";
    if(following||nickname)normalized[userId]={following,nickname};
  }
  return normalized;
}

function migrateLegacyFavorites(legacyFavorites) {
  if(!legacyFavorites||typeof legacyFavorites!=="object"||Array.isArray(legacyFavorites))return{};
  const migrated={};
  for(const[userId,favorite]of Object.entries(legacyFavorites)){
    if(!/^\d+$/.test(userId)||!favorite||typeof favorite!=="object")continue;
    migrated[userId]={
      following:true,
      nickname:typeof favorite.nickname==="string"?favorite.nickname.trim():"",
      migratedAt:new Date().toISOString()
    };
  }
  return migrated;
}

function normalizeBlockedUsers(value) {
  if(!value||typeof value!=="object"||Array.isArray(value))return{};
  const normalized={};
  for(const[userId,blocked]of Object.entries(value)){
    if(/^\d+$/.test(userId)&&blocked===true)normalized[userId]=true;
  }
  return normalized;
}

async function initialize() {
  hideChatReactions=GM_getValue(HIDE_CHAT_REACTIONS_KEY,false)===true;
  applyChatReactionVisibility();

  try{
    const current=GM_getValue(STORAGE_KEY,null);
    const blocked=GM_getValue(BLOCKED_STORAGE_KEY,{});
    const savedNames=GM_getValue(USER_NAMES_STORAGE_KEY,{});

    if(savedNames&&typeof savedNames==="object"){
      Object.entries(savedNames).forEach(([userId,name])=>{
        if(/^\d+$/.test(String(userId))&&typeof name==="string"&&name.trim()){
          knownUserNames.set(String(userId),name.trim());
        }
      });
    }

    const stored={
      [STORAGE_KEY]:current,
      [LEGACY_STORAGE_KEY]:GM_getValue(LEGACY_STORAGE_KEY,null)
    };

    const hasNewStorage=current!==null;
    blockedUsers=normalizeBlockedUsers(blocked);

    if(hasNewStorage){
      followedUsers=normalizeStoredUsers(stored[STORAGE_KEY]);
    }else{
      followedUsers=migrateLegacyFavorites(stored[LEGACY_STORAGE_KEY]);
      if(Object.keys(followedUsers).length>0){
        await GM_setValue(STORAGE_KEY,followedUsers);
      }
    }
  }catch(error){
    console.error("TypingTubeのフォロー情報を読み込めませんでした。",error);
  }

  createUserListsToolbar();
  startUserMenuEvents();

  window.setInterval(()=>{
    if(userListsPanel&&!userListsPanel.hidden)renderUserLists();
  },30*1000);

  decorateMessagesInside(document);
  decorateProfilePage();
  decorateReactionShopsInside(document);
  decoratePrepurchaseItemsInside(document);
  startReactionQuantityHandler();
  startObserver();

  document.addEventListener("turbo:load",()=>{
    closeUserMenu();
    createUserListsToolbar();
    decorateMessagesInside(document);
    decorateProfilePage();
    decorateReactionShopsInside(document);
    decoratePrepurchaseItemsInside(document);
  });

  GM_addValueChangeListener(HIDE_CHAT_REACTIONS_KEY,(_key,_oldValue,newValue)=>{
    hideChatReactions=newValue===true;
    applyChatReactionVisibility();
  });

  GM_addValueChangeListener(STORAGE_KEY,(_key,_oldValue,newValue)=>{
    followedUsers=normalizeStoredUsers(newValue);
    refreshAllUsers();
  });

  GM_addValueChangeListener(BLOCKED_STORAGE_KEY,(_key,_oldValue,newValue)=>{
    blockedUsers=normalizeBlockedUsers(newValue);
    refreshAllUsers();
  });

  GM_addValueChangeListener(USER_NAMES_STORAGE_KEY,(_key,_oldValue,newValue)=>{
    knownUserNames.clear();
    if(newValue&&typeof newValue==="object"){
      Object.entries(newValue).forEach(([userId,name])=>{
        if(/^\d+$/.test(String(userId))&&typeof name==="string"&&name.trim()){
          knownUserNames.set(String(userId),name.trim());
        }
      });
    }
    renderUserLists();
  });
}

initialize();
})();

GM_addStyle(`
.tt-comment-kebab, .tt-composer-meatball {
  box-sizing: border-box !important; display: inline-flex !important;
  flex: 0 0 32px !important; width: 32px !important; height: 32px !important;
  align-items: center; justify-content: center; padding: 0 !important;
  border: 1px solid #9ba5af !important; border-radius: 4px !important;
  background: #fff !important; color: #263544 !important;
  font: 700 22px/1 sans-serif !important; cursor: pointer;
  vertical-align: middle; margin: 0 3px; touch-action: manipulation;
}
.tt-comment-kebab { flex-basis: 24px !important; width: 24px !important; height: 26px !important; }
.tt-comment-kebab:hover, .tt-composer-meatball:hover { background: #edf3fa !important; }
.tt-comment-kebab:focus-visible, .tt-composer-meatball:focus-visible, .tt-menu-item:focus-visible {
  outline: 2px solid #1976d2 !important; outline-offset: 2px;
}
.tt-textbox-menu-field {
  box-sizing: border-box !important;
  padding-right: calc(var(--tt-textbox-original-padding, 0px) + 38px) !important;
}
.tt-composer-meatball {
  position: fixed !important; z-index: 2147483099 !important;
  flex: none !important; margin: 0 !important;
  width: var(--tt-textbox-menu-size, 32px) !important;
  height: var(--tt-textbox-menu-size, 32px) !important;
}
.tt-composer-meatball[hidden] { display: none !important; }
.tt-user-popup {
  position: fixed !important; right: auto !important; bottom: auto !important;
  z-index: 2147483100 !important; width: min(220px, calc(100vw - 16px));
  box-sizing: border-box; padding: 5px; margin: 0; overflow: auto;
  border: 1px solid #b6c2ce; border-radius: 7px; background: #fff; color: #22313f;
  box-shadow: 0 5px 20px #0003; font: 13px/1.5 sans-serif;
}
.tt-user-popup[hidden] { display: none !important; }
.tt-user-popup .tt-menu-item {
  box-sizing: border-box !important; display: flex !important; width: 100% !important;
  min-height: 38px !important; height: 38px !important; align-items: center !important;
  justify-content: flex-start !important; padding: 8px 12px !important; margin: 0 !important;
  border: 0 !important; border-radius: 4px !important; background: #fff !important;
  color: #22313f !important; font: 13px/1.5 sans-serif !important;
  text-decoration: none !important; text-align: left !important; cursor: pointer;
}
.tt-user-popup .tt-menu-item:hover { background: #edf3fa !important; }
.tt-user-list-panel.tt-user-popup { width: min(380px, calc(100vw - 16px)); padding: 12px; user-select: text; }
.tt-user-list-panel .tt-user-list-title {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  cursor: default !important; touch-action: auto !important;
}
.tt-list-tabs { display: flex; gap: 6px; margin-bottom: 8px; }
`);

(() => {
'use strict';

if(window.top!==window||document.getElementById('tt-cloud-id-search-v006'))return;

const DEFAULT_DATA_URL='https://raw.githubusercontent.com/takesann55/typingtube-ranking-data/main/typingtube_rankings_v001.bin';
const STORAGE_KEY='tt-cloud-rank-data-url-v006';
const CHOICE_KEY='tt-cloud-rank-choice-v080';
const CATALOG_KEY='tt-cloud-rank-catalog-v080';
const DATE_KEY='tt-cloud-rank-dates-v080';
const CACHE_TTL=60*60*1000;
const MAX_RESULTS=100;
const FILE_PATTERN=/^typingtube_rankings_v(\d+)\.bin$/;

let rows=[],anchor=null,open=false,settingsOpen=false;
let catalog=[],catalogIdentity='',catalogPromise=null,catalogGeneration=0;
let loadGeneration=0,loadedLabel='',loadedURL='',datesPromise=null;
let apiBlockedUntil=0;

const oldURL=GM_getValue(STORAGE_KEY,DEFAULT_DATA_URL);
let choice=GM_getValue(CHOICE_KEY,null);

if(!choice||!['latest','file','custom'].includes(choice.mode)||typeof choice.url!=='string'){
  choice={mode:oldURL===DEFAULT_DATA_URL?'latest':'custom',url:oldURL||DEFAULT_DATA_URL};
}

let dateCache=GM_getValue(DATE_KEY,{});
if(!dateCache||typeof dateCache!=='object'||Array.isArray(dateCache))dateCache={};

const normalize=value=>String(value).normalize('NFKC').toLocaleLowerCase('ja-JP');

const make=(tag,className,label)=>{
  const element=document.createElement(tag);
  if(className)element.className=className;
  if(label!==undefined)element.textContent=label;
  return element;
};

const safeSave=async(key,value)=>{
  try{
    await GM_setValue(key,value);
  }catch(error){
    console.warn('TypingTube設定の保存に失敗しました。',error);
  }
};

function parseRawURL(value) {
  const url=new URL(value);
  if(url.protocol!=='https:'||url.hostname!=='raw.githubusercontent.com'){
    throw new Error('GitHubのRaw URLを指定してください');
  }
  const parts=url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if(parts.length<4||parts.some(part=>part==='.'||part==='..')){
    throw new Error('ファイルのURLが不正です');
  }
  const[owner,repo,ref,...rest]=parts;
  const path=rest.join('/');
  const slash=path.lastIndexOf('/');
  return{
    owner,repo,ref,path,
    dir:slash<0?'':path.slice(0,slash),
    identity:`${owner}/${repo}/${ref}/${slash<0?'':path.slice(0,slash)}`
  };
}

function rawFileURL(source,path) {
  return`https://raw.githubusercontent.com/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}/${encodeURIComponent(source.ref)}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

function apiBase(source) {
  return`https://api.github.com/repos/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}`;
}

function dateText(value) {
  const date=new Date(value);
  return value&&Number.isFinite(date.getTime())?
    new Intl.DateTimeFormat('ja-JP',{
      timeZone:'Asia/Tokyo',
      year:'numeric',
      month:'2-digit',
      day:'2-digit',
      hour:'2-digit',
      minute:'2-digit',
      hour12:false
    }).format(date)+'（日本時間）':
    '取得できませんでした';
}

function captureText(file) {
  return file.url===DEFAULT_DATA_URL?'収集日：2026年9月25日':'収集日：未登録';
}

function versionText(file) {
  return`v${file.version} ／ ${captureText(file).replace('収集日：','')}`;
}

const host=make('div');
host.id='tt-cloud-id-search-v006';
const root=host.attachShadow({mode:'open'});
const css=make('style');

css.textContent=`
    :host { all: initial; } * { box-sizing: border-box; }
    button, input, select { font: inherit; }
    .search-row { display: flex; gap: 5px; align-items: center; height: 100%; font: 14px sans-serif; }
    .query { flex: 1; min-width: 0; width: 100%; height: 100%; padding: 0 10px;
      border: 1px solid #aab6c1; border-radius: 6px; background: #fff; color: #17202a; }
    .query:focus { outline: 2px solid #2680c2; }
    button { border: 1px solid #aab6c1; border-radius: 6px; background: #fff; color: #17202a;
      cursor: pointer; padding: 5px 8px; }
    button:hover { background: #edf3fa; } button:disabled { opacity: .6; cursor: wait; }
    .gear { height: 100%; flex: none; }
    .drop { position: absolute; top: calc(100% + 6px); right: 0;
      width: min(480px, calc(100vw - 24px)); max-height: min(650px, calc(100vh - 100px));
      overflow: auto; background: #fff; color: #17202a; border: 1px solid #bbc8d3;
      border-radius: 10px; box-shadow: 0 8px 28px #0005; padding: 12px; font: 14px/1.5 sans-serif; }
    [hidden] { display: none !important; }
    .head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
    .head strong { font-size: 15px; } .head-actions { display: flex; align-items: center; gap: 8px; }
    .status, .catalog-status { color: #425568; margin: 8px 0; overflow-wrap: anywhere; }
    .settings { border: 1px solid #d9e2ea; border-radius: 7px; padding: 10px; margin: 8px 0; }
    label { display: block; font-size: 12px; margin: 6px 0 4px; }
    .settings-row { display: flex; gap: 6px; align-items: center; }
    .version-select, .url { min-width: 0; flex: 1; width: 100%; padding: 6px;
      border: 1px solid #aab6c1; border-radius: 5px; background: #fff; color: #17202a; }
    .note { color: #586a7a; font-size: 12px; margin: 7px 0; }
    .history { list-style: none; margin: 0 0 10px; padding: 0; max-height: 250px; overflow: auto; }
    .history-item { border-top: 1px solid #dce5ee; padding: 9px 0; }
    .history-item.is-selected { background: #edf5ff; }
    .history-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .history-date, .history-file { font-size: 12px; color: #506273; overflow-wrap: anywhere; }
    summary { cursor: pointer; font-size: 12px; }
    .results { list-style: none; padding: 0; margin: 0; }
    .item { border-top: 1px solid #e1e7ed; padding: 9px 0; overflow-wrap: anywhere; }
    .title { font-weight: 600; } .meta { color: #425568; margin: 4px 0; }
    .actions { display: flex; align-items: center; gap: 10px; }
    a { color: #07569d; text-decoration: underline; }
`;

root.append(css);

const searchRow=make('div','search-row');
const query=make('input','query');
query.type='search';
query.placeholder='ランキングから曲ID検索';
query.autocomplete='off';
query.setAttribute('aria-label','月間ランキングの曲名からIDを検索');

const gear=make('button','gear','⚙');
gear.type='button';
gear.title='ランキングの版・更新履歴';

searchRow.append(query,gear);

const drop=make('div','drop');
drop.hidden=true;

const head=make('div','head');
const repoLink=make('a','','GitHubの更新履歴');
repoLink.href='https://github.com/takesann55/typingtube-ranking-data';
repoLink.target='_blank';
repoLink.rel='noopener noreferrer';

const close=make('button','close','×');
close.type='button';
close.setAttribute('aria-label','検索結果を閉じる');

const headActions=make('div','head-actions');
headActions.append(repoLink,close);
head.append(make('strong','','月間ランキング 曲ID検索'),headActions);

const status=make('div','status','ランキングを読み込み中…');
status.setAttribute('aria-live','polite');

const settings=make('section','settings');
settings.hidden=true;

const versionLabel=make('label','','検索するランキングの版');
versionLabel.htmlFor='tt-ranking-version';

const versionSelect=make('select','version-select');
versionSelect.id='tt-ranking-version';

const refresh=make('button','','履歴を更新');
refresh.type='button';

const selectRow=make('div','settings-row');
selectRow.append(versionSelect,refresh);

const catalogStatus=make('div','catalog-status','公開されている版を確認中…');
catalogStatus.setAttribute('aria-live','polite');

const history=make('ol','history');
const explanation=make('p','note','収集日はランキングを記録した日です。GitHub追加・最終変更はコミット記録の日時で、収集日とは異なります。');

const advanced=make('details');
advanced.append(make('summary','','詳細設定：別のRaw URLを使う'));

const urlInput=make('input','url');
urlInput.type='url';
urlInput.value=choice.url;
urlInput.setAttribute('aria-label','ランキングデータのGitHub Raw URL');

const load=make('button','load','読込');
load.type='button';

const advancedRow=make('div','settings-row');
advancedRow.append(urlInput,load);
advanced.append(advancedRow);

settings.append(versionLabel,selectRow,catalogStatus,explanation,history,advanced);

const results=make('ul','results');
drop.append(head,status,settings,results);
root.append(searchRow,drop);
document.body.append(host);

function showDrop() {
  open=true;
  drop.hidden=false;
}

function hideDrop() {
  open=false;
  drop.hidden=true;
}

function toggleSettings() {
  settingsOpen=!settingsOpen;
  settings.hidden=!settingsOpen;
  showDrop();
  if(settingsOpen){
    versionSelect.focus();
    void refreshCatalog().then(()=>hydrateDates()).catch(showCatalogError);
  }
}

function position() {
  const found=document.querySelector('#topbarSearchInput.topbar-search-input');

  if(!found?.isConnected||!found.getClientRects().length){
    anchor=null;
    host.style.display='none';
    hideDrop();
    return;
  }

  anchor=found;
  const rect=found.getBoundingClientRect();
  const width=Math.min(265,window.innerWidth-rect.right-20);
  host.style.position='fixed';
  host.style.zIndex='2147483000';

  const left=width>=160?rect.right+8:Math.max(8,rect.left);

  host.style.left=`${Math.round(left)}px`;
  host.style.top=`${Math.round(width>=160?rect.top:rect.bottom+5)}px`;
  host.style.width=`${Math.round(width>=160?width:Math.max(120,Math.min(265,window.innerWidth-left-12)))}px`;
  host.style.height=`${Math.max(30,Math.round(rect.height))}px`;
  host.style.display='block';

  drop.style.right='auto';
  drop.style.left=`${Math.min(0,window.innerWidth-left-Math.min(480,window.innerWidth-24)-12)}px`;
  drop.style.maxHeight=`${Math.max(100,window.innerHeight-parseFloat(host.style.top)-rect.height-18)}px`;
}

function requestGitHub(url,responseType='json') {
  const parsed=new URL(url);

  if(parsed.protocol!=='https:'||!['api.github.com','raw.githubusercontent.com'].includes(parsed.hostname)){
    return Promise.reject(new Error('対応していないデータ取得先です'));
  }

  const isAPI=parsed.hostname==='api.github.com';

  if(isAPI&&Date.now()<apiBlockedUntil){
    return Promise.reject(new Error('GitHubの取得制限中です。時間をおいて履歴を更新してください。'));
  }

  return new Promise((resolve,reject)=>{
    GM_xmlhttpRequest({
      method:'GET',
      url:parsed.href,
      responseType,
      timeout:30000,
      anonymous:true,
      nocache:true,
      headers:isAPI?{
        Accept:'application/vnd.github+json',
        'X-GitHub-Api-Version':'2022-11-28'
      }:{},

      onload:response=>{
        if(response.status!==200){
          if(isAPI&&[403,429].includes(response.status)){
            const reset=response.responseHeaders?.match(/^x-ratelimit-reset:\s*(\d+)/im)?.[1];
            apiBlockedUntil=Math.max(
              Date.now()+60*1000,
              reset?Number(reset)*1000:Date.now()+15*60*1000
            );
          }

          reject(new Error(
            isAPI&&[403,429].includes(response.status)?
              'GitHubの取得制限中です。時間をおいて再試行してください。':
              `HTTP ${response.status}`
          ));
          return;
        }

        try{
          const data=responseType==='json'?
            (
              typeof response.response==='string'?
                JSON.parse(response.response):
                response.response??JSON.parse(response.responseText)
            ):
            response.response;

          resolve({data,headers:response.responseHeaders||''});
        }catch(_){
          reject(new Error('データを読み取れませんでした'));
        }
      },

      onerror:()=>reject(new Error('通信に失敗しました')),
      ontimeout:()=>reject(new Error('読込が時間切れになりました'))
    });
  });
}

function catalogFromEntries(entries,source) {
  if(!Array.isArray(entries))throw new Error('ランキング一覧の形式が不正です');

  return entries
    .filter(entry=>entry.type==='file'||entry.type==='blob')
    .map(entry=>{
      const path=entry.path;
      if(typeof path!=='string')return null;

      const slash=path.lastIndexOf('/');
      if((slash<0?'':path.slice(0,slash))!==source.dir)return null;

      const name=slash<0?path:path.slice(slash+1);
      const match=name.match(FILE_PATTERN);
      if(!match||!Number.isSafeInteger(Number(match[1])))return null;

      return{
        name,
        path,
        sha:entry.sha,
        version:Number(match[1]),
        url:rawFileURL(source,path)
      };
    })
    .filter(Boolean)
    .sort((a,b)=>b.version-a.version||a.name.localeCompare(b.name));
}

function renderCatalog() {
  versionSelect.replaceChildren();

  const latest=make('option','',catalog.length?
    `最新版を自動選択（v${catalog[0].version}）`:
    '最新版を自動選択'
  );
  latest.value='latest';
  versionSelect.append(latest);

  for(const file of catalog){
    const date=dateCache[`${catalogIdentity}/${file.path}/${file.sha}`]?.added;
    const option=make('option','',versionText(file)+(date?` ／ 公開 ${dateText(date).split(' ')[0]}`:''));
    option.value=file.url;
    versionSelect.append(option);
  }

  if(choice.mode!=='latest'&&!catalog.some(file=>file.url===choice.url)){
    const option=make('option','',choice.mode==='custom'?
      '個別のURLを使用中':
      '保存済みの版（一覧未取得）'
    );
    option.value=choice.url;
    versionSelect.append(option);
  }

  versionSelect.value=choice.mode==='latest'?'latest':choice.url;
  history.replaceChildren();

  for(const file of catalog){
    const item=make('li','history-item');
    item.dataset.url=file.url;
    item.classList.toggle('is-selected',loadedURL===file.url);

    const heading=make('div','history-header');
    const button=make('button','',loadedURL===file.url?'使用中':'この版を使う');
    button.type='button';
    button.addEventListener('click',()=>{void loadData(file.url,'file');});

    heading.append(make('strong','',`バージョン ${file.version}`),button);

    const dates=make('div','history-date');
    dates.dataset.path=file.path;

    item.append(
      heading,
      make('div','history-file',file.name),
      make('div','history-date',captureText(file)),
      dates
    );

    history.append(item);
    renderFileDates(file);
  }
}

function renderFileDates(file,error='') {
  const target=Array.from(history.querySelectorAll('[data-path]'))
    .find(element=>element.dataset.path===file.path);

  if(!target)return;

  const info=dateCache[`${catalogIdentity}/${file.path}/${file.sha}`];

  target.textContent=info?
    `GitHub追加：${dateText(info.added)} ／ 最終変更：${dateText(info.updated)}`:
    error?`公開日時：${error}`:'公開日時を確認中…';
}

function showCatalogError(error) {
  catalogStatus.textContent=`履歴の取得に失敗：${error.message}。読込済みのランキングは引き続き検索できます。`;
}

function refreshCatalog(force=false) {
  if(catalogPromise)return catalogPromise;

  const source=parseRawURL(urlInput.value.trim()||choice.url);
  const generation=++catalogGeneration;

  catalogPromise=(async()=>{
    refresh.disabled=true;
    catalogStatus.textContent='公開されているランキングの版を確認中…';

    try{
      const cached=GM_getValue(CATALOG_KEY,null);
      let files;

      if(
        !force&&
        cached?.identity===source.identity&&
        Date.now()-cached.time<CACHE_TTL&&
        Array.isArray(cached.files)
      ){
        files=cached.files;
      }else{
        const dir=source.dir.split('/').filter(Boolean).map(encodeURIComponent).join('/');
        const result=await requestGitHub(
          `${apiBase(source)}/contents/${dir}?ref=${encodeURIComponent(source.ref)}`
        );

        let entries=result.data;

        if(Array.isArray(entries)&&entries.length>=1000){
          const tree=await requestGitHub(
            `${apiBase(source)}/git/trees/${encodeURIComponent(source.ref)}?recursive=1`
          );
          if(tree.data.truncated){
            throw new Error('ファイルが多いため、全版を確認できませんでした');
          }
          entries=tree.data.tree;
        }

        files=catalogFromEntries(entries,source);
        if(!files.length){
          throw new Error('このフォルダにランキングの版が見つかりません');
        }

        await safeSave(CATALOG_KEY,{
          identity:source.identity,
          time:Date.now(),
          files
        });
      }

      if(generation!==catalogGeneration)return;

      catalog=files;
      catalogIdentity=source.identity;
      catalogStatus.textContent=`利用できるランキング：${catalog.length}版（新しい版から表示）`;
      renderCatalog();
    }finally{
      refresh.disabled=false;
    }
  })().finally(()=>{
    catalogPromise=null;
  });

  return catalogPromise;
}

async function fileCommitDates(file,source) {
  const base=`${apiBase(source)}/commits?sha=${encodeURIComponent(source.ref)}&path=${encodeURIComponent(file.path)}&per_page=1`;
  const newest=await requestGitHub(base);

  if(!Array.isArray(newest.data)||!newest.data.length){
    throw new Error('コミット履歴なし');
  }

  const updated=newest.data[0].commit?.committer?.date||newest.data[0].commit?.author?.date;
  let added=updated;

  const link=newest.headers.match(/^link:\s*(.+)$/im)?.[1]||'';
  const last=link.split(',')
    .map(part=>part.match(/<([^>]+)>;\s*rel="last"/))
    .find(Boolean)?.[1];

  if(last){
    const lastURL=new URL(last);
    const expected=new URL(base);

    if(lastURL.origin!==expected.origin||lastURL.pathname!==expected.pathname){
      throw new Error('履歴リンクが不正です');
    }

    const oldest=await requestGitHub(lastURL.href);
    added=oldest.data?.[0]?.commit?.committer?.date||oldest.data?.[0]?.commit?.author?.date;
  }

  if(!added||!updated)throw new Error('日時が登録されていません');
  return{added,updated};
}

function hydrateDates() {
  if(datesPromise)return datesPromise;

  const identity=catalogIdentity;
  const files=[...catalog];
  const source=parseRawURL(urlInput.value.trim()||choice.url);

  datesPromise=(async()=>{
    for(const file of files){
      if(catalogIdentity!==identity)break;

      const key=`${identity}/${file.path}/${file.sha}`;

      if(dateCache[key]){
        renderFileDates(file);
        continue;
      }

      try{
        dateCache[key]=await fileCommitDates(file,source);
        await safeSave(DATE_KEY,dateCache);
        renderFileDates(file);
      }catch(error){
        renderFileDates(file,error.message);

        if(Date.now()<apiBlockedUntil){
          for(const remaining of files){
            if(!dateCache[`${identity}/${remaining.path}/${remaining.sha}`]){
              renderFileDates(remaining,'GitHubの取得制限中。後で「履歴を更新」を押してください。');
            }
          }
          break;
        }
      }

      await new Promise(resolve=>window.setTimeout(resolve,300));
    }

    if(catalogIdentity===identity)renderCatalogOptions();
  })().finally(()=>{
    datesPromise=null;
  });

  return datesPromise;
}

function renderCatalogOptions() {
  for(const option of versionSelect.options){
    const file=catalog.find(entry=>entry.url===option.value);
    if(!file)continue;

    const date=dateCache[`${catalogIdentity}/${file.path}/${file.sha}`]?.added;
    option.textContent=versionText(file)+(date?` ／ 公開 ${dateText(date).split(' ')[0]}`:'');
  }
}

async function loadData(url,mode=choice.mode) {
  const generation=++loadGeneration;
  const target=url||urlInput.value.trim();

  try{
    parseRawURL(target);
  }catch(error){
    status.textContent=error.message;
    showDrop();
    return;
  }

  status.textContent='ランキングを読み込み中…';
  load.disabled=true;

  try{
    const{data:bytes}=await requestGitHub(target,'arraybuffer');
    if(!(bytes instanceof ArrayBuffer))throw new Error('不正なバイナリ');

    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const data=JSON.parse(await new Response(stream).text());

    if(data.format!=='typingtube-rankings'||data.version!==1||!Array.isArray(data.rows)){
      throw new Error('対応していないデータ形式です');
    }

    if(generation!==loadGeneration)return;

    const nextRows=data.rows.filter(row=>
      Array.isArray(row)&&
      typeof row[0]==='string'&&
      Number.isSafeInteger(row[1])&&
      row[1]>0
    );

    rows=nextRows;
    loadedURL=target;

    const file=catalog.find(entry=>entry.url===target);
    const match=parseRawURL(target).path.split('/').pop().match(FILE_PATTERN);

    loadedLabel=file?
      versionText(file):
      match?
        `v${Number(match[1])}`+(target===DEFAULT_DATA_URL?' ／ 2026年9月25日収集':''):
        '個別データ';

    choice={mode,url:target};
    urlInput.value=target;

    await safeSave(STORAGE_KEY,target);
    await safeSave(CHOICE_KEY,choice);

    if(generation!==loadGeneration)return;

    renderCatalog();
    search();
  }catch(error){
    if(generation!==loadGeneration)return;

    status.textContent=`読込失敗：${error.message}`+
      (rows.length?`（${loadedLabel}は引き続き検索できます）`:'');

    renderCatalog();
    showDrop();
  }finally{
    if(generation===loadGeneration)load.disabled=false;
  }
}

function search() {
  results.replaceChildren();
  const terms=normalize(query.value).trim().split(/\s+/).filter(Boolean);

  if(!terms.length){
    if(loadedURL){
      status.textContent=`${loadedLabel}：${rows.length.toLocaleString()}件。曲名を入力してください。`;
    }
    return;
  }

  showDrop();

  if(!loadedURL){
    status.textContent='ランキングを読み込んでから検索できます。⚙で版を選んでください。';
    return;
  }

  let total=0;

  for(const[title,id,rank,level]of rows){
    if(!terms.every(term=>normalize(title).includes(term)))continue;
    total++;
    if(total>MAX_RESULTS)continue;

    const item=make('li','item');
    const info=make('div','meta',
      `譜面ID: ${id}`+
      (Number.isInteger(rank)?` ／ 順位: ${rank}`:'')+
      (level?` ／ 難易度: ${level}`:'')
    );

    const actions=make('div','actions');
    const link=make('a','','譜面を開く');
    link.href=`https://typing-tube.net/movie/show/${id}`;
    link.target='_blank';
    link.rel='noopener noreferrer';

    const copy=make('button','','IDをコピー');
    copy.type='button';
    copy.addEventListener('click',async()=>{
      try{
        await navigator.clipboard.writeText(String(id));
        copy.textContent='コピーしました';
      }catch(_){
        copy.textContent='コピーできませんでした';
      }
    });

    actions.append(link,copy);
    item.append(make('div','title',title),info,actions);
    results.append(item);
  }

  status.textContent=`${loadedLabel}：${total}件が一致`+
    (total>MAX_RESULTS?`（先頭${MAX_RESULTS}件を表示）`:'');
}

query.addEventListener('focus',()=>{
  showDrop();
  if(query.value.trim())search();
});

query.addEventListener('input',search);

query.addEventListener('keydown',event=>{
  if(['Enter','Escape'].includes(event.key)){
    event.preventDefault();
    event.stopPropagation();
    if(event.key==='Escape')hideDrop();
    else search();
  }
});

gear.addEventListener('click',toggleSettings);
close.addEventListener('click',hideDrop);

load.addEventListener('click',()=>{
  void loadData(urlInput.value.trim(),'custom');
});

urlInput.addEventListener('keydown',event=>{
  if(event.key==='Enter'){
    event.preventDefault();
    void loadData(urlInput.value.trim(),'custom');
  }
});

versionSelect.addEventListener('change',async()=>{
  const value=versionSelect.value;

  if(value!=='latest'){
    await loadData(value,'file');
    return;
  }

  try{
    await refreshCatalog();
    if(catalog[0])await loadData(catalog[0].url,'latest');
  }catch(error){
    showCatalogError(error);
    renderCatalog();
  }
});

refresh.addEventListener('click',async()=>{
  try{
    await refreshCatalog(true);
    if(choice.mode==='latest'&&catalog[0]?.url!==loadedURL){
      await loadData(catalog[0].url,'latest');
    }
    await hydrateDates();
  }catch(error){
    showCatalogError(error);
  }
});

document.addEventListener('pointerdown',event=>{
  if(open&&!host.contains(event.target))hideDrop();
});

document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&open)hideDrop();
});

window.addEventListener('resize',position);
window.addEventListener('scroll',position,true);
document.addEventListener('turbo:load',position);

const observer=new MutationObserver(()=>{
  if(!anchor?.isConnected||document.querySelector('#topbarSearchInput.topbar-search-input')!==anchor){
    position();
  }
});

observer.observe(document.documentElement,{
  childList:true,
  subtree:true
});

renderCatalog();
position();

void(async()=>{
  if(choice.mode!=='latest'){
    await loadData(choice.url,choice.mode);
    return;
  }

  const generation=loadGeneration;

  try{
    await refreshCatalog();
    if(generation===loadGeneration){
      await loadData(catalog[0].url,'latest');
    }
  }catch(error){
    showCatalogError(error);
    if(generation===loadGeneration){
      await loadData(choice.url||DEFAULT_DATA_URL,'latest');
    }
  }
})();
})();
