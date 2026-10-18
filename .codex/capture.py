"""8x capture: stdin JSON -> append-only repo-local Markdown. No network."""
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOG_DIR = ROOT / '.agent-logs'


def capture(data, event):
    field = {'UserPromptSubmit': 'prompt', 'Stop': 'last_assistant_message'}[event]
    sid, model, body = data['session_id'], data['model'], data[field]
    if not isinstance(sid, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,128}', sid):
        raise ValueError('Missing or invalid session_id')
    if not isinstance(model, str) or not model or any(c in model for c in '\r\n'):
        raise ValueError('Missing or invalid model')
    if not isinstance(body, str) or (event == 'Stop' and not body):
        raise ValueError('Missing prompt/final response text')
    if LOG_DIR.is_symlink() or LOG_DIR.resolve() != ROOT / '.agent-logs':
        raise ValueError('Log directory must stay inside repo')
    LOG_DIR.mkdir(exist_ok=True)
    paths = sorted(LOG_DIR.glob(f'*_{sid}.md'))
    if len(paths) > 1:
        raise ValueError('Multiple files for session; refusing ambiguous capture')
    now = datetime.now(timezone.utc)
    timestamp = now.isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    day, short = now.strftime('%Y-%m-%d'), sid[:8]
    path = paths[0] if paths else LOG_DIR / f'{now:%Y-%m-%d_%H-%M-%S}_{sid}.md'
    if path.is_symlink() or path.resolve().parent != LOG_DIR.resolve():
        raise ValueError('Log path must stay inside repo')
    prior = path.read_bytes() if path.exists() else b''
    prompts = re.findall(rb'^\[LOG_ENTRY type=PROMPT num=(\d+) session=' + short.encode() + rb'\]\r?$', prior, re.M)
    number = int(prompts[-1]) if prompts else 0
    kind = 'PROMPT' if event == 'UserPromptSubmit' else 'RESPONSE'
    if kind == 'PROMPT':
        number += 1
    elif number == 0:
        raise ValueError('No captured prompt for this session; run a new turn after trusting hooks')
    header = ''
    if not prior:
        header = (f'---\nsession_id: {sid}\ndate: {day}\nauthor: abhiramArise\n'
                  f'model: {model}\ntool: codex\nproject: slate\ntotal_exchanges: 1\n'
                  f'first_prompt_time: {timestamp}\nlast_prompt_time: {timestamp}\n---\n\n'
                  f'# Session Log - {day}\n\nSession: `{short}` | Project: `slate` | Author: `abhiramArise`\n\n---\n\n')
    entry = f'[LOG_ENTRY type={kind} num={number} session={short}]\ntimestamp: {timestamp}\nmodel: {model}\n\n{body}\n\n\n'
    # Binary append preserves every pre-existing byte and the input line endings.
    with path.open('ab') as stream:
        stream.write((header + entry).encode('utf-8'))
        stream.flush()


def main():
    try:
        data = json.loads(sys.stdin.buffer.read().decode('utf-8-sig'))
        event = sys.argv[1] if len(sys.argv) > 1 else data['hook_event_name']
        capture(data, event)
    except Exception as error:
        print(f'8x capture failed: {type(error).__name__}: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
