import ScriptRunner from '../ScriptRunner';

export default class CliServer {
  scriptRunner: ScriptRunner;

  // null while disconnected; retryConnection() reconnects every 5 s.
  cliSocket: WebSocket | null = null;

  constructor(scriptRunner: ScriptRunner) {
    this.scriptRunner = scriptRunner;

    setInterval(() => this.retryConnection(), 5000);
  }

  retryConnection() {
    if (this.cliSocket) return;

    // The handlers close over the socket locally: property narrowing does
    // not cross function boundaries.
    const cliSocket = new WebSocket('ws://localhost:8001/', []);
    this.cliSocket = cliSocket;

    cliSocket.onopen = (_e) => {
      console.log('CLI: Client connected');
      console.time('CLI: Client connected duration');

      // this.cliSocket.send('hello cli');
    };

    cliSocket.onerror = (_e) => {
      cliSocket.close();
      this.cliSocket = null;

      setTimeout(() => this.retryConnection, 1000);
    };

    cliSocket.onclose = (_e) => {
      console.timeEnd('CLI: Client connected duration');

      this.cliSocket = null;
    };

    cliSocket.onmessage = (e) => {
      this.runCommand(e.data);
    };
  }

  respond(response: string) {
    // respond() is only invoked from onmessage, when the socket is open;
    // the assertion keeps the old throw-on-null behaviour exactly.
    this.cliSocket!.send(response);
  }

  runCommand(cmd: string) {
    // this.respond(cmd.toUpperCase());

    const answer = this.scriptRunner.run(cmd, true);

    this.respond(answer);
  }
}
