import {useEffect,useRef,useState} from 'react';

/** A one-shot celebration after a successfully saved decision. */
export function PassCelebration(){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const [finished,setFinished]=useState(false);
 useEffect(()=>{
  const canvas=canvasRef.current;
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(!canvas||preference.matches){setFinished(true);return;}
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  let width=window.innerWidth,height=window.innerHeight,frame=0;
  const resize=()=>{
   width=window.innerWidth;height=window.innerHeight;
   const scale=Math.min(window.devicePixelRatio||1,2);
   canvas.width=width*scale;canvas.height=height*scale;
   ctx.setTransform(scale,0,0,scale,0,0);
  };
  resize();
  const colors=['#009edb','#51cce8','#f6bb42','#ef739b','#5cbf9c'];
  const particles=Array.from({length:96},(_,i)=>{
   const side=i%2===0?1:-1;
   return {side,x:side===1?-8:width+8,y:height*0.68,
    vx:side*(0.13+Math.random()*0.24)*Math.min(width,1400),vy:-300-Math.random()*400,
    rotation:Math.random()*Math.PI,spin:(Math.random()-.5)*14,
    size:4+Math.random()*5,color:colors[i%colors.length],delay:(i%12)*12};
  });
  let start:number|undefined,last:number|undefined;
  const draw=(now:number)=>{
   start??=now;last??=now;
   const elapsed=now-start,dt=Math.min((now-last)/1000,0.04);last=now;
   ctx.clearRect(0,0,width,height);
   if(elapsed>=2400){setFinished(true);return;}
   for(const p of particles){
    if(elapsed<p.delay)continue;
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=650*dt;p.vx*=Math.exp(-0.35*dt);p.rotation+=p.spin*dt;
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rotation);
    ctx.globalAlpha=Math.min(1,(2400-elapsed)/650);
    ctx.fillStyle=p.color;
    ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*(0.4+Math.abs(Math.cos(elapsed/180+p.spin))*0.6));
    ctx.restore();
   }
   frame=requestAnimationFrame(draw);
  };
  const stop=()=>{cancelAnimationFrame(frame);setFinished(true);};
  frame=requestAnimationFrame(draw);
  window.addEventListener('resize',resize);
  preference.addEventListener('change',stop);
  return ()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',resize);preference.removeEventListener('change',stop);};
 },[]);
 return finished?null:<canvas ref={canvasRef} aria-hidden="true" style={{position:'fixed',inset:0,width:'100vw',height:'100vh',pointerEvents:'none',zIndex:80}}/>;
}
