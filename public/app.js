// ============================================================================
// HTHH Bible Hip-Hop Music Automation — Frontend Logic (`/public/app.js`)
// ============================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// 1. Firebase Configuration (New Isolated Project: hthh-music-auto-2026)
const firebaseConfig = {
  projectId: "hthh-music-auto-2026",
  appId: "1:73940828202:web:43528ef3a690e027314353",
  storageBucket: "hthh-music-auto-2026.firebasestorage.app",
  apiKey: "AIzaSyAh5lLfwkQCRQS1ajRT6ae28JNVU7mxhgc",
  authDomain: "hthh-music-auto-2026.firebaseapp.com",
  messagingSenderId: "73940828202"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 2. Complete 66 Books of the Bible + exact chapter counts
const BIBLE_BOOKS = [
  { name: "Genesis", chapters: 50 }, { name: "Exodus", chapters: 40 }, { name: "Leviticus", chapters: 27 },
  { name: "Numbers", chapters: 36 }, { name: "Deuteronomy", chapters: 34 }, { name: "Joshua", chapters: 24 },
  { name: "Judges", chapters: 21 }, { name: "Ruth", chapters: 4 }, { name: "1 Samuel", chapters: 31 },
  { name: "2 Samuel", chapters: 24 }, { name: "1 Kings", chapters: 22 }, { name: "2 Kings", chapters: 25 },
  { name: "1 Chronicles", chapters: 29 }, { name: "2 Chronicles", chapters: 36 }, { name: "Ezra", chapters: 10 },
  { name: "Nehemiah", chapters: 13 }, { name: "Esther", chapters: 10 }, { name: "Job", chapters: 42 },
  { name: "Psalms", chapters: 150 }, { name: "Proverbs", chapters: 31 }, { name: "Ecclesiastes", chapters: 12 },
  { name: "Song of Solomon", chapters: 8 }, { name: "Isaiah", chapters: 66 }, { name: "Jeremiah", chapters: 52 },
  { name: " Lamentations", chapters: 5 }, { name: "Ezekiel", chapters: 48 }, { name: "Daniel", chapters: 12 },
  { name: "Hosea", chapters: 14 }, { name: "Joel", chapters: 3 }, { name: "Amos", chapters: 9 },
  { name: "Obadiah", chapters: 1 }, { name: "Jonah", chapters: 4 }, { name: "Micah", chapters: 7 },
  { name: "Nahum", chapters: 3 }, { name: "Habakkuk", chapters: 3 }, { name: "Zephaniah", chapters: 3 },
  { name: "Haggai", chapters: 2 }, { name: "Zechariah", chapters: 14 }, { name: "Malachi", chapters: 4 },
  { name: "Matthew", chapters: 28 }, { name: "Mark", chapters: 16 }, { name: "Luke", chapters: 24 },
  { name: "John", chapters: 21 }, { name: "Acts", chapters: 28 }, { name: "Romans", chapters: 16 },
  { name: "1 Corinthians", chapters: 16 }, { name: "2 Corinthians", chapters: 13 }, { name: "Galatians", chapters: 6 },
  { name: "Ephesians", chapters: 6 }, { name: "Philippians", chapters: 4 }, { name: "Colossians", chapters: 4 },
  { name: "1 Thessalonians", chapters: 5 }, { name: "2 Thessalonians", chapters: 3 }, { name: "1 Timothy", chapters: 6 },
  { name: "2 Timothy", chapters: 4 }, { name: "Titus", chapters: 3 }, { name: "Philemon", chapters: 1 },
  { name: "Hebrews", chapters: 13 }, { name: "James", chapters: 5 }, { name: "1 Peter", chapters: 5 },
  { name: "2 Peter", chapters: 3 }, { name: "1 John", chapters: 5 }, { name: "2 John", chapters: 1 },
  { name: "3 John", chapters: 1 }, { name: "Jude", chapters: 1 }, { name: "Revelation", chapters: 22 }
];

// 3. Default Settings State
const DEFAULT_SETTINGS = {
  master_system_prompt:
    "You are a platinum Bible Hip-Hop music producer and lyricist.\n" +
    "1. LYRICS: Adapt the exact Biblical chapter into pure, lyrical, rhythmic hip-hop bars with internal rhymes, storytelling, and deep reverence. Every chapter's lyrics MUST be strictly between 4,850 and 4,950 characters.\n" +
    "2. SUNO STYLE: Command heavy boom-bap & soulful 808 hip-hop production, warm gospel choir chops, crisp snare drums, and clear deep rap vocals.\n" +
    "3. NEGATIVE TAGS: Exclude mumble, screaming, heavy metal, off-beat drums, and thin vocals.\n" +
    "4. VISUAL THEME: Generate a cinematic 16:9 widescreen sacred Biblical masterpiece fused with modern golden-lit studio aesthetics, keeping the lower 25% of the frame dark and clean for the iPhone beat-map visualizer.",
  default_style: "Soulful Gospel Hip-Hop, Boom Bap Drums, Warm 808 Bass, Sacred Choir Harmonies, Clear Deep Male Rap Vocals",
  default_negative_tags: "mumble, screaming, heavy metal, country, off-beat, distorted vocals",
  chapter_models: ["V4_5PLUS", "V4_5PLUS", "V4_5PLUS", "V4_5PLUS"],
  yt_title: "Book of {book} (Chapters {chapters}) | Pure Bible Hip-Hop Full Album Mix",
  yt_desc:
    "🔥 Pure Biblical Hip-Hop Experience — Book of {book} (Chapters {chapters})\n\n" +
    "8 Full-Length Tracks Stitched Back-to-Back (Copy A Chapters 1–4 + Copy B Chapters 1–4).\n" +
    "Every chapter is lyrically adapted word-for-word in 4,850–4,950 characters of pure Hip-Hop.\n\n" +
    "#BibleHipHop #GospelRap #{book} #ChristianHipHop #HTHHMusic",
  yt_tags: "Bible Hip Hop, Christian Rap, Gospel Hip Hop, Book of {book}, Scripture Music, HTHH Music",
  kaggle_username: "ikechukwuebiringa"
};

let currentUser = null;
let googleAccessToken = sessionStorage.getItem("hthh_yt_access_token") || null;
let userSettings = { ...DEFAULT_SETTINGS };
let calendarRows = [];
let activeJobId = null;
let activeJobData = null;
let activeJobUnsub = null;

// ============================================================================
// 4. CRYPTO: SHA-256 STREAM CIPHER FOR SECURE PAYLOAD DISPATCH
// ============================================================================
async function sha256Bytes(uint8Arr) {
  const hashBuf = await crypto.subtle.digest("SHA-256", uint8Arr);
  return new Uint8Array(hashBuf);
}

async function encryptSecurePayload(payloadObj, passphrase) {
  const textEncoder = new TextEncoder();
  const plainBytes = textEncoder.encode(JSON.stringify(payloadObj));
  const keyBytes = textEncoder.encode(passphrase);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cipherBytes = new Uint8Array(plainBytes.length);
  const blockCount = Math.ceil(plainBytes.length / 32);

  for (let b = 0; b < blockCount; b++) {
    const counter = new Uint8Array(4);
    new DataView(counter.buffer).setUint32(0, b, false);
    const combined = new Uint8Array(keyBytes.length + salt.length + 4);
    combined.set(keyBytes, 0);
    combined.set(salt, keyBytes.length);
    combined.set(counter, keyBytes.length + salt.length);
    const digest = await sha256Bytes(combined);
    const start = b * 32;
    const end = Math.min(start + 32, plainBytes.length);
    for (let i = start; i < end; i++) {
      cipherBytes[i] = plainBytes[i] ^ digest[i - start];
    }
  }

  const finalBuf = new Uint8Array(16 + cipherBytes.length);
  finalBuf.set(salt, 0);
  finalBuf.set(cipherBytes, 16);
  let binary = "";
  for (let i = 0; i < finalBuf.length; i++) {
    binary += String.fromCharCode(finalBuf[i]);
  }
  return btoa(binary);
}

// ============================================================================
// 5. UI HELPERS & INITIALIZATION
// ============================================================================
function showToast(msg) {
  const banner = document.getElementById("toast-banner");
  const text = document.getElementById("toast-message");
  text.textContent = msg;
  banner.classList.remove("hidden");
  setTimeout(() => banner.classList.add("hidden"), 7000);
}

window.switchTab = function (tabName) {
  ["calendar", "monitor", "settings"].forEach((t) => {
    const sec = document.getElementById(`tab-${t}`);
    const btn = document.getElementById(`tab-btn-${t}`);
    if (t === tabName) {
      sec.classList.remove("hidden");
      if (btn) {
        btn.className = "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all bg-amber-500 text-black";
      }
    } else {
      sec.classList.add("hidden");
      if (btn) {
        btn.className = "px-4 py-1.5 rounded-lg text-xs font-medium transition-all text-slate-300 hover:text-white";
      }
    }
  });
};

function populateBibleBooksSelect() {
  const sel = document.getElementById("quick-book-select");
  sel.innerHTML = BIBLE_BOOKS.map(
    (b) => `<option value="${b.name.trim()}" ${b.name.trim() === "Psalms" ? "selected" : ""}>${b.name.trim()} (${b.chapters} ch)</option>`
  ).join("");
  window.randomizeQuickChapters();
}

function pickFourRandomChapters(bookName) {
  const found = BIBLE_BOOKS.find((b) => b.name.trim().toLowerCase() === String(bookName).trim().toLowerCase());
  const maxCh = found ? found.chapters : 50;
  if (maxCh <= 4) {
    return [1, Math.min(2, maxCh), Math.min(3, maxCh), Math.min(4, maxCh)];
  }
  const pool = Array.from({ length: maxCh }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 4).sort((a, b) => a - b);
}

window.randomizeQuickChapters = function () {
  const book = document.getElementById("quick-book-select").value || "Psalms";
  const chs = pickFourRandomChapters(book);
  document.getElementById("quick-ch1").value = chs[0];
  document.getElementById("quick-ch2").value = chs[1];
  document.getElementById("quick-ch3").value = chs[2];
  document.getElementById("quick-ch4").value = chs[3];
};

// ============================================================================
// 6. GOOGLE SIGN-IN WITH YOUTUBE UPLOAD SCOPE
// ============================================================================
window.handleGoogleSignIn = async function () {
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/youtube.upload");
    provider.addScope("https://www.googleapis.com/auth/youtube.readonly");
    provider.setCustomParameters({ prompt: "consent" });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential && credential.accessToken) {
      googleAccessToken = credential.accessToken;
      sessionStorage.setItem("hthh_yt_access_token", googleAccessToken);
    }
    currentUser = result.user;
    updateAuthUi();
    await loadUserSettingsFromFirestore();
    showToast(`Signed in as ${currentUser.email || currentUser.displayName} with YouTube Upload access!`);
  } catch (err) {
    console.error("Google Sign-In Error:", err);
    showToast(`Google Sign-In note: ${err.message}`);
  }
};

function updateAuthUi() {
  const label = document.getElementById("auth-btn-label");
  const ytBadge = document.getElementById("yt-auth-indicator");
  if (currentUser && !currentUser.isAnonymous) {
    label.textContent = `${currentUser.email || currentUser.displayName} ✓`;
    if (googleAccessToken) {
      ytBadge.textContent = `YouTube Channel Connected (${currentUser.email || "Signed In"})`;
      ytBadge.className = "text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30";
    } else {
      ytBadge.textContent = "Click 'Sign in with Google' top-right to refresh YouTube token";
    }
  }
}

// ============================================================================
// 7. SETTINGS & SECURE VAULT MANAGEMENT
// ============================================================================
function syncSettingsToInputs() {
  document.getElementById("set-master-prompt").value = userSettings.master_system_prompt || DEFAULT_SETTINGS.master_system_prompt;
  document.getElementById("set-default-style").value = userSettings.default_style || DEFAULT_SETTINGS.default_style;
  document.getElementById("set-negative-tags").value = userSettings.default_negative_tags || DEFAULT_SETTINGS.default_negative_tags;

  const models = userSettings.chapter_models || ["V4_5PLUS", "V4_5PLUS", "V4_5PLUS", "V4_5PLUS"];
  ["ch1", "ch2", "ch3", "ch4"].forEach((key, idx) => {
    const m = models[idx] || "V4_5PLUS";
    document.getElementById(`set-model-${key}`).value = m;
    const lbl = document.getElementById(`lbl-m${idx + 1}`);
    const th = document.getElementById(`th-m${idx + 1}`);
    if (lbl) lbl.textContent = `(${m})`;
    if (th) th.textContent = `[${m}]`;
  });

  document.getElementById("set-yt-title").value = userSettings.yt_title || DEFAULT_SETTINGS.yt_title;
  document.getElementById("set-yt-desc").value = userSettings.yt_desc || DEFAULT_SETTINGS.yt_desc;
  document.getElementById("set-yt-tags").value = userSettings.yt_tags || DEFAULT_SETTINGS.yt_tags;

  // Vault fields (stored in localStorage + encrypted user doc)
  const localVault = JSON.parse(localStorage.getItem("hthh_vault_secrets") || "{}");
  document.getElementById("vault-kie-key").value = localVault.kie_api_key || "";
  document.getElementById("vault-gemini-key").value = localVault.gemini_api_key || "";
  document.getElementById("vault-kaggle-user").value = localVault.kaggle_username || userSettings.kaggle_username || "ikechukwuebiringa";
  document.getElementById("vault-kaggle-key").value = localVault.kaggle_key || "";
  document.getElementById("vault-hf-token").value = localVault.hf_token || "";
}

window.saveAllUserSettings = async function () {
  userSettings = {
    master_system_prompt: document.getElementById("set-master-prompt").value.trim(),
    default_style: document.getElementById("set-default-style").value.trim(),
    default_negative_tags: document.getElementById("set-negative-tags").value.trim(),
    chapter_models: [
      document.getElementById("set-model-ch1").value,
      document.getElementById("set-model-ch2").value,
      document.getElementById("set-model-ch3").value,
      document.getElementById("set-model-ch4").value
    ],
    yt_title: document.getElementById("set-yt-title").value.trim(),
    yt_desc: document.getElementById("set-yt-desc").value.trim(),
    yt_tags: document.getElementById("set-yt-tags").value.trim(),
    kaggle_username: document.getElementById("vault-kaggle-user").value.trim() || "ikechukwuebiringa"
  };

  const vaultSecrets = {
    kie_api_key: document.getElementById("vault-kie-key").value.trim(),
    gemini_api_key: document.getElementById("vault-gemini-key").value.trim(),
    kaggle_username: userSettings.kaggle_username,
    kaggle_key: document.getElementById("vault-kaggle-key").value.trim(),
    hf_token: document.getElementById("vault-hf-token").value.trim()
  };

  localStorage.setItem("hthh_user_settings", JSON.stringify(userSettings));
  localStorage.setItem("hthh_vault_secrets", JSON.stringify(vaultSecrets));
  syncSettingsToInputs();
  renderCalendarTable();

  if (currentUser) {
    try {
      const encVault = await encryptSecurePayload(vaultSecrets, currentUser.uid);
      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          style_prompt: userSettings.master_system_prompt,
          chapter_models: userSettings.chapter_models,
          youtube_defaults: {
            title: userSettings.yt_title,
            description: userSettings.yt_desc,
            tags: userSettings.yt_tags,
            default_style: userSettings.default_style,
            default_negative_tags: userSettings.default_negative_tags,
            kaggle_username: userSettings.kaggle_username
          },
          encrypted_vault: encVault,
          updated_at: new Date().toISOString()
        },
        { merge: true }
      );
    } catch (err) {
      console.warn("Firestore user settings save note:", err);
    }
  }

  showToast("All Master Settings, Per-Chapter Suno Models, and Secure Vault Credentials saved!");
};

async function loadUserSettingsFromFirestore() {
  const savedLocal = localStorage.getItem("hthh_user_settings");
  if (savedLocal) {
    try {
      userSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedLocal) };
    } catch (e) {}
  }
  if (currentUser) {
    try {
      const snap = await getDoc(doc(db, "users", currentUser.uid));
      if (snap.exists()) {
        const data = snap.data();
        const yt = data.youtube_defaults || {};
        userSettings = {
          ...userSettings,
          master_system_prompt: data.style_prompt || userSettings.master_system_prompt,
          chapter_models: data.chapter_models || userSettings.chapter_models,
          yt_title: yt.title || userSettings.yt_title,
          yt_desc: yt.description || userSettings.yt_desc,
          yt_tags: yt.tags || userSettings.yt_tags,
          default_style: yt.default_style || userSettings.default_style,
          default_negative_tags: yt.default_negative_tags || userSettings.default_negative_tags,
          kaggle_username: yt.kaggle_username || userSettings.kaggle_username
        };
      }
    } catch (e) {
      console.warn("Settings fetch note:", e);
    }
  }
  syncSettingsToInputs();
}

// ============================================================================
// 8. CONTENT CALENDAR CSV PARSER & QUEUE MANAGEMENT
// ============================================================================
window.downloadSampleCsv = function () {
  const sample = [
    "book,chapter_1,chapter_2,chapter_3,chapter_4",
    "Psalms,1,23,91,150",
    "Proverbs,1,3,4,8",
    "Genesis,1,3,12,22",
    "Isaiah,6,40,53,61",
    "John,1,3,14,15"
  ].join("\n");
  const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "hthh_bible_content_calendar.csv";
  a.click();
  URL.revokeObjectURL(url);
};

window.handleCsvUpload = async function (event) {
  const file = event.target.files[0];
  if (!file) return;
  const text = await file.text();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return;

  let startIdx = 0;
  if (lines[0].toLowerCase().includes("book")) {
    startIdx = 1;
  }

  let added = 0;
  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const book = cols[0] || "Psalms";
    let chs = [
      parseInt(cols[1], 10),
      parseInt(cols[2], 10),
      parseInt(cols[3], 10),
      parseInt(cols[4], 10)
    ].filter((n) => !isNaN(n) && n > 0);

    if (chs.length !== 4) {
      chs = pickFourRandomChapters(book);
    }

    await createCalendarRowInFirestore(book, chs);
    added++;
  }
  event.target.value = "";
  showToast(`Imported ${added} Bible Hip-Hop execution rows from CSV!`);
};

window.addSingleCalendarRow = async function () {
  const book = document.getElementById("quick-book-select").value || "Psalms";
  const chs = [
    parseInt(document.getElementById("quick-ch1").value, 10) || 1,
    parseInt(document.getElementById("quick-ch2").value, 10) || 2,
    parseInt(document.getElementById("quick-ch3").value, 10) || 3,
    parseInt(document.getElementById("quick-ch4").value, 10) || 4
  ];
  await createCalendarRowInFirestore(book, chs);
  window.randomizeQuickChapters();
  showToast(`Added ${book} (Chapters ${chs.join(", ")}) to Content Calendar.`);
};

async function createCalendarRowInFirestore(book, chapters) {
  const rowId = `row_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const rowDoc = {
    book: String(book).trim(),
    chapters: chapters.slice(0, 4),
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  await setDoc(doc(db, "calendars", rowId), rowDoc);
}

window.deleteCalendarRow = async function (rowId) {
  await deleteDoc(doc(db, "calendars", rowId));
};

window.clearCompletedRows = async function () {
  for (const r of calendarRows) {
    if (r.status === "completed") {
      await deleteDoc(doc(db, "calendars", r.id));
    }
  }
  showToast("Cleared completed rows.");
};

function renderCalendarTable() {
  const tbody = document.getElementById("calendar-tbody");
  const badge = document.getElementById("queue-count-badge");
  badge.textContent = `${calendarRows.length} Row${calendarRows.length === 1 ? "" : "s"}`;

  if (calendarRows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="py-8 text-center text-slate-500">No rows in calendar yet. Upload a CSV or click "+ Add Row to Calendar" above.</td></tr>`;
    return;
  }

  const models = userSettings.chapter_models || ["V4_5PLUS", "V4_5PLUS", "V4_5PLUS", "V4_5PLUS"];

  tbody.innerHTML = calendarRows.map((row, idx) => {
    const chs = Array.isArray(row.chapters) ? row.chapters : [1, 2, 3, 4];
    const statusColors = {
      pending: "bg-slate-800 text-slate-300 border-white/10",
      running: "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse",
      completed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      failed: "bg-red-500/20 text-red-300 border-red-500/40"
    };
    const stClass = statusColors[row.status] || statusColors.pending;

    return `
      <tr class="hover:bg-white/[0.02] transition">
        <td class="py-3 px-4 font-mono text-slate-400">${idx + 1}</td>
        <td class="py-3 px-4 font-display font-bold text-white">${row.book}</td>
        <td class="py-3 px-4 font-mono text-amber-300">Ch. ${chs[0]} <span class="text-[10px] text-slate-500">${models[0]}</span></td>
        <td class="py-3 px-4 font-mono text-amber-300">Ch. ${chs[1]} <span class="text-[10px] text-slate-500">${models[1]}</span></td>
        <td class="py-3 px-4 font-mono text-amber-300">Ch. ${chs[2]} <span class="text-[10px] text-slate-500">${models[2]}</span></td>
        <td class="py-3 px-4 font-mono text-amber-300">Ch. ${chs[3]} <span class="text-[10px] text-slate-500">${models[3]}</span></td>
        <td class="py-3 px-4 text-[11px] font-mono text-slate-400">Copy A (1-4) + Copy B (1-4)</td>
        <td class="py-3 px-4">
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase border ${stClass}">${row.status || "pending"}</span>
        </td>
        <td class="py-3 px-4 text-right space-x-1.5">
          ${
            row.asset_url
              ? `<button onclick="openJobPreview('${row.last_job_id || ""}', '${row.asset_url}', '${row.book}', '${chs.join(", ")}')" class="px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 font-semibold text-[11px]">🎬 Preview / YouTube</button>`
              : ""
          }
          <button onclick="executeSingleRow('${row.id}')" class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] transition shadow">
            ▶ Run Row
          </button>
          <button onclick="deleteCalendarRow('${row.id}')" class="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-300 text-[11px]">
            ✕
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

// ============================================================================
// 9. SINGLE-ROW EXECUTION & KAGGLE T4 KERNEL DISPATCH
// ============================================================================
window.runNextPendingRow = function () {
  const next = calendarRows.find((r) => r.status === "pending" || !r.status);
  if (!next) {
    showToast("No pending rows found in the calendar. Add a row or upload a CSV first!");
    return;
  }
  window.executeSingleRow(next.id);
};

window.executeSingleRow = async function (rowId) {
  const row = calendarRows.find((r) => r.id === rowId);
  if (!row) return;

  const localVault = JSON.parse(localStorage.getItem("hthh_vault_secrets") || "{}");
  const kieKey = document.getElementById("vault-kie-key").value.trim() || localVault.kie_api_key || "";
  const geminiKey = document.getElementById("vault-gemini-key").value.trim() || localVault.gemini_api_key || "";
  const kaggleUser = document.getElementById("vault-kaggle-user").value.trim() || localVault.kaggle_username || "ikechukwuebiringa";
  const kaggleKey = document.getElementById("vault-kaggle-key").value.trim() || localVault.kaggle_key || "";
  const hfToken = document.getElementById("vault-hf-token").value.trim() || localVault.hf_token || "";

  if (!kieKey || !geminiKey) {
    window.switchTab("settings");
    showToast("⚠️ Please enter your KIE.AI API Key and Google Gemini API Key in Settings -> Secure Vault before running a row!");
    return;
  }

  const jobId = `job_${Date.now()}`;
  const passphrase = `pass_${crypto.randomUUID().replace(/-/g, "")}`;

  // Encrypt sensitive credentials + user style prompt & per-chapter Suno models
  const secretPayload = {
    kie_api_key: kieKey,
    gemini_api_key: geminiKey,
    kaggle_username: kaggleUser,
    kaggle_key: kaggleKey,
    hf_token: hfToken,
    master_system_prompt: userSettings.master_system_prompt,
    default_style: userSettings.default_style,
    default_negative_tags: userSettings.default_negative_tags,
    chapter_models: userSettings.chapter_models
  };
  const cipherB64 = await encryptSecurePayload(secretPayload, passphrase);

  // Create Firestore job document under `/automations/{jobId}`
  const chs = Array.isArray(row.chapters) ? row.chapters : [1, 2, 3, 4];
  const jobDoc = {
    row_id: rowId,
    book: row.book,
    chapters: JSON.stringify(chs),
    status: "queued",
    progress: 1,
    current_milestone: `Queued ${row.book} (Chapters ${chs.join(", ")}) for Kaggle T4 GPU execution...`,
    logs_text: `[Init] Created job ${jobId} for ${row.book} Chapters ${chs.join(", ")}\n[Security] Encrypted KIE.AI, Gemini & Kaggle credentials into ephemeral cipher.`,
    cancel_requested: false,
    payload_cipher: cipherB64,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await setDoc(doc(db, "automations", jobId), jobDoc);
  await updateDoc(doc(db, "calendars", rowId), {
    status: "running",
    last_job_id: jobId,
    updated_at: new Date().toISOString()
  });

  // Switch to Live Studio Monitor and attach real-time snapshot listener
  populateYouTubeUploadFields(row.book, chs);
  subscribeToJob(jobId, row.book, chs);
  window.switchTab("monitor");

  // Trigger Local Kaggle T4 Bridge (`http://127.0.0.1:8765/trigger`)
  try {
    const resp = await fetch("http://127.0.0.1:8765/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_id: jobId,
        passphrase: passphrase,
        payload_cipher: cipherB64,
        kaggle_username: kaggleUser,
        kaggle_key: kaggleKey
      })
    });
    const resData = await resp.json();
    if (resData.ok) {
      showToast(`🚀 Pushed job ${jobId} to Kaggle T4 GPU (${resData.kernel_slug})!`);
    } else {
      showToast(`Kaggle push warning: ${resData.error}`);
    }
  } catch (err) {
    console.warn("Direct localhost trigger note (watcher will pick up if running):", err);
  }
};

function populateYouTubeUploadFields(book, chapters) {
  const chStr = Array.isArray(chapters) ? chapters.join(", ") : String(chapters);
  const titleTpl = userSettings.yt_title || DEFAULT_SETTINGS.yt_title;
  const descTpl = userSettings.yt_desc || DEFAULT_SETTINGS.yt_desc;
  const tagsTpl = userSettings.yt_tags || DEFAULT_SETTINGS.yt_tags;

  document.getElementById("yt-upload-title").value = titleTpl.replaceAll("{book}", book).replaceAll("{chapters}", chStr);
  document.getElementById("yt-upload-description").value = descTpl.replaceAll("{book}", book).replaceAll("{chapters}", chStr);
  document.getElementById("yt-upload-tags").value = tagsTpl.replaceAll("{book}", book).replaceAll("{chapters}", chStr);
}

// ============================================================================
// 10. REAL-TIME JOB SNAPSHOT LISTENER & CANCELLATION
// ============================================================================
function subscribeToJob(jobId, bookLabel = "", chaptersList = []) {
  if (activeJobUnsub) activeJobUnsub();
  activeJobId = jobId;
  document.getElementById("live-job-id-label").textContent = `job: ${jobId}`;

  activeJobUnsub = onSnapshot(doc(db, "automations", jobId), (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    activeJobData = data;

    const book = data.book || bookLabel || "Bible";
    let chs = chaptersList;
    try {
      chs = typeof data.chapters === "string" ? JSON.parse(data.chapters) : data.chapters || chs;
    } catch (e) {}
    const chStr = Array.isArray(chs) ? chs.join(", ") : String(chs);

    document.getElementById("live-job-title").textContent = `${book} • Chapters ${chStr}`;
    document.getElementById("stage-book-heading").textContent = `${book.toUpperCase()} • CH. ${chStr}`;
    document.getElementById("iphone-pill-title").textContent = `${book} (Ch. ${chStr}) • 8-Track Bible Hip-Hop`;

    const pct = Number(data.progress || 0);
    document.getElementById("live-progress-pct").textContent = `${pct}%`;
    document.getElementById("live-progress-bar").style.width = `${pct}%`;
    document.getElementById("live-milestone-text").textContent = data.current_milestone || "Processing...";

    const status = (data.status || "running").toUpperCase();
    const badge = document.getElementById("live-job-status-badge");
    badge.textContent = status;

    const isRunning = data.status === "running" || data.status === "queued";
    document.getElementById("cancel-job-btn").disabled = !isRunning;

    if (data.logs_text) {
      const pre = document.getElementById("live-log-console");
      pre.textContent = data.logs_text;
      pre.scrollTop = pre.scrollHeight;
    }

    // Update background image preview on stage if generated
    if (data.image_url) {
      const stage = document.getElementById("video-placeholder-stage");
      stage.style.backgroundImage = `linear-gradient(to bottom, rgba(9,11,16,0.35), rgba(9,11,16,0.85)), url('${data.image_url}')`;
    }

    // Update 8-track Suno breakdown
    if (data.track_urls) {
      try {
        const tracks = typeof data.track_urls === "string" ? JSON.parse(data.track_urls) : data.track_urls;
        if (Array.isArray(tracks) && tracks.length > 0) {
          document.getElementById("track-breakdown-list").innerHTML = tracks.map((t, i) => `
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/10">
              <div>
                <span class="font-bold text-white">Chapter ${t.chapter}</span>
                <span class="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">${t.model}</span>
                <span class="ml-1 text-[10px] font-mono text-emerald-400">${t.char_count} chars ✓</span>
              </div>
              <div class="flex items-center gap-2 text-[11px] font-mono">
                <a href="${t.copy_a_url}" target="_blank" class="text-sky-400 hover:underline">Copy A (#${i + 1})</a>
                <span class="text-slate-600">|</span>
                <a href="${t.copy_b_url}" target="_blank" class="text-amber-400 hover:underline">Copy B (#${i + 5})</a>
              </div>
            </div>
          `).join("");
        }
      } catch (e) {}
    }

    // Show HTML5 Video Player when final asset_url arrives
    if (data.asset_url) {
      document.getElementById("copy-asset-btn").disabled = false;
      const dl = document.getElementById("direct-download-link");
      dl.href = data.asset_url;
      dl.classList.remove("hidden");

      const videoEl = document.getElementById("master-video-player");
      const stageEl = document.getElementById("video-placeholder-stage");
      if (videoEl.src !== data.asset_url) {
        videoEl.src = data.asset_url;
      }
      videoEl.classList.remove("hidden");
      stageEl.classList.add("hidden");
    }
  });
}

window.openJobPreview = function (jobId, assetUrl, book, chaptersStr) {
  populateYouTubeUploadFields(book, chaptersStr);
  if (jobId) {
    subscribeToJob(jobId, book, chaptersStr.split(","));
  }
  if (assetUrl) {
    const videoEl = document.getElementById("master-video-player");
    const stageEl = document.getElementById("video-placeholder-stage");
    videoEl.src = assetUrl;
    videoEl.classList.remove("hidden");
    stageEl.classList.add("hidden");
    document.getElementById("copy-asset-btn").disabled = false;
  }
  window.switchTab("monitor");
};

window.cancelActiveJob = async function () {
  if (!activeJobId) return;
  await updateDoc(doc(db, "automations", activeJobId), {
    cancel_requested: true,
    status: "cancelled",
    current_milestone: "Cancellation requested by user — halting Kaggle worker...",
    updated_at: new Date().toISOString()
  });
  showToast("🛑 Cancellation signal sent to Firestore & Kaggle T4 Watchdog.");
};

window.copyAssetUrl = function () {
  if (!activeJobData || !activeJobData.asset_url) return;
  navigator.clipboard.writeText(activeJobData.asset_url);
  showToast("Copied Hugging Face Video Asset URL to clipboard!");
};

// ============================================================================
// 11. PUSH FINAL VIDEO TO SIGNED-IN YOUTUBE CHANNEL (RESUMABLE UPLOAD API)
// ============================================================================
window.pushVideoToYouTube = async function () {
  const videoUrl = (activeJobData && activeJobData.asset_url) || document.getElementById("master-video-player").src;
  if (!videoUrl || !videoUrl.startsWith("http")) {
    showToast("⚠️ No finished video URL available to upload yet.");
    return;
  }

  if (!googleAccessToken) {
    await window.handleGoogleSignIn();
    if (!googleAccessToken) return;
  }

  const statusEl = document.getElementById("yt-upload-status");
  const pushBtn = document.getElementById("yt-push-btn");
  pushBtn.disabled = true;

  try {
    statusEl.textContent = "1/3 Fetching rendered MP4 stream from Hugging Face Datasets...";
    const mediaResp = await fetch(videoUrl);
    if (!mediaResp.ok) throw new Error(`Failed to fetch MP4 blob (${mediaResp.status})`);
    const videoBlob = await mediaResp.blob();

    const title = document.getElementById("yt-upload-title").value.trim() || "HTHH Bible Hip-Hop Mix";
    const description = document.getElementById("yt-upload-description").value.trim();
    const rawTags = document.getElementById("yt-upload-tags").value;
    const tags = rawTags.split(",").map((t) => t.trim()).filter(Boolean);
    const privacyStatus = document.getElementById("yt-upload-privacy").value || "public";

    statusEl.textContent = "2/3 Initializing YouTube Data API v3 Resumable Upload session...";
    const initResp = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Length": String(videoBlob.size),
          "X-Upload-Content-Type": "video/mp4"
        },
        body: JSON.stringify({
          snippet: {
            title: title.slice(0, 100),
            description: description,
            tags: tags,
            categoryId: "10" // Music category
          },
          status: {
            privacyStatus: privacyStatus,
            selfDeclaredMadeForKids: false
          }
        })
      }
    );

    if (!initResp.ok) {
      const errTxt = await initResp.text();
      throw new Error(`YouTube init error (${initResp.status}): ${errTxt}`);
    }

    const uploadUrl = initResp.headers.get("Location");
    statusEl.textContent = `3/3 Uploading ${(videoBlob.size / (1024 * 1024)).toFixed(1)} MB video to your YouTube channel...`;

    const uploadResp = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(videoBlob.size)
      },
      body: videoBlob
    });

    if (!uploadResp.ok) {
      const errTxt = await uploadResp.text();
      throw new Error(`YouTube upload failed (${uploadResp.status}): ${errTxt}`);
    }

    const ytData = await uploadResp.json();
    const ytLink = `https://youtu.be/${ytData.id}`;
    statusEl.innerHTML = `✅ Published to YouTube: <a href="${ytLink}" target="_blank" class="text-emerald-400 underline">${ytLink}</a>`;
    showToast(`🎉 Video uploaded to your YouTube channel: ${ytLink}`);

    if (activeJobId) {
      await updateDoc(doc(db, "automations", activeJobId), {
        youtube_url: ytLink,
        updated_at: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error("YouTube Upload Error:", err);
    statusEl.textContent = `❌ Upload failed: ${err.message}`;
    showToast(`YouTube upload error: ${err.message}`);
  } finally {
    pushBtn.disabled = false;
  }
};

// ============================================================================
// 12. BOOTSTRAP AUTH, CALENDAR SNAPSHOT & BRIDGE HEALTH CHECK
// ============================================================================
async function checkLocalBridge() {
  const dot = document.getElementById("bridge-dot");
  const txt = document.getElementById("bridge-text");
  try {
    const r = await fetch("http://127.0.0.1:8765/health");
    if (r.ok) {
      dot.className = "w-2 h-2 rounded-full bg-emerald-400";
      txt.textContent = "Kaggle T4 Bridge Online";
      return;
    }
  } catch (e) {}
  dot.className = "w-2 h-2 rounded-full bg-amber-400";
  txt.textContent = "Cloud Queue Active";
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    try {
      await signInAnonymously(auth);
      return;
    } catch (e) {
      console.warn("Anonymous auth note:", e);
    }
  }
  currentUser = user;
  updateAuthUi();
  await loadUserSettingsFromFirestore();

  // Subscribe to `/calendars` collection
  onSnapshot(collection(db, "calendars"), async (snap) => {
    calendarRows = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));

    // Seed 3 sample Bible Hip-Hop rows if calendar is completely empty on first launch
    if (calendarRows.length === 0 && !localStorage.getItem("hthh_seeded_initial")) {
      localStorage.setItem("hthh_seeded_initial", "1");
      await createCalendarRowInFirestore("Psalms", [1, 23, 91, 150]);
      await createCalendarRowInFirestore("Proverbs", [1, 3, 4, 8]);
      await createCalendarRowInFirestore("Revelation", [1, 4, 12, 21]);
      return;
    }
    renderCalendarTable();
  });
});

populateBibleBooksSelect();
syncSettingsToInputs();
checkLocalBridge();
setInterval(checkLocalBridge, 8000);
