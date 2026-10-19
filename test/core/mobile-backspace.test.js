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

describe("mobile backspace", () => {
  it("deletes one character and clears the candidate list", async () => {
    const adapter = memoryAdapter();
    const queries = [];
    const core = new ImeCore({
      adapter,
      profile: "mobile",
      provider: {
        getCandidates: async (input) => {
          queries.push(input);
          return [`cand:${input}`];
        },
        getNextWords: async () => [],
      },
    });

    await core.handleEvent({ type: "command", command: "insert", key: "ᠠ" });
    await core.handleEvent({ type: "command", command: "insert", key: "ᠨ" });
    assert.equal(adapter.getText(), "ᠠᠨ");
    assert.deepEqual(core.state.candidates, ["cand:ᠠᠨ"]);

    await core.handleEvent({ type: "command", command: "backspace" });

    assert.equal(adapter.getText(), "ᠠ");
    assert.deepEqual(core.state.candidates, []);
    assert.equal(core.state.candidateVisible, false);
    assert.deepEqual(queries, ["ᠠ", "ᠠᠨ"]);
  });

  it("clears candidates when the last character of a word is deleted", async () => {
    const adapter = memoryAdapter("ᠠ");
    const core = new ImeCore({
      adapter,
      profile: "mobile",
      provider: {
        getCandidates: async (input) => [`cand:${input}`],
        getNextWords: async () => [],
      },
    });

    core.setState({
      ...core.state,
      candidates: ["cand:ᠠ"],
      candidateVisible: true,
    });

    await core.handleEvent({ type: "command", command: "backspace" });

    assert.equal(adapter.getText(), "");
    assert.deepEqual(core.state.candidates, []);
    assert.equal(core.state.candidateVisible, false);
  });

  it("does not delete the whole trailing Mongol word in one press", async () => {
    const adapter = memoryAdapter("ᠠᠪᠤ");
    const core = new ImeCore({
      adapter,
      profile: "mobile",
      provider: {
        getCandidates: async (input) => [input],
        getNextWords: async () => [],
      },
    });

    await core.handleEvent({ type: "command", command: "backspace" });

    assert.equal(adapter.getText(), "ᠠᠪ");
    assert.deepEqual(core.state.candidates, []);
  });

  it("ignores a late candidate response after backspace clears the list", async () => {
    const adapter = memoryAdapter();
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const core = new ImeCore({
      adapter,
      profile: "mobile",
      provider: {
        getCandidates: () =>
          gate.then(() => ["LATE"]),
        getNextWords: async () => [],
      },
    });

    const typing = core.handleEvent({
      type: "command",
      command: "insert",
      key: "ᠠ",
    });
    await core.handleEvent({ type: "command", command: "backspace" });
    release();
    await typing;

    assert.equal(adapter.getText(), "");
    assert.deepEqual(core.state.candidates, []);
    assert.equal(core.state.candidateVisible, false);
  });
});
