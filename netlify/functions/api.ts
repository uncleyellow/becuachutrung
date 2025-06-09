import { default as server } from "../../dist/server";
import serverless from "@netlify/functions";

const handler = serverless.handler(server);

export { handler }; 