(function() {
    const canvas = document.getElementById('pixelCanvas');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

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

    // power-ups and effects
    let speedBoost = false;
    let speedTimer = 0;
    let enemyFreeze = false;
    let freezeTimer = 0;
    let scoreMultiplier = 1;
    let multiplierTimer = 0;

    // enemy types
    let enemyMoveCounter = 0;
    const ENEMY_MOVE_DELAY = 8;

    const keys = {
      ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false
    };

    let frameCounter = 0;
    const ENEMY_SPAWN_RATE = 45;
    const POWERUP_SPAWN_RATE = 120;

    // particle effects
    let particles = [];

    const palette = {
      bg: '#0f0b1a',           
      gridLines: '#ff66aa30',  
      player: '#7ff5ff',        
      playerInvincible: '#ffb3ff', 
      playerSpeed: '#ffffb0',    
      enemy: '#ff3a6f',         
      enemyFast: '#ffaa33',      
      enemyFrozen: '#9bb0d0',   
      
      // UI elements
      text: '#ffb3d9',
      textBright: '#ffd9ec',
      uiAccent: '#ff70b0',
      
      // effects
      particleDamage: '#ff5a8f',
      particleCollect: '#ffd966'
    };

    // particle effect
    function createParticle(x, y, color) {
      return {
        x: x * PIXEL_SIZE + 10,
        y: y * PIXEL_SIZE + 10,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        life: 15,
        color: color
      };
    }

    function drawPixel(gx, gy, color) {
      ctx.fillStyle = color;
      ctx.fillRect(gx * PIXEL_SIZE, gy * PIXEL_SIZE, PIXEL_SIZE-1, PIXEL_SIZE-1);
      // inner highlight (lighter version of the color)
      ctx.fillStyle = '#ffffff40';
      ctx.fillRect(gx * PIXEL_SIZE, gy * PIXEL_SIZE, PIXEL_SIZE-2, 2);
    }

    function drawBackground() {
      ctx.fillStyle = palette.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // more visible grid lines
      ctx.strokeStyle = palette.gridLines;
      ctx.lineWidth = 1;
      for (let i = 0; i <= GRID_W; i++) {
        ctx.beginPath();
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

    function spawnPowerup() {
      if (gameOver || gameWin) return;
      let x = Math.floor(Math.random() * GRID_W);
      let y = Math.floor(Math.random() * GRID_H);
      
      let type = Math.random();
      if (type < 0.5) {
        powerups.push({ x, y, type: 'health', emoji: '🍀' });
      } else if (type < 0.7) {
        powerups.push({ x, y, type: 'multiplier', emoji: '⭐' });
      } else if (type < 0.85) {
        powerups.push({ x, y, type: 'speed', emoji: '⚡️' });
      } else {
        powerups.push({ x, y, type: 'freeze', emoji: '❄️' });
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

      let type = Math.random() < 0.2 ? 'fast' : 'normal';
      enemies.push({ x, y, type });
    }

    function resetGame() {
      player = { x: 20, y: 15 };
      enemies = [];
      powerups = [];
      particles = [];
      score = 0;
      health = 3;
      gameOver = false;
      gameWin = false;
      invincible = false;
      invincibleTimer = 0;
      speedBoost = false;
      speedTimer = 0;
      enemyFreeze = false;
      freezeTimer = 0;
      scoreMultiplier = 1;
      multiplierTimer = 0;
      frameCounter = 0;
      enemyMoveCounter = 0;
      updateDisplay();
      
      for (let i = 0; i < 3; i++) spawnEnemy();
      for (let i = 0; i < 3; i++) spawnPowerup();
    }

    function updateDisplay() {
      document.getElementById('scoreDisplay').innerText = String(score).padStart(4, '0');
      document.getElementById('healthDisplay').innerText = String(health).padStart(2, '0');
    }

    function gameTick() {
      if (gameOver || gameWin) return;

      if (speedBoost) {
        speedTimer--;
        if (speedTimer <= 0) speedBoost = false;
      }
      if (enemyFreeze) {
        freezeTimer--;
        if (freezeTimer <= 0) enemyFreeze = false;
      }
      if (multiplierTimer > 0) {
        multiplierTimer--;
        if (multiplierTimer <= 0) scoreMultiplier = 1;
      }

      let dx = 0, dy = 0;
      if (keys.ArrowUp) dy = -1;
      if (keys.ArrowDown) dy = 1;
      if (keys.ArrowLeft) dx = -1;
      if (keys.ArrowRight) dx = 1;

      if (dx !== 0 || dy !== 0) {
        let steps = speedBoost ? 2 : 1;
        for (let s = 0; s < steps; s++) {
          let newX = player.x + dx;
          let newY = player.y + dy;
          if (newX >= 0 && newX < GRID_W && newY >= 0 && newY < GRID_H) {
            player.x = newX;
            player.y = newY;
          }
        }
      }

      enemyMoveCounter++;
      let moveDelay = enemyFreeze ? ENEMY_MOVE_DELAY * 3 : ENEMY_MOVE_DELAY;
      
      if (enemyMoveCounter >= moveDelay) {
        enemyMoveCounter = 0;
        
        for (let e of enemies) {
          let dx = 0, dy = 0;
          if (e.x < player.x) dx = 1;
          if (e.x > player.x) dx = -1;
          if (e.y < player.y) dy = 1;
          if (e.y > player.y) dy = -1;
          
          let moveChance = (e.type === 'fast' && !enemyFreeze) ? 0.8 : 0.6;
          
          if (Math.random() < moveChance) {
            e.x = Math.min(GRID_W-1, Math.max(0, e.x + dx));
            e.y = Math.min(GRID_H-1, Math.max(0, e.y + dy));
          } else {
            if (Math.random() < 0.5) e.x = Math.min(GRID_W-1, Math.max(0, e.x + dx));
            else e.y = Math.min(GRID_H-1, Math.max(0, e.y + dy));
          }
        }
      }

      if (!invincible) {
        for (let i = enemies.length - 1; i >= 0; i--) {
          if (enemies[i].x === player.x && enemies[i].y === player.y) {
            health--;
            for (let j = 0; j < 8; j++) {
              particles.push(createParticle(player.x, player.y, palette.particleDamage));
            }
            enemies.splice(i, 1);
            
            if (health <= 0) {
              health = 0;
              gameOver = true;
            }
            
            invincible = true;
            invincibleTimer = 20;
            updateDisplay();
            break;
          }
        }
      } else {
        invincibleTimer--;
        if (invincibleTimer <= 0) invincible = false;
      }

      for (let i = powerups.length - 1; i >= 0; i--) {
        let p = powerups[i];
        if (p.x === player.x && p.y === player.y) {
          for (let j = 0; j < 6; j++) {
            particles.push(createParticle(p.x, p.y, palette.particleCollect));
          }

          switch(p.type) {
            case 'health':
              health = Math.min(health + 2, 5);
              score += 10 * scoreMultiplier;
              break;
            case 'multiplier':
              scoreMultiplier = 3;
              multiplierTimer = 300;
              score += 20;
              break;
            case 'speed':
              speedBoost = true;
              speedTimer = 180;
              score += 15 * scoreMultiplier;
              break;
            case 'freeze':
              enemyFreeze = true;
              freezeTimer = 180;
              score += 15 * scoreMultiplier;
              break;
          }
          
          powerups.splice(i, 1);
          updateDisplay();
          
          if (score >= 500) {
            gameWin = true;
          }
        }
      }

      frameCounter++;
      if (frameCounter % ENEMY_SPAWN_RATE === 0 && enemies.length < 12) {
        spawnEnemy();
      }
      if (frameCounter % POWERUP_SPAWN_RATE === 0 && powerups.length < 8) {
        spawnPowerup();
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].x += particles[i].vx;
        particles[i].y += particles[i].vy;
        particles[i].life--;
        if (particles[i].life <= 0) {
          particles.splice(i, 1);
        }
      }
    }

    function draw() {
      drawBackground();

      // particles
      for (let p of particles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 20;
        ctx.fillRect(p.x, p.y, 3, 3);
      }
      ctx.globalAlpha = 1;

      // draw powerups
      for (let p of powerups) {
        ctx.font = '18px "Courier New", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(p.emoji, p.x * PIXEL_SIZE + 2, p.y * PIXEL_SIZE + 16);
      }

      // draw enemies
      for (let e of enemies) {
        let color = palette.enemy;
        if (enemyFreeze) color = palette.enemyFrozen;
        else if (e.type === 'fast') color = palette.enemyFast;
        
        drawPixel(e.x, e.y, color);
        ctx.fillStyle = '#2d0020';
        ctx.fillRect(e.x * PIXEL_SIZE + 6, e.y * PIXEL_SIZE + 6, 5, 5);
        
        if (e.type === 'fast' && !enemyFreeze) {
          ctx.fillStyle = '#ffdd55';
          ctx.fillRect(e.x * PIXEL_SIZE + 2, e.y * PIXEL_SIZE + 2, 3, 3);
        }
      }

      // draw player - NEW COLORS
      if (!invincible || (invincible && Math.floor(Date.now() / 150) % 2 === 0)) {
        let playerColor = palette.player;
        if (speedBoost) playerColor = palette.playerSpeed;
        else if (invincible) playerColor = palette.playerInvincible;
        
        drawPixel(player.x, player.y, playerColor);
        
        // player eyes
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(player.x * PIXEL_SIZE + 5, player.y * PIXEL_SIZE + 5, 4, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(player.x * PIXEL_SIZE + 8, player.y * PIXEL_SIZE + 8, 3, 3);
      }

      // UI with emojis
      ctx.font = '16px "Courier New", monospace';
      ctx.fillStyle = palette.textBright;
      ctx.fillText('SCORE: ' + score, 580, 50);
      
      let yOffset = 70;
      if (scoreMultiplier > 1) {
        ctx.fillStyle = '#ffd966';
        ctx.fillText('⭐ x' + scoreMultiplier + ' MULTI!', 580, yOffset);
        yOffset += 20;
      }
      if (speedBoost) {
        ctx.fillStyle = '#7ff5ff';
        ctx.fillText('⚡ SPEED BOOST', 580, yOffset);
        yOffset += 20;
      }
      if (enemyFreeze) {
        ctx.fillStyle = '#9bb0d0';
        ctx.fillText('❄️ FROZEN', 580, yOffset);
      }

      // FIXED: CENTERED GAME OVER AND WIN SCREENS
      if (gameOver) {
        // semi-transparent overlay
        ctx.fillStyle = '#0f0b1ae0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#ff99cc';
        ctx.font = 'bold 48px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', 400, 280);
        
        ctx.font = '24px "Courier New", monospace';
        ctx.fillStyle = '#ffd9ec';
        ctx.fillText('score: ' + score, 400, 340);
        ctx.fillText('press RESTART', 400, 380);
        ctx.textAlign = 'left';
      } else if (gameWin) {
        // semi-transparent overlay
        ctx.fillStyle = '#0f0b1ae0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#ffd966';
        ctx.font = 'bold 48px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('✨ VICTORY ✨', 400, 280);
        
        ctx.font = '24px "Courier New", monospace';
        ctx.fillStyle = '#ffd9ec';
        ctx.fillText('final score: ' + score, 400, 340);
        ctx.fillText('you win!', 400, 380);
        ctx.textAlign = 'left';
      }
    }

    function loop() {
      gameTick();
      draw();
      requestAnimationFrame(loop);
    }

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

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
      }
    }, {passive: false});

    document.getElementById('resetBtn').addEventListener('click', resetGame);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    resetGame();
    loop();
})();