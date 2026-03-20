// vite-plugin-yaml.js
// Minimal Vite plugin to import .yaml / .yml files as parsed JS objects.
// No external dependencies — uses Node's built-in fs and a tiny YAML parser.
//
// Usage in vite.config.js:
//   import yamlPlugin from './vite-plugin-yaml.js'
//   export default { plugins: [yamlPlugin()] }
//
// Then in any JS/JSX file:
//   import config from '../jetlag.config.yaml'

// ── Tiny YAML parser ──────────────────────────────────────────────────────────
// Handles the subset of YAML used in jetlag.config.yaml:
//   - Top-level keys, nested objects, arrays of scalars, arrays of objects
//   - Quoted and unquoted strings, numbers, booleans, null
//   - Comments (#)
// Not a full YAML spec — if you need advanced YAML, swap in the 'js-yaml' package.

function parseYaml(text) {
  const lines = text.split('\n');
  const root = {};
  const stack = [{ obj: root, indent: -1 }];

  // Pending array-of-objects accumulator
  let pendingArrayKey = null;
  let pendingArrayParent = null;
  let currentArrayItem = null;
  let currentArrayItemIndent = -1;

  function parseScalar(raw) {
    const s = raw.trim();
    if (s === 'true')  return true;
    if (s === 'false') return false;
    if (s === 'null' || s === '~' || s === '') return null;
    if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
    // Strip surrounding quotes
    if ((s.startsWith('"') && s.endsWith('"')) ||
        (s.startsWith("'") && s.endsWith("'"))) {
      return s.slice(1, -1);
    }
    return s;
  }

  for (let raw of lines) {
    // Strip comments
    const commentIdx = raw.indexOf('#');
    if (commentIdx !== -1) raw = raw.slice(0, commentIdx);
    if (!raw.trim()) continue;

    const indent = raw.search(/\S/);
    const content = raw.trim();

    // Array item (starts with "- ")
    if (content.startsWith('- ')) {
      const rest = content.slice(2).trim();
      // Array of scalars: "- value"
      if (!rest.includes(':')) {
        while (stack.length > 1 && stack[stack.length-1].indent >= indent) stack.pop();
        if (pendingArrayKey) {
          if (!Array.isArray(pendingArrayParent[pendingArrayKey])) {
            pendingArrayParent[pendingArrayKey] = [];
          }
          pendingArrayParent[pendingArrayKey].push(parseScalar(rest));
        }
        continue;
      }
      // Array of objects: "- key: value" starts a new object
      while (stack.length > 1 && stack[stack.length-1].indent >= indent) stack.pop();
      if (pendingArrayKey) {
        if (!Array.isArray(pendingArrayParent[pendingArrayKey])) {
          pendingArrayParent[pendingArrayKey] = [];
        }
        const newItem = {};
        pendingArrayParent[pendingArrayKey].push(newItem);
        currentArrayItem = newItem;
        currentArrayItemIndent = indent;
        // Parse the first key:val on this line
        const colonIdx = rest.indexOf(':');
        if (colonIdx !== -1) {
          const k = rest.slice(0, colonIdx).trim();
          const v = rest.slice(colonIdx + 1).trim();
          if (v) newItem[k] = parseScalar(v);
          else newItem[k] = null;
        }
      }
      continue;
    }

    // Key: value line
    const colonIdx = content.indexOf(':');
    if (colonIdx === -1) continue;
    const key = content.slice(0, colonIdx).trim();
    const val = content.slice(colonIdx + 1).trim();

    // Pop stack to correct indent level
    while (stack.length > 1 && stack[stack.length-1].indent >= indent) stack.pop();
    let target = stack[stack.length-1].obj;

    // If we're inside an array-of-objects item and indent > item start, write to item
    if (currentArrayItem && indent > currentArrayItemIndent) {
      target = currentArrayItem;
    } else {
      currentArrayItem = null;
      currentArrayItemIndent = -1;
    }

    if (val === '' || val === null) {
      // Could be a nested object or array — push placeholder
      target[key] = {};
      stack.push({ obj: target[key], indent });
      pendingArrayKey = null;
      pendingArrayParent = null;
    } else if (val.startsWith('[')) {
      // Inline array: [1, 2, 3]
      const inner = val.slice(1, val.lastIndexOf(']'));
      target[key] = inner.split(',').map(s => parseScalar(s.trim()));
    } else {
      target[key] = parseScalar(val);
    }

    // Track for array-of-objects
    if (val === '' || val === null) {
      // Could become an array
      pendingArrayKey = key;
      pendingArrayParent = target;
    }
  }

  return root;
}

// ── Vite plugin ───────────────────────────────────────────────────────────────
export default function yamlPlugin() {
  return {
    name: 'vite-plugin-yaml',
    transform(src, id) {
      if (!id.endsWith('.yaml') && !id.endsWith('.yml')) return null;
      this.addWatchFile(id); // tell Vite to watch this file
      const parsed = parseYaml(src);
      return {
        code: `export default ${JSON.stringify(parsed)}`,
        map: null,
      };
    },
    handleHotUpdate({ file, server }) {
      if (!file.endsWith('.yaml') && !file.endsWith('.yml')) return;
      // Full page reload so useState re-initializes from the new config values
      server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}
