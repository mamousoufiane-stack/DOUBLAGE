'use strict';
const sceneVideos=new Map();
const preparation=document.createElement('div');preparation.id='preparationPanel';preparation.hidden=true;
preparation.innerHTML='<div class="preparation-card" role="status" aria-live="polite"><h2>Ton montage se prépare…</h2><p id="preparationText"></p><progress id="preparationProgress" max="4" value="0"></progress><p>Garde cette page ouverte. La lecture sera disponible une fois le montage prêt.</p></div>';
document.body.append(preparation);
async function preparationStep(step,text){preparation.hidden=false;$('#preparationText').textContent=text;$('#preparationProgress').value=step;await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));}
function cachedVideoURL(path){return sceneVideos.get(path)?.url||path;}
async function prepareSceneVideo(scene){
  if(!scene.media)return null;
  if(sceneVideos.get(scene.media)?.url)return sceneVideos.get(scene.media).url;
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),30000);
  try{
    const response=await fetch(scene.media,{signal:abort.signal});if(!response.ok)throw Error('La vidéo n’a pas pu être préparée. Réessaie.');
    const blob=await response.blob();const url=URL.createObjectURL(blob);sceneVideos.set(scene.media,{url});return url;
  }finally{clearTimeout(timer);}
}
function makePlaybackBuffer(channels,sampleRate){const b=audioContext.createBuffer(channels.length,channels[0].length,sampleRate);channels.forEach((a,c)=>b.copyToChannel(a,c));return b;}
function trimSilentMargins(phrase,line,tempo){
  const samples=phrase.buffer.getChannelData(0),sr=phrase.buffer.sampleRate,step=Math.max(1,Math.round(sr*.02)),levels=[];
  const pre=phrase.pre??recordingLead,post=phrase.post??recordingTail,core=(line[1]-line[0])/tempo;
  for(let i=0;i<samples.length;i+=step){let sum=0;const end=Math.min(samples.length,i+step);for(let j=i;j<end;j++)sum+=samples[j]*samples[j];levels.push(Math.sqrt(sum/(end-i)));}
  const sorted=[...levels].sort((a,b)=>a-b),floor=sorted[Math.floor(sorted.length*.1)]||0;
  const threshold=Math.max(.001,Math.min(.008,floor*2.5));
  const first=levels.findIndex(v=>v>threshold);let last=-1;
  for(let i=levels.length-1;i>=0;i--)if(levels[i]>threshold){last=i;break;}
  // Trim only outside the dialogue slot, retaining 100 ms around audible sound.
  const cutStart=first<0?pre:Math.min(pre,Math.max(0,first*step/sr-.1));
  const cutEnd=last<0?pre+core:Math.max(pre+core,Math.min(pre+core+post,(last+1)*step/sr+.1));
  return {...phrase,offset:(phrase.offset||0)+cutStart,pre:pre-cutStart,post:cutEnd-pre-core};
}
// One decoded soundtrack and one audio clock. No repeated HTMLAudio play/pause
// or network buffering while moving between the picture's hold segments.
class MontageAudio {
  constructor(buffer){this.buffer=buffer;this.cursor=0;this.started=0;this.paused=true;this.ended=false;this.node=null;this.onended=null;}
  get currentTime(){return Math.min(this.buffer.duration,this.paused?this.cursor:this.cursor+audioContext.currentTime-this.started);}
  set currentTime(value){const resume=!this.paused;this.pause();this.cursor=Math.max(0,Math.min(this.buffer.duration,value));this.ended=false;if(resume)this.play();}
  play(){
    if(!this.paused)return Promise.resolve();if(this.cursor>=this.buffer.duration)return Promise.resolve();
    const node=audioContext.createBufferSource();node.buffer=this.buffer;node.connect(analyser);node.connect(audioContext.destination);
    this.node=node;this.started=audioContext.currentTime;this.paused=false;this.ended=false;
    node.onended=()=>{if(this.node!==node)return;node.disconnect();this.node=null;this.cursor=this.buffer.duration;this.paused=true;this.ended=true;this.onended?.();};
    node.start(0,this.cursor);return Promise.resolve();
  }
  pause(){this.cursor=this.currentTime;this.paused=true;if(this.node){this.node.onended=null;this.node.stop();this.node.disconnect();this.node=null;}}
}
function followMontagePicture(audio,position,target){
  if(!audio.picture)audio.picture={segment:null,playingPromise:null,lastSeek:-Infinity};
  const state=audio.picture,part=audio.timeline?.find(p=>audio.currentTime<p.outputEnd)||audio.timeline?.[audio.timeline.length-1];
  const changed=part!==state.segment;state.segment=part;
  if(position?.hold){
    if(!video.paused)video.pause();
    if(changed&&!video.seeking&&Math.abs(video.currentTime-target)>.06)video.currentTime=target;
    return;
  }
  if(!video.seeking&&Math.abs(video.currentTime-target)>.3&&performance.now()-state.lastSeek>800){
    video.currentTime=target;state.lastSeek=performance.now();
  }
  if(video.paused&&!state.playingPromise&&!video.seeking){
    const request=video.play();state.playingPromise=request;
    request.catch(e=>{
      // A hold intentionally cancels an unfinished play request.
      if(e.name!=='AbortError'&&pendingReview===audio){stop();status('Lecture de l’image interrompue : '+e.message);}
    }).finally(()=>{if(state.playingPromise===request)state.playingPromise=null;});
  }
}
window.addEventListener('pagehide',()=>sceneVideos.forEach(v=>URL.revokeObjectURL(v.url)));

