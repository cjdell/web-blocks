import Api from './Api';

export default class ScriptRunner {
  api: Api;

  constructor(api: Api) {
    this.api = api;
  }

  run(code: string, expr: boolean) {
    var toRun = '';

    Object.keys(Api.prototype).forEach(function(key) {
      if (Api.prototype[key] instanceof Function) {
        toRun += 'var ' + key + ' = context.' + key + '.bind(context);\n';
      } else {
        toRun += 'var ' + key + ' = context.' + key + ';\n';
      }
    });

    if (expr) {
      toRun += 'return (' + code + ');';
    } else {
      toRun += code;
    }

    this.api.clearIntervals();

    try {
      var func = new Function('context', toRun);

      var res = func(this.api);

      if (typeof res !== 'undefined') {
        if (res instanceof Promise) return res;

        if (typeof res === 'object') return JSON.stringify(res);

        return res.toString();
      }
    } catch (err) {
      console.error('parse error', err);
    }

    return '';
  }
}
