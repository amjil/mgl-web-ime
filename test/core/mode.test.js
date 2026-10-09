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

describe("direct symbols dismiss candidates", () => {
  it("inserts punctuation immediately and clears the list without committing the first candidate", async () => {
    const adapter = memoryAdapter();
    let nextWords = 0;
    const core = new ImeCore({
      adapter,
      provider: {
        getCandidates: async () => ["FIRST", "SECOND"],
        getNextWords: async () => {
          nextWords += 1;
          return ["NEXT"];
        },
      },
    });

    await core.updateComposition("a");
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(core.state.candidates, ["FIRST", "SECOND"]);
    const preview = adapter.getText();
    assert.equal(preview, "\u1820");

    await core.handleEvent({ type: "key", key: ".", code: "Period" });

    assert.equal(adapter.getText(), `${preview}\u1803`);
    assert.deepEqual(core.state.candidates, []);
    assert.equal(core.state.candidateVisible, false);
    assert.equal(core.state.composition, "");
    assert.equal(core.state.composing, false);
    assert.equal(nextWords, 0);
  });

  it("inserts punctuation over a next-word list without taking the first suggestion", async () => {
    const adapter = memoryAdapter();
    const core = new ImeCore({
      adapter,
      provider: {
        getCandidates: async () => ["\u1820"],
        getNextWords: async () => ["NEXT", "ALSO"],
      },
    });

    await core.commit("\u1820");
    assert.deepEqual(core.state.candidates, ["NEXT", "ALSO"]);

    await core.handleEvent({ type: "key", key: ",", code: "Comma" });

    assert.equal(adapter.getText(), "\u1820\u1802");
    assert.deepEqual(core.state.candidates, []);
    assert.equal(core.state.candidateVisible, false);
  });

  it("ignores a late candidate response after a symbol clears the list", async () => {
    const adapter = memoryAdapter();
    let resolveRemote;
    const core = new ImeCore({
      adapter,
      provider: {
        getCandidates: () =>
          new Promise((resolve) => {
            resolveRemote = resolve;
          }),
        getNextWords: async () => ["NEXT"],
      },
    });

    const pending = core.updateComposition("a");
    await core.handleEvent({ type: "key", key: "?", code: "Slash", shiftKey: true });
    resolveRemote(["FIRST", "SECOND"]);
    await pending;
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(adapter.getText(), "\u1820\uff1f");
    assert.deepEqual(core.state.candidates, []);
    assert.equal(core.state.candidateVisible, false);
  });
});
