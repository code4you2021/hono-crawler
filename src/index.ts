import { extract } from "@extractus/article-extractor";
import { serve } from "@hono/node-server";
import { Hono } from "hono";

// @ts-ignore
import TurndownService from "turndown";
// @ts-ignore
import { gfm } from "turndown-plugin-gfm";

const turndownService = new TurndownService({
  headingStyle: "atx",
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});

turndownService.use(gfm);

const getExt = (node: any) => {
  // Simple match where the <pre> has the `highlight-source-js` tags
  const getFirstTag = (node: Element) =>
    node.outerHTML.split(">").shift()! + ">";

  const match = node.outerHTML.match(/(highlight-source-|language-)[a-z]+/);

  if (match) return match[0].split("-").pop();

  // Check the parent just in case
  const parent = getFirstTag(node.parentNode!).match(
    /(highlight-source-|language-)[a-z]+/
  );

  if (parent) return parent[0].split("-").pop();

  const getInnerTag = (node: Element) =>
    node.innerHTML.split(">").shift()! + ">";

  const inner = getInnerTag(node).match(/(highlight-source-|language-)[a-z]+/);

  if (inner) return inner[0].split("-").pop();

  // Nothing was found...
  return "";
};

turndownService.addRule("fenceAllPreformattedText", {
  filter: ["pre"],

  replacement: function (content: any, node: any) {
    const ext = getExt(node);

    const code = [...node.childNodes].map((c) => c.textContent).join("");

    return `\n\`\`\`${ext}\n${code}\n\`\`\`\n\n`;
  },
});

turndownService.addRule("strikethrough", {
  filter: ["del", "s"],

  replacement: function (content: string) {
    return "~" + content + "~";
  },
});

const app = new Hono();

app.get("/", (c) => {
  return c.json({ message: "Hello, World!" });
});

app.get("/hello", async (c) => {
  const url = c.req.query("url");
  const format = c.req.query("format");

  if (!url) {
    return c.json({ message: "Please provide a url" });
  }

  try {
    const article = await extract(url);

    if (format === "md" && article && article.content) {
      let content = article.content.replace(/(\<!--.*?\-->)/g, "");

      if (article.title && article.title.length) {
        // check if first h2 is the same as title
        const h2Regex = /<h2[^>]*>(.*?)<\/h2>/;
        const match = content.match(h2Regex);
        if (match?.[0].includes(article.title)) {
          // replace fist h2 with h1
          content = content.replace("<h2", "<h1").replace("</h2", "</h1");
        } else {
          // add title as h1
          content = `<h1>${article.title}</h1>\n${content}`;
        }
      }

      let markdown = turndownService.turndown(content);

      // replace weird header refs
      const pattern = /\[\]\(#[^)]*\)/g;
      markdown = markdown.replace(pattern, "");

      return c.json({ markdown });
    }

    return c.json({ article });
  } catch (err) {
    if (err instanceof Error) {
      return c.json({ message: `An error occurred: ${err.message}` });
    }
    return c.json({ message: "Oop!!! An error occurred." });
  }
});

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
