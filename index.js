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
app.get('/game/:room', (req, res) => {
    res.render('game', { roomCode: req.params.room });
});

app.get('/main', (req, res) => {
    const {username, roomCode} = req.query;

    const roomConfig = {
        username,
        roomCode
    }

    res.render('main', (roomConfig))
})

// tictactoe socket
io.on('connection', (socket) => {

    console.log(`Új felhasználó csatlakozott: ${socket.id}`);

    socket.on('join-room', ({username, room}) => {
        socket.join(room);
        socket.to(room).emit('user-connected', username);
    });

    socket.on('leave-room', ({username, room}) => {
        socket.leave(room);
        socket.to(room).emit('user-disconnected', username);
    });

    socket.on('make-move', ({room, position}) => {
        socket.to(room).emit('move-made', {position, player: socket.id});
    });

    socket.on('restart-game', (room) => {
        socket.to(room).emit('game-restarted');
    });

    socket.on('disconnect', () => {
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
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (const [a,b,c] of wins) {
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



server.listen(3000, ()=>{
    console.log(`http://localhost:3000`);
});