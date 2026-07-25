function initStarfield() {
  const canvas = document.getElementById('starfield-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h;
  function setSize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
  setSize();
  let starfieldResizeTimer = null;
  window.addEventListener('resize', () => { clearTimeout(starfieldResizeTimer); starfieldResizeTimer = setTimeout(() => { setSize(); if (typeof window.QU_syncStarfield === 'function') window.QU_syncStarfield(); }, 200); });
  const isSmallScreen = window.innerWidth < 1024;
  const lowEndDevice = (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  const stars = [], shootingStars = [], numStars = isSmallScreen ? (lowEndDevice ? 18 : 26) : (lowEndDevice ? 45 : 70), numShootingStars = isSmallScreen ? 0 : 1;
  const staticMode = isSmallScreen && lowEndDevice;
  const frameInterval = 1000 / 30;
  let lastFrame = 0;
  class Star {
    constructor() { this.reset(); }
    reset() { this.x = Math.random() * w; this.y = Math.random() * h; this.size = Math.random() * 1.2 + 0.4; this.opacity = Math.random() * 0.35 + 0.12; this.speedX = (Math.random() - 0.5) * 0.1; this.speedY = (Math.random() - 0.5) * 0.1; }
    draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fillStyle = `rgba(214, 205, 255, ${this.opacity})`; ctx.fill(); }
    update() { this.x += this.speedX; this.y += this.speedY; if (this.x < 0 || this.x > w || this.y < 0 || this.y > h) this.reset(); }
  }
  class ShootingStar {
    constructor() { this.reset(); }
    reset() { this.x = Math.random() * w; this.y = 0; this.len = Math.random() * 80 + 10; this.speed = Math.random() * 8 + 6; this.size = Math.random() * 1 + 0.5; this.waitTime = new Date().getTime() + Math.random() * 12000 + 6000; this.active = false; }
    update() { if (this.active) { this.x -= this.speed; this.y += this.speed; if (this.x < -this.len || this.y > h + this.len) this.reset(); } else if (this.waitTime < new Date().getTime()) { this.active = true; } }
    draw() { if (this.active) { const grad = ctx.createLinearGradient(this.x, this.y, this.x + this.len, this.y - this.len); grad.addColorStop(0, "rgba(255, 255, 255, 0.8)"); grad.addColorStop(1, "rgba(255, 255, 255, 0)"); ctx.strokeStyle = grad; ctx.lineWidth = this.size; ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x - this.len, this.y + this.len); ctx.stroke(); } }
  }
  for (let i = 0; i < numStars; i++) stars.push(new Star());
  for (let i = 0; i < numShootingStars; i++) shootingStars.push(new ShootingStar());
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let sfRAF = null;
  function animate(ts) {
    if (document.body.classList.contains('high-performance')) { sfRAF = null; return; }
    sfRAF = requestAnimationFrame(animate);
    if (document.hidden) return;
    if (ts - lastFrame < frameInterval) return;
    lastFrame = ts;
    ctx.clearRect(0, 0, w, h);
    stars.forEach(s => { s.update(); s.draw(); });
    shootingStars.forEach(s => { s.update(); s.draw(); });
  }
  window.QU_syncStarfield = function () {
    const off = document.body.classList.contains('high-performance') || reducedMotion || staticMode;
    if (off) { if (sfRAF) { cancelAnimationFrame(sfRAF); sfRAF = null; } ctx.clearRect(0, 0, w, h); if (!document.body.classList.contains('high-performance')) stars.forEach(s => s.draw()); return; }
    if (!sfRAF) sfRAF = requestAnimationFrame(animate);
  };
  window.QU_syncStarfield();
}
