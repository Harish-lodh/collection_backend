
import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
const app = express();
const port = process.env.PORT;

// ---------- Middleware ----------
app.use(cors()); // tighten in prod: cors({ origin: ['https://yourapp.com'] })
app.use(express.json({ limit: '1mb' })); // parse JSON bodies

// ---------- MySQL Pool ----------
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'Fintree@2025',
  database: process.env.DB_NAME || 'payments',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("✅ Connected to MySQL database!");
    conn.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  }
})();

// ---------- Ensure table exists (camelCase columns) ----------
async function ensureTable() {
  const conn = await pool.getConnection();
  try {
    // loan_details table
    const createLoan = `
      CREATE TABLE IF NOT EXISTS \`loan_details\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`loanId\` VARCHAR(64) NOT NULL,
        \`customerName\` VARCHAR(128) NOT NULL,
        \`vehicleNumber\` VARCHAR(32) NOT NULL,
        \`contactNumber\` VARCHAR(32) NOT NULL,
        \`paymentDate\` DATE NOT NULL,
        \`paymentMode\` VARCHAR(32) NULL,           -- ✅ added
        \`paymentRef\` VARCHAR(64) NULL,
        \`collectedBy\` VARCHAR(128) NULL,
        \`amount\` DECIMAL(12,2) NOT NULL,
        \`amountInWords\` VARCHAR(256) NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await conn.query(createLoan);

    // users table
    const createUsers = `
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(100) NOT NULL,
        \`email\` VARCHAR(100) UNIQUE NOT NULL,
        \`password\` VARCHAR(255) NOT NULL,
        \`role\` ENUM('RM','ADMIN') DEFAULT 'RM',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await conn.query(createUsers);

  } finally {
    conn.release();
  }
}

// ---------- Helpers ----------
/** Normalize to 'YYYY-MM-DD'. Accepts Date or 'YYYY-MM-DD' or 'DD-MM-YYYY'/'DD/MM/YYYY'. */
function normalizeToSqlDate(input) {
  if (!input) return null;

  if (input instanceof Date && !isNaN(input)) {
    const y = input.getFullYear();
    const m = String(input.getMonth() + 1).padStart(2, '0');
    const d = String(input.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  if (typeof input === 'string') {
    const s = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // already YYYY-MM-DD
    const m = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/); // DD-MM-YYYY or DD/MM/YYYY
    if (m) {
      const [, dd, mm, yyyy] = m;
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  return null;
}

// ---------- JWT Middleware ----------

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  console.log("Full Authorization header:", authHeader); // 👀 check this
  const token = authHeader && authHeader.split(" ")[1];
  console.log("Extracted token:", token);
  console.log("JWT_SECRET length:", process.env.JWT_SECRET.length);

  if (!token) return res.status(401).json({ message: "No token provided" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("JWT verify error:", err.message);
      return res.status(403).json({ message: "Invalid token" });
    }
    req.user = decoded;
   // console.log("Decoded payload:", decoded);
    next();
  });
}

// ---------- Health ----------
app.get('/health', (_req, res) => res.json({ ok: true }));

// Quick list endpoint to verify inserts
app.get('/loans', authenticateToken, async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM `loan_details` ORDER BY id DESC LIMIT 20');
    res.json(rows);
  } catch (err) {
    console.error('Error in /loans:', err);
    res.status(500).json({ message: 'Error fetching loans' });
  }
});

// ---------- Register Endpoint ----------
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    // check if user already exists
    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    // hash password
    // const hashedPassword = await bcrypt.hash(password, 10);

    // default role = RM
    const userRole = role && ["RM", "ADMIN"].includes(role) ? role : "RM";

    const sql = "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)";
    const [result] = await pool.execute(sql, [name, email, password, userRole]);

    return res.status(201).json({
      message: "User registered successfully",
      userId: result.insertId,
    });
  } catch (err) {
    console.error("Error in /auth/register:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ---------- Login Endpoint ----------
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    const user = rows[0];
    if (password !== user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error("Error in /auth/login:", err);
    res.status(500).json({ message: "Server error" });
  }
});


app.post('/save-loan', authenticateToken, async (req, res) => {
  try {
    const {
      loanId,
      customerName,
      vehicleNumber,
      contactNumber,
      paymentDate,
      paymentMode,   // ✅ added
      paymentRef,
      collectedBy,
      amount,
      amountInWords,
    } = req.body || {};

    // Basic validation
    if (!loanId || !customerName || !vehicleNumber || !contactNumber || paymentDate == null || amount == null) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const sqlDate = normalizeToSqlDate(paymentDate);
    if (!sqlDate) {
      return res.status(400).json({ message: 'Invalid paymentDate format. Use YYYY-MM-DD.' });
    }

    const amountNum = Number(amount);
    if (Number.isNaN(amountNum)) {
      return res.status(400).json({ message: 'Amount must be a number' });
    }

    const sql = `
      INSERT INTO \`loan_details\` (
        \`loanId\`,
        \`customerName\`,
        \`vehicleNumber\`,
        \`contactNumber\`,
        \`paymentDate\`,
        \`paymentMode\`,
        \`paymentRef\`,
        \`collectedBy\`,
        \`amount\`,
        \`amountInWords\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const vals = [
      String(loanId).trim(),
      String(customerName).trim(),
      String(vehicleNumber).trim(),
      String(contactNumber).trim(),
      sqlDate,
      paymentMode ? String(paymentMode).trim() : null,  // ✅ added
      paymentRef ? String(paymentRef).trim() : null,
      collectedBy ? String(collectedBy).trim() : null,
      amountNum,
      amountInWords ? String(amountInWords).trim() : null,
    ];

    const [result] = await pool.execute(sql, vals);
    console.log('Loan details saved successfully');
    return res.status(200).json({ message: 'Loan details saved successfully', insertId: result.insertId });
  } catch (err) {
    console.error('Error in /save-loan:', err);
    return res.status(500).json({
      message: 'Error saving loan details',
      code: err.code,
      sqlMessage: err.sqlMessage,
    });
  }
});


//fetch users loan id or name

app.get('/api/user-data', async (req, res) => {
  const { loanId, customerName } = req.query;
console.log(req.query)
  // Input validation
  if (!loanId && !customerName) {
    return res.status(400).json({ error: 'Please provide either loanId or customerName.' });
  }

  if (loanId && (typeof loanId !== 'string' || loanId.length > 50)) {
    return res.status(400).json({ error: 'Invalid loanId format.' });
  }
  if (customerName && (typeof customerName !== 'string' || customerName.length > 100)) {
    return res.status(400).json({ error: 'Invalid customerName format.' });
  }

  try {
    let query = `
      SELECT 
        \`Created At\`,
        \`Partner Loan Id\`,
        \`LAN\`,
        \`Applicant Name\`,
        \`Mobile Number\`,
        \`PAN Number\`,
        \`Approved Loan Amount\`,
        \`Disbursal Amount\`,
        \`EMI Amount\`,
        \`Loan Tenure\`,
        \`Intrest Rate\`,
        \`Loan Status\`,
        \`Loan Admin Status\`,
        \`First EMI Date\`,
        \`Last EMI Date\`,
        \`Applicant Address\`,
        \`Applicant City\`,
        \`Applicant State\`,
        \`Account No.\`,
        \`IFSC Code\`
      FROM embifi
    `;

    const values = [];
    const conditions = [];

    if (loanId) {
      conditions.push('`Partner Loan Id` = ?');
      values.push(loanId);
    }

    if (customerName) {
      conditions.push('`Applicant Name` LIKE ?');
      values.push(`%${customerName}%`);
    }

    // ✅ Append WHERE only if conditions exist
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const [rows] = await pool.execute(query, values);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No matching user found.' });
    }
    console.log(rows)
    return res.json({ data: rows });
  } catch (error) {
    console.error('DB error:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});



// ---------- Start ----------
(async () => {
  try {
    await ensureTable();
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (e) {
    console.error('Startup error:', e);
    process.exit(1);
  }
})();

