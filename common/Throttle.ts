/**
 * Minimal replacements for the `throttle` and `debounce` helpers the project
 * took from underscore. They match underscore's defaults: throttle fires
 * immediately on the first call and once more (with the latest arguments)
 * after the last call in a burst (leading + trailing), debounce fires once
 * after calls stop for `wait` ms.
 */

type Timer = ReturnType<typeof setTimeout>;

export function throttle<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number,
): (...args: A) => void {
  let lastCall = 0;
  let timer: Timer | null = null;
  let lastArgs: A | null = null;

  const invoke = (): void => {
    lastCall = Date.now();
    if (lastArgs !== null) fn(...lastArgs);
  };

  return (...args: A): void => {
    lastArgs = args;

    const remaining = wait - (Date.now() - lastCall);

    if (remaining <= 0) {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      invoke();
    } else if (timer === null) {
      timer = setTimeout(() => {
        timer = null;
        invoke();
      }, remaining);
    }
  };
}

export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number,
): (...args: A) => void {
  let timer: Timer | null = null;

  return (...args: A): void => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, wait);
  };
}
