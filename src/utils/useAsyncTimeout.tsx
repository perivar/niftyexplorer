import { useEffect, useRef } from 'react';

const useAsyncTimeout = (callback: any, delay: number) => {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  });

  useEffect(() => {
    let id: any = null;
    const tick = () => {
      const promise = savedCallback.current();

      if (promise instanceof Promise) {
        promise.then(() => {
          id = setTimeout(tick, delay);
        });
      } else {
        id = setTimeout(tick, delay);
      }
    };

    if (id !== null) {
      id = setTimeout(tick, delay);
      return () => clearTimeout(id);
    }
    tick();
    return;
  }, [delay]);
};

export default useAsyncTimeout;
