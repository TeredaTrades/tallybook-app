import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Plus, Minus, ChevronRight, ChevronDown, ArrowLeft, X, Settings as SettingsIcon,
  Users, FileText, Search, MoreVertical, Building2, UserPlus, Info, Smartphone,
  Share2, HelpCircle, BookMarked, Wallet, TrendingUp, TrendingDown, Calendar,
  Clock, Trash2, Download, Printer, Eye, EyeOff, ShieldCheck, Check, ArrowRightLeft,
  Loader2, Inbox, ChevronLeft, PieChart as PieChartIcon, SlidersHorizontal, Camera, Paperclip,
  CheckSquare, CheckCircle2, Circle, ClipboardList, Bell, BellOff, BellRing, Calculator,
  Home, Newspaper, ShoppingBag, Landmark, ExternalLink, RefreshCw, VolumeX
} from "lucide-react";
import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { LocalNotifications } from "@capacitor/local-notifications";
import jsPDF from "jspdf";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

// ---------- constants ----------
const DEFAULT_CATEGORIES = ["Home", "Electronics", "Food", "Salary", "Rent", "Transport", "Utilities", "Other"];
const DEFAULT_PAYMENT_MODES = ["Cash", "Online", "Card", "Cheque"];
const CURRENCIES = { "$": "USD", "Br": "ETB", "₹": "INR", "€": "EUR", "£": "GBP" };
const ROLES = ["Book Admin", "Data Operator", "Viewer"];
const BOOK_TEMPLATES = ["Sales Ledger", "Bank Reconciliation", "Shared Cashbook", "Payroll & Staff Expenses"];

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const todayStr = () => new Date().toISOString().slice(0, 10);
const nowTimeStr = () => {
  const d = new Date();
  let h = d.getHours(); const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
};
const fmtDate = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};
// Turns an entry's date + "9:00 PM"-style time into a real, sortable Date.
const entryDateTime = (e) => {
  const d = new Date((e.date || todayStr()) + "T00:00:00");
  const m = /^(\d{1,2}):(\d{2})\s?(AM|PM)$/i.exec((e.time || "").trim());
  if (m) {
    let h = parseInt(m[1], 10) % 12;
    if (/PM/i.test(m[3])) h += 12;
    d.setHours(h, parseInt(m[2], 10), 0, 0);
  }
  return d;
};
const bookCurrency = (book, appSettings) => (book && book.currency) || appSettings.currency;
const fmtDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};
const CHART_COLORS = ["#0f766e", "#0891b2", "#059669", "#d97706", "#dc2626", "#7c3aed", "#db2777", "#65a30d", "#0284c7", "#ea580c"];

// ---------- file export (CSV / PDF) ----------
// Android's WebView can't do blob-URL <a download> links or window.print(), so on
// a native build we write the file to cache and hand it to the OS share sheet
// (the user can then save to Downloads, Drive, WhatsApp, etc). In a plain browser
// (npm run dev / preview) we fall back to a normal blob download, which still works.
async function saveAndShareFile({ filename, data, mimeType, base64 = false }) {
  if (Capacitor.isNativePlatform()) {
    const writeOpts = base64
      ? { path: filename, data, directory: Directory.Cache }
      : { path: filename, data, directory: Directory.Cache, encoding: Encoding.UTF8 };
    await Filesystem.writeFile(writeOpts);
    const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
    await Share.share({ title: filename, url: uri, dialogTitle: "Save or share" });
  } else {
    const blob = base64
      ? new Blob([Uint8Array.from(atob(data), (c) => c.charCodeAt(0))], { type: mimeType })
      : new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Builds a simple paginated PDF report and returns it as a base64 string.
function buildReportPdfBase64({ title, subtitle, totalIn, totalOut, cur, headers, rows }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 40;
  const rightEdge = 555;
  let y = 50;

  doc.setFontSize(16);
  doc.text(String(title || "Report"), marginX, y);
  y += 20;

  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(String(subtitle), marginX, y);
    doc.setTextColor(0);
    y += 22;
  }

  doc.setFontSize(11);
  doc.setTextColor(5, 150, 105); // emerald
  doc.text(`Total In: ${cur}${totalIn.toLocaleString()}`, marginX, y);
  doc.setTextColor(220, 38, 38); // rose
  doc.text(`Total Out: ${cur}${totalOut.toLocaleString()}`, marginX + 220, y);
  doc.setTextColor(0);
  y += 22;

  const colWidth = (rightEdge - marginX) / headers.length;
  const colX = headers.map((_, i) => marginX + colWidth * i);

  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  headers.forEach((h, i) => doc.text(String(h), colX[i], y));
  doc.setFont(undefined, "normal");
  y += 6;
  doc.setDrawColor(200);
  doc.line(marginX, y, rightEdge, y);
  y += 14;

  const pageHeight = doc.internal.pageSize.getHeight();
  rows.forEach((row) => {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 50;
    }
    row.forEach((cell, i) => doc.text(String(cell ?? ""), colX[i], y));
    y += 16;
  });

  if (rows.length === 0) {
    doc.setTextColor(150);
    doc.text("No entries match these filters.", marginX, y);
  }

  return doc.output("datauristring").split(",")[1];
}

// On-device storage only — Capacitor Preferences persists to the phone's
// local app storage. Nothing is sent over a network; the app works fully offline.
async function storeGet(key, fallback) {
  try {
    const r = await Preferences.get({ key });
    return r && r.value != null ? JSON.parse(r.value) : fallback;
  } catch { return fallback; }
}
async function storeSet(key, value) {
  try { await Preferences.set({ key, value: JSON.stringify(value) }); } catch (e) { console.error("storage set failed", key, e); }
}

// ---------- reminders (things to buy / to pay for) ----------
// Native local notifications on Android via @capacitor/local-notifications.
// In the browser preview (npm run dev) these calls are no-ops so the app keeps working.
const REMINDER_CHANNEL_ID = "tallybook-reminders";
const REMINDER_SOUND_FILE = "reminder_alarm.wav"; // android/app/src/main/res/raw/reminder_alarm.wav

function notifIdFor(itemId) {
  let h = 0;
  for (let i = 0; i < itemId.length; i++) h = (h * 31 + itemId.charCodeAt(i)) >>> 0;
  return h % 2147483647;
}
async function checkNotifPermission() {
  if (!Capacitor.isNativePlatform()) return "granted";
  try { return (await LocalNotifications.checkPermissions()).display; } catch { return "denied"; }
}
async function requestNotifPermissionNative() {
  if (!Capacitor.isNativePlatform()) return "granted";
  try { return (await LocalNotifications.requestPermissions()).display; } catch { return "denied"; }
}
// Creates (or updates) a dedicated high-importance channel so reminders play
// a distinct alarm-like sound + strong vibration and pop up as a heads-up
// banner, instead of a silent line in the notification shade. Android only
// lets a channel's sound/importance be set the first time it's created, so
// this mainly takes effect on a fresh install.
async function ensureReminderChannel() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.createChannel({
      id: REMINDER_CHANNEL_ID,
      name: "Payment & item reminders",
      description: "Alerts for things you scheduled a reminder for on your to-buy/to-pay list",
      importance: 5, // max — heads-up banner + sound even if the phone is locked
      visibility: 1,
      sound: REMINDER_SOUND_FILE,
      vibration: true,
      lights: true,
    });
  } catch (e) { console.error("create reminder channel failed", e); }
}
async function schedulePlannedReminder(item) {
  if (!Capacitor.isNativePlatform() || !item.reminderAt) return;
  const at = new Date(item.reminderAt);
  if (isNaN(at.getTime()) || at.getTime() <= Date.now()) return;
  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: notifIdFor(item.id),
        title: `Reminder: ${item.desc}`,
        body: `Anticipated ${item.amount ? Number(item.amount).toLocaleString() : "0"} · ${item.category} — tap for details`,
        schedule: { at, allowWhileIdle: true },
        channelId: REMINDER_CHANNEL_ID,
        sound: REMINDER_SOUND_FILE,
        extra: { plannedItemId: item.id },
      }],
    });
  } catch (e) { console.error("schedule reminder failed", e); }
}
async function cancelPlannedReminder(item) {
  if (!Capacitor.isNativePlatform()) return;
  try { await LocalNotifications.cancel({ notifications: [{ id: notifIdFor(item.id) }] }); } catch {}
}

// ---------- small UI atoms ----------
function Chip({ active, children, onClick, tone = "teal" }) {
  const toneMap = {
    teal: active ? "bg-teal-700 text-white border-teal-700" : "bg-white text-slate-600 border-slate-300",
    emerald: active ? "bg-emerald-700 text-white border-emerald-700" : "bg-white text-slate-600 border-slate-300",
    rose: active ? "bg-rose-700 text-white border-rose-700" : "bg-white text-slate-600 border-slate-300",
  };
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-sm border font-medium transition-colors ${toneMap[tone]}`}>
      {children}
    </button>
  );
}

function TopHeader({ title, subtitle, onBack, right }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white sticky top-0 z-10">
      {onBack && (
        <button onClick={onBack} className="p-1 -ml-1 text-slate-700 hover:bg-slate-100 rounded-full">
          <ArrowLeft size={20} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-900 truncate">{title}</div>
        {subtitle && <div className="text-xs text-slate-500 truncate">{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 text-slate-400">
      <Icon size={36} className="mb-3 text-slate-300" />
      <div className="font-medium text-slate-500">{title}</div>
      {hint && <div className="text-sm mt-1 max-w-[240px]">{hint}</div>}
    </div>
  );
}

function BottomNav({ tab, setTab }) {
  const items = [
    { id: "home", label: "Home", icon: Home },
    { id: "books", label: "Cashbooks", icon: BookMarked },
    { id: "help", label: "Help", icon: HelpCircle },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];
  return (
    <div className="border-t border-slate-200 bg-white flex">
      {items.map((it) => {
        const active = tab === it.id;
        return (
          <button key={it.id} onClick={() => setTab(it.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium ${active ? "text-teal-700" : "text-slate-400"}`}>
            <it.icon size={20} />
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Planned (things to buy / pay for) sidebar ----------
// A floating shortcut that's available on every screen — it never blocks the
// app underneath (it's a slide-over, not a full-screen modal) and isn't
// buried inside Settings.
function PlannedFAB({ pendingCount, onClick, hidden }) {
  return (
    <button
      onClick={onClick}
      className={`fixed right-4 bottom-24 z-30 w-14 h-14 rounded-full bg-teal-700 text-white shadow-lg shadow-teal-900/20 flex items-center justify-center active:scale-95 transition-opacity duration-150 ${hidden ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      title="Things to buy / pay for"
    >
      <ClipboardList size={20} />
      {pendingCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
          {pendingCount > 99 ? "99+" : pendingCount}
        </span>
      )}
    </button>
  );
}

function PlannedSidebar({ ctx, open, onClose }) {
  const { plannedItems, persistPlanned, appSettings, push } = ctx;
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(appSettings.categories[0] || "Other");
  const [editingId, setEditingId] = useState(null);

  const cancelEdit = () => { setEditingId(null); setDesc(""); setAmount(""); };

  const pending = plannedItems.filter((p) => !p.done);
  const done = plannedItems.filter((p) => p.done);
  const pendingTotal = pending.reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const save = async () => {
    if (!desc.trim()) return;
    const amt = parseFloat(amount) || 0;
    if (editingId) {
      const next = plannedItems.map((p) => p.id === editingId ? { ...p, desc: desc.trim(), amount: amt, category } : p);
      await persistPlanned(next);
    } else {
      const item = { id: uid(), desc: desc.trim(), amount: amt, category, done: false, createdAt: new Date().toISOString(), reminderAt: null };
      await persistPlanned([item, ...plannedItems]);
    }
    cancelEdit();
  };

  const startEdit = (p) => { setEditingId(p.id); setDesc(p.desc); setAmount(p.amount ? String(p.amount) : ""); setCategory(p.category); };

  const toggleDone = async (p) => {
    const next = plannedItems.map((x) => x.id === p.id ? { ...x, done: !x.done } : x);
    await persistPlanned(next);
  };

  const remove = async (id) => {
    if (editingId === id) cancelEdit();
    const item = plannedItems.find((p) => p.id === id);
    if (item?.reminderAt) await cancelPlannedReminder(item);
    await persistPlanned(plannedItems.filter((p) => p.id !== id));
  };

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />}
      <div
        className={`fixed top-0 right-0 h-full w-[86%] max-w-sm bg-white z-50 shadow-2xl flex flex-col transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700 shrink-0"><ClipboardList size={18} /></div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-slate-900 truncate">To buy / to pay for</div>
            <div className="text-xs text-slate-500 truncate">A running wishlist, separate from your books</div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 shrink-0"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
            {editingId && (
              <div className="flex items-center justify-between text-xs bg-teal-50 text-teal-700 rounded-lg px-2.5 py-1.5">
                Editing item <button onClick={cancelEdit} className="underline font-medium">Cancel</button>
              </div>
            )}
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Rent, groceries, new shoes"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" />
            <div className="flex gap-2">
              <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01" placeholder="Anticipated amount"
                className="flex-1 min-w-0 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" />
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white">
                {appSettings.categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button onClick={save} className="w-full bg-teal-700 text-white py-2 rounded-lg text-sm font-medium">
              {editingId ? "Update item" : "Add to list"}
            </button>
          </div>

          <div className="flex items-center justify-between bg-teal-50 border border-teal-100 rounded-xl px-3 py-2.5">
            <span className="text-xs font-medium text-teal-800">Pending total ({pending.length})</span>
            <span className="text-sm font-semibold text-teal-800">{appSettings.currency}{pendingTotal.toLocaleString()}</span>
          </div>

          {plannedItems.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Nothing on your list" hint="Add things you plan to buy or bills you need to pay." />
          ) : (
            <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-xl overflow-hidden">
              {[...pending, ...done].map((p) => (
                <div key={p.id} className={`flex items-center gap-2 px-3 py-2.5 ${p.done ? "opacity-50" : ""}`}>
                  <button onClick={() => toggleDone(p)} className="text-teal-700 shrink-0" title={p.done ? "Mark as pending" : "Mark as bought/paid"}>
                    {p.done ? <CheckCircle2 size={18} /> : <Circle size={18} className="text-slate-300" />}
                  </button>
                  <button onClick={() => !p.done && startEdit(p)} className="flex-1 min-w-0 text-left">
                    <div className={`text-sm font-medium text-slate-900 truncate ${p.done ? "line-through" : ""}`}>{p.desc}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 truncate">
                      <span>{p.category}</span>
                      {p.reminderAt && (
                        <span className="flex items-center gap-0.5 text-teal-700"><Bell size={10} /> {fmtDateTime(p.reminderAt)}</span>
                      )}
                    </div>
                  </button>
                  <span className="text-sm font-medium text-slate-700 shrink-0">{appSettings.currency}{Number(p.amount || 0).toLocaleString()}</span>
                  <button onClick={() => remove(p.id)} className="p-1 text-slate-300 hover:text-rose-600 shrink-0"><X size={14} /></button>
                </div>
              ))}
            </div>
          )}

          <button onClick={() => { onClose(); push("reminders"); }}
            className="w-full flex items-center justify-center gap-2 text-teal-700 border border-teal-200 rounded-xl py-2.5 text-sm font-medium">
            <Bell size={15} /> Manage reminders in Settings
          </button>
        </div>
      </div>
    </>
  );
}

// ---------- Reminder alarm popup ----------
// Shown when a scheduled reminder fires while the app is open, or when the
// user taps the notification (from the tray or a cold start). Plays the
// same alarm tone in-app (looped a few times) since a system notification
// only plays its sound once.
function ReminderAlarmModal({ alarm, onDismiss, onMarkDone, onSnooze }) {
  const audioRef = useRef(null);
  const stopTimerRef = useRef(null);

  useEffect(() => {
    if (!alarm) return;
    const audio = new Audio("/reminder-alarm.wav");
    audio.loop = true;
    audioRef.current = audio;
    audio.play().catch(() => {}); // browser may block autoplay without a prior gesture — fine, silent fallback
    stopTimerRef.current = setTimeout(() => { audio.pause(); }, 15000); // don't blare forever if left unattended
    return () => {
      clearTimeout(stopTimerRef.current);
      audio.pause();
      audioRef.current = null;
    };
  }, [alarm]);

  if (!alarm) return null;

  const stopSound = () => { audioRef.current?.pause(); clearTimeout(stopTimerRef.current); };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 text-center">
        <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3 animate-pulse">
          <BellRing size={26} />
        </div>
        <div className="text-xs font-medium text-rose-600 uppercase tracking-wide mb-1">Reminder</div>
        <div className="text-lg font-bold text-slate-900 mb-1">{alarm.desc}</div>
        <div className="text-sm text-slate-500 mb-5">
          {alarm.amount ? `${alarm.currency}${Number(alarm.amount).toLocaleString()} · ` : ""}{alarm.category}
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button onClick={() => { stopSound(); onSnooze(); }} className="border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm font-medium">
            Snooze 10 min
          </button>
          <button onClick={() => { stopSound(); onMarkDone(); }} className="bg-emerald-700 text-white rounded-xl py-2.5 text-sm font-medium">
            Mark done
          </button>
        </div>
        <button onClick={() => { stopSound(); onDismiss(); }} className="w-full flex items-center justify-center gap-1.5 text-slate-500 text-sm py-2">
          <VolumeX size={14} /> Dismiss
        </button>
      </div>
    </div>
  );
}

// ---------- App ----------
export default function TallyBookApp() {
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [session, setSession] = useState({ activeBusinessId: null, viewingAs: null });
  const [appSettings, setAppSettings] = useState({ categories: DEFAULT_CATEGORIES, paymentModes: DEFAULT_PAYMENT_MODES, currency: "$" });
  const [tab, setTab] = useState("home");
  const [stack, setStack] = useState([{ screen: "home" }]);
  const [entriesCache, setEntriesCache] = useState({}); // bookId -> entries
  const [activityCache, setActivityCache] = useState({}); // bookId -> activity
  const [plannedItems, setPlannedItems] = useState([]); // things to buy / pay for (global, not tied to a book)
  const [plannedSidebarOpen, setPlannedSidebarOpen] = useState(false);
  const [notifPermission, setNotifPermission] = useState("unknown");
  const [inputFocused, setInputFocused] = useState(false); // hides the floating list button while typing so it can't sit on top of a Save button
  const [activeAlarm, setActiveAlarm] = useState(null); // reminder popup payload, shown on notification receipt/tap

  const top = stack[stack.length - 1];
  const push = (screen, extra = {}) => setStack((s) => [...s, { screen, ...extra }]);
  const pop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const resetTo = (screen, extra = {}) => setStack([{ screen, ...extra }]);

  // ---- initial load ----
  useEffect(() => {
    (async () => {
      const ob = await storeGet("onboarding", null);
      const biz = await storeGet("businesses", []);
      const sess = await storeGet("session", { activeBusinessId: null, viewingAs: null });
      const settings = await storeGet("app-settings", { categories: DEFAULT_CATEGORIES, paymentModes: DEFAULT_PAYMENT_MODES, currency: "$" });
      const planned = await storeGet("planned-items", []);
      setOnboarding(ob);
      setBusinesses(biz);
      setAppSettings(settings);
      setPlannedItems(planned);
      const activeId = sess.activeBusinessId && biz.find(b => b.id === sess.activeBusinessId) ? sess.activeBusinessId : (biz[0]?.id || null);
      setSession({ ...sess, activeBusinessId: activeId });
      setLoading(false);
      checkNotifPermission().then(setNotifPermission);
      ensureReminderChannel();
    })();
  }, []);

  // ---- reminder notifications: pop up an alarm card whether the notification
  // fires while the app is open, or is tapped from the tray / a cold start ----
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const showAlarmFor = async (plannedItemId) => {
      if (!plannedItemId) return;
      // Re-read from storage rather than trusting React state — a tap from a
      // fully-closed app fires this before the rest of the app has loaded.
      const planned = await storeGet("planned-items", []);
      const settings = await storeGet("app-settings", { categories: DEFAULT_CATEGORIES, paymentModes: DEFAULT_PAYMENT_MODES, currency: "$" });
      const item = planned.find((p) => p.id === plannedItemId);
      if (!item) return;
      setActiveAlarm({ ...item, currency: settings.currency });
    };
    const receivedHandle = LocalNotifications.addListener("localNotificationReceived", (n) => {
      showAlarmFor(n?.extra?.plannedItemId);
    });
    const tappedHandle = LocalNotifications.addListener("localNotificationActionPerformed", (e) => {
      showAlarmFor(e?.notification?.extra?.plannedItemId);
    });
    return () => { receivedHandle.then((h) => h.remove()); tappedHandle.then((h) => h.remove()); };
  }, []);

  // ---- hide the floating "to buy/pay" button while a text field is focused,
  // so it can never sit on top of a Save/Add button pushed up by the keyboard ----
  useEffect(() => {
    const isFormEl = (el) => el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
    const onFocusIn = (e) => { if (isFormEl(e.target)) setInputFocused(true); };
    const onFocusOut = (e) => { if (isFormEl(e.target)) setInputFocused(false); };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => { document.removeEventListener("focusin", onFocusIn); document.removeEventListener("focusout", onFocusOut); };
  }, []);

  const persistBusinesses = useCallback(async (next) => {
    setBusinesses(next);
    await storeSet("businesses", next);
  }, []);
  const persistSession = useCallback(async (next) => {
    setSession(next);
    await storeSet("session", next);
  }, []);
  const persistSettings = useCallback(async (next) => {
    setAppSettings(next);
    await storeSet("app-settings", next);
  }, []);
  const persistPlanned = useCallback(async (next) => {
    setPlannedItems(next);
    await storeSet("planned-items", next);
  }, []);
  const requestNotifPermission = useCallback(async () => {
    const p = await requestNotifPermissionNative();
    setNotifPermission(p);
    return p;
  }, []);

  const dismissAlarm = useCallback(() => setActiveAlarm(null), []);
  const markAlarmDone = useCallback(async () => {
    if (!activeAlarm) return;
    const planned = await storeGet("planned-items", []);
    const next = planned.map((p) => p.id === activeAlarm.id ? { ...p, done: true } : p);
    await persistPlanned(next);
    setActiveAlarm(null);
  }, [activeAlarm, persistPlanned]);
  const snoozeAlarm = useCallback(async () => {
    if (!activeAlarm) return;
    const planned = await storeGet("planned-items", []);
    const at = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const item = planned.find((p) => p.id === activeAlarm.id);
    const next = planned.map((p) => p.id === activeAlarm.id ? { ...p, reminderAt: at } : p);
    await persistPlanned(next);
    if (item) await schedulePlannedReminder({ ...item, reminderAt: at });
    setActiveAlarm(null);
  }, [activeAlarm, persistPlanned]);

  const activeBusiness = businesses.find((b) => b.id === session.activeBusinessId) || null;

  const getEntries = useCallback(async (bookId) => {
    if (entriesCache[bookId]) return entriesCache[bookId];
    const e = await storeGet(`entries:${bookId}`, []);
    setEntriesCache((c) => ({ ...c, [bookId]: e }));
    return e;
  }, [entriesCache]);

  const saveEntries = useCallback(async (bookId, next) => {
    setEntriesCache((c) => ({ ...c, [bookId]: next }));
    await storeSet(`entries:${bookId}`, next);
  }, []);

  const logActivity = useCallback(async (bookId, text) => {
    const cur = activityCache[bookId] || (await storeGet(`activity:${bookId}`, []));
    const next = [{ id: uid(), text, at: new Date().toISOString() }, ...cur].slice(0, 50);
    setActivityCache((c) => ({ ...c, [bookId]: next }));
    await storeSet(`activity:${bookId}`, next);
    return next;
  }, [activityCache]);

  const getActivity = useCallback(async (bookId) => {
    if (activityCache[bookId]) return activityCache[bookId];
    const a = await storeGet(`activity:${bookId}`, []);
    setActivityCache((c) => ({ ...c, [bookId]: a }));
    return a;
  }, [activityCache]);

  // current viewer identity/role for the active business
  const viewer = useMemo(() => {
    if (!session.viewingAs) return { id: "you", name: "You", role: "Primary Admin" };
    const m = activeBusiness?.members.find((mm) => mm.id === session.viewingAs);
    return m ? { id: m.id, name: m.name, role: m.role } : { id: "you", name: "You", role: "Primary Admin" };
  }, [session.viewingAs, activeBusiness]);

  const canManage = viewer.role === "Primary Admin" || viewer.role === "Book Admin";
  const canAddEntries = canManage || viewer.role === "Data Operator";

  const createBusiness = async (name) => {
    const nb = { id: uid(), name, createdAt: new Date().toISOString(), books: [], members: [], moveRequests: [] };
    const next = [...businesses, nb];
    await persistBusinesses(next);
    await persistSession({ ...session, activeBusinessId: nb.id });
    return nb;
  };

  const createBook = async (name) => {
    if (!activeBusiness) return;
    const nbBook = { id: uid(), name, createdAt: new Date().toISOString() };
    const next = businesses.map((b) => b.id === activeBusiness.id ? { ...b, books: [...b.books, nbBook] } : b);
    await persistBusinesses(next);
    return nbBook;
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-teal-700" size={28} />
      </div>
    );
  }

  if (!onboarding?.done) {
    return (
      <Onboarding
        onDone={async (managing) => {
          const ob = { done: true, managing };
          await storeSet("onboarding", ob);
          setOnboarding(ob);
          if (businesses.length === 0) {
            const nb = { id: uid(), name: managing === "personal" ? "My Cashbook" : "My Business", createdAt: new Date().toISOString(), books: [], members: [], moveRequests: [] };
            await persistBusinesses([nb]);
            await persistSession({ activeBusinessId: nb.id, viewingAs: null });
          }
        }}
      />
    );
  }

  const ctx = {
    businesses, activeBusiness, session, appSettings, viewer, canManage, canAddEntries,
    persistBusinesses, persistSession, persistSettings,
    getEntries, saveEntries, getActivity, logActivity,
    createBusiness, createBook,
    push, pop, resetTo, stack, top,
    plannedItems, persistPlanned, notifPermission, requestNotifPermission,
  };

  const pendingPlannedCount = plannedItems.filter((p) => !p.done).length;

  return (
    <div className="w-full h-screen bg-slate-50 overflow-hidden flex flex-col relative">
      <div className="flex-1 overflow-y-auto flex flex-col">
        <Router ctx={ctx} tab={tab} setTab={setTab} />
      </div>
      {stack.length === 1 && (top.screen === "home" || top.screen === "books" || top.screen === "help" || top.screen === "settings") && (
        <BottomNav tab={tab} setTab={(t) => { setTab(t); resetTo(t); }} />
      )}
      <PlannedFAB pendingCount={pendingPlannedCount} onClick={() => setPlannedSidebarOpen(true)} hidden={inputFocused} />
      <PlannedSidebar ctx={ctx} open={plannedSidebarOpen} onClose={() => setPlannedSidebarOpen(false)} />
      <ReminderAlarmModal alarm={activeAlarm} onDismiss={dismissAlarm} onMarkDone={markAlarmDone} onSnooze={snoozeAlarm} />
    </div>
  );
}

// ---------- Onboarding ----------
function Onboarding({ onDone }) {
  const [choice, setChoice] = useState(null);
  const options = [
    { id: "business", label: "Business cash flow", icon: Building2 },
    { id: "personal", label: "Personal cash flow", icon: Wallet },
    { id: "explore", label: "Just exploring", icon: Info },
  ];
  return (
    <div className="w-full h-screen bg-white overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="w-5" />
        <button onClick={() => onDone("explore")} className="text-teal-700 text-sm font-medium">Skip</button>
      </div>
      <div className="h-1 flex gap-1 px-4">
        <div className="flex-1 bg-teal-700 rounded-full h-1" />
        <div className="flex-1 bg-slate-200 rounded-full h-1" />
      </div>
      <div className="flex-1 flex flex-col items-center px-6 pt-10">
        <div className="w-20 h-20 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mb-8">
          <BookMarked size={36} className="text-teal-700" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 text-center">What will you manage?</h1>
        <p className="text-sm text-slate-500 text-center mt-1 mb-8">We'll tune your experience around it.</p>
        <div className="w-full border border-slate-200 rounded-xl divide-y divide-slate-200">
          {options.map((o) => (
            <button key={o.id} onClick={() => setChoice(o.id)} className="w-full flex items-center gap-3 px-4 py-4">
              <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700"><o.icon size={18} /></div>
              <div className="flex-1 text-left font-medium text-slate-800">{o.label}</div>
              <div className={`w-5 h-5 rounded-full border-2 ${choice === o.id ? "border-teal-700 bg-teal-700" : "border-slate-300"} flex items-center justify-center`}>
                {choice === o.id && <Check size={12} className="text-white" />}
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="p-4">
        <button disabled={!choice} onClick={() => onDone(choice)}
          className={`w-full flex items-center justify-center gap-1 py-3 rounded-xl font-semibold ${choice ? "bg-teal-700 text-white" : "bg-slate-200 text-slate-400"}`}>
          Next <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ---------- Home (landing screen) ----------
const MAJOR_CURRENCY_CODES = ["EUR", "GBP", "JPY", "ETB", "INR", "CNY"];
// Frankfurter is a free, keyless exchange-rate API (European Central Bank data) — no signup needed.
const FOREX_API_URL = `https://api.frankfurter.app/latest?from=USD&to=${MAJOR_CURRENCY_CODES.join(",")}`;
const FINANCIAL_NEWS_LINKS = [
  { title: "Reuters — Business & Finance", url: "https://www.reuters.com/business/" },
  { title: "Bloomberg — Markets", url: "https://www.bloomberg.com/markets" },
  { title: "Yahoo Finance", url: "https://finance.yahoo.com/" },
  { title: "CNBC — Markets", url: "https://www.cnbc.com/markets/" },
];
// Buy/sell marketplace shortcut — swap this URL for whichever marketplace you prefer.
const MARKETPLACE_URL = "https://jiji.com.et";

function HomeScreen({ ctx }) {
  const { push } = ctx;
  const [rates, setRates] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState(false);

  const loadRates = useCallback(async () => {
    setRatesLoading(true);
    setRatesError(false);
    try {
      const res = await fetch(FOREX_API_URL);
      if (!res.ok) throw new Error("bad response");
      const data = await res.json();
      setRates(data.rates || null);
    } catch {
      setRatesError(true);
    } finally {
      setRatesLoading(false);
    }
  }, []);

  useEffect(() => { loadRates(); }, [loadRates]);

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-4 py-4 bg-white border-b border-slate-200">
        <div className="text-lg font-bold text-slate-900">Welcome back</div>
        <div className="text-xs text-slate-500">Your tools, market rates, and news — all in one place</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => push("books")}
            className="bg-teal-700 text-white rounded-xl p-4 flex flex-col items-start gap-2 text-left active:scale-[0.98] transition-transform">
            <Wallet size={22} />
            <div className="font-semibold text-sm leading-tight">Expenses Manager</div>
            <div className="text-[11px] text-teal-100">Books, entries & reports</div>
          </button>
          <button onClick={() => push("loanCalculator")}
            className="bg-slate-800 text-white rounded-xl p-4 flex flex-col items-start gap-2 text-left active:scale-[0.98] transition-transform">
            <Calculator size={22} />
            <div className="font-semibold text-sm leading-tight">Loan Calculator</div>
            <div className="text-[11px] text-slate-300">Payments & amortization</div>
          </button>
        </div>

        <a href={MARKETPLACE_URL} target="_blank" rel="noopener noreferrer"
          className="w-full flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700 shrink-0"><ShoppingBag size={18} /></div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-slate-900 text-sm">Buy & Sell Marketplace</div>
            <div className="text-xs text-slate-500">Browse listings or sell something online</div>
          </div>
          <ExternalLink size={15} className="text-slate-300 shrink-0" />
        </a>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-slate-800 font-medium text-sm">
              <Landmark size={16} className="text-teal-700" /> Exchange Rates <span className="text-xs text-slate-400 font-normal">(base USD)</span>
            </div>
            <button onClick={loadRates} className="text-slate-400 p-1" title="Refresh">
              <RefreshCw size={14} className={ratesLoading ? "animate-spin" : ""} />
            </button>
          </div>
          {ratesError ? (
            <div className="text-xs text-slate-400">Rates unavailable right now — check your connection and try again.</div>
          ) : ratesLoading && !rates ? (
            <div className="text-xs text-slate-400">Loading current rates…</div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {MAJOR_CURRENCY_CODES.map((code) => (
                <div key={code} className="bg-slate-50 rounded-lg p-2 text-center">
                  <div className="text-[11px] text-slate-500">{code}</div>
                  <div className="text-sm font-semibold text-slate-800">{rates && rates[code] != null ? rates[code].toFixed(2) : "—"}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          <div className="px-4 py-2.5 flex items-center gap-2 text-xs font-medium text-slate-400 uppercase">
            <Newspaper size={13} /> Financial News
          </div>
          {FINANCIAL_NEWS_LINKS.map((n) => (
            <a key={n.url} href={n.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 text-left">
              <div className="flex-1 min-w-0 text-sm font-medium text-slate-800 truncate">{n.title}</div>
              <ExternalLink size={14} className="text-slate-300 shrink-0" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Router ----------
function Router({ ctx, tab, setTab }) {
  const { top } = ctx;
  switch (top.screen) {
    case "home": return <HomeScreen ctx={ctx} />;
    case "books": return <BooksScreen ctx={ctx} />;
    case "help": return <HelpScreen ctx={ctx} />;
    case "settings": return <SettingsScreen ctx={ctx} />;
    case "book": return <BookScreen ctx={ctx} bookId={top.bookId} />;
    case "addEntry": return <AddEntryScreen ctx={ctx} bookId={top.bookId} type={top.type} editEntry={top.editEntry} />;
    case "entryDetail": return <EntryDetailScreen ctx={ctx} bookId={top.bookId} entryId={top.entryId} />;
    case "bookSettings": return <BookSettingsScreen ctx={ctx} bookId={top.bookId} />;
    case "addMember": return <AddMemberScreen ctx={ctx} bookId={top.bookId} />;
    case "reports": return <ReportsScreen ctx={ctx} bookId={top.bookId} />;
    case "charts": return <ChartsScreen ctx={ctx} bookId={top.bookId} />;
    case "reportView": return <ReportViewScreen ctx={ctx} bookId={top.bookId} filters={top.filters} />;
    case "businessTeam": return <BusinessTeamScreen ctx={ctx} />;
    case "moveRequests": return <MoveRequestsScreen ctx={ctx} />;
    case "businessSettings": return <BusinessSettingsScreen ctx={ctx} />;
    case "appSettings": return <AppSettingsScreen ctx={ctx} />
    case "loanCalculator": return <LoanCalculatorScreen ctx={ctx} />;
    case "reminders": return <RemindersScreen ctx={ctx} />;
    case "profile": return <ProfileScreen ctx={ctx} />;
    case "about": return <AboutScreen ctx={ctx} />;
    case "switchBusiness": return <SwitchBusinessScreen ctx={ctx} />;
    case "activity": return <ActivityScreen ctx={ctx} bookId={top.bookId} />;
    default: return <BooksScreen ctx={ctx} />;
  }
}

// ---------- Books list ----------
function BooksScreen({ ctx }) {
  const { activeBusiness, push, canManage, getEntries, appSettings, businesses, persistBusinesses } = ctx;
  const [showTemplates, setShowTemplates] = useState(false);
  const [newName, setNewName] = useState("");
  const [balances, setBalances] = useState({});

  const addBook = async (name) => {
    if (!name.trim()) return;
    const b = await ctx.createBook(name.trim());
    setNewName(""); setShowTemplates(false);
    push("book", { bookId: b.id });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeBusiness) return;
      const entries = {};
      for (const bk of activeBusiness.books) {
        const es = await getEntries(bk.id);
        entries[bk.id] = es.reduce((s, e) => s + (e.type === "in" ? e.amount : -e.amount), 0);
      }
      if (!cancelled) setBalances(entries);
    })();
    return () => { cancelled = true; };
  }, [activeBusiness?.id, activeBusiness?.books.length]);

  const toggleHidden = async (bookId) => {
    const next = businesses.map((b) => b.id === activeBusiness.id
      ? { ...b, books: b.books.map((bk) => bk.id === bookId ? { ...bk, hidden: !bk.hidden } : bk) }
      : b);
    await persistBusinesses(next);
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200 bg-white">
        <button onClick={() => push("switchBusiness")} className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700 shrink-0"><Building2 size={18} /></div>
          <div className="text-left min-w-0">
            <div className="font-semibold text-slate-900 truncate max-w-[180px]">{activeBusiness?.name || "Select business"}</div>
            <div className="text-xs text-slate-500">Tap to switch business</div>
          </div>
          <ChevronDown size={16} className="text-slate-400 shrink-0" />
        </button>
        <button onClick={() => push("businessTeam")} className="p-2 text-teal-700"><UserPlus size={20} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-28 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500">Your Books</span>
          <Search size={18} className="text-slate-400" />
        </div>

        {(!activeBusiness || activeBusiness.books.length === 0) && (
          <EmptyState icon={BookMarked} title="No books yet" hint="Add your first book to start tracking cash in and out." />
        )}

        <div className="divide-y divide-slate-200 bg-white rounded-xl border border-slate-200">
          {activeBusiness?.books.map((bk) => {
            const net = balances[bk.id] || 0;
            const c = bookCurrency(bk, appSettings);
            return (
              <div key={bk.id} className="w-full flex items-center gap-3 px-4 py-3.5">
                <button onClick={() => push("book", { bookId: bk.id })} className="flex-1 min-w-0 flex items-center gap-3 text-left">
                  <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700 shrink-0"><BookMarked size={16} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">{bk.name}</div>
                    <div className="text-xs text-slate-500">Created {fmtDate(bk.createdAt.slice(0,10))}</div>
                  </div>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  {!bk.hidden && (
                    <span className={`text-sm font-semibold ${net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {net < 0 ? "-" : ""}{c}{Math.abs(net).toLocaleString()}
                    </span>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); toggleHidden(bk.id); }} className="p-1.5 text-slate-400 hover:text-slate-600" title={bk.hidden ? "Show balance" : "Hide balance"}>
                    {bk.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {canManage && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="font-medium text-slate-800 mb-1">Add New Book</div>
            <div className="text-xs text-slate-500 mb-3">Click to quickly add books for</div>
            <div className="flex flex-wrap gap-2 mb-3">
              {BOOK_TEMPLATES.map((t) => (
                <Chip key={t} onClick={() => addBook(t)}>{t}</Chip>
              ))}
            </div>
            {showTemplates ? (
              <div className="flex gap-2">
                <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Book name"
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                <button onClick={() => addBook(newName)} className="bg-teal-700 text-white px-3 rounded-lg text-sm font-medium">Add</button>
              </div>
            ) : (
              <button onClick={() => setShowTemplates(true)} className="w-full flex items-center justify-center gap-1 bg-teal-700 text-white py-2.5 rounded-xl font-medium">
                <Plus size={18} /> Add new book
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SwitchBusinessScreen({ ctx }) {
  const { businesses, session, persistSession, pop, createBusiness } = ctx;
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  return (
    <div className="flex-1 flex flex-col">
      <TopHeader title="Select Business" right={<button onClick={pop}><X size={20} className="text-slate-500" /></button>} />
      <div className="p-4 space-y-2 flex-1 overflow-y-auto">
        <div className="text-xs font-medium text-slate-400 uppercase mb-1">Your businesses</div>
        {businesses.map((b) => (
          <button key={b.id} onClick={async () => { await persistSession({ ...session, activeBusinessId: b.id, viewingAs: null }); pop(); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border ${session.activeBusinessId === b.id ? "border-teal-600 bg-teal-50" : "border-slate-200 bg-white"}`}>
            <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700"><Building2 size={16} /></div>
            <div className="flex-1 text-left">
              <div className="font-medium text-slate-900">{b.name}</div>
              <div className="text-xs text-slate-500">{b.books.length} Book{b.books.length !== 1 ? "s" : ""}</div>
            </div>
            {session.activeBusinessId === b.id && <Check size={18} className="text-teal-700" />}
          </button>
        ))}
        {creating ? (
          <div className="flex gap-2 pt-2">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Business name"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <button onClick={async () => { if (name.trim()) { await createBusiness(name.trim()); pop(); } }}
              className="bg-teal-700 text-white px-3 rounded-lg text-sm font-medium">Add</button>
          </div>
        ) : (
          <button onClick={() => setCreating(true)} className="w-full flex items-center justify-center gap-1 bg-teal-700 text-white py-3 rounded-xl font-semibold mt-2">
            <Plus size={18} /> Add new Business
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- Book screen ----------
function BookScreen({ ctx, bookId }) {
  const { activeBusiness, push, pop, getEntries, saveEntries, appSettings, canAddEntries, viewer, logActivity } = ctx;
  const book = activeBusiness?.books.find((b) => b.id === bookId);
  const [entries, setEntries] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [moveCopyEntries, setMoveCopyEntries] = useState(null); // array of entries, or null
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => { getEntries(bookId).then(setEntries); }, [bookId]);

  if (!book) return <EmptyState icon={BookMarked} title="Book not found" />;

  const otherBooks = (activeBusiness?.books || []).filter((b) => b.id !== bookId);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const enterSelectMode = (firstId) => {
    setSelectMode(true);
    setSelectedIds(firstId ? new Set([firstId]) : new Set());
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const doMoveOrCopy = async (targetBookId, mode) => {
    const selected = moveCopyEntries;
    if (!selected || selected.length === 0) return;
    const selectedIdSet = new Set(selected.map((e) => e.id));
    const targetBook = otherBooks.find((b) => b.id === targetBookId);
    const stamp = { transferredFrom: book?.name, transferredAt: new Date().toISOString() };
    const sourceEntries = await getEntries(bookId);
    const targetEntries = await getEntries(targetBookId);
    const count = selected.length;
    const countLabel = count === 1 ? "an entry" : `${count} entries`;
    if (mode === "move") {
      const nextSource = sourceEntries.filter((e) => !selectedIdSet.has(e.id));
      const moved = sourceEntries.filter((e) => selectedIdSet.has(e.id)).map((e) => ({ ...e, ...stamp }));
      await saveEntries(bookId, nextSource);
      await saveEntries(targetBookId, [...targetEntries, ...moved]);
      await logActivity(bookId, `${viewer.name} moved ${countLabel} to ${targetBook?.name}`);
      await logActivity(targetBookId, `${viewer.name} moved ${countLabel} in from ${book?.name}`);
      setEntries(nextSource);
    } else {
      const copied = sourceEntries.filter((e) => selectedIdSet.has(e.id)).map((e) => ({ ...e, ...stamp, id: uid() }));
      await saveEntries(targetBookId, [...targetEntries, ...copied]);
      await logActivity(bookId, `${viewer.name} copied ${countLabel} to ${targetBook?.name}`);
      await logActivity(targetBookId, `${viewer.name} copied ${countLabel} in from ${book?.name}`);
    }
    setMoveCopyEntries(null);
    exitSelectMode();
  };

  const cur = bookCurrency(book, appSettings);
  const totalIn = (entries || []).filter(e => e.type === "in").reduce((s, e) => s + e.amount, 0);
  const totalOut = (entries || []).filter(e => e.type === "out").reduce((s, e) => s + e.amount, 0);
  const net = totalIn - totalOut;

  // running balance as of each entry, in true chronological (transaction) order
  const chronological = [...(entries || [])].sort((a, b) => entryDateTime(a) - entryDateTime(b) || (a.createdAt || "").localeCompare(b.createdAt || ""));
  const balanceAfter = {};
  let running = 0;
  chronological.forEach((e) => { running += e.type === "in" ? e.amount : -e.amount; balanceAfter[e.id] = running; });

  const visible = chronological
    .filter((e) => {
      if (typeFilter === "Cash In" && e.type !== "in") return false;
      if (typeFilter === "Cash Out" && e.type !== "out") return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (![e.contact, e.remark, e.category].some((v) => (v || "").toLowerCase().includes(q))) return false;
      }
      return true;
    })
    .slice()
    .reverse(); // newest first for display

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader
        title={book.name}
        subtitle="Add Member, Book Activity etc"
        onBack={selectMode ? exitSelectMode : pop}
        right={
          selectMode ? (
            <button onClick={exitSelectMode} className="text-sm font-medium text-teal-700 px-2">Cancel</button>
          ) : (
            <div className="flex items-center gap-1">
              <button onClick={() => enterSelectMode()} className="p-2 text-teal-700"><CheckSquare size={18} /></button>
              <button onClick={() => push("charts", { bookId })} className="p-2 text-teal-700"><PieChartIcon size={18} /></button>
              <button onClick={() => push("addMember", { bookId })} className="p-2 text-teal-700"><UserPlus size={18} /></button>
              <button onClick={() => push("reports", { bookId })} className="p-2 text-teal-700"><FileText size={18} /></button>
              <button onClick={() => push("bookSettings", { bookId })} className="p-2 text-slate-500"><MoreVertical size={18} /></button>
            </div>
          )
        }
      />

      {selectMode && (
        <div className="bg-teal-50 border-b border-teal-100 px-4 py-2.5 flex items-center justify-between">
          <button onClick={() => {
            const allSelected = visible.length > 0 && visible.every((e) => selectedIds.has(e.id));
            setSelectedIds(allSelected ? new Set() : new Set(visible.map((e) => e.id)));
          }} className="flex items-center gap-2 text-sm font-medium text-teal-700">
            {visible.length > 0 && visible.every((e) => selectedIds.has(e.id))
              ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            Select All
          </button>
          <span className="text-sm text-slate-600">{selectedIds.size} selected</span>
        </div>
      )}

      <div className="bg-white border-b border-slate-200 px-4 py-3 space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contact, remark, category…"
            className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm" />
        </div>
        <div className="flex gap-2">
          {["All", "Cash In", "Cash Out"].map((t) => (
            <Chip key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>{t}</Chip>
          ))}
        </div>
      </div>

      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Net Balance</span>
          <span className={`font-bold text-lg ${net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{cur}{Math.abs(net).toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-sm text-slate-500">Total In (+)</span>
          <span className="text-emerald-700 font-medium">{cur}{totalIn.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-sm text-slate-500">Total Out (-)</span>
          <span className="text-rose-700 font-medium">{cur}{totalOut.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {entries === null ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-teal-700" size={24} /></div>
        ) : entries.length === 0 ? (
          <EmptyState icon={Wallet} title="No entries yet" hint="Add your first cash in or cash out entry below." />
        ) : visible.length === 0 ? (
          <EmptyState icon={Search} title="No entries match" hint="Try a different search or filter." />
        ) : (
          <div className="divide-y divide-slate-100">
            {visible.map((e) => (
              <EntryRow key={e.id} e={e} cur={cur} balanceText={balanceAfter[e.id].toLocaleString()}
                selectMode={selectMode}
                selected={selectedIds.has(e.id)}
                onTap={() => selectMode ? toggleSelect(e.id) : push("entryDetail", { bookId, entryId: e.id })}
                onLongPress={() => selectMode ? toggleSelect(e.id) : enterSelectMode(e.id)} />
            ))}
          </div>
        )}
      </div>

      {selectMode ? (
        <div className="p-3 border-t border-slate-200 bg-white flex gap-2">
          <button onClick={exitSelectMode}
            className="px-4 py-2.5 rounded-xl font-semibold border border-slate-300 text-slate-600">
            Cancel
          </button>
          <button
            disabled={selectedIds.size === 0}
            onClick={() => setMoveCopyEntries((entries || []).filter((e) => selectedIds.has(e.id)))}
            className="flex-1 flex items-center justify-center gap-1 bg-teal-700 text-white py-2.5 rounded-xl font-semibold disabled:opacity-40">
            <ArrowRightLeft size={18} /> Move / Copy {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
          </button>
        </div>
      ) : canAddEntries && (
        <div className="p-3 border-t border-slate-200 bg-white flex gap-2">
          <button onClick={() => push("addEntry", { bookId, type: "in" })}
            className="flex-1 flex items-center justify-center gap-1 bg-emerald-700 text-white py-2.5 rounded-xl font-semibold">
            <Plus size={18} /> Cash In
          </button>
          <button onClick={() => push("addEntry", { bookId, type: "out" })}
            className="flex-1 flex items-center justify-center gap-1 bg-rose-700 text-white py-2.5 rounded-xl font-semibold">
            <Minus size={18} /> Cash Out
          </button>
        </div>
      )}

      {moveCopyEntries && (
        <MoveCopyModal entries={moveCopyEntries} otherBooks={otherBooks} cur={cur}
          onClose={() => setMoveCopyEntries(null)} onAction={doMoveOrCopy} />
      )}
    </div>
  );
}

function EntryRow({ e, cur, balanceText, selectMode, selected, onTap, onLongPress }) {
  const timerRef = useRef(null);
  const longPressed = useRef(false);

  const start = () => {
    longPressed.current = false;
    timerRef.current = setTimeout(() => { longPressed.current = true; onLongPress(); }, 500);
  };
  const cancel = () => { if (timerRef.current) clearTimeout(timerRef.current); };
  const handleClick = () => { if (!longPressed.current) onTap(); };

  return (
    <button
      onMouseDown={start} onMouseUp={cancel} onMouseLeave={cancel}
      onTouchStart={start} onTouchEnd={cancel} onTouchMove={cancel}
      onContextMenu={(ev) => { ev.preventDefault(); onLongPress(); }}
      onClick={handleClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 select-none ${selected ? "bg-teal-50" : ""}`}>
      {selectMode && (
        <div className="shrink-0 text-teal-700">
          {selected ? <CheckCircle2 size={20} /> : <Circle size={20} className="text-slate-300" />}
        </div>
      )}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${e.type === "in" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
        {e.type === "in" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-slate-900 truncate flex items-center gap-1.5">
          {e.contact || e.category || (e.type === "in" ? "Cash In" : "Cash Out")}
          {e.receipt && <Paperclip size={12} className="text-slate-400 shrink-0" />}
        </div>
        <div className="text-xs text-slate-500 truncate">{fmtDate(e.date)} · {e.time} · {e.paymentMode}{e.addedBy && e.addedBy !== "You" ? ` · by ${e.addedBy}` : ""}</div>
        {e.remark && <div className="text-xs text-slate-400 truncate italic mt-0.5">"{e.remark}"</div>}
      </div>
      <div className="text-right shrink-0">
        <div className={`font-semibold ${e.type === "in" ? "text-emerald-700" : "text-rose-700"}`}>
          {e.type === "in" ? "+" : "-"}{cur}{e.amount.toLocaleString()}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">Bal {cur}{balanceText}</div>
      </div>
    </button>
  );
}

function MoveCopyModal({ entries, otherBooks, cur, onClose, onAction }) {
  const single = entries.length === 1 ? entries[0] : null;
  const totalAmount = entries.reduce((s, e) => s + (e.type === "in" ? e.amount : -e.amount), 0);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-t-2xl max-h-[75vh] flex flex-col" onClick={(ev) => ev.stopPropagation()}>
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-slate-900">Move or Copy {single ? "Entry" : `${entries.length} Entries`}</div>
            <button onClick={onClose} className="p-1 text-slate-400"><X size={18} /></button>
          </div>
          <div className="text-sm text-slate-500 mt-1">
            {single
              ? <>{single.type === "in" ? "+" : "-"}{cur}{single.amount.toLocaleString()} · {single.contact || single.category || (single.type === "in" ? "Cash In" : "Cash Out")}</>
              : <>{entries.length} entries selected · net {totalAmount >= 0 ? "+" : "-"}{cur}{Math.abs(totalAmount).toLocaleString()}</>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {otherBooks.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">No other books in this business to move or copy into.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {otherBooks.map((b) => (
                <div key={b.id} className="flex items-center justify-between px-4 py-3">
                  <div className="font-medium text-slate-800 text-sm">{b.name}</div>
                  <div className="flex gap-2">
                    <button onClick={() => onAction(b.id, "copy")} className="text-xs font-medium border border-teal-700 text-teal-700 rounded-lg px-3 py-1.5">Copy</button>
                    <button onClick={() => onAction(b.id, "move")} className="text-xs font-medium bg-teal-700 text-white rounded-lg px-3 py-1.5">Move</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// ---------- Entry detail ----------
function EntryDetailScreen({ ctx, bookId, entryId }) {
  const { pop, push, getEntries, appSettings, activeBusiness, canAddEntries } = ctx;
  const book = activeBusiness?.books.find((b) => b.id === bookId);
  const cur = bookCurrency(book, appSettings);
  const [entry, setEntry] = useState(null);

  useEffect(() => {
    getEntries(bookId).then((es) => setEntry(es.find((e) => e.id === entryId) || null));
  }, [bookId, entryId]);

  if (!entry) {
    return (
      <div className="flex-1 flex flex-col">
        <TopHeader title="Entry" onBack={pop} />
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-teal-700" size={24} /></div>
      </div>
    );
  }

  const isIn = entry.type === "in";
  const methodKind = entry.paymentMode === "Cash" ? "Cash" : "Electronic";

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader title="Entry Details" onBack={pop} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className={`rounded-xl p-4 text-center ${isIn ? "bg-emerald-50" : "bg-rose-50"}`}>
          <div className={`text-xs font-medium ${isIn ? "text-emerald-800" : "text-rose-800"}`}>{isIn ? "Cash In" : "Cash Out"}</div>
          <div className={`text-2xl font-bold ${isIn ? "text-emerald-800" : "text-rose-800"}`}>{cur}{entry.amount.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">{methodKind} · {entry.paymentMode}</div>
        </div>

        {entry.receipt && (
          <img src={entry.receipt} alt="Receipt" className="w-full max-h-72 object-contain rounded-xl border border-slate-200 bg-white" />
        )}

        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {entry.contact && (
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-slate-500">{isIn ? "Received From" : "Paid To"}</span>
              <span className="text-sm font-medium text-slate-800">{entry.contact}</span>
            </div>
          )}
          {entry.category && (
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-slate-500">Category</span>
              <span className="text-sm font-medium text-slate-800">{entry.category}</span>
            </div>
          )}
          {entry.remark && (
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-slate-500">Remark</span>
              <span className="text-sm font-medium text-slate-800">{entry.remark}</span>
            </div>
          )}
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-slate-500">Date</span>
            <span className="text-sm font-medium text-slate-800">{fmtDate(entry.date)} · {entry.time}</span>
          </div>
        </div>

        {canAddEntries && (
          <button onClick={() => push("addEntry", { bookId, editEntry: entry })}
            className="w-full bg-teal-700 text-white py-2.5 rounded-xl font-semibold">
            Edit Entry
          </button>
        )}

        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          <div className="px-4 py-3">
            <div className="text-xs text-slate-500 mb-0.5">Created by</div>
            <div className="text-sm font-medium text-slate-800">{entry.addedBy || "You"}{entry.createdAt ? ` · ${fmtDateTime(entry.createdAt)}` : ""}</div>
          </div>
          <div className="px-4 py-3">
            <div className="text-xs text-slate-500 mb-0.5">Last edited by</div>
            <div className="text-sm font-medium text-slate-800">
              {entry.editedBy ? `${entry.editedBy} · ${fmtDateTime(entry.editedAt)}` : "Never edited"}
            </div>
          </div>
          {entry.transferredFrom && (
            <div className="px-4 py-3">
              <div className="text-xs text-slate-500 mb-0.5">Last transferred from</div>
              <div className="text-sm font-medium text-slate-800">{entry.transferredFrom} · {fmtDateTime(entry.transferredAt)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Add / Edit entry ----------
function AddEntryScreen({ ctx, bookId, type, editEntry }) {
  const { pop, getEntries, saveEntries, appSettings, logActivity, viewer, activeBusiness } = ctx;
  const isEdit = !!editEntry;
  const book = activeBusiness?.books.find((b) => b.id === bookId);
  const bookCur = bookCurrency(book, appSettings);
  const [form, setForm] = useState(editEntry || {
    type: type || "in", date: todayStr(), time: nowTimeStr(), amount: "", contact: "", remark: "", category: "", paymentMode: "Cash", receipt: null,
  });
  const [showMoreModes, setShowMoreModes] = useState(false);
  const [contacts, setContacts] = useState([]);

  const onReceiptChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, receipt: reader.result }));
    reader.readAsDataURL(file);
  };

  useEffect(() => { getEntries(bookId).then((es) => {
    setContacts([...new Set(es.map(e => e.contact).filter(Boolean))]);
  }); }, [bookId]);

  const save = async (addAnother) => {
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) return;
    const es = await getEntries(bookId);
    let next;
    if (isEdit) {
      const payload = { ...form, amount: amt, addedBy: editEntry.addedBy, createdAt: editEntry.createdAt, editedBy: viewer.name, editedAt: new Date().toISOString() };
      next = es.map((e) => e.id === editEntry.id ? { ...payload, id: editEntry.id } : e);
      await logActivity(bookId, `${viewer.name} edited an entry (${bookCur}${amt})`);
    } else {
      const payload = { ...form, amount: amt, addedBy: viewer.name };
      next = [...es, { ...payload, id: uid(), createdAt: new Date().toISOString() }];
      await logActivity(bookId, `${viewer.name} added ${form.type === "in" ? "Cash In" : "Cash Out"} of ${bookCur}${amt}`);
    }
    await saveEntries(bookId, next);
    if (addAnother) {
      setForm({ type: form.type, date: form.date, time: nowTimeStr(), amount: "", contact: "", remark: "", category: "", paymentMode: form.paymentMode, receipt: null });
    } else {
      pop();
    }
  };

  const deleteEntry = async () => {
    const es = await getEntries(bookId);
    await saveEntries(bookId, es.filter((e) => e.id !== editEntry.id));
    await logActivity(bookId, `${viewer.name} deleted an entry`);
    pop();
  };

  const isIn = form.type === "in";
  const modes = appSettings.paymentModes;
  const visibleModes = showMoreModes ? modes : modes.slice(0, 2);

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader title={isEdit ? "Edit Entry" : `Add ${isIn ? "Cash In" : "Cash Out"} Entry`} onBack={pop}
        right={isEdit ? <button onClick={deleteEntry} className="p-2 text-rose-700"><Trash2 size={18} /></button> : null} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isEdit && (
          <div>
            <div className="text-xs text-slate-500 mb-1.5">Entry Type</div>
            <div className="flex gap-2">
              <button onClick={() => setForm({ ...form, type: "in" })}
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl font-semibold border ${isIn ? "bg-emerald-700 text-white border-emerald-700" : "border-slate-300 text-slate-500"}`}>
                <Plus size={16} /> Cash In
              </button>
              <button onClick={() => setForm({ ...form, type: "out" })}
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl font-semibold border ${!isIn ? "bg-rose-700 text-white border-rose-700" : "border-slate-300 text-slate-500"}`}>
                <Minus size={16} /> Cash Out
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <label className="flex-1">
            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Calendar size={12} /> Date</div>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="flex-1">
            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Clock size={12} /> Time</div>
            <input type="text" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </label>
        </div>

        <label className="block">
          <div className="text-xs text-teal-700 mb-1 font-medium">Amount *</div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold pointer-events-none">{bookCur}</span>
            <input autoFocus type="number" inputMode="decimal" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full border-2 border-teal-600 rounded-lg pl-9 pr-3 py-2 text-lg font-semibold" placeholder="0" />
          </div>
        </label>

        <label className="block relative">
          <div className="text-xs text-slate-500 mb-1">{isIn ? "Received From" : "Paid To"}</div>
          <input list="contacts-list" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Add name" />
          <datalist id="contacts-list">{contacts.map((c) => <option key={c} value={c} />)}</datalist>
        </label>

        <label className="block">
          <div className="text-xs text-slate-500 mb-1">Remark (Item, Quantity..)</div>
          <input value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </label>

        <label className="block">
          <div className="text-xs text-slate-500 mb-1">Category</div>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">Select category</option>
            {appSettings.categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <div>
          <div className="text-xs text-slate-500 mb-1.5">Receipt / Photo</div>
          {form.receipt ? (
            <div className="relative inline-block">
              <img src={form.receipt} alt="Receipt" className="h-24 w-24 object-cover rounded-lg border border-slate-200" />
              <button onClick={() => setForm({ ...form, receipt: null })}
                className="absolute -top-2 -right-2 bg-slate-900 text-white rounded-full p-1"><X size={12} /></button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-lg py-3 text-sm text-slate-500 cursor-pointer">
              <Camera size={16} /> Add a screenshot or photo of receipt
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onReceiptChange} />
            </label>
          )}
        </div>

        <div>
          <div className="text-xs text-slate-500 mb-1.5">Payment Mode</div>
          <div className="flex items-center gap-2 flex-wrap">
            {visibleModes.map((m) => (
              <Chip key={m} tone={isIn ? "emerald" : "rose"} active={form.paymentMode === m} onClick={() => setForm({ ...form, paymentMode: m })}>{m}</Chip>
            ))}
            {!showMoreModes && modes.length > 2 && (
              <button onClick={() => setShowMoreModes(true)} className="text-teal-700 text-sm font-medium flex items-center gap-0.5">Show more <ChevronDown size={14} /></button>
            )}
          </div>
        </div>
      </div>
      <div className="p-3 border-t border-slate-200 bg-white flex gap-2">
        {!isEdit && (
          <button onClick={() => save(true)} className="flex-1 border border-teal-700 text-teal-700 py-2.5 rounded-xl font-semibold">Save & Add New</button>
        )}
        <button onClick={() => save(false)} className={`flex-1 text-white py-2.5 rounded-xl font-semibold ${isIn ? "bg-emerald-700" : "bg-rose-700"}`}>Save</button>
      </div>
    </div>
  );
}

// ---------- Book settings ----------
function BookSettingsScreen({ ctx, bookId }) {
  const { activeBusiness, pop, push, persistBusinesses, businesses, canManage, session, persistSession, appSettings } = ctx;
  const book = activeBusiness?.books.find((b) => b.id === bookId);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(book?.name || "");

  const doRename = async () => {
    const next = businesses.map((b) => b.id === activeBusiness.id ? { ...b, books: b.books.map(bk => bk.id === bookId ? { ...bk, name } : bk) } : b);
    await persistBusinesses(next);
    setRenaming(false);
  };

  const setBookCurrency = async (c) => {
    const next = businesses.map((b) => b.id === activeBusiness.id ? { ...b, books: b.books.map(bk => bk.id === bookId ? { ...bk, currency: c } : bk) } : b);
    await persistBusinesses(next);
  };

  const deleteBook = async () => {
    const next = businesses.map((b) => b.id === activeBusiness.id ? { ...b, books: b.books.filter(bk => bk.id !== bookId) } : b);
    await persistBusinesses(next);
    ctx.resetTo("books");
  };

  const members = activeBusiness?.members || [];

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader title="Book Settings" onBack={pop} />
      <div className="flex-1 overflow-y-auto p-4 pb-28 space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">Cashbook Name</div>
          {renaming ? (
            <div className="flex gap-2">
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              <button onClick={doRename} className="bg-teal-700 text-white px-3 rounded-lg text-sm font-medium">Save</button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-900">{book?.name}</div>
              {canManage && <button onClick={() => setRenaming(true)} className="text-teal-700 text-sm font-medium border border-teal-700 rounded-lg px-3 py-1">Rename</button>}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-2">Book Currency</div>
          <div className="flex gap-2 flex-wrap">
            {Object.keys(CURRENCIES).map((c) => (
              <Chip key={c} active={bookCurrency(book, appSettings) === c} onClick={() => canManage && setBookCurrency(c)}>{c} {CURRENCIES[c]}</Chip>
            ))}
          </div>
          <div className="text-xs text-slate-400 mt-2">This book's amounts display in this currency, independent of other books.</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          <div className="px-4 py-2 text-xs font-medium text-slate-400 uppercase">General Book Settings</div>
          <button onClick={() => push("activity", { bookId })} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
            <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700"><Clock size={16} /></div>
            <div className="flex-1"><div className="font-medium text-slate-900">Book Activity</div><div className="text-xs text-slate-500">Stay updated on all book activities</div></div>
            <ChevronRight size={16} className="text-slate-300" />
          </button>
          {canManage && (
            <button onClick={() => push("addMember", { bookId })} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
              <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700"><Users size={16} /></div>
              <div className="flex-1"><div className="font-medium text-slate-900">Manage Members</div><div className="text-xs text-slate-500">Add or edit roles for this book</div></div>
              <ChevronRight size={16} className="text-slate-300" />
            </button>
          )}
        </div>

        {members.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
            <div className="px-4 py-2 text-xs font-medium text-slate-400 uppercase">View as (simulate role)</div>
            <button onClick={async () => { await persistSession({ ...session, viewingAs: null }); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left ${!session.viewingAs ? "bg-teal-50" : ""}`}>
              <div className="w-8 h-8 rounded-full bg-teal-700 text-white flex items-center justify-center text-xs font-semibold">Y</div>
              <div className="flex-1"><div className="font-medium text-slate-900 text-sm">You</div><div className="text-xs text-slate-500">Primary Admin</div></div>
              {!session.viewingAs && <Check size={16} className="text-teal-700" />}
            </button>
            {members.map((m) => (
              <button key={m.id} onClick={async () => { await persistSession({ ...session, viewingAs: m.id }); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left ${session.viewingAs === m.id ? "bg-teal-50" : ""}`}>
                <div className="w-8 h-8 rounded-full bg-slate-300 text-white flex items-center justify-center text-xs font-semibold">{m.name[0]}</div>
                <div className="flex-1"><div className="font-medium text-slate-900 text-sm">{m.name}</div><div className="text-xs text-slate-500">{m.role}</div></div>
                {session.viewingAs === m.id && <Check size={16} className="text-teal-700" />}
              </button>
            ))}
          </div>
        )}

        {canManage && (
          <button onClick={deleteBook} className="w-full flex items-center justify-center gap-2 text-rose-700 border border-rose-200 rounded-xl py-3 font-medium">
            <Trash2 size={16} /> Delete Book
          </button>
        )}
      </div>
    </div>
  );
}

function ActivityScreen({ ctx, bookId }) {
  const { pop, getActivity } = ctx;
  const [activity, setActivity] = useState(null);
  useEffect(() => { getActivity(bookId).then(setActivity); }, [bookId]);
  return (
    <div className="flex-1 flex flex-col">
      <TopHeader title="Book Activity" onBack={pop} />
      <div className="flex-1 overflow-y-auto p-4">
        {activity === null ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-teal-700" size={24} /></div>
        ) : activity.length === 0 ? (
          <EmptyState icon={Clock} title="No activity yet" />
        ) : (
          <div className="space-y-3">
            {activity.map((a) => (
              <div key={a.id} className="bg-white border border-slate-200 rounded-lg px-3 py-2.5">
                <div className="text-sm text-slate-800">{a.text}</div>
                <div className="text-xs text-slate-400 mt-0.5">{new Date(a.at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Add member ----------
function AddMemberScreen({ ctx, bookId }) {
  const { activeBusiness, businesses, persistBusinesses, pop, logActivity, viewer } = ctx;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Data Operator");

  const members = activeBusiness?.members || [];

  const addMember = async () => {
    if (!name.trim()) return;
    const m = { id: uid(), name: name.trim(), phone: phone.trim(), role, status: "pending" };
    const next = businesses.map((b) => b.id === activeBusiness.id ? { ...b, members: [...b.members, m] } : b);
    await persistBusinesses(next);
    await logActivity(bookId, `${viewer.name} invited ${m.name} as ${role}`);
    setName(""); setPhone("");
  };

  const changeRole = async (memberId, newRole) => {
    const next = businesses.map((b) => b.id === activeBusiness.id ? { ...b, members: b.members.map(m => m.id === memberId ? { ...m, role: newRole } : m) } : b);
    await persistBusinesses(next);
  };

  const removeMember = async (memberId) => {
    const next = businesses.map((b) => b.id === activeBusiness.id ? { ...b, members: b.members.filter(m => m.id !== memberId) } : b);
    await persistBusinesses(next);
  };

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader title="Book Settings" onBack={pop} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-xs font-medium text-slate-400 uppercase">Members</div>
        {members.length === 0 && <div className="text-sm text-slate-400">No members added yet.</div>}
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="bg-white border border-slate-200 rounded-xl px-3 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-semibold">{m.name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 text-sm">{m.name}</div>
                <div className="text-xs text-slate-500">{m.phone || "No phone"} · {m.status === "pending" ? "Pending" : "Active"}</div>
              </div>
              <select value={m.role} onChange={(e) => changeRole(m.id, e.target.value)} className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white">
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <button onClick={() => removeMember(m.id)} className="text-rose-600 p-1"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="font-medium text-slate-800">Add Member</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number (optional)" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2 flex-wrap">
            {ROLES.map((r) => <Chip key={r} active={role === r} onClick={() => setRole(r)}>{r}</Chip>)}
          </div>
          <button onClick={addMember} className="w-full flex items-center justify-center gap-2 bg-teal-700 text-white py-2.5 rounded-xl font-semibold">
            <UserPlus size={16} /> Add Member
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Reports ----------
function ReportsScreen({ ctx, bookId }) {
  const { pop, push, activeBusiness, appSettings } = ctx;
  const book = activeBusiness?.books.find((b) => b.id === bookId);
  const members = activeBusiness?.members || [];
  const [duration, setDuration] = useState("All Time");
  const [entryType, setEntryType] = useState("All");
  const [member, setMember] = useState("All");
  const [cats, setCats] = useState([]);
  const [mode, setMode] = useState("All");
  const [reportType, setReportType] = useState("all");

  const toggleCat = (c) => setCats((cs) => cs.includes(c) ? cs.filter(x => x !== c) : [...cs, c]);

  const filters = { duration, entryType, member, cats, paymentMode: mode, reportType, bookName: book?.name };

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader title="Generate Report" onBack={pop} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-sm font-medium text-slate-700">Report will be generated for</div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <div className="text-xs text-slate-500 mb-1">Duration</div>
            <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white">
              {["All Time", "This Month", "Last 7 Days", "Today"].map(o => <option key={o}>{o}</option>)}
            </select>
          </label>
          <label className="block">
            <div className="text-xs text-slate-500 mb-1">Entry Type</div>
            <select value={entryType} onChange={(e) => setEntryType(e.target.value)} className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white">
              {["All", "Cash In", "Cash Out"].map(o => <option key={o}>{o}</option>)}
            </select>
          </label>
          <label className="block">
            <div className="text-xs text-slate-500 mb-1">Members</div>
            <select value={member} onChange={(e) => setMember(e.target.value)} className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white">
              <option>All</option>
              <option>You</option>
              {members.map((m) => <option key={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label className="block">
            <div className="text-xs text-slate-500 mb-1">Payment Mode</div>
            <select value={mode} onChange={(e) => setMode(e.target.value)} className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white">
              <option>All</option>
              {appSettings.paymentModes.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
        </div>

        <div>
          <div className="text-xs text-slate-500 mb-1.5">Categories</div>
          <div className="flex flex-wrap gap-2">
            {appSettings.categories.map((c) => <Chip key={c} active={cats.includes(c)} onClick={() => toggleCat(c)}>{c}</Chip>)}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-slate-700 mb-2">Select Report Type</div>
          <div className="space-y-2">
            {[
              { id: "all", title: "All Entries Report", sub: "List of all entries and details" },
              { id: "category", title: "Category-wise summary", sub: "Income & expenses of all categories" },
              { id: "payment", title: "Payment Mode summary", sub: "Income & expenses of all payment modes" },
            ].map((rt) => (
              <button key={rt.id} onClick={() => setReportType(rt.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left ${reportType === rt.id ? "border-teal-600 bg-teal-50" : "border-slate-200 bg-white"}`}>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${reportType === rt.id ? "border-teal-700 bg-teal-700" : "border-slate-300"}`}>
                  {reportType === rt.id && <Check size={12} className="text-white" />}
                </div>
                <div>
                  <div className="font-medium text-slate-900 text-sm">{rt.title}</div>
                  <div className="text-xs text-slate-500">{rt.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="p-3 border-t border-slate-200 bg-white flex gap-2">
        <button onClick={() => push("reportView", { bookId, filters: { ...filters, mode: "excel" } })}
          className="flex-1 flex items-center justify-center gap-2 border border-teal-700 text-teal-700 py-2.5 rounded-xl font-semibold">
          <Download size={16} /> Generate Excel
        </button>
        <button onClick={() => push("reportView", { bookId, filters: { ...filters, mode: "pdf" } })}
          className="flex-1 flex items-center justify-center gap-2 bg-teal-700 text-white py-2.5 rounded-xl font-semibold">
          <Printer size={16} /> Generate PDF
        </button>
      </div>
    </div>
  );
}

function applyFilters(entries, f) {
  let list = [...entries];
  const now = new Date();
  if (f.duration === "Today") list = list.filter(e => e.date === todayStr());
  else if (f.duration === "Last 7 Days") {
    const cut = new Date(); cut.setDate(cut.getDate() - 7);
    list = list.filter(e => new Date(e.date) >= cut);
  } else if (f.duration === "This Month") {
    list = list.filter(e => new Date(e.date).getMonth() === now.getMonth() && new Date(e.date).getFullYear() === now.getFullYear());
  }
  if (f.entryType === "Cash In") list = list.filter(e => e.type === "in");
  if (f.entryType === "Cash Out") list = list.filter(e => e.type === "out");
  if (f.member && f.member !== "All") list = list.filter(e => (e.addedBy || "You") === f.member);
  if (f.cats && f.cats.length) list = list.filter(e => f.cats.includes(e.category));
  if (f.paymentMode && f.paymentMode !== "All") list = list.filter(e => e.paymentMode === f.paymentMode);
  return list;
}

function ReportViewScreen({ ctx, bookId, filters }) {
  const { pop, getEntries, appSettings, activeBusiness } = ctx;
  const [entries, setEntries] = useState(null);
  useEffect(() => { getEntries(bookId).then(setEntries); }, [bookId]);

  const filtered = useMemo(() => {
    if (!entries) return [];
    return applyFilters(entries, filters);
  }, [entries, filters]);

  const book = activeBusiness?.books.find((b) => b.id === bookId);
  const cur = bookCurrency(book, appSettings);
  const totalIn = filtered.filter(e => e.type === "in").reduce((s, e) => s + e.amount, 0);
  const totalOut = filtered.filter(e => e.type === "out").reduce((s, e) => s + e.amount, 0);

  const categorySummary = useMemo(() => {
    const map = {};
    filtered.forEach(e => {
      const k = e.category || "Uncategorized";
      if (!map[k]) map[k] = { in: 0, out: 0 };
      map[k][e.type] += e.amount;
    });
    return map;
  }, [filtered]);

  const paymentSummary = useMemo(() => {
    const map = {};
    filtered.forEach(e => {
      const k = e.paymentMode;
      if (!map[k]) map[k] = { in: 0, out: 0 };
      map[k][e.type] += e.amount;
    });
    return map;
  }, [filtered]);

  const [exporting, setExporting] = useState(false);

  const reportSubtitle = `${filters.duration} · ${filters.entryType}${filters.member && filters.member !== "All" ? ` · ${filters.member}` : ""}`;

  const reportTable = () => {
    if (filters.reportType === "all") {
      return {
        headers: ["Date", "Type", "Amount", "Contact/Category"],
        rows: filtered.map(e => [fmtDate(e.date), e.type === "in" ? "Cash In" : "Cash Out", `${cur}${e.amount.toLocaleString()}`, e.contact || e.category || "-"]),
      };
    } else if (filters.reportType === "category") {
      return {
        headers: ["Category", "Total In", "Total Out"],
        rows: Object.entries(categorySummary).map(([k, v]) => [k, `${cur}${(v.in || 0).toLocaleString()}`, `${cur}${(v.out || 0).toLocaleString()}`]),
      };
    }
    return {
      headers: ["Payment Mode", "Total In", "Total Out"],
      rows: Object.entries(paymentSummary).map(([k, v]) => [k, `${cur}${(v.in || 0).toLocaleString()}`, `${cur}${(v.out || 0).toLocaleString()}`]),
    };
  };

  const downloadCsv = async () => {
    let rows = [];
    if (filters.reportType === "all") {
      rows.push(["Date", "Time", "Type", "Amount", "Contact", "Category", "Payment Mode", "Remark", "Added By"]);
      filtered.forEach(e => rows.push([e.date, e.time, e.type === "in" ? "Cash In" : "Cash Out", e.amount, e.contact, e.category, e.paymentMode, e.remark, e.addedBy || "You"]));
    } else if (filters.reportType === "category") {
      rows.push(["Category", "Total In", "Total Out"]);
      Object.entries(categorySummary).forEach(([k, v]) => rows.push([k, v.in || 0, v.out || 0]));
    } else {
      rows.push(["Payment Mode", "Total In", "Total Out"]);
      Object.entries(paymentSummary).forEach(([k, v]) => rows.push([k, v.in || 0, v.out || 0]));
    }
    const csv = rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    setExporting(true);
    try {
      await saveAndShareFile({ filename: `${filters.bookName || "report"}.csv`, data: csv, mimeType: "text/csv", base64: false });
    } catch (err) {
      console.error("CSV export failed", err);
      alert("Couldn't export the CSV. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const downloadPdf = async () => {
    const { headers, rows } = reportTable();
    setExporting(true);
    try {
      const base64 = buildReportPdfBase64({
        title: filters.bookName || "Report",
        subtitle: reportSubtitle,
        totalIn, totalOut, cur, headers, rows,
      });
      await saveAndShareFile({ filename: `${filters.bookName || "report"}.pdf`, data: base64, mimeType: "application/pdf", base64: true });
    } catch (err) {
      console.error("PDF export failed", err);
      alert("Couldn't create the PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader title="Report" onBack={pop}
        right={<button onClick={downloadPdf} disabled={exporting} className="p-2 text-teal-700 disabled:opacity-40"><Printer size={18} /></button>} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4" id="report-printable">
        <div className="text-center">
          <div className="font-bold text-slate-900">{filters.bookName}</div>
          <div className="text-xs text-slate-500">{filters.duration} · {filters.entryType} {filters.member && filters.member !== "All" ? `· ${filters.member}` : ""}</div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 bg-emerald-50 rounded-xl p-3 text-center">
            <div className="text-xs text-emerald-800">Total In</div>
            <div className="font-bold text-emerald-800">{cur}{totalIn.toLocaleString()}</div>
          </div>
          <div className="flex-1 bg-rose-50 rounded-xl p-3 text-center">
            <div className="text-xs text-rose-800">Total Out</div>
            <div className="font-bold text-rose-800">{cur}{totalOut.toLocaleString()}</div>
          </div>
        </div>

        {entries === null ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-teal-700" size={24} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={FileText} title="No entries match these filters" />
        ) : filters.reportType === "all" ? (
          <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-xl overflow-hidden">
            {filtered.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                <div>
                  <div className="font-medium text-slate-800">{e.contact || e.category || "Entry"}</div>
                  <div className="text-xs text-slate-400">{fmtDate(e.date)} · {e.category || "-"} · {e.paymentMode}</div>
                </div>
                <div className={e.type === "in" ? "text-emerald-700 font-semibold" : "text-rose-700 font-semibold"}>
                  {e.type === "in" ? "+" : "-"}{cur}{e.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : filters.reportType === "category" ? (
          <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-xl overflow-hidden">
            {Object.entries(categorySummary).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-3 py-2.5 text-sm">
                <div className="font-medium text-slate-800">{k}</div>
                <div className="text-right">
                  <div className="text-emerald-700">+{cur}{(v.in || 0).toLocaleString()}</div>
                  <div className="text-rose-700">-{cur}{(v.out || 0).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-xl overflow-hidden">
            {Object.entries(paymentSummary).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-3 py-2.5 text-sm">
                <div className="font-medium text-slate-800">{k}</div>
                <div className="text-right">
                  <div className="text-emerald-700">+{cur}{(v.in || 0).toLocaleString()}</div>
                  <div className="text-rose-700">-{cur}{(v.out || 0).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="p-3 border-t border-slate-200 bg-white">
        {filters.mode === "excel" ? (
          <button onClick={downloadCsv} disabled={exporting}
            className="w-full flex items-center justify-center gap-2 bg-teal-700 text-white py-2.5 rounded-xl font-semibold disabled:opacity-50">
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {exporting ? "Preparing…" : "Download CSV"}
          </button>
        ) : (
          <button onClick={downloadPdf} disabled={exporting}
            className="w-full flex items-center justify-center gap-2 bg-teal-700 text-white py-2.5 rounded-xl font-semibold disabled:opacity-50">
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
            {exporting ? "Preparing…" : "Print / Save as PDF"}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- Charts ----------
function ChartsScreen({ ctx, bookId }) {
  const { pop, getEntries, appSettings, activeBusiness } = ctx;
  const book = activeBusiness?.books.find((b) => b.id === bookId);
  const cur = bookCurrency(book, appSettings);
  const [entries, setEntries] = useState(null);
  const [groupBy, setGroupBy] = useState("category"); // "category" | "month"

  useEffect(() => { getEntries(bookId).then(setEntries); }, [bookId]);

  const expenseEntries = (entries || []).filter((e) => e.type === "out");
  const totalExpense = expenseEntries.reduce((s, e) => s + e.amount, 0);

  const data = useMemo(() => {
    const map = {};
    expenseEntries.forEach((e) => {
      const key = groupBy === "category"
        ? (e.category || "Uncategorized")
        : new Date(e.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", year: "numeric" });
      map[key] = (map[key] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [entries, groupBy]);

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader title="Expense Breakdown" subtitle={book?.name} onBack={pop} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex gap-2">
          <Chip active={groupBy === "category"} tone="rose" onClick={() => setGroupBy("category")}>By Category</Chip>
          <Chip active={groupBy === "month"} tone="rose" onClick={() => setGroupBy("month")}>By Month</Chip>
        </div>

        <div className="bg-rose-50 rounded-xl p-3 text-center">
          <div className="text-xs text-rose-800">Total Expenses</div>
          <div className="font-bold text-rose-800 text-lg">{cur}{totalExpense.toLocaleString()}</div>
        </div>

        {entries === null ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-teal-700" size={24} /></div>
        ) : data.length === 0 ? (
          <EmptyState icon={PieChartIcon} title="No expenses yet" hint="Add a Cash Out entry to see the breakdown here." />
        ) : (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-2" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} paddingAngle={2}>
                    {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `${cur}${Number(v).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {data.map((d, i) => (
                <div key={d.name} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="flex-1 text-slate-800">{d.name}</span>
                  <span className="text-slate-500">{totalExpense ? Math.round((d.value / totalExpense) * 100) : 0}%</span>
                  <span className="font-semibold text-slate-900 w-24 text-right">{cur}{d.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Settings tab ----------
function SettingsScreen({ ctx }) {
  const { push } = ctx;
  const Item = ({ icon: Icon, title, sub, onClick }) => (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
      <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700 shrink-0"><Icon size={16} /></div>
      <div className="flex-1"><div className="font-medium text-slate-900">{title}</div><div className="text-xs text-slate-500">{sub}</div></div>
      <ChevronRight size={16} className="text-slate-300" />
    </button>
  );
  return (
    <div className="flex-1 flex flex-col">
      <TopHeader title="Settings" />
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-slate-100 bg-white">
          <Item icon={Users} title="Business Team" sub="Add, remove or change role" onClick={() => push("businessTeam")} />
          <Item icon={ArrowRightLeft} title="Move Book Requests" sub="Approve or deny requests" onClick={() => push("moveRequests")} />
          <Item icon={Building2} title="Business Settings" sub="Settings specific to this business" onClick={() => push("businessSettings")} />
        </div>
        <div className="px-4 py-2 text-xs font-medium text-slate-400 uppercase bg-slate-100">General Settings</div>
        <div className="divide-y divide-slate-100 bg-white">
          <Item icon={SettingsIcon} title="App Settings" sub="Currency, categories, payment modes" onClick={() => push("appSettings")} />
          <Item icon={Bell} title="Reminders" sub="Get notified about things to buy or pay for" onClick={() => push("reminders")} />
          <Item icon={Eye} title="Your Profile" sub="Name, mobile number, email" onClick={() => push("profile")} />
          <Item icon={Info} title="About በጅሮንድ" sub="Privacy policy, T&C, About us" onClick={() => push("about")} />
        </div>
      </div>
    </div>
  );
}

function BusinessTeamScreen({ ctx }) {
  const { activeBusiness, pop } = ctx;
  const members = activeBusiness?.members || [];
  return (
    <div className="flex-1 flex flex-col">
      <TopHeader title="Business Team" onBack={pop} />
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-teal-700 text-white flex items-center justify-center font-semibold">Y</div>
          <div className="flex-1"><div className="font-medium text-slate-900 text-sm">You</div><div className="text-xs text-slate-500">Primary Admin</div></div>
          <ShieldCheck size={16} className="text-teal-700" />
        </div>
        {members.length === 0 ? (
          <EmptyState icon={Users} title="No team members yet" hint="Add members from a book's settings to invite them here." />
        ) : members.map((m) => (
          <div key={m.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-300 text-white flex items-center justify-center font-semibold">{m.name[0]}</div>
            <div className="flex-1"><div className="font-medium text-slate-900 text-sm">{m.name}</div><div className="text-xs text-slate-500">{m.role} · {m.status === "pending" ? "Pending" : "Active"}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MoveRequestsScreen({ ctx }) {
  const { activeBusiness, businesses, persistBusinesses, pop } = ctx;
  const requests = (activeBusiness?.moveRequests || []);

  const respond = async (reqId, approve) => {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;
    let next = businesses;
    if (approve) {
      const fromBiz = businesses.find(b => b.id === req.fromBusinessId);
      const bookToMove = fromBiz?.books.find(bk => bk.id === req.bookId);
      if (bookToMove) {
        next = businesses.map((b) => {
          if (b.id === req.fromBusinessId) return { ...b, books: b.books.filter(bk => bk.id !== req.bookId) };
          if (b.id === activeBusiness.id) return { ...b, books: [...b.books, bookToMove], moveRequests: b.moveRequests.filter(r => r.id !== reqId) };
          return b;
        });
      }
    } else {
      next = businesses.map((b) => b.id === activeBusiness.id ? { ...b, moveRequests: b.moveRequests.filter(r => r.id !== reqId) } : b);
    }
    await persistBusinesses(next);
  };

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader title="Move Book Requests" onBack={pop} />
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {requests.length === 0 ? (
          <EmptyState icon={Inbox} title="No pending requests" hint="Requests to move a book into this business will appear here." />
        ) : requests.map((r) => (
          <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="font-medium text-slate-900 text-sm">{r.bookName}</div>
            <div className="text-xs text-slate-500 mb-3">From {r.fromBusinessName}</div>
            <div className="flex gap-2">
              <button onClick={() => respond(r.id, true)} className="flex-1 bg-teal-700 text-white py-2 rounded-lg text-sm font-medium">Approve</button>
              <button onClick={() => respond(r.id, false)} className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-lg text-sm font-medium">Deny</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BusinessSettingsScreen({ ctx }) {
  const { activeBusiness, businesses, persistBusinesses, pop, session, resetTo } = ctx;
  const [name, setName] = useState(activeBusiness?.name || "");
  const [moveTarget, setMoveTarget] = useState("");
  const [moveBook, setMoveBook] = useState("");

  const rename = async () => {
    const next = businesses.map((b) => b.id === activeBusiness.id ? { ...b, name } : b);
    await persistBusinesses(next);
  };

  const requestMove = async () => {
    if (!moveTarget || !moveBook) return;
    const book = activeBusiness.books.find(b => b.id === moveBook);
    const req = { id: uid(), bookId: moveBook, bookName: book.name, fromBusinessId: activeBusiness.id, fromBusinessName: activeBusiness.name };
    const next = businesses.map((b) => b.id === moveTarget ? { ...b, moveRequests: [...(b.moveRequests || []), req] } : b);
    await persistBusinesses(next);
    setMoveBook(""); setMoveTarget("");
  };

  const deleteBusiness = async () => {
    const next = businesses.filter((b) => b.id !== activeBusiness.id);
    await persistBusinesses(next);
    resetTo("books");
  };

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader title="Business Settings" onBack={pop} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">Business Name</div>
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <button onClick={rename} className="bg-teal-700 text-white px-3 rounded-lg text-sm font-medium">Save</button>
          </div>
        </div>

        {businesses.length > 1 && activeBusiness.books.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="font-medium text-slate-800 flex items-center gap-2"><ArrowRightLeft size={16} className="text-teal-700" /> Move a book to another business</div>
            <select value={moveBook} onChange={(e) => setMoveBook(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">Select book</option>
              {activeBusiness.books.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={moveTarget} onChange={(e) => setMoveTarget(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">Select target business</option>
              {businesses.filter(b => b.id !== activeBusiness.id).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button onClick={requestMove} className="w-full bg-teal-700 text-white py-2.5 rounded-xl font-semibold text-sm">Send Move Request</button>
          </div>
        )}

        <button onClick={deleteBusiness} className="w-full flex items-center justify-center gap-2 text-rose-700 border border-rose-200 rounded-xl py-3 font-medium">
          <Trash2 size={16} /> Delete Business
        </button>
      </div>
    </div>
  );
}

function AppSettingsScreen({ ctx }) {
  const { appSettings, persistSettings, pop } = ctx;
  const [newCat, setNewCat] = useState("");
  const [newMode, setNewMode] = useState("");

  const addCat = async () => {
    if (!newCat.trim()) return;
    await persistSettings({ ...appSettings, categories: [...appSettings.categories, newCat.trim()] });
    setNewCat("");
  };
  const removeCat = async (c) => persistSettings({ ...appSettings, categories: appSettings.categories.filter(x => x !== c) });
  const addMode = async () => {
    if (!newMode.trim()) return;
    await persistSettings({ ...appSettings, paymentModes: [...appSettings.paymentModes, newMode.trim()] });
    setNewMode("");
  };
  const removeMode = async (m) => persistSettings({ ...appSettings, paymentModes: appSettings.paymentModes.filter(x => x !== m) });

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader title="App Settings" onBack={pop} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="font-medium text-slate-800 mb-2">Currency</div>
          <div className="flex gap-2 flex-wrap">
            {Object.keys(CURRENCIES).map((c) => (
              <Chip key={c} active={appSettings.currency === c} onClick={() => persistSettings({ ...appSettings, currency: c })}>{c} {CURRENCIES[c]}</Chip>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="font-medium text-slate-800 mb-2">Categories</div>
          <div className="flex flex-wrap gap-2 mb-3">
            {appSettings.categories.map((c) => (
              <span key={c} className="flex items-center gap-1 bg-slate-100 rounded-full pl-3 pr-1 py-1 text-sm text-slate-700">
                {c} <button onClick={() => removeCat(c)} className="p-1 text-slate-400"><X size={12} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category" className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <button onClick={addCat} className="bg-teal-700 text-white px-3 rounded-lg text-sm font-medium">Add</button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="font-medium text-slate-800 mb-2">Payment Modes</div>
          <div className="flex flex-wrap gap-2 mb-3">
            {appSettings.paymentModes.map((m) => (
              <span key={m} className="flex items-center gap-1 bg-slate-100 rounded-full pl-3 pr-1 py-1 text-sm text-slate-700">
                {m} <button onClick={() => removeMode(m)} className="p-1 text-slate-400"><X size={12} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newMode} onChange={(e) => setNewMode(e.target.value)} placeholder="New payment mode" className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <button onClick={addMode} className="bg-teal-700 text-white px-3 rounded-lg text-sm font-medium">Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Loan Amortization Calculator ----------
function computeAmortization(principal, annualRatePct, termMonths) {
  const p = Number(principal) || 0;
  const n = Math.round(Number(termMonths)) || 0;
  const r = (Number(annualRatePct) || 0) / 100 / 12;
  if (p <= 0 || n <= 0) return { payment: 0, totalInterest: 0, totalPaid: 0, rows: [] };

  const payment = r === 0 ? p / n : (p * r) / (1 - Math.pow(1 + r, -n));
  let balance = p;
  let totalInterest = 0;
  const rows = [];
  for (let i = 1; i <= n; i++) {
    const interest = balance * r;
    let principalPaid = payment - interest;
    let pmt = payment;
    if (i === n || balance - principalPaid < 0) {
      // last row: pay off exactly what's left, correcting for rounding drift
      principalPaid = balance;
      pmt = principalPaid + interest;
    }
    balance = Math.max(0, balance - principalPaid);
    totalInterest += interest;
    rows.push({ month: i, payment: pmt, principal: principalPaid, interest, balance });
  }
  return { payment, totalInterest, totalPaid: p + totalInterest, rows };
}

function LoanCalculatorScreen({ ctx }) {
  const { pop, appSettings } = ctx;
  const cur = appSettings.currency;
  const [principal, setPrincipal] = useState("10000");
  const [rate, setRate] = useState("6");
  const [termValue, setTermValue] = useState("5");
  const [termUnit, setTermUnit] = useState("years");
  const [showSchedule, setShowSchedule] = useState(false);

  const termMonths = termUnit === "years" ? (Number(termValue) || 0) * 12 : (Number(termValue) || 0);
  const { payment, totalInterest, totalPaid, rows } = useMemo(
    () => computeAmortization(principal, rate, termMonths),
    [principal, rate, termMonths]
  );

  const fmt = (n) => `${cur}${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader title="Loan Calculator" subtitle="Amortization schedule" onBack={pop} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Loan amount</label>
            <div className="mt-1 flex items-center border border-slate-300 rounded-lg overflow-hidden">
              <span className="px-3 text-slate-500 bg-slate-50 border-r border-slate-300">{cur}</span>
              <input type="number" inputMode="decimal" value={principal} onChange={(e) => setPrincipal(e.target.value)}
                className="flex-1 px-3 py-2 text-sm outline-none" placeholder="10000" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Annual interest rate (%)</label>
            <input type="number" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" placeholder="6" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Loan term</label>
            <div className="mt-1 flex gap-2">
              <input type="number" inputMode="numeric" value={termValue} onChange={(e) => setTermValue(e.target.value)}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" placeholder="5" />
              <select value={termUnit} onChange={(e) => setTermUnit(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none bg-white">
                <option value="years">Years</option>
                <option value="months">Months</option>
              </select>
            </div>
          </div>
        </div>

        {rows.length > 0 && (
          <>
            <div className="bg-teal-700 rounded-xl p-4 text-white">
              <div className="text-xs text-teal-100">Monthly Payment</div>
              <div className="text-2xl font-bold">{fmt(payment)}</div>
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-teal-600">
                <div>
                  <div className="text-xs text-teal-100">Total Interest</div>
                  <div className="font-semibold">{fmt(totalInterest)}</div>
                </div>
                <div>
                  <div className="text-xs text-teal-100">Total Paid</div>
                  <div className="font-semibold">{fmt(totalPaid)}</div>
                </div>
              </div>
            </div>

            <button onClick={() => setShowSchedule((s) => !s)}
              className="w-full flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3">
              <span className="font-medium text-slate-900 text-sm">Amortization Schedule ({rows.length} payments)</span>
              <ChevronDown size={18} className={`text-slate-400 transition-transform ${showSchedule ? "rotate-180" : ""}`} />
            </button>

            {showSchedule && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-4 gap-1 px-3 py-2 bg-slate-50 text-xs font-medium text-slate-500 border-b border-slate-200">
                  <div>#</div>
                  <div className="text-right">Principal</div>
                  <div className="text-right">Interest</div>
                  <div className="text-right">Balance</div>
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                  {rows.map((r) => (
                    <div key={r.month} className="grid grid-cols-4 gap-1 px-3 py-2 text-xs">
                      <div className="text-slate-500">{r.month}</div>
                      <div className="text-right text-slate-700">{fmt(r.principal)}</div>
                      <div className="text-right text-slate-400">{fmt(r.interest)}</div>
                      <div className="text-right font-medium text-slate-900">{fmt(r.balance)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RemindersScreen({ ctx }) {
  const { pop, plannedItems, persistPlanned, appSettings, notifPermission, requestNotifPermission } = ctx;
  const pending = plannedItems.filter((p) => !p.done);

  const setReminder = async (id, iso) => {
    const item = plannedItems.find((p) => p.id === id);
    if (!item) return;
    const nextItem = { ...item, reminderAt: iso };
    await persistPlanned(plannedItems.map((p) => p.id === id ? nextItem : p));
    if (iso) await schedulePlannedReminder(nextItem);
    else await cancelPlannedReminder(item);
  };

  const onAllow = async () => {
    const p = await requestNotifPermission();
    if (p !== "granted") {
      alert("Notifications weren't allowed. You can still set reminder times, but you won't get a native alert — allow notifications from your phone's app settings to enable them.");
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader title="Reminders" onBack={pop} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700 shrink-0">
            {notifPermission === "granted" ? <BellRing size={16} /> : <BellOff size={16} />}
          </div>
          <div className="flex-1">
            <div className="font-medium text-slate-800 text-sm">Notifications</div>
            <div className="text-xs text-slate-500">
              {notifPermission === "granted" ? "Allowed on this device" : "Allow notifications to get native alerts at the time you pick"}
            </div>
          </div>
          {notifPermission !== "granted" && (
            <button onClick={onAllow} className="text-xs font-medium text-teal-700 border border-teal-200 rounded-lg px-3 py-1.5 shrink-0">Allow</button>
          )}
        </div>

        <p className="text-xs text-slate-500 px-1">
          Set a date and time for any pending item on your "to buy / to pay for" list, and TallyBook will remind you.
        </p>

        {pending.length === 0 ? (
          <EmptyState icon={Bell} title="Nothing to remind you about" hint='Add items from the list icon that floats on any screen, then come back here to set reminders.' />
        ) : (
          <div className="space-y-2">
            {pending.map((p) => (
              <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-3.5">
                <div className="font-medium text-slate-900 text-sm mb-0.5">{p.desc}</div>
                <div className="text-xs text-slate-500 mb-2">{p.category} · {appSettings.currency}{Number(p.amount || 0).toLocaleString()}</div>
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    defaultValue={p.reminderAt ? p.reminderAt.slice(0, 16) : ""}
                    onChange={(e) => setReminder(p.id, e.target.value ? new Date(e.target.value).toISOString() : null)}
                    className="flex-1 min-w-0 border border-slate-300 rounded-lg px-2.5 py-2 text-sm"
                  />
                  {p.reminderAt && (
                    <button onClick={() => setReminder(p.id, null)} className="text-xs text-rose-600 border border-rose-200 rounded-lg px-2.5 shrink-0">Clear</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileScreen({ ctx }) {
  const { pop } = ctx;
  const [profile, setProfile] = useState({ name: "", mobile: "", email: "" });
  useEffect(() => { storeGet("profile", { name: "", mobile: "", email: "" }).then(setProfile); }, []);
  const save = async (next) => { setProfile(next); await storeSet("profile", next); };
  return (
    <div className="flex-1 flex flex-col">
      <TopHeader title="Your Profile" onBack={pop} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <label className="block">
          <div className="text-xs text-slate-500 mb-1">Name</div>
          <input value={profile.name} onChange={(e) => save({ ...profile, name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <div className="text-xs text-slate-500 mb-1">Mobile Number</div>
          <input value={profile.mobile} onChange={(e) => save({ ...profile, mobile: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <div className="text-xs text-slate-500 mb-1">Email</div>
          <input value={profile.email} onChange={(e) => save({ ...profile, email: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </label>
      </div>
    </div>
  );
}

function AboutScreen({ ctx }) {
  const { pop } = ctx;
  return (
    <div className="flex-1 flex flex-col">
      <TopHeader title="About በጅሮንድ" onBack={pop} />
      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm text-slate-600">
        <p>በጅሮንድ is a simple ledger for tracking cash in and cash out across businesses and books, with lightweight team roles and exportable reports.</p>
        <p>All your data is stored privately and stays on your account only.</p>
        <p className="text-xs text-slate-400 pt-4">Version 1.0.0 · Demo build</p>
      </div>
    </div>
  );
}

function HelpScreen() {
  return (
    <div className="flex-1 flex flex-col">
      <TopHeader title="Help" />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {[
          ["How do I add a cash entry?", "Open a book, tap Cash In or Cash Out, fill in the amount and details, then Save."],
          ["How do I invite a team member?", "Open a book → the person-add icon in the header → Add Member, then set their role."],
          ["What do the roles mean?", "Book Admin: full control. Data Operator: can add entries. Viewer: read-only."],
          ["How do I export a report?", "Open a book → the report icon → choose filters and Generate Excel or PDF."],
          ["How do I search or filter entries?", "Open a book and tap the search icon in the header — filter by Cash In/Out or search contact, remark, and category."],
          ["Where's the expense breakdown chart?", "Open a book → the pie chart icon in the header — switch between by category and by month."],
          ["Can each book use a different currency?", "Yes — open a book → the menu icon → Book Settings, and pick a currency just for that book."],
          ["Can I hide a book's balance?", "On the books list, tap the eye icon next to any book to hide or show its balance."],
        ].map(([q, a]) => (
          <div key={q} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="font-medium text-slate-900 text-sm mb-1">{q}</div>
            <div className="text-sm text-slate-500">{a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
