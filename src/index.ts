import { extract } from "@extractus/article-extractor";
import { serve } from "@hono/node-server";
import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.json({ message: "Hello, World!" });
});

app.get("/hello", async (c) => {
  const url = c.req.query("url");

  if (!url) {
    return c.json({ message: "Please provide a url" });
  }

  try {
    const article = await extract(url);

    return c.json({ article });
  } catch (err) {
    console.error(err);
    if (err instanceof Error) {
      return c.json({ message: `An error occurred: ${err.message}` });
      console.error();
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
