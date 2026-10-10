(()=>{
 const hero=document.querySelector('.library-hero');if(!hero)return;
 const scenes=[...hero.querySelectorAll('.library-backdrops img')],sceneDots=[...hero.querySelectorAll('[data-scene-index]')],cards=[...hero.querySelectorAll('.hero-pick')],dots=[...hero.querySelectorAll('[data-pick-index]')],pause=hero.querySelector('[data-scene-pause]');
 let scene=0,pick=0,timer,paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function showScene(n){scene=(n+scenes.length)%scenes.length;scenes.forEach((el,i)=>{el.classList.toggle('is-current',i===scene);sceneDots[i].setAttribute('aria-pressed',String(i===scene))})}
 function showPick(n){pick=(n+cards.length)%cards.length;cards.forEach((el,i)=>{const current=i===pick;el.classList.toggle('is-current',current);el.setAttribute('aria-hidden',String(!current));el.tabIndex=current?0:-1;dots[i].setAttribute('aria-pressed',String(current))})}
 function schedule(){clearInterval(timer);if(!paused&&!document.hidden&&!document.querySelector('dialog[open]'))timer=setInterval(()=>showScene(scene+1),3000)}
 function label(){pause.textContent=paused?'▶':'Ⅱ';pause.setAttribute('aria-label',paused?'Play background slideshow':'Pause background slideshow')}
 hero.querySelector('[data-pick-prev]').onclick=()=>showPick(pick-1);hero.querySelector('[data-pick-next]').onclick=()=>showPick(pick+1);dots.forEach((dot,i)=>dot.onclick=()=>showPick(i));sceneDots.forEach((dot,i)=>dot.onclick=()=>{showScene(i);schedule()});pause.onclick=()=>{paused=!paused;label();schedule()};document.addEventListener('visibilitychange',schedule);document.querySelectorAll('dialog').forEach(d=>new MutationObserver(schedule).observe(d,{attributes:true,attributeFilter:['open']}));window.addEventListener('pagehide',()=>clearInterval(timer));window.addEventListener('pageshow',schedule);label();schedule();
})();
