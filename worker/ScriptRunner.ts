"use strict";
import Api from './Api';

export default class ScriptRunner {
  api: Api;

  constructor(api: Api) {
    this.api = api;
  }

  run(code: string, expr: boolean): string {
    var toRun:Array<string> = [];

    Object.keys(Api.prototype).forEach(function(key) {
      if (Api.prototype[key] instanceof Function) {
        toRun.push('var ' + key + ' = context.' + key + '.bind(context);\n');
      } else {
        toRun.push('var ' + key + ' = context.' + key + ';\n');
      }
    });

    if (expr) {
      toRun.push('return (' + code.split(/^var | var |;/).join('') + ');');
    } else {
      toRun.push(code);
    }

    this.api.clearIntervals();

    return this.evaluate(toRun, code, false);
  }

  evaluate(toRun: Array<string>, code: string, retried: boolean):string {
    try {
      var func = new Function('context', toRun.join(''));

      var res = func(this.api);

      if (typeof res !== 'undefined') {
        if (res instanceof Promise) return res;

        if (typeof res === 'object') return JSON.stringify(res);

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
