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

// 🎨 Colores
const COLORS = ["#e74c3c","#3498db","#2ecc71","#f1c40f","#9b59b6","#e67e22"];
let colorIndex = 0;

let players = {};
let roundActive = false;
let winner = null;

const ADMIN_PASSWORD = "admin123";

io.on("connection", (socket) => {

  console.log("Conectado:", socket.id);

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

  // 🔐 ADMIN
  socket.on("adminLogin", (pass, callback) => {
    if (pass === ADMIN_PASSWORD) {
      socket.data.isAdmin = true;
      callback(true);
    } else {
      callback(false);
    }
  });

  // ▶ RONDA
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
      winner = socket.id;
      roundActive = false;
      io.emit("winner", players[socket.id]);
    }
  });

  // ➕ PUNTOS
  socket.on("addPoint", (id) => {
    if (!players[id]) return;

    players[id].points++;
    io.emit("updatePlayers", players);
  });

  // ♻ RESET PUNTOS
  socket.on("resetPoints", () => {
    if (!socket.data.isAdmin) return;

    for (let id in players) {
      players[id].points = 0;
    }

    io.emit("updatePlayers", players);
  });

  // ❌ ELIMINAR UNO
  socket.on("removePlayer", (id) => {
    if (!socket.data.isAdmin) return;

    const target = io.sockets.sockets.get(id);

    if (target) {
      target.emit("kicked");
      target.disconnect(true);
    }

    delete players[id];
    io.emit("updatePlayers", players);
  });

  // 🔥 FINALIZAR CONCURSO (NUEVO)
  socket.on("kickAll", () => {
    if (!socket.data.isAdmin) return;

    // Avisar a todos
    io.emit("gameEnded");

    // Desconectar a todos menos admin
    for (let [id, s] of io.sockets.sockets) {
      if (!s.data.isAdmin) {
        s.disconnect(true);
      }
    }

    // Limpiar estado
    players = {};
    winner = null;
    roundActive = false;

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