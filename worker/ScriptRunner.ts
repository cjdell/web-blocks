import Api from './Api';

export default class ScriptRunner {
  api: Api;

  constructor(api: Api) {
    this.api = api;
  }

  run(code: string, expr: boolean): string {
    const toRun: string[] = [];

    Object.keys(Api.prototype).forEach(key => {
      if (Api.prototype[key] instanceof Function) {
        toRun.push('const ' + key + ' = context.' + key + '.bind(context);\n');
      } else {
        toRun.push('const ' + key + ' = context.' + key + ';\n');
      }
    });

    if (expr) {
      toRun.push('return (' + code.split(/^const | const |;/).join('') + ');');
    } else {
      toRun.push(code);
    }

    this.api.clearIntervals();
    this.api.clearTimeouts();

    return this.evaluate(toRun, code, false);
  }

  evaluate(toRun: string[], code: string, retried: boolean): string {
    try {
      const func = new Function('context', toRun.join(''));

      const res = func(this.api);

      if (typeof res !== 'undefined') {
        if (res instanceof Promise) {
          return res;
        }

        if (typeof res === 'object') {
          return JSON.stringify(res);
        }

        return res.toString();
      }
    } catch (err) {
      if (!retried) {
        toRun.pop();
        toRun.push(code);
        return this.evaluate(toRun, code, true);
      }

      console.error('parse error', err);

      return err.message;
    }

    return '';
  }
}
