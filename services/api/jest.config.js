export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@voice/shared-types$': '<rootDir>/../../packages/shared-types/src/index.ts',
    '^@voice/audio-metrics$': '<rootDir>/../../packages/audio-metrics/src/index.ts',
    '^@voice/exercise-engine$': '<rootDir>/../../packages/exercise-engine/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      { tsconfig: './tsconfig.test.json', useESM: true, isolatedModules: true },
    ],
  },
};
