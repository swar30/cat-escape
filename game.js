window.onload = function () {
  // --- DOM Elements ---
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const startScreen = document.getElementById("start-screen");
  const gameOverScreen = document.getElementById("game-over-screen");
  const winScreen = document.getElementById("win-screen");
  const timerDisplay = document.getElementById("timer-display");
  const levelDisplay = document.getElementById("level-display");
  const objectiveDisplay = document.getElementById("objective-display");

  const btnStart = document.getElementById("start-btn");
  const btnRestart = document.getElementById("restart-btn");
  const btnPlayAgain = document.getElementById("play-again-btn");
  const winMessage = document.getElementById("win-message");
  const startCodeInput = document.getElementById("start-code-input");
  const startCodeHelp = document.getElementById("start-code-help");

  // --- Game Constants ---
  const GRID_SIZE = 16;
  let TILE_SIZE = 32; // Calculated dynamically
  const ESCAPE_TIME = 20; // Seconds until escape portal appears
  const CAT_BASE_SPEED = 6.0;
  const SPACE_SPEED_MULTIPLIER = 6;
  const AVATAR_DIRECTIONS = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];

  const CAT_START = { x: 1, y: 1 };
  const LEVELS = window.CAT_ESCAPE_LEVELS || [];
  const TOTAL_LEVELS = LEVELS.length;

  // --- Game State ---
  let gameState = "START"; // START, PLAYING, GAMEOVER, WIN
  let lastTime = 0;
  let timeElapsed = 0;
  let currentLevelIndex = 0;
  let finishedAllLevels = false;
  let map = getLevelMap(currentLevelIndex); // Pre-populate so background draws
  let escapePortal = null; // {x, y}
  let loopStarted = false; // Prevent multiple game loops
  let passThroughWalls = false; // Toggle for left mouse click
  let spaceWallPassEnabled = false; // Enabled by start code 1121
  let spaceSpeedBoostEnabled = false; // Enabled by start code 6767
  let spaceSpeedBoostActive = false;

  // Controls
  let keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    s: false,
    d: false,
  };
  let nextDir = { x: 0, y: 0 };

  // Entities
  let cat = {
    x: 1,
    y: 1,
    targetX: 1,
    targetY: 1,
    isMoving: false,
    progress: 0,
    speed: CAT_BASE_SPEED,
    dir: { x: 0, y: 1 },
  };
  const avatarBlueprints = [
    {
      speed: 4.0,
      dir: { x: -1, y: 0 },
      color: "#ef4444",
      image: "avatar-face",
      preferredSpawn: { x: 14, y: 1 },
    }, // Dog close-up avatar
    {
      speed: 4.2,
      dir: { x: 1, y: 0 },
      color: "#8b5cf6",
      image: "avatar-dog",
      preferredSpawn: { x: 1, y: 14 },
    }, // Dog avatar
    {
      speed: 3.8,
      dir: { x: -1, y: 0 },
      color: "#06b6d4",
      image: "avatar-glasses",
      preferredSpawn: { x: 14, y: 14 },
    }, // Dog portrait avatar
    {
      speed: 4.1,
      dir: { x: 0, y: -1 },
      color: "#f97316",
      image: "avatar-smile",
      preferredSpawn: { x: 7, y: 13 },
    }, // Dog snout avatar
    {
      speed: 3.6,
      dir: { x: 1, y: 0 },
      color: "#22c55e",
      image: "avatar-collie",
      preferredSpawn: { x: 8, y: 1 },
    }, // Collie avatar
  ];
  let avatars = [];

  const catImage = new Image();
  const avatarImages = {
    "avatar-face": new Image(),
    "avatar-dog": new Image(),
    "avatar-glasses": new Image(),
    "avatar-smile": new Image(),
    "avatar-collie": new Image(),
  };
  const redrawOnAssetLoad = () => draw();

  catImage.addEventListener("load", redrawOnAssetLoad);
  Object.values(avatarImages).forEach((image) => {
    image.addEventListener("load", redrawOnAssetLoad);
  });

  catImage.src = "cat.png";
  avatarImages["avatar-face"].src = "avatar-face.png";
  avatarImages["avatar-dog"].src = "avatar-dog.png";
  avatarImages["avatar-glasses"].src = "avatar-glasses.png";
  avatarImages["avatar-smile"].src = "avatar-smile.png";
  avatarImages["avatar-collie"].src = "avatar-collie.png";

  // --- Level Data ---
  function createFallbackTunnelMap() {
    const fallback = Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => 1),
    );
    for (let x = 1; x < GRID_SIZE - 1; x++) {
      fallback[1][x] = 0;
      fallback[GRID_SIZE - 2][x] = 0;
    }
    for (let y = 1; y < GRID_SIZE - 1; y++) {
      fallback[y][1] = 0;
      fallback[y][GRID_SIZE - 2] = 0;
    }
    return fallback;
  }

  function getLevelMap(levelIndex) {
    const levelRows = LEVELS[levelIndex];
    if (!levelRows) return createFallbackTunnelMap();

    return levelRows.map((row) =>
      row.split("").map((tile) => (tile === "0" ? 0 : 1)),
    );
  }

  function getFloorTiles(testMap) {
    const floors = [];
    for (let y = 1; y < GRID_SIZE - 1; y++) {
      for (let x = 1; x < GRID_SIZE - 1; x++) {
        if (testMap[y][x] === 0) floors.push({ x, y });
      }
    }
    return floors;
  }

  function updateLevelDisplay() {
    const currentLevel = Math.min(currentLevelIndex + 1, TOTAL_LEVELS || 1);
    levelDisplay.textContent = `${currentLevel}/${TOTAL_LEVELS || 1}`;
  }

  function pickAvatarSpawn(preferredSpawn, usedSpawns) {
    const available = getFloorTiles(map).filter((tile) => {
      const key = `${tile.x},${tile.y}`;
      const distanceFromCat =
        Math.abs(tile.x - CAT_START.x) + Math.abs(tile.y - CAT_START.y);
      return !usedSpawns.has(key) && distanceFromCat >= 6;
    });

    const spawnOptions =
      available.length > 0
        ? available
        : getFloorTiles(map).filter(
            (tile) => !usedSpawns.has(`${tile.x},${tile.y}`),
          );
    spawnOptions.sort((a, b) => {
      const distanceA =
        Math.abs(a.x - preferredSpawn.x) +
        Math.abs(a.y - preferredSpawn.y);
      const distanceB =
        Math.abs(b.x - preferredSpawn.x) +
        Math.abs(b.y - preferredSpawn.y);
      return distanceA - distanceB;
    });

    const topChoices = spawnOptions.slice(
      0,
      Math.min(4, spawnOptions.length),
    );
    const spawn = topChoices[Math.floor(Math.random() * topChoices.length)];
    usedSpawns.add(`${spawn.x},${spawn.y}`);
    return spawn;
  }

  function createAvatarsForMap() {
    const usedSpawns = new Set([`${CAT_START.x},${CAT_START.y}`]);
    return avatarBlueprints.map((blueprint) => {
      const spawn = pickAvatarSpawn(blueprint.preferredSpawn, usedSpawns);
      return {
        x: spawn.x,
        y: spawn.y,
        targetX: spawn.x,
        targetY: spawn.y,
        isMoving: false,
        progress: 0,
        speed: blueprint.speed,
        dir: { ...blueprint.dir },
        color: blueprint.color,
        image: blueprint.image,
      };
    });
  }

  // --- Initialization ---
  function initGame(options = {}) {
    if (options.resetToFirstLevel) {
      currentLevelIndex = 0;
      finishedAllLevels = false;
    }

    map = getLevelMap(currentLevelIndex);
    updateLevelDisplay();

    // Reset Time
    timeElapsed = 0;
    escapePortal = null;
    objectiveDisplay.textContent = `SURVIVE ${ESCAPE_TIME}s TO ESCAPE`;
    objectiveDisplay.className =
      "text-sm font-bold text-amber-400 animate-pulse";
    passThroughWalls = false;
    spaceWallPassEnabled = startCodeInput.value.trim() === "1121";
    spaceSpeedBoostEnabled = startCodeInput.value.trim() === "6767";
    spaceSpeedBoostActive = false;

    // Reset Cat
    cat = {
      x: CAT_START.x,
      y: CAT_START.y,
      targetX: CAT_START.x,
      targetY: CAT_START.y,
      isMoving: false,
      progress: 0,
      speed: CAT_BASE_SPEED,
      dir: { x: 0, y: 1 },
    };
    nextDir = { x: 0, y: 0 };

    // Reset Avatars
    avatars = createAvatarsForMap();
    avatars.forEach(pickRandomAvatarDirection);

    gameState = "PLAYING";
    startScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");
    winScreen.classList.add("hidden");
    startCodeInput.blur();

    // Clear inline styles that override the Tailwind 'hidden' class
    gameOverScreen.style.display = "";
    winScreen.style.display = "";

    lastTime = performance.now();
    if (!loopStarted) {
      loopStarted = true;
      requestAnimationFrame(gameLoop);
    }
  }

  updateLevelDisplay();

  // --- Resize Handling ---
  function resizeCanvas() {
    const isMobile = window.innerWidth < 768;
    // Leave room for the mobile HUD and controls in normal page flow.
    const mobileReserve = window.innerHeight < 740 ? 360 : 380;
    const availableHeight = isMobile
      ? window.innerHeight - mobileReserve
      : window.innerHeight - 100;
    const availableWidth = window.innerWidth - 40;

    const minDimension = Math.min(availableWidth, availableHeight);
    TILE_SIZE = Math.floor(minDimension / GRID_SIZE);

    canvas.width = TILE_SIZE * GRID_SIZE;
    canvas.height = TILE_SIZE * GRID_SIZE;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas(); // Initial call

  // --- Input Handling ---
  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 0 && gameState === "PLAYING") {
      passThroughWalls = !passThroughWalls;
    }
  });

  window.addEventListener("keydown", (e) => {
    if (gameState === "START" && e.code === "Enter") {
      btnStart.click();
      return;
    }

    if (e.target === startCodeInput && gameState === "START") {
      return;
    }

    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
    updateNextDir();

    // Keyboard Speed Controls (+ / -)
    if (e.key === "+" || e.key === "=") {
      cat.speed += 1.0;
    } else if (e.key === "-" || e.key === "_") {
      cat.speed = Math.max(1.0, cat.speed - 1.0); // Prevent negative/zero speed
    }

    if (
      e.code === "Space" &&
      gameState === "PLAYING" &&
      spaceWallPassEnabled &&
      !e.repeat
    ) {
      e.preventDefault();
      passThroughWalls = !passThroughWalls;
    } else if (
      e.code === "Space" &&
      gameState === "PLAYING" &&
      spaceSpeedBoostEnabled
    ) {
      e.preventDefault();
      spaceSpeedBoostActive = true;
    } else if (
      (e.code === "Space" || e.code === "Enter") &&
      gameState === "GAMEOVER"
    ) {
      // Press Space or Enter to restart after Game Over
      btnRestart.click();
    }
  });
  window.addEventListener("keyup", (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    if (e.code === "Space") {
      spaceSpeedBoostActive = false;
    }
    updateNextDir();
  });

  function updateNextDir() {
    if (keys.ArrowUp || keys.w) nextDir = { x: 0, y: -1 };
    else if (keys.ArrowDown || keys.s) nextDir = { x: 0, y: 1 };
    else if (keys.ArrowLeft || keys.a) nextDir = { x: -1, y: 0 };
    else if (keys.ArrowRight || keys.d) nextDir = { x: 1, y: 0 };
    else nextDir = { x: 0, y: 0 };
  }

  // Virtual D-pad logic
  const bindTouch = (id, dx, dy) => {
    const btn = document.getElementById(id);
    const start = (e) => {
      e.preventDefault();
      nextDir = { x: dx, y: dy };
    };
    const end = (e) => {
      e.preventDefault();
      nextDir = { x: 0, y: 0 };
    };
    btn.addEventListener("touchstart", start);
    btn.addEventListener("touchend", end);
    btn.addEventListener("mousedown", start);
    btn.addEventListener("mouseup", end);
    btn.addEventListener("mouseleave", end);
  };
  bindTouch("btn-up", 0, -1);
  bindTouch("btn-down", 0, 1);
  bindTouch("btn-left", -1, 0);
  bindTouch("btn-right", 1, 0);

  // --- Speed Control Buttons ---
  const speedUp = () => {
    cat.speed += 1.0;
  };
  const speedDown = () => {
    cat.speed = Math.max(1.0, cat.speed - 1.0);
  };
  ["btn-speed-up", "btn-speed-up-mobile"].forEach((id) => {
    document.getElementById(id).addEventListener("click", () => {
      speedUp();
    });
  });
  ["btn-speed-down", "btn-speed-down-mobile"].forEach((id) => {
    document.getElementById(id).addEventListener("click", () => {
      speedDown();
    });
  });

  // --- UI Buttons ---
  function updateStartCodeHelp() {
    startCodeHelp.classList.toggle(
      "hidden",
      startCodeInput.value.trim() !== "?",
    );
  }

  startCodeInput.addEventListener("input", updateStartCodeHelp);

  btnStart.addEventListener("click", () => {
    if (startCodeInput.value.trim() === "?") {
      updateStartCodeHelp();
      return;
    }
    initGame({ resetToFirstLevel: true });
  });
  btnRestart.addEventListener("click", initGame);
  btnPlayAgain.addEventListener("click", () => {
    initGame({ resetToFirstLevel: finishedAllLevels });
  });

  // --- Game Logic ---
  function canMove(x, y, ignoreWalls = false) {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false;
    if (ignoreWalls) return true;
    return map[y][x] === 0;
  }

  function getOpenAvatarMoves(avatar) {
    return AVATAR_DIRECTIONS.map((dir) => ({
      x: avatar.x + dir.x,
      y: avatar.y + dir.y,
      dir,
    })).filter((move) => canMove(move.x, move.y));
  }

  function countOpenNeighborTiles(x, y) {
    return AVATAR_DIRECTIONS.filter((dir) =>
      canMove(x + dir.x, y + dir.y),
    ).length;
  }

  function isTunnelTile(x, y) {
    return countOpenNeighborTiles(x, y) <= 2;
  }

  function pickRandomAvatarDirection(avatar) {
    let moves = getOpenAvatarMoves(avatar);
    if (moves.length === 0) return null;

    if (avatar.dir && moves.length > 1) {
      const reverseX = -avatar.dir.x;
      const reverseY = -avatar.dir.y;
      const forwardMoves = moves.filter(
        (move) => move.dir.x !== reverseX || move.dir.y !== reverseY,
      );
      if (forwardMoves.length > 0) {
        moves = forwardMoves;
      }
    }

    const move = moves[Math.floor(Math.random() * moves.length)];
    avatar.dir = { ...move.dir };
    return move;
  }

  function getRightTurnMove(avatar) {
    if (!avatar.dir) return null;

    const rightDir = { x: -avatar.dir.y, y: avatar.dir.x };
    const rightX = avatar.x + rightDir.x;
    const rightY = avatar.y + rightDir.y;
    if (!canMove(rightX, rightY)) return null;
    if (!isTunnelTile(rightX, rightY)) return null;

    avatar.dir = rightDir;
    return { x: rightX, y: rightY };
  }

  function getLineOfSightMove(avatar) {
    let chaseDir = null;

    if (avatar.x === cat.x) {
      chaseDir = { x: 0, y: Math.sign(cat.y - avatar.y) };
    } else if (avatar.y === cat.y) {
      chaseDir = { x: Math.sign(cat.x - avatar.x), y: 0 };
    }

    if (!chaseDir || (chaseDir.x === 0 && chaseDir.y === 0)) {
      return null;
    }

    let checkX = avatar.x + chaseDir.x;
    let checkY = avatar.y + chaseDir.y;
    while (checkX !== cat.x || checkY !== cat.y) {
      if (!canMove(checkX, checkY)) return null;
      checkX += chaseDir.x;
      checkY += chaseDir.y;
    }

    const nextX = avatar.x + chaseDir.x;
    const nextY = avatar.y + chaseDir.y;
    if (!canMove(nextX, nextY)) return null;

    avatar.dir = chaseDir;
    return { x: nextX, y: nextY };
  }

  function getNextRandomAvatarMove(avatar) {
    const lineOfSightMove = getLineOfSightMove(avatar);
    if (lineOfSightMove) return lineOfSightMove;

    const rightTurn = getRightTurnMove(avatar);
    if (rightTurn) return rightTurn;

    if (avatar.dir) {
      const nextX = avatar.x + avatar.dir.x;
      const nextY = avatar.y + avatar.dir.y;
      if (canMove(nextX, nextY)) {
        return { x: nextX, y: nextY };
      }
    }

    return pickRandomAvatarDirection(avatar);
  }

  function spawnEscapePortal() {
    // Find empty floor spots
    let emptySpots = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (map[y][x] === 0 && (x !== cat.targetX || y !== cat.targetY)) {
          emptySpots.push({ x, y });
        }
      }
    }
    if (emptySpots.length > 0) {
      let spot =
        emptySpots[Math.floor(Math.random() * emptySpots.length)];
      escapePortal = spot;
      objectiveDisplay.textContent = "PORTAL OPEN! ESCAPE NOW!";
      objectiveDisplay.className =
        "text-sm font-bold text-emerald-400 animate-pulse";
    }
  }

  function showWinScreen() {
    const completedLevel = currentLevelIndex + 1;
    finishedAllLevels = currentLevelIndex >= TOTAL_LEVELS - 1;

    if (finishedAllLevels) {
      winMessage.textContent = `You cleared all ${TOTAL_LEVELS} levels.`;
      btnPlayAgain.textContent = "PLAY AGAIN";
    } else {
      currentLevelIndex++;
      updateLevelDisplay();
      winMessage.textContent = `Level ${completedLevel} complete.`;
      btnPlayAgain.textContent = "NEXT LEVEL";
    }

    gameState = "WIN";
    winScreen.classList.remove("hidden");
    winScreen.style.display = "flex";
  }

  function update(dt) {
    if (gameState !== "PLAYING") return;

    // Time tracking
    timeElapsed += dt;
    let seconds = Math.floor(timeElapsed);
    let displaySecs = String(seconds).padStart(2, "0");
    timerDisplay.textContent = `00:${displaySecs}`;

    // Spawn escape portal after threshold
    if (seconds >= ESCAPE_TIME && !escapePortal) {
      spawnEscapePortal();
    }

    // 1. Update Cat
    if (!cat.isMoving) {
      // Try to start moving if input exists
      if (nextDir.x !== 0 || nextDir.y !== 0) {
        if (
          canMove(cat.x + nextDir.x, cat.y + nextDir.y, passThroughWalls)
        ) {
          cat.targetX = cat.x + nextDir.x;
          cat.targetY = cat.y + nextDir.y;
          cat.dir = { ...nextDir };
          cat.isMoving = true;
          cat.progress = 0;
        } else {
          // Turn to face the wall even if we can't move
          cat.dir = { ...nextDir };
        }
      }
    }

    if (cat.isMoving) {
      const effectiveCatSpeed =
        cat.speed * (spaceSpeedBoostActive ? SPACE_SPEED_MULTIPLIER : 1);
      cat.progress += effectiveCatSpeed * dt;
      if (cat.progress >= 1.0) {
        cat.x = cat.targetX;
        cat.y = cat.targetY;
        cat.isMoving = false;
        cat.progress = 0;

        // Check portal win condition
        if (
          escapePortal &&
          cat.x === escapePortal.x &&
          cat.y === escapePortal.y
        ) {
          showWinScreen();
          return;
        }
      }
    }

    // 2. Update Avatars
    for (let avatar of avatars) {
      if (!avatar.isMoving) {
        let step = getNextRandomAvatarMove(avatar);

        if (step && canMove(step.x, step.y)) {
          avatar.targetX = step.x;
          avatar.targetY = step.y;
          avatar.isMoving = true;
          avatar.progress = 0;
        }
      }

      if (avatar.isMoving) {
        avatar.progress += avatar.speed * dt;
        if (avatar.progress >= 1.0) {
          avatar.x = avatar.targetX;
          avatar.y = avatar.targetY;
          avatar.isMoving = false;
          avatar.progress = 0;
        }
      }

      // 3. Collision Detection (Interpolated coordinates to catch exact overlap during transition)
      let catPixelX = cat.x + (cat.targetX - cat.x) * cat.progress;
      let catPixelY = cat.y + (cat.targetY - cat.y) * cat.progress;

      let avPixelX =
        avatar.x + (avatar.targetX - avatar.x) * avatar.progress;
      let avPixelY =
        avatar.y + (avatar.targetY - avatar.y) * avatar.progress;

      let distSq =
        Math.pow(catPixelX - avPixelX, 2) +
        Math.pow(catPixelY - avPixelY, 2);

      if (distSq < 0.3) {
        // Threshold for collision
        gameState = "GAMEOVER";
        gameOverScreen.classList.remove("hidden");
        gameOverScreen.style.display = "flex";
      }
    }
  }

  // --- Rendering ---
  function draw() {
    // Clear & fill background
    ctx.fillStyle = "#1e293b"; // Slate-800
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Map
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        let px = x * TILE_SIZE;
        let py = y * TILE_SIZE;

        if (map[y] && map[y][x] === 1) {
          // Wall Block
          ctx.fillStyle = "#334155"; // Slate-700
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

          // Top bevel
          ctx.fillStyle = "#475569";
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE * 0.2);

          // Border
          ctx.strokeStyle = "#0f172a";
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
        } else {
          // Floor Checkerboard
          if ((x + y) % 2 === 0) {
            ctx.fillStyle = "#1e293b";
          } else {
            ctx.fillStyle = "#0f172a";
          }
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // Draw Escape Portal
    if (escapePortal) {
      let px = escapePortal.x * TILE_SIZE + TILE_SIZE / 2;
      let py = escapePortal.y * TILE_SIZE + TILE_SIZE / 2;

      // Pulsing effect
      let pulse = Math.abs(Math.sin(timeElapsed * 3)) * 0.5 + 0.5;

      ctx.beginPath();
      ctx.arc(px, py, (TILE_SIZE / 2) * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(16, 185, 129, ${0.4 * pulse})`; // Emerald glow
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, (TILE_SIZE / 2) * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = "#34d399";
      ctx.fill();

      // Spiral/Star detail inside
      ctx.fillStyle = "#ecfdf5";
      ctx.fillRect(px - 2, py - TILE_SIZE * 0.3, 4, TILE_SIZE * 0.6);
      ctx.fillRect(px - TILE_SIZE * 0.3, py - 2, TILE_SIZE * 0.6, 4);
    }

    // Helper to get interpolated pixel coordinates
    const getPixelPos = (entity) => {
      return {
        x:
          (entity.x + (entity.targetX - entity.x) * entity.progress) *
            TILE_SIZE +
          TILE_SIZE / 2,
        y:
          (entity.y + (entity.targetY - entity.y) * entity.progress) *
            TILE_SIZE +
          TILE_SIZE / 2,
      };
    };

    // Draw Avatars (Chasers)
    for (let avatar of avatars) {
      let pos = getPixelPos(avatar);
      let size = TILE_SIZE * 0.7;
      let avatarImage = avatar.image ? avatarImages[avatar.image] : null;

      if (
        avatarImage &&
        avatarImage.complete &&
        avatarImage.naturalWidth > 0
      ) {
        let imgSize = TILE_SIZE * 0.9;

        ctx.save();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, imgSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(
          avatarImage,
          pos.x - imgSize / 2,
          pos.y - imgSize / 2,
          imgSize,
          imgSize,
        );
        ctx.restore();

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, imgSize / 2, 0, Math.PI * 2);
        ctx.strokeStyle = avatar.color;
        ctx.lineWidth = Math.max(2, TILE_SIZE * 0.08);
        ctx.stroke();
        continue;
      }

      ctx.fillStyle = avatar.color;

      // Simple humanoid shape (Circle head, rounded rect body)
      ctx.beginPath();
      // Body
      ctx.roundRect(
        pos.x - size / 3,
        pos.y - size / 4,
        size / 1.5,
        size / 1.5,
        4,
      );
      ctx.fill();

      // Head
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - size / 2, size / 3, 0, Math.PI * 2);
      ctx.fill();

      // Angry Eyes
      ctx.fillStyle = "white";
      ctx.fillRect(
        pos.x - size / 6,
        pos.y - size / 1.8,
        size / 8,
        size / 8,
      );
      ctx.fillRect(
        pos.x + size / 12,
        pos.y - size / 1.8,
        size / 8,
        size / 8,
      );

      // Eye pupils
      ctx.fillStyle = "black";
      ctx.fillRect(
        pos.x - size / 6 + 1,
        pos.y - size / 1.8 + 1,
        size / 16,
        size / 16,
      );
      ctx.fillRect(
        pos.x + size / 12 + 1,
        pos.y - size / 1.8 + 1,
        size / 16,
        size / 16,
      );
    }

    // Draw Cat (Player)
    let catPos = getPixelPos(cat);
    let catSize = TILE_SIZE * 0.6;

    ctx.save();
    ctx.translate(catPos.x, catPos.y);

    if (passThroughWalls) {
      ctx.globalAlpha = 0.5;
    }

    // --- CAT AVATAR FROM PNG ---
    let imgSize = TILE_SIZE * 0.9;
    ctx.beginPath();
    ctx.arc(0, 0, imgSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(catImage, -imgSize / 2, -imgSize / 2, imgSize, imgSize);

    ctx.restore();

    ctx.save();
    if (passThroughWalls) {
      ctx.globalAlpha = 0.5;
    }
    ctx.beginPath();
    ctx.arc(catPos.x, catPos.y, imgSize / 2, 0, Math.PI * 2);
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = Math.max(2, TILE_SIZE * 0.08);
    ctx.stroke();
    ctx.restore();
  }

  // --- Main Game Loop ---
  function gameLoop(timestamp) {
    if (gameState !== "PLAYING") {
      lastTime = timestamp;
      requestAnimationFrame(gameLoop);
      return;
    }

    // Delta time in seconds
    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    // Cap dt to prevent huge jumps if tab is inactive
    if (dt > 0.1) dt = 0.1;

    update(dt);
    draw();

    requestAnimationFrame(gameLoop);
  }

  // Run initial draw so the canvas isn't blank before starting
  draw();
};
