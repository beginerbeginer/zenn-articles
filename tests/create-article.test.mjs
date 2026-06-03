import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildArticle,
  normalizeSlug,
  parseTopics,
  validateTopics,
  writeUniqueArticle
} from "../scripts/create-article.mjs";

test("normalizeSlug converts title-like text into a lowercase slug", () => {
  assert.equal(normalizeSlug(" Hello_World!! 2026 "), "hello-world-2026");
});

test("normalizeSlug returns an empty slug when the title has no supported characters", () => {
  assert.equal(normalizeSlug("テスト技法の使い分け"), "");
});

test("parseTopics accepts comma-separated topics", () => {
  assert.deepEqual(parseTopics("react, javascript, zenn"), ["react", "javascript", "zenn"]);
});

test("parseTopics accepts a JSON array of topics", () => {
  assert.deepEqual(parseTopics(`["react", " javascript ", "zenn"]`), ["react", "javascript", "zenn"]);
});

test("parseTopics rejects JSON arrays containing non-string values", () => {
  assert.throws(
    () => parseTopics(`["react", 123]`),
    /topics（記事に関連する言語や技術）を配列で指定してください/
  );
});

test("validateTopics rejects empty and oversized topic lists", () => {
  assert.match(validateTopics([]), /1つ以上/);
  assert.match(validateTopics(["a", "b", "c", "d", "e", "f"]), /5つまで/);
});

test("validateTopics rejects Japanese comma separators", () => {
  assert.match(validateTopics(["あああ、あああ"]), /半角カンマ/);
});

test("buildArticle renders frontmatter and body template", () => {
  const article = buildArticle({
    title: "CLIを作る",
    emoji: "📝",
    type: "tech",
    topics: ["zenn", "cli"],
    published: false,
    summary: "概要です。"
  });

  assert.equal(
    article,
    `---
title: "CLIを作る"
emoji: "📝"
type: "tech"
topics: ["zenn", "cli"]
published: false
---

概要です。

## はじめに


## 本文


## まとめ

`
  );
});

test("writeUniqueArticle writes to the first available slug", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "create-article-test-"));
  const articleDir = path.join(directory, "articles");

  try {
    await writeUniqueArticle("sample", "existing", articleDir);
    const result = await writeUniqueArticle("sample", "new article", articleDir);

    assert.deepEqual(result, {
      articlePath: path.join(articleDir, "sample-2.md"),
      articleSlug: "sample-2"
    });
    assert.equal(await readFile(result.articlePath, "utf8"), "new article");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("writeUniqueArticle does not overwrite existing files", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "create-article-test-"));
  const articleDir = path.join(directory, "articles");

  try {
    await writeUniqueArticle("sample", "first", articleDir);
    await writeUniqueArticle("sample", "second", articleDir);

    assert.equal(await readFile(path.join(articleDir, "sample.md"), "utf8"), "first");
    assert.equal(await readFile(path.join(articleDir, "sample-2.md"), "utf8"), "second");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
