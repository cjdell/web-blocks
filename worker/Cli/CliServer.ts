/// <reference path="../../typings/index.d.ts" />
import ScriptRunner from '../ScriptRunner';

export default class CliServer {
  scriptRunner: ScriptRunner;

  cliSocket: WebSocket;

  constructor(scriptRunner: ScriptRunner) {
    this.scriptRunner = scriptRunner;

    setInterval(() => this.retryConnection(), 5000);
  }

  retryConnection() {
    if (this.cliSocket) return;

    this.cliSocket = new WebSocket("ws://localhost:8001/", []);

    this.cliSocket.onopen = e => {
      console.log('CLI: Client connected');
      console.time('CLI: Client connected duration');

      // this.cliSocket.send('hello cli');
    };

    this.cliSocket.onerror = e => {
      this.cliSocket.close();
      this.cliSocket = null;

      setTimeout(() => this.retryConnection, 1000);
    };

    this.cliSocket.onclose = e => {
      console.timeEnd('CLI: Client connected duration');

      this.cliSocket = null;
    };

    this.cliSocket.onmessage = e => {
      this.runCommand(e.data);
    };
  }

  respond(response: string) {
    this.cliSocket.send(response);
  }

  runCommand(cmd: string) {
    // this.respond(cmd.toUpperCase());

    const answer = this.scriptRunner.run(cmd, true);

    this.respond(answer);
  }
}

