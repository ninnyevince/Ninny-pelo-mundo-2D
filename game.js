const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const startBtn = document.getElementById('start-btn');

// --- SISTEMA DE ÁUDIO SEGURO E MUSICA DE FUNDO ---
let audioCtx = null;

// Playlist Interna do Jogo (Alterna os áudios em volume baixo)
const bgTracks = [
  new Audio('bgm1.mp3'),
  new Audio('bgm2.mp3')
];
let currentTrackIndex = 0;
let isMusicPlaying = false;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  startBackgroundMusic();
}

function startBackgroundMusic() {
  if (isMusicPlaying) return;
  
  playTrack(currentTrackIndex);
  isMusicPlaying = true;
}

function playTrack(index) {
  // Para a faixa atual se existir
  bgTracks.forEach(track => track.pause());

  const track = bgTracks[index];
  track.volume = 0.15; // Volume baixo e agradável (15%)
  track.currentTime = 0;

  // Quando terminar, alterna para a próxima música
  track.onended = () => {
    currentTrackIndex = (currentTrackIndex + 1) % bgTracks.length;
    playTrack(currentTrackIndex);
  };

  track.play().catch(e => console.log("Aguardando clique para iniciar áudio de fundo."));
}

function playSound(type) {
  if (!audioCtx) return;

  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'jump') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'slide') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.linearRampToValueAtTime(70, now + 0.18);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'candy') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'gameover') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(60, now + 0.35);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch (e) {
    console.log("Áudio bloqueado temporariamente pelo navegador.");
  }
}

// --- CARREGAMENTO DE IMAGENS ---
const images = {
  idle: new Image(),
  walk: new Image(),
  jumping: new Image(),
  sliding: new Image()
};

images.idle.src = 'Idle front.png';
images.walk.src = 'walk front.png';
images.jumping.src = 'jumping.png';

images.sliding.src = 'sliding.png';
images.sliding.onerror = () => {
  images.sliding.onerror = null;
  images.sliding.src = 'sliding.jpg';
};

// Imagens dos Doces
const candyImages = [
  new Image(),
  new Image(),
  new Image(),
  new Image(),
  new Image()
];

candyImages[0].src = 'candies.png';
candyImages[1].src = 'gummy bear.png';
candyImages[2].src = 'heart lolipop.png';
candyImages[3].src = 'lolipop.png';
candyImages[4].src = 'star fruit.png';

// --- ESTADO DO JOGO ---
let gameState = 'START';
let score = 0;
let highScore = localStorage.getItem('ninny_highscore') || 0;
let frameCount = 0;

// Configuração do Ninny
const ninny = {
  x: 90,
  y: 240,
  width: 60,
  height: 75,
  velocityY: 0,
  gravity: 0.6,
  jumpPower: -12.5,
  isGrounded: false,
  isSliding: false,

  reset() {
    this.y = 240;
    this.velocityY = 0;
    this.isGrounded = true;
    this.isSliding = false;
    this.height = 75;
    this.width = 60;
  },

  update() {
    this.velocityY += this.gravity;
    this.y += this.velocityY;

    const groundLevel = canvas.height - 75;
    if (this.y + this.height >= groundLevel) {
      this.y = groundLevel - this.height;
      this.velocityY = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }
  },

  jump() {
    if (this.isGrounded && !this.isSliding) {
      this.velocityY = this.jumpPower;
      this.isGrounded = false;
      playSound('jump');
    }
  },

  setSlide(sliding) {
    if (this.isGrounded) {
      if (!this.isSliding && sliding) {
        playSound('slide');
      }
      this.isSliding = sliding;
      if (sliding) {
        this.height = 45;
        this.width = 80;
      } else {
        this.height = 75;
        this.width = 60;
      }
    }
  },

  draw() {
    let imgToDraw = images.idle;

    if (this.isSliding) {
      imgToDraw = images.sliding;
    } else if (!this.isGrounded) {
      imgToDraw = images.jumping;
    } else if (gameState === 'PLAYING') {
      imgToDraw = (Math.floor(frameCount / 10) % 2 === 0) ? images.walk : images.idle;
    } else {
      imgToDraw = images.idle;
    }

    if (imgToDraw.complete && imgToDraw.naturalWidth !== 0) {
      ctx.drawImage(imgToDraw, this.x, this.y, this.width, this.height);
    } else {
      ctx.fillStyle = '#222';
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
  }
};

let obstacles = [];
let candies = [];

// Gerenciador de Biomas e Troca Dia/Noite
function getBiome() {
  const stage = Math.floor(score / 1000) % 6;

  switch (stage) {
    case 0:
      return {
        name: 'Ártico (Dia)',
        isNight: false,
        skyTop: '#48cae4', skyBottom: '#ade8f4',
        ground: '#f8f9fa', groundBorder: '#00b4d8',
        mountainColor: '#90e0ef',
        obstacleType: 'ICE'
      };
    case 1:
      return {
        name: 'Floresta (Dia)',
        isNight: false,
        skyTop: '#2b9348', skyBottom: '#80b918',
        ground: '#38b000', groundBorder: '#007200',
        mountainColor: '#1b4332',
        obstacleType: 'TREE'
      };
    case 2:
      return {
        name: 'Deserto (Entardecer)',
        isNight: false,
        skyTop: '#f77f00', skyBottom: '#fcbf49',
        ground: '#e9c46a', groundBorder: '#f4a261',
        mountainColor: '#d4a373',
        obstacleType: 'CACTUS'
      };
    case 3:
      return {
        name: 'Montanha (Noite Estrelada)',
        isNight: true,
        skyTop: '#03071e', skyBottom: '#370617',
        ground: '#495057', groundBorder: '#212529',
        mountainColor: '#1a1d20',
        obstacleType: 'ROCK'
      };
    case 4:
      return {
        name: 'Vulcão (Noite)',
        isNight: true,
        skyTop: '#10002b', skyBottom: '#5a189a',
        ground: '#3c096c', groundBorder: '#7b2cbf',
        mountainColor: '#240046',
        obstacleType: 'LAVA_ROCK'
      };
    case 5:
      return {
        name: 'Praia Tropical (Dia)',
        isNight: false,
        skyTop: '#00b4d8', skyBottom: '#90e0ef',
        ground: '#feefdd', groundBorder: '#e9c46a',
        mountainColor: '#0077b6',
        obstacleType: 'PALM_TRUNK'
      };
  }
}

// Obstáculos Terrestres
class Obstacle {
  constructor() {
    this.width = 40;
    this.height = 50;
    this.x = canvas.width;
    this.y = canvas.height - 75 - this.height;
    this.speed = 4.5 + (score / 600);
  }

  update() {
    this.x -= this.speed;
  }

  draw() {
    const biome = getBiome();

    if (biome.obstacleType === 'ICE') {
      ctx.fillStyle = '#a8dede';
      ctx.strokeStyle = '#00b4d8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + this.height);
      ctx.lineTo(this.x + this.width / 2, this.y);
      ctx.lineTo(this.x + this.width, this.y + this.height);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (biome.obstacleType === 'TREE') {
      ctx.fillStyle = '#6c584c';
      ctx.fillRect(this.x + 12, this.y + 20, 16, 30);
      ctx.fillStyle = '#2d6a4f';
      ctx.beginPath();
      ctx.arc(this.x + 20, this.y + 15, 20, 0, Math.PI * 2);
      ctx.fill();
    } else if (biome.obstacleType === 'CACTUS') {
      ctx.fillStyle = '#2a9d8f';
      ctx.fillRect(this.x + 14, this.y, 12, 50);
      ctx.fillRect(this.x + 4, this.y + 15, 32, 8);
      ctx.fillRect(this.x + 4, this.y + 5, 8, 15);
      ctx.fillRect(this.x + 28, this.y + 5, 8, 15);
    } else if (biome.obstacleType === 'ROCK' || biome.obstacleType === 'LAVA_ROCK') {
      ctx.fillStyle = biome.obstacleType === 'LAVA_ROCK' ? '#d90429' : '#343a40';
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + this.height);
      ctx.lineTo(this.x + 10, this.y + 10);
      ctx.lineTo(this.x + 30, this.y);
      ctx.lineTo(this.x + this.width, this.y + this.height);
      ctx.closePath();
      ctx.fill();
    } else if (biome.obstacleType === 'PALM_TRUNK') {
      ctx.fillStyle = '#8d5b4c';
      ctx.fillRect(this.x + 14, this.y + 10, 12, 40);
      ctx.fillStyle = '#38b000';
      ctx.beginPath();
      ctx.ellipse(this.x + 20, this.y + 10, 22, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Classe dos Doces
class Candy {
  constructor() {
    this.x = canvas.width;
    this.y = canvas.height - 120 - Math.random() * 85;
    this.width = 32;
    this.height = 32;
    this.speed = 4.2 + (score / 600);
    this.imageIndex = Math.floor(Math.random() * candyImages.length);
  }

  update() {
    this.x -= this.speed;
  }

  draw() {
    const img = candyImages[this.imageIndex];
    if (img.complete && img.naturalWidth !== 0) {
      ctx.drawImage(img, this.x, this.y, this.width, this.height);
    } else {
      ctx.fillStyle = '#ff70a6';
      ctx.beginPath();
      ctx.arc(this.x + 16, this.y + 16, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBackground() {
  const biome = getBiome();

  // Céu
  const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGradient.addColorStop(0, biome.skyTop);
  skyGradient.addColorStop(1, biome.skyBottom);
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Estrelas/Lua
  if (biome.isNight) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(100, 40, 3, 3);
    ctx.fillRect(250, 70, 2, 2);
    ctx.fillRect(420, 30, 3, 3);
    ctx.fillRect(520, 80, 2, 2);

    ctx.beginPath();
    ctx.arc(580, 50, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#fff9c4';
    ctx.fill();
  }

  // Montanhas
  ctx.fillStyle = biome.mountainColor;
  ctx.beginPath();
  ctx.moveTo(0, 325);
  ctx.lineTo(120, 180);
  ctx.lineTo(240, 325);
  ctx.lineTo(440, 150);
  ctx.lineTo(620, 325);
  ctx.lineTo(800, 200);
  ctx.lineTo(800, 325);
  ctx.fill();

  // Chão
  ctx.fillStyle = biome.ground;
  ctx.fillRect(0, canvas.height - 75, canvas.width, 75);
  ctx.fillStyle = biome.groundBorder;
  ctx.fillRect(0, canvas.height - 75, canvas.width, 8);
}

function drawHUD() {
  const biome = getBiome();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 5;
  ctx.fillText(`Pontos: ${score}`, 20, 35);
  ctx.fillText(`Cenário: ${biome.name}`, canvas.width / 2 - 120, 35);
  ctx.fillText(`Recorde: ${highScore}`, canvas.width - 160, 35);
  ctx.shadowBlur = 0;
}

function checkCollision(rect1, rect2) {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBackground();

  if (gameState === 'PLAYING') {
    frameCount++;
    score += 1;

    ninny.update();
    ninny.draw();

    // Spawn Obstáculos
    if (frameCount % 115 === 0) {
      obstacles.push(new Obstacle());
    }

    // Spawn Doces
    if (frameCount % 135 === 0) {
      candies.push(new Candy());
    }

    // Atualizar Obstáculos
    for (let i = obstacles.length - 1; i >= 0; i--) {
      obstacles[i].update();
      obstacles[i].draw();

      if (checkCollision(ninny, obstacles[i])) {
        gameOver();
      }

      if (obstacles[i].x + obstacles[i].width < 0) {
        obstacles.splice(i, 1);
      }
    }

    // Atualizar Doces
    for (let i = candies.length - 1; i >= 0; i--) {
      candies[i].update();
      candies[i].draw();

      if (checkCollision(ninny, candies[i])) {
        score += 60;
        playSound('candy');
        candies.splice(i, 1);
      } else if (candies[i].x + candies[i].width < 0) {
        candies.splice(i, 1);
      }
    }

    drawHUD();
    requestAnimationFrame(gameLoop);
  } else {
    ninny.draw();
  }
}

function startGame() {
  initAudio();
  score = 0;
  frameCount = 0;
  obstacles = [];
  candies = [];
  ninny.reset();
  gameState = 'PLAYING';
  overlay.classList.add('hidden');
  gameLoop();
}

function gameOver() {
  gameState = 'GAMEOVER';
  playSound('gameover');
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('ninny_highscore', highScore);
  }

  overlayTitle.innerText = 'Fim de Jogo!';
  overlayMsg.innerText = `Sua pontuação final foi: ${score}`;
  startBtn.innerText = 'JOGAR NOVAMENTE';
  overlay.classList.remove('hidden');
}

// Eventos de Teclado
document.addEventListener('keydown', (e) => {
  initAudio();
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    if (gameState === 'PLAYING') {
      ninny.jump();
    } else {
      startGame();
    }
  } else if ((e.code === 'ArrowDown' || e.code === 'KeyS') && gameState === 'PLAYING') {
    ninny.setSlide(true);
  }
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowDown' || e.code === 'KeyS') {
    ninny.setSlide(false);
  }
});

// Clique / Toque
canvas.addEventListener('mousedown', () => {
  initAudio();
  if (gameState === 'PLAYING') ninny.jump();
});

startBtn.addEventListener('click', startGame);

// Renderização Inicial
drawBackground();