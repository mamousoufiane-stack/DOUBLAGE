"""Local static server with byte-range support for seeking in video/audio."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import re, os, webbrowser, threading, sys

ROOT=Path(__file__).resolve().parent/'dist'

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def send_head(self):
        self.byte_range=None
        path=Path(self.translate_path(self.path))
        try:path.resolve().relative_to(ROOT.resolve())
        except ValueError:
            self.send_error(403);return None
        header=self.headers.get('Range')
        if not header or not path.is_file():return super().send_head()
        size=path.stat().st_size
        match=re.fullmatch(r'bytes=(\d*)-(\d*)',header)
        if not match or not any(match.groups()):
            self.send_error(416);return None
        first,last=match.groups()
        start=int(first) if first else max(0,size-int(last))
        end=min(int(last),size-1) if first and last else size-1
        if start>=size or start>end:
            self.send_response(416);self.send_header('Content-Range',f'bytes */{size}');self.end_headers();return None
        f=path.open('rb');f.seek(start)
        self.send_response(206);self.send_header('Content-Type',self.guess_type(str(path)))
        self.send_header('Content-Length',str(end-start+1));self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
        self.send_header('Accept-Ranges','bytes');self.end_headers();self.byte_range=(start,end);return f
    def copyfile(self,source,outputfile):
        try:
            if self.byte_range is None:return super().copyfile(source,outputfile)
            remaining=self.byte_range[1]-self.byte_range[0]+1
            while remaining:
                block=source.read(min(65536,remaining))
                if not block:break
                outputfile.write(block);remaining-=len(block)
        except (BrokenPipeError,ConnectionResetError,ConnectionAbortedError):pass
    def end_headers(self):
        self.send_header('Cache-Control','no-cache');super().end_headers()

if __name__=='__main__':
    try:
        server=ThreadingHTTPServer(('127.0.0.1',8767),Handler)
    except OSError:
        print('Le port 8767 est deja occupe. Fermez l ancien serveur Ritmo et relancez.');sys.exit(1)
    print('Ritmo local : http://localhost:8767',flush=True)
    if '--open' in sys.argv:threading.Timer(.5,lambda:webbrowser.open('http://localhost:8767')).start()
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()
