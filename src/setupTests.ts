// Jest setup file for conversation testing suite

// Mock Firebase
jest.mock('./firebase', () => ({
  auth: {
    currentUser: { uid: 'test-user-id' },
    onAuthStateChanged: jest.fn()
  },
  db: {},
  storage: {}
}));

// Mock Web APIs
const MockMediaRecorder = jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    state: 'inactive',
    mimeType: 'audio/webm',
    stream: null,
}));
MockMediaRecorder.isTypeSupported = jest.fn(() => true);
global.MediaRecorder = MockMediaRecorder as any;

// Mock AudioContext
const mockAudioContext = {
  createAnalyser: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    getByteFrequencyData: jest.fn(),
    fftSize: 2048,
    frequencyBinCount: 1024
  })),
  createMediaStreamSource: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn()
  })),
  close: jest.fn(),
  state: 'running',
  sampleRate: 44100,
  baseLatency: 0,
  outputLatency: 0,
  createMediaElementSource: jest.fn(),
  createMediaStreamDestination: jest.fn(),
  createScriptProcessor: jest.fn(),
  createStereoPanner: jest.fn(),
  createWaveShaper: jest.fn(),
  decodeAudioData: jest.fn(),
  createGain: jest.fn(),
  createDelay: jest.fn(),
  createBiquadFilter: jest.fn(),
  createPeriodicWave: jest.fn(),
  createConvolver: jest.fn(),
  createChannelSplitter: jest.fn(),
  createChannelMerger: jest.fn(),
  createDynamicsCompressor: jest.fn(),
  createOscillator: jest.fn(),
  resume: jest.fn(),
  suspend: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  createBuffer: jest.fn(),
  createBufferSource: jest.fn(),
  currentTime: 0,
  destination: null,
  listener: null
};

global.AudioContext = jest.fn(() => mockAudioContext) as any;
global.webkitAudioContext = jest.fn(() => mockAudioContext) as any;

Object.defineProperty(global.navigator, 'mediaDevices', {
    writable: true,
    value: {
        getUserMedia: jest.fn(() => Promise.resolve({
            getTracks: () => [{ stop: jest.fn() }],
            getAudioTracks: () => [{ stop: jest.fn() }],
            getVideoTracks: () => []
        }))
    },
});

// Mock SpeechSynthesis
global.speechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  getVoices: jest.fn(() => [
    { name: 'English Female', lang: 'en-US', voiceURI: 'en-US-female' },
    { name: 'Hindi Female', lang: 'hi-IN', voiceURI: 'hi-IN-female' }
  ]),
  speaking: false,
  pending: false,
  paused: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
} as any;

global.SpeechSynthesisUtterance = jest.fn().mockImplementation(() => ({
  text: '',
  lang: 'en-US',
  voice: null,
  volume: 1,
  rate: 1,
  pitch: 1,
  onstart: null,
  onend: null,
  onerror: null,
  onpause: null,
  onresume: null,
  onmark: null,
  onboundary: null,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn()
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: mockLocalStorage
});

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = jest.fn();

// Mock Blob
global.Blob = jest.fn((content, options) => ({
  size: content ? content.reduce((acc: number, item: any) => acc + item.length, 0) : 0,
  type: options?.type || '',
  arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(8))),
  text: jest.fn(() => Promise.resolve('mock text')),
  stream: jest.fn()
})) as any;

// Mock FileReader
global.FileReader = jest.fn(() => ({
  readAsArrayBuffer: jest.fn(),
  readAsDataURL: jest.fn(),
  readAsText: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  result: null,
  error: null,
  readyState: 0
})) as any;

// Mock performance.now for timing tests
global.performance = {
  ...global.performance,
  now: jest.fn(() => Date.now())
};

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn()
};

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
  takeRecords: jest.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn();

// Mock crypto for generating UUIDs in tests
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'mock-uuid-' + Math.random().toString(36).substr(2, 9)),
    getRandomValues: jest.fn((arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    })
  }
});

// Mock HTMLMediaElement methods
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  writable: true,
  value: jest.fn(() => Promise.resolve())
});

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  writable: true,
  value: jest.fn()
});

Object.defineProperty(HTMLMediaElement.prototype, 'load', {
  writable: true,
  value: jest.fn()
});

// Mock audio element
global.Audio = jest.fn(() => ({
  play: jest.fn(() => Promise.resolve()),
  pause: jest.fn(),
  load: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  currentTime: 0,
  duration: 0,
  volume: 1,
  muted: false,
  paused: true,
  ended: false,
  src: ''
})) as any;

// Setup custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  toHaveValidAudioFormat(received: Blob) {
    const validFormats = ['audio/wav', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    const pass = validFormats.includes(received.type);
    if (pass) {
      return {
        message: () => `expected ${received.type} not to be a valid audio format`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received.type} to be a valid audio format`,
        pass: false,
      };
    }
  }
});

// Global test utilities
global.testUtils = {
  createMockAudioBlob: (content = 'mock audio data', type = 'audio/wav') => {
    return new Blob([content], { type });
  },
  
  createMockConversationTurn: (type: 'ai_question' | 'user_response', content: string) => ({
    id: `turn-${Math.random().toString(36).substr(2, 9)}`,
    type,
    content,
    timestamp: new Date(),
    language: 'en'
  }),
  
  createMockConversationData: (overrides = {}) => ({
    id: 'test-conv-1',
    userId: 'test-user-1',
    language: 'en',
    turns: [],
    extractedInfo: {
      productType: '',
      materials: [],
      colors: [],
      craftingProcess: '',
      uniqueFeatures: []
    },
    status: 'in_progress',
    startedAt: new Date(),
    summary: '',
    ...overrides
  }),
  
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  mockFirebaseResponse: (data: any) => {
    const { firebaseService } = require('./services/firebase-service');
    firebaseService.callFunction.mockResolvedValue(data);
  }
};

// Declare global types for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
      toHaveValidAudioFormat(): R;
    }
  }
  
  var testUtils: {
    createMockAudioBlob: (content?: string, type?: string) => Blob;
    createMockConversationTurn: (type: 'ai_question' | 'user_response', content: string) => any;
    createMockConversationData: (overrides?: any) => any;
    waitFor: (ms: number) => Promise<void>;
    mockFirebaseResponse: (data: any) => void;
  };
}

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  mockLocalStorage.clear();
});

export {};