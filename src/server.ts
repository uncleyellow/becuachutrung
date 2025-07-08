import express, { Application, Request, Response, NextFunction } from "express";
import { google } from "googleapis";
import dotenv from "dotenv";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import cors from "cors";

// Load biến môi trường
dotenv.config();

const app: Application = express();
const PORT: number = Number(process.env.PORT) || 3000;

const allowedOrigins = [
  'http://localhost:4200',
  'https://chutrung.netlify.app',
  'https://becuachutrung.onrender.com',
];

// Cấu hình CORS chi tiết
app.use(cors({
  origin: [ 'http://localhost:4200',
    'https://chutrung.netlify.app',
    'https://becuachutrung.onrender.com',],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middleware để log request
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Request Headers:', req.headers);
  console.log('Request Body:', req.body);
  
  // Log response
  const originalSend = res.send;
  res.send = function (body) {
    console.log(`[${new Date().toISOString()}] Response:`, {
      statusCode: res.statusCode,
      body: body
    });
    return originalSend.call(this, body);
  };
  
  next();
});

app.use(express.json({ limit: '10mb' })); // Tăng giới hạn kích thước request
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

try {
  console.log("Express app initialization started...");
  // Đọc credentials từ biến môi trường
  const credentialsData = {
    type: process.env.GOOGLE_TYPE,
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: process.env.GOOGLE_AUTH_URI,
    token_uri: process.env.GOOGLE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL,
    universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN
  };

  // Kiểm tra các biến môi trường bắt buộc
  const requiredEnvVars = [
    'GOOGLE_TYPE',
    'GOOGLE_PROJECT_ID',
    'GOOGLE_PRIVATE_KEY_ID',
    'GOOGLE_PRIVATE_KEY',
    'GOOGLE_CLIENT_EMAIL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_AUTH_URI',
    'GOOGLE_TOKEN_URI',
    'GOOGLE_AUTH_PROVIDER_CERT_URL',
    'GOOGLE_CLIENT_CERT_URL',
    'GOOGLE_UNIVERSE_DOMAIN'
  ];

  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingEnvVars.length > 0) {
    console.error('LỖI: Thiếu các biến môi trường sau:', missingEnvVars.join(', '));
  }
  
  // Xác thực Google API
  const auth = new google.auth.GoogleAuth({
    credentials: credentialsData,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  // Thêm sheetId vào đây
  const sheetId = process.env.GOOGLE_SHEET_ID;

  // Kiểm tra sheetId
  if (!sheetId) {
    console.error("LỖI: Vui lòng thêm GOOGLE_SHEET_ID vào biến môi trường!");
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
    const range = "TrangBom!A5:P";

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

    const range = `TrangBom!B${rowIndex}:P${rowIndex}`;

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

  /**
   * @swagger
   * /trangbom/add:
   *   post:
   *     summary: Thêm bản ghi mới vào TrangBom (cột B đến P)
   *     tags:
   *       - Google Sheets
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               values:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["giá trị B", "giá trị C", ..., "giá trị P"]
   *     responses:
   *       200:
   *         description: Đã thêm bản ghi mới
   *       400:
   *         description: Dữ liệu không hợp lệ
   *       500:
   *         description: Lỗi server
   */
  app.post("/trangbom/add", (req: any, res: any) => {
    const { values } = req.body;
    if (!values || !Array.isArray(values) || values.length !== 15) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ, cần đúng 15 giá trị cho các cột B đến P" });
    }
    const range = "TrangBom!B:P";
    sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [values] }
    })
      .then((response) => {
        res.json({ message: "Đã thêm bản ghi mới vào TrangBom", details: response.data });
      })
      .catch((error) => {
        console.error("Lỗi khi thêm bản ghi vào Google Sheets:", error);
        res.status(500).json({ message: "Lỗi server", details: error.message });
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
    const range = "SongThan!A5:P";

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

    const range = `SongThan!B${rowIndex}:P${rowIndex}`;

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

  /**
   * @swagger
   * /songthan/add:
   *   post:
   *     summary: Thêm bản ghi mới vào SongThan (cột B đến P)
   *     tags:
   *       - Google Sheets
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               values:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["giá trị B", "giá trị C", ..., "giá trị P"]
   *     responses:
   *       200:
   *         description: Đã thêm bản ghi mới
   *       400:
   *         description: Dữ liệu không hợp lệ
   *       500:
   *         description: Lỗi server
   */
  app.post("/songthan/add", (req: any, res: any) => {
    const { values } = req.body;
    if (!values || !Array.isArray(values) || values.length !== 15) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ, cần đúng 15 giá trị cho các cột B đến P" });
    }
    const range = "SongThan!B:P";
    sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [values] }
    })
      .then((response) => {
        res.json({ message: "Đã thêm bản ghi mới vào SongThan", details: response.data });
      })
      .catch((error) => {
        console.error("Lỗi khi thêm bản ghi vào Google Sheets:", error);
        res.status(500).json({ message: "Lỗi server", details: error.message });
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
    const range = "DieuTri!A5:P";

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

    const range = `DieuTri!B${rowIndex}:P${rowIndex}`;

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

  /**
   * @swagger
   * /dieutri/add:
   *   post:
   *     summary: Thêm bản ghi mới vào DieuTri (cột B đến P)
   *     tags:
   *       - Google Sheets
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               values:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["giá trị B", "giá trị C", ..., "giá trị P"]
   *     responses:
   *       200:
   *         description: Đã thêm bản ghi mới
   *       400:
   *         description: Dữ liệu không hợp lệ
   *       500:
   *         description: Lỗi server
   */
  app.post("/dieutri/add", (req: any, res: any) => {
    const { values } = req.body;
    if (!values || !Array.isArray(values) || values.length !== 15) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ, cần đúng 15 giá trị cho các cột B đến P" });
    }
    const range = "DieuTri!B:P";
    sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [values] }
    })
      .then((response) => {
        res.json({ message: "Đã thêm bản ghi mới vào DieuTri", details: response.data });
      })
      .catch((error) => {
        console.error("Lỗi khi thêm bản ghi vào Google Sheets:", error);
        res.status(500).json({ message: "Lỗi server", details: error.message });
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
    const range = "DaNang!A5:P";

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

    const range = `DaNang!B${rowIndex}:P${rowIndex}`;

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

  /**
   * @swagger
   * /danang/add:
   *   post:
   *     summary: Thêm bản ghi mới vào DaNang (cột B đến P)
   *     tags:
   *       - Google Sheets
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               values:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["giá trị B", "giá trị C", ..., "giá trị P"]
   *     responses:
   *       200:
   *         description: Đã thêm bản ghi mới
   *       400:
   *         description: Dữ liệu không hợp lệ
   *       500:
   *         description: Lỗi server
   */
  app.post("/danang/add", (req: any, res: any) => {
    const { values } = req.body;
    if (!values || !Array.isArray(values) || values.length !== 15) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ, cần đúng 15 giá trị cho các cột B đến P" });
    }
    const range = "DaNang!B:P";
    sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [values] }
    })
      .then((response) => {
        res.json({ message: "Đã thêm bản ghi mới vào DaNang", details: response.data });
      })
      .catch((error) => {
        console.error("Lỗi khi thêm bản ghi vào Google Sheets:", error);
        res.status(500).json({ message: "Lỗi server", details: error.message });
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
    const range = "KimLien!A5:P";

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

    const range = `KimLien!B${rowIndex}:P${rowIndex}`;

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

  /**
   * @swagger
   * /kimlien/add:
   *   post:
   *     summary: Thêm bản ghi mới vào KimLien (cột B đến P)
   *     tags:
   *       - Google Sheets
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               values:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["giá trị B", "giá trị C", ..., "giá trị P"]
   *     responses:
   *       200:
   *         description: Đã thêm bản ghi mới
   *       400:
   *         description: Dữ liệu không hợp lệ
   *       500:
   *         description: Lỗi server
   */
  app.post("/kimlien/add", (req: any, res: any) => {
    const { values } = req.body;
    if (!values || !Array.isArray(values) || values.length !== 15) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ, cần đúng 15 giá trị cho các cột B đến P" });
    }
    const range = "KimLien!B:P";
    sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [values] }
    })
      .then((response) => {
        res.json({ message: "Đã thêm bản ghi mới vào KimLien", details: response.data });
      })
      .catch((error) => {
        console.error("Lỗi khi thêm bản ghi vào Google Sheets:", error);
        res.status(500).json({ message: "Lỗi server", details: error.message });
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
    const range = "DongAnh!A5:P";

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

    const range = `DongAnh!B${rowIndex}:P${rowIndex}`;

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

  /**
   * @swagger
   * /donganh/add:
   *   post:
   *     summary: Thêm bản ghi mới vào DongAnh (cột B đến P)
   *     tags:
   *       - Google Sheets
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               values:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["giá trị B", "giá trị C", ..., "giá trị P"]
   *     responses:
   *       200:
   *         description: Đã thêm bản ghi mới
   *       400:
   *         description: Dữ liệu không hợp lệ
   *       500:
   *         description: Lỗi server
   */
  app.post("/donganh/add", (req: any, res: any) => {
    const { values } = req.body;
    if (!values || !Array.isArray(values) || values.length !== 15) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ, cần đúng 15 giá trị cho các cột B đến P" });
    }
    const range = "DongAnh!B:P";
    sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [values] }
    })
      .then((response) => {
        res.json({ message: "Đã thêm bản ghi mới vào DongAnh", details: response.data });
      })
      .catch((error) => {
        console.error("Lỗi khi thêm bản ghi vào Google Sheets:", error);
        res.status(500).json({ message: "Lỗi server", details: error.message });
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
    const range = "GiapBat!A5:P";

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

    const range = `GiapBat!B${rowIndex}:P${rowIndex}`;

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


  /**
   * @swagger
   * /giapbat/add:
   *   post:
   *     summary: Thêm bản ghi mới vào GiapBat (cột B đến P)
   *     tags:
   *       - Google Sheets
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               values:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["giá trị B", "giá trị C", ..., "giá trị P"]
   *     responses:
   *       200:
   *         description: Đã thêm bản ghi mới
   *       400:
   *         description: Dữ liệu không hợp lệ
   *       500:
   *         description: Lỗi server
   */
  app.post("/giapbat/add", (req: any, res: any) => {
    const { values } = req.body;
    if (!values || !Array.isArray(values) || values.length !== 15) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ, cần đúng 15 giá trị cho các cột B đến P" });
    }
    const range = "GiapBat!B:P";
    sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [values] }
    })
      .then((response) => {
        res.json({ message: "Đã thêm bản ghi mới vào GiapBat", details: response.data });
      })
      .catch((error) => {
        console.error("Lỗi khi thêm bản ghi vào Google Sheets:", error);
        res.status(500).json({ message: "Lỗi server", details: error.message });
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
    const range = "Vinh!A5:P";

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
    try {
        const { rowIndex, values } = req.body;
        const range = `Vinh!B${rowIndex}:P${rowIndex}`;
        sheets.spreadsheets.values
            .update({
                spreadsheetId: sheetId,
                range: range,
                valueInputOption: "USER_ENTERED",
                requestBody: { values: [values] },
            })
            .then((response) => {
                console.log("Update successful. Response:", response.data);
                res.json({ 
                    message: `Đã cập nhật hàng ${rowIndex} trong Google Sheets`,
                    details: {
                        range: range,
                        values: values,
                        response: response.data
                    }
                });
            })
            .catch((error) => {
                console.error("Google Sheets API Error:", {
                    message: error.message,
                    code: error.code,
                    status: error.status,
                    errors: error.errors,
                    stack: error.stack,
                    requestRange: range,
                    requestValues: values
                });
                res.status(500).json({ 
                    message: "Lỗi khi cập nhật Google Sheets",
                    details: {
                        error: error.message,
                        code: error.code,
                        status: error.status,
                        range: range,
                        valuesCount: values.length
                    }
                });
            });
    } catch (error: any) {
        console.error("Unexpected error in /vinh/write:", {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ 
            message: "Lỗi không xác định",
            details: {
                error: error.message
            }
        });
    }
  });

  /**
   * @swagger
   * /vinh/add:
   *   post:
   *     summary: Thêm bản ghi mới vào Vinh (cột B đến P)
   *     tags:
   *       - Google Sheets
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               values:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["giá trị B", "giá trị C", ..., "giá trị P"]
   *     responses:
   *       200:
   *         description: Đã thêm bản ghi mới
   *       400:
   *         description: Dữ liệu không hợp lệ
   *       500:
   *         description: Lỗi server
   */
  app.post("/vinh/add", (req: any, res: any) => {
    const { values } = req.body;
    if (!values || !Array.isArray(values) || values.length !== 15) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ, cần đúng 15 giá trị cho các cột B đến P" });
    }
    const range = "Vinh!B:P";
    sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [values] }
    })
      .then((response) => {
        res.json({ message: "Đã thêm bản ghi mới vào Vinh", details: response.data });
      })
      .catch((error) => {
        console.error("Lỗi khi thêm bản ghi vào Google Sheets:", error);
        res.status(500).json({ message: "Lỗi server", details: error.message });
      });
  });

  // Quảng Ngãi
  /**
   * @swagger
   * /quangngai:
   *   get:
   *     summary: Lấy dữ liệu từ Google Sheets (QuangNgai)
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
  app.get("/quangngai", (req: Request, res: Response) => {
    const range = "QuangNgai!A5:P";
    sheets.spreadsheets.values
      .get({ spreadsheetId: sheetId, range })
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
   * /quangngai/write:
   *   post:
   *     summary: Ghi dữ liệu vào Google Sheets (QuangNgai)
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
  app.post("/quangngai/write", (req: any, res: any) => {
    const { rowIndex, values } = req.body;
    if (!values || !Array.isArray(values) || rowIndex < 6) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }
    const range = `QuangNgai!B${rowIndex}:P${rowIndex}`;
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

  /**
   * @swagger
   * /quangngai/add:
   *   post:
   *     summary: Thêm bản ghi mới vào QuangNgai (cột B đến P)
   *     tags:
   *       - Google Sheets
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               values:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["giá trị B", "giá trị C", ..., "giá trị P"]
   *     responses:
   *       200:
   *         description: Đã thêm bản ghi mới
   *       400:
   *         description: Dữ liệu không hợp lệ
   *       500:
   *         description: Lỗi server
   */
  app.post("/quangngai/add", (req: any, res: any) => {
    const { values } = req.body;
    if (!values || !Array.isArray(values) || values.length !== 15) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ, cần đúng 15 giá trị cho các cột B đến P" });
    }
    const range = "QuangNgai!B:P";
    sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [values] }
    })
      .then((response) => {
        res.json({ message: "Đã thêm bản ghi mới vào QuangNgai", details: response.data });
      })
      .catch((error) => {
        console.error("Lỗi khi thêm bản ghi vào Google Sheets:", error);
        res.status(500).json({ message: "Lỗi server", details: error.message });
      });
  });

  // Nha Trang
  /**
   * @swagger
   * /nhatrang:
   *   get:
   *     summary: Lấy dữ liệu từ Google Sheets (NhaTrang)
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
  app.get("/nhatrang", (req: Request, res: Response) => {
    const range = "NhaTrang!A5:P";
    sheets.spreadsheets.values
      .get({ spreadsheetId: sheetId, range })
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
   * /nhatrang/write:
   *   post:
   *     summary: Ghi dữ liệu vào Google Sheets (NhaTrang)
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
  app.post("/nhatrang/write", (req: any, res: any) => {
    const { rowIndex, values } = req.body;
    if (!values || !Array.isArray(values) || rowIndex < 6) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }
    const range = `NhaTrang!B${rowIndex}:P${rowIndex}`;
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

  /**
   * @swagger
   * /nhatrang/add:
   *   post:
   *     summary: Thêm bản ghi mới vào NhaTrang (cột B đến P)
   *     tags:
   *       - Google Sheets
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               values:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["giá trị B", "giá trị C", ..., "giá trị P"]
   *     responses:
   *       200:
   *         description: Đã thêm bản ghi mới
   *       400:
   *         description: Dữ liệu không hợp lệ
   *       500:
   *         description: Lỗi server
   */
  app.post("/nhatrang/add", (req: any, res: any) => {
    const { values } = req.body;
    if (!values || !Array.isArray(values) || values.length !== 15) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ, cần đúng 15 giá trị cho các cột B đến P" });
    }
    const range = "NhaTrang!B:P";
    sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [values] }
    })
      .then((response) => {
        res.json({ message: "Đã thêm bản ghi mới vào NhaTrang", details: response.data });
      })
      .catch((error) => {
        console.error("Lỗi khi thêm bản ghi vào Google Sheets:", error);
        res.status(500).json({ message: "Lỗi server", details: error.message });
      });
  });

  // Bình Thuận
  /**
   * @swagger
   * /binhthuan:
   *   get:
   *     summary: Lấy dữ liệu từ Google Sheets (BinhThuan)
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
  app.get("/binhthuan", (req: Request, res: Response) => {
    const range = "BinhThuan!A5:P";
    sheets.spreadsheets.values
      .get({ spreadsheetId: sheetId, range })
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
   * /binhthuan/write:
   *   post:
   *     summary: Ghi dữ liệu vào Google Sheets (BinhThuan)
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
  app.post("/binhthuan/write", (req: any, res: any) => {
    const { rowIndex, values } = req.body;
    if (!values || !Array.isArray(values) || rowIndex < 6) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }
    const range = `BinhThuan!B${rowIndex}:P${rowIndex}`;
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

  /**
   * @swagger
   * /binhthuan/add:
   *   post:
   *     summary: Thêm bản ghi mới vào BinhThuan (cột B đến P)
   *     tags:
   *       - Google Sheets
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               values:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["giá trị B", "giá trị C", ..., "giá trị P"]
   *     responses:
   *       200:
   *         description: Đã thêm bản ghi mới
   *       400:
   *         description: Dữ liệu không hợp lệ
   *       500:
   *         description: Lỗi server
   */
  app.post("/binhthuan/add", (req: any, res: any) => {
    const { values } = req.body;
    if (!values || !Array.isArray(values) || values.length !== 15) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ, cần đúng 15 giá trị cho các cột B đến P" });
    }
    const range = "BinhThuan!B:P";
    sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [values] }
    })
      .then((response) => {
        res.json({ message: "Đã thêm bản ghi mới vào BinhThuan", details: response.data });
      })
      .catch((error) => {
        console.error("Lỗi khi thêm bản ghi vào Google Sheets:", error);
        res.status(500).json({ message: "Lỗi server", details: error.message });
      });
  });

} catch (error) {
  console.error("LỖI: Không thể đọc file credential.json:", error);
}

module.exports = app;

if (require.main === module) {
  console.log(`[SERVER STARTUP] Attempting to start server. PORT environment variable: ${process.env.PORT}. Calculated PORT: ${PORT}`);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER STARTUP] Server is truly running on port ${PORT}`);
  });
}

