const { handler } = require("@netlify/functions");

// Import ứng dụng Express
const app = require("../../dist/server");

// Tạo Netlify Function handler
exports.handler = handler(app);