'use strict';
let captureModule = null;
async function createPcmRecorder(context, source) {
  if(!context.audioWorklet)throw Error('L’enregistrement précis nécessite une version récente de Chrome, Edge, Firefox ou Safari.');
  if(!captureModule)captureModule=context.audioWorklet.addModule('pcm-capture.js?v=20261019-audio1').catch(e=>{captureModule=null;throw e;});
  await withMediaTimeout(captureModule);
  const node=new AudioWorkletNode(context,'phrase-pcm',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]});
  source.connect(node);node.connect(context.destination);
  let resolveStart,rejectStart,timer;
  const recorder={
    state:'inactive',nativeClock:true,onstop:null,onerror:null,onpeak:null,
    start(seconds){
      this.state='recording';
      return new Promise((resolve,reject)=>{
        resolveStart=resolve;rejectStart=reject;
        timer=setTimeout(()=>{this.dispose();reject(Error('Le micro tarde à démarrer. Réessaie.'));},5000);
        node.port.postMessage({type:'start',frames:Math.round(seconds*context.sampleRate)});
      });
    },
    stop(){if(this.state==='recording'){this.state='stopping';node.port.postMessage({type:'stop'});}},
    dispose(){clearTimeout(timer);try{source.disconnect(node);}catch{}node.disconnect();node.port.onmessage=null;this.state='inactive';}
  };
  node.port.onmessage=({data})=>{
    if(data.type==='started'){clearTimeout(timer);resolveStart(data.startFrame/data.sampleRate);}
    else if(data.type==='peak')recorder.onpeak?.(data.index,data.value);
    else if(data.type==='complete'){recorder.dispose();recorder.onstop?.(data);}
  };
  node.onprocessorerror=()=>{recorder.dispose();const error=Error('Le micro a été interrompu. Recommence cette phrase.');rejectStart?.(error);recorder.onerror?.(error);};
  return recorder;
}

