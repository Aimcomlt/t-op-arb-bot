import WebSocket from 'ws';

const URL = 'ws://localhost:8081/stream';
const TOKEN = '899d8f3562620257840f70403fd052fb868fc923c3712ba99247bc383338e222';

const ws = new WebSocket(URL, {
  headers: { Authorization: `Bearer ${TOKEN}` },
});

ws.on('open', () => console.log('OPEN'));
ws.on('close', (code, reason) => console.log('CLOSE', code, reason?.toString()));
ws.on('error', (err) => console.error('ERROR', err));
