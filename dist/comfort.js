'use strict';
const recordingLead = .6, recordingTail = 1;
const phraseGraph = document.createElement('div');
phraseGraph.className = 'phrase-graph';
phraseGraph.innerHTML = `<div class="phrase-graph-heading"><strong>Le rythme de cette phrase</strong><label>Zoom <select id="phraseZoom"><option value="1">Phrase entière</option><option value="2">×2</option><option value="3">×3</option></select></label></div><canvas id="phraseWave" width="1200" height="230" aria-label="Graphique agrandi : voix française en violet, ta voix en vert et curseur de progression"></canvas><div class="phrase-legend"><span>🟣 Modèle VF (avec bruitages)</span><span>🟢 Ta voix</span><strong id="speakCue" role="status" aria-live="polite">Prépare-toi</strong></div><p class="phrase-margin-note">Le micro prend 0,6 s d’avance et te laisse 1 s pour finir. Les deux marges sont gardées au montage.</p>`;
$('#phraseText').after(phraseGraph);
function phraseTiming(w = workshop) {
  const line=w.scene.lines[w.queue[w.index]],core=(line[1]-line[0])/w.rate;
  return {line,pre:recordingLead,post:recordingTail,core,total:recordingLead+core+recordingTail};
}
function updateCapture() {
  const w=workshop,c=w?.capture;if(!c || !recording)return;
  c.elapsed=Math.min(c.total,(performance.now()-c.started)/1000);
  const relative=c.elapsed-c.pre;
  if(relative>=0 && relative<c.core) {
    if(!c.videoStarted){c.videoStarted=true;if(current.media)video.play().catch(e=>{c.failed=true;pauseSegment();$('#phraseHint').textContent=e.message;});}
    t=Math.min(c.line[1],c.line[0]+relative*w.rate);
  } else if(relative>=c.core) {video.pause();t=c.line[1];}
  else t=c.line[0];
  if(c.elapsed>=c.total)pauseSegment();
}
function capturePeak(peak) {
  const c=workshop?.capture;if(!c||!recording)return;
  const i=Math.floor(c.elapsed*50);c.peaks[i]=Math.max(c.peaks[i]||0,peak);
}
function drawPhraseWave() {
  const w=workshop;if(!w)return;
  const {line,pre,core,total}=phraseTiming(w),audio=$('#phraseAudio'),candidate=w.candidate;
  let cursor=0;
  if(w.capture)cursor=w.capture.elapsed;
  else if(modelTimer!==null)cursor=pre+Math.max(0,reference.currentTime-line[0])/w.rate;
  else if(candidate)cursor=audio.getAttribute('src')===candidate.url?Math.min(total,audio.currentTime):0;
  const label=cursor<pre?'Prépare-toi':cursor<pre+core?'À toi de parler !':cursor<total?'Termine tranquillement':'Prise terminée';
  if($('#speakCue').textContent!==label)$('#speakCue').textContent=label;
  const canvas=$('#phraseWave'),g=canvas.getContext('2d'),W=Math.max(1,Math.round(canvas.clientWidth)),H=230,dpr=Math.min(devicePixelRatio||1,2);
  if(canvas.width!==Math.round(W*dpr)||canvas.height!==H*dpr){canvas.width=Math.round(W*dpr);canvas.height=H*dpr;}
  g.setTransform(dpr,0,0,dpr,0,0);
  const zoom=Number($('#phraseZoom').value),span=total/zoom,start=Math.max(0,Math.min(total-span,cursor-span*.4));
  const x=time=>(time-start)/span*W;
  g.clearRect(0,0,W,H);
  for(const [a,b,color,title] of [[0,pre,'#ffffff0b','PRÉPARE-TOI'],[pre,pre+core,'#b4a0ff22','À TOI'],[pre+core,total,'#b8edb018','POUR FINIR']]){
    g.fillStyle=color;g.fillRect(x(a),0,x(b)-x(a),H);g.fillStyle='#d9d5e7';g.font='16px Segoe UI';
    const left=Math.max(8,x(a)+8);if(left<Math.min(W,x(b))-70)g.fillText(title,left,24);
  }
  const peaks=w.capture?.peaks||candidate?.peaks||[];
  for(let px=0;px<W;px+=2){
    const second=start+px/W*span,sceneTime=line[0]+(second-pre)*w.rate;
    const vf=second>=pre && second<=pre+core?(current.peaks?.[Math.floor(sceneTime*25)]||0):0;
    const mine=peaks[Math.floor(second*50)]||0;
    for(const [value,color] of [[vf,'#b4a0ff'],[mine,'#9cf58c']]){
      g.strokeStyle=color;g.lineWidth=1.7;g.beginPath();const amp=Math.min(1,value*2)*75;
      g.moveTo(px,125-amp);g.lineTo(px,125+Math.max(.5,amp));g.stroke();
    }
  }
  for(const boundary of [pre,pre+core]){g.strokeStyle='#ffffff65';g.setLineDash([6,5]);g.beginPath();g.moveTo(x(boundary),32);g.lineTo(x(boundary),H-25);g.stroke();}g.setLineDash([]);
  g.fillStyle='#c5c1d4';g.font='15px Segoe UI';
  const tick=Math.max(.5,Math.ceil(span/W*100)/2);
  for(let second=Math.ceil(start/tick)*tick;second<start+span;second+=tick)g.fillText(second.toFixed(1)+' s',Math.max(0,x(second)+3),H-7);
  g.strokeStyle='#fff';g.lineWidth=3;g.beginPath();g.moveTo(x(cursor),30);g.lineTo(x(cursor),H-25);g.stroke();
}
// The montage inserts the margins as holds at each selected line boundary.
// Other speakers stay in their original order, without overlapping a child's tail.
function createComfortMix(scene, backing, phrases, sampleRate, tempo) {
  const ordered=[...phrases].sort((a,b)=>a.index-b.index),timeline=[],slots=[];
  let scenePosition=0,outputPosition=0;
  function append(end,holdSeconds=0) {
    const seconds=holdSeconds||(end-scenePosition)/tempo;
    if(seconds>0){timeline.push({outputStart:outputPosition,outputEnd:outputPosition+seconds,sceneStart:scenePosition,sceneEnd:end,hold:holdSeconds>0});outputPosition+=seconds;}
    scenePosition=end;
  }
  for(const phrase of ordered){
    const line=scene.lines[phrase.index];append(line[0]);
    const start=outputPosition;append(line[0],phrase.pre??recordingLead);append(line[1]);append(line[1],phrase.post??recordingTail);
    slots.push({phrase,start,end:outputPosition});
  }
  append(scene.duration);
  const channels=[new Float32Array(Math.ceil(outputPosition*sampleRate)),new Float32Array(Math.ceil(outputPosition*sampleRate))];
  for(let c=0;c<2;c++){
    const bg=backing.getChannelData(c),dst=channels[c];
    for(const segment of timeline){
      if(segment.hold)continue;
      const a=Math.round(segment.outputStart*sampleRate),b=Math.min(dst.length,Math.round(segment.outputEnd*sampleRate)),source=Math.round(segment.sceneStart/tempo*sampleRate);
      for(let i=a;i<b;i++){
        const fade=Math.min(1,(i-a)/(sampleRate*.006),(b-1-i)/(sampleRate*.006));
        dst[i]=(bg[source+i-a]||0)*Math.max(0,fade);
      }
    }
    for(const {phrase,start,end} of slots){
      const voice=phrase.buffer.getChannelData(Math.min(c,phrase.buffer.numberOfChannels-1)),skip=Math.round((phrase.offset||0)*sampleRate);
      const a=Math.round(start*sampleRate),b=Math.min(dst.length,Math.round(end*sampleRate));
      for(let i=a;i<b;i++){
        const fade=Math.min(1,(i-a)/(sampleRate*.006),(b-1-i)/(sampleRate*.006));
        dst[i]=Math.max(-1,Math.min(1,dst[i]+(voice[skip+i-a]||0)*Math.max(0,fade)));
      }
    }
  }
  return {channels,timeline,duration:outputPosition};
}
function montagePosition(timeline, seconds) {
  const part=timeline.find(p=>seconds<p.outputEnd)||timeline[timeline.length-1];
  if(!part)return {time:0,hold:true};
  return {time:part.hold?part.sceneStart:Math.min(part.sceneEnd,part.sceneStart+(seconds-part.outputStart)*(part.sceneEnd-part.sceneStart)/(part.outputEnd-part.outputStart)),hold:part.hold};
}

