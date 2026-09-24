import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ImeCore } from "../../src/core/ime.js";
import { createCustomAdapter } from "../../src/adapters/custom.js";

function memoryAdapter(initial = "") {
  let text = initial;
  return createCustomAdapter({
    getText: () => text,
    getSelection: () => {
      const n = Array.from(text).length;
      return { start: n, end: n };
    },
    insertText: (t) => {
      text += t ?? "";
    },
    replaceBeforeCaret: (n, t) => {
      const cps = Array.from(text);
      text = cps.slice(0, Math.max(0, cps.length - n)).join("") + (t ?? "");
    },
    getTextBeforeCaret: () => text,
    deleteBackward: () => {
      const cps = Array.from(text);
      cps.pop();
      text = cps.join("");
    },
  });
}

describe("Shift / setMode latin dismisses candidates", () => {
  it("closes the candidate panel and keeps the preview already in the editor", async () => {
    const adapter = memoryAdapter();
    const core = new ImeCore({
      adapter,
      provider: {
        getCandidates: async () => ["ᠠ", "ᠠᠨ"],
        getNextWords: async () => ["SHOULD_NOT_RUN"],
      },
    });

    await core.updateComposition("a");
    const preview = adapter.getText();
    assert.ok(preview.length > 0);
    assert.ok(core.state.candidates.length > 0);
    assert.equal(core.state.candidateVisible, true);

    core.setMode("latin");

    assert.equal(core.state.mode, "latin");
    assert.deepEqual(core.state.candidates, []);
    assert.equal(core.state.candidateVisible, false);
    assert.equal(core.state.composition, "");
    assert.equal(adapter.getText(), preview);
  });

  it("does not reopen candidates when a late query resolves after switching to latin", async () => {
    const adapter = memoryAdapter();
    let resolveRemote;
    const core = new ImeCore({
      adapter,
      provider: {
        getCandidates: () =>
          new Promise((resolve) => {
            resolveRemote = resolve;
          }),
        getNextWords: async () => ["ᠨᠢ"],
      },
    });

    const pending = core.updateComposition("a");
    core.setMode("latin");
    resolveRemote(["ᠠ", "ᠠᠨ"]);
    await pending;
    await Promise.resolve();

    assert.equal(core.state.mode, "latin");
    assert.deepEqual(core.state.candidates, []);
    assert.equal(core.state.candidateVisible, false);
  });

  it("clears next-word candidates when switching to latin after a commit", async () => {
    const adapter = memoryAdapter();
    const core = new ImeCore({
      adapter,
      provider: {
        getCandidates: async (input) => [input || "ᠠ"],
        getNextWords: async () => ["ᠨᠢ", "ᠶᠢᠨ"],
      },
    });

    await core.commit("ᠠ");
    assert.ok(core.state.candidates.length > 0);
    assert.equal(core.state.candidateVisible, true);

    core.setMode("latin");

    assert.deepEqual(core.state.candidates, []);
    assert.equal(core.state.candidateVisible, false);
    assert.equal(adapter.getText(), "ᠠ");
  });
});
