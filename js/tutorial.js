(function(){
  var $=function(s,c){return (c||document).querySelector(s)};
  var $$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};
  function toAr(n){return String(n).replace(/[0-9]/g,function(d){return '٠١٢٣٤٥٦٧٨٩'[d]})}
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var BOOKMARKLET = "javascript:!function(){var e=document.createElement('script');e.src='https://mutlaq001.github.io/schedule/extractor.js?v='+Date.now(),document.head.appendChild(e)}();";

  function legacyCopy(text){
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly','');
    ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    var ok = false;
    try { ok = document.execCommand('copy') } catch(e){}
    document.body.removeChild(ta);
    return ok;
  }

  function copyCode(){
    if(navigator.clipboard && navigator.clipboard.writeText){
      return navigator.clipboard.writeText(BOOKMARKLET).then(function(){return true}).catch(function(){return legacyCopy(BOOKMARKLET)});
    }
    return Promise.resolve(legacyCopy(BOOKMARKLET));
  }

  function markCopied(chip, ok){
    chip.classList.toggle('failed', !ok);
    chip.innerHTML = ok
      ? '<i class="ph-fill ph-check-circle"></i> تم نسخ الكود فعلياً — صار جاهزاً في الحافظة'
      : '<i class="ph-fill ph-warning-circle"></i> تعذّر النسخ تلقائياً — انسخ الكود من الصفحة الأساسية';
    chip.classList.add('show');
  }

  var device = null;
  var STAGES = {
    's-intro':      {p:2,  label:'مرحباً بك'},
    's-copy-mobile':{p:16, label:'الخطوة ١ · نسخ الرابط'},
    's-copy-tablet':{p:16, label:'الخطوة ١ · نسخ الكود'},
    's-copy-desktop':{p:16,label:'الخطوة ١ · سحب الزر'},
    's-uni':        {p:38, label:'الخطوة ٢ · المقررات المطروحة'},
    's-bar':        {p:58, label:'الخطوة ٣ · شريط العنوان'},
    's-extract':    {p:74, label:'تشغيل الأداة…'},
    's-app':        {p:90, label:'الخطوة ٤ · جدولك'},
    's-done':       {p:100,label:'اكتمل الشرح 🎉'}
  };
  function goTo(id){
    coach.end(true);
    $$('.stage').forEach(function(s){s.classList.remove('active')});
    $('#'+id).classList.add('active');
    window.scrollTo({top:0, behavior: reduceMotion?'auto':'smooth'});
    var st = STAGES[id];
    $('#p-fill').style.width = st.p+'%';
    $('#p-label').textContent = st.label;
    if(id==='s-uni'){ preloadUniShot(); applyUniShot(); setTimeout(startUniTour, 550); }
    if(id==='s-bar') setTimeout(startBarTour, 550);
    if(id==='s-extract') runExtract();
    if(id==='s-app') setTimeout(startAppTour, 600);
    if(id==='s-done') confetti();
  }

  var coach = {
    steps:[], i:0, on:false, onEnd:null, target:null, waitEl:null,
    el:{root:$('#coach'), ring:$('#coach-ring'), tip:$('#coach-tip'), step:$('#ct-step'), title:$('#ct-title'), body:$('#ct-body'), dots:$('#ct-dots'), prev:$('#ct-prev'), next:$('#ct-next'), wait:$('#ct-wait')},
    start:function(steps,onEnd){
      this.steps=steps; this.onEnd=onEnd||null; this.i=0; this.on=true;
      this.el.root.classList.add('on');
      document.body.classList.add('coach-on');
      this.el.dots.innerHTML = steps.map(function(){return '<span></span>'}).join('');
      this.show(0);
    },
    show:function(i){
      var self=this;
      this.i=i;
      var s=this.steps[i];
      this.clearPulse();
      if(s.before) s.before();
      this.el.step.textContent = toAr(i+1)+' / '+toAr(this.steps.length);
      this.el.title.innerHTML = (s.icon?'<i class="ph '+s.icon+'"></i>':'')+s.title;
      this.el.body.innerHTML = s.body;
      $$('span',this.el.dots).forEach(function(d,j){d.classList.toggle('on', j===i)});
      this.el.prev.style.display = i===0 ? 'none' : '';
      var waiting = !!s.wait;
      this.el.next.hidden = waiting;
      this.el.wait.hidden = !waiting;
      this.el.next.textContent = s.nextLabel || (i===this.steps.length-1 ? 'إنهاء' : 'التالي');
      this.target = s.el ? $(s.el) : null;
      this.waitEl = waiting ? $(s.wait) : null;
      if(this.waitEl) this.waitEl.classList.add('pulse-target');
      if(this.target){
        this.scrollToTarget();
        setTimeout(function(){ self.position() }, reduceMotion?30:430);
      } else {
        this.position();
      }
    },
    scrollToTarget:function(){
      var t=this.target; if(!t) return;
      var r=t.getBoundingClientRect();
      var reserve = window.innerWidth<=640 ? (this.el.tip.offsetHeight + 30) : 0;
      var avail = window.innerHeight - reserve;
      var desiredTop = (r.height >= avail-24) ? 12 : Math.max(12, (avail - r.height)/2);
      var delta = r.top - desiredTop;
      if(Math.abs(delta) < 2) return;
      window.scrollBy({top:delta, left:0, behavior: reduceMotion?'auto':'smooth'});
    },
    position:function(){
      if(!this.on) return;
      var ring=this.el.ring, tip=this.el.tip;
      var vw=window.innerWidth, vh=window.innerHeight;
      if(this.target){
        var r=this.target.getBoundingClientRect();
        ring.classList.remove('hide');
        ring.style.top=(r.top-6)+'px'; ring.style.left=(r.left-6)+'px';
        ring.style.width=(r.width+12)+'px'; ring.style.height=(r.height+12)+'px';
        if(vw>640){
          var pr={top:r.top, bottom:r.bottom, left:r.left, right:r.right};
          if(this.waitEl){
            var wr=this.waitEl.getBoundingClientRect();
            if(wr.width>0 && wr.height>0){
              pr.top=Math.min(pr.top,wr.top); pr.bottom=Math.max(pr.bottom,wr.bottom);
              pr.left=Math.min(pr.left,wr.left); pr.right=Math.max(pr.right,wr.right);
            }
          }
          var th=tip.offsetHeight, tw=tip.offsetWidth;
          var top = (pr.bottom+14+th < vh-10) ? pr.bottom+14 : Math.max(10, pr.top-14-th);
          var left = Math.min(Math.max(12, (pr.left+pr.right)/2 - tw/2), vw-tw-12);
          tip.style.top=top+'px'; tip.style.left=left+'px'; tip.style.transform='none';
        }
      } else {
        ring.classList.add('hide');
        ring.style.top='50%'; ring.style.left='50%'; ring.style.width='0px'; ring.style.height='0px';
        if(vw>640){
          var tw2=tip.offsetWidth, th2=tip.offsetHeight;
          tip.style.top=(vh/2-th2/2)+'px'; tip.style.left=(vw/2-tw2/2)+'px'; tip.style.transform='none';
        }
      }
    },
    clearPulse:function(){ $$('.pulse-target').forEach(function(e){e.classList.remove('pulse-target')}) },
    next:function(){
      if(!this.on) return;
      if(this.i>=this.steps.length-1){ this.end(); return }
      this.show(this.i+1);
    },
    prev:function(){ if(this.i>0) this.show(this.i-1) },
    end:function(silent){
      if(!this.on) return;
      var cb=this.onEnd;
      this.on=false; this.onEnd=null; this.waitEl=null; this.clearPulse();
      this.el.root.classList.remove('on');
      document.body.classList.remove('coach-on');
      if(!silent && cb) cb();
    }
  };
  coach.el.next.addEventListener('click', function(){ coach.next() });
  coach.el.prev.addEventListener('click', function(){ coach.prev() });
  window.addEventListener('keydown', function(e){
    if((e.key!=='Enter' && e.key!=='NumpadEnter') || e.repeat || !coach.on) return;
    var t=e.target;
    if(t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    e.preventDefault();
    if(!coach.el.next.hidden){ coach.el.next.click(); return }
    var w=coach.waitEl;
    if(w && !w.disabled && !w.hidden){
      var wr=w.getBoundingClientRect();
      if(wr.width>0 && wr.height>0) w.click();
    }
  });
  window.addEventListener('resize', function(){ coach.position() });
  window.addEventListener('scroll', function(){ coach.position() }, true);

  var isTouch = window.matchMedia('(pointer:coarse)').matches || ('ontouchstart' in window) || window.innerWidth < 760;
  var minSide = Math.min(window.innerWidth, window.innerHeight);
  var suggestCard = !isTouch ? $('#pick-desktop') : (minSide >= 600 ? $('#pick-tablet') : $('#pick-mobile'));
  suggestCard.classList.add('suggested');
  $('.d-tag', suggestCard).hidden = false;

  function devWord(){ return device==='tablet' ? 'جهازك اللوحي' : 'جوالك' }
  function pick(d, stage){
    device=d;
    $('#bar-lead').innerHTML = 'وأنت داخل صفحة المقررات المطروحة، اضغط على شريط البحث فوق والصق الرابط. هنا محاكاة مطابقة لمتصفح '+devWord()+' — <b>جرّبها بنفسك</b>:';
    preloadUniShot();
    goTo(stage);
  }
  $('#pick-mobile').addEventListener('click', function(){ pick('mobile','s-copy-mobile') });
  $('#pick-tablet').addEventListener('click', function(){ pick('tablet','s-copy-tablet') });
  $('#pick-desktop').addEventListener('click', function(){ pick('desktop','s-copy-desktop') });
  $('#back-copy-m').addEventListener('click', function(){ goTo('s-intro') });
  $('#back-copy-t').addEventListener('click', function(){ goTo('s-intro') });
  $('#back-copy-d').addEventListener('click', function(){ goTo('s-intro') });

  $('#copy-btn-t').addEventListener('click', function(){
    var btn=this;
    btn.classList.add('done');
    $('#next-copy-t').disabled=false;
    copyCode().then(function(ok){ markCopied($('#copied-t'), ok) });
  });
  $('#next-copy-t').addEventListener('click', function(){ goTo('s-uni') });
  $('#replay-btn').addEventListener('click', function(){ location.reload() });

  var pressTimer=null, fakeLink=$('#fake-link-m');
  $('#copy-btn-m').addEventListener('click', function(){
    fakeLink.classList.add('pressing');
    clearTimeout(pressTimer);
    var copied=copyCode();
    pressTimer=setTimeout(function(){
      fakeLink.classList.remove('pressing');
      $('#next-copy-m').disabled=false;
      copied.then(function(ok){ markCopied($('#copied-m'), ok) });
    }, reduceMotion?50:900);
  });
  $('#next-copy-m').addEventListener('click', function(){ goTo('s-uni') });

  (function(){
    var bm=$('#bookmarklet'), ghost=$('#drag-ghost'), zone=$('#dz-bookmarks'), dropped=false;
    function overZone(x,y){
      var r=zone.getBoundingClientRect();
      return x>=r.left && x<=r.right && y>=r.top-14 && y<=r.bottom+14;
    }
    bm.addEventListener('pointerdown', function(e){
      if(dropped) return;
      e.preventDefault();
      bm.setPointerCapture(e.pointerId);
      bm.classList.add('dragging');
      ghost.style.display='inline-flex';
      move(e);
    });
    function move(e){
      ghost.style.left=e.clientX+'px'; ghost.style.top=e.clientY+'px';
      zone.classList.toggle('armed', overZone(e.clientX,e.clientY));
    }
    bm.addEventListener('pointermove', function(e){ if(bm.classList.contains('dragging')) move(e) });
    bm.addEventListener('pointerup', function(e){
      if(!bm.classList.contains('dragging')) return;
      bm.classList.remove('dragging');
      ghost.style.display='none';
      if(overZone(e.clientX,e.clientY) && !dropped){
        dropped=true;
        zone.classList.remove('armed');
        $('#bm-slot').innerHTML=' <span class="bm-chip"><i class="ph ph-magic-wand"></i> QU Schedule</span>';
        $('#drag-hint').innerHTML='<i class="ph-fill ph-check-circle" style="color:var(--color-success)"></i> ممتاز! صار الزر محفوظاً في الشريط، وجاهزاً للاستخدام من أي صفحة';
        $('#next-copy-d').disabled=false;
      } else {
        zone.classList.remove('armed');
      }
    });
  })();
  $('#next-copy-d').addEventListener('click', function(){ goTo('s-uni') });

  var UNI = [
    {code:'QU 101',name:'المقرر ١',sec:'1833',act:'نظري',hrs:'3',open:1,meet:[['الأحد ١٢:٤٠ م – ٠٢:٢٠ م','فصل دراسي']],exam:'٣٥'},
    {code:'QU 101',name:'المقرر ١',sec:'1835',act:'تدريب',hrs:'',open:1,meet:[['الأربعاء ١٢:٤٠ م – ٠٢:٢٠ م','فصل دراسي']],exam:''},
    {code:'QU 101',name:'المقرر ١',sec:'1834',act:'نظري',hrs:'3',open:1,meet:[['الأحد ١٢:٤٠ م – ٠٢:٢٠ م','']],exam:'٣٥'},
    {code:'QU 101',name:'المقرر ١',sec:'1836',act:'تدريب',hrs:'',open:1,meet:[['الأربعاء ١٢:٤٠ م – ٠٢:٢٠ م','']],exam:''},
    {code:'QU 103',name:'المقرر ٣',sec:'2307',act:'نظري',hrs:'2',open:1,meet:[['الثلاثاء ٠٢:٤٠ م – ٠٤:٢٠ م','B.1-G225']],exam:'٥٥'},
    {code:'QU 103',name:'المقرر ٣',sec:'135',act:'نظري',hrs:'2',open:0,meet:[['الثلاثاء ٠٨:٠٠ ص – ٠٩:٤٠ ص','C1-L2-R-2041']],exam:'٥٥'},
    {code:'QU 103',name:'المقرر ٣',sec:'2309',act:'نظري',hrs:'2',open:0,meet:[['الثلاثاء ١٢:٣٥ م – ٠١:٢٥ م','القاعة ١١٩'],['الثلاثاء ٠١:٣٠ م – ٠٢:٢٠ م','القاعة ١١٩']],exam:'٥٥'},
    {code:'QU 104',name:'المقرر ٤',sec:'748',act:'نظري',hrs:'2',open:1,meet:[['الأحد ٠٨:٠٠ ص – ٠٩:٤٠ ص','٥١٧٩ كلية اللغات']],exam:'٦٤'},
    {code:'QU 104',name:'المقرر ٤',sec:'749',act:'نظري',hrs:'2',open:1,meet:[['الأحد ١٠:٠٠ ص – ١١:٤٠ ص','٥١٣٣ كلية اللغات']],exam:'٦٤'},
    {code:'QU 104',name:'المقرر ٤',sec:'95',act:'نظري',hrs:'2',open:0,meet:[['الثلاثاء ٠٨:٠٠ ص – ٠٩:٤٠ ص','C1-L1-R-1062']],exam:'٦٤'},
    {code:'QU 105',name:'المقرر ٥',sec:'2783',act:'نظري',hrs:'3',open:1,meet:[['الثلاثاء ١٠:٠٠ ص – ١٠:٥٠ ص','B1-F083']],exam:'٤١'},
    {code:'QU 105',name:'المقرر ٥',sec:'2786',act:'عملي',hrs:'',open:1,meet:[['الأحد ١٢:٤٠ م – ٠٢:٢٠ م','معمل المساحة']],exam:''},
    {code:'QU 105',name:'المقرر ٥',sec:'2787',act:'عملي',hrs:'',open:1,meet:[['الخميس ١٢:٤٠ م – ٠٢:٢٠ م','معمل المساحة']],exam:''},
    {code:'QU 105',name:'المقرر ٥',sec:'2792',act:'تدريب',hrs:'',open:1,meet:[['الاثنين ١٢:٤٠ م – ٠٢:٢٠ م','B1-F083']],exam:''},
    {code:'QU 108',name:'المقرر ٨',sec:'2801',act:'عملي',hrs:'1',open:1,meet:[['الخميس ١٢:٤٠ م – ٠٢:٢٠ م','FLUID MECHANICS LAB']],exam:''},
    {code:'QU 108',name:'المقرر ٨',sec:'2802',act:'عملي',hrs:'1',open:1,meet:[['الثلاثاء ٠٨:٠٠ ص – ٠٩:٤٠ ص','FLUID MECHANICS LAB']],exam:''},
    {code:'QU 111',name:'المقرر ١١',sec:'1841',act:'نظري',hrs:'3',open:1,meet:[['الأحد ٠٢:٤٠ م – ٠٤:٢٠ م','فصل دراسي']],exam:'٣٦'},
    {code:'QU 111',name:'المقرر ١١',sec:'1843',act:'تمارين',hrs:'',open:1,meet:[['الأربعاء ٠٢:٤٠ م – ٠٤:٢٠ م','فصل دراسي']],exam:''},
    {code:'QU 113',name:'المقرر ١٣',sec:'2768',act:'نظري',hrs:'2',open:1,meet:[['الثلاثاء ١١:٠٠ ص – ١١:٥٠ ص','B1-F080']],exam:'٣٩'},
    {code:'QU 113',name:'المقرر ١٣',sec:'2771',act:'عملي',hrs:'',open:1,meet:[['الثلاثاء ٠٨:٠٠ ص – ٠٩:٤٠ ص','MECHANICS OF MATERIAL LAB']],exam:''},
    {code:'QU 115',name:'المقرر ١٥',sec:'2838',act:'نظري',hrs:'3',open:1,meet:[['الاثنين ٠٨:٠٠ ص – ٠٩:٤٠ ص','B1-F080']],exam:'٣٥'},
    {code:'QU 115',name:'المقرر ١٥',sec:'2840',act:'تدريب',hrs:'',open:1,meet:[['الأربعاء ٠٨:٠٠ ص – ٠٩:٤٠ ص','B1-F080']],exam:'٣٥'},
    {code:'QU 118',name:'المقرر ١٨',sec:'3407',act:'نظري',hrs:'3',open:1,meet:[['الاثنين ٠٨:٠٠ ص – ٠٩:٤٠ ص','B1-F074']],exam:'٤٥'},
    {code:'QU 118',name:'المقرر ١٨',sec:'3404',act:'نظري',hrs:'3',open:0,meet:[['الأحد ١٢:٤٠ م – ٠٢:٢٠ م','فصل دراسي']],exam:'٤٥'}
  ];
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function renderUni(list){
    var tb=$('#uni-tbody'); tb.innerHTML='';
    list.forEach(function(c,i){
      var tr=document.createElement('tr');
      tr.innerHTML =
        '<td data-th="رمز المقرر"><span class="c-code">'+esc(c.code)+'</span></td>'+
        '<td data-th="اسم المقرر">'+esc(c.name)+'</td>'+
        '<td class="cell-hq" data-th="المقر">مقر الجامعة الرئيس طلاب</td>'+
        '<td data-th="الشعبة"><span class="c-sec">'+toAr(c.sec)+'</span></td>'+
        '<td data-th="النشاط">'+esc(c.act)+'</td>'+
        '<td data-th="الساعات">'+(c.hrs?toAr(c.hrs):'')+'</td>'+
        '<td data-th="الحالة"><span class="status '+(c.open?'open':'closed')+'"><span class="dot"></span>'+(c.open?'مفتوحة':'مغلقة')+'</span></td>'+
        '<td class="cell-details" data-th="التفاصيل"><button class="d-btn" type="button">التفاصيل <i class="ph ph-caret-down"></i></button></td>';
      var dtr=document.createElement('tr');
      dtr.className='detail-row'; dtr.hidden=true;
      dtr.innerHTML='<td colspan="7">'+c.meet.map(function(m){return '<span class="meeting"><b>'+esc(m[0])+'</b>'+(m[1]?'<span>'+esc(m[1])+'</span>':'')+'</span>'}).join('')+
        (c.exam?'<span class="meeting"><b>فترة الاختبار: '+esc(c.exam)+'</b></span>':'')+'</td>';
      $('button',tr).addEventListener('click',function(){
        dtr.hidden=!dtr.hidden;
        tr.classList.toggle('open-detail', !dtr.hidden);
        coach.position();
      });
      if(i===0){ tr.id='uni-first-row'; dtr.id='uni-first-detail' }
      if(!c.open && !document.getElementById('uni-closed-row')) tr.id = tr.id || 'uni-closed-row';
      tb.appendChild(tr); tb.appendChild(dtr);
    });
    $('#uni-count').innerHTML = '<strong>'+toAr(list.length)+'</strong> شعبة مطروحة';
  }
  renderUni(UNI);
  $('#uni-q').addEventListener('input', function(){
    var t=this.value.trim();
    var t2=t.replace(/[٠-٩]/g,function(d){return '٠١٢٣٤٥٦٧٨٩'.indexOf(d)});
    if(!t){ renderUni(UNI); return }
    renderUni(UNI.filter(function(c){
      return (c.code+' '+c.name+' '+c.sec+' '+c.act).indexOf(t)>-1 || (c.code+' '+c.name+' '+c.sec+' '+c.act).indexOf(t2)>-1;
    }));
  });

  var uniShotSrc=null, uniShotState='idle', uniShotTries=0;
  function uniShotNames(){
    var order = device==='desktop' ? ['desktop']
              : device==='tablet'  ? ['tablet','desktop','mobile']
              :                      ['mobile'];
    var exts=['jpg','png','jpeg','webp'], out=[];
    order.forEach(function(k){ exts.forEach(function(e){ out.push('tut-uni-'+k+'.'+e) }) });
    return out;
  }
  function preloadUniShot(){
    if(uniShotState==='ready' || uniShotState==='loading') return;
    uniShotState='loading';
    applyUniShot();
    var names=uniShotNames();
    (function tryNext(i){
      if(i>=names.length){
        uniShotTries++;
        uniShotState='waiting';
        applyUniShot();
        setTimeout(function(){
          if(uniShotState==='waiting'){ uniShotState='idle'; preloadUniShot() }
        }, Math.min(1200*uniShotTries, 6000));
        return;
      }
      var im=new Image();
      im.decoding='async';
      im.onload=function(){ uniShotSrc=names[i]; uniShotState='ready'; applyUniShot() };
      im.onerror=function(){ tryNext(i+1) };
      im.src=names[i];
    })(0);
  }
  function applyUniShot(){
    var shot=$('#uni-shot'), mock=$('#uni-mock'), skel=$('#uni-skeleton'), note=$('#uni-shot-note');
    mock.style.display='none';
    if(uniShotState==='ready'){
      if(shot.getAttribute('src')!==uniShotSrc) shot.setAttribute('src', uniShotSrc);
      shot.hidden=false; skel.hidden=true;
    } else {
      shot.hidden=true; skel.hidden=false;
      note.hidden = uniShotTries<1;
    }
    coach.position();
  }

  function startUniTour(){
    if(device==='desktop'){
      coach.start([
        {el:'#uni-bm-chip', wait:'#uni-bm-chip', icon:'ph-cursor-click', title:'الآن اضغط الزر!', body:'هذه صفحة <b>«المقررات المطروحة وفق الخطة»</b> في موقع الجامعة. زر <b>QU Schedule</b> الذي سحبته صار موجوداً في شريط العلامات المرجعية. وأنت داخل هذه الصفحة، <b>اضغطه الآن</b> وشاهد ما يحدث.', before:function(){ $('#uni-bm').classList.add('show') }}
      ], function(){ goTo('s-extract') });
      $('#uni-bm-chip').addEventListener('click', function h(){ $('#uni-bm-chip').removeEventListener('click',h); coach.end() });
    } else {
      coach.start([
        {icon:'ph-arrow-fat-line-up', title:'أنت الآن في صفحة الجامعة', body:'هذه صفحة <b>«المقررات المطروحة وفق الخطة»</b> في موقع الجامعة. وأنت داخلها، اضغط على <b>شريط البحث في أعلى المتصفح</b> والصق الكود الذي نسخته. تعال نجرّبها بمحاكاة مطابقة لمتصفح '+devWord()+'.', nextLabel:'افتح شريط العنوان'}
      ], function(){ goTo('s-bar') });
    }
  }

  var FULL='javascript:!function()%7Bvar%20e=document.createElement(\'script\');e.src=\'https%3A//mutlaq001.github.io/schedule/extractor.js?v=\'+Date.now(),document.head.appendChild(e)%7D();';
  var NOJS=FULL.replace(/^javascript:/,'');
  function startBarTour(){
    var addr=$('#addr-text'), field=$('#addr-field'), note=$('#addr-note');
    coach.start([
      {el:'#addr-field', wait:'#paste-btn', icon:'ph-clipboard-text', title:'الصق الرابط', body:'اضغط زر <b>«الصق الرابط المنسوخ»</b> بالأسفل — مثل ما راح تسوي لصقاً عادياً في شريط بحث متصفحك.'},
      {el:'#addr-field', wait:'#fix-btn', icon:'ph-warning', title:'المتصفح حذف شيئاً مهماً!', body:'لاحظ أن كلمة <span class="hl-no">javascript:</span> اختفت من بداية الرابط — أغلب المتصفحات تحذفها تلقائياً عند اللصق. <b>ارجع لبداية النص واكتبها يدوياً</b> (جافا سكريبت ثم نقطتان رأسيتان). اضغط الزر بالأسفل ليكتبها عنك.'},
      {el:'#suggests', wait:'#sg-globe', icon:'ph-globe-simple', title:'أهم خطوة: اختر الكوكب 🌐', body:'ظهرت لك خانتان في الاقتراحات:<br>• خيار بأيقونة <span class="hl-ok">الكوكب</span> — هذا الصحيح، وهو الذي ينقلك لصفحة المقررات ويضيفها.<br>• خيار <span class="hl-no">«انتقال»</span> بأيقونة العدسة — لن يفتح الموقع ولن يضيف شيئاً.<br><b>اضغط خيار الكوكب الآن</b> (وجرّب العدسة إن حبيت تشوف الفرق).'}
    ], function(){ goTo('s-extract') });

    $('#paste-btn').onclick=function(){
      field.classList.add('focus');
      addr.classList.remove('placeholder');
      addr.innerHTML='<span class="caret"></span>'+esc(NOJS);
      $('#addr-clear').hidden=false;
      note.className='addr-note show';
      note.innerHTML='<i class="ph-fill ph-warning-circle"></i><span>انتبه: المتصفح حذف <b style="font-family:monospace">javascript:</b> من بداية الرابط تلقائياً</span>';
      this.hidden=true;
      $('#fix-btn').hidden=false;
      coach.next();
    };
    $('#fix-btn').onclick=function(){
      var btn=this; btn.disabled=true;
      var word='javascript:', i=0;
      var pre=document.createElement('span'); pre.className='js-pre';
      addr.innerHTML=''; 
      var caret=document.createElement('span'); caret.className='caret';
      var rest=document.createElement('span'); rest.textContent=NOJS;
      addr.appendChild(pre); addr.appendChild(caret); addr.appendChild(rest);
      var iv=setInterval(function(){
        pre.textContent+=word[i]; i++;
        if(i>=word.length){
          clearInterval(iv);
          caret.remove();
          note.className='addr-note good show';
          note.innerHTML='<i class="ph-fill ph-check-circle"></i><span>ممتاز! الرابط اكتمل بشكل صحيح</span>';
          btn.hidden=true;
          setTimeout(function(){
            $('#suggests').classList.add('show');
            coach.next();
          }, reduceMotion?50:450);
        }
      }, reduceMotion?5:90);
    };
    $('#sg-search').addEventListener('click', function(){
      var r=this;
      r.classList.remove('shake'); void r.offsetWidth; r.classList.add('shake');
      $('#sg-warn').classList.add('show');
      coach.position();
    });
    $('#sg-globe').addEventListener('click', function h(){
      $('#sg-globe').removeEventListener('click', h);
      coach.end();
    });
  }

  function runExtract(){
    $('#ex-count').textContent=toAr(UNI.length);
    var t = reduceMotion ? [80,160,240,400] : [600,1500,2400,3100];
    setTimeout(function(){ mark('ex-1') }, t[0]);
    setTimeout(function(){ mark('ex-2') }, t[1]);
    setTimeout(function(){ mark('ex-3') }, t[2]);
    setTimeout(function(){ goTo('s-app') }, t[3]);
    function mark(id){
      var e=$('#'+id);
      e.classList.add('done');
      $('i',e).className='ph-fill ph-check-circle';
    }
  }

  var COURSES=[
    {id:'c1', code:'QU 101', name:'المقرر ١', hrs:3, color:'#8b5cf6', added:false, secs:[
      {n:'1833', type:'نظري', ins:'د. عبدالله الحربي', loc:'قاعة ١٠٥', day:0, start:12.66, len:1.67},
      {n:'1835', type:'تدريب', ins:'د. عبدالله الحربي', loc:'معمل ٣', day:3, start:12.66, len:1.67}
    ]},
    {id:'c2', code:'QU 105', name:'المقرر ٥', hrs:3, color:'#14b8a6', added:true, secs:[
      {n:'2783', type:'نظري', ins:'د. سلطان العتيبي', loc:'قاعة ٢٠١', day:2, start:10, len:0.85},
      {n:'2789', type:'عملي', ins:'م. فهد القحطاني', loc:'معمل ٧', day:2, start:12.66, len:1.67}
    ]},
    {id:'c3', code:'QU 111', name:'المقرر ١١', hrs:3, color:'#f59e0b', added:true, secs:[
      {n:'1841', type:'نظري', ins:'د. ماجد الرشيدي', loc:'قاعة ١١٢', day:0, start:14.66, len:1.67},
      {n:'1843', type:'تمارين', ins:'د. ماجد الرشيدي', loc:'قاعة ١١٢', day:3, start:14.66, len:1.67}
    ]},
    {id:'c4', code:'QU 113', name:'المقرر ١٣', hrs:2, color:'#38bdf8', added:true, secs:[
      {n:'2768', type:'نظري', ins:'د. خالد الشمري', loc:'قاعة ٣٠٤', day:2, start:11, len:0.85},
      {n:'2771', type:'عملي', ins:'م. نايف الدوسري', loc:'معمل ٢', day:2, start:8, len:1.67}
    ]},
    {id:'c5', code:'QU 115', name:'المقرر ١٥', hrs:2, color:'#ec4899', added:true, secs:[
      {n:'2838', type:'نظري', ins:'د. بندر المطيري', loc:'قاعة ١٢٠', day:1, start:8, len:1.67},
      {n:'2840', type:'تدريب', ins:'د. بندر المطيري', loc:'معمل ٥', day:3, start:8, len:1.67}
    ]}
  ];
  var DAYS=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس'];
  var CAL={hstart:8, hend:17, header:46, hourH:46};
  var dayLayers=[];
  function buildCal(){
    var g=$('#cal-grid'); g.innerHTML='';
    var timecol=document.createElement('div'); timecol.className='cg-timecol';
    var tHtml='<div class="cg-corner">الوقت</div>';
    for(var h=CAL.hstart; h<CAL.hend; h++){
      var lbl = h<12 ? toAr(h)+' ص' : toAr(h===12?12:h-12)+' م';
      tHtml+='<div class="cg-time">'+lbl+'</div>';
    }
    timecol.innerHTML=tHtml;
    g.appendChild(timecol);
    dayLayers=[];
    var slotCount=CAL.hend-CAL.hstart;
    DAYS.forEach(function(d){
      var col=document.createElement('div'); col.className='cg-daycol';
      var slots='';
      for(var s=0;s<slotCount;s++) slots+='<div class="cg-slot"></div>';
      col.innerHTML='<div class="cg-day">'+d+'</div><div class="cg-slots">'+slots+'</div>';
      var layer=document.createElement('div'); layer.className='cg-layer';
      col.appendChild(layer);
      dayLayers.push(layer);
      g.appendChild(col);
    });
    COURSES.forEach(function(c){ if(c.added) c.secs.forEach(function(s){ placeEvent(c,s,false) }) });
  }
  function placeEvent(c,s,pop){
    var ev=document.createElement('div');
    ev.className='cal-ev'+(pop?' pop':'');
    ev.style.background=c.color;
    ev.style.top=(CAL.header+(s.start-CAL.hstart)*CAL.hourH+1)+'px';
    ev.style.height=(s.len*CAL.hourH-4)+'px';
    var inner='<b>'+esc(c.name)+'</b><small>'+toAr(s.n)+' - '+esc(s.ins)+'</small>';
    if(s.len>1.2) inner+='<small class="ev-loc"><i class="ph ph-map-pin"></i> '+esc(s.loc)+'</small>';
    ev.innerHTML=inner;
    dayLayers[s.day].appendChild(ev);
  }
  function buildList(){
    var host=$('#course-list'); host.innerHTML='';
    COURSES.forEach(function(c){
      var item=document.createElement('div'); item.className='course-item open';
      var secsHTML=c.secs.map(function(s,si){
        return '<div class="section-btn'+(c.added?' selected':'')+'"'+(c.id==='c1'&&si===0?' id="add-demo"':'')+' data-si="'+si+'"><div class="section-btn-number">'+toAr(s.n)+'</div><div class="section-type">'+esc(s.type)+'</div></div>';
      }).join('');
      item.innerHTML='<div class="course-item-header"><span class="color-dot" style="background-color:'+c.color+'"></span><div class="course-info"><h3>'+esc(c.name)+' ('+esc(c.code)+')</h3><p>'+toAr(c.secs.length)+' شعب متاحة</p></div><i class="ph ph-caret-down toggle-icon"></i></div><div class="sections-wrapper"><div class="sections-grid">'+secsHTML+'</div></div>';
      $('.course-item-header',item).addEventListener('click', function(){ item.classList.toggle('open') });
      if(!c.added){
        $$('.section-btn',item).forEach(function(btn){
          btn.addEventListener('click', function(){ addCourse(c) });
        });
      }
      host.appendChild(item);
    });
  }
  function addCourse(c){
    if(c.added) return;
    c.added=true;
    c.secs.forEach(function(s){ placeEvent(c,s,true) });
    buildList();
    $('#st-courses').textContent=toAr(5);
    $('#st-credits').textContent=toAr(13);
    $('#st-hours').textContent=toAr(14);
    coach.clearPulse();
    setTimeout(function(){ coach.next() }, reduceMotion?60:650);
  }
  function startAppTour(){
    buildCal(); buildList();
    coach.start([
      {icon:'ph-confetti', title:'أهلاً بجدولك!', body:'هذا موقع <b>QU Schedule</b> — كل الشعب اللي كانت في صفحة الجامعة انتقلت هنا تلقائياً بنفس ترتيبها وتفاصيلها، بدون أي كتابة يدوية.'},
      {el:'#am-side', icon:'ph-stack', title:'قائمة المقررات', body:'جميع المقررات المطروحة صارت هنا. اضغط أيقونة البحث للبحث باسم المقرر أو الدكتور أو رقم الشعبة، وافتح أي مقرر لتشوف كل شعبه.'},
      {el:'#add-demo', wait:'#add-demo', icon:'ph-plus-circle', title:'جرّبها بنفسك: أضف مقرراً', body:'اضغط على شعبة <b>١٨٣٣ (نظري)</b> لإضافة «المقرر ١» إلى الجدول — ولاحظ أن شعبة <b>التدريب المرتبطة</b> بها تنضاف معها تلقائياً، مثل نظام الجامعة تماماً.'},
      {el:'#am-cal', icon:'ph-calendar-check', title:'جدولك الأسبوعي', body:'كل شعبة تُرسم في مكان وقتها بلون مميز لمقررها. لو تعارضت شعبتان، يظهر لك التعارض فوراً مع زر <b>«حل التعارض»</b> يقترح عليك البدائل.'},
      {el:'#am-stats', icon:'ph-chart-bar', title:'إحصائيات لحظية', body:'المقررات، الساعات المعتمدة، أيام الدوام، والساعات الأسبوعية — تتحدث مباشرة مع كل إضافة أو حذف عشان توازن جدولك.'},
      {el:'#am-save', icon:'ph-camera', title:'حفظ كصورة', body:'يصدّر جدولك <b>كصورة أنيقة</b> جاهزة للمشاركة أو حفظها بالاستديو.'},
      {el:'#am-share', icon:'ph-share-network', title:'المشاركة والمقارنة', body:'شارك جدولك برابط أو رمز QR، وقارنه مع جداول أصدقائك لمعرفة <b>الفراغات المشتركة</b> بينكم.'},
      {el:'#am-settings', icon:'ph-gear-six', title:'الإعدادات: كنز الموقع', body:'من هنا تلقى <b>الجدول الذكي</b> (يبني لك أفضل جدول تلقائياً)، إخفاء الشعب المغلقة، تصدير للتقويم، تحليل الوقت، الألوان والمظهر، وأكثر.', nextLabel:'إنهاء الجولة'}
    ], function(){ goTo('s-done') });
  }

  function confetti(){
    if(reduceMotion) return;
    var host=$('#confetti'); host.innerHTML='';
    var colors=['#8b5cf6','#14b8a6','#f59e0b','#38bdf8','#ec4899','#c4b5fd'];
    for(var i=0;i<90;i++){
      var p=document.createElement('i');
      p.style.left=(Math.random()*100)+'%';
      p.style.background=colors[i%colors.length];
      p.style.animationDuration=(2.2+Math.random()*2.4)+'s';
      p.style.animationDelay=(Math.random()*0.9)+'s';
      p.style.transform='rotate('+(Math.random()*360)+'deg)';
      host.appendChild(p);
    }
    setTimeout(function(){ host.innerHTML='' }, 5200);
  }
})();
