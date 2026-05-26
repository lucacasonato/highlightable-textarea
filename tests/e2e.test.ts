import {
  type Browser,
  type BrowserType,
  chromium,
  firefox,
  type Page,
  webkit,
} from "playwright";
import { serveDir } from "@std/http/file-server";
import { assertEquals } from "@std/assert";

const PORT = 8123;
const ORIGIN = `http://localhost:${PORT}`;

const BROWSERS: Record<string, BrowserType> = {
  chromium,
  firefox,
  webkit,
};

async function bundleDemo() {
  const cmd = new Deno.Command(Deno.execPath(), {
    args: ["task", "demo"],
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stderr } = await cmd.output();
  if (code !== 0) {
    throw new Error(`bundle failed: ${new TextDecoder().decode(stderr)}`);
  }
}

function startServer(): Disposable {
  const ac = new AbortController();
  Deno.serve(
    { port: PORT, signal: ac.signal, onListen: () => {} },
    (req) => serveDir(req, { fsRoot: "demo", quiet: true }),
  );
  return { [Symbol.dispose]: () => ac.abort() };
}

async function launchBrowser(
  type: BrowserType,
): Promise<Browser & AsyncDisposable> {
  const browser = await type.launch();
  return Object.assign(browser, {
    [Symbol.asyncDispose]: () => browser.close(),
  });
}

async function openPage(browser: Browser): Promise<Page & AsyncDisposable> {
  const page = await browser.newPage();
  await page.goto(`${ORIGIN}/`);
  await page.waitForSelector("[data-highlightable-textarea]");
  return Object.assign(page, {
    [Symbol.asyncDispose]: () => page.close(),
  });
}

Deno.test({
  name: "HighlightableTextarea",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async (t) => {
    await bundleDemo();
    using _server = startServer();

    for (const [name, type] of Object.entries(BROWSERS)) {
      await t.step(name, async (t) => {
        await using browser = await launchBrowser(type);

        await t.step(
          "typing forwards onInput and triggers re-highlight",
          async () => {
            await using page = await openPage(browser);
            const editor = page.locator("[data-highlightable-textarea]");
            await editor.click();
            await page.keyboard.type("hello {{name}} world");

            assertEquals(await editor.textContent(), "hello {{name}} world");

            const highlightCount = await page.evaluate(() => {
              // @ts-ignore: browser-side
              const h = CSS.highlights.get("red");
              return h ? h.size : 0;
            });
            assertEquals(
              highlightCount,
              1,
              "expected one highlight for {{name}}",
            );
          },
        );

        await t.step(
          "external value change updates DOM and highlights",
          async () => {
            await using page = await openPage(browser);
            const editor = page.locator("[data-highlightable-textarea]");
            await editor.click();
            await page.keyboard.type("a");

            await page.locator("button").click();
            await page.locator("[data-highlightable-textarea]")
              .filter({ hasText: "a {{token}}" }).waitFor();
            await page.locator("button").click();
            await page.locator("[data-highlightable-textarea]")
              .filter({ hasText: "a {{token}} {{token}}" }).waitFor();

            assertEquals(await editor.textContent(), "a {{token}} {{token}}");

            const highlightCount = await page.evaluate(() => {
              // @ts-ignore: browser-side
              const h = CSS.highlights.get("red");
              return h ? h.size : 0;
            });
            assertEquals(highlightCount, 2);
          },
        );

        await t.step(
          "highlight ranges cover the matched substrings",
          async () => {
            await using page = await openPage(browser);
            const editor = page.locator("[data-highlightable-textarea]");
            await editor.click();
            await page.keyboard.type("x {{a}} y");

            const texts = await page.evaluate(() => {
              // @ts-ignore: browser-side
              const h = CSS.highlights.get("red");
              if (!h) return [];
              // deno-lint-ignore no-explicit-any
              return Array.from(h, (r: any) => r.toString());
            });
            assertEquals(texts, ["{{a}}"]);
          },
        );
      });
    }
  },
});
