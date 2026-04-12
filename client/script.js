const SERVER = 'http://localhost:3000';
const socket = io(SERVER);

let currentUser = '';
let currentRoom = '';

// =====================
// TAB LOGIN/REGISTER
// =====================
function showTab(tab) {
  document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('tab-login').className = tab === 'login' ? 'active' : '';
  document.getElementById('tab-register').className = tab === 'register' ? 'active' : '';
}

// =====================
// REGISTER
// =====================
async function register() {
  const username = document.getElementById('reg-username').value;
  const password = document.getElementById('reg-password').value;

  const res = await fetch(`${SERVER}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  document.getElementById('reg-msg').textContent = data.message;
}

// =====================
// LOGIN
// =====================
async function login() {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  const res = await fetch(`${SERVER}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();

  if (data.success) {
    currentUser = data.username;
    document.getElementById('auth-page').style.display = 'none';
    document.getElementById('chat-page').style.display = 'flex';
    document.getElementById('current-user').textContent = '👤 ' + currentUser;
    joinRoom('general');
  } else {
    document.getElementById('login-msg').textContent = data.message;
  }
}

// =====================
// LOGOUT
// =====================
function logout() {
  currentUser = '';
  currentRoom = '';
  document.getElementById('chat-page').style.display = 'none';
  document.getElementById('auth-page').style.display = 'flex';
}

// =====================
// JOIN ROOM
// =====================
async function joinRoom(room) {
  currentRoom = room;
  socket.emit('join_room', room);

  document.getElementById('room-title').textContent = '# ' + room;
  document.getElementById('messages').innerHTML = '';

  document.querySelectorAll('.room-btn').forEach(btn => btn.classList.remove('active'));
  event.target && event.target.classList.add('active');

  // Load history
  const res = await fetch(`${SERVER}/messages/${room}`);
  const messages = await res.json();
  messages.forEach(m => displayMessage(m.username, m.message, m.created_at));
}

// =====================
// KIRIM PESAN
// =====================
function sendMessage() {
  const input = document.getElementById('msg-input');
  const message = input.value.trim();
  if (!message || !currentRoom) return;

  socket.emit('send_message', { username: currentUser, message, room: currentRoom });
  input.value = '';
}

// =====================
// TERIMA PESAN (REALTIME)
// =====================
socket.on('receive_message', (data) => {
  if (data.username !== currentUser) {
    playNotifSound();
  }
  displayMessage(data.username, data.message, data.created_at);
});

// =====================
// TAMPILKAN PESAN
// =====================
// Suara notifikasi
function playNotifSound() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, ctx.currentTime);
  oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.1);

  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.3);
}
function displayMessage(username, message, time) {
  const div = document.createElement('div');
  div.className = 'message ' + (username === currentUser ? 'mine' : 'others');

  const t = new Date(time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  div.innerHTML = `
    <div class="sender">${username}</div>
    <div>${message}</div>
    <div class="time">${t}</div>
  `;

  document.getElementById('messages').appendChild(div);
  document.getElementById('messages').scrollTop = 9999;
}