import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jest-environment-jsdom",
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { useESM: true }],
    "^.+\\.(js|jsx)$": ["ts-jest", { useESM: true }],
  },
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleNameMapper: {
    // CSS モジュール無効化する
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    // Vite の @ エイリアスを使っている場合
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  testMatch: ["<rootDir>/src/**/*.spec.(ts|tsx)"],
  clearMocks: true,
};
export default config;
