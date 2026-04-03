/**
 * Firebase Configuration — Vikundi Vidogo
 * Kanisa la Waadventista wa Sabato Kipunguni
 */

const firebaseConfig = {
  apiKey:            "AIzaSyC-Y1jhuizF_wOVanfNl-YsZuhAXNUa02o",
  authDomain:        "small-group-form.firebaseapp.com",
  projectId:         "small-group-form",
  storageBucket:     "small-group-form.firebasestorage.app",
  messagingSenderId: "939487729593",
  appId:             "1:939487729593:web:46b846975629fde8928868"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db   = firebase.firestore();

/* ═══════════════════════════════════════════
   COLLECTIONS:
   users/       {uid}  → user profiles
   zones/       {id}   → zone definitions
   reports/     {id}   → weekly reports
   members/     {id}   → group members (leaderId field)
   announcements/{id}  → admin announcements
   config/form         → form field configuration
═══════════════════════════════════════════ */

// ── Auth helpers ──────────────────────────────

async function getUserProfile(uid) {
  try {
    const snap = await db.collection('users').doc(uid).get();
    return snap.exists ? { uid, ...snap.data() } : null;
  } catch(e) { console.error('getUserProfile:', e); return null; }
}

function requireAuth(callback) {
  auth.onAuthStateChanged(async (user) => {
    if (!user) { window.location.href = 'login.html'; return; }
    const profile = await getUserProfile(user.uid);
    if (!profile) { window.location.href = 'login.html'; return; }
    callback(user, profile);
  });
}

function redirectIfLoggedIn() {
  auth.onAuthStateChanged((user) => {
    if (user) window.location.href = 'dashboard.html';
  });
}

async function logout() {
  await auth.signOut();
  window.location.href = 'login.html';
}

// ── Zones ─────────────────────────────────────

// Only return zones that have an approved zone leader
async function getActiveZones() {
  try {
    const snap = await db.collection('zones').get();
    const zones = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Filter: zone must have a leaderId with approved status
    const activeZones = [];
    for (const z of zones) {
      if (!z.leaderId) continue;
      const leaderSnap = await db.collection('users').doc(z.leaderId).get();
      if (leaderSnap.exists && leaderSnap.data().status === 'approved') {
        activeZones.push(z);
      }
    }
    return activeZones;
  } catch(e) { console.error('getActiveZones:', e); return []; }
}

async function getZones() {
  try {
    const snap = await db.collection('zones').orderBy('name').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) { console.error('getZones:', e); return []; }
}

// ── Members ───────────────────────────────────

async function getGroupMembers(leaderId) {
  try {
    const snap = await db.collection('members')
      .where('leaderId', '==', leaderId)
      .where('active', '==', true)
      .orderBy('name')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) {
    // Fallback without orderBy if index not created yet
    try {
      const snap2 = await db.collection('members')
        .where('leaderId', '==', leaderId)
        .where('active', '==', true)
        .get();
      return snap2.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a,b) => a.name.localeCompare(b.name));
    } catch(e2) { console.error('getGroupMembers:', e2); return []; }
  }
}

// ── Monthly average from last 4 reports ───────

async function calcMonthlyAverage(leaderId) {
  try {
    const snap = await db.collection('reports')
      .where('leaderId', '==', leaderId)
      .orderBy('submittedAt', 'desc')
      .limit(4)
      .get();
    if (snap.empty) return 0;
    const reports = snap.docs.map(d => d.data());
    const total = reports.reduce((s, r) => s + (Number(r.mahudhurio?.waliohudhuria) || 0), 0);
    return Math.round(total / reports.length);
  } catch(e) { console.error('calcMonthlyAverage:', e); return 0; }
}

// ── Missing reports this week ─────────────────

async function getMissingReports(zoneId) {
  try {
    // Get all approved leaders in this zone
    const leadersSnap = await db.collection('users')
      .where('zoneId', '==', zoneId)
      .where('role', '==', 'group_leader')
      .where('status', '==', 'approved')
      .get();
    const leaders = leadersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));

    // Get reports submitted in last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const reportsSnap = await db.collection('reports')
      .where('zoneId', '==', zoneId)
      .get();
    const recentLeaderIds = new Set(
      reportsSnap.docs
        .filter(d => d.data().submittedAt?.toDate() > weekAgo)
        .map(d => d.data().leaderId)
    );

    return leaders.filter(l => !recentLeaderIds.has(l.uid));
  } catch(e) { console.error('getMissingReports:', e); return []; }
}

// ── Announcements ─────────────────────────────

async function getAnnouncements(limit = 5) {
  try {
    const snap = await db.collection('announcements')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) { console.error('getAnnouncements:', e); return []; }
}

// ── Form config ───────────────────────────────

async function getFormConfig() {
  try {
    const snap = await db.collection('config').doc('form').get();
    if (snap.exists) return snap.data();
    // Return default config if none exists
    return getDefaultFormConfig();
  } catch(e) { return getDefaultFormConfig(); }
}

function getDefaultFormConfig() {
  return {
    sections: [
      { id: 'mahudhurio',  label: 'Mahudhurio na Ushirika',          enabled: true,  order: 1 },
      { id: 'somo',        label: 'Somo na Maombi',                  enabled: true,  order: 2 },
      { id: 'utembeleaji', label: 'Utembeleaji',                     enabled: true,  order: 3 },
      { id: 'michango',    label: 'Michango ya Maendeleo ya Kanisa',  enabled: true,  order: 4 },
      { id: 'uinjilisti',  label: 'Uinjilisti na Tathmini',          enabled: true,  order: 5 },
    ]
  };
}

async function saveFormConfig(config) {
  await db.collection('config').doc('form').set(config, { merge: true });
}

// ── Approval helpers ──────────────────────────

// Who can approve whom:
// group_leader  → zone_leader (of same zone) OR admin
// zone_leader   → admin ONLY

function canApprove(approverProfile, targetRole) {
  if (approverProfile.role === 'admin') return true;
  if (approverProfile.role === 'zone_leader' && targetRole === 'group_leader') return true;
  return false;
}

// ── Utilities ─────────────────────────────────

function showToast(message, type = 'default', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', warning: '⚠️', default: 'ℹ️' };
  t.innerHTML = `<span>${icons[type] || icons.default}</span> ${message}`;
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(10px)';
    t.style.transition = 'all .3s ease';
    setTimeout(() => t.remove(), 300);
  }, duration);
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateShort(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short' });
}

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}

function homeStudyLabel(present, total) {
  if (!total || total === 0) return 'Hawakai wakijifunza';
  const ratio = present / total;
  if (ratio > 0.5) return `Wengi (${present}/${total})`;
  if (ratio > 0)   return `Wachache (${present}/${total})`;
  return 'Hawakai wakijifunza';
}

const ROLE_LABELS = {
  group_leader: 'Kiongozi wa Kikundi',
  zone_leader:  'Kiongozi wa Kanda',
  admin:        'Msimamizi'
};

const STATUS_LABELS = {
  pending:  'Inasubiri',
  approved: 'Imeidhinishwa',
  rejected: 'Ilikataliwa'
};

function firebaseErrorMsg(code) {
  const map = {
    'auth/email-already-in-use':   'Barua pepe hii tayari inatumika.',
    'auth/invalid-email':          'Barua pepe si sahihi.',
    'auth/weak-password':          'Nenosiri liwe na herufi 6 au zaidi.',
    'auth/user-not-found':         'Akaunti haipo. Tafadhali jisajili.',
    'auth/wrong-password':         'Nenosiri si sahihi.',
    'auth/invalid-credential':     'Barua pepe au nenosiri si sahihi.',
    'auth/too-many-requests':      'Majaribio mengi. Jaribu baadaye.',
    'auth/network-request-failed': 'Tatizo la mtandao. Angalia muunganiko wako.',
  };
  return map[code] || 'Kuna tatizo. Tafadhali jaribu tena.';
}

// ── Number formatter ──────────────────────────
function fmtNum(n) {
  return Number(n || 0).toLocaleString('sw-TZ');
}
