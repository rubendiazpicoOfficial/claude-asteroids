'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

// Formas fijas (vértices normalizados, radio máximo 1) para asteroides grandes (tamaño 3)
const LARGE_ASTEROID_SHAPES = [
  [
    [-0.058, -0.943], [0.515, -0.752], [0.447, -0.193], [0.979, -0.050],
    [0.740, 0.543], [0.351, 0.482], [0.106, 0.953], [-0.297, 0.666],
    [-0.638, 0.598], [-0.999, 0.045], [-0.795, -0.548], [-0.351, -0.800],
  ],
];

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    if (size === 3) {
      // Forma fija elegida al azar entre las variaciones de asteroide grande
      const shape = LARGE_ASTEROID_SHAPES[randInt(0, LARGE_ASTEROID_SHAPES.length - 1)];
      this.verts = shape.map(([x, y]) => [x * this.radius, y * this.radius]);
    } else {
      // Polígono irregular
      const n = randInt(8, 13);
      this.verts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = this.radius * rand(0.6, 1.0);
        this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot(triple = false) {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (triple) {
      const SPREAD = 0.22;
      return [
        new Bullet(ox, oy, this.angle - SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo( 20,  0);   // nariz
    ctx.lineTo(-12, -9);   // ala izquierda
    ctx.lineTo( -7,  0);   // muesca trasera
    ctx.lineTo(-12,  9);   // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = 'rgba(255, 130, 0, 0.85)';
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-up: DisparoTriple / Escudo / SlowMotion / BombaNova ────────────────
class PowerUp {
  constructor(x, y, type = 'triple') {
    this.x = x;
    this.y = y;
    this.type = type;   // 'triple' | 'shield' | 'slow' | 'nova'
    this.radius = 12;
    this.ttl   = 12;   // segundos en pantalla antes de desaparecer si no se recoge
    this.pulse = 0;
    this.dead  = false;
  }

  update(dt) {
    this.pulse += dt;
    this.ttl   -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadeo en los últimos segundos, igual que la invencibilidad de la nave
    if (this.ttl < 3 && Math.floor(this.ttl * 8) % 2 === 0) return;

    const color = this.type === 'shield' ? '#4ade80'
                : this.type === 'slow'   ? '#a78bfa'
                : this.type === 'nova'   ? '#fbbf24'
                : '#0ff';
    const fill  = this.type === 'shield' ? 'rgba(74, 222, 128, 0.15)'
                : this.type === 'slow'   ? 'rgba(167, 139, 250, 0.15)'
                : this.type === 'nova'   ? 'rgba(251, 191, 36, 0.15)'
                : 'rgba(0, 255, 255, 0.15)';

    const scale = 1 + Math.sin(this.pulse * 4) * 0.12;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = color;
    ctx.fillStyle   = fill;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    if (this.type === 'shield') {
      // Anillo concéntrico como icono de Escudo
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.type === 'slow') {
      // Reloj con manecillas como icono de SlowMotion
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -this.radius * 0.4);
      ctx.moveTo(0, 0);
      ctx.lineTo(this.radius * 0.3, this.radius * 0.15);
      ctx.stroke();
    } else if (this.type === 'nova') {
      // Estallido radial como icono de BombaNova
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * this.radius * 0.25, Math.sin(a) * this.radius * 0.25);
        ctx.lineTo(Math.cos(a) * this.radius * 0.75, Math.sin(a) * this.radius * 0.75);
        ctx.stroke();
      }
    } else {
      // Tres pequeñas flechas en abanico como icono de DisparoTriple
      [-0.3, 0, 0.3].forEach(offset => {
        ctx.save();
        ctx.rotate(-Math.PI / 2 + offset);
        ctx.beginPath();
        ctx.moveTo(0, 6);
        ctx.lineTo(0, -6);
        ctx.moveTo(-3, -2);
        ctx.lineTo(0, -6);
        ctx.lineTo(3, -2);
        ctx.stroke();
        ctx.restore();
      });
    }

    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let tripleTimer;    // segundos restantes de DisparoTriple activo (0 = inactivo)
let tripleSpawned;  // si ya apareció un DisparoTriple en este nivel
let shieldTimer;    // segundos restantes de Escudo activo (0 = inactivo)
let shieldSpawned;  // si ya apareció un Escudo en este nivel
let slowTimer;      // segundos restantes de SlowMotion activo (0 = inactivo)
let slowSpawned;    // si ya apareció un SlowMotion en este nivel
let novaReady;       // si el jugador tiene una BombaNova cargada lista para detonar
let novaSpawned;     // si ya apareció una BombaNova en este nivel

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  tripleTimer   = 0;
  tripleSpawned = false;
  shieldTimer   = 0;
  shieldSpawned = false;
  slowTimer     = 0;
  slowSpawned   = false;
  novaReady     = false;
  novaSpawned   = false;
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUps  = [];
  tripleSpawned = false;
  shieldSpawned = false;
  slowSpawned   = false;
  novaSpawned   = false;
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // DisparoTriple / Escudo / SlowMotion: cuenta atrás de los efectos activos
  if (tripleTimer > 0) tripleTimer = Math.max(0, tripleTimer - dt);
  if (shieldTimer > 0) shieldTimer = Math.max(0, shieldTimer - dt);
  if (slowTimer   > 0) slowTimer   = Math.max(0, slowTimer   - dt);

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot(tripleTimer > 0));
  }

  // BombaNova: detonación manual, destruye todos los asteroides visibles
  if (novaReady && pressed('KeyB')) {
    novaReady = false;
    for (const a of asteroids) {
      score += POINTS[a.size];
      explode(a.x, a.y, a.size * 5);
    }
    asteroids = [];
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  const astDt = slowTimer > 0 ? dt * 0.5 : dt;
  asteroids.forEach(a => a.update(astDt));
  particles.forEach(p => p.update(dt));
  powerUps.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerUps  = powerUps.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  const DROP_CHANCE = 0.25;
  const SHIELD_DROP_CHANCE = 0.18;
  const SLOW_DROP_CHANCE = 0.15;
  const NOVA_DROP_CHANCE = 0.06;
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
        if (!tripleSpawned && Math.random() < DROP_CHANCE) {
          powerUps.push(new PowerUp(a.x, a.y, 'triple'));
          tripleSpawned = true;
        } else if (!shieldSpawned && Math.random() < SHIELD_DROP_CHANCE) {
          powerUps.push(new PowerUp(a.x, a.y, 'shield'));
          shieldSpawned = true;
        } else if (!slowSpawned && Math.random() < SLOW_DROP_CHANCE) {
          powerUps.push(new PowerUp(a.x, a.y, 'slow'));
          slowSpawned = true;
        } else if (!novaSpawned && Math.random() < NOVA_DROP_CHANCE) {
          powerUps.push(new PowerUp(a.x, a.y, 'nova'));
          novaSpawned = true;
        }
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs power-up
  const SHIELD_DURATION = 5;
  const SLOW_DURATION   = 6;
  for (const p of powerUps) {
    if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      if (p.type === 'shield') shieldTimer = SHIELD_DURATION;
      else if (p.type === 'slow') slowTimer = SLOW_DURATION;
      else if (p.type === 'nova') novaReady = true;
      else tripleTimer = 5;
    }
  }
  powerUps = powerUps.filter(p => !p.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (shieldTimer > 0) {
          // El escudo absorbe el impacto: destruye el asteroide en vez de matar a la nave
          shieldTimer = 0;
          ship.invincible = 1;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          asteroids = asteroids.filter(x => !x.dead).concat(a.split());
        } else {
          killShip();
        }
        break;
      }
    }
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  let effectY = 48;
  if (tripleTimer > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0ff';
    ctx.fillText(`TRIPLE  ${Math.ceil(tripleTimer)}s`, 14, effectY);
    effectY += 20;
  }

  if (shieldTimer > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4ade80';
    ctx.fillText(`ESCUDO  ${Math.ceil(shieldTimer)}s`, 14, effectY);
    effectY += 20;
  }

  if (slowTimer > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#a78bfa';
    ctx.fillText(`LENTO  ${Math.ceil(slowTimer)}s`, 14, effectY);
    effectY += 20;
  }

  if (novaReady) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`NOVA  [B]`, 14, effectY);
  }
}

function drawShield() {
  if (shieldTimer <= 0 || ship.dead) return;
  if (shieldTimer < 1 && Math.floor(shieldTimer * 8) % 2 === 0) return;

  const pulse = 1 + Math.sin(performance.now() / 200) * 0.05;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.scale(pulse, pulse);
  ctx.strokeStyle = 'rgba(74, 222, 128, 0.85)';
  ctx.fillStyle   = 'rgba(74, 222, 128, 0.12)';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, ship.radius + 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  powerUps.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();
  drawShield();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
