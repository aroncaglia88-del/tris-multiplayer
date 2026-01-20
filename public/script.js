let socket;
let gameState = ["", "", "", "", "", "", "", "", ""];
let gameActive = true;

const setupDiv = document.getElementById('setup');
const gameDiv = document.getElementById('game');
const statusText = document.getElementById('status');
const cells = document.querySelectorAll('.cell');

document.getElementById('connect-btn').onclick = () => {
    const url = document.getElementById('server-url').value;
    socket = io(url ? url : undefined);

    socket.on('connect', () => {
        setupDiv.style.display = 'none';
        gameDiv.style.display = 'block';
    });

    socket.on('ricevi-mossa', (data) => {
        updateBoard(data.index, data.player);
    });
};

cells.forEach(cell => {
    cell.onclick = (e) => {
        const index = e.target.dataset.index;
        const player = (gameState.filter(s => s !== "").length % 2 === 0) ? "X" : "O";

        if (gameState[index] === "" && gameActive) {
            updateBoard(index, player);
            socket.emit('mossa-fatta', { index, player });
        }
    };
});

function updateBoard(index, player) {
    gameState[index] = player;
    cells[index].innerText = player;
    cells[index].classList.add(player.toLowerCase());
    checkWin();
}

function checkWin() {
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let s of wins) {
        if (gameState[s[0]] && gameState[s[0]] === gameState[s[1]] && gameState[s[0]] === gameState[s[2]]) {
            statusText.innerText = "Vittoria: " + gameState[s[0]];
            gameActive = false;
        }
    }
}