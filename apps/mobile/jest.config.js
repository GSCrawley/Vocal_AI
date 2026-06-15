// Lightweight, lockfile-safe test setup for @voice/mobile.
// Mirrors the repo's established pattern (see packages/audio-metrics/jest.config.js):
// ts-jest + node environment, with workspace deps mapped to source and native
// modules (expo-av) mapped to manual mocks. Uses only root-hoisted devDeps
// (jest, ts-jest, @types/jest) so no new lockfile entries are required.
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@voice/shared-types$': '<rootDir>/../../packages/shared-types/src/index.ts',
    '^@voice/audio-metrics$': '<rootDir>/../../packages/audio-metrics/src/index.ts',
    '^expo-av$': '<rootDir>/__mocks__/expo-av.ts',
  },
  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.test.json',
    },
  },
};
