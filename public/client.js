const socket = io();

const config = window.ROOM_CONFIG;
let buttons = Array.from(document.querySelectorAll('button')).slice(0, 9);
let turnDisplay = document.getElementById('turnDisplay');
let winnerDisplay = document.getElementById('winner');

let playerSymbol = null;
let currentTurn = null;

const setButtonsState = () => {
    buttons.forEach((button, idx) => {
        const occupied = button.textContent && button.textContent.trim() !== '';
        if (occupied) {
            button.disabled = true;
        } else {
            button.disabled = currentTurn !== playerSymbol;
        }
    });
};

const renderMove = (position, player) => {
    buttons[position].textContent = player;
    buttons[position].disabled = true;
    setButtonsState();
}

// emit join
socket.emit('join-room', { username: config.username, room: config.roomCode });

socket.on('joined', ({ symbol, room }) => {
    playerSymbol = symbol;
    document.getElementById('playerSymbol').textContent = `Te vagy az ${playerSymbol} játékos`;
    currentTurn = null;
    setButtonsState();
});

socket.on('user-connected', (username) => {
    console.log(`${username} csatlakozott a játékhoz`);
});

socket.on('start-game', ({ turn }) => {
    currentTurn = turn;
    setButtonsState();
    turnDisplay.innerHTML = `Player ${currentTurn} mozdul`;
});

socket.on('turn-changed', (turn) => {
    currentTurn = turn;
    setButtonsState();
    turnDisplay.innerHTML = `Player ${currentTurn} mozdul`;
});

socket.on('invalid-move', (data) => {
    console.log('Invalid lépés:', data.reason);
});

// emit move
buttons.forEach((button, index) => {
    button.addEventListener('click', () => {
        if (currentTurn !== playerSymbol) {
            console.log('Nem a te köröd!');
            return;
        }
        const player = playerSymbol;
        const roomCode = config.roomCode;
        renderMove(index, player);
        socket.emit('make-move', { position: index, player, room: roomCode });
    });
});

socket.on('move-made', ({ position, player, room, winner }) => {
    if (room === config.roomCode) {
        renderMove(position, player);
        if (winner) {
            if (winner === 'draw') {
                winnerDisplay.innerHTML = 'Döntetlen!';
            } else {
                winnerDisplay.innerHTML = `Nyertes: ${winner}`;
            }
            buttons.forEach(btn => btn.disabled = true);
        }
    }
});

document.getElementById('resetBtn').addEventListener('click', () => {
    buttons.forEach(button => {
        button.textContent = String.fromCharCode(160);
        button.disabled = true;
    });
    socket.emit('restart-game', config.roomCode);
});

socket.on('game-restarted', (room) => {
    if (room === config.roomCode) {
        buttons.forEach(button => {
            button.textContent = String.fromCharCode(160);
            button.disabled = true;
        });
    }
    winnerDisplay.innerHTML = '';
});