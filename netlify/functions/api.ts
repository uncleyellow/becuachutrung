import { builder } from "@netlify/functions";

// Import ứng dụng Express
const serverApp = require("../../dist/server");

// Lấy ứng dụng Express thực tế
const app = serverApp.default || serverApp;

// Tạo Netlify Function handler
exports.handler = builder(app);