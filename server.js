// import { accessCheckOk } from "@wiser/lockdown";
import { createServer } from "http";
import { parse } from "url";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const routes = [
  {
    path: /^\/ping$/,
    ctrl: async (_req, res) => {
      console.log("Hello");
      res.writeHead(200);
      res.end();
    }
  },
];

app.prepare().then(() => {
  createServer(async (req, res) => {
    // Be sure to pass `true` as the second argument to `url.parse`.
    // This tells it to parse the query portion of the URL.

    const parsedUrl = parse(req.url, true);
    const { pathname, query } = parsedUrl;

    for (let route of routes) {
      if (!!pathname.match(route.path)) {
        await route.ctrl(req, res);
        return;
      }
    }

    // if (!accessCheckOk(req, res)) {
    //   return;
    // }

    handle(req, res, parsedUrl);
  }).listen(3000, (err) => {
    if (err) throw err;
    console.log("> Ready on http://localhost:3000");
  });
});
