import type { Pattern } from "./detection";

export const defaultPatterns: Pattern[] = [
  {
    id: "p1",
    regex: /かもしれない/g,
    category: "HEDGING",
    severity: 2,
    explanation: "断定を避けている",
  },
  {
    id: "p2",
    regex: /でしょう|と思われる|と言える/g,
    category: "HEDGING",
    severity: 2,
  },
  { id: "p3", regex: /など|といった/g, category: "VAGUE", severity: 1 },
  {
    id: "p4",
    regex: /ある程度|いくつか|しばしば/g,
    category: "VAGUE",
    severity: 1,
  },
  {
    id: "p5",
    regex: /多数|少数|多め|少なめ/g,
    category: "QUANTITY",
    severity: 1,
  },
  {
    id: "p6",
    regex: /可能性がある|ありうる/g,
    category: "HEDGING",
    severity: 2,
  },
  {
    id: "p7",
    regex: /〜とされています|〜と見られる/g,
    category: "RESPONSIBILITY",
    severity: 3,
  },
  { id: "p8", regex: /一部で/g, category: "VAGUE", severity: 1 },
  { id: "p9", regex: /おそれがある/g, category: "HEDGING", severity: 2 },
  { id: "p10", regex: /場合がある/g, category: "HEDGING", severity: 1 },
];
