import express, { Application, Request, Response } from "express";
import { google } from "googleapis";
import dotenv from "dotenv";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import cors from "cors";
import fs from 'fs';
import path from 'path';

// Load biến môi trường
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json()); // Hỗ trợ JSON payload

// Đọc credentials từ file local
try {
  const credentialsPath = path.join(__dirname, '../credential.json');
  const credentialsData = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  
  // Xác thực Google API
  const auth = new google.auth.GoogleAuth({
    credentials: credentialsData,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  // Thêm sheetId vào đây
  const sheetId = "1vWGafXoO_vxthkV_iZ8gLqIFbaFO5P8GcBCZeWXLGV4"; // Thay thế bằng ID của Google Sheet của bạn

  // Kiểm tra sheetId
  if (!sheetId) {
    console.error("LỖI: Vui lòng thêm sheetId vào code!");
    process.exit(1);
  }

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
  // Trảng Bom
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
  app.get("/trangbom", (req: Request, res: Response) => {
    const range = "TrangBom!A5:P8";

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
  app.post("/trangbom/write", (req: any, res: any) => {
    const { rowIndex, values } = req.body;

    if (!values || !Array.isArray(values) || rowIndex < 6) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }

    const range = `TrangBom!E${rowIndex}:F${rowIndex}`;

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


  // Sóng Thần 
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
  app.get("/songthan", (req: Request, res: Response) => {
    const range = "SongThan!A5:P8";

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
  app.post("/songthan/write", (req: any, res: any) => {
    const { rowIndex, values } = req.body;

    if (!values || !Array.isArray(values) || rowIndex < 6) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }

    const range = `SongThan!E${rowIndex}:F${rowIndex}`;

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



  // Diêu Trì
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
  app.get("/dieutri", (req: Request, res: Response) => {
    const range = "DieuTri!A5:P8";

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
  app.post("/dieutri/write", (req: any, res: any) => {
    const { rowIndex, values } = req.body;

    if (!values || !Array.isArray(values) || rowIndex < 6) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }

    const range = `DieuTri!E${rowIndex}:F${rowIndex}`;

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


  // Đà Nẵng 
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
  app.get("/danang", (req: Request, res: Response) => {
    const range = "DaNang!A5:P8";

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
  app.post("/danang/write", (req: any, res: any) => {
    const { rowIndex, values } = req.body;

    if (!values || !Array.isArray(values) || rowIndex < 6) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }

    const range = `DaNang!E${rowIndex}:F${rowIndex}`;

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



  // Kim Liên
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
  app.get("/kimlien", (req: Request, res: Response) => {
    const range = "KimLien!A5:P8";

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
  app.post("/kimlien/write", (req: any, res: any) => {
    const { rowIndex, values } = req.body;

    if (!values || !Array.isArray(values) || rowIndex < 6) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }

    const range = `KimLien!E${rowIndex}:F${rowIndex}`;

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



  // Đông Anh 
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
  app.get("/donganh", (req: Request, res: Response) => {
    const range = "DongAnh!A5:P8";

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
  app.post("/donganh/write", (req: any, res: any) => {
    const { rowIndex, values } = req.body;

    if (!values || !Array.isArray(values) || rowIndex < 6) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }

    const range = `DongAnh!E${rowIndex}:F${rowIndex}`;

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



  // Giáp Bát
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
  app.get("/giapbat", (req: Request, res: Response) => {
    const range = "GiapBat!A5:P8";

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
  app.post("/giapbat/write", (req: any, res: any) => {
    const { rowIndex, values } = req.body;

    if (!values || !Array.isArray(values) || rowIndex < 6) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }

    const range = `GiapBat!E${rowIndex}:F${rowIndex}`;

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


  // Vinh
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
  app.get("/vinh", (req: Request, res: Response) => {
    const range = "Vinh!A5:P8";

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
  app.post("/vinh/write", (req: any, res: any) => {
    const { rowIndex, values } = req.body;

    if (!values || !Array.isArray(values) || rowIndex < 6) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }

    const range = `Vinh!E${rowIndex}:F${rowIndex}`;

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

} catch (error) {
  console.error("LỖI: Không thể đọc file credential.json:", error);
  process.exit(1);
}


// Chạy server
app.listen(PORT, () => {
  console.log(`✅ Server chạy tại: http://localhost:${PORT}`);
  console.log(`📜 Swagger Docs: http://localhost:${PORT}/api-docs`);
});
