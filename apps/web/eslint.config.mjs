import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import prettierConfig from "eslint-config-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Next.js의 기본 ESLint 규칙들을 먼저 적용합니다.
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // 프로젝트 전환 과정에서 기존 코드가 사용하는 any 타입과
  // 문자열 내 작은따옴표 표현을 허용하도록 일시적으로 규칙을 완화합니다.
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react/no-unescaped-entities": "off",
    },
  },

  // prettierConfig를 가장 마지막에 추가하여,
  // 이전 규칙들과 충돌할 수 있는 스타일 관련 규칙들을 모두 비활성화합니다.
  prettierConfig,
];

export default eslintConfig;

// eslint-config-prettier는 ESLint 규칙을 비활성화하는 설정이므로,
// 다른 규칙들과 충돌하지 않도록 항상 마지막에 위치해야 합니다.
// 이 설정은 Next.js 프로젝트에서 TypeScript와 Prettier를 함께 사용할 때,
// 코드 스타일을 일관되게 유지하기 위해 사용됩니다.
