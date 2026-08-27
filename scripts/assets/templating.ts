/**
 * Motor de templates minimalista (subset propio, estilo Mustache) — sin
 * dependencias externas. Cubre lo que necesitan los templates de assets
 * (interpolación, condicionales, listas, con anidamiento arbitrario) sin
 * sumar una librería de templating completa al proyecto.
 *
 * Sintaxis soportada:
 *   {{clave}}                     interpolación con HTML-escape
 *   {{clave.anidada}}             acceso por path (dot notation)
 *   {{{clave}}}                   interpolación cruda, SIN escapar (para HTML de confianza)
 *   {{#if clave}}...{{/if}}       bloque condicional (por "truthy": objetos/strings no vacíos,
 *                                 números != 0, arrays con length > 0)
 *   {{#if clave}}...{{else}}...{{/if}}
 *   {{#each clave}}...{{/each}}   repite el bloque por cada elemento de un array.
 *                                 Dentro del bloque, las propiedades del item quedan
 *                                 disponibles directamente (ej. {{user}}) y también como
 *                                 {{this.user}}; el índice está en {{@index}}.
 *
 * A diferencia de un simple `String.replace` con regex, esto tokeniza y
 * arma un árbol (parser recursivo real) — por eso soporta {{#if}}/{{#each}}
 * anidados dentro de sí mismos o entre sí sin confundir la apertura/cierre
 * equivocados.
 */

type TemplateData = Record<string, unknown>;

// ─── Tokenizer ───────────────────────────────────────────────────────────

type Token =
  | { type: "text"; value: string }
  | { type: "var"; key: string; raw: boolean }
  | { type: "ifOpen"; key: string }
  | { type: "else" }
  | { type: "ifClose" }
  | { type: "eachOpen"; key: string }
  | { type: "eachClose" };

// El orden de las alternativas importa: {{{...}}} debe probarse antes que
// el patrón genérico {{...}}, si no, el genérico consumiría solo hasta el
// primer "}}" y dejaría una llave suelta.
const TAG_RE =
  /{{{\s*([\w.@]+)\s*}}}|{{#if\s+([\w.]+)}}|{{else}}|{{\/if}}|{{#each\s+([\w.]+)}}|{{\/each}}|{{\s*([\w.@]+)\s*}}/g;

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  TAG_RE.lastIndex = 0;
  while ((match = TAG_RE.exec(source)) !== null) {
    if (match.index > lastIndex) tokens.push({ type: "text", value: source.slice(lastIndex, match.index) });

    const [full, rawKey, ifKey, eachKey, varKey] = match;
    if (rawKey !== undefined) tokens.push({ type: "var", key: rawKey, raw: true });
    else if (ifKey !== undefined) tokens.push({ type: "ifOpen", key: ifKey });
    else if (full === "{{else}}") tokens.push({ type: "else" });
    else if (full === "{{/if}}") tokens.push({ type: "ifClose" });
    else if (eachKey !== undefined) tokens.push({ type: "eachOpen", key: eachKey });
    else if (full === "{{/each}}") tokens.push({ type: "eachClose" });
    else if (varKey !== undefined) tokens.push({ type: "var", key: varKey, raw: false });

    lastIndex = TAG_RE.lastIndex;
  }
  if (lastIndex < source.length) tokens.push({ type: "text", value: source.slice(lastIndex) });

  return tokens;
}

// ─── Parser (recursivo, respeta anidamiento) ────────────────────────────

type Node =
  | { type: "text"; value: string }
  | { type: "var"; key: string; raw: boolean }
  | { type: "if"; key: string; truthy: Node[]; falsy: Node[] }
  | { type: "each"; key: string; body: Node[] };

interface ParseState { tokens: Token[]; pos: number; }

function parseNodes(state: ParseState, stopTypes: ReadonlySet<Token["type"]>): Node[] {
  const nodes: Node[] = [];

  while (state.pos < state.tokens.length) {
    const token = state.tokens[state.pos];
    if (stopTypes.has(token.type)) break;
    state.pos++;

    if (token.type === "text") {
      nodes.push({ type: "text", value: token.value });
    } else if (token.type === "var") {
      nodes.push({ type: "var", key: token.key, raw: token.raw });
    } else if (token.type === "ifOpen") {
      const truthy = parseNodes(state, new Set(["else", "ifClose"]));
      let falsy: Node[] = [];
      if (state.tokens[state.pos]?.type === "else") {
        state.pos++;
        falsy = parseNodes(state, new Set(["ifClose"]));
      }
      if (state.tokens[state.pos]?.type !== "ifClose") {
        throw new Error(`Falta {{/if}} para {{#if ${token.key}}}`);
      }
      state.pos++;
      nodes.push({ type: "if", key: token.key, truthy, falsy });
    } else if (token.type === "eachOpen") {
      const body = parseNodes(state, new Set(["eachClose"]));
      if (state.tokens[state.pos]?.type !== "eachClose") {
        throw new Error(`Falta {{/each}} para {{#each ${token.key}}}`);
      }
      state.pos++;
      nodes.push({ type: "each", key: token.key, body });
    } else {
      // "else"/"ifClose"/"eachClose" llegando acá = no tienen apertura correspondiente
      throw new Error(`Tag "{{${token.type === "eachClose" ? "/each" : token.type === "ifClose" ? "/if" : "else"}}}" sin apertura correspondiente`);
    }
  }

  return nodes;
}

// ─── Evaluación ──────────────────────────────────────────────────────────

function getPath(data: unknown, keyPath: string): unknown {
  return keyPath.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, data);
}

function escapeHtml(value: unknown): string {
  const str = value == null ? "" : String(value);
  return str.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default:  return "&#39;";
    }
  });
}

function isTruthy(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

function renderNodes(nodes: Node[], data: TemplateData): string {
  let out = "";
  for (const node of nodes) {
    if (node.type === "text") {
      out += node.value;
    } else if (node.type === "var") {
      const value = getPath(data, node.key);
      out += node.raw ? (value == null ? "" : String(value)) : escapeHtml(value);
    } else if (node.type === "if") {
      out += isTruthy(getPath(data, node.key)) ? renderNodes(node.truthy, data) : renderNodes(node.falsy, data);
    } else {
      const arr = getPath(data, node.key);
      if (Array.isArray(arr)) {
        out += arr
          .map((item, index) => {
            const itemContext: TemplateData = {
              ...data,
              ...(item !== null && typeof item === "object" ? (item as TemplateData) : {}),
              this: item,
              "@index": index,
            };
            return renderNodes(node.body, itemContext);
          })
          .join("");
      }
    }
  }
  return out;
}

export function renderMustacheLite(source: string, data: TemplateData): string {
  const nodes = parseNodes({ tokens: tokenize(source), pos: 0 }, new Set());
  return renderNodes(nodes, data);
}
