module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  setupFiles: ['<rootDir>/tests/setup.js'],
  moduleNameMapper: {
    // Redirect Firebase CDN imports to local mocks
    'https://www\\.gstatic\\.com/firebasejs/[^/]+/firebase-app\\.js':
      '<rootDir>/tests/__mocks__/firebase-app.js',
    'https://www\\.gstatic\\.com/firebasejs/[^/]+/firebase-analytics\\.js':
      '<rootDir>/tests/__mocks__/firebase-analytics.js',
    // Redirect relative firebase-config import (from within analytics.js)
    '\\./firebase-config\\.js':
      '<rootDir>/tests/__mocks__/firebase-config.js',
    // Remap the test require path to the actual implementation location
    '^\\.\\./\\.\\./js/analytics$':
      '<rootDir>/streaming-prototype/js/analytics',
  },
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
  collectCoverageFrom: ['streaming-prototype/js/analytics.js'],
  coverageThreshold: {
    global: { lines: 80 }
  },
  forceExit: true,
};
