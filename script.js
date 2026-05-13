// ===================================================================
//  WISHING STARS — Catch Shooting Stars & Unlock Magical Wishes
// ===================================================================

// ===== WISH MESSAGES =====
const wishes = [
    { emoji: '🌟', text: 'You light up every room you walk into.' },
    { emoji: '🦋', text: 'Your smile could outshine every star in this sky.' },
    { emoji: '💎', text: 'The universe made you once and then broke the mold.' },
    { emoji: '🌸', text: 'Everything beautiful reminds me of you.' },
    { emoji: '🎶', text: 'Even the stars whisper your name tonight.' },
    { emoji: '💙', text: 'You are the wish I never had to make — you just appeared.' }
];

let caughtCount = 0;
let shootingStars = [];
let catchEffects = []; // managed particle effects
let gameActive = false;
let gameCanvas, gameCtx;
let spawnTimer = null;
let animFrame = null;
let tapHandler = null; // track the event handler for cleanup

// ===== STARFIELD BACKGROUND =====
function initStarfield() {
    const canvas = document.getElementById('starfield');
    const ctx = canvas.getContext('2d');

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const stars = [];
    const count = Math.min(250, Math.floor(window.innerWidth * window.innerHeight / 4000));

    for (let i = 0; i < count; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 0.3,
            baseAlpha: Math.random() * 0.6 + 0.2,
            twinkleSpeed: Math.random() * 0.015 + 0.003,
            twinkleOffset: Math.random() * Math.PI * 2,
            color: ['#93c5fd', '#c4b5fd', '#fde68a', '#e0e7ff', '#bfdbfe', '#67e8f9'][Math.floor(Math.random() * 6)]
        });
    }

    function animate(time) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            const alpha = s.baseAlpha + Math.sin(time * s.twinkleSpeed + s.twinkleOffset) * 0.35;
            ctx.globalAlpha = Math.max(0.05, Math.min(1, alpha));
            ctx.fillStyle = s.color;
            ctx.fillRect(s.x - s.size * 0.5, s.y - s.size * 0.5, s.size, s.size); // squares are faster than arcs
        }
        ctx.globalAlpha = 1;
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
}

// ===== SHOOTING STAR CLASS =====
class ShootingStar {
    constructor(canvasW, canvasH) {
        // Spawn from multiple directions for variety
        const side = Math.random();
        if (side < 0.35) {
            // Top edge
            this.x = Math.random() * canvasW;
            this.y = -30;
        } else if (side < 0.65) {
            // Right edge
            this.x = canvasW + 30;
            this.y = Math.random() * canvasH * 0.6;
        } else if (side < 0.85) {
            // Left edge (new!)
            this.x = -30;
            this.y = Math.random() * canvasH * 0.4;
        } else {
            // Top-right corner
            this.x = canvasW * 0.6 + Math.random() * canvasW * 0.4;
            this.y = -30;
        }

        // More varied directions
        let angle;
        if (this.x < canvasW * 0.5) {
            // Coming from left → angle toward center-right
            angle = Math.PI * (0.15 + Math.random() * 0.3);
        } else {
            // Coming from right → angle toward center-left
            angle = Math.PI * (0.55 + Math.random() * 0.35);
        }

        const speed = 1.5 + Math.random() * 1.5; // slower = easier to catch
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        this.size = 5 + Math.random() * 4; // bigger stars
        this.life = 1.0;
        this.decay = 0.002 + Math.random() * 0.003; // longer lifespan
        this.tail = [];
        this.tailMax = 25 + Math.floor(Math.random() * 20);
        this.caught = false;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.color = ['#93c5fd', '#fbbf24', '#c4b5fd', '#67e8f9', '#a5f3fc'][Math.floor(Math.random() * 5)];
    }

    update() {
        this.tail.push({ x: this.x, y: this.y });
        if (this.tail.length > this.tailMax) this.tail.shift();

        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        this.pulsePhase += 0.1;
    }

    draw(ctx) {
        const pulse = 1 + Math.sin(this.pulsePhase) * 0.15;

        // Draw tail with gradient
        if (this.tail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.tail[0].x, this.tail[0].y);
            for (let i = 1; i < this.tail.length; i++) {
                ctx.lineTo(this.tail[i].x, this.tail[i].y);
            }
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.size * 0.8;
            ctx.lineCap = 'round';
            ctx.globalAlpha = this.life * 0.15;
            ctx.stroke();

            // Thinner bright core line
            ctx.beginPath();
            ctx.moveTo(this.tail[Math.floor(this.tail.length * 0.5)].x, this.tail[Math.floor(this.tail.length * 0.5)].y);
            for (let i = Math.floor(this.tail.length * 0.5); i < this.tail.length; i++) {
                ctx.lineTo(this.tail[i].x, this.tail[i].y);
            }
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = this.size * 0.3;
            ctx.globalAlpha = this.life * 0.4;
            ctx.stroke();
        }

        // Draw outer glow
        const glowSize = this.size * 4 * pulse;
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowSize);
        grad.addColorStop(0, this.color);
        grad.addColorStop(0.3, this.color + '60');
        grad.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.globalAlpha = this.life * 0.8;
        ctx.fill();

        // Draw bright white core
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * pulse, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = this.life;
        ctx.fill();

        // Smaller inner dot for extra brightness
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.4 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = Math.min(1, this.life * 1.3);
        ctx.fill();

        ctx.globalAlpha = 1;
    }

    isAlive() {
        return this.life > 0 && !this.caught;
    }

    hitTest(px, py) {
        const dx = this.x - px;
        const dy = this.y - py;
        const hitRadius = Math.max(this.size * 6, 45); // very generous for mobile
        return Math.sqrt(dx * dx + dy * dy) < hitRadius;
    }
}

// ===== CATCH EXPLOSION (integrated into main loop) =====
function createCatchEffect(x, y) {
    const colors = ['#93c5fd', '#fbbf24', '#c4b5fd', '#e0e7ff', '#67e8f9', '#fff', '#a5f3fc'];
    const effect = {
        particles: [],
        ringRadius: 0,
        ringAlpha: 1,
        x, y
    };

    for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 7 + 2;
        effect.particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1,
            size: Math.random() * 4 + 1.5,
            life: 1,
            decay: 0.015 + Math.random() * 0.02,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }

    catchEffects.push(effect);
}

function updateAndDrawCatchEffects(ctx) {
    for (let e = catchEffects.length - 1; e >= 0; e--) {
        const effect = catchEffects[e];
        let alive = false;

        // Expanding ring
        effect.ringRadius += 4;
        effect.ringAlpha -= 0.025;
        if (effect.ringAlpha > 0) {
            alive = true;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, effect.ringRadius, 0, Math.PI * 2);
            ctx.strokeStyle = '#93c5fd';
            ctx.lineWidth = 2;
            ctx.globalAlpha = effect.ringAlpha;
            ctx.stroke();
        }

        // Particles
        for (let i = 0; i < effect.particles.length; i++) {
            const p = effect.particles[i];
            if (p.life <= 0) continue;
            alive = true;

            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // gravity
            p.vx *= 0.99; // friction
            p.life -= p.decay;

            const radius = Math.max(0, p.size * p.life);
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.life * 0.9);
            ctx.fill();
        }

        ctx.globalAlpha = 1;

        if (!alive) {
            catchEffects.splice(e, 1);
        }
    }
}

// ===== GAME LOOP =====
function startGameLoop() {
    gameCanvas = document.getElementById('game-canvas');
    gameCtx = gameCanvas.getContext('2d');

    function resize() {
        gameCanvas.width = window.innerWidth;
        gameCanvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    gameActive = true;
    shootingStars = [];
    catchEffects = [];

    // Spawn shooting stars periodically
    function scheduleSpawn() {
        if (!gameActive) return;
        if (shootingStars.length < 4) {
            shootingStars.push(new ShootingStar(gameCanvas.width, gameCanvas.height));
        }
        spawnTimer = setTimeout(scheduleSpawn, 800 + Math.random() * 1200);
    }
    scheduleSpawn();

    // Spawn two stars immediately so user sees something right away
    shootingStars.push(new ShootingStar(gameCanvas.width, gameCanvas.height));
    setTimeout(() => {
        if (gameActive) shootingStars.push(new ShootingStar(gameCanvas.width, gameCanvas.height));
    }, 400);

    // Handle click/touch on canvas — clean up old handlers first
    if (tapHandler) {
        gameCanvas.removeEventListener('click', tapHandler);
        gameCanvas.removeEventListener('touchstart', tapHandler);
    }

    tapHandler = function handleTap(e) {
        if (!gameActive) return;

        let px, py;
        if (e.type === 'touchstart') {
            e.preventDefault();
            px = e.touches[0].clientX;
            py = e.touches[0].clientY;
        } else {
            px = e.clientX;
            py = e.clientY;
        }

        // Visual tap ripple feedback
        spawnTapRipple(px, py);

        for (let i = shootingStars.length - 1; i >= 0; i--) {
            const star = shootingStars[i];
            if (star.hitTest(px, py) && star.isAlive()) {
                star.caught = true;
                createCatchEffect(star.x, star.y);
                onStarCaught();
                break;
            }
        }
    };

    gameCanvas.addEventListener('click', tapHandler);
    gameCanvas.addEventListener('touchstart', tapHandler, { passive: false });

    // Show hint, fade it out after first catch
    const hint = document.getElementById('game-hint');
    if (hint) {
        hint.style.opacity = '';
        hint.style.transition = '';
    }

    // Main animation loop
    function mainLoop() {
        if (!gameActive) {
            animFrame = requestAnimationFrame(mainLoop); // keep checking
            // Still draw effects even when paused (popup showing)
            gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
            updateAndDrawCatchEffects(gameCtx);
            updateAndDrawTapRipples(gameCtx);
            return;
        }

        gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

        // Update & draw shooting stars
        shootingStars = shootingStars.filter(s => s.isAlive());
        for (let i = 0; i < shootingStars.length; i++) {
            shootingStars[i].update();
            shootingStars[i].draw(gameCtx);
        }

        // Draw catch effects (integrated, no separate rAF)
        updateAndDrawCatchEffects(gameCtx);

        // Draw tap ripples
        updateAndDrawTapRipples(gameCtx);

        // Auto-spawn if running low
        if (shootingStars.length < 2) {
            shootingStars.push(new ShootingStar(gameCanvas.width, gameCanvas.height));
        }

        animFrame = requestAnimationFrame(mainLoop);
    }
    mainLoop();
}

// ===== TAP RIPPLE FEEDBACK =====
let tapRipples = [];

function spawnTapRipple(x, y) {
    tapRipples.push({ x, y, radius: 0, alpha: 0.6 });
}

function updateAndDrawTapRipples(ctx) {
    for (let i = tapRipples.length - 1; i >= 0; i--) {
        const r = tapRipples[i];
        r.radius += 3;
        r.alpha -= 0.02;

        if (r.alpha <= 0) {
            tapRipples.splice(i, 1);
            continue;
        }

        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = r.alpha;
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
}

// ===== ON STAR CAUGHT =====
function onStarCaught() {
    if (caughtCount >= wishes.length) return;

    const wish = wishes[caughtCount];
    caughtCount++;

    // Update HUD counter
    document.getElementById('wish-count').textContent = caughtCount;

    // Update progress bar
    const progress = document.getElementById('progress-fill');
    if (progress) {
        progress.style.width = `${(caughtCount / wishes.length) * 100}%`;
    }

    // Jar pulse
    const jar = document.querySelector('.jar-icon');
    jar.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
    jar.style.transform = 'scale(1.5)';
    setTimeout(() => { jar.style.transform = ''; }, 400);

    // Fade out hint after first catch
    if (caughtCount === 1) {
        const hint = document.getElementById('game-hint');
        if (hint) {
            hint.style.transition = 'opacity 0.5s';
            hint.style.opacity = '0';
        }
    }

    // Show wish popup
    const popup = document.getElementById('wish-popup');
    const text = document.getElementById('popup-wish-text');
    const starEl = document.querySelector('.popup-star');
    text.textContent = `${wish.emoji} ${wish.text}`;
    if (starEl) {
        starEl.style.animation = 'none';
        void starEl.offsetWidth; // force reflow
        starEl.style.animation = '';
    }
    popup.classList.add('show');

    // Pause game while popup is showing
    gameActive = false;
}

function closeWishPopup() {
    const popup = document.getElementById('wish-popup');
    popup.classList.remove('show');

    if (caughtCount >= wishes.length) {
        // All wishes caught!
        setTimeout(showRevealScreen, 600);
    } else {
        // Resume game
        gameActive = true;
        // Ensure we have stars to catch
        if (shootingStars.length < 2) {
            shootingStars.push(new ShootingStar(gameCanvas.width, gameCanvas.height));
        }
    }
}

// ===== REVEAL SCREEN =====
function showRevealScreen() {
    gameActive = false;
    if (spawnTimer) clearTimeout(spawnTimer);
    if (animFrame) cancelAnimationFrame(animFrame);

    switchScreen('reveal-screen');
    launchHeartConfetti();
    spawnFloatingStars();
}

function launchHeartConfetti() {
    const canvas = document.getElementById('heart-canvas');
    const ctx = canvas.getContext('2d');
    
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    let pieces = [];
    const emojis = ['⭐', '✨', '💙', '💫', '🌟', '🦋', '💎', '🌸', '💖'];

    function addBurst(count, isInitial = false) {
        for (let i = 0; i < count; i++) {
            pieces.push({
                x: Math.random() * canvas.width,
                y: isInitial ? (Math.random() * -canvas.height) : -50,
                vy: 0.8 + Math.random() * 2.2,
                vx: (Math.random() - 0.5) * 1.5,
                sway: Math.random() * Math.PI * 2,
                swaySpeed: 0.02 + Math.random() * 0.04,
                swayAmplitude: 0.5 + Math.random() * 1.5,
                emoji: emojis[Math.floor(Math.random() * emojis.length)],
                size: 14 + Math.random() * 20,
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 3,
                alpha: 1,
                decay: 0.0004 + Math.random() * 0.0008
            });
        }
    }

    addBurst(60, true);

    function animate() {
        if (pieces.length === 0 && bursts >= 5) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let i = pieces.length - 1; i >= 0; i--) {
            const p = pieces[i];
            
            p.sway += p.swaySpeed;
            p.x += p.vx + Math.sin(p.sway) * p.swayAmplitude;
            p.y += p.vy;
            p.rotation += p.rotSpeed;
            p.alpha -= p.decay;

            if (p.alpha <= 0 || p.y > canvas.height + 50) {
                pieces.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.font = `${p.size}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.emoji, 0, 0);
            ctx.restore();
        }

        ctx.globalAlpha = 1;
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    let bursts = 0;
    const bi = setInterval(() => {
        bursts++;
        if (bursts >= 8) { clearInterval(bi); return; }
        addBurst(25);
    }, 1800);

    window._confettiBurstInterval = bi;
}

function spawnFloatingStars() {
    const emojis = ['✨', '⭐', '💫', '🌟', '💙', '🌸', '✨'];
    const interval = setInterval(() => {
        const el = document.createElement('div');
        el.className = 'floating-emoji';
        
        // Randomize properties for a more organic feel
        const duration = 5 + Math.random() * 4;
        const left = Math.random() * 100;
        const size = 0.8 + Math.random() * 1.5;
        const delay = Math.random() * 2;
        
        el.style.left = `${left}vw`;
        el.style.fontSize = `${size}rem`;
        el.style.animationDuration = `${duration}s`;
        el.style.animationDelay = `${delay}s`;
        el.style.filter = `blur(${Math.random() > 0.8 ? '1px' : '0'})`;
        
        el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        document.body.appendChild(el);
        
        // Cleanup
        setTimeout(() => el.remove(), (duration + delay) * 1000);
    }, 450);

    window._floatInterval = interval;
}

// ===== SCREEN MANAGEMENT =====
function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function startGame() {
    caughtCount = 0;
    document.getElementById('wish-count').textContent = '0';
    document.getElementById('wish-total').textContent = wishes.length;
    const progress = document.getElementById('progress-fill');
    if (progress) progress.style.width = '0%';
    switchScreen('game-screen');
    startGameLoop();
}

function restartGame() {
    // Full cleanup
    gameActive = false;
    if (spawnTimer) clearTimeout(spawnTimer);
    if (animFrame) cancelAnimationFrame(animFrame);
    if (window._floatInterval) clearInterval(window._floatInterval);
    if (window._confettiBurstInterval) clearInterval(window._confettiBurstInterval);
    document.querySelectorAll('.floating-emoji').forEach(el => el.remove());

    // Clean canvas
    const hc = document.getElementById('heart-canvas');
    if (hc) {
        const ctx = hc.getContext('2d');
        ctx.clearRect(0, 0, hc.width, hc.height);
    }

    // Remove old tap handler
    if (gameCanvas && tapHandler) {
        gameCanvas.removeEventListener('click', tapHandler);
        gameCanvas.removeEventListener('touchstart', tapHandler);
        tapHandler = null;
    }

    caughtCount = 0;
    shootingStars = [];
    catchEffects = [];
    tapRipples = [];
    switchScreen('intro-screen');
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    initStarfield();
});
