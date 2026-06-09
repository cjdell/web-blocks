/// <reference path="../typings/index.d.ts" />
import { WebSocketServer } from 'ws';
import readline from 'node:readline';

const wss = new WebSocketServer({ port: 8001 });

console.log('Awaiting incoming connection...');

wss.on('connection', (ws) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = () => {
    rl.question('[Web Blocks]: ', (cmd: string) => {
      ws.send(cmd);
    });
  };

  ws.on('message', (message) => {
    console.log('= %s', message);

    question();
  });

  question();
});
