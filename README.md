# mgl-web-ime

Standalone Mongolian Web IME (JavaScript Library + Web Components).

Aligned with:

- Desktop IME: `cljd/m-h-k` (Latin transliteration → preview → candidates)
- Mobile IME: `cljd/m-v-k` (virtual keyboard + candidate bar)
- Backend: `cljd/m-i-c/backend` (`POST /api/next_word/candidates` · `POST /api/next_word/list`)

## Build

```bash
npm install
npm run build
```

Output in `dist/`:

| File | Use |
|------|------|
| `mgl-web-ime.js` | ESM (recommended for `import` / `<script type="module">`) |
| `mgl-web-ime.min.js` | Minified ESM |
| `mgl-web-ime.global.js` | IIFE → `window.MglWebIme` |
| `mgl-web-ime.css` | Bundled styles (`@font-face` → `/fonts/OyunQaganTig.ttf`) |
| `fonts/OyunQaganTig.ttf` | Mongolian font — copy to your site root as `/fonts/OyunQaganTig.ttf` |

## Quick start

### 1. Start the candidate backend

```bash
cd ../../cljd/m-i-c/backend
go run ./cmd/server
# defaults to http://dev1:3003
```

### 2. Open the demos

```bash
npx serve . -p 5173
```

- Desktop: http://localhost:5173/demo/desktop.html
- Mobile: http://localhost:5173/demo/mobile.html
- JS API: http://localhost:5173/demo/editor.html

## Usage

### Dist bundle (drop into any page)

Serve the font at the site root (required — CSS uses a root-absolute URL so it
survives being bundled into `/assets/css/app.css`):

```bash
cp dist/fonts/OyunQaganTig.ttf /path/to/public/fonts/
```

```html
<link rel="stylesheet" href="./dist/mgl-web-ime.css" />
<div id="editor" contenteditable="true"></div>
<mgl-ime
  target="#editor"
  profile="auto"
  keyboard="auto"
  base-url="http://dev1:3003"
></mgl-ime>
<script type="module" src="./dist/mgl-web-ime.js"></script>
```

Without a bundler, use the global build:

```html
<script src="./dist/mgl-web-ime.global.js"></script>
<script>
  const { MglIME } = MglWebIme;
</script>
```

### Web Component (source)

```html
<link rel="stylesheet" href="styles/ime.css" />
<div id="editor" contenteditable="true"></div>
<mgl-ime
  target="#editor"
  profile="auto"
  keyboard="auto"
  base-url="http://dev1:3003"
></mgl-ime>
<script type="module" src="src/index.js"></script>
```

### JavaScript API (npm package)

```js
import { MglIME } from "mgl-web-ime";
import "mgl-web-ime/style.css";

const ime = new MglIME({
  target: "#editor",
  profile: "auto",
  keyboard: "auto",
  baseUrl: "http://dev1:3003",
});

ime.on("mgl-ime-commit", ({ text }) => console.log(text));
```

### Custom Editor Adapter

```js
import { MglIME, createCustomAdapter } from "mgl-web-ime";

const adapter = createCustomAdapter({
  getText: () => editor.getText(),
  getSelection: () => editor.getSelection(),
  setSelection: (s) => editor.setSelection(s),
  insertText: (t) => editor.insertText(t),
  deleteBackward: () => editor.deleteBackward(),
  deleteForward: () => editor.deleteForward(),
  replaceSelection: (t) => editor.replaceSelection(t),
  replaceBeforeCaret: (n, t) => editor.replaceBeforeCaret(n, t),
  getTextBeforeCaret: () => editor.getTextBeforeCaret(),
  getCaretRect: () => editor.getCaretRect(),
});

const ime = new MglIME({ adapter, profile: "auto" });
```

## Desktop shortcuts

| Key | Action |
|------|------|
| `a–z` | Build Latin buffer and insert Mongolian preview |
| `Space` | Commit current candidate (with trailing space) |
| `1–5` | Select candidate on current page |
| `=` / `+` | Next page |
| `-` | Previous page |
| `Esc` | Cancel composition |
| `Shift` tap | Toggle Mongolian / Latin |
| `Ctrl+Space` | Toggle IME |
| `Shift+-` | Suffix candidates |
| `[` `]` `\` | FVS1/2/3 |
| `Shift+Space` | NNBSP |

## Architecture

```
IME Core  ←  composition / candidates / commit
    ├── Desktop Controller  → Candidate Popup
    ├── Mobile Controller   → Virtual Keyboard + Candidate Bar
    └── Editor Adapter      → contenteditable / textarea / custom
```

Candidates are injected via `CandidateProvider`; default is `HybridCandidateProvider` (remote + local mapping fallback).

## Layout

See `mgl-web-ime-spec.md` §5.

## License

MIT
