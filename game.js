(function() {
    const canvas = document.getElementById('pixelCanvas');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;          // keep pixels sharp

    // pixel size (each game unit = 20x20 px) — 40x30 grid
    const PIXEL_SIZE = 20;
    const GRID_W = 40;
    const GRID_H = 30;

    // game state
    let player = { x: 20, y: 15 };              // start near center (0-index)
    let enemies = [];
    let powerups = [];
    let score = 0;
    let health = 3;
    let gameOver = false;
    let gameWin = false;                         
    let invincible = false;                      
    let invincibleTimer = 0;

    // movement direction (key states)
    const keys = {
      ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false
    };

    // spawn control
    let frameCounter = 0;
    const ENEMY_SPAWN_RATE = 45;                  // frames between spawns
    const POWERUP_SPAWN_RATE = 180;                // ~3 seconds at 60fps

    // ----- pink spectrum palette (all shades of pink/magenta) -----
    const palette = {
      bg: '#1a0f1a',
      player: '#ffe0f0',
      playerInvincible: '#ffb0e0',
      enemy: ['#ffb6c1', '#ff9bbf', '#ff6b9d', '#ff3a75', '#ff1a5c', '#d10044'],
      powerup: '#ffb0ff',                           // soft pink power
      powerupGlow: '#ffffff',
      text: '#ffb3d9',
      border: '#ff70a0',
      gameOver: '#ff99cc'
    };

    // ----- helper: draw pixel at grid coord -----
    function drawPixel(gx, gy, color) {
      ctx.fillStyle = color;
      ctx.fillRect(gx * PIXEL_SIZE, gy * PIXEL_SIZE, PIXEL_SIZE-1, PIXEL_SIZE-1); // -1 leaves gap = pixelated look
      // optional inner highlight
      ctx.fillStyle = '#ffffff30';
      ctx.fillRect(gx * PIXEL_SIZE, gy * PIXEL_SIZE, PIXEL_SIZE-2, 2);
    }

    // ----- draw background grid (pinkish dark) -----
    function drawBackground() {
      ctx.fillStyle = palette.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // subtle grid lines
      ctx.strokeStyle = '#ff99cc20';
      ctx.lineWidth = 1;
      for (let i = 0; i <= GRID_W; i++) {
        ctx.beginPath();
        ctx.strokeStyle = '#ff99cc15';
        ctx.moveTo(i * PIXEL_SIZE, 0);
        ctx.lineTo(i * PIXEL_SIZE, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i <= GRID_H; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * PIXEL_SIZE);
        ctx.lineTo(canvas.width, i * PIXEL_SIZE);
        ctx.stroke();
      }
    }

    // ----- spawn enemy (at edge, avoids player vicinity) -----
    function spawnEnemy() {
      if (gameOver || gameWin) return;
      let side = Math.floor(Math.random() * 4);
      let x, y;
      const safeDist = 6;  // not too close to player spawn
      let attempts = 0;
      do {
        if (side === 0) { // top
          x = Math.floor(Math.random() * GRID_W);
          y = 0;
        } else if (side === 1) { // right
          x = GRID_W - 1;
          y = Math.floor(Math.random() * GRID_H);
        } else if (side === 2) { // bottom
          x = Math.floor(Math.random() * GRID_W);
          y = GRID_H - 1;
        } else { // left
          x = 0;
          y = Math.floor(Math.random() * GRID_H);
        }
        attempts++;
        if (attempts > 100) break;  // fallback
      } while (Math.abs(x - player.x) < safeDist && Math.abs(y - player.y) < safeDist);

      enemies.push({
        x, y,
        color: palette.enemy[Math.floor(Math.random() * palette.enemy.length)],
        moveCounter: 0
      });
    }

    // ----- spawn powerup (random location) -----
    function spawnPowerup() {
      if (gameOver || gameWin) return;
      let x = Math.floor(Math.random() * GRID_W);
      let y = Math.floor(Math.random() * GRID_H);
      // avoid stacking exactly on player
      if (Math.abs(x - player.x) < 2 && Math.abs(y - player.y) < 2) {
        x = (x + 10) % GRID_W;
        y = (y + 5) % GRID_H;
      }
      powerups.push({ x, y, collected: false });
    }

    // ----- reset game -----
    function resetGame() {
      player = { x: 20, y: 15 };
      enemies = [];
      powerups = [];
      score = 0;
      health = 3;
      gameOver = false;
      gameWin = false;
      invincible = false;
      invincibleTimer = 0;
      frameCounter = 0;
      updateDisplay();
    }

    // ----- update UI (score/health) -----
    function updateDisplay() {
      let scoreElem = document.getElementById('scoreDisplay');
      let healthElem = document.getElementById('healthDisplay');
      scoreElem.innerText = String(score).padStart(4, '0');
      healthElem.innerText = String(health).padStart(2, '0');
    }

    // ----- handle collision & movement logic (per frame) -----
    function gameTick() {
      if (gameOver || gameWin) return;

      // ----- move player based on keys (pixel perfect grid) -----
      let dx = 0, dy = 0;
      if (keys.ArrowUp) dy = -1;
      if (keys.ArrowDown) dy = 1;
      if (keys.ArrowLeft) dx = -1;
      if (keys.ArrowRight) dx = 1;

      if (dx !== 0 || dy !== 0) {
        let newX = player.x + dx;
        let newY = player.y + dy;
        // boundaries
        if (newX >= 0 && newX < GRID_W && newY >= 0 && newY < GRID_H) {
          player.x = newX;
          player.y = newY;
        }
      }

      // ----- move enemies (one step closer to player) -----
      for (let e of enemies) {
        let dx = 0, dy = 0;
        if (e.x < player.x) dx = 1;
        if (e.x > player.x) dx = -1;
        if (e.y < player.y) dy = 1;
        if (e.y > player.y) dy = -1;
        // sometimes move diagonal, sometimes only one axis (more variety)
        if (Math.random() < 0.6) { // 60% move both axes
          e.x = Math.min(GRID_W-1, Math.max(0, e.x + dx));
          e.y = Math.min(GRID_H-1, Math.max(0, e.y + dy));
        } else {
          if (Math.random() < 0.5) e.x = Math.min(GRID_W-1, Math.max(0, e.x + dx));
          else e.y = Math.min(GRID_H-1, Math.max(0, e.y + dy));
        }
      }

      // ----- enemy-player collision (with invincibility) -----
      if (!invincible) {
        for (let i = enemies.length - 1; i >= 0; i--) {
          if (enemies[i].x === player.x && enemies[i].y === player.y) {
            // enemy hit player
            health--;
            if (health <= 0) {
              health = 0;
              gameOver = true;
            }
            // remove that enemy (small reward)
            enemies.splice(i, 1);
            invincible = true;
            invincibleTimer = 15; // about 0.25 sec if 60fps
            updateDisplay();
            break; // only one hit per frame
          }
        }
      } else {
        invincibleTimer--;
        if (invincibleTimer <= 0) invincible = false;
      }

      // ----- powerup collection -----
      for (let i = powerups.length - 1; i >= 0; i--) {
        if (powerups[i].x === player.x && powerups[i].y === player.y) {
          score += 10;
          powerups.splice(i, 1);
          updateDisplay();
          // win condition: score 300 (just for fun)
          if (score >= 300) {
            gameWin = true;
          }
        }
      }

      // ----- spawn enemies and powerups based on counter -----
      frameCounter++;
      if (frameCounter % ENEMY_SPAWN_RATE === 0 && enemies.length < 20) {
        spawnEnemy();
      }
      if (frameCounter % POWERUP_SPAWN_RATE === 0 && powerups.length < 8) {
        spawnPowerup();
      }

      // ----- limit max enemies -----
      if (enemies.length > 25) enemies.length = 25;
    }

    // ----- DRAW EVERYTHING (pixelated style) -----
    function draw() {
      drawBackground();

      // draw powerups (pink heart pixels)
      for (let p of powerups) {
        drawPixel(p.x, p.y, palette.powerup);
        // tiny white highlight
        ctx.fillStyle = '#ffffffb0';
        ctx.fillRect(p.x * PIXEL_SIZE + 4, p.y * PIXEL_SIZE + 4, 4, 4);
      }

      // draw enemies (shades of pink)
      for (let e of enemies) {
        drawPixel(e.x, e.y, e.color);
        // dark pixel "eye"
        ctx.fillStyle = '#2d0020';
        ctx.fillRect(e.x * PIXEL_SIZE + 6, e.y * PIXEL_SIZE + 6, 5, 5);
      }

      // draw player (with invincibility blink)
      if (!invincible || (invincible && Math.floor(Date.now() / 150) % 2 === 0)) {
        drawPixel(player.x, player.y, invincible ? palette.playerInvincible : palette.player);
        // player eyes
        ctx.fillStyle = '#200018';
        ctx.fillRect(player.x * PIXEL_SIZE + 5, player.y * PIXEL_SIZE + 5, 4, 4);
        ctx.fillStyle = '#ffd0dd';
        ctx.fillRect(player.x * PIXEL_SIZE + 8, player.y * PIXEL_SIZE + 8, 3, 3);
      }

      // game over / win messages
      if (gameOver) {
        ctx.fillStyle = '#ff99ccf0';
        ctx.font = 'bold 48px "Courier New", monospace';
        ctx.fillText('GAME OVER', 200, 280);
        ctx.font = '24px monospace';
        ctx.fillStyle = '#ffe0f0';
        ctx.fillText('press RESTART', 280, 380);
      } else if (gameWin) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px "Courier New", monospace';
        ctx.fillText('✨ WIN ✨', 240, 280);
        ctx.font = '24px monospace';
        ctx.fillStyle = '#ffb0d0';
        ctx.fillText('pink infinity', 300, 380);
      }

      // draw score on canvas too
      ctx.font = '20px "Courier New", monospace';
      ctx.fillStyle = '#ffb3c6';
      ctx.fillText('PINK:'+score, 640, 50);
    }

    // ----- animation loop -----
    function loop() {
      gameTick();
      draw();
      requestAnimationFrame(loop);
    }

    // ----- keyboard handling -----
    window.addEventListener('keydown', (e) => {
      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        if (keys.hasOwnProperty(e.key)) {
          keys[e.key] = true;
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        if (keys.hasOwnProperty(e.key)) {
          keys[e.key] = false;
        }
      }
    });

    // prevent page scrolling with arrows
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
      }
    }, {passive: false});

    // reset button
    document.getElementById('resetBtn').addEventListener('click', () => {
      resetGame();
    });

    // initial spawn
    function initialSpawn() {
      for (let i = 0; i < 3; i++) spawnEnemy();
      for (let i = 0; i < 2; i++) spawnPowerup();
    }

    // start everything
    resetGame();     // sets fresh state
    initialSpawn();
    loop();

    // make sure canvas loses focus / no artifacts
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  })();