let sudokuGrid = document.getElementById('sudoku-grid');
let difficulty = document.getElementById('difficulty');
let health, hints, elapsedTime = 0;
let puzzle = [], solution = [];
let selectedCell = null, gameTimer;
let leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];

const config = {
  Easy: { clues: 40, health: 10, hints: 10 },
  Medium: { clues: 30, health: 8, hints: 8 },
  Hard: { clues: 25, health: 6, hints: 6 },
  Expert: { clues: 20, health: 4, hints: 4 }
};

document.addEventListener('DOMContentLoaded', () => {
  startGame();
  displayLeaderboard();

  document.addEventListener('keydown', handleKeyDown);
});

function startGame() {
  const mode = difficulty.value;
  health = config[mode].health;
  hints = config[mode].hints;
  elapsedTime = 0;

  generatePuzzle(config[mode].clues);
  renderGrid();
  updateStatus();

  clearInterval(gameTimer);
  gameTimer = setInterval(() => {
    elapsedTime++;
    document.getElementById('time-count').innerText = formatTime(elapsedTime);
  }, 1000);
}

function generatePuzzle(clues) {
  const base = Array.from({ length: 9 }, (_, i) => (i + 1));
  const grid = Array(9).fill().map(() => Array(9).fill(0));

  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      grid[i][j] = base[(j + i * 3 + Math.floor(i / 3)) % 9];
    }
  }

  solution = JSON.parse(JSON.stringify(grid));
  puzzle = JSON.parse(JSON.stringify(grid));
  for (let i = 0; i < 81 - clues; i++) {
    let x = Math.floor(Math.random() * 9);
    let y = Math.floor(Math.random() * 9);
    while (puzzle[x][y] === 0) {
      x = Math.floor(Math.random() * 9);
      y = Math.floor(Math.random() * 9);
    }
    puzzle[x][y] = 0;
  }
}

function renderGrid() {
  sudokuGrid.innerHTML = '';

  const subGridColors = [
    '#FFB3BA', '#FFDFBA', '#FFFFBA',
    '#BAFFC9', '#BAE1FF', '#D3BAFF',
    '#FFBAFF', '#FF9F9F', '#FFDDC1'
  ];

  puzzle.forEach((row, i) => row.forEach((value, j) => {
    const cell = document.createElement('input');
    cell.type = 'text';
    cell.className = 'cell form-control';
    cell.min = 1;
    cell.max = 9;
    cell.value = value || '';
    cell.readOnly = value !== 0;

    const subGridRow = Math.floor(i / 3);
    const subGridCol = Math.floor(j / 3);
    const subGridIndex = subGridRow * 3 + subGridCol;
    const backgroundColor = subGridColors[subGridIndex];

    cell.style.backgroundColor = backgroundColor;

    cell.addEventListener('focus', () => {
      selectedCell = cell;
      const row = Math.floor(Array.from(sudokuGrid.children).indexOf(cell) / 9);
      const col = Array.from(sudokuGrid.children).indexOf(cell) % 9;
      highlightCell(row, col);
    });

    cell.addEventListener('blur', () => handleBlur(cell, i, j));

    cell.addEventListener('input', () => {
      cell.classList.remove('error');

      cell.value = cell.value.replace(/[^1-9]/g, '');

      if (cell.value.length > 1) {
        cell.value = cell.value[0];
      }
    });

    sudokuGrid.appendChild(cell);
  }));

  sudokuGrid.addEventListener('focus', (e) => {
    if (e.target.classList.contains('cell')) {
      selectedCell = e.target;
      const index = Array.from(sudokuGrid.children).indexOf(e.target);
      const row = Math.floor(index / 9);
      const col = index % 9;
      highlightCell(row, col);
    }
  }, true);
}

function handleBlur(cell, row, col) {
  const value = parseInt(cell.value);
  if (value !== solution[row][col] && value) {
    cell.classList.add('error');
    health--;
    updateStatus();
    if (health === 0) endGame(false);
  } else if (value === solution[row][col]) {
    puzzle[row][col] = value;
    checkWin();
  }
}

function updateStatus() {
  document.getElementById('health-count').innerText = health;
  document.getElementById('hint-count').innerText = hints;
}

function useHint() {
  if (hints > 0 && selectedCell) {
    const index = Array.from(sudokuGrid.children).indexOf(selectedCell);
    const row = Math.floor(index / 9);
    const col = index % 9;

    if (puzzle[row][col] === 0) {
      selectedCell.value = solution[row][col];
      puzzle[row][col] = solution[row][col];
      hints--;
      updateStatus();
      checkWin();
    }
  } else {
    showAlert('No hints left!', 'You\'ve used all available hints.', 'warning');
  }
}
function highlightCell(row, col) {
  clearHighlights();

  Array.from(sudokuGrid.children).forEach((cell, index) => {
    const r = Math.floor(index / 9);
    const c = index % 9;

    if (r === row || c === col) {
      cell.classList.add('highlight');
    }
  });

  const subGridRowStart = Math.floor(row / 3) * 3;
  const subGridColStart = Math.floor(col / 3) * 3;

  for (let r = subGridRowStart; r < subGridRowStart + 3; r++) {
    for (let c = subGridColStart; c < subGridColStart + 3; c++) {
      const cellIndex = r * 9 + c;
      sudokuGrid.children[cellIndex].classList.add('highlight');
    }
  }
}

function clearHighlights() {
  Array.from(sudokuGrid.children).forEach(cell => cell.classList.remove('highlight'));
}


function clearHighlights() {
  Array.from(sudokuGrid.children).forEach(cell => cell.classList.remove('highlight'));
}

function checkWin() {
  if (puzzle.every((row, i) => row.every((val, j) => val === solution[i][j]))) {
    endGame(true);
  }
}

function endGame(won) {
  clearInterval(gameTimer);
  if (won) {
    showWinAlert();
  } else {
    showAlert('Game Over', 'You\'ve used all your health!', 'error');
  }
}

function showWinAlert() {
  Swal.fire({
    icon: 'success',
    title: 'Congratulations!',
    text: "You've solved the puzzle!",
    input: 'text',
    inputLabel: 'Enter your name',
    inputPlaceholder: 'Your name',
    showCancelButton: true,
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      storeResult(true, result.value);
    }
  });
}

function storeResult(won, playerName = 'Anonymous') {
  const score = elapsedTime + hints + health;
  const result = {
    user: playerName,
    time: formatTime(elapsedTime),
    score: score,
    status: won ? 'Solved' : 'Failed'
  };

  leaderboard.push(result);
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 10);

  localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
  displayLeaderboard();
}

function displayLeaderboard() {
  const leaderboardList = document.getElementById('leaderboard-list');
  leaderboardList.innerHTML = '';

  leaderboard.sort((a, b) => b.score - a.score);

  leaderboard.forEach((entry) => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-start align-items-center';

    li.innerHTML = `
      <span class="mr-3">
        <i class="bi bi-person-fill text-danger"></i> ${entry.user}
      </span>
      <span class="mr-3">
        <i class="bi bi-stopwatch text-danger"></i> ${entry.time}
      </span>
      <span>
        <i class="bi bi-fire text-warning"></i> ${entry.score}
      </span>
    `;
    leaderboardList.appendChild(li);
  });
}


function formatTime(seconds) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

function showAlert(title, text, icon) {
  return Swal.fire({ title, text, icon });
}
function handleKeyDown(event) {
  if (selectedCell) {
    const index = Array.from(sudokuGrid.children).indexOf(selectedCell);
    const row = Math.floor(index / 9);
    const col = index % 9;

    switch (event.key) {
      case 'ArrowUp':
        if (row > 0) selectCell(row - 1, col);
        break;
      case 'ArrowDown':
        if (row < 8) selectCell(row + 1, col);
        break;
      case 'ArrowLeft':
        if (col > 0) selectCell(row, col - 1);
        break;
      case 'ArrowRight':
        if (col < 8) selectCell(row, col + 1);
        break;
      case 'Escape':
        selectedCell.blur();
        selectedCell = null;
        clearHighlights();
        break;
    }
  }
}

function selectCell(row, col) {
  const index = row * 9 + col;
  const cell = sudokuGrid.children[index];
  cell.focus();
  selectedCell = cell;
  highlightCell(row, col);
}