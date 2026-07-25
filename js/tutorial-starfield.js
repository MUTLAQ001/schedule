(function(){
  var canvas=document.getElementById('starfield-canvas');
  if(!canvas||document.body.classList.contains('high-performance'))return;
  var ctx=canvas.getContext('2d');
  var w,h;
  function setSize(){w=canvas.width=window.innerWidth;h=canvas.height=window.innerHeight}
  setSize();
  var resizeTimer=null;
  window.addEventListener('resize',function(){clearTimeout(resizeTimer);resizeTimer=setTimeout(setSize,200)});
  var isSmallScreen=window.innerWidth<1024;
  var lowEndDevice=(navigator.deviceMemory&&navigator.deviceMemory<=4)||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4);
  var stars=[],shootingStars=[],numStars=isSmallScreen?(lowEndDevice?18:26):(lowEndDevice?45:70),numShootingStars=isSmallScreen?0:1;
  var staticMode=isSmallScreen&&lowEndDevice;
  var frameInterval=1000/30,lastFrame=0;
  function Star(){this.reset()}
  Star.prototype.reset=function(){this.x=Math.random()*w;this.y=Math.random()*h;this.size=Math.random()*1.2+0.4;this.opacity=Math.random()*0.35+0.12;this.speedX=(Math.random()-0.5)*0.1;this.speedY=(Math.random()-0.5)*0.1};
  Star.prototype.draw=function(){ctx.beginPath();ctx.arc(this.x,this.y,this.size,0,Math.PI*2);ctx.fillStyle='rgba(214, 205, 255, '+this.opacity+')';ctx.fill()};
  Star.prototype.update=function(){this.x+=this.speedX;this.y+=this.speedY;if(this.x<0||this.x>w||this.y<0||this.y>h)this.reset()};
  function ShootingStar(){this.reset()}
  ShootingStar.prototype.reset=function(){this.x=Math.random()*w;this.y=0;this.len=Math.random()*80+10;this.speed=Math.random()*8+6;this.size=Math.random()*1+0.5;this.waitTime=new Date().getTime()+Math.random()*12000+6000;this.active=false};
  ShootingStar.prototype.update=function(){if(this.active){this.x-=this.speed;this.y+=this.speed;if(this.x<-this.len||this.y>h+this.len)this.reset()}else if(this.waitTime<new Date().getTime()){this.active=true}};
  ShootingStar.prototype.draw=function(){if(this.active){var grad=ctx.createLinearGradient(this.x,this.y,this.x+this.len,this.y-this.len);grad.addColorStop(0,'rgba(255, 255, 255, 0.8)');grad.addColorStop(1,'rgba(255, 255, 255, 0)');ctx.strokeStyle=grad;ctx.lineWidth=this.size;ctx.beginPath();ctx.moveTo(this.x,this.y);ctx.lineTo(this.x-this.len,this.y+this.len);ctx.stroke()}};
  for(var i=0;i<numStars;i++)stars.push(new Star());
  for(var j=0;j<numShootingStars;j++)shootingStars.push(new ShootingStar());
  var reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reducedMotion||staticMode){stars.forEach(function(s){s.draw()});return}
  function animate(ts){
    requestAnimationFrame(animate);
    if(document.hidden)return;
    if(ts-lastFrame<frameInterval)return;
    lastFrame=ts;
    ctx.clearRect(0,0,w,h);
    stars.forEach(function(s){s.update();s.draw()});
    shootingStars.forEach(function(s){s.update();s.draw()});
  }
  requestAnimationFrame(animate);
})();
