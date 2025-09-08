window.userInteracted = false;
window.addEventListener('click', () => window.userInteracted = true, { once: true });
window.addEventListener('touchstart', () => window.userInteracted = true, { once: true });

const grid = document.querySelector('.grid');
const scoreDisplay = document.getElementById('score');
const width = 8;
const candyColors = [
  'candy-red',
  'candy-yellow',
  'candy-blue',
  'candy-green',
  'candy-purple',
  'candy-orange'
];
let squares = [];
let score = 0;
let timeLeft = 60;
let timerInterval;
let colorBeingDragged, colorBeingReplaced, squareIdBeingDragged, squareIdBeingReplaced;
let touchStartX = 0, touchStartY = 0, touchEndX = 0, touchEndY = 0;
let gameStarted = false;

// --- Initial Board (blurred, disabled) ---
function randomCandy() {
  return candyColors[Math.floor(Math.random() * candyColors.length)];
}

function createBoard() {
  for (let i = 0; i < width * width; i++) {
    const square = document.createElement('div');
    square.className = randomCandy();
    square.setAttribute('draggable', true);
    square.id = i;
    grid.appendChild(square);
    squares.push(square);
  }
}

function showInitialBoard() {
  grid.innerHTML = '';
  squares = [];
  createBoard();
  grid.classList.add('blur');
}

// --- Modal & Start Game ---
document.addEventListener('DOMContentLoaded', () => {
  showInitialBoard();

  const startModal = document.getElementById('startModal');
  const startBtn = document.getElementById('startBtn');
  startModal.classList.add('show');
  grid.classList.add('blur');

  startBtn.addEventListener('click', () => {
    startModal.classList.remove('show');
    grid.classList.remove('blur');
    startGame();
  });
});

// --- Match-Only Checker (no animation, no score) ---
function detectMatchAt(i) {
  const curr = squares[i].className;
  if (!candyColors.includes(curr)) return false;
  const row = i % width;
  if (
    row < width - 2 &&
    squares[i + 1].className === curr &&
    squares[i + 2].className === curr
  ) {
    return true;
  }
  if (
    i < width * (width - 2) &&
    squares[i + width].className === curr &&
    squares[i + 2 * width].className === curr
  ) {
    return true;
  }
  return false;
}

function hasInitialMatches() {
  for (let i = 0; i < width * width; i++) {
    if (detectMatchAt(i)) return true;
  }
  return false;
}

// --- Valid Move Checker (no animation, no score) ---
function hasPossibleMoves() {
  for (let i = 0; i < width * width; i++) {
    const curr = squares[i].className;
    const neighbors = [i + 1, i - 1, i + width, i - width];
    for (let j of neighbors) {
      if (j < 0 || j >= width * width) continue;
      if (Math.floor(i / width) !== Math.floor(j / width) && Math.abs(i - j) === 1) continue;

      // Swap
      const temp1 = squares[i].className;
      const temp2 = squares[j].className;
      squares[i].className = temp2;
      squares[j].className = temp1;

      // Now, just CHECK for match, don't animate or score
      const hasMatch = detectMatchAt(i) || detectMatchAt(j);

      // Swap back
      squares[i].className = temp1;
      squares[j].className = temp2;

      if (hasMatch) return true;
    }
  }
  return false;
}

// --- Main Gameplay Logic ---

function updateScore(val = 0) {
  score += val;
  scoreDisplay.textContent = `${score}`;
}

function dragStart() {
  colorBeingDragged = this.className;
  squareIdBeingDragged = parseInt(this.id);
}

function dragDrop() {
  colorBeingReplaced = this.className;
  squareIdBeingReplaced = parseInt(this.id);
  squares[squareIdBeingDragged].className = colorBeingReplaced;
  squares[squareIdBeingReplaced].className = colorBeingDragged;
}

function dragEnd() {
  const validMoves = [
    squareIdBeingDragged - 1,
    squareIdBeingDragged + 1,
    squareIdBeingDragged - width,
    squareIdBeingDragged + width
  ];
  const validMove = validMoves.includes(squareIdBeingReplaced);

  if (validMove) {
    resolveBoard();
  } else {
    squares[squareIdBeingDragged].className = colorBeingDragged;
    squares[squareIdBeingReplaced].className = colorBeingReplaced;
  }
}

function handleTouchStart(e) {
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  squareIdBeingDragged = parseInt(e.target.id);
  colorBeingDragged = e.target.className;
}

function handleTouchEnd(e) {
  const touch = e.changedTouches[0];
  touchEndX = touch.clientX;
  touchEndY = touch.clientY;
  const dx = touchEndX - touchStartX;
  const dy = touchEndY - touchStartY;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (Math.max(absDx, absDy) > 10) {
    let swapId;
    if (absDx > absDy) {
      swapId = dx > 0 ? squareIdBeingDragged + 1 : squareIdBeingDragged - 1;
    } else {
      swapId = dy > 0 ? squareIdBeingDragged + width : squareIdBeingDragged - width;
    }
    if (swapId >= 0 && swapId < width * width) {
      squareIdBeingReplaced = swapId;
      colorBeingReplaced = squares[swapId].className;
      squares[squareIdBeingDragged].className = colorBeingReplaced;
      squares[squareIdBeingReplaced].className = colorBeingDragged;
      dragEnd();
    }
  }
}

function animateBlast(index) {
  squares[index].classList.add('blast');
  setTimeout(() => {
    squares[index].classList.remove('blast');
    squares[index].className = '';
  }, 300);
}

function animateRefill(index, candy) {
  squares[index].className = '';
  squares[index].classList.add('refill', candy);
  setTimeout(() => squares[index].classList.remove('refill'), 300);
}

function matchThree() {
  let matchedIndices = new Set();

  for (let i = 0; i < width * width; i++) {
    const curr = squares[i].className;
    if (!candyColors.includes(curr)) continue;

    const row = i % width;
    if (row < width - 2 &&
        squares[i + 1].className === curr &&
        squares[i + 2].className === curr) {
      matchedIndices.add(i);
      matchedIndices.add(i + 1);
      matchedIndices.add(i + 2);
    }
    if (i < width * (width - 2) &&
        squares[i + width].className === curr &&
        squares[i + 2 * width].className === curr) {
      matchedIndices.add(i);
      matchedIndices.add(i + width);
      matchedIndices.add(i + 2 * width);
    }
  }

  if (matchedIndices.size > 0) {
    matchedIndices.forEach(i => animateBlast(i));
    updateScore(30 * (matchedIndices.size / 3));
    playSound('match');
    return true;
  }
  return false;
}

function playSound(type) {
  const el = document.getElementById(`${type}-sound`);
  if (!el || !window.userInteracted) return;
  el.play().catch(() => {});
}

function moveDown() {
  let didMove = false;
  for (let col = 0; col < width; col++) {
    let column = [];
    for (let row = 0; row < width; row++) {
      const idx = row * width + col;
      column.push(squares[idx].className);
    }
    let filtered = column.filter(c => candyColors.includes(c));
    let missing = width - filtered.length;
    let newCandies = Array.from({ length: missing }, randomCandy);
    let combined = newCandies.concat(filtered);
    for (let row = 0; row < width; row++) {
      const idx = row * width + col;
      if (squares[idx].className !== combined[row]) {
        squares[idx].className = combined[row];
        animateRefill(idx, combined[row]);
        didMove = true;
      }
    }
  }
  return didMove;
}

function hasBlanks() {
  return squares.some(sq => sq.className === '');
}

function resolveBoard(cb) {
  let cnt = 0;
  function loop() {
    const matched = matchThree();
    setTimeout(() => {
      const moved = moveDown();
      setTimeout(() => {
        if ((matched || moved || hasBlanks()) && cnt < 100) {
          cnt++;
          loop();
        } else {
          if (cb) cb();
        }
      }, 300);
    }, 300);
  }
  loop();
}

function endGame() {
  clearInterval(timerInterval);
  const overlay = document.getElementById('gameOverModal');
  const result = document.getElementById('resultText');

  let message = '';
  if (score >= 500) {
    message = `🎉 <strong>Excellent!</strong>`;
  } else if (score >= 300) {
    message = `👍 <strong>Good!</strong>`;
  } else if (score >= 100) {
    message = `🙂 <strong>Okay!</strong>`;
  } else {
    message = `😕 <strong>Poor!</strong>`;
  }

  result.innerHTML = `
    <div>Your score: <strong>${score}</strong></div>
    <div>${message}</div>
  `;
  overlay.classList.add('show');
}

function restartLevel() {
  window.location.reload();
}

function setupDrag() {
  squares.forEach(sq => {
    sq.addEventListener('dragstart', dragStart);
    sq.addEventListener('dragover', e => e.preventDefault());
    sq.addEventListener('dragenter', e => e.preventDefault());
    sq.addEventListener('drop', dragDrop);
    sq.addEventListener('dragend', dragEnd);
    sq.addEventListener('touchstart', handleTouchStart);
    sq.addEventListener('touchend', handleTouchEnd);
  });
}

function buildValidBoard(maxTries = 100) {
  for (let attempt = 0; attempt < maxTries; attempt++) {
    grid.innerHTML = '';
    squares = [];
    createBoard();
    if (!hasInitialMatches() && hasPossibleMoves()) {
      setupDrag();
      startTimer();
      return;
    }
  }
  endGame();
}

function startTimer() {
  const timerValue = document.getElementById('time-value');
  timeLeft = 60;
  timerValue.textContent = timeLeft;
  timerInterval = setInterval(() => {
    timeLeft--;
    timerValue.textContent = timeLeft;
    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

// ---- Only enable gameplay after modal is dismissed ----
function startGame() {
  if (gameStarted) return;
  gameStarted = true;
  buildValidBoard();
}
