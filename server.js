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

let players = {};
let roundActive = false;
let winner = null;

const ADMIN_PASSWORD = "admin123";

io.on("connection", (socket) => {

  socket.on("join", (name) => {
    players[socket.id] = { name, points: 0 };
    io.emit("updatePlayers", players);
  });

  socket.on("adminLogin", (pass, callback) => {
    if (pass === ADMIN_PASSWORD) {
      socket.data.isAdmin = true;
      callback(true);
    } else {
      callback(false);
    }
  });

  socket.on("startRound", () => {
    if (!socket.data.isAdmin) return;

    winner = null;
    roundActive = true;
    io.emit("countdown");
  });

  socket.on("buzz", () => {
    if (!players[socket.id]) return; // ✅ evita errores

    if (roundActive && !winner) {
      winner = players[socket.id].name;
      roundActive = false;
      io.emit("winner", winner);
    }
  });

  socket.on("addPoint", (name) => {
    for (let id in players) {
      if (players[id].name === name) {
        players[id].points++;
      }
    }
    io.emit("updatePlayers", players);
  });

  socket.on("resetRound", () => {
    if (!socket.data.isAdmin) return;

    winner = null;
    roundActive = false;
    io.emit("reset");
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("updatePlayers", players);
  });

});

server.listen(process.env.PORT || 3000, () => {
  console.log("Servidor activo");
});