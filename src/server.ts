import express, { Application, Request, Response } from "express";
import { google } from "googleapis";
import dotenv from "dotenv";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import cors from "cors";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json()); // Hỗ trợ JSON payload trong body request

// Kiểm tra biến môi trường
if (!process.env.GOOGLE_CREDENTIALS || !process.env.GOOGLE_SHEET_ID) {
  console.error("❌ Thiếu GOOGLE_CREDENTIALS hoặc GOOGLE_SHEET_ID trong .env");
  process.exit(1);
}

// Cấu hình xác thực Google Sheets
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS || "{}");

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
    servers: [
      {
        url: process.env.RAILWAY_PUBLIC_URL || `http://localhost:${PORT}`,
      },
    ],
  },
  apis: ["./src/server.ts"], // Chỉ định các file chứa API docs
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * /data:
 *   get:
 *     summary: Lấy dữ liệu từ Google Sheets
 *     responses:
 *       200:
 *         description: Dữ liệu lấy thành công
 *       500:
 *         description: Lỗi server
 */
app.get("/data", async (req: Request, res: Response): Promise<void> => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const range = "sum!A5:P8";

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: range,
    });

    const rows = response.data.values;
    if (!rows) {
      res.status(404).json({ message: "Không tìm thấy dữ liệu" });
      return;
    }

    res.json({ data: rows });
  } catch (error) {
    console.error("❌ Lỗi khi lấy dữ liệu từ Google Sheets:", error);
    res.status(500).json({ message: "Lỗi server", error });
  }
});

/**
 * @swagger
 * /write:
 *   post:
 *     summary: Ghi dữ liệu vào Google Sheets
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rowIndex:
 *                 type: integer
 *                 description: Số hàng cần cập nhật (tối thiểu 6)
 *               values:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Dữ liệu cần ghi
 *             example:
 *               rowIndex: 6
 *               values: ["2025-03-31T12:00", "2025-03-31T14:00", "120 phút"]
 *     responses:
 *       200:
 *         description: Dữ liệu đã được ghi vào Google Sheets
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       500:
 *         description: Lỗi server
 */
app.post("/write", async (req: Request, res: Response): Promise<void> => {
  try {
    const { rowIndex, values } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!rowIndex || !Array.isArray(values) || rowIndex < 6) {
      res.status(400).json({ message: "Dữ liệu không hợp lệ, rowIndex phải ≥ 6" });
      return;
    }

    const sheetId = process.env.GOOGLE_SHEET_ID;
    const range = `sum!E${rowIndex}:G${rowIndex}`; // Ghi vào cột E, F, G

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [values] },
    });

    res.json({ message: `✅ Đã cập nhật hàng ${rowIndex} trong Google Sheets` });
  } catch (error) {
    console.error("❌ Lỗi khi ghi dữ liệu vào Google Sheets:", error);
    res.status(500).json({ message: "Lỗi server", error });
  }
});

// Chạy server
app.listen(PORT, () => {
  console.log(`🚀 Server chạy tại: http://localhost:${PORT}`);
  console.log(`📖 Swagger UI: http://localhost:${PORT}/api-docs`);
});
