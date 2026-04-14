const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// =====================
// REGISTER
// =====================
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const hashed = bcrypt.hashSync(password, 10);

  db.query(
    'INSERT INTO users (username, password) VALUES (?, ?)',
    [username, hashed],
    (err) => {
      if (err) return res.json({ success: false, message: 'Username sudah ada!' });
      res.json({ success: true, message: 'Registrasi berhasil!' });
    }
  );
});

// =====================
// LOGIN
// =====================
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.query(
    'SELECT * FROM users WHERE username = ?',
    [username],
    (err, results) => {
      if (err || results.length === 0)
        return res.json({ success: false, message: 'User tidak ditemukan!' });

      const valid = bcrypt.compareSync(password, results[0].password);
      if (!valid)
        return res.json({ success: false, message: 'Password salah!' });

      res.json({ success: true, username });
    }
  );
});

// =====================
// GET HISTORY CHAT
// =====================
app.get('/messages/:room', (req, res) => {
  const { room } = req.params;
  db.query(
    'SELECT * FROM messages WHERE room = ? ORDER BY created_at ASC LIMIT 50',
    [room],
    (err, results) => {
      if (err) return res.json([]);
      res.json(results);
    }
  );
});

// =====================
// SOCKET.IO (REALTIME)
// =====================
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`User joined room: ${room}`);
  });

  socket.on('send_message', (data) => {
    const { username, message, room, replyTo } = data;

    // Simpan ke database
    db.query(
      'INSERT INTO messages (username, message, room) VALUES (?, ?, ?)',
      [username, message, room]
    );

    // Kirim ke semua user di room
    io.to(room).emit('receive_message', {
      username,
      message,
      room,
      replyTo,
      created_at: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// =====================
// JALANKAN SERVER
// =====================
server.listen(3000, () => {
  console.log('Server berjalan di http://localhost:3000');
});