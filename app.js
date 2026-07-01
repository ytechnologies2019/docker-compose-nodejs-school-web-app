const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// DB CONFIG
const DB_HOST = "db";
const DB_USER = "student";
const DB_PASSWORD = "123";
const DB_NAME = "school";

let pool;

// Helper function to pause execution
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------- INIT DB (With Retry Condition) ----------------
async function initDB() {
    let connected = false;
    let conn;

    // Keep trying to connect until successful
    while (!connected) {
        try {
            console.log("⏳ Attempting to connect to the database...");
            conn = await mysql.createConnection({
                host: DB_HOST,
                user: DB_USER,
                password: DB_PASSWORD
            });
            connected = true; // If no error thrown, we are connected!
        } catch (err) {
            console.error("❌ Database is not up yet. Retrying in 5 seconds...", err.message);
            await sleep(5000); // Wait 5 seconds before trying again
        }
    }

    // Continue with DB setup once connected
    try {
        await conn.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
        await conn.end();

        pool = mysql.createPool({
            host: DB_HOST,
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_NAME,
            waitForConnections: true,
            connectionLimit: 10
        });

        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) UNIQUE,
                password VARCHAR(100)
            )
        `);

        console.log("✅ DB Ready and initialized");
    } catch (error) {
        console.error("❌ Error setting up database tables:", error);
        process.exit(1); // Crash if tables can't be created after a solid connection
    }
}

// ---------------- SIGNUP ----------------
app.post("/signup", async (req, res) => {
    try {
        const { username, password } = req.body;

        const [exists] = await pool.query(
            "SELECT * FROM users WHERE username=?",
            [username]
        );

        if (exists.length > 0) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        await pool.query(
            "INSERT INTO users(username,password) VALUES(?,?)",
            [username, password]
        );

        res.json({ message: "Signup successful" });

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// ---------------- LOGIN ----------------
app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        const [rows] = await pool.query(
            "SELECT * FROM users WHERE username=?",
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                message: "User not found",
                success: false
            });
        }

        if (rows[0].password !== password) {
            return res.status(401).json({
                message: "Incorrect password",
                success: false
            });
        }

        res.json({
            message: "Login successful",
            success: true
        });

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// ---------------- START ----------------
app.listen(3000, async () => {
    await initDB();
    console.log("🚀 Server running http://localhost:3000");
});