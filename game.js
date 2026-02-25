(function() {
    const canvas = document.getElementById('pixelCanvas');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // pixel size (each game unit = 20x20 px) — 40x30 grid
    const PIXEL_SIZE = 20;
    const GRID_W = 40;
    const GRID_H = 30;

    // game state
    let player = { x: 20, y: 15 };
    let enemies = [];
    let powerups = [];
    let score = 0;
    let health = 3;
    let gameOver = false;
    let gameWin = false;
    let invincible = false;
    let invincibleTimer = 0;

    // FIX: enemy speed control - add move timer
    let enemyMoveCounter = 0;
    const ENEMY_MOVE_DELAY = 10; // enemies move every 8 frames instead of every frame

    // movement direction (key states)
    const keys = {
      ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false
    };

    // spawn control
    let frameCounter = 0;
    const ENEMY_SPAWN_RATE = 45;
    const POWERUP_SPAWN_RATE = 180;

    // ----- palette -----
    const palette = {
      bg: '#1a0f1a',
      player: '#ffe0f0',
      playerInvincible: '#ffb0e0',
      enemy: '#ff1a5c', // single red color for enemy
      powerup: '#b0ffb0', // green for health
      text: '#ffb3d9',
    };

    function drawPixel(gx, gy, color) {
      ctx.fillStyle = color;
      ctx.fillRect(gx * PIXEL_SIZE, gy * PIXEL_SIZE, PIXEL_SIZE-1, PIXEL_SIZE-1);
      ctx.fillStyle = '#ffffff30';
      ctx.fillRect(gx * PIXEL_SIZE, gy * PIXEL_SIZE, PIXEL_SIZE-2, 2);
    }

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

    function spawnEnemy() {
      if (gameOver || gameWin) return;
      let side = Math.floor(Math.random() * 4);
      let x, y;
      
      if (side === 0) { x = Math.floor(Math.random() * GRID_W); y = 0; }
      else if (side === 1) { x = GRID_W - 1; y = Math.floor(Math.random() * GRID_H); }
      else if (side === 2) { x = Math.floor(Math.random() * GRID_W); y = GRID_H - 1; }
      else { x = 0; y = Math.floor(Math.random() * GRID_H); }

      enemies.push({ x, y });
    }

    function spawnPowerup() {
      if (gameOver || gameWin) return;
      let x = Math.floor(Math.random() * GRID_W);
      let y = Math.floor(Math.random() * GRID_H);
      powerups.push({ x, y });
    }

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
      enemyMoveCounter = 0;
      updateDisplay();
      
      // initial spawn
      for (let i = 0; i < 3; i++) spawnEnemy();
      for (let i = 0; i < 2; i++) spawnPowerup();
    }

    function updateDisplay() {
      document.getElementById('scoreDisplay').innerText = String(score).padStart(4, '0');
      document.getElementById('healthDisplay').innerText = String(health).padStart(2, '0');
    }

    function gameTick() {
      if (gameOver || gameWin) return;

      // ----- player movement -----
      let dx = 0, dy = 0;
      if (keys.ArrowUp) dy = -1;
      if (keys.ArrowDown) dy = 1;
      if (keys.ArrowLeft) dx = -1;
      if (keys.ArrowRight) dx = 1;

      if (dx !== 0 || dy !== 0) {
        let newX = player.x + dx;
        let newY = player.y + dy;
        if (newX >= 0 && newX < GRID_W && newY >= 0 && newY < GRID_H) {
          player.x = newX;
          player.y = newY;
        }
      }

      // ----- enemies move slower -----
      enemyMoveCounter++;
      if (enemyMoveCounter >= ENEMY_MOVE_DELAY) {
        enemyMoveCounter = 0;
        
        for (let e of enemies) {
          let dx = 0, dy = 0;
          if (e.x < player.x) dx = 1;
          if (e.x > player.x) dx = -1;
          if (e.y < player.y) dy = 1;
          if (e.y > player.y) dy = -1;
          
          // 60% move both axes, 40% move one axis
          if (Math.random() < 0.6) {
            e.x = Math.min(GRID_W-1, Math.max(0, e.x + dx));
            e.y = Math.min(GRID_H-1, Math.max(0, e.y + dy));
          } else {
            if (Math.random() < 0.5) e.x = Math.min(GRID_W-1, Math.max(0, e.x + dx));
            else e.y = Math.min(GRID_H-1, Math.max(0, e.y + dy));
          }
        }
      }

      // ----- enemy-player collision -----
      if (!invincible) {
        for (let i = enemies.length - 1; i >= 0; i--) {
          if (enemies[i].x === player.x && enemies[i].y === player.y) {
            health--;
            enemies.splice(i, 1);
            
            if (health <= 0) {
              health = 0;
              gameOver = true;
            }
            
            invincible = true;
            invincibleTimer = 15;
            updateDisplay();
            break;
          }
        }
      } else {
        invincibleTimer--;
        if (invincibleTimer <= 0) invincible = false;
      }

      // ----- powerup collection (green hearts = health) -----
      for (let i = powerups.length - 1; i >= 0; i--) {
        if (powerups[i].x === player.x && powerups[i].y === player.y) {
          score += 10;
          health = Math.min(health + 1, 5); // max 5 health
          powerups.splice(i, 1);
          updateDisplay();
          
          if (score >= 300) {
            gameWin = true;
          }
        }
      }

      // ----- spawning -----
      frameCounter++;
      if (frameCounter % ENEMY_SPAWN_RATE === 0 && enemies.length < 15) {
        spawnEnemy();
      }
      if (frameCounter % POWERUP_SPAWN_RATE === 0 && powerups.length < 6) {
        spawnPowerup();
      }
    }

    function draw() {
      drawBackground();

      // draw powerups (green)
      for (let p of powerups) {
        drawPixel(p.x, p.y, palette.powerup);
        // white highlight
        ctx.fillStyle = '#ffffffb0';
        ctx.fillRect(p.x * PIXEL_SIZE + 4, p.y * PIXEL_SIZE + 4, 4, 4);
      }

      // draw enemies (red)
      for (let e of enemies) {
        drawPixel(e.x, e.y, palette.enemy);
        // dark eye
        ctx.fillStyle = '#2d0020';
        ctx.fillRect(e.x * PIXEL_SIZE + 6, e.y * PIXEL_SIZE + 6, 5, 5);
      }

      // draw player (white/pink)
      if (!invincible || (invincible && Math.floor(Date.now() / 150) % 2 === 0)) {
        drawPixel(player.x, player.y, invincible ? palette.playerInvincible : palette.player);
        // player eyes
        ctx.fillStyle = '#200018';
        ctx.fillRect(player.x * PIXEL_SIZE + 5, player.y * PIXEL_SIZE + 5, 4, 4);
        ctx.fillStyle = '#ffd0dd';
        ctx.fillRect(player.x * PIXEL_SIZE + 8, player.y * PIXEL_SIZE + 8, 3, 3);
      }

      // game messages
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
        ctx.fillText('you win!', 300, 380);
      }

      // score display 
      ctx.font = '20px "Courier New", monospace';
      ctx.fillStyle = '#ffb3c6';
      ctx.fillText('SCORE: ' + score, 620, 50);
    }

    function loop() {
      gameTick();
      draw();
      requestAnimationFrame(loop);
    }

    // keyboard handling
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

    // prevent page scrolling
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
      }
    }, {passive: false});

    // reset button
    document.getElementById('resetBtn').addEventListener('click', resetGame);

    // start
    resetGame();
    loop();

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
})();