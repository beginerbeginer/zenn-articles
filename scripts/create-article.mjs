#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { pathToFileURL } from "node:url";

const ARTICLE_DIR = "articles";
const DEFAULT_TYPE = "tech";
const PREVIEW_PORT = 8000;
const PREVIEW_HOST = "localhost";
const EMOJI_CHOICES = [
  { emoji: "📝", label: "メモ・記事" },
  { emoji: "💡", label: "アイデア" },
  { emoji: "🚀", label: "リリース・挑戦" },
  { emoji: "🧪", label: "検証・実験" },
  { emoji: "🔧", label: "設定・ツール" },
  { emoji: "📚", label: "学習・まとめ" },
  { emoji: "⚡", label: "効率化" },
  { emoji: "🔒", label: "セキュリティ" }
];

let rl;

function getReadline() {
  if (!rl) {
    rl = createInterface({ input, output });
  }

  return rl;
}

function closeReadline() {
  if (rl) {
    rl.close();
    rl = undefined;
  }
}

function normalizeSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

function normalizeTopics(value) {
  return value
    .split(",")
    .map((topic) => topic.trim())
    .filter(Boolean);
}

function parseTopics(value) {
  const trimmed = value.trim();

  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("[")) {
    try {
      const topics = JSON.parse(trimmed);
      if (!Array.isArray(topics)) {
        throw new Error("topics must be an array");
      }

      if (!topics.every((topic) => typeof topic === "string")) {
        throw new Error("topics must contain only strings");
      }

      return topics.map((topic) => topic.trim()).filter(Boolean);
    } catch {
      throw new Error(
        `topics（記事に関連する言語や技術）を配列で指定してください。例）["react", "javascript"]`
      );
    }
  }

  return normalizeTopics(trimmed);
}

function validateTopics(topics) {
  if (topics.length === 0) {
    return "topicsは1つ以上入力してください。例）[\"react\", \"javascript\"]";
  }

  if (topics.length > 5) {
    return "topicsは5つまで入力してください。";
  }

  if (!topics.every((topic) => typeof topic === "string" && topic.trim())) {
    return `topics（記事に関連する言語や技術）を配列で指定してください。例）["react", "javascript"]`;
  }

  if (topics.some((topic) => topic.includes("、"))) {
    return "topicsをカンマ区切りで入力する場合は、半角カンマ「,」を使ってください。例）react,javascript";
  }

  return null;
}

function quoteYaml(value) {
  return JSON.stringify(value);
}

function formatTopics(topics) {
  if (topics.length === 0) {
    return "[]";
  }

  return `[${topics.map(quoteYaml).join(", ")}]`;
}

function timestampSlug() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");

  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join("");
}

function isNodeError(error, code) {
  return error && typeof error === "object" && "code" in error && error.code === code;
}

async function ask(question, defaultValue = "") {
  const suffix = defaultValue ? ` (${defaultValue})` : "";
  const answer = await getReadline().question(`${question}${suffix}: `);
  return answer.trim() || defaultValue;
}

async function askRequired(question) {
  while (true) {
    const answer = await ask(question);
    if (answer) {
      return answer;
    }

    console.log("必須項目です。入力してください。");
  }
}

async function askType() {
  while (true) {
    const answer = await ask("種類 tech/idea", DEFAULT_TYPE);
    if (answer === "tech" || answer === "idea") {
      return answer;
    }

    console.log("tech または idea を入力してください。");
  }
}

async function askEmoji() {
  console.log("emojiを番号で選んでください。");
  EMOJI_CHOICES.forEach((choice, index) => {
    console.log(`${index + 1}. ${choice.label} ${choice.emoji}`);
  });

  while (true) {
    const answer = await ask("emoji番号", "1");
    const index = Number.parseInt(answer, 10) - 1;

    if (EMOJI_CHOICES[index]) {
      return EMOJI_CHOICES[index].emoji;
    }

    console.log(`1〜${EMOJI_CHOICES.length} の番号を入力してください。`);
  }
}

async function askTopics() {
  while (true) {
    const answer = await ask("topics 配列またはカンマ区切り", `["zenn"]`);

    try {
      const topics = parseTopics(answer);
      const error = validateTopics(topics);

      if (!error) {
        return topics;
      }

      console.log(error);
    } catch (error) {
      console.log(error instanceof Error ? error.message : error);
    }
  }
}

async function askPublished() {
  const answer = await ask("公開する？ y/N", "N");
  return ["y", "yes"].includes(answer.toLowerCase());
}

function buildArticle({ title, emoji, type, topics, published, summary }) {
  const body = summary
    ? `\n${summary}\n\n## はじめに\n\n\n## 本文\n\n\n## まとめ\n\n`
    : "\n## はじめに\n\n\n## 本文\n\n\n## まとめ\n\n";

  return `---
title: ${quoteYaml(title)}
emoji: ${quoteYaml(emoji)}
type: ${quoteYaml(type)}
topics: ${formatTopics(topics)}
published: ${published}
---
${body}`;
}

async function writeUniqueArticle(slug, article, articleDir = ARTICLE_DIR) {
  await mkdir(articleDir, { recursive: true });

  let candidate = slug;
  let index = 2;

  while (true) {
    const articlePath = path.join(articleDir, `${candidate}.md`);

    try {
      await writeFile(articlePath, article, { flag: "wx" });

      return {
        articlePath,
        articleSlug: candidate
      };
    } catch (error) {
      if (!isNodeError(error, "EEXIST")) {
        throw error;
      }

      candidate = `${slug}-${index}`;
      index += 1;
    }
  }
}

function waitForServer({ host, port, timeoutMs = 15000 }) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const retry = () => {
      const socket = net.createConnection({ host, port });

      socket.once("connect", () => {
        socket.end();
        resolve();
      });

      socket.once("error", () => {
        socket.destroy();

        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`プレビューサーバーに接続できませんでした: http://${host}:${port}`));
          return;
        }

        setTimeout(retry, 300);
      });
    };

    retry();
  });
}

function openBrowser(url) {
  const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(opener, args, {
    detached: true,
    stdio: "ignore"
  });

  child.unref();
}

async function startPreview(articleSlug) {
  const articleUrl = `http://${PREVIEW_HOST}:${PREVIEW_PORT}/articles/${articleSlug}`;

  console.log("\nZenn previewを起動します。終了するときは Ctrl+C を押してください。");

  const preview = spawn("npx", ["zenn", "preview", "--port", String(PREVIEW_PORT)], {
    stdio: "inherit"
  });

  try {
    await waitForServer({ host: PREVIEW_HOST, port: PREVIEW_PORT });
    openBrowser(articleUrl);
    console.log(`記事を開きました: ${articleUrl}`);
  } catch (error) {
    preview.kill("SIGTERM");
    throw error;
  }

  preview.on("exit", (code, signal) => {
    if (signal) {
      process.exitCode = 0;
      return;
    }

    process.exitCode = code ?? 0;
  });
}

async function main() {
  console.log("Zenn記事を作成します。空欄はおすすめ値で進められます。\n");

  const title = await askRequired("タイトル");
  const defaultSlug = normalizeSlug(title) || `article-${timestampSlug()}`;
  const slug = normalizeSlug(await ask("slug", defaultSlug)) || defaultSlug;
  const emoji = await askEmoji();
  const type = await askType();
  const topics = await askTopics();
  const published = await askPublished();
  const summary = await ask("概要");

  const article = buildArticle({ title, emoji, type, topics, published, summary });
  const { articlePath, articleSlug } = await writeUniqueArticle(slug, article);

  console.log(`\n作成しました: ${articlePath}`);
  closeReadline();

  await startPreview(articleSlug);
}

export {
  buildArticle,
  formatTopics,
  normalizeSlug,
  normalizeTopics,
  parseTopics,
  validateTopics,
  writeUniqueArticle
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    closeReadline();
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
