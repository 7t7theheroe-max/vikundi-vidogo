/**
 * Firebase Configuration
 * ─────────────────────────────────────────────
 * 1. Go to https://console.firebase.google.com
 * 2. Create a project named "vikundi-vidogo"
 * 3. Add a Web app (</> icon)
 * 4. Copy your config values below
 * 5. Enable Authentication → Email/Password
 * 6. Enable Firestore Database (start in test mode for now)
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

/* ─── Firestore Collections ───────────────────
   users/    {uid}  → user profiles
   zones/    {id}   → zone definitions
   reports/  {id}   → weekly group reports
──────────────────────────────────────────── */

// ── Get a user's Firestore profile
async function getUserProfile(uid) {
  const snap = await db.collection('users').doc(uid).get();
  return snap.exists ? { uid, ...snap.data() } : null;
}

// ── Require auth; redirect to login if not signed in
function requireAuth(callback) {
  auth.onAuthStateChanged(async (user) => {
    if (!user) { window.location.href = 'login.html'; return; }
    const profile = await getUserProfile(user.uid);
    if (!profile)  { window.location.href = 'login.html'; return; }
    callback(user, profile);
  });
}

// ── Redirect to dashboard if already logged in
function redirectIfLoggedIn() {
  auth.onAuthStateChanged((user) => {
    if (user) window.location.href = 'dashboard.html';
  });
}

// ── Logout
async function logout() {
  await auth.signOut();
  window.location.href = 'login.html';
}

// ── Get all zones (for registration dropdown)
async function getZones() {
  const snap = await db.collection('zones').orderBy('name').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Show toast notification
function showToast(message, type = 'default', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', warning: '⚠️', default: 'ℹ️' };
  t.innerHTML = `<span>${icons[type] || icons.default}</span> ${message}`;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(10px)';
    setTimeout(() => t.remove(), 300);
  }, duration);
}

// ── Format Firestore timestamp to readable date
function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Get initials from name
function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ── Role display names
const ROLE_LABELS = {
  group_leader: 'Kiongozi wa Kikundi',
  zone_leader:  'Kiongozi wa Kanda',
  admin:        'Msimamizi'
};

// ── Firebase error messages in Swahili
function firebaseErrorMsg(code) {
  const map = {
    'auth/email-already-in-use':    'Barua pepe hii tayari inatumika.',
    'auth/invalid-email':           'Barua pepe si sahihi.',
    'auth/weak-password':           'Nenosiri liwe na herufi 6 au zaidi.',
    'auth/user-not-found':          'Akaunti haipo. Tafadhali jisajili.',
    'auth/wrong-password':          'Nenosiri si sahihi.',
    'auth/too-many-requests':       'Majaribio mengi sana. Jaribu baadaye.',
    'auth/network-request-failed':  'Tatizo la mtandao. Angalia muunganiko wako.',
  };
  return map[code] || 'Kuna tatizo. Tafadhali jaribu tena.';
}
