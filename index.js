const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const ejs = require('ejs');
const path = require('path');
 
 
app.set('view engine', 'ejs');
 
app.use(express.static(path.join(__dirname, 'public')));
 
app.get('/', (req, res) => {
  res.render('index');
});
 
app.get('/main', (req, res) => {
  const { username, roomCode } = req.query;
 
  const roomConfig = {
    username,
    roomCode
  }
 
  res.render('main', { roomConfig });
})
 
// tictactoe socket
io.on('connection', (socket) => {
 
  console.log(`Új felhasználó csatlakozott: ${socket.id}`);
 
  socket.on('join-room', ({ username, room }) => {
    if (!rooms[room]) createRoom(room);
 
    const roomObj = rooms[room];
    if (roomObj.players.length >= 2) {
      socket.emit('room-full', room);
      return;
    }
 
    const symbol = roomObj.players.length === 0 ? 'X' : 'O';
    const player = { id: socket.id, username, symbol };
    roomObj.players.push(player);
    socket.join(room);
 
    socket.data.username = username;
    socket.data.room = room;
    socket.data.symbol = symbol;
 
    socket.emit('joined', { symbol, room });
 
    socket.to(room).emit('user-connected', username);
 
    if (roomObj.players.length === 2) {
      roomObj.status = 'playing';
      roomObj.turn = 'X';
      io.to(room).emit('start-game', { turn: roomObj.turn });
      io.to(room).emit('turn-changed', roomObj.turn);
    }
  });
 
  socket.on('leave-room', ({ username, room }) => {
    const roomObj = rooms[room];
    if (roomObj) {
      roomObj.players = roomObj.players.filter(p => p.id !== socket.id);
      roomObj.status = roomObj.players.length < 2 ? 'waiting' : roomObj.status;
    }
    socket.leave(room);
    socket.to(room).emit('user-disconnected', username);
  });
 
  socket.on('make-move', ({ position, player, room }) => {
    const roomObj = rooms[room];
    if (!roomObj || roomObj.status !== 'playing') return;
 
    const mySymbol = socket.data.symbol;
    if (!mySymbol || mySymbol !== roomObj.turn) {
      socket.emit('invalid-move', { reason: 'not-your-turn' });
      return;
    }
 
    if (roomObj.board[position]) {
      socket.emit('invalid-move', { reason: 'position-occupied' });
      return;
    }
 
    roomObj.board[position] = mySymbol;
 
    const winner = checkWinner(roomObj.board);
    if (winner) {
      roomObj.status = 'finished';
      roomObj.winner = winner === 'draw' ? 'draw' : winner;
      io.to(room).emit('move-made', { position, player: mySymbol, room, winner: roomObj.winner });
      return;
    }
 
    roomObj.turn = roomObj.turn === 'X' ? 'O' : 'X';
    io.to(room).emit('move-made', { position, player: mySymbol, room });
    io.to(room).emit('turn-changed', roomObj.turn);
  });
 
  socket.on('restart-game', (room) => {
    if (!rooms[room]) return;
    const roomObj = rooms[room];
    roomObj.board = Array(9).fill("");
    roomObj.turn = "X";
    roomObj.status = roomObj.players.length === 2 ? 'playing' : 'waiting';
    roomObj.winner = null;
    io.to(room).emit('game-restarted', room);
    io.to(room).emit('turn-changed', roomObj.turn);
  });
 
  socket.on('disconnect', () => {
    const room = socket.data.room;
    const username = socket.data.username;
    if (room && rooms[room]) {
      rooms[room].players = rooms[room].players.filter(p => p.id !== socket.id);
      rooms[room].status = rooms[room].players.length < 2 ? 'waiting' : rooms[room].status;
      socket.to(room).emit('user-disconnected', username);
    }
    console.log(`Felhasználó lecsatlakozott: ${socket.id}`);
  });
});
 
const rooms = {};
 
function createRoom(roomCode) {
  rooms[roomCode] = {
    players: [],
    board: Array(9).fill(""),
    turn: "X",
    status: "waiting",
    winner: null,
    rematchReady: new Set()
  };
}
 
function checkWinner(board) {
  const wins = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (const [a, b, c] of wins) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return board.includes("") ? null : "draw";
}
 
app.get('/', (req, res) => {
  res.render('index');
});
 
app.get("/room/:code", (req, res) => res.render("game", { roomCode: req.params.code }));
 
 
 
server.listen(3000, () => {
  console.log(`http://localhost:3000`);
});