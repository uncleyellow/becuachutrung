import { builder } from "@netlify/functions";

const app = require("../../dist/server");

const handler = builder(app);

export { handler }; 