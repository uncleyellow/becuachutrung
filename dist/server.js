"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const googleapis_1 = require("googleapis");
const dotenv_1 = __importDefault(require("dotenv"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const cors_1 = __importDefault(require("cors"));
// Load biến môi trường
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json()); // Hỗ trợ JSON payload
try {
    console.log("Express app initialization started...");
    // Đọc credentials từ biến môi trường
    const credentialsData = {
        type: process.env.GOOGLE_TYPE,
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: (_a = process.env.GOOGLE_PRIVATE_KEY) === null || _a === void 0 ? void 0 : _a.replace(/\\n/g, '\n'),
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
    const auth = new googleapis_1.google.auth.GoogleAuth({
        credentials: credentialsData,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = googleapis_1.google.sheets({ version: "v4", auth });
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
    const swaggerDocs = (0, swagger_jsdoc_1.default)(swaggerOptions);
    app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDocs));
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
    app.get("/trangbom", (req, res) => {
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
    app.post("/trangbom/write", (req, res) => {
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
    app.get("/songthan", (req, res) => {
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
    app.post("/songthan/write", (req, res) => {
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
    app.get("/dieutri", (req, res) => {
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
    app.post("/dieutri/write", (req, res) => {
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
    app.get("/danang", (req, res) => {
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
    app.post("/danang/write", (req, res) => {
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
    app.get("/kimlien", (req, res) => {
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
    app.post("/kimlien/write", (req, res) => {
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
    app.get("/donganh", (req, res) => {
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
    app.post("/donganh/write", (req, res) => {
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
    app.get("/giapbat", (req, res) => {
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
    app.post("/giapbat/write", (req, res) => {
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
    app.get("/vinh", (req, res) => {
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
    app.post("/vinh/write", (req, res) => {
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
}
catch (error) {
    console.error("LỖI: Không thể đọc file credential.json:", error);
}
module.exports = app;
if (require.main === module) {
    console.log(`[SERVER STARTUP] Attempting to start server. PORT environment variable: ${process.env.PORT}. Calculated PORT: ${PORT}`);
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`[SERVER STARTUP] Server is truly running on port ${PORT}`);
    });
}
