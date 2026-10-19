// PCM is captured and timestamped on the audio thread. The waveform uses
// the same samples and indices, never the main thread's display clock.
class PhraseCapture extends AudioWorkletProcessor {
  constructor() {
    super();this.active=false;
    this.port.onmessage=({data})=>{
      if(data.type==='start'){
        this.samples=new Float32Array(data.frames);this.startFrame=currentFrame+256;
        this.last=0;this.bucket=-1;this.peak=0;this.active=true;
        this.port.postMessage({type:'started',startFrame:this.startFrame,sampleRate});
      } else if(data.type==='stop' && this.active)this.finish();
    };
  }
  flushPeak(){if(this.bucket>=0)this.port.postMessage({type:'peak',index:this.bucket,value:this.peak});}
  finish(){
    this.flushPeak();this.active=false;
    const samples=this.samples.subarray(0,this.last);
    this.port.postMessage({type:'complete',samples,sampleRate},[this.samples.buffer]);
    this.samples=null;
  }
  process(inputs,outputs){
    // Output remains silent; the microphone is never fed back to the speakers.
    const blockLength=outputs[0]?.[0]?.length||128,input=inputs[0]?.[0];
    if(!this.active)return true;
    for(let j=0;j<blockLength;j++){
      const index=currentFrame+j-this.startFrame;
      if(index<0)continue;
      if(index>=this.samples.length){this.finish();break;}
      const sample=input?.[j]||0,bucket=Math.floor(index/sampleRate*50);
      if(bucket!==this.bucket){this.flushPeak();this.bucket=bucket;this.peak=0;}
      this.samples[index]=sample;this.last=index+1;this.peak=Math.max(this.peak,Math.abs(sample));
    }
    return true;
  }
}
registerProcessor('phrase-pcm',PhraseCapture);

