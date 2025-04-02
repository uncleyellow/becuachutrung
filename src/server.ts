import express, { Application, Request, Response } from "express";
import { google } from "googleapis";
import dotenv from "dotenv";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import cors from "cors";

// Load biến môi trường
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json()); // Hỗ trợ JSON payload

// Đọc biến môi trường từ Railway
const credentialsJson = process.env.GOOGLE_CREDENTIALS;
const sheetId = process.env.GOOGLE_SHEET_ID;

// Kiểm tra biến môi trường
if (!credentialsJson) {
  console.error("LỖI: GOOGLE_CREDENTIALS chưa được thiết lập trong Railway!");
  process.exit(1);
}
if (!sheetId) {
  console.error("LỖI: GOOGLE_SHEET_ID chưa được thiết lập trong Railway!");
  process.exit(1);
}

// Parse JSON credentials
const credentials = JSON.parse(credentialsJson);

// Xác thực Google API
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

// Cấu hình Swagger
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Google Sheets API",
      version: "1.0.0",
      description: "API để đọc và ghi dữ liệu vào Google Sheets",
    },
  },
  apis: ["./src/server.ts"], // Chỉ định file chứa Swagger Annotations
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * /data:
 *   get:
 *     summary: Lấy dữ liệu từ Google Sheets
 *     tags:
 *       - Google Sheets
 *     responses:
 *       200:
 *         description: Dữ liệu lấy thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: array
 *                     items:
 *                       type: string
 *       404:
 *         description: Không tìm thấy dữ liệu
 *       500:
 *         description: Lỗi server
 */
app.get("/data", (req: Request, res: Response) => {
  const range = "sum!A5:P8";

  sheets.spreadsheets.values
    .get({
      spreadsheetId: sheetId,
      range: range,
    })
    .then((response) => {
      const rows = response.data.values;
      if (!rows) {
        return res.status(404).json({ message: "Không tìm thấy dữ liệu" });
      }
      res.json({ data: rows });
    })
    .catch((error) => {
      console.error("Lỗi khi lấy dữ liệu từ Google Sheets:", error);
      res.status(500).json({ message: "Lỗi server" });
    });
});


/**
 * @swagger
 * /write:
 *   post:
 *     summary: Ghi dữ liệu vào Google Sheets
 *     tags:
 *       - Google Sheets
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rowIndex:
 *                 type: integer
 *                 example: 6
 *               values:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["2025-03-31T12:00", "2025-03-31T14:00", "120 phút"]
 *     responses:
 *       200:
 *         description: Dữ liệu đã được ghi vào Google Sheets
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       500:
 *         description: Lỗi server
 */
app.post("/write", (req: any, res: any) => {
  const { rowIndex, values } = req.body;

  if (!values || !Array.isArray(values) || rowIndex < 6) {
    return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
  }

  const range = `sum!E${rowIndex}:F${rowIndex}`;

  // Promise .then() và .catch() thay vì async/await
  sheets.spreadsheets.values
    .update({
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [values] },
    })
    .then(() => {
      res.json({ message: `Đã cập nhật hàng ${rowIndex} trong Google Sheets` });
    })
    .catch((error) => {
      console.error("Lỗi khi ghi dữ liệu vào Google Sheets:", error);
      res.status(500).json({ message: "Lỗi server" });
    });
});



// Chạy server
app.listen(PORT, () => {
  console.log(`✅ Server chạy tại: http://localhost:${PORT}`);
  console.log(`📜 Swagger Docs: http://localhost:${PORT}/api-docs`);
});
