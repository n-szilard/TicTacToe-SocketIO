const socket = io();

let joinBtn = document.getElementById('joinBtn');

joinBtn.addEventListener('click', () => {
    console.log('asd')
    const username = nameInput.value;
    const room = codeInput.value;
    socket.emit('join-room', { username, room });
});
