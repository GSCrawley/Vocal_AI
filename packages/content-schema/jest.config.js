const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../../tsconfig.base.json');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/src/**/__tests__/**/*.test.ts'],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths || {'@voice/*': ['packages/*/src']}, { prefix: '<rootDir>/../../' }),
  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.test.json',
    },
  },
};
