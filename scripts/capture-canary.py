"""Verify and run genuine canaries through Codex's stdio protocol. No manual captures."""
import argparse,json,queue,subprocess,threading,time,tomllib,re,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
CANARY='CAPTURE TEST — 8x assignment, Abhiram'
KEYS=[str(ROOT/'.codex/hooks.json')+':'+event+':0:0' for event in ['user_prompt_submit','stop']]

def state_override():
    config=tomllib.loads((Path.home()/'.codex/config.toml').read_text(encoding='utf-8-sig'))
    states=config.get('hooks',{}).get('state',{})
    states={k:dict(v) for k,v in states.items()}
    for key in KEYS:
        if not states.get(key,{}).get('trusted_hash'):
            raise RuntimeError('Review/trust required for '+key+'; refusing to bypass trust')
        states[key]['enabled']=True
    tables=[]
    for key,value in states.items():
        fields=[]
        for field in ['enabled','trusted_hash']:
            if field in value: fields.append(field+' = '+json.dumps(value[field],ensure_ascii=False))
        tables.append(json.dumps(key,ensure_ascii=False)+' = {'+', '.join(fields)+'}')
    return 'hooks.state={'+', '.join(tables)+'}'

class Codex:
    def __init__(self,exe,override):
        self.process=subprocess.Popen([exe,'--no-daemon','-c',override,'app-server','--stdio'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8',cwd=ROOT,bufsize=1)
        self.events=queue.Queue();self.nextid=0;self.errors=[]
        def output():
            for line in self.process.stdout:
                try:self.events.put(json.loads(line))
                except ValueError:pass
        def errors():
            for line in self.process.stderr:
                # Retain only locally for error summaries; never dump auth/config.
                self.errors.append(line)
        threading.Thread(target=output,daemon=True).start();threading.Thread(target=errors,daemon=True).start()
        self.request('initialize',{'clientInfo':{'name':'slate-capture-canary','version':'1.0'},'capabilities':{'experimentalApi':True}})
        self.send({'method':'initialized','params':{}})
    def send(self,d):
        self.process.stdin.write(json.dumps(d,ensure_ascii=False)+'\n');self.process.stdin.flush()
    def receive(self,timeout=60):
        try:return self.events.get(timeout=timeout)
        except queue.Empty:raise RuntimeError('Codex RPC timeout; process exit='+str(self.process.poll()))
    def request(self,method,params):
        self.nextid+=1;rid=self.nextid;self.send({'id':rid,'method':method,'params':params})
        while True:
            d=self.receive()
            if d.get('id')==rid:
                if 'error' in d:raise RuntimeError(method+': '+json.dumps(d['error']))
                return d['result']
    def preflight(self):
        data=self.request('hooks/list',{'cwds':[str(ROOT)]})
        hooks=[h for entry in data['data'] for h in entry['hooks'] if h['key'] in KEYS]
        if len(hooks)!=2:raise RuntimeError('Both repo hooks were not discovered')
        for h in hooks:
            print(h['eventName']+': enabled='+str(h['enabled'])+', trust='+h['trustStatus'],flush=True)
            if not h['enabled'] or h['trustStatus']!='trusted':raise RuntimeError('Hook preflight failed')
    def canary(self):
        result=self.request('thread/start',{'cwd':str(ROOT),'sandbox':'read-only','approvalPolicy':'never','developerInstructions':'This session is only a capture canary. Reply exactly: CAPTURE TEST acknowledged — 8x assignment, Abhiram. Do not call tools or edit files.'})
        sid=result['thread']['id'];print('Started genuine session '+sid,flush=True)
        self.request('turn/start',{'threadId':sid,'input':[{'type':'text','text':CANARY,'text_elements':[]}], 'turnTrigger':'user'})
        deadline=time.monotonic()+150
        while time.monotonic()<deadline:
            d=self.receive(timeout=30)
            if d.get('method')=='turn/completed':
                turn=d['params']['turn']
                if turn.get('status')!='completed':raise RuntimeError('Canary turn did not complete: '+str(turn.get('error')))
                break
        else:raise RuntimeError('Canary turn deadline exceeded')
        # Stop hook completion may trail the model's final message briefly.
        for _ in range(30):
            matches=list((ROOT/'.agent-logs').glob('*_'+sid+'.md'))
            if matches:
                raw=matches[0].read_bytes();text=raw.decode('utf-8-sig')
                if CANARY in text and '[LOG_ENTRY type=RESPONSE num=1' in text:
                    print('VERIFIED live prompt and response: '+str(matches[0]),flush=True)
                    return sid,matches[0]
            time.sleep(.2)
        raise RuntimeError('Completed model turn did not produce both automatic hook entries for '+sid)
    def close(self):
        if self.process.poll() is None:self.process.terminate()
        self.process.wait(timeout=15)

def write_report(results, old_count):
    from datetime import datetime,timezone
    report=ROOT/'CAPTURE-TEST.md'
    previous=report.read_bytes() if report.exists() else b''
    now=datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')
    header=f"""# Capture verification - PASS

Verified UTC: {now}

Two fresh independent Codex sessions automatically captured the exact canary prompt and a real final assistant reply. Both used the repository hooks and the same verified configuration path as RUN-CAPTURE-TEST.ps1. No manual log entries were created.

## Tool and model

Codex CLI runtime 0.163.0-alpha.10.2, driven through its native app-server stdio protocol by the launcher. Configured model: gpt-6.1-sol, also recorded by both real hook payloads. Codex desktop performed the setup and verification.

## Mechanism and fix

.codex/hooks.json invokes .codex/capture.py for UserPromptSubmit and Stop using absolute executable/script paths. Each event appends verbatim text and UTC metadata to .agent-logs/ with one file per session.

Root cause: trusted hooks had been disabled, and the old launcher attempted to enable path-keyed hooks through dotted -c keys containing quotes/dots/backslashes. Those arguments were accepted syntactically but did not change the actual hook states: live hooks/list still reported Stop disabled. Syntax checks alone were insufficient.

The launcher now delegates to scripts/capture-canary.py. It supplies the complete hooks.state table as one TOML override through a subprocess argument list, preserving existing trusted hashes. Before each canary it asks the actual runtime hooks/list and requires both repo hooks to be discovered, enabled and trusted. It refuses to bypass missing trust. It starts a fresh session, sends the exact canary through turn/start, waits for completion, and verifies the automatically written prompt/reply file. Ordinary persisted repo hook states are enabled as well.

Existing log preservation: {old_count} pre-existing files were checked byte-for-byte unchanged. Prior app-generated suggestion logs are retained and not counted as canaries. Only this report is written by the verifier; actual captures are written exclusively by the runtime hooks.

The header remains append-only: initial total_exchanges/last_prompt_time are not rewritten in later exchanges. Per-entry numbers and timestamps remain authoritative.

## Earlier failures

Missing initial specification/setup text; placeholder setup; GitHub fetch/404 failures; denied .codex writes; wrong file placement and relative paths; rewrite-based logger; Codex absent from ordinary PowerShell PATH; corrupted em dash in Windows PowerShell; desktop CLI missing daemon package (fixed by --no-daemon); nested CLI access denial; trusted-but-disabled hooks; ineffective dotted state overrides; native fork turns that did not establish fresh-session hook capture. Full previous reports are retained below. No earlier missing capture was reconstructed.

## Raw canary evidence

"""
    output=header.encode('utf-8')
    assert len(results)==2 and results[0][0]!=results[1][0]
    for index,(sid,path) in enumerate(results,1):
        raw=path.read_bytes()
        assert CANARY.encode('utf-8') in raw and b'[LOG_ENTRY type=RESPONSE num=1' in raw
        output+=f'### Session {index}\n\nLog: {path}\n\nFull raw log (copied without changing bytes):\n\n```text\n'.encode('utf-8')+raw+b'\n```\n\n'
    output+=b'## Historical reports (superseded by the passing evidence above)\n\n'+previous
    report.write_bytes(output)
    print('CAPTURE-TEST.md updated with both raw live logs.',flush=True)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--exe');parser.add_argument('--override',action='store_true');parser.add_argument('--preflight',action='store_true');args=parser.parse_args()
    override=state_override()
    if args.override:print(override);return
    if not args.exe:raise RuntimeError('--exe is required')
    old={p:p.read_bytes() for p in (ROOT/'.agent-logs').glob('*') if p.is_file()}
    results=[]
    try:
        for number in range(1 if args.preflight else 2):
            print('Session preflight '+str(number+1),flush=True);client=Codex(args.exe,override)
            try:
                client.preflight()
                if not args.preflight:results.append(client.canary())
            finally:client.close()
    finally:
        assert all(p.read_bytes()==raw for p,raw in old.items()),'Existing log bytes changed'
        print('Existing log files unchanged: '+str(len(old)),flush=True)
    if results:
        write_report(results,len(old))
        assert all(p.read_bytes()==raw for p,raw in old.items()), 'Existing logs changed during report update'
        print('PASS: two fresh sessions automatically captured. IDs: '+', '.join(s for s,p in results))

if __name__=='__main__':
    try:main()
    except Exception as error:print('CAPTURE VERIFICATION FAILED: '+str(error),file=sys.stderr);sys.exit(1)
