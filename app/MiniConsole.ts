import WorkerInterface from './WorkerInterface';

export default class MiniConsole {

    private shown: boolean;
    private input:HTMLInputElement;
    private output: HTMLUListElement;
    private outputCount: number;
    private hider: NodeJS.Timer;
    private history: Array<string>;
    private historyIndex: number;
    private currentText: string;
    private workerInterface: WorkerInterface;

    constructor (worker: WorkerInterface) {
        this.shown = false;
        this.input = <HTMLInputElement>document.querySelector('.miniConsoleInput');
        this.output = <HTMLUListElement>document.querySelector('.miniConsoleOutput ul');
        this.outputCount = 0;
        this.hider = null;
        this.history = [];
        this.historyIndex = -1;
        this.currentText = "";
        this.workerInterface = worker;
    }

    handleEvent(event: any) {

        if (this.shown) {
            // Up Arrow
            if (event.keyCode === 38 || event.keyCode === 40) event.preventDefault();
            if (event.keyCode === 38 && this.history.length > this.historyIndex + 1) {
                if (this.historyIndex == -1) {
                    this.currentText = this.input.value;
                }
                this.input.value = this.history[++this.historyIndex];
            }
            // Down Arrow
            if (event.keyCode === 40 && this.historyIndex >= 0) {
                this.historyIndex--;
                if (this.historyIndex == -1) {
                    this.input.value = this.currentText;
                } else if (this.historyIndex >= 0) {
                    this.input.value = this.history[this.historyIndex];
                }
            }
        }
    }

    toggle(clearBeforeToggle?: boolean) {
        if ((<any>window).blockMovement && !this.shown) {
            return;
        }
        this.input.style.display = this.shown ? "none" : "block";
        if (!this.shown) {
            // If we hit enter and it was hidden, clear any impending hides
            if (this.hider) {
                clearTimeout(this.hider);
            }
            this.output.style.display = "block";
            this.input.focus();
            (<any>window).blockMovement = true;
            this.shown = true;
        } else {
            // If we hit enter and it was on-screen
            var script = this.input.value;
            this.input.value = "";
            this.input.blur();
            this.shown = false;
            (<any>window).blockMovement = false;
            if (script.length > 0) {
                this.history.unshift(script);
                if (clearBeforeToggle) {
                    this.output.style.display = "none";
                    return;
                }
                const res = this.workerInterface.runScript(script, true);
                if (res instanceof Promise) {
                    return res.then((res: any) => {
                        this.addOutput(res.result);
                        console.log(res.result);
                    });
                }
            } else {
                this.output.style.display = "none";
            }
        }
    }

    addOutput(result: string) {
        if (!result || result === "") return;
        var line = document.createElement("li");
        line.innerText = result;
        this.output.appendChild(line);
        // Hide output after 5 seconds
        if (this.hider) {
            clearTimeout(this.hider);
        }
        this.hider = setTimeout(() => {
            this.output.style.display = "none";
        }, 5000);
        // If we have more than 6 outputs, remove the top one
        if (this.outputCount++ > 5) {
            var oldestChild: HTMLLIElement = <HTMLLIElement>this.output.querySelector("li");
            this.output.removeChild(oldestChild);
            this.outputCount--;
        }
        // Ensure the last line is visible when new output is displayed
        this.output.scrollTop = this.output.scrollHeight;
        return;
    }

    isShown () {
        return this.shown;
    }
}