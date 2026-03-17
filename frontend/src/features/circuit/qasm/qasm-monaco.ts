import type { QasmParseError } from "./qasm-errors";
import { GATE_SPECS } from "./qasm-parser-types";

export const QASM_LANGUAGE_ID = "openqasm";
export const QASM_MARKER_OWNER = "qasm-parser";

const MAX_REGISTER_INDEX_HINTS = 4;

type MonacoApi = typeof import("monaco-editor");

interface RegisterDeclaration {
  readonly kind: "qubit" | "bit";
  readonly name: string;
  readonly size: number;
}

export interface QasmMarkerData {
  readonly startLineNumber: number;
  readonly startColumn: number;
  readonly endLineNumber: number;
  readonly endColumn: number;
  readonly message: string;
  readonly severity: number;
  readonly source: string;
  readonly code: string;
}

interface CompletionDescriptor {
  readonly label: string;
  readonly insertText: string;
  readonly detail: string;
  readonly kind: "keyword" | "snippet" | "gate";
}

const STATIC_COMPLETIONS: readonly CompletionDescriptor[] = [
  {
    label: "OPENQASM 3;",
    insertText: "OPENQASM 3;",
    detail: "QASM header declaration",
    kind: "keyword",
  },
  {
    label: 'include "stdgates.inc";',
    insertText: 'include "stdgates.inc";',
    detail: "Standard gate include",
    kind: "keyword",
  },
  {
    label: "qubit",
    insertText: "qubit[${1:2}] ${2:q};",
    detail: "Qubit register declaration",
    kind: "snippet",
  },
  {
    label: "bit",
    insertText: "bit[${1:2}] ${2:c};",
    detail: "Classical register declaration",
    kind: "snippet",
  },
  {
    label: "measure",
    insertText: "${1:c}[${2:0}] = measure ${3:q}[${4:0}];",
    detail: "Measurement statement",
    kind: "snippet",
  },
];

const REGISTER_DECLARATION_RE = /^\s*(qubit|bit)\[(\d+)\]\s+([A-Za-z_]\w*)\s*;/i;
const GATE_NAMES = Object.keys(GATE_SPECS);
const GATE_REGEX = new RegExp(`\\b(?:${GATE_NAMES.join("|")})\\b`, "i");
const QASM_KEYWORD_REGEX = /\b(?:OPENQASM|include|qubit|bit|measure)\b/i;
const PI_REGEX = /\bpi\b/i;
const NUMBER_REGEX = /\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/;

let languageRegistered = false;

function createRange(
  model: import("monaco-editor").editor.ITextModel,
  position: import("monaco-editor").Position,
) {
  const word = model.getWordUntilPosition(position);
  return {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: word.startColumn,
    endColumn: word.endColumn,
  };
}

function toCompletionKind(
  monaco: MonacoApi,
  kind: CompletionDescriptor["kind"],
) {
  if (kind === "snippet") {
    return monaco.languages.CompletionItemKind.Snippet;
  }
  if (kind === "gate") {
    return monaco.languages.CompletionItemKind.Function;
  }
  return monaco.languages.CompletionItemKind.Keyword;
}

function toCompletionItem(
  monaco: MonacoApi,
  descriptor: CompletionDescriptor,
  range: {
    readonly startLineNumber: number;
    readonly endLineNumber: number;
    readonly startColumn: number;
    readonly endColumn: number;
  },
) {
  return {
    label: descriptor.label,
    kind: toCompletionKind(monaco, descriptor.kind),
    insertText: descriptor.insertText,
    insertTextRules:
      descriptor.kind === "snippet"
        ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
        : undefined,
    detail: descriptor.detail,
    range,
  };
}

function toGateSnippet(gate: string): CompletionDescriptor {
  const spec = GATE_SPECS[gate];
  const params = Array.from(
    { length: spec.paramCount },
    (_, index) => `\${${index + 1}:theta}`,
  );
  const paramSegment = params.length > 0 ? `(${params.join(", ")})` : "";
  const operandOffset = params.length;
  const operands = Array.from(
    { length: spec.operandCount },
    (_, index) => `q[\${${operandOffset + index + 1}:0}]`,
  );
  return {
    label: gate,
    insertText: `${gate}${paramSegment} ${operands.join(", ")};`,
    detail: `Gate statement (${spec.operandCount} operand${spec.operandCount > 1 ? "s" : ""})`,
    kind: "gate",
  };
}

function parseDeclarations(source: string): readonly RegisterDeclaration[] {
  const declarations: RegisterDeclaration[] = [];
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(REGISTER_DECLARATION_RE);
    if (!match) {
      continue;
    }
    const size = Number.parseInt(match[2], 10);
    if (!Number.isFinite(size) || size <= 0) {
      continue;
    }
    declarations.push({
      kind: match[1].toLowerCase() === "qubit" ? "qubit" : "bit",
      size,
      name: match[3],
    });
  }
  return declarations;
}

function toRegisterCompletions(
  monaco: MonacoApi,
  declarations: readonly RegisterDeclaration[],
  range: {
    readonly startLineNumber: number;
    readonly endLineNumber: number;
    readonly startColumn: number;
    readonly endColumn: number;
  },
) {
  const items: Array<{
    readonly label: string;
    readonly kind: number;
    readonly insertText: string;
    readonly detail: string;
    readonly range: {
      readonly startLineNumber: number;
      readonly endLineNumber: number;
      readonly startColumn: number;
      readonly endColumn: number;
    };
  }> = [];

  for (const declaration of declarations) {
    const indexUpper = Math.min(declaration.size, MAX_REGISTER_INDEX_HINTS);
    for (let index = 0; index < indexUpper; index += 1) {
      items.push({
        label: `${declaration.name}[${index}]`,
        kind: monaco.languages.CompletionItemKind.Variable,
        insertText: `${declaration.name}[${index}]`,
        detail: declaration.kind === "qubit" ? "Qubit index reference" : "Classical bit index reference",
        range,
      });
    }
  }

  return items;
}

function createCompletionItems(
  monaco: MonacoApi,
  model: import("monaco-editor").editor.ITextModel,
  position: import("monaco-editor").Position,
) {
  const range = createRange(model, position);
  const staticItems = STATIC_COMPLETIONS.map((item) => toCompletionItem(monaco, item, range));
  const gateItems = GATE_NAMES.map((gateName) => toCompletionItem(monaco, toGateSnippet(gateName), range));
  const registerItems = toRegisterCompletions(monaco, parseDeclarations(model.getValue()), range);
  return [...staticItems, ...gateItems, ...registerItems];
}

export function registerQasmLanguage(monaco: MonacoApi): void {
  if (languageRegistered) {
    return;
  }

  monaco.languages.register({ id: QASM_LANGUAGE_ID });
  monaco.languages.setLanguageConfiguration(QASM_LANGUAGE_ID, {
    comments: { lineComment: "//" },
    autoClosingPairs: [
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
    ],
  });
  monaco.languages.setMonarchTokensProvider(QASM_LANGUAGE_ID, {
    tokenizer: {
      root: [
        [/\/\/.*$/, "comment"],
        [/".*?"/, "string"],
        [QASM_KEYWORD_REGEX, "keyword"],
        [GATE_REGEX, "type"],
        [PI_REGEX, "number.float"],
        [NUMBER_REGEX, "number"],
        [/[A-Za-z_]\w*/, "identifier"],
        [/[;,.]/, "delimiter"],
        [/[()[\]]/, "@brackets"],
        [/[+\-*/=]/, "operator"],
      ],
    },
  });
  monaco.languages.registerCompletionItemProvider(QASM_LANGUAGE_ID, {
    triggerCharacters: [" ", "[", "(", '"'],
    provideCompletionItems: (model, position) => ({
      suggestions: createCompletionItems(monaco, model, position),
    }),
  });

  languageRegistered = true;
}

export function buildQasmErrorMarkers(
  error: QasmParseError | null,
  severity: number,
): readonly QasmMarkerData[] {
  if (!error) {
    return [];
  }

  const startLineNumber = Math.max(1, error.line);
  const startColumn = Math.max(1, error.column);
  const fallbackEndColumn = startColumn + 1;
  const excerptLength = error.excerpt.trim().length;
  const endColumn =
    excerptLength > 0 ? Math.max(fallbackEndColumn, excerptLength + 1) : fallbackEndColumn;

  return [
    {
      startLineNumber,
      startColumn,
      endLineNumber: startLineNumber,
      endColumn,
      message: error.message,
      severity,
      source: QASM_MARKER_OWNER,
      code: error.code,
    },
  ];
}
