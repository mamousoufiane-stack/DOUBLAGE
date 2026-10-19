'use strict';
const $ = s => document.querySelector(s);
const scenes = [...originalScenes, ...localScenes];
const ctx = $('#scene').getContext('2d');
const video = $('#localVideo');
const reference = $('#referenceAudio');
let current = scenes[0], role = -1, t = 0, rate = .75, playing = false;
let busy = false, recording = false, reviewing = false, last = 0, selection = 0;
let recorder = null, stream = null, takes = [], pendingReview = null;
let audioContext, analyser, micSource, reviewSource, referenceSource;
let waveform = new Float32Array(2048), liveLevel = 0, capturePeaks = [], reviewPeaks = [];
let activePeakIndex = -1, monitoring = false, ready = true, mediaFailure = false;
let pixelsPerSecond = 100;
let workshop = null, segmentEnd = null, mixedPlayback = false;
let modelTimer = null, modelGeneration = 0, modelLoading = false;
const measure = document.createElement('canvas').getContext('2d');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function status(message) { $('#status').textContent = message; }
function duration() { return current.duration; }
function fmt(seconds) { return Math.floor(seconds / 60).toString().padStart(2, '0') + ':' + Math.floor(seconds % 60).toString().padStart(2, '0'); }
function view(name) {
  if (name !== 'studio') stop();
  ['studio', 'library', 'takes'].forEach(v => $('#' + v + 'View').hidden = v !== name);
  document.querySelectorAll('.nav').forEach(b => b.classList.toggle('active', b.dataset.view === name));
}
document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => view(b.dataset.view));
function modal(html) { $('#modalContent').innerHTML = html; $('#modal').showModal(); }
$('#closeModal').onclick = () => $('#modal').close();
function card(s) {
  const b = document.createElement('button'); b.className = 'card';
  b.innerHTML = `<div class="card-art" style="background:${s.color}">${s.poster ? `<img src="${s.poster}" alt="" loading="lazy">` : `<span>${s.icons[0]}</span><span>${s.icons[1] || ''}</span>`}<div class="tag">${s.media ? 'VIDÉO LOCALE · ' + s.roles.length + ' VOIX' : 'SCÈNE ORIGINALE'}</div></div><div class="card-content"><h3>${escapeHtml(s.title)}</h3><p>${Math.round(s.duration)} secondes · ${s.level}<span class="arrow">↗</span></p><p>${s.media ? 'Vidéo + texte + son témoin' : 'Mini-histoire animée'}</p></div>`;
  b.onclick = () => selectScene(s); return b;
}
function library(filter = 'all') {
  $('#library').replaceChildren(...scenes.filter(s => filter === 'all' || (filter === 'local' ? s.media : !s.media)).map(card));
}
library();
$('#recommendations').replaceChildren(...(localScenes.length ? localScenes : originalScenes).slice(0, 3).map(card));
document.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => {
  document.querySelectorAll('[data-filter]').forEach(x => x.classList.toggle('active', x === b)); library(b.dataset.filter);
});
$('#help').onclick = () => modal('<h2>Ton studio, entièrement local</h2><ol><li>Choisis une scène et un personnage. Les autres répliques restent visibles en plus discret.</li><li>Coche « Écouter les voix originales » pour entendre le modèle. Décoche pour répéter. Les courbes montrent le son témoin et ta voix dans le temps.</li><li>« Tester mon micro » affiche ta voix en direct, sans enregistrer. La courbe mesure le volume du son, pas la justesse ou l’identité d’une voix.</li><li>Enregistre phrase par phrase après le décompte, à la vitesse choisie. Réécoute, recommence ou valide chaque phrase. Le montage conserve les autres personnages en VF. Mets un casque pour conserver l’ambiance sans écho.</li><li>Dans « Mes prises », choisis « Rejouer avec la scène » : la vidéo et le montage de tes phrases sont lus ensemble. Le bouton Arrêter permet de revenir au studio.</li></ol><p>Les prises sont temporaires : télécharge ton audio avant de fermer la page.</p>');
$('#credits').onclick = () => modal('<h2>Sources et préparation locale</h2><p>Studio indépendant inspiré du fonctionnement de DubTake. Les mini-animations et leurs textes sont originaux. Les images et voix témoins proviennent des versions françaises des films. Les ambiances sans dialogues sont issues des bandes rythmo Romandub.</p><ul>' + localScenes.map(s => `<li>${escapeHtml(s.title)} — <a href="${s.source}" target="_blank" rel="noopener">Source VF</a>. Passage ${s.sourceRange.map(fmt).join(' – ')}.</li>`).join('') + '</ul><p>Les dialogues français ont été vérifiés par transcription locale, relus et répartis par personnage. Image et voix témoin proviennent du même extrait VF. Les horodatages restent des repères de jeu, pas une mesure de synchronisation labiale au phonème. Le son témoin contient aussi musique et bruitages : il ne s’agit pas de pistes de voix isolées.</p><p>Aucune connexion externe n’est nécessaire au studio. Les fichiers restent sur cet appareil. Les prises ne sont ni envoyées ni publiées.</p>');

function waitMedia(element, event, condition, timeout = 15000) {
  if (condition()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => done(new Error('Le fichier local tarde à se charger.')), timeout);
    const ok = () => { if (condition()) done(); }; const fail = () => done(new Error('Le fichier local est absent ou illisible.'));
    function done(error) { clearTimeout(timer); element.removeEventListener(event, ok); element.removeEventListener('error', fail); error ? reject(error) : resolve(); }
    element.addEventListener(event, ok); element.addEventListener('error', fail, { once: true });
  });
}
async function selectScene(s) {
  if (busy || recording || workshop) return;
  stop(); const ticket = ++selection;
  current = s; t = 0; role = -1; capturePeaks = []; reviewPeaks = []; ready = !s.media; mediaFailure = false;
  $('#scene').hidden = !!s.media; video.hidden = !s.media; $('.scene-label').hidden = !!s.media;
  $('#sceneTitle').textContent = s.title; $('#sceneCategory').textContent = s.category;
  $('#sceneBadge').textContent = s.media ? 'VIDÉO SUR CET APPAREIL' : 'SCÈNE ORIGINALE';
  $('#tip').textContent = s.tip;
  $('#lineCounter').textContent = `${s.lines.length} répliques · ${Math.round(s.duration)} s`;
  $('#hearReference').checked = false; $('#hearReference').disabled = !s.reference;
  $('#hearBackground').disabled = !s.media;
  $('#recordTitle').textContent = 'Prêt pour ta prochaine prise ?';
  $('#script').replaceChildren(...s.lines.map((line, i) => {
    const d = document.createElement('button'); d.className = 'script-line'; d.dataset.line = i;
    d.innerHTML = `<strong>${escapeHtml(s.roles[line[2]])} · ${fmt(line[0])}</strong>${escapeHtml(line[3])}`;
    d.onclick = () => { if (!busy && !recording && !reviewing) seek(Math.max(0, line[0] - 1)); }; return d;
  }));
  renderRoles(); renderTrack(); view('studio');
  reference.pause(); reference.removeAttribute('src'); reference.load();
  if (s.reference) { reference.src = s.reference; reference.load(); }
  if (!s.media) { video.removeAttribute('src'); video.load(); status('Entraîne-toi, puis lance-toi !'); update(); return; }
  status('Chargement de la vidéo locale…'); video.src = s.media; video.load();
  try {
    await waitMedia(video, 'canplay', () => video.readyState >= 3 && Math.abs(video.duration - s.duration) < .2);
    if (ticket !== selection) return;
    ready = true; status(s.note || 'Vidéo locale prête. Écoute le modèle ou donne ta voix aux personnages.');
  } catch (e) { if (ticket === selection) { mediaFailure = true; status(e.message + ' Relance LANCER.bat depuis le dossier complet.'); } }
  update();
}
function renderRoles() {
  const roles = [['Toutes les voix', 'Joue toute la scène', '🎭'], ...current.roles.map((r, i) => [r, 'Enregistre uniquement ce personnage', current.icons[i % current.icons.length]])];
  $('#roles').replaceChildren(...roles.map((r, i) => {
    const b = document.createElement('button'); b.className = 'role' + (role === i - 1 ? ' selected' : ''); b.setAttribute('aria-pressed', role === i - 1);
    b.innerHTML = `<span class="avatar">${r[2]}</span><span><strong>${escapeHtml(r[0])}</strong><small>${r[1]}</small></span><span class="check">${role === i - 1 ? '◉' : '○'}</span>`;
    b.onclick = () => { if (busy || recording || reviewing || workshop) return; role = i - 1; renderRoles(); renderTrack(); }; return b;
  }));
}
function renderTrack() {
  measure.font = '600 22px "Segoe UI", Arial';
  pixelsPerSecond = Math.max(100, ...current.lines.map(line => (measure.measureText(line[3]).width + 18) / (line[1] - line[0])));
  $('#band').style.height = (current.roles.length * 58 + 24) + 'px';
  $('#track').replaceChildren(...current.lines.map(line => {
    const c = document.createElement('div'); c.className = 'cue';
    c.style.color = ['#cabaff', '#b8edb0', '#ffd2a1'][line[2] % 3]; c.style.opacity = role < 0 || role === line[2] ? '1' : '.25';
    c.style.top = (line[2] * 58 + 25) + 'px';
    const label = document.createElement('small'); label.textContent = current.roles[line[2]];
    const phrase = document.createElement('span'); phrase.className = 'phrase';
    line[3].split(' ').forEach(word => { const span = document.createElement('span'); span.textContent = word; phrase.append(span); });
    c.append(label, phrase); return c;
  }));
}
function lockNavigation(value) {
  document.querySelectorAll('.card,.nav,[data-view],.role,#help,#credits,.script-line,.brand').forEach(b => {
    if ('disabled' in b) b.disabled = value; else b.style.pointerEvents = value ? 'none' : '';
  });
}
function update() {
  $('#time').textContent = fmt(t); $('#duration').textContent = fmt(duration()); $('#seek').max = duration(); $('#seek').value = t;
  $('#play').textContent = playing ? 'Ⅱ' : '▶'; $('#play').disabled = busy || recording || reviewing || !ready || mediaFailure;
  $('#record').disabled = busy || reviewing || !ready || mediaFailure;
  $('#seek').disabled = $('#speed').disabled = $('#restart').disabled = busy || recording || reviewing || !ready;
  $('#monitor').disabled = busy || recording || reviewing;
  $('#hearReference').disabled = busy || recording || reviewing || !current.reference;
  $('#stopReview').hidden = !reviewing;
  document.querySelectorAll('.step').forEach((s, i) => s.classList.toggle('active', i === (reviewing ? 2 : playing || recording ? 1 : 0)));
  const anchor = $('#band').clientWidth * .22;
  document.querySelectorAll('.cue').forEach((c, i) => {
    const line = current.lines[i]; c.style.left = anchor + (line[0] - t) * pixelsPerSecond + 'px';
    c.style.fontSize = '22px';
    c.style.width = Math.max(30, (line[1] - line[0]) * pixelsPerSecond) + 'px';
  });
  document.querySelectorAll('.script-line').forEach((el, i) => el.classList.toggle('current', t >= current.lines[i][0] && t <= current.lines[i][1]));
  if (!current.media) draw();
  if (typeof guidedUpdate === 'function') guidedUpdate();
}
async function seek(position) {
  t = Math.min(duration(), Math.max(0, position));
  if (current.media && ready) {
    const target = t;
    await waitMedia(video, 'canplay', () => video.readyState >= 3);
    video.currentTime = target;
    await waitMedia(video, 'seeked', () => !video.seeking && Math.abs(video.currentTime - target) < .12);
  }
  if (current.reference && reference.readyState >= 1) reference.currentTime = t;
  update();
}
function syncBackground() { video.volume = $('#hearBackground').checked ? .55 : 0; video.muted = recording || mixedPlayback || ($('#hearReference').checked && !recording && !reviewing); }
async function syncReference() {
  if (!current.reference || !$('#hearReference').checked || recording || reviewing || !playing) { reference.pause(); syncBackground(); return; }
  await waitMedia(reference, 'loadeddata', () => reference.readyState >= 2);
  reference.playbackRate = rate; reference.currentTime = t; syncBackground(); await reference.play();
}
async function start() {
  if (!ready || mediaFailure) return;
  try {
    if (t >= duration() - .03) await seek(0);
    if (current.media) { video.playbackRate = rate; syncBackground(); await video.play(); }
    playing = true; last = performance.now(); await syncReference();
  } catch (e) { stop(); status('Lecture impossible : ' + e.message); }
  update();
}
function stop() {
  if(workshop?.capture)clearInterval(workshop.capture.timer);
  modelGeneration++;
  clearInterval(modelTimer); modelTimer = null;
  if (modelLoading) { modelLoading = false; busy = false; }
  segmentEnd = null; mixedPlayback = false; playing = false; video.pause(); reference.pause();
  if (pendingReview) { pendingReview.pause(); pendingReview = null; }
  reviewing = false; reviewSource?.disconnect(); reviewSource = null;
  if (!stream) $('#meterLabel').textContent = 'Micro éteint';
  if (recording) endRecording();
  if (!busy && !workshop) lockNavigation(false);
  update();
}
$('#play').onclick = () => playing ? stop() : start();
$('#restart').onclick = () => { stop(); seek(0).catch(e => status(e.message)); };
$('#seek').oninput = e => seek(Number(e.target.value)).catch(err => status(err.message));
$('#speed').onchange = e => { rate = Number(e.target.value); video.playbackRate = rate; reference.playbackRate = rate; };
$('#hearReference').onchange = () => syncReference().catch(e => { $('#hearReference').checked = false; syncBackground(); status(e.message); });
$('#hearBackground').onchange = syncBackground;
$('#stopReview').onclick = () => { stop(); status('Réécoute arrêtée. Tu peux refaire une prise.'); };
video.addEventListener('ended', () => {
  if(recording || (reviewing && pendingReview?.timeline))return;
  if (playing && current.media && video.currentTime >= duration() - .15) { t = duration(); stop(); }
});
video.addEventListener('error', () => { if (current.media && video.getAttribute('src')) { mediaFailure = true; stop(); status('Vidéo locale illisible ou manquante.'); } });

async function setupAudio() {
  if (!audioContext) {
    audioContext = new AudioContext(); analyser = audioContext.createAnalyser(); analyser.fftSize = 2048;
    referenceSource = audioContext.createMediaElementSource(reference); referenceSource.connect(audioContext.destination);
  }
  await audioContext.resume();
}
async function openMic() {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Le micro nécessite localhost ou HTTPS et un navigateur récent.');
  await setupAudio();
  if (!stream) {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } });
    micSource = audioContext.createMediaStreamSource(stream); micSource.connect(analyser);
  }
  $('#meterLabel').textContent = 'Micro actif';
}
function closeMic() {
  stream?.getTracks().forEach(track => track.stop()); stream = null; micSource?.disconnect(); micSource = null;
  monitoring = false; $('#monitor').textContent = 'Tester mon micro'; $('#meterLabel').textContent = 'Micro éteint'; liveLevel = 0;
}
$('#monitor').onclick = async () => {
  if (stream) { closeMic(); return; }
  busy = true; lockNavigation(true); update();
  try { await openMic(); monitoring = true; $('#monitor').textContent = 'Couper le micro'; status('Parle : la courbe réagit au son. Rien n’est enregistré.'); }
  catch (e) { closeMic(); status('Micro indisponible : ' + e.message); }
  finally { busy = false; lockNavigation(false); update(); }
};
$('#record').onclick = () => beginWorkshop().catch(e => status(e.message));
function endRecording() {
  recording = false; busy = true;
  if (recorder && recorder.state !== 'inactive') recorder.stop();
}
async function replay(take) {
  closeMic(); document.querySelectorAll('#takes audio').forEach(a => a.pause());
  await selectScene(take.scene);
  if (!ready || mediaFailure) return;
  busy = true; lockNavigation(true); update();
  try {
    await setupAudio(); rate = take.rate; $('#speed').value = rate; role = take.role;
    renderRoles(); renderTrack(); reviewPeaks = take.peaks; await seek(take.start);
    const audio = new Audio(take.url); pendingReview = audio;
    reviewSource = audioContext.createMediaElementSource(audio); reviewSource.connect(analyser); reviewSource.connect(audioContext.destination);
    await waitMedia(audio, 'canplay', () => audio.readyState >= 3);
    $('#hearReference').checked = false; reference.pause(); reviewing = true; busy = false; mixedPlayback = !!take.mixed;
    audio.timeline=take.timeline;audio.mixDuration=take.length;
    if (current.media) { video.playbackRate = rate; syncBackground(); if(!take.timeline?.[0]?.hold)await video.play(); }
    await audio.play(); playing = true; last = performance.now();
    pendingReview.sceneStart = take.start;
    audio.onended = () => { stop(); status('Fin de ta prise. À toi de rejouer !'); };
    audio.onerror = () => { stop(); status('Cette prise ne peut pas être décodée par le navigateur.'); };
    status('Ta voix + la scène locale. Tu peux arrêter la réécoute à tout moment.');
  } catch (e) { busy = false; stop(); status('Réécoute impossible : ' + e.message); }
  update();
}
function renderTakes() {
  $('#takeCount').textContent = takes.length; $('#takes').replaceChildren();
  if (!takes.length) { $('#takes').innerHTML = '<div class="empty"><h3>Aucune prise pour le moment.</h3><p>Enregistre ta prochaine histoire au studio !</p></div>'; return; }
  takes.forEach((take, i) => {
    const d = document.createElement('div'); d.className = 'take';
    const info = document.createElement('div');
    info.innerHTML = `<h3>${escapeHtml(take.scene.title)}</h3><p>Prise ${takes.length - i} · ${escapeHtml(take.role < 0 ? 'Toutes les voix' : take.scene.roles[take.role])} · ${take.rate}×</p>`;
    const audio = document.createElement('audio'); audio.controls = true; audio.src = take.url;
    audio.onplay = () => document.querySelectorAll('#takes audio').forEach(a => { if (a !== audio) a.pause(); });
    const review = document.createElement('button'); review.textContent = 'Rejouer avec la scène'; review.onclick = () => replay(take);
    const a = document.createElement('a'); a.href = take.url;
    a.download = `ritmo-${take.scene.id}-${take.id}.${take.type.includes('wav') ? 'wav' : take.type.includes('mp4') ? 'm4a' : take.type.includes('ogg') ? 'ogg' : 'webm'}`; a.textContent = 'Télécharger l’audio ↓';
    const del = document.createElement('button'); del.textContent = 'Supprimer'; del.onclick = () => { audio.pause(); URL.revokeObjectURL(take.url); takes = takes.filter(x => x !== take); renderTakes(); };
    d.append(info, audio, review, a, del); $('#takes').append(d);
  });
}

function drawWaveforms() {
  const live = $('#liveWave'), g = live.getContext('2d'), w = live.width, h = live.height;
  g.clearRect(0, 0, w, h); g.strokeStyle = '#ffffff12'; g.lineWidth = 1;
  for (let x = 0; x <= w; x += 45) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  let peak = 0, sum = 0;
  if (analyser && (stream || reviewing)) {
    analyser.getFloatTimeDomainData(waveform);
    for (const v of waveform) { peak = Math.max(peak, Math.abs(v)); sum += v * v; }
    liveLevel = Math.sqrt(sum / waveform.length);
    g.strokeStyle = peak > .98 ? '#ff8a9e' : '#b8edb0'; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i < waveform.length; i++) { const y = h / 2 - Math.max(-1, Math.min(1, waveform[i] * 2)) * h * .45; i ? g.lineTo(i * w / waveform.length, y) : g.moveTo(0, y); }
    g.stroke();
    $('#meterLabel').textContent = (reviewing ? 'Ta prise' : 'Micro actif') + ' · ' + (liveLevel > .00001 ? Math.round(20 * Math.log10(liveLevel)) + ' dBFS' : 'silence') + (peak > .98 ? ' · trop fort' : '');
  } else { g.strokeStyle = '#62647c'; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke(); }
  if (recording) { const index = Math.floor(t * 25); capturePeaks[index] = Math.max(capturePeaks[index] || 0, peak); activePeakIndex = index; }
  if(typeof capturePeak==='function')capturePeak(peak);
  const canvas = $('#timelineWave'), a = canvas.getContext('2d'), width = canvas.width;
  a.clearRect(0, 0, width, canvas.height);
  function envelope(values, color, center, scale = 1) {
    a.strokeStyle = color; a.lineWidth = 1.2;
    for (let x = 0; x < width; x += 2) {
      const graphDuration=reviewing && pendingReview?.timeline && values===reviewPeaks?pendingReview.mixDuration:duration();
      const index = Math.floor(x / width * graphDuration * 25), v = Math.min(1, (values[index] || 0) * scale);
      a.beginPath(); a.moveTo(x, center - v * 20); a.lineTo(x, center + Math.max(.5, v * 20)); a.stroke();
    }
  }
  envelope(current.peaks || [], '#b4a0ff', 25); envelope(reviewing ? reviewPeaks : capturePeaks, '#b8edb0', 75, 2);
  a.strokeStyle = '#fff'; a.beginPath(); a.moveTo(t / duration() * width, 0); a.lineTo(t / duration() * width, 50); a.stroke();
  const takeCursor=reviewing && pendingReview?.timeline?pendingReview.currentTime/pendingReview.mixDuration:t/duration();
  a.beginPath();a.moveTo(takeCursor*width,50);a.lineTo(takeCursor*width,100);a.stroke();
  $('#waveHint').textContent = current.peaks ? 'Même chronologie : le témoin en haut, ta voix en bas.' : 'Pas de voix témoin dans cette mini-animation.';
  if(reviewing && pendingReview?.timeline)$('#waveHint').textContent='Montage avec pauses : le modèle en haut, le montage complet en bas.';
  if(typeof drawPhraseWave==='function')drawPhraseWave();
}
function frame(now) {
  if (playing) {
    if (reviewing && pendingReview) {
      const position=pendingReview.timeline?montagePosition(pendingReview.timeline,pendingReview.currentTime):null;
      const target = position?position.time:(pendingReview.sceneStart || 0) + pendingReview.currentTime * rate;
      if (current.media) {
        if(position?.hold)video.pause();
        else if(video.paused && !video.ended)video.play().catch(e=>{stop();status(e.message);});
        if (video.readyState < 3 && !video.ended) pendingReview.pause();
        else if (pendingReview.paused && !pendingReview.ended) pendingReview.play().catch(e => { stop(); status(e.message); });
        if (!video.seeking && Math.abs(video.currentTime - target) > .14) video.currentTime = target;
      }
      t = target;
    } else if (current.media) t = video.currentTime;
    else t += Math.min((now - last) / 1000, .1) * rate;
    if (!reference.paused && current.reference && Math.abs(reference.currentTime - t) > .16) reference.currentTime = t;
    if (segmentEnd !== null && t >= segmentEnd) { t = segmentEnd; pauseSegment(); }
    if (t >= duration() && !pendingReview?.timeline) { t = duration(); stop(); }
  }
  last = now; update(); drawWaveforms(); requestAnimationFrame(frame);
}
window.addEventListener('pagehide', () => { closeMic(); takes.forEach(take => URL.revokeObjectURL(take.url)); });
selectScene(scenes[0]); requestAnimationFrame(frame);

