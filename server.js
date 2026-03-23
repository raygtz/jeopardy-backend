const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// 🎨 Colores tipo Kahoot
const COLORS = [
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#f1c40f",
  "#9b59b6",
  "#e67e22"
];

let colorIndex = 0;

let players = {};
let roundActive = false;
let winner = null; // ahora será ID

const ADMIN_PASSWORD = "admin123";

io.on("connection", (socket) => {

  console.log("Nuevo usuario conectado:", socket.id);

  // 👥 JOIN
  socket.on("join", (name) => {
    if (!name || name.trim() === "") return;

    const color = COLORS[colorIndex % COLORS.length];
    colorIndex++;

    players[socket.id] = {
      id: socket.id,
      name,
      points: 0,
      color
    };

    io.emit("updatePlayers", players);
  });

  // 🔐 ADMIN LOGIN
  socket.on("adminLogin", (pass, callback) => {
    if (pass === ADMIN_PASSWORD) {
      socket.data.isAdmin = true;
      callback(true);
    } else {
      callback(false);
    }
  });

  // ▶ INICIAR RONDA
  socket.on("startRound", () => {
    if (!socket.data.isAdmin) return;

    winner = null;
    roundActive = true;

    io.emit("countdown");
  });

  // ⚡ BUZZ
  socket.on("buzz", () => {
    if (!players[socket.id]) return;

    if (roundActive && !winner) {
      winner = socket.id; // 🔥 guardamos ID
      roundActive = false;

      io.emit("winner", players[socket.id]); // mandamos TODO el jugador
    }
  });

  // ➕ SUMAR PUNTOS (por ID)
  socket.on("addPoint", (id) => {
    if (!players[id]) return;

    players[id].points++;

    io.emit("updatePlayers", players);
  });

  // 🔄 RESET PUNTOS
  socket.on("resetPoints", () => {
    if (!socket.data.isAdmin) return;

    for (let id in players) {
      players[id].points = 0;
    }

    io.emit("updatePlayers", players);
  });

  // 🔁 RESET RONDA
  socket.on("resetRound", () => {
    if (!socket.data.isAdmin) return;

    winner = null;
    roundActive = false;

    io.emit("reset");
  });

  // ❌ DESCONECTAR
  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("updatePlayers", players);
  });

});

server.listen(process.env.PORT || 3000, () => {
  console.log("Servidor activo");
});