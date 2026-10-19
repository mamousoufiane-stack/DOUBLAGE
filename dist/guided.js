'use strict';
const guidedPanel = document.createElement('section');
guidedPanel.id = 'guided'; guidedPanel.hidden = true;
guidedPanel.innerHTML = `<div class="eyebrow" id="phraseProgress"></div><h2 id="phraseRole"></h2><p id="phraseText"></p><p id="phraseHint" role="status" aria-live="polite"></p><div class="phrase-actions"><button id="phraseModel">Écouter la VF</button><button id="phraseRecord" class="primary">● Enregistrer cette phrase</button><button id="phraseListen">Écouter ma prise</button><button id="phraseAccept">Valider et suivante →</button><button id="phraseCancel">Quitter l’atelier</button></div><audio id="phraseAudio" controls hidden></audio>`;
document.querySelector('.voice-panel').before(guidedPanel);
function guidedUpdate() {
  if (!workshop) return;
  const w = workshop, line = w.scene.lines[w.queue[w.index]], locked = busy || recording || playing;
  $('#phraseProgress').textContent = `PHRASE ${w.index + 1} / ${w.queue.length} · ${w.accepted.size} validée(s)`;
  $('#phraseRole').textContent = w.scene.roles[line[2]];
  $('#phraseText').textContent = line[3];
  $('#phraseModel').disabled = locked || !w.scene.reference;
  $('#phraseRecord').disabled = locked;
  $('#phraseRecord').textContent = w.candidate ? '● Recommencer cette phrase' : '● Enregistrer cette phrase';
  $('#phraseListen').disabled = locked || !w.candidate;
  $('#phraseAccept').disabled = locked || !w.candidate;
  $('#phraseAccept').textContent = w.index === w.queue.length - 1 ? 'Valider et créer le montage ✓' : 'Valider et suivante →';
  $('#phraseCancel').disabled = busy || recording;
  lockNavigation(true);
  for (const id of ['play','record','seek','speed','restart','monitor','hearReference','hearBackground']) $('#'+id).disabled = true;
}
async function beginWorkshop() {
  stop(); closeMic();
  workshop = {scene: current, role, rate, queue: current.lines.map((_,i)=>i).filter(i=>role<0 || current.lines[i][2]===role), index:0, accepted:new Map(), candidate:null};
  guidedPanel.hidden = false;
  $('#phraseHint').textContent = `Écoute, puis parle après le décompte. Chaque phrase s’arrête toute seule. Vitesse ${rate}×, conservée dans le montage. Le son est coupé pendant ta prise.`;
  status(current.reference ? 'Les autres personnages garderont leur voix française.' : 'Cette animation n’a pas de voix originale : les personnages non joués resteront silencieux.');
  await seek(current.lines[workshop.queue[0]][0]); guidedUpdate();
  guidedPanel.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function pauseSegment() { segmentEnd = null; stop(); $('#phraseAudio').pause(); }
function disposePhrase(p) { if (p?.url) URL.revokeObjectURL(p.url); }
function leaveWorkshop() {
  pauseSegment(); closeMic();
  if (workshop) { workshop.accepted.forEach(disposePhrase); disposePhrase(workshop.candidate); }
  workshop = null; guidedPanel.hidden = true; $('#phraseAudio').removeAttribute('src');
  lockNavigation(false); update();
}
async function recordPhrase() {
  const w = workshop; if (!w || busy || recording || playing) return;
  busy = true; update(); $('#phraseAudio').pause();
  try {
    if (!window.MediaRecorder) throw Error('Utilise Chrome ou Edge pour enregistrer.');
    await openMic();
    const line = w.scene.lines[w.queue[w.index]];
    await seek(line[0]); capturePeaks = []; $('#hearReference').checked = false; reference.pause();
    for(let n=3;n>0;n--) { $('#countdown').hidden=false; $('#countdown').textContent=n; await sleep(700); }
    $('#countdown').hidden=true;
    const chunks=[], mimeType=['audio/webm;codecs=opus','audio/mp4'].find(m=>MediaRecorder.isTypeSupported(m));
    const rec=new MediaRecorder(stream,mimeType?{mimeType}:{}); recorder=rec;
    let offset=0, failed=false;
    rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    rec.onerror=()=>{failed=true; pauseSegment();};
    rec.onstop=()=>{
      if(!failed && chunks.length && workshop===w) {
        disposePhrase(w.candidate);
        const blob=new Blob(chunks,{type:rec.mimeType});
        w.candidate={blob,url:URL.createObjectURL(blob),offset};
        $('#phraseHint').textContent='Écoute ta prise. Elle te plaît ? Valide ! Sinon, recommence cette phrase.';
      } else $('#phraseHint').textContent='La prise a échoué. Tu peux recommencer.';
      recording=false;busy=false;closeMic();update();
    };
    rec.start(); const started=performance.now(); recording=true;
    if(current.media) {video.playbackRate=w.rate;syncBackground();await video.play();offset=Math.max(0,(performance.now()-started)/1000-(video.currentTime-line[0])/w.rate);}
    segmentEnd=line[1]; playing=true;last=performance.now();busy=false;
    $('#phraseHint').textContent='À toi ! Parle maintenant…';
  } catch(e) { $('#countdown').hidden=true;pauseSegment();busy=false;closeMic();$('#phraseHint').textContent='Enregistrement impossible : '+e.message; }
  update();
}
const modelBuffers = new Map();
async function modelPhrase() {
  if(!workshop || playing || busy) return;
  const w=workshop, ticket=++modelGeneration;
  busy=true;update();$('#phraseAudio').pause();reference.pause();
  try {
    const line=w.scene.lines[w.queue[w.index]],key=w.scene.reference+'@'+w.rate;
    await setupAudio();
    if(!modelBuffers.has(key))modelBuffers.set(key,await stretchBacking(await decodeFile(w.scene.reference),w.rate));
    if(ticket!==modelGeneration||workshop!==w)return;
    await seek(line[0]);
    if(ticket!==modelGeneration||workshop!==w)return;
    $('#hearReference').checked=true;
    // Bound the audio itself, not only the animation loop. Each click gets a
    // fresh source; a delayed play promise cannot restart the whole VF track.
    segmentEnd=line[1];
    if(current.media){video.playbackRate=w.rate;video.muted=true;await video.play();}
    if(ticket!==modelGeneration||workshop!==w)return;
    const source=audioContext.createBufferSource();source.buffer=modelBuffers.get(key);
    source.connect(audioContext.destination);modelSource=source;
    source.onended=()=>{if(modelSource===source){t=line[1];pauseSegment();}};
    const position=current.media?Math.max(line[0],video.currentTime):line[0];
    source.start(0,position/w.rate,Math.max(0,(line[1]-position)/w.rate));
    playing=true;last=performance.now();
  }
  catch(e){pauseSegment();$('#phraseHint').textContent=e.message;}
  finally{busy=false;update();}
}
async function decodeFile(url) {
  const response=await fetch(url); if(!response.ok) throw Error('Fichier audio local manquant.');
  return audioContext.decodeAudioData(await response.arrayBuffer());
}
// Assign the gaps around each cue to its speaker too: short text timings
// alone left fragments of the replaced French voice in the previous mix.
function speakerRegions(scene) {
  return scene.lines.map((line,i)=>({role:line[2],start:i?(scene.lines[i-1][1]+line[0])/2:0,end:i+1<scene.lines.length?(line[1]+scene.lines[i+1][0])/2:scene.duration}));
}
function backingTrack(scene, base, ambience, selectedRole, sampleRate) {
  const length=Math.ceil(scene.duration*sampleRate),out=audioContext.createBuffer(2,length,sampleRate);
  const regions=speakerRegions(scene);
  for(let c=0;c<2;c++) {
    const dst=out.getChannelData(c);
    if(base) dst.set(base.getChannelData(Math.min(c,base.numberOfChannels-1)).subarray(0,length));
    const bg=ambience?.getChannelData(Math.min(c,ambience.numberOfChannels-1));
    for(const region of regions.filter(r=>selectedRole<0||r.role===selectedRole)) {
      for(let i=Math.round(region.start*sampleRate);i<Math.min(length,Math.round(region.end*sampleRate));i++)dst[i]=(bg?.[i]||0)*.55;
    }
  }
  return out;
}
async function stretchBacking(buffer, tempo) {
  if(tempo===1)return buffer;
  const {SoundTouch,SimpleFilter}=await import('./vendor/soundtouch.js');
  const engine=new SoundTouch();engine.stretch.setParameters(buffer.sampleRate,0,0,8);engine.tempo=tempo;
  const left=buffer.getChannelData(0),right=buffer.getChannelData(1);
  // Zero padding flushes the processor's last block, including short clips.
  const source={extract(dst,n,pos){for(let i=0;i<n;i++){dst[2*i]=left[pos+i]||0;dst[2*i+1]=right[pos+i]||0;}return n;}};
  const filter=new SimpleFilter(source,engine),length=Math.ceil(buffer.length/tempo);
  const out=audioContext.createBuffer(2,length,buffer.sampleRate),chunk=new Float32Array(8192);
  for(let pos=0;pos<length;) {
    const n=filter.extract(chunk,Math.min(4096,length-pos));if(!n)throw Error('Le ralentissement audio a échoué.');
    for(let i=0;i<n;i++){out.getChannelData(0)[pos+i]=chunk[2*i];out.getChannelData(1)[pos+i]=chunk[2*i+1];}pos+=n;
  }
  return out;
}
function assembleSoundtrack(scene, backing, phrases, sampleRate, tempo) {
  const length=Math.ceil(scene.duration/tempo*sampleRate),out=[new Float32Array(length),new Float32Array(length)];
  for(let c=0;c<2;c++) {
    out[c].set(backing.getChannelData(c).subarray(0,length));
    for(const {index,buffer,offset} of phrases) {
      const line=scene.lines[index],from=Math.round(line[0]/tempo*sampleRate),to=Math.min(length,Math.round(line[1]/tempo*sampleRate));
      const voice=buffer.getChannelData(Math.min(c,buffer.numberOfChannels-1)),skip=Math.round(offset*sampleRate);
      for(let i=from;i<to;i++) {
        const fade=Math.min(1,(i-from)/Math.max(1,sampleRate*.004),(to-1-i)/Math.max(1,sampleRate*.004));
        out[c][i]=Math.max(-1,Math.min(1,out[c][i]+(voice[i-from+skip]||0)*fade));
      }
    }
  }
  return out;
}
function wavBlob(channels,sampleRate) {
  const n=channels[0].length,b=new ArrayBuffer(44+n*4),v=new DataView(b);
  function str(p,s){for(let i=0;i<s.length;i++)v.setUint8(p+i,s.charCodeAt(i));}
  str(0,'RIFF');v.setUint32(4,36+n*4,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,sampleRate,true);v.setUint32(28,sampleRate*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,n*4,true);
  for(let i=0;i<n;i++)for(let c=0;c<2;c++){const x=Math.max(-1,Math.min(1,channels[c][i]));v.setInt16(44+i*4+c*2,x*(x<0?32768:32767),true);}
  return new Blob([b],{type:'audio/wav'});
}
async function acceptPhrase() {
  const w=workshop;if(!w?.candidate || busy || playing || recording)return;
  $('#phraseAudio').pause();w.accepted.set(w.queue[w.index],w.candidate);w.candidate=null;
  if(w.index<w.queue.length-1){
    w.index++;busy=true;update();$('#phraseHint').textContent='Bien joué ! Voici la phrase suivante.';
    try {await seek(w.scene.lines[w.queue[w.index]][0]);}
    catch(e){$('#phraseHint').textContent=e.message;}
    finally{busy=false;update();}return;
  }
  await finishWorkshop();
}
async function finishWorkshop() {
  const w=workshop;busy=true;update();$('#phraseHint').textContent='Assemblage de tes phrases et des voix françaises…';
  try {
    await setupAudio();
    const [base,ambience]=await Promise.all([w.scene.reference?decodeFile(w.scene.reference):null,w.scene.media?decodeFile(w.scene.media):null]);
    const phrases=await Promise.all([...w.accepted].map(async([index,p])=>({index,offset:p.offset,buffer:await audioContext.decodeAudioData(await p.blob.arrayBuffer())})));
    const backing=await stretchBacking(backingTrack(w.scene,base,ambience,w.role,audioContext.sampleRate),w.rate);
    const channels=assembleSoundtrack(w.scene,backing,phrases,audioContext.sampleRate,w.rate),peaks=[];
    const stride=Math.round(audioContext.sampleRate/(25*w.rate));
    for(let i=0;i<channels[0].length;i+=stride){let peak=0;for(let j=i;j<Math.min(channels[0].length,i+stride);j++)peak=Math.max(peak,Math.abs(channels[0][j]));peaks.push(peak);}
    const blob=wavBlob(channels,audioContext.sampleRate);
    takes.unshift({scene:w.scene,role:w.role,rate:w.rate,start:0,id:Date.now(),url:URL.createObjectURL(blob),type:'audio/wav',peaks,length:w.scene.duration,mixed:true});
    busy=false;leaveWorkshop();renderTakes();view('takes');status('Ton montage est prêt : tes phrases et les autres voix en VF !');
  } catch(e) {
    busy=false;
    // Retain the last take so validation retries assembly without recording again.
    w.candidate=w.accepted.get(w.queue[w.index]);w.accepted.delete(w.queue[w.index]);
    $('#phraseHint').textContent='Montage impossible : '+e.message+' Clique à nouveau sur Valider pour réessayer.';update();
  }
}
$('#phraseRecord').onclick=recordPhrase;
$('#phraseModel').onclick=modelPhrase;
$('#phraseListen').onclick=()=>{const a=$('#phraseAudio');a.src=workshop.candidate.url;a.hidden=false;a.play().catch(e=>$('#phraseHint').textContent=e.message);};
$('#phraseAccept').onclick=acceptPhrase;
$('#phraseCancel').onclick=()=>{leaveWorkshop();status('Atelier quitté. Les phrases non montées ont été effacées.');};

