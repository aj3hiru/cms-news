/**
 * Floating reading-progress button (mobile; optionally desktop too): a ring
 * that fills as the reader scrolls, "section n/total" + minutes left, and a
 * sheet listing the article's H2 headings to jump to. Plain inline script,
 * so it costs no hydration.
 */
export function ReadingProgress({ label, backToTop = "Back to top", minutes, desktop }: { label: string; backToTop?: string; minutes: number; desktop: boolean }) {
  const cfg = JSON.stringify({ label, top: backToTop, minutes: Math.max(1, minutes), desktop }).replace(/</g, "\\u003c");
  const script = `(function(){var C=${cfg};var sc=document.querySelector(".single-post .entry-content");if(!sc)return;
var hs=[].slice.call(sc.querySelectorAll("h2[id]"));if(!hs.length)return;
var root=document.getElementById("nb-rp-root");if(!root)return;
root.innerHTML='<button type="button" id="nb-rp" class="nb-rp'+(C.desktop?' nb-rp--all':'')+'" aria-expanded="false"><svg width="26" height="26" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="4"/><circle class="nb-rp-ring" cx="18" cy="18" r="15" fill="none" stroke="#ffd479" stroke-width="4" stroke-linecap="round" stroke-dasharray="94.2" stroke-dashoffset="94.2" transform="rotate(-90 18 18)"/></svg><span class="nb-rp-tx"></span></button><div id="nb-rp-sheet" class="nb-rp-sheet'+(C.desktop?' nb-rp--all':'')+'"></div>';
var pod=document.getElementById("nb-rp"),sh=document.getElementById("nb-rp-sheet");pod.setAttribute("aria-label",C.label);
var esc=function(s){var d=document.createElement("div");d.textContent=s;return d.innerHTML};
var h="<h4>"+esc(C.label)+"</h4>";hs.forEach(function(e,i){h+='<a href="#'+e.id+'" data-i="'+i+'"><span class="n">'+(i+1)+"</span>"+esc(e.textContent||"")+"</a>"});
h+='<a href="#" class="top"><span class="n">\\u2191</span>'+esc(C.top)+'</a>';sh.innerHTML=h;
var ring=pod.querySelector(".nb-rp-ring"),tx=pod.querySelector(".nb-rp-tx"),R=2*Math.PI*15,open=false,cur=-2,tick=false,links=sh.querySelectorAll("a[data-i]"),total=C.minutes*60;
function tg(v){open=v==null?!open:v;sh.classList.toggle("open",open);pod.setAttribute("aria-expanded",open)}
pod.addEventListener("click",function(){tg()});
sh.addEventListener("click",function(e){var a=e.target.closest("a");if(!a)return;e.preventDefault();tg(false);if(a.classList.contains("top")){scrollTo({top:0,behavior:"smooth"});return}var el=document.getElementById(a.getAttribute("href").slice(1));el&&el.scrollIntoView({behavior:"smooth",block:"start"})});
document.addEventListener("click",function(e){open&&!sh.contains(e.target)&&!pod.contains(e.target)&&tg(false)});
function fmt(s){s=Math.max(0,Math.round(s));return s<60?"\\u2248 "+s+" s":"\\u2248 "+Math.round(s/60)+" min"}
function up(){tick=false;var t=sc.getBoundingClientRect().top+pageYOffset,hh=sc.offsetHeight||1,p=Math.min(1,Math.max(0,(pageYOffset+innerHeight*.5-t)/hh));
ring.setAttribute("stroke-dashoffset",(R*(1-p)).toFixed(1));var ci=-1;for(var i=0;i<hs.length;i++)if(hs[i].getBoundingClientRect().top<=innerHeight*.5)ci=i;
if(ci!==cur){cur=ci;for(var k=0;k<links.length;k++){links[k].classList.toggle("done",k<=ci);links[k].classList.toggle("cur",k===ci)}}
tx.innerHTML=(ci>=0?esc((ci+1)+"/"+hs.length)+"&nbsp; ":"")+"<b>"+fmt(total*(1-p))+"</b>"}
function on(){if(!tick){tick=true;requestAnimationFrame(up)}}addEventListener("scroll",on,{passive:true});addEventListener("resize",on,{passive:true});up()})();`;
  return (
    <>
      {/* Filled by the script below (before React hydrates), so React never compares it. */}
      <div id="nb-rp-root" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: "" }} />
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </>
  );
}
