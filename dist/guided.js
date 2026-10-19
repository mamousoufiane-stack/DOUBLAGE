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
  $('#phraseCancel').disabled = (busy && !modelLoading) || recording;
  lockNavigation(true);
  for (const id of ['play','record','seek','speed','restart','monitor','hearReference','hearBackground']) $('#'+id).disabled = true;
}
async function beginWorkshop() {
  stop(); closeMic();
  workshop = {scene: current, role, rate, queue: current.lines.map((_,i)=>i).filter(i=>role<0 || current.lines[i][2]===role), index:0, accepted:new Map(), candidate:null};
  guidedPanel.hidden = false;
  $('#phraseHint').textContent = `Après le décompte, suis le curseur : prépare-toi, puis parle dans la zone violette. Tu as encore 1 seconde pour finir. Vitesse ${rate}×.`;
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
    await openMic();
    const timing=phraseTiming(w),line=timing.line;
    await seek(line[0]); capturePeaks = []; $('#hearReference').checked = false; reference.pause();
    const rec=await createPcmRecorder(audioContext,micSource);recorder=rec;
    for(let n=3;n>0;n--) { $('#countdown').hidden=false; $('#countdown').textContent=n; await sleep(700); }
    $('#countdown').hidden=true;
    const capture={...timing,elapsed:0,peaks:[],startedAudio:0,timer:null,videoStarted:false,failed:false,nativeClock:true};
    let failed=false;
    rec.onpeak=(index,value)=>{capture.peaks[index]=value;};
    rec.onerror=e=>{failed=true;pauseSegment();w.capture=null;recording=false;busy=false;closeMic();$('#phraseHint').textContent=e.message;update();};
    rec.onstop=({samples,sampleRate})=>{
      pauseSegment();
      clearInterval(capture.timer);
      if(!failed && !capture.failed && samples.length && workshop===w) {
        disposePhrase(w.candidate);
        const blob=wavBlob([samples,samples],sampleRate);
        const candidate={blob,url:URL.createObjectURL(blob),offset:0,pre:timing.pre,post:timing.post,peaks:[...capture.peaks]};
        w.candidate=candidate;
        $('#phraseHint').textContent='Écoute ta prise. Elle te plaît ? Valide ! Sinon, recommence cette phrase.';
      } else $('#phraseHint').textContent='La prise a échoué. Tu peux recommencer.';
      w.capture=null;
      recording=false;busy=false;closeMic();update();
    };
    capture.startedAudio=await rec.start(capture.total);recording=true;w.capture=capture;
    video.playbackRate=w.rate;syncBackground();segmentEnd=null;playing=false;busy=false;
    capture.timer=setInterval(updateCapture,25);
    $('#phraseHint').textContent='Suis le curseur blanc. Le micro enregistre déjà : tu peux commencer sans craindre une coupure.';
  } catch(e) { $('#countdown').hidden=true;pauseSegment();busy=false;closeMic();$('#phraseHint').textContent='Enregistrement impossible : '+e.message; }
  update();
}
function withMediaTimeout(promise, milliseconds = 10000) {
  let timer;
  return Promise.race([promise,new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(Error('La lecture tarde à démarrer. Réessaie ou vérifie ta connexion.')),milliseconds);
  })]).finally(()=>clearTimeout(timer));
}
function stopModelAtBoundary() {
  if(modelTimer!==null && segmentEnd!==null && reference.currentTime>=segmentEnd-.015) {
    t=segmentEnd;pauseSegment();
  }
}
reference.addEventListener('timeupdate',stopModelAtBoundary);
async function modelPhrase() {
  if(!workshop || playing || busy) return;
  const w=workshop, ticket=++modelGeneration;
  busy=true;modelLoading=true;update();$('#phraseAudio').pause();reference.pause();
  $('#phraseHint').textContent='Préparation de la phrase… Tu peux quitter l’atelier pendant le chargement.';
  try {
    // A previous microphone session may have routed this element through Web
    // Audio. Resume it from this click, without creating/decoding a new buffer.
    if(audioContext)await withMediaTimeout(audioContext.resume());
    if(ticket!==modelGeneration||workshop!==w)return;
    const line=w.scene.lines[w.queue[w.index]];
    await seek(line[0]);
    if(ticket!==modelGeneration||workshop!==w)return;
    await waitMedia(reference,'loadedmetadata',()=>reference.readyState>=1,10000);
    if(ticket!==modelGeneration||workshop!==w)return;
    reference.currentTime=line[0];
    await waitMedia(reference,'seeked',()=>!reference.seeking && Math.abs(reference.currentTime-line[0])<.12,10000);
    if(ticket!==modelGeneration||workshop!==w)return;
    $('#hearReference').checked=true;
    reference.playbackRate=w.rate;reference.preservesPitch=true;
    video.playbackRate=w.rate;video.muted=true;
    // Arm the limit BEFORE playback, independently of animation frames and
    // before awaiting either media element's play promise.
    segmentEnd=line[1];modelTimer=setInterval(stopModelAtBoundary,25);
    playing=true;last=performance.now();
    await withMediaTimeout(Promise.all([reference.play(),current.media?video.play():Promise.resolve()]));
    if(ticket!==modelGeneration||workshop!==w)return;
    $('#phraseHint').textContent='Écoute cette phrase. Tu pourras la réécouter ou l’enregistrer.';
  }
  catch(e){if(ticket===modelGeneration){pauseSegment();$('#phraseHint').textContent=e.message;}}
  finally{if(ticket===modelGeneration){busy=false;modelLoading=false;}update();}
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
  const audioReady=setupAudio();audioReady.catch(()=>{});
  try {
    await preparationStep(1,'Chargement complet de la vidéo et des voix…');
    await withMediaTimeout(audioReady);
    const videoURL=await prepareSceneVideo(w.scene);
    const [base,ambience]=await Promise.all([w.scene.reference?decodeFile(w.scene.reference):null,videoURL?decodeFile(videoURL):null]);
    await preparationStep(2,'Préparation de tes prises et de la vitesse…');
    const phrases=await Promise.all([...w.accepted].map(async([index,p])=>trimSilentMargins({index,offset:p.offset,pre:p.pre,post:p.post,buffer:await audioContext.decodeAudioData(await p.blob.arrayBuffer())},w.scene.lines[index],w.rate)));
    const backing=await stretchBacking(backingTrack(w.scene,base,ambience,w.role,audioContext.sampleRate),w.rate);
    await preparationStep(3,'Assemblage du son et synchronisation de l’image…');
    const {channels,timeline,duration:mixDuration}=createComfortMix(w.scene,backing,phrases,audioContext.sampleRate,w.rate),peaks=[];
    const stride=Math.round(audioContext.sampleRate/25);
    for(let i=0;i<channels[0].length;i+=stride){let peak=0;for(let j=i;j<Math.min(channels[0].length,i+stride);j++)peak=Math.max(peak,Math.abs(channels[0][j]));peaks.push(peak);}
    const blob=wavBlob(channels,audioContext.sampleRate);
    const buffer=makePlaybackBuffer(channels,audioContext.sampleRate);
    await preparationStep(4,'Montage prêt !');
    takes.unshift({scene:w.scene,role:w.role,rate:w.rate,start:0,id:Date.now(),url:URL.createObjectURL(blob),type:'audio/wav',peaks,length:mixDuration,mixed:true,timeline,buffer});
    busy=false;leaveWorkshop();renderTakes();view('takes');status('Ton montage est prêt : tes phrases et les autres voix en VF !');
  } catch(e) {
    busy=false;
    // Retain the last take so validation retries assembly without recording again.
    w.candidate=w.accepted.get(w.queue[w.index]);w.accepted.delete(w.queue[w.index]);
    $('#phraseHint').textContent='Montage impossible : '+e.message+' Clique à nouveau sur Valider pour réessayer.';update();
  } finally {preparation.hidden=true;}
}
$('#phraseRecord').onclick=recordPhrase;
$('#phraseModel').onclick=modelPhrase;
$('#phraseListen').onclick=()=>{const a=$('#phraseAudio');a.src=workshop.candidate.url;a.hidden=false;a.play().catch(e=>$('#phraseHint').textContent=e.message);};
$('#phraseAccept').onclick=acceptPhrase;
$('#phraseCancel').onclick=()=>{leaveWorkshop();status('Atelier quitté. Les phrases non montées ont été effacées.');};

