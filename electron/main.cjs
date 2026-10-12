
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const Database = require("better-sqlite3");

app.name = "research-management";

let db = null;
let mainWindow = null;

function validateText(value, field, maxLength = 500) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required.`);
  }

  if (value.trim().length > maxLength) {
    throw new Error(`${field} must not exceed ${maxLength} characters.`);
  }

  return value.trim();
}

function optionalText(value, maxLength = 500) {
  if (value == null || value === "") return "";

  if (typeof value !== "string" || value.length > maxLength) {
    throw new Error("An optional text field is invalid or too long.");
  }

  return value.trim();
}

function optionalDate(value, field) {
  if (value == null || value === "") return null;

  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    throw new Error(`${field} must be a valid YYYY-MM-DD date.`);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`${field} is not a valid calendar date.`);
  }

  return value;
}

function initializeDatabase() {
  const dataDirectory = app.getPath("userData");

  fs.mkdirSync(dataDirectory, { recursive: true });

  const databasePath = path.join(dataDirectory, "research-management.sqlite");

  db = new Database(databasePath);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");

  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      organization TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      work_type TEXT NOT NULL
        CHECK (work_type IN ('conference', 'journal', 'patent')),
      commitment_date TEXT,
      target_name TEXT NOT NULL DEFAULT '',
      target_url TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'In Progress',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id)
        ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_projects_client_id
      ON projects(client_id);

    CREATE INDEX IF NOT EXISTS idx_projects_commitment_date
      ON projects(commitment_date);

    CREATE TABLE IF NOT EXISTS payment_obligations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      description TEXT NOT NULL DEFAULT 'Client payment',
      amount_due_minor INTEGER NOT NULL DEFAULT 0
        CHECK (amount_due_minor >= 0),
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending', 'Paid', 'Cancelled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id)
        ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS payment_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      obligation_id INTEGER NOT NULL,
      amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
      payment_date TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (obligation_id) REFERENCES payment_obligations(id)
        ON DELETE RESTRICT
    );
  `);

  return databasePath;
}

function registerDatabaseHandlers() {
  ipcMain.handle("clients:list", () => {
    return db.prepare(`
      SELECT id, name, organization, email, phone, notes, created_at
      FROM clients
      ORDER BY id DESC
    `).all();
  });

  ipcMain.handle("clients:create", (_event, input) => {
    if (!input || typeof input !== "object") {
      throw new Error("Invalid client data.");
    }

    const client = {
      name: validateText(input.name, "Client name", 150),
      organization: optionalText(input.organization, 200),
      email: optionalText(input.email, 254),
      phone: optionalText(input.phone, 50),
      notes: optionalText(input.notes, 2000)
    };

    const result = db.prepare(`
      INSERT INTO clients (name, organization, email, phone, notes)
      VALUES (@name, @organization, @email, @phone, @notes)
    `).run(client);

    return db.prepare(`
      SELECT id, name, organization, email, phone, notes, created_at
      FROM clients WHERE id = ?
    `).get(result.lastInsertRowid);
  });

  ipcMain.handle("projects:list", () => {
    return db.prepare(`
      SELECT
        p.id,
        p.client_id,
        p.title,
        p.work_type,
        p.commitment_date,
        p.target_name,
        p.target_url,
        p.description,
        p.status,
        p.created_at,
        c.name AS client_name
      FROM projects p
      JOIN clients c ON c.id = p.client_id
      ORDER BY p.id DESC
    `).all();
  });

  ipcMain.handle("projects:create", (_event, input) => {
    if (!input || typeof input !== "object") {
      throw new Error("Invalid project data.");
    }

    const clientId = input.clientId;

    if (
      !Number.isSafeInteger(clientId) ||
      clientId <= 0
    ) {
      throw new Error("Select a valid client.");
    }

    const workType = input.workType;

    if (!["conference", "journal", "patent"].includes(workType)) {
      throw new Error("Select a valid project type.");
    }

    const project = {
      client_id: clientId,
      title: validateText(input.title, "Project title", 250),
      work_type: workType,
      commitment_date: optionalDate(
        input.commitmentDate,
        "Commitment date"
      ),
      target_name: optionalText(input.targetName, 250),
      target_url: optionalText(input.targetUrl, 1000),
      description: optionalText(input.description, 5000)
    };

    const createProject = db.transaction((data) => {
      const client = db.prepare(
        "SELECT id FROM clients WHERE id = ?"
      ).get(data.client_id);

      if (!client) {
        throw new Error("The selected client does not exist.");
      }

      const result = db.prepare(`
        INSERT INTO projects (
          client_id, title, work_type, commitment_date,
          target_name, target_url, description
        )
        VALUES (
          @client_id, @title, @work_type, @commitment_date,
          @target_name, @target_url, @description
        )
      `).run(data);

      return db.prepare(`
        SELECT
          p.id, p.client_id, p.title, p.work_type,
          p.commitment_date, p.target_name, p.target_url,
          p.description, p.status, p.created_at,
          c.name AS client_name
        FROM projects p
        JOIN clients c ON c.id = p.client_id
        WHERE p.id = ?
      `).get(result.lastInsertRowid);
    });

    return createProject(project);
  });

  // Create a payment obligation for a research project.
  ipcMain.handle("payments:create-obligation", (_event, input) => {
    if (!input || typeof input !== "object") {
      throw new Error("Invalid payment details.");
    }

    const projectId = input.projectId;

    if (!Number.isSafeInteger(projectId) || projectId <= 0) {
      throw new Error("Select a valid project.");
    }

    const amountText = String(input.amountDue ?? "")
      .trim()
      .replace(/,/g, "");

    const match = amountText.match(/^(\d{1,9})(?:\.(\d{1,2}))?$/);

    if (!match) {
      throw new Error("Enter a valid amount with up to two decimal places.");
    }

    const rupees = Number(match[1]);
    const paise = Number((match[2] || "").padEnd(2, "0"));
    const amountMinor = rupees * 100 + paise;

    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      throw new Error("The amount must be greater than zero.");
    }

    const dueDate = optionalDate(input.dueDate, "Due date");
    const description = input.description
      ? validateText(input.description, "Payment description", 200)
      : "Client payment";

    const project = db.prepare(
      "SELECT id FROM projects WHERE id = ?"
    ).get(projectId);

    if (!project) {
      throw new Error("The selected project does not exist.");
    }

    const result = db.prepare(`
      INSERT INTO payment_obligations
        (project_id, description, amount_due_minor, due_date)
      VALUES (?, ?, ?, ?)
    `).run(projectId, description, amountMinor, dueDate);

    return { id: Number(result.lastInsertRowid) };
  });

  // List obligations with actual receipts and calculated balances.
  ipcMain.handle("payments:list", () => {
    return db.prepare(`
      SELECT
        po.id,
        po.project_id,
        po.description,
        po.amount_due_minor,
        po.due_date,
        po.status,
        p.title AS project_title,
        c.name AS client_name,
        COALESCE(SUM(pt.amount_minor), 0) AS received_minor,
        po.amount_due_minor - COALESCE(SUM(pt.amount_minor), 0)
          AS balance_minor,
        CASE
          WHEN po.status = 'Cancelled' THEN 'Cancelled'
          WHEN po.amount_due_minor <= COALESCE(SUM(pt.amount_minor), 0)
            THEN 'Paid'
          WHEN po.due_date IS NULL THEN 'No due date'
          WHEN po.due_date < date('now', 'localtime') THEN 'Overdue'
          WHEN po.due_date = date('now', 'localtime') THEN 'Due today'
          ELSE 'Upcoming'
        END AS due_state
      FROM payment_obligations po
      JOIN projects p ON p.id = po.project_id
      JOIN clients c ON c.id = p.client_id
      LEFT JOIN payment_transactions pt
        ON pt.obligation_id = po.id
      GROUP BY po.id
      ORDER BY
        CASE
          WHEN po.status = 'Cancelled' THEN 4
          WHEN po.amount_due_minor <= COALESCE(SUM(pt.amount_minor), 0) THEN 3
          WHEN po.due_date < date('now', 'localtime') THEN 0
          WHEN po.due_date = date('now', 'localtime') THEN 1
          ELSE 2
        END,
        po.due_date ASC,
        po.id DESC
    `).all();
  });

  // Record a partial or full payment.
  ipcMain.handle("payments:record-receipt", (_event, input) => {
    if (!input || typeof input !== "object") {
      throw new Error("Invalid receipt details.");
    }

    const obligationId = input.obligationId;

    if (!Number.isSafeInteger(obligationId) || obligationId <= 0) {
      throw new Error("Select a valid payment.");
    }

    const amountText = String(input.amount ?? "")
      .trim()
      .replace(/,/g, "");

    const match = amountText.match(/^(\d{1,9})(?:\.(\d{1,2}))?$/);

    if (!match) {
      throw new Error("Enter a valid receipt amount.");
    }

    const amountMinor =
      Number(match[1]) * 100 +
      Number((match[2] || "").padEnd(2, "0"));

    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      throw new Error("The receipt must be greater than zero.");
    }

    const paymentDate = optionalDate(input.paymentDate, "Payment date");

    if (!paymentDate) {
      throw new Error("Payment date is required.");
    }

    const notes = optionalText(input.notes, 1000);

    const recordReceipt = db.transaction(() => {
      const obligation = db.prepare(`
        SELECT
          po.id,
          po.amount_due_minor,
          po.status,
          COALESCE(SUM(pt.amount_minor), 0) AS received_minor
        FROM payment_obligations po
        LEFT JOIN payment_transactions pt
          ON pt.obligation_id = po.id
        WHERE po.id = ?
        GROUP BY po.id
      `).get(obligationId);

      if (!obligation || obligation.status === "Cancelled") {
        throw new Error("The selected payment is unavailable.");
      }

      const balance =
        obligation.amount_due_minor - obligation.received_minor;

      if (amountMinor > balance) {
        throw new Error("Receipt cannot exceed the outstanding balance.");
      }

      db.prepare(`
        INSERT INTO payment_transactions
          (obligation_id, amount_minor, payment_date, notes)
        VALUES (?, ?, ?, ?)
      `).run(obligationId, amountMinor, paymentDate, notes);

      const newReceived = obligation.received_minor + amountMinor;
      const newStatus =
        newReceived >= obligation.amount_due_minor ? "Paid" : "Pending";

      db.prepare(`
        UPDATE payment_obligations
        SET status = ?
        WHERE id = ?
      `).run(newStatus, obligationId);

      return {
        balanceMinor: obligation.amount_due_minor - newReceived,
        status: newStatus
      };
    });

    return recordReceipt();
  });

  ipcMain.handle("payments:history", () => {
    return db.prepare(`
      SELECT
        pt.id,
        pt.obligation_id,
        pt.amount_minor,
        pt.payment_date,
        pt.notes,
        po.description AS payment_description,
        p.title AS project_title,
        c.name AS client_name
      FROM payment_transactions pt
      JOIN payment_obligations po ON po.id = pt.obligation_id
      JOIN projects p ON p.id = po.project_id
      JOIN clients c ON c.id = p.client_id
      ORDER BY pt.payment_date DESC, pt.id DESC
    `).all();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: "Research Management System",
    backgroundColor: "#F5F7FB",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, "..", "dist", "index.html")
    );
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    initializeDatabase();
    registerDatabaseHandlers();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  }).catch((error) => {
    console.error("Application startup failed:", error);
    app.quit();
  });
}

app.on("before-quit", () => {
  if (db) {
    db.close();
    db = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
