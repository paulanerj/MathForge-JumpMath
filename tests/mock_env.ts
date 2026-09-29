/**
 * Headless test environment mock for GameEngine
 */

export function assertFiniteCanvasArgs(methodName: string, args: any[]) {
  for (let i = 0; i < args.length; i++) {
    const val = args[i];
    if (typeof val === 'number') {
      if (!Number.isFinite(val)) {
        throw new Error(`[Canvas Error] ${methodName} called with non-finite numeric argument at index ${i}: ${val}`);
      }
    }
  }
}

export function resetStandardViewport(canvas?: any) {
  const target = canvas || (globalThis as any).document?.getElementById?.('game-canvas');
  if (target && typeof target.setBoundingRect === 'function') {
    target.setBoundingRect(0, 0, 500, 800);
    target.width = 500;
    target.height = 800;
  }
}

export function setupHeadlessEnv() {
  const GEOMETRIC_METHODS = new Set([
    'fillRect', 'strokeRect', 'clearRect',
    'moveTo', 'lineTo', 'arc', 'ellipse',
    'translate', 'rotate', 'scale',
    'quadraticCurveTo', 'bezierCurveTo',
    'fillText', 'strokeText', 'drawImage', 'roundRect',
    'isPointInPath', 'isPointInStroke'
  ]);

  // Mock 2D Context using Proxy
  const baseCtx: any = {
    measureText: (text: string) => ({ width: (text || '').length * 10 }),
    createLinearGradient: (x0: number, y0: number, x1: number, y1: number) => {
      assertFiniteCanvasArgs('createLinearGradient', [x0, y0, x1, y1]);
      return {
        addColorStop: (offset: number, _color: string) => {
          if (typeof offset === 'number' && !Number.isFinite(offset)) {
            throw new Error(`[Canvas Error] addColorStop called with non-finite offset: ${offset}`);
          }
        }
      };
    },
    createRadialGradient: (x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) => {
      assertFiniteCanvasArgs('createRadialGradient', [x0, y0, r0, x1, y1, r1]);
      return {
        addColorStop: (offset: number, _color: string) => {
          if (typeof offset === 'number' && !Number.isFinite(offset)) {
            throw new Error(`[Canvas Error] addColorStop called with non-finite offset: ${offset}`);
          }
        }
      };
    },
    createPattern: () => ({}),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    getLineDash: () => [],
    setLineDash: () => {},
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '12px sans-serif',
    textAlign: 'center',
    textBaseline: 'middle',
    globalAlpha: 1.0,
    globalCompositeOperation: 'source-over',
    shadowColor: 'transparent',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    filter: 'none'
  };

  const dummyCtx: any = new Proxy(baseCtx, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === 'string' && GEOMETRIC_METHODS.has(prop)) {
        return (...args: any[]) => {
          assertFiniteCanvasArgs(prop, args);
        };
      }
      return () => {};
    },
    set(target, prop, value) {
      if ((prop === 'lineWidth' || prop === 'globalAlpha' || prop === 'shadowBlur' || prop === 'shadowOffsetX' || prop === 'shadowOffsetY') && typeof value === 'number') {
        if (!Number.isFinite(value)) {
          throw new Error(`[Canvas Error] Set property '${String(prop)}' with non-finite value: ${value}`);
        }
      }
      target[prop] = value;
      return true;
    }
  });

  // Mock Canvas
  class MockCanvas {
    width: number = 500;
    height: number = 800;
    rect = { left: 0, top: 0, width: 500, height: 800, right: 500, bottom: 800, x: 0, y: 0 };

    getContext(type: string) {
      if (type === '2d') return dummyCtx;
      return null;
    }

    getBoundingClientRect() {
      return this.rect;
    }

    setBoundingRect(left: number, top: number, width: number, height: number) {
      this.rect = { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top };
    }

    resetStandardViewport() {
      this.setBoundingRect(0, 0, 500, 800);
      this.width = 500;
      this.height = 800;
    }
  }

  // Mock Audio Context
  class MockAudioNode {
    connect() {}
    disconnect() {}
    setValueAtTime() {}
    linearRampToValueAtTime() {}
    exponentialRampToValueAtTime() {}
    cancelScheduledValues() {}
    start() {}
    stop() {}
  }

  class MockAudioContext {
    state = 'running';
    sampleRate = 44100;
    currentTime = 0;

    createGain() {
      return {
        gain: {
          value: 1,
          setValueAtTime: () => {},
          linearRampToValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {}
        },
        connect: () => {},
        disconnect: () => {}
      };
    }

    createOscillator() {
      return {
        type: 'sine',
        frequency: {
          value: 440,
          setValueAtTime: () => {},
          linearRampToValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {}
        },
        connect: () => {},
        disconnect: () => {},
        start: () => {},
        stop: () => {}
      };
    }

    createBiquadFilter() {
      return {
        type: 'lowpass',
        frequency: {
          value: 1000,
          setValueAtTime: () => {},
          linearRampToValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {}
        },
        Q: {
          value: 1,
          setValueAtTime: () => {},
          linearRampToValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {}
        },
        connect: () => {},
        disconnect: () => {}
      };
    }

    createDelay() {
      return {
        delayTime: {
          value: 0,
          setValueAtTime: () => {},
          linearRampToValueAtTime: () => {}
        },
        connect: () => {},
        disconnect: () => {}
      };
    }

    createBuffer(channels: number, length: number, sampleRate: number) {
      return {
        channels,
        length,
        sampleRate,
        getChannelData: () => new Float32Array(length)
      };
    }

    createBufferSource() {
      return {
        buffer: null,
        loop: false,
        playbackRate: { value: 1 },
        connect: () => {},
        disconnect: () => {},
        start: () => {},
        stop: () => {}
      };
    }

    resume() {
      this.state = 'running';
      return Promise.resolve();
    }

    close() {
      this.state = 'closed';
      return Promise.resolve();
    }
  }

  // RAF Scheduler
  let nextFrameId = 1;
  const activeCallbacks = new Map<number, FrameRequestCallback>();

  function customRequestAnimationFrame(cb: FrameRequestCallback): number {
    const id = nextFrameId++;
    activeCallbacks.set(id, cb);
    return id;
  }

  function customCancelAnimationFrame(id: number): void {
    activeCallbacks.delete(id);
  }

  function stepRaf(timestamp: number = performance.now()) {
    const cbs = Array.from(activeCallbacks.entries());
    activeCallbacks.clear();
    for (const [id, cb] of cbs) {
      cb(timestamp);
    }
    return cbs.length;
  }

  function getActiveRafCount() {
    return activeCallbacks.size;
  }

  function clearAllRafs() {
    activeCallbacks.clear();
  }

  // Attach to globals
  const globalAny = globalThis as any;
  globalAny.HTMLCanvasElement = MockCanvas;
  globalAny.AudioContext = MockAudioContext;
  globalAny.requestAnimationFrame = customRequestAnimationFrame;
  globalAny.cancelAnimationFrame = customCancelAnimationFrame;
  if (!globalAny.window) {
    globalAny.window = globalAny;
  }

  return {
    MockCanvas,
    stepRaf,
    getActiveRafCount,
    clearAllRafs
  };
}
