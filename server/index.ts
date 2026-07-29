import express from "express";
import cors from "cors";
import mysql, { RowDataPacket } from "mysql2/promise";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// --- 1. MySQL Operational DB Setup ---
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "clickflow",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function initDB() {
  try {
    const connection = await pool.getConnection();

    await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                login_id VARCHAR(255) NOT NULL UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

    await connection.query(`
            CREATE TABLE IF NOT EXISTS items (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                item_name VARCHAR(255) NOT NULL,
                price INT NOT NULL,
                information TEXT,
                image_url VARCHAR(255)
            )
        `);

    await connection.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id BIGINT NOT NULL,
                item_id VARCHAR(255) NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (item_id) REFERENCES items(id)
            )
        `);

    connection.release();
    console.log("Operational MySQL DB initialized");
  } catch (err) {
    console.error("Failed to initialize MySQL:", err);
  }
}

initDB();

// --- 2. Log File Setup ---
const LOG_FILE = path.join(__dirname, "logs.jsonl");

// --- 3. API Endpoints ---

// Logger Endpoint (File-based)
app.post("/api/log", (req, res) => {
  const logData = {
    ...req.body,
    event_time: new Date().toISOString(),
  };

  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(logData) + "\n");
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Failed to write log:", err);
    res.status(500).json({ success: false, error: "Failed to collect log" });
  }
});

// Login Endpoint (Operational DB)
app.post("/api/login", async (req, res) => {
  const { login_id } = req.body;
  if (!login_id) {
    return res
      .status(400)
      .json({ success: false, error: "Login ID is required" });
  }

  try {
    await pool.query(
      "INSERT INTO users (login_id) VALUES (?) ON DUPLICATE KEY UPDATE login_id = login_id",
      [login_id],
    );

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, login_id FROM users WHERE login_id = ?",
      [login_id],
    );

    if (rows.length === 0) {
      return res
        .status(500)
        .json({ success: false, error: "Failed to load user" });
    }

    const user = rows[0];
    res.status(200).json({
      success: true,
      user_id: user.id,
      login_id: user.login_id,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Item Endpoints (Operational DB)
app.get("/api/items", async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM items");
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

// Transaction Endpoint (Operational DB)
app.post("/api/purchase", async (req, res) => {
  const { user_id, item_id } = req.body;
  try {
    await pool.query(
      "INSERT INTO transactions (user_id, item_id) VALUES (?, ?)",
      [user_id, item_id],
    );
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Purchase failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
