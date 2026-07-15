const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const menuOverlay = document.getElementById('menuOverlay');
const startButton = document.getElementById('startButton');

const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;
const FLOOR_Y = GAME_HEIGHT - 50;
const NET_WIDTH = 10;
const NET_HEIGHT = 190;
const NET_X = (GAME_WIDTH - NET_WIDTH) / 2;
const NET_Y = FLOOR_Y - NET_HEIGHT;
const PLAYER_SCALE = 1.2;
const BALL_SCALE = 1.5;

const ballImage = new Image();
ballImage.src = '/image/Ball.png';

const playerImage = new Image();
playerImage.src = '/image/Raichue.png';

const state = {
  mode: 'menu',
  score: { left: 0, right: 0 },
  keys: {},
  players: {
    left: createPlayer('left'),
    right: createPlayer('right')
  },
  ball: createBall(),
  lastMessage: '게임 시작 버튼을 눌러주세요.',
  collisionCooldown: 0
};

function createPlayer(side) {
  const width = 40 * PLAYER_SCALE;
  const height = 60 * PLAYER_SCALE;
  return {
    side,
    x: side === 'left' ? 120 : GAME_WIDTH - 120 - width,
    y: FLOOR_Y - height,
    width,
    height,
    vx: 0,
    vy: 0,
    onGround: true,
    legFrame: 0,
    legTimer: 0,
    dashCooldown: 0,
    dashTimer: 0,
    dashVx: 0,
    facing: side === 'left' ? 'right' : 'left'
  };
}

function createBall() {
  return {
    x: GAME_WIDTH / 2,
    y: 100,
    radius: 16 * BALL_SCALE,
    vx: 5.6,
    vy: 0,
    stuckNet: false
  };
}

function resetBall(servingSide) {
  state.ball = createBall();
  state.ball.x = GAME_WIDTH / 2;
  state.ball.y = 100;
  state.ball.vx = servingSide === 'left' ? -5.6 : 5.6;
  state.ball.vy = 0;
  state.ball.stuckNet = false;
}

function resetRound() {
  state.players.left = createPlayer('left');
  state.players.right = createPlayer('right');
  resetBall(Math.random() < 0.5 ? 'left' : 'right');
}

function startGame() {
  state.mode = 'playing';
  state.score = { left: 0, right: 0 };
  state.lastMessage = '게임 시작!';
  resetRound();
  menuOverlay.classList.add('hidden');
}

function showMenu(message) {
  state.mode = 'menu';
  state.score = { left: 0, right: 0 };
  state.lastMessage = message;
  menuOverlay.classList.remove('hidden');
  const title = menuOverlay.querySelector('h1');
  title.textContent = message;
  const button = menuOverlay.querySelector('button');
  button.textContent = '다시 시작';
}

function handleKeyDown(event) {
  state.keys[event.code] = true;
  if (event.code === 'Enter' && state.mode === 'menu') {
    startGame();
  }
}

function handleKeyUp(event) {
  state.keys[event.code] = false;
}

window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);
startButton.addEventListener('click', startGame);

function updatePlayer(player) {
  const leftPressed = player.side === 'right' ? state.keys['ArrowLeft'] : state.keys['KeyA'];
  const rightPressed = player.side === 'right' ? state.keys['ArrowRight'] : state.keys['KeyD'];
  const jumpKey = player.side === 'right' ? state.keys['ArrowUp'] : state.keys['KeyW'];
  const dashKey = player.side === 'right' ? state.keys['Enter'] : state.keys['KeyZ'];

  if (player.dashCooldown > 0) {
    player.dashCooldown -= 1;
  }

  const moveDirection = rightPressed && !leftPressed ? 1 : leftPressed && !rightPressed ? -1 : 0;

  if (moveDirection !== 0) {
    player.facing = moveDirection > 0 ? 'right' : 'left';
  } else if (player.side === 'left') {
    player.facing = 'right';
  } else {
    player.facing = 'left';
  }

  if (player.dashCooldown <= 0 && dashKey && moveDirection !== 0) {
    player.dashTimer = 6;
    player.dashVx = moveDirection * 11;
    player.dashCooldown = 36;
  }

  if (player.dashTimer > 0) {
    player.x += player.dashVx;
    player.dashTimer -= 1;
    if (player.dashTimer <= 0) {
      player.dashVx = 0;
    }
  } else {
    if (player.side === 'right') {
      if (rightPressed && player.x < GAME_WIDTH - player.width - 20) player.x += 5;
      if (leftPressed && player.x > NET_X + NET_WIDTH + 20) player.x -= 5;
    } else {
      if (rightPressed && player.x < NET_X - player.width - 20) player.x += 5;
      if (leftPressed && player.x > 20) player.x -= 5;
    }

    if (jumpKey && player.onGround) {
      player.vy = -12;
      player.onGround = false;
    }

    player.vy += 0.45;
    player.y += player.vy;

    if (player.y >= FLOOR_Y - player.height) {
      player.y = FLOOR_Y - player.height;
      player.vy = 0;
      player.onGround = true;
    }

    if (player.onGround && (rightPressed || leftPressed)) {
      player.legTimer += 1;
      if (player.legTimer > 8) {
        player.legFrame = player.legFrame === 0 ? 1 : 0;
        player.legTimer = 0;
      }
    } else {
      player.legFrame = 0;
      player.legTimer = 0;
    }
  }

  if (player.side === 'right') {
    player.x = Math.min(player.x, GAME_WIDTH - player.width - 20);
    player.x = Math.max(player.x, NET_X + NET_WIDTH + 20);
  } else {
    player.x = Math.min(player.x, NET_X - player.width - 20);
    player.x = Math.max(player.x, 20);
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getClosestPointOnRect(ball, rect) {
  const closestX = clamp(ball.x, rect.x, rect.x + rect.width);
  const closestY = clamp(ball.y, rect.y, rect.y + rect.height);
  return { x: closestX, y: closestY };
}

function getClosestPointOnCircle(ball, center, radius) {
  const dx = ball.x - center.x;
  const dy = ball.y - center.y;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = dx / length;
  const ny = dy / length;
  return {
    x: center.x + nx * Math.min(radius, length),
    y: center.y + ny * Math.min(radius, length)
  };
}

function getPlayerContactPoint(player, ball) {
  const headCenter = { x: player.x + player.width / 2, y: player.y + player.height * 0.28 };
  const headRadius = Math.max(18, player.width * 0.55);
  const bodyRect = {
    x: player.x + player.width * 0.15,
    y: player.y + player.height * 0.28,
    width: player.width * 0.7,
    height: player.height * 0.6
  };

  const headPoint = getClosestPointOnCircle(ball, headCenter, headRadius);
  const bodyPoint = getClosestPointOnRect(ball, bodyRect);

  const headDist = Math.hypot(ball.x - headPoint.x, ball.y - headPoint.y);
  const bodyDist = Math.hypot(ball.x - bodyPoint.x, ball.y - bodyPoint.y);

  return headDist <= bodyDist ? { point: headPoint, distance: headDist, kind: 'head' } : { point: bodyPoint, distance: bodyDist, kind: 'body' };
}

function checkBallCollision(player) {
  const ball = state.ball;
  const contact = getPlayerContactPoint(player, ball);
  return contact.distance <= ball.radius + 4;
}

function resolvePlayerCollision(player) {
  if (state.collisionCooldown > 0) return;

  const ball = state.ball;
  const contact = getPlayerContactPoint(player, ball);
  if (!contact || contact.distance > ball.radius + 4) return;

  const dx = ball.x - contact.point.x;
  const dy = ball.y - contact.point.y;
  const distance = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = dx / distance;
  const ny = dy / distance;
  const overlap = ball.radius + 4 - contact.distance;

  ball.x += nx * overlap;
  ball.y += ny * overlap;

  const ballAbsY = Math.abs(ball.vy);
  const playerCenterX = player.x + player.width / 2;
  const ballRelativeX = ball.x - playerCenterX;

  if (ball.x < playerCenterX) {
    ball.vx = -Math.max(Math.abs(ball.vx), 4.2) - Math.abs(ballRelativeX) * 0.008;
  } else {
    ball.vx = Math.max(Math.abs(ball.vx), 4.2) + Math.abs(ballRelativeX) * 0.008;
  }

  const upwardSpeed = Math.max(5.2, Math.min(ballAbsY * 1.4, 7.0));
  ball.vy = -upwardSpeed;

  if (contact.kind === 'head') {
    ball.vy -= 0.45;
  } else {
    ball.vy += 0.15;
  }

  if (Math.abs(ball.vy) < 4.8) {
    ball.vy = -5.2;
  }

  state.collisionCooldown = 6;
}

function updateBall() {
  const ball = state.ball;
  ball.vy += 0.11;
  ball.vx += ball.vx * 0.0008;
  ball.vy += ball.vy * 0.0008;
  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius;
    ball.vx *= -1;
  } else if (ball.x + ball.radius > GAME_WIDTH) {
    ball.x = GAME_WIDTH - ball.radius;
    ball.vx *= -1;
  }

  if (ball.y - ball.radius < 0) {
    ball.y = ball.radius;
    ball.vy *= -0.7;
  }

  if (ball.y + ball.radius > FLOOR_Y) {
    if (ball.x < GAME_WIDTH / 2) {
      state.score.right += 1;
    } else {
      state.score.left += 1;
    }

    if (state.score.left >= 5 || state.score.right >= 5) {
      const winner = state.score.left >= 5 ? 'Player 1' : 'Player 2';
      showMenu(`${winner} 승리!`);
      return;
    }

    resetBall(ball.x < GAME_WIDTH / 2 ? 'right' : 'left');
    return;
  }

  const netLeft = NET_X;
  const netRight = NET_X + NET_WIDTH;
  const netTop = NET_Y;
  const netBottom = NET_Y + NET_HEIGHT;

  const hitNet = ball.x + ball.radius > netLeft && ball.x - ball.radius < netRight && ball.y + ball.radius > netTop && ball.y - ball.radius < netBottom;

  if (hitNet) {
    const overlapLeft = (ball.x + ball.radius) - netLeft;
    const overlapRight = netRight - (ball.x - ball.radius);
    const overlapTop = (ball.y + ball.radius) - netTop;
    const overlapBottom = netBottom - (ball.y - ball.radius);

    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

    if (minOverlap === overlapLeft || minOverlap === overlapRight) {
      ball.x = minOverlap === overlapLeft ? netLeft - ball.radius : netRight + ball.radius;
      ball.vx *= -1;
    } else {
      ball.y = minOverlap === overlapTop ? netTop - ball.radius : netBottom + ball.radius;
      ball.vy *= -1;
    }
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  ctx.fillStyle = '#93c5fd';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT / 2);
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(0, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT / 2);
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(0, FLOOR_Y, GAME_WIDTH, GAME_HEIGHT - FLOOR_Y);
}

function drawNet() {
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(NET_X, NET_Y, NET_WIDTH, NET_HEIGHT);
  ctx.strokeStyle = '#fb923c';
  ctx.lineWidth = 3;
  ctx.strokeRect(NET_X, NET_Y, NET_WIDTH, NET_HEIGHT);
}

function drawPlayer(player) {
  ctx.save();
  const isMovingLeft = player.vx < -0.1;
  const isMovingRight = player.vx > 0.1;
  const shouldFlip = player.side === 'left' ? !isMovingRight : isMovingLeft;
  const drawX = shouldFlip ? player.x + player.width : player.x;
  const scaleX = shouldFlip ? -1 : 1;

  ctx.translate(drawX, player.y);
  ctx.scale(scaleX, 1);

  if (playerImage.complete && playerImage.naturalWidth) {
    const imageWidth = player.width;
    const imageHeight = player.height;
    ctx.drawImage(playerImage, 0, 0, imageWidth, imageHeight);
  } else {
    ctx.fillStyle = player.side === 'left' ? '#f59e0b' : '#3b82f6';
    ctx.fillRect(0, 0, player.width, player.height);
    ctx.fillStyle = '#111827';
    const legOffset = player.legFrame === 0 ? 4 : -4;
    ctx.fillRect(8, player.height - 10, 8, 18);
    ctx.fillRect(player.width - 16, player.height - 10, 8, 18 + legOffset);
    ctx.fillRect(8 + legOffset, player.height - 10, 8, 18 - legOffset);
    ctx.fillRect(player.width - 16 - legOffset, player.height - 10, 8, 18 + legOffset);
  }
  ctx.restore();
}

function drawBall() {
  const ball = state.ball;
  if (ballImage.complete && ballImage.naturalWidth) {
    ctx.drawImage(ballImage, ball.x - ball.radius, ball.y - ball.radius, ball.radius * 2, ball.radius * 2);
  } else {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#fef3c7';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#92400e';
    ctx.stroke();
  }
}

function drawScore() {
  ctx.fillStyle = 'rgba(17,24,39,0.9)';
  ctx.fillRect(GAME_WIDTH / 2 - 120, 18, 240, 54);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${state.score.left} : ${state.score.right}`, GAME_WIDTH / 2, 54);
}

function drawMessage() {
  ctx.fillStyle = '#111827';
  ctx.font = '20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(state.lastMessage, GAME_WIDTH / 2, 90);
}

function frame() {
  if (state.mode === 'playing') {
    if (state.collisionCooldown > 0) {
      state.collisionCooldown -= 1;
    }

    updatePlayer(state.players.left);
    updatePlayer(state.players.right);
    resolvePlayerCollision(state.players.left);
    resolvePlayerCollision(state.players.right);
    updateBall();
  }

  drawBackground();
  drawNet();
  drawPlayer(state.players.left);
  drawPlayer(state.players.right);
  drawBall();
  drawScore();
  drawMessage();

  requestAnimationFrame(frame);
}

frame();
