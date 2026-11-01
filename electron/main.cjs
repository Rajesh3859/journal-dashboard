
const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
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

function parseCurrencyToMinor(val) {
  if (typeof val === "number") {
    if (!Number.isFinite(val)) return 0;
    return Math.round(val * 100);
  }
  const clean = String(val ?? "").trim().replace(/,/g, "");
  if (!clean) return 0;
  const match = clean.match(/^(\d{1,12})(?:\.(\d{1,2}))?$/);
  if (!match) return 0;
  const major = Number(match[1]);
  const minor = Number((match[2] || "").padEnd(2, "0"));
  return major * 100 + minor;
}

function secureHashPassword(pwd, saltSeed = '') {
  const salt = saltSeed || crypto.randomBytes(8).toString('hex');
  const hash = crypto.createHash('sha256').update(`${salt}:${pwd}:rm_salt_2026`).digest('hex');
  return `sha256$${salt}$${hash}`;
}

function optionalAuthors(value) {
  if (value == null) return "[]";
  let list = [];
  if (Array.isArray(value)) {
    list = value.map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }
      if (item && typeof item === "object") {
        const authorObj = { ...item };
        // Security requirement: Plain text passwords must NEVER be saved to the database!
        if (authorObj.password) {
          if (!authorObj.password_hash) {
            authorObj.password_hash = secureHashPassword(authorObj.password, authorObj.name || '');
          }
          delete authorObj.password;
        }
        return authorObj;
      }
      return item != null ? String(item).trim() : null;
    }).filter(Boolean);
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "[]") return "[]";
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return optionalAuthors(parsed);
      }
      list = trimmed.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
    } catch {
      list = trimmed.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
    }
  }
  return JSON.stringify(list);
}

function parseAuthors(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "[]") return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [parsed];
    } catch {
      return trimmed
        .split(/[,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
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
      authors TEXT NOT NULL DEFAULT '[]',
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

    CREATE TABLE IF NOT EXISTS backup_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS backup_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backup_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL DEFAULT 0,
      record_count_summary TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    /* Research Paper Trading Dashboard Tables */
    CREATE TABLE IF NOT EXISTS trading_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      seller_name TEXT NOT NULL,
      seller_contact TEXT NOT NULL DEFAULT '',
      purchase_date TEXT NOT NULL,
      purchase_price_minor INTEGER NOT NULL DEFAULT 0 CHECK (purchase_price_minor >= 0),
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Active',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_trading_purchases_date
      ON trading_purchases(purchase_date);

    CREATE TABLE IF NOT EXISTS trading_seller_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL,
      amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
      payment_date TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
      reference TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (purchase_id) REFERENCES trading_purchases(id)
        ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_trading_seller_payments_purchase_id
      ON trading_seller_payments(purchase_id);

    CREATE TABLE IF NOT EXISTS trading_sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER,
      title TEXT NOT NULL,
      buyer_name TEXT NOT NULL,
      buyer_contact TEXT NOT NULL DEFAULT '',
      sale_date TEXT NOT NULL,
      sale_price_minor INTEGER NOT NULL DEFAULT 0 CHECK (sale_price_minor >= 0),
      cost_price_minor INTEGER NOT NULL DEFAULT 0 CHECK (cost_price_minor >= 0),
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (purchase_id) REFERENCES trading_purchases(id)
        ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_trading_sales_purchase_id
      ON trading_sales(purchase_id);
    CREATE INDEX IF NOT EXISTS idx_trading_sales_date
      ON trading_sales(sale_date);

    CREATE TABLE IF NOT EXISTS trading_buyer_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
      payment_date TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
      reference TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (sale_id) REFERENCES trading_sales(id)
        ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_trading_buyer_payments_sale_id
      ON trading_buyer_payments(sale_id);

    CREATE TABLE IF NOT EXISTS trading_backup_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backup_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL DEFAULT 0,
      record_count_summary TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migrate existing databases to ensure authors and lead_orcid columns exist
  try {
    const projectColumns = db.pragma("table_info(projects)");
    const hasAuthors = projectColumns.some((col) => col.name === "authors");
    if (!hasAuthors) {
      db.prepare("ALTER TABLE projects ADD COLUMN authors TEXT NOT NULL DEFAULT '[]'").run();
    }
    const hasLeadOrcid = projectColumns.some((col) => col.name === "lead_orcid");
    if (!hasLeadOrcid) {
      db.prepare("ALTER TABLE projects ADD COLUMN lead_orcid TEXT NOT NULL DEFAULT ''").run();
    }

    const clientColumns = db.pragma("table_info(clients)");
    const hasClientOrcid = clientColumns.some((col) => col.name === "orcid");
    if (!hasClientOrcid) {
      db.prepare("ALTER TABLE clients ADD COLUMN orcid TEXT NOT NULL DEFAULT ''").run();
    }
  } catch (migErr) {
    console.error("Migration warning on projects/clients schema:", migErr);
  }

  return databasePath;
}

function getSetting(key, defaultValue = "") {
  try {
    const row = db.prepare("SELECT value FROM backup_settings WHERE key = ?").get(key);
    return row ? row.value : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setSetting(key, value) {
  try {
    db.prepare(`
      INSERT INTO backup_settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, String(value));
  } catch (err) {
    console.error("Error setting backup setting:", key, err);
  }
}

function getDatabaseExportData() {
  const clients = db.prepare(`SELECT * FROM clients ORDER BY id ASC`).all();
  const projects = db.prepare(`SELECT * FROM projects ORDER BY id ASC`).all();
  const payment_obligations = db.prepare(`SELECT * FROM payment_obligations ORDER BY id ASC`).all();
  const payment_transactions = db.prepare(`SELECT * FROM payment_transactions ORDER BY id ASC`).all();

  return {
    app: "research-management",
    format_version: 1,
    export_date: new Date().toISOString(),
    summary: {
      clients: clients.length,
      projects: projects.length,
      obligations: payment_obligations.length,
      transactions: payment_transactions.length,
      total_records: clients.length + projects.length + payment_obligations.length + payment_transactions.length
    },
    tables: {
      clients,
      projects,
      payment_obligations,
      payment_transactions
    }
  };
}

async function performBackup({ targetFolder, isAuto = false, customFileName = null }) {
  if (!targetFolder || typeof targetFolder !== "string") {
    throw new Error("Backup destination folder is required.");
  }

  const backupDir = path.join(targetFolder, "ResearchManagement_Backups");
  fs.mkdirSync(backupDir, { recursive: true });

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const typeTag = isAuto ? "Auto_Weekly" : "Manual";
  const baseName = customFileName || `Research_Backup_${typeTag}_${timestamp}`;

  const jsonFileName = `${baseName}.rmbak`;
  const jsonFilePath = path.join(backupDir, jsonFileName);

  const sqliteFileName = `${baseName}.sqlite`;
  const sqliteFilePath = path.join(backupDir, sqliteFileName);

  const data = getDatabaseExportData();
  data.backup_type = isAuto ? "automatic" : "manual";
  data.created_at = now.toISOString();

  fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2), "utf8");
  const stats = fs.statSync(jsonFilePath);

  try {
    await db.backup(sqliteFilePath);
  } catch (backupErr) {
    console.warn("SQLite binary backup warning:", backupErr);
  }

  const manifestPath = path.join(backupDir, "manifest.json");
  let manifest = { backups: [] };
  try {
    if (fs.existsSync(manifestPath)) {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    }
  } catch {
    manifest = { backups: [] };
  }

  const backupEntry = {
    file_name: jsonFileName,
    file_path: jsonFilePath,
    sqlite_file: sqliteFileName,
    backup_type: isAuto ? "automatic" : "manual",
    created_at: now.toISOString(),
    file_size_bytes: stats.size,
    summary: data.summary
  };

  manifest.backups.unshift(backupEntry);
  if (manifest.backups.length > 50) manifest.backups.length = 50;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  try {
    db.prepare(`
      INSERT INTO backup_logs (backup_type, file_name, file_path, file_size_bytes, record_count_summary, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(
      isAuto ? "automatic" : "manual",
      jsonFileName,
      jsonFilePath,
      stats.size,
      JSON.stringify(data.summary)
    );
  } catch (logErr) {
    console.warn("Could not write to backup_logs table:", logErr);
  }

  setSetting("last_backup_at", now.toISOString());
  if (isAuto) {
    setSetting("last_auto_backup_at", now.toISOString());
  }

  return {
    success: true,
    fileName: jsonFileName,
    filePath: jsonFilePath,
    backupDir,
    size: stats.size,
    summary: data.summary,
    timestamp: now.toISOString(),
    type: isAuto ? "automatic" : "manual"
  };
}

async function checkAndRunWeeklyAutoBackup() {
  try {
    const backupDir = getSetting("backup_directory", "");
    const autoEnabled = getSetting("auto_backup_enabled", "true");

    if (!backupDir || autoEnabled !== "true") {
      return;
    }

    if (!fs.existsSync(backupDir)) {
      return;
    }

    const lastAuto = getSetting("last_auto_backup_at", "");
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

    let shouldRun = false;
    if (!lastAuto) {
      shouldRun = true;
    } else {
      const elapsed = Date.now() - new Date(lastAuto).getTime();
      if (elapsed >= ONE_WEEK_MS) {
        shouldRun = true;
      }
    }

    if (shouldRun) {
      console.log("Executing weekly automatic backup without prompt...");
      const result = await performBackup({
        targetFolder: backupDir,
        isAuto: true
      });
      console.log("Weekly automatic backup completed:", result.fileName);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("backup:auto-completed", result);
      }
    }
  } catch (err) {
    console.error("Weekly auto-backup check error:", err);
  }
}

function restoreDatabaseFromData(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid backup data format.");
  }

  const tables = data.tables || {};
  if (!Array.isArray(tables.clients) || !Array.isArray(tables.projects)) {
    throw new Error("Backup file is missing required collaborator or manuscript tables.");
  }

  const restoreTx = db.transaction(() => {
    db.prepare("DELETE FROM payment_transactions").run();
    db.prepare("DELETE FROM payment_obligations").run();
    db.prepare("DELETE FROM projects").run();
    db.prepare("DELETE FROM clients").run();

    const insertClient = db.prepare(`
      INSERT INTO clients (id, name, organization, email, phone, notes, created_at, orcid)
      VALUES (@id, @name, @organization, @email, @phone, @notes, @created_at, @orcid)
    `);
    for (const c of tables.clients) {
      insertClient.run({
        id: c.id,
        name: c.name || "Collaborator",
        organization: c.organization || "",
        email: c.email || "",
        phone: c.phone || "",
        notes: c.notes || "",
        created_at: c.created_at || new Date().toISOString(),
        orcid: c.orcid || ""
      });
    }

    const insertProject = db.prepare(`
      INSERT INTO projects (id, client_id, title, work_type, commitment_date, target_name, target_url, description, authors, status, created_at, lead_orcid)
      VALUES (@id, @client_id, @title, @work_type, @commitment_date, @target_name, @target_url, @description, @authors, @status, @created_at, @lead_orcid)
    `);
    for (const p of tables.projects) {
      insertProject.run({
        id: p.id,
        client_id: p.client_id,
        title: p.title || "Untitled Manuscript",
        work_type: p.work_type || "journal",
        commitment_date: p.commitment_date || null,
        target_name: p.target_name || "",
        target_url: p.target_url || "",
        description: p.description || "",
        authors: typeof p.authors === "string" ? p.authors : JSON.stringify(p.authors || []),
        status: p.status || "In Progress",
        created_at: p.created_at || new Date().toISOString(),
        lead_orcid: p.lead_orcid || ""
      });
    }

    if (Array.isArray(tables.payment_obligations)) {
      const insertObligation = db.prepare(`
        INSERT INTO payment_obligations (id, project_id, description, amount_due_minor, due_date, status, created_at)
        VALUES (@id, @project_id, @description, @amount_due_minor, @due_date, @status, @created_at)
      `);
      for (const o of tables.payment_obligations) {
        insertObligation.run({
          id: o.id,
          project_id: o.project_id,
          description: o.description || "Client payment",
          amount_due_minor: o.amount_due_minor || 0,
          due_date: o.due_date || null,
          status: o.status || "Pending",
          created_at: o.created_at || new Date().toISOString()
        });
      }
    }

    if (Array.isArray(tables.payment_transactions)) {
      const insertTransaction = db.prepare(`
        INSERT INTO payment_transactions (id, obligation_id, amount_minor, payment_date, notes, created_at)
        VALUES (@id, @obligation_id, @amount_minor, @payment_date, @notes, @created_at)
      `);
      for (const t of tables.payment_transactions) {
        insertTransaction.run({
          id: t.id,
          obligation_id: t.obligation_id,
          amount_minor: t.amount_minor || 0,
          payment_date: t.payment_date || new Date().toISOString().slice(0, 10),
          notes: t.notes || "",
          created_at: t.created_at || new Date().toISOString()
        });
      }
    }
  });

  restoreTx();

  db.pragma("foreign_key_check");
  db.pragma("integrity_check");

  return {
    success: true,
    counts: {
      clients: (tables.clients || []).length,
      projects: (tables.projects || []).length,
      obligations: (tables.payment_obligations || []).length,
      transactions: (tables.payment_transactions || []).length
    }
  };
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
    const rows = db.prepare(`
      SELECT
        p.id,
        p.client_id,
        p.title,
        p.work_type,
        p.commitment_date,
        p.target_name,
        p.target_url,
        p.description,
        p.authors,
        p.lead_orcid,
        p.status,
        p.created_at,
        c.name AS client_name,
        c.email AS client_email,
        c.organization AS client_organization
      FROM projects p
      JOIN clients c ON c.id = p.client_id
      ORDER BY p.id DESC
    `).all();

    return rows.map((p) => ({
      ...p,
      authors: parseAuthors(p.authors)
    }));
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
      description: optionalText(input.description, 5000),
      authors: optionalAuthors(input.authors),
      lead_orcid: optionalText(input.leadOrcid || input.lead_orcid || input.collaboratorOrcid, 50)
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
          target_name, target_url, description, authors, lead_orcid
        )
        VALUES (
          @client_id, @title, @work_type, @commitment_date,
          @target_name, @target_url, @description, @authors, @lead_orcid
        )
      `).run(data);

      const created = db.prepare(`
        SELECT
          p.id, p.client_id, p.title, p.work_type,
          p.commitment_date, p.target_name, p.target_url,
          p.description, p.authors, p.lead_orcid, p.status, p.created_at,
          c.name AS client_name,
          c.email AS client_email,
          c.organization AS client_organization
        FROM projects p
        JOIN clients c ON c.id = p.client_id
        WHERE p.id = ?
      `).get(result.lastInsertRowid);

      return {
        ...created,
        authors: parseAuthors(created.authors)
      };
    });

    return createProject(project);
  });

  ipcMain.handle("projects:update-authors", (_event, input) => {
    if (!input || typeof input !== "object") {
      throw new Error("Invalid request.");
    }
    const { id, authors } = input;
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error("Invalid project ID.");
    }
    const serialized = optionalAuthors(authors);
    db.prepare("UPDATE projects SET authors = ? WHERE id = ?").run(serialized, id);
    return { id, authors: parseAuthors(serialized) };
  });

  ipcMain.handle("projects:update", (_event, input) => {
    if (!input || typeof input !== "object") {
      throw new Error("Invalid project data.");
    }
    const id = Number(input.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error("Invalid project ID.");
    }

    const clientId = Number(input.clientId || input.client_id);
    if (!Number.isSafeInteger(clientId) || clientId <= 0) {
      throw new Error("Select a valid collaborator / client.");
    }

    const workType = input.workType || input.work_type;
    if (!["conference", "journal", "patent"].includes(workType)) {
      throw new Error("Select a valid category (conference, journal, patent).");
    }

    const title = validateText(input.title, "Project title", 250);
    const commitmentDate = optionalDate(
      input.commitmentDate || input.commitment_date,
      "Commitment date"
    );
    const targetName = optionalText(input.targetName || input.target_name, 250);
    const targetUrl = optionalText(input.targetUrl || input.target_url, 1000);
    const description = optionalText(input.description, 5000);
    const status = optionalText(input.status, 50) || "In Progress";
    const leadOrcid = optionalText(input.leadOrcid || input.lead_orcid, 50);

    const updateProject = db.transaction(() => {
      const client = db.prepare("SELECT id FROM clients WHERE id = ?").get(clientId);
      if (!client) {
        throw new Error("The selected client does not exist.");
      }

      if (input.authors !== undefined) {
        const authors = optionalAuthors(input.authors);
        db.prepare(`
          UPDATE projects SET
            client_id = ?,
            title = ?,
            work_type = ?,
            commitment_date = ?,
            target_name = ?,
            target_url = ?,
            description = ?,
            authors = ?,
            status = ?,
            lead_orcid = ?
          WHERE id = ?
        `).run(
          clientId,
          title,
          workType,
          commitmentDate,
          targetName,
          targetUrl,
          description,
          authors,
          status,
          leadOrcid,
          id
        );
      } else {
        db.prepare(`
          UPDATE projects SET
            client_id = ?,
            title = ?,
            work_type = ?,
            commitment_date = ?,
            target_name = ?,
            target_url = ?,
            description = ?,
            status = ?,
            lead_orcid = ?
          WHERE id = ?
        `).run(
          clientId,
          title,
          workType,
          commitmentDate,
          targetName,
          targetUrl,
          description,
          status,
          leadOrcid,
          id
        );
      }

      const updated = db.prepare(`
        SELECT
          p.id, p.client_id, p.title, p.work_type,
          p.commitment_date, p.target_name, p.target_url,
          p.description, p.authors, p.lead_orcid, p.status, p.created_at,
          c.name AS client_name,
          c.email AS client_email,
          c.organization AS client_organization
        FROM projects p
        JOIN clients c ON c.id = p.client_id
        WHERE p.id = ?
      `).get(id);

      return {
        ...updated,
        authors: parseAuthors(updated.authors)
      };
    });

    return updateProject();
  });

  ipcMain.handle("projects:update-status", (_event, input) => {
    if (!input || typeof input !== "object") {
      throw new Error("Invalid request.");
    }
    const id = Number(input.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error("Invalid project ID.");
    }
    const status = validateText(input.status, "Status", 50);
    db.prepare("UPDATE projects SET status = ? WHERE id = ?").run(status, id);
    return { id, status };
  });

  ipcMain.handle("projects:update-category", (_event, input) => {
    if (!input || typeof input !== "object") {
      throw new Error("Invalid request.");
    }
    const id = Number(input.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error("Invalid project ID.");
    }
    const workType = input.workType || input.work_type;
    if (!["conference", "journal", "patent"].includes(workType)) {
      throw new Error("Invalid category.");
    }
    db.prepare("UPDATE projects SET work_type = ? WHERE id = ?").run(workType, id);
    return { id, work_type: workType };
  });

  ipcMain.handle("projects:delete", (_event, id) => {
    const projectId = Number(id);
    if (!Number.isSafeInteger(projectId) || projectId <= 0) {
      throw new Error("Invalid project ID.");
    }

    const deleteTx = db.transaction(() => {
      const obligations = db
        .prepare("SELECT id FROM payment_obligations WHERE project_id = ?")
        .all(projectId);

      for (const ob of obligations) {
        db.prepare("DELETE FROM payment_transactions WHERE obligation_id = ?").run(ob.id);
      }
      db.prepare("DELETE FROM payment_obligations WHERE project_id = ?").run(projectId);

      const res = db.prepare("DELETE FROM projects WHERE id = ?").run(projectId);
      if (res.changes === 0) {
        throw new Error("Manuscript not found in database.");
      }
      return { success: true, id: projectId };
    });

    return deleteTx();
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

  // Backup & Restore IPC Handlers
  ipcMain.handle("backup:choose-directory", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Select Custom Backup Folder",
      properties: ["openDirectory", "createDirectory"]
    });
    if (result.canceled || !result.filePaths.length) {
      return null;
    }
    const chosenDir = result.filePaths[0];
    setSetting("backup_directory", chosenDir);
    setSetting("auto_backup_enabled", "true");
    return chosenDir;
  });

  ipcMain.handle("backup:get-settings", () => {
    const backupDirectory = getSetting("backup_directory", "");
    const autoBackupEnabled = getSetting("auto_backup_enabled", "true") === "true";
    const lastAutoBackup = getSetting("last_auto_backup_at", null);
    const lastBackup = getSetting("last_backup_at", null);

    const history = db.prepare(`
      SELECT id, backup_type, file_name, file_path, file_size_bytes, record_count_summary, created_at
      FROM backup_logs
      ORDER BY id DESC LIMIT 30
    `).all().map((row) => {
      let record_count_summary = {};
      try {
        record_count_summary = JSON.parse(row.record_count_summary || "{}");
      } catch {}
      return {
        ...row,
        record_count_summary
      };
    });

    return {
      backupDirectory,
      autoBackupEnabled,
      lastAutoBackup,
      lastBackup,
      history
    };
  });

  ipcMain.handle("backup:save-settings", (_event, { backupDirectory, autoBackupEnabled }) => {
    if (backupDirectory != null) setSetting("backup_directory", backupDirectory);
    if (autoBackupEnabled != null) setSetting("auto_backup_enabled", autoBackupEnabled ? "true" : "false");
    return true;
  });

  ipcMain.handle("backup:create-now", async (_event, options = {}) => {
    let targetDir = options.targetFolder || getSetting("backup_directory", "");
    if (!targetDir) {
      const chooseResult = await dialog.showOpenDialog(mainWindow, {
        title: "Select Destination Folder for Backup",
        properties: ["openDirectory", "createDirectory"]
      });
      if (chooseResult.canceled || !chooseResult.filePaths.length) {
        throw new Error("Backup cancelled: No destination folder selected.");
      }
      targetDir = chooseResult.filePaths[0];
      setSetting("backup_directory", targetDir);
      setSetting("auto_backup_enabled", "true");
    }

    return await performBackup({
      targetFolder: targetDir,
      isAuto: false
    });
  });

  ipcMain.handle("backup:export-standalone", async () => {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const defaultName = `Research_Backup_Manual_${timestamp}.rmbak`;

    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Export Standalone Backup File",
      defaultPath: defaultName,
      filters: [
        { name: "Research Backup Archive", extensions: ["rmbak", "json"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    const data = getDatabaseExportData();
    data.backup_type = "manual";
    data.created_at = now.toISOString();

    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), "utf8");
    const stats = fs.statSync(result.filePath);

    db.prepare(`
      INSERT INTO backup_logs (backup_type, file_name, file_path, file_size_bytes, record_count_summary, created_at)
      VALUES ('manual', ?, ?, ?, ?, datetime('now'))
    `).run(
      path.basename(result.filePath),
      result.filePath,
      stats.size,
      JSON.stringify(data.summary)
    );

    setSetting("last_backup_at", now.toISOString());

    return {
      success: true,
      filePath: result.filePath,
      fileName: path.basename(result.filePath),
      size: stats.size,
      summary: data.summary
    };
  });

  ipcMain.handle("backup:list-files", async () => {
    const backupDirSetting = getSetting("backup_directory", "");
    if (!backupDirSetting) return [];
    const targetDir = path.join(backupDirSetting, "ResearchManagement_Backups");
    if (!fs.existsSync(targetDir)) return [];

    const files = fs.readdirSync(targetDir);
    const backupFiles = [];
    for (const f of files) {
      if (f.endsWith(".rmbak") || f.endsWith(".sqlite")) {
        const fullPath = path.join(targetDir, f);
        try {
          const stat = fs.statSync(fullPath);
          let summary = null;
          if (f.endsWith(".rmbak")) {
            try {
              const parsed = JSON.parse(fs.readFileSync(fullPath, "utf8"));
              summary = parsed.summary || null;
            } catch {}
          }
          backupFiles.push({
            fileName: f,
            filePath: fullPath,
            sizeBytes: stat.size,
            modifiedAt: stat.mtime.toISOString(),
            isAuto: f.includes("Auto"),
            summary
          });
        } catch {}
      }
    }
    backupFiles.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
    return backupFiles;
  });

  ipcMain.handle("backup:select-restore-file", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Select Backup File to Restore",
      filters: [
        { name: "Backup Files (*.rmbak, *.json, *.sqlite)", extensions: ["rmbak", "json", "sqlite", "db"] },
        { name: "All Files", extensions: ["*"] }
      ],
      properties: ["openFile"]
    });

    if (result.canceled || !result.filePaths.length) {
      return null;
    }

    const filePath = result.filePaths[0];
    let previewSummary = null;
    if (filePath.endsWith(".rmbak") || filePath.endsWith(".json")) {
      const content = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(content);
      previewSummary = parsed.summary || {
        clients: (parsed.tables?.clients || []).length,
        projects: (parsed.tables?.projects || []).length,
        obligations: (parsed.tables?.payment_obligations || []).length,
        transactions: (parsed.tables?.payment_transactions || []).length
      };
    } else if (filePath.endsWith(".sqlite") || filePath.endsWith(".db")) {
      const tempDb = new Database(filePath, { readonly: true });
      const clients = tempDb.prepare("SELECT count(*) as c FROM clients").get().c;
      const projects = tempDb.prepare("SELECT count(*) as c FROM projects").get().c;
      const obligations = tempDb.prepare("SELECT count(*) as c FROM payment_obligations").get().c;
      const transactions = tempDb.prepare("SELECT count(*) as c FROM payment_transactions").get().c;
      tempDb.close();
      previewSummary = { clients, projects, obligations, transactions };
    }

    return {
      filePath,
      fileName: path.basename(filePath),
      previewSummary
    };
  });

  ipcMain.handle("backup:restore", async (_event, { filePath, rawJsonData }) => {
    let data = null;
    if (rawJsonData) {
      data = typeof rawJsonData === "string" ? JSON.parse(rawJsonData) : rawJsonData;
    } else if (filePath) {
      if (filePath.endsWith(".sqlite") || filePath.endsWith(".db")) {
        const tempDb = new Database(filePath, { readonly: true });
        const clients = tempDb.prepare("SELECT * FROM clients").all();
        const projects = tempDb.prepare("SELECT * FROM projects").all();
        const payment_obligations = tempDb.prepare("SELECT * FROM payment_obligations").all();
        const payment_transactions = tempDb.prepare("SELECT * FROM payment_transactions").all();
        tempDb.close();
        data = {
          tables: { clients, projects, payment_obligations, payment_transactions }
        };
      } else {
        const content = fs.readFileSync(filePath, "utf8");
        data = JSON.parse(content);
      }
    } else {
      throw new Error("No backup file or data provided for restore.");
    }

    return restoreDatabaseFromData(data);
  });

  ipcMain.handle("backup:open-folder", async (_event, folderPath) => {
    const target = folderPath || getSetting("backup_directory", "");
    if (target && fs.existsSync(target)) {
      await shell.openPath(target);
      return true;
    }
    return false;
  });

  /* -------------------------------------------------------------
   * RESEARCH PAPER TRADING DASHBOARD IPC HANDLERS
   * ----------------------------------------------------------- */

  // Purchases
  ipcMain.handle("trading:purchases:list", () => {
    const rows = db.prepare(`
      SELECT
        tp.id,
        tp.title,
        tp.seller_name,
        tp.seller_contact,
        tp.purchase_date,
        tp.purchase_price_minor,
        tp.notes,
        tp.status,
        tp.created_at,
        COALESCE(SUM(tsp.amount_minor), 0) AS amount_paid_minor,
        tp.purchase_price_minor - COALESCE(SUM(tsp.amount_minor), 0) AS balance_minor,
        COUNT(tsp.id) AS payments_count,
        MAX(tsp.payment_date) AS last_payment_date,
        CASE
          WHEN COALESCE(SUM(tsp.amount_minor), 0) = 0 THEN 'Pending'
          WHEN COALESCE(SUM(tsp.amount_minor), 0) >= tp.purchase_price_minor THEN 'Fully Paid'
          ELSE 'Partially Paid'
        END AS payment_status
      FROM trading_purchases tp
      LEFT JOIN trading_seller_payments tsp ON tsp.purchase_id = tp.id
      GROUP BY tp.id
      ORDER BY tp.purchase_date DESC, tp.id DESC
    `).all();
    return rows;
  });

  ipcMain.handle("trading:purchases:create", (_event, input) => {
    if (!input || typeof input !== "object") throw new Error("Invalid purchase data.");
    const title = validateText(input.title, "Paper title", 300);
    const sellerName = validateText(input.sellerName || input.seller_name, "Seller name", 200);
    const sellerContact = optionalText(input.sellerContact || input.seller_contact, 200);
    const purchaseDate = validateText(input.purchaseDate || input.purchase_date, "Purchase date", 20);
    const purchasePriceMinor = parseCurrencyToMinor(input.purchasePrice ?? input.purchase_price_minor);
    if (purchasePriceMinor < 0) throw new Error("Purchase price cannot be negative.");
    const notes = optionalText(input.notes, 2000);
    const initialAmountPaidMinor = parseCurrencyToMinor(input.initialAmountPaid ?? 0);
    const paymentMethod = optionalText(input.paymentMethod || input.payment_method, 100) || "Bank Transfer";
    const reference = optionalText(input.reference, 200);

    const tx = db.transaction(() => {
      const res = db.prepare(`
        INSERT INTO trading_purchases (title, seller_name, seller_contact, purchase_date, purchase_price_minor, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(title, sellerName, sellerContact, purchaseDate, purchasePriceMinor, notes);

      const purchaseId = Number(res.lastInsertRowid);

      if (initialAmountPaidMinor > 0) {
        db.prepare(`
          INSERT INTO trading_seller_payments (purchase_id, amount_minor, payment_date, payment_method, reference, notes)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(purchaseId, initialAmountPaidMinor, purchaseDate, paymentMethod, reference, "Initial payment at purchase");
      }

      return purchaseId;
    });

    const id = tx();
    return db.prepare("SELECT * FROM trading_purchases WHERE id = ?").get(id);
  });

  ipcMain.handle("trading:purchases:update", (_event, input) => {
    if (!input || typeof input !== "object") throw new Error("Invalid purchase data.");
    const id = Number(input.id);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Invalid purchase ID.");
    const title = validateText(input.title, "Paper title", 300);
    const sellerName = validateText(input.sellerName || input.seller_name, "Seller name", 200);
    const sellerContact = optionalText(input.sellerContact || input.seller_contact, 200);
    const purchaseDate = validateText(input.purchaseDate || input.purchase_date, "Purchase date", 20);
    const purchasePriceMinor = parseCurrencyToMinor(input.purchasePrice ?? input.purchase_price_minor);
    const notes = optionalText(input.notes, 2000);
    const status = optionalText(input.status, 50) || "Active";

    db.prepare(`
      UPDATE trading_purchases
      SET title = ?, seller_name = ?, seller_contact = ?, purchase_date = ?, purchase_price_minor = ?, notes = ?, status = ?
      WHERE id = ?
    `).run(title, sellerName, sellerContact, purchaseDate, purchasePriceMinor, notes, status, id);

    return { id, success: true };
  });

  ipcMain.handle("trading:purchases:delete", (_event, id) => {
    const purchaseId = Number(id);
    if (!Number.isSafeInteger(purchaseId) || purchaseId <= 0) throw new Error("Invalid purchase ID.");
    const tx = db.transaction(() => {
      db.prepare("DELETE FROM trading_seller_payments WHERE purchase_id = ?").run(purchaseId);
      db.prepare("UPDATE trading_sales SET purchase_id = NULL WHERE purchase_id = ?").run(purchaseId);
      const res = db.prepare("DELETE FROM trading_purchases WHERE id = ?").run(purchaseId);
      if (res.changes === 0) throw new Error("Purchase record not found.");
      return { success: true, id: purchaseId };
    });
    return tx();
  });

  // Seller Payments
  ipcMain.handle("trading:seller-payments:list", (_event, purchaseId) => {
    if (purchaseId) {
      return db.prepare(`
        SELECT tsp.*, tp.title AS paper_title, tp.seller_name
        FROM trading_seller_payments tsp
        JOIN trading_purchases tp ON tp.id = tsp.purchase_id
        WHERE tsp.purchase_id = ?
        ORDER BY tsp.payment_date DESC, tsp.id DESC
      `).all(Number(purchaseId));
    }
    return db.prepare(`
      SELECT tsp.*, tp.title AS paper_title, tp.seller_name
      FROM trading_seller_payments tsp
      JOIN trading_purchases tp ON tp.id = tsp.purchase_id
      ORDER BY tsp.payment_date DESC, tsp.id DESC
    `).all();
  });

  ipcMain.handle("trading:seller-payments:create", (_event, input) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payment data.");
    const purchaseId = Number(input.purchaseId || input.purchase_id);
    if (!Number.isSafeInteger(purchaseId) || purchaseId <= 0) throw new Error("Select a valid paper purchase.");
    const amountMinor = parseCurrencyToMinor(input.amount ?? input.amount_minor);
    if (amountMinor <= 0) throw new Error("Payment amount must be greater than zero.");
    const paymentDate = validateText(input.paymentDate || input.payment_date, "Payment date", 20);
    const paymentMethod = optionalText(input.paymentMethod || input.payment_method, 100) || "Bank Transfer";
    const reference = optionalText(input.reference, 200);
    const notes = optionalText(input.notes, 1000);

    const res = db.prepare(`
      INSERT INTO trading_seller_payments (purchase_id, amount_minor, payment_date, payment_method, reference, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(purchaseId, amountMinor, paymentDate, paymentMethod, reference, notes);

    return { id: Number(res.lastInsertRowid), success: true };
  });

  ipcMain.handle("trading:seller-payments:update", (_event, input) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payment data.");
    const id = Number(input.id);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Invalid payment ID.");
    const amountMinor = parseCurrencyToMinor(input.amount ?? input.amount_minor);
    if (amountMinor <= 0) throw new Error("Payment amount must be greater than zero.");
    const paymentDate = validateText(input.paymentDate || input.payment_date, "Payment date", 20);
    const paymentMethod = optionalText(input.paymentMethod || input.payment_method, 100) || "Bank Transfer";
    const reference = optionalText(input.reference, 200);
    const notes = optionalText(input.notes, 1000);

    db.prepare(`
      UPDATE trading_seller_payments
      SET amount_minor = ?, payment_date = ?, payment_method = ?, reference = ?, notes = ?
      WHERE id = ?
    `).run(amountMinor, paymentDate, paymentMethod, reference, notes, id);

    return { id, success: true };
  });

  ipcMain.handle("trading:seller-payments:delete", (_event, paymentId) => {
    const id = Number(paymentId);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Invalid payment ID.");
    const res = db.prepare("DELETE FROM trading_seller_payments WHERE id = ?").run(id);
    if (res.changes === 0) throw new Error("Payment record not found.");
    return { success: true, id };
  });

  // Sales
  ipcMain.handle("trading:sales:list", () => {
    return db.prepare(`
      SELECT
        ts.id,
        ts.purchase_id,
        ts.title,
        ts.buyer_name,
        ts.buyer_contact,
        ts.sale_date,
        ts.sale_price_minor,
        ts.cost_price_minor,
        ts.sale_price_minor - ts.cost_price_minor AS profit_minor,
        ts.notes,
        ts.created_at,
        tp.title AS original_paper_title,
        tp.seller_name AS seller_name,
        COALESCE(SUM(tbp.amount_minor), 0) AS amount_received_minor,
        ts.sale_price_minor - COALESCE(SUM(tbp.amount_minor), 0) AS balance_minor,
        COUNT(tbp.id) AS payments_count,
        MAX(tbp.payment_date) AS last_payment_date,
        CASE
          WHEN COALESCE(SUM(tbp.amount_minor), 0) = 0 THEN 'Pending'
          WHEN COALESCE(SUM(tbp.amount_minor), 0) >= ts.sale_price_minor THEN 'Fully Paid'
          ELSE 'Partially Paid'
        END AS payment_status
      FROM trading_sales ts
      LEFT JOIN trading_purchases tp ON tp.id = ts.purchase_id
      LEFT JOIN trading_buyer_payments tbp ON tbp.sale_id = ts.id
      GROUP BY ts.id
      ORDER BY ts.sale_date DESC, ts.id DESC
    `).all();
  });

  ipcMain.handle("trading:sales:create", (_event, input) => {
    if (!input || typeof input !== "object") throw new Error("Invalid sale data.");
    const title = validateText(input.title, "Paper title", 300);
    const buyerName = validateText(input.buyerName || input.buyer_name, "Buyer name", 200);
    const buyerContact = optionalText(input.buyerContact || input.buyer_contact, 200);
    const saleDate = validateText(input.saleDate || input.sale_date, "Sale date", 20);
    const salePriceMinor = parseCurrencyToMinor(input.salePrice ?? input.sale_price_minor);
    if (salePriceMinor < 0) throw new Error("Selling price cannot be negative.");

    let purchaseId = input.purchaseId || input.purchase_id ? Number(input.purchaseId || input.purchase_id) : null;
    let costPriceMinor = parseCurrencyToMinor(input.costPrice ?? input.cost_price_minor);

    if (purchaseId) {
      const purchase = db.prepare("SELECT * FROM trading_purchases WHERE id = ?").get(purchaseId);
      if (purchase && input.costPrice == null && input.cost_price_minor == null) {
        costPriceMinor = purchase.purchase_price_minor;
      }
    }

    const notes = optionalText(input.notes, 2000);
    const initialAmountReceivedMinor = parseCurrencyToMinor(input.initialAmountReceived ?? 0);
    const paymentMethod = optionalText(input.paymentMethod || input.payment_method, 100) || "Bank Transfer";
    const reference = optionalText(input.reference, 200);

    const tx = db.transaction(() => {
      const res = db.prepare(`
        INSERT INTO trading_sales (purchase_id, title, buyer_name, buyer_contact, sale_date, sale_price_minor, cost_price_minor, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(purchaseId, title, buyerName, buyerContact, saleDate, salePriceMinor, costPriceMinor, notes);

      const saleId = Number(res.lastInsertRowid);

      if (initialAmountReceivedMinor > 0) {
        db.prepare(`
          INSERT INTO trading_buyer_payments (sale_id, amount_minor, payment_date, payment_method, reference, notes)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(saleId, initialAmountReceivedMinor, saleDate, paymentMethod, reference, "Initial installment on sale");
      }

      return saleId;
    });

    const id = tx();
    return db.prepare("SELECT * FROM trading_sales WHERE id = ?").get(id);
  });

  ipcMain.handle("trading:sales:update", (_event, input) => {
    if (!input || typeof input !== "object") throw new Error("Invalid sale data.");
    const id = Number(input.id);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Invalid sale ID.");
    const title = validateText(input.title, "Paper title", 300);
    const buyerName = validateText(input.buyerName || input.buyer_name, "Buyer name", 200);
    const buyerContact = optionalText(input.buyerContact || input.buyer_contact, 200);
    const saleDate = validateText(input.saleDate || input.sale_date, "Sale date", 20);
    const salePriceMinor = parseCurrencyToMinor(input.salePrice ?? input.sale_price_minor);
    const costPriceMinor = parseCurrencyToMinor(input.costPrice ?? input.cost_price_minor);
    const purchaseId = input.purchaseId || input.purchase_id ? Number(input.purchaseId || input.purchase_id) : null;
    const notes = optionalText(input.notes, 2000);

    db.prepare(`
      UPDATE trading_sales
      SET purchase_id = ?, title = ?, buyer_name = ?, buyer_contact = ?, sale_date = ?, sale_price_minor = ?, cost_price_minor = ?, notes = ?
      WHERE id = ?
    `).run(purchaseId, title, buyerName, buyerContact, saleDate, salePriceMinor, costPriceMinor, notes, id);

    return { id, success: true };
  });

  ipcMain.handle("trading:sales:delete", (_event, id) => {
    const saleId = Number(id);
    if (!Number.isSafeInteger(saleId) || saleId <= 0) throw new Error("Invalid sale ID.");
    const tx = db.transaction(() => {
      db.prepare("DELETE FROM trading_buyer_payments WHERE sale_id = ?").run(saleId);
      const res = db.prepare("DELETE FROM trading_sales WHERE id = ?").run(saleId);
      if (res.changes === 0) throw new Error("Sale record not found.");
      return { success: true, id: saleId };
    });
    return tx();
  });

  // Buyer Payments
  ipcMain.handle("trading:buyer-payments:list", (_event, saleId) => {
    if (saleId) {
      return db.prepare(`
        SELECT tbp.*, ts.title AS paper_title, ts.buyer_name
        FROM trading_buyer_payments tbp
        JOIN trading_sales ts ON ts.id = tbp.sale_id
        WHERE tbp.sale_id = ?
        ORDER BY tbp.payment_date DESC, tbp.id DESC
      `).all(Number(saleId));
    }
    return db.prepare(`
      SELECT tbp.*, ts.title AS paper_title, ts.buyer_name
      FROM trading_buyer_payments tbp
      JOIN trading_sales ts ON ts.id = tbp.sale_id
      ORDER BY tbp.payment_date DESC, tbp.id DESC
    `).all();
  });

  ipcMain.handle("trading:buyer-payments:create", (_event, input) => {
    if (!input || typeof input !== "object") throw new Error("Invalid receipt data.");
    const saleId = Number(input.saleId || input.sale_id);
    if (!Number.isSafeInteger(saleId) || saleId <= 0) throw new Error("Select a valid paper sale.");
    const amountMinor = parseCurrencyToMinor(input.amount ?? input.amount_minor);
    if (amountMinor <= 0) throw new Error("Receipt amount must be greater than zero.");
    const paymentDate = validateText(input.paymentDate || input.payment_date, "Payment date", 20);
    const paymentMethod = optionalText(input.paymentMethod || input.payment_method, 100) || "Bank Transfer";
    const reference = optionalText(input.reference, 200);
    const notes = optionalText(input.notes, 1000);

    const res = db.prepare(`
      INSERT INTO trading_buyer_payments (sale_id, amount_minor, payment_date, payment_method, reference, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(saleId, amountMinor, paymentDate, paymentMethod, reference, notes);

    return { id: Number(res.lastInsertRowid), success: true };
  });

  ipcMain.handle("trading:buyer-payments:update", (_event, input) => {
    if (!input || typeof input !== "object") throw new Error("Invalid receipt data.");
    const id = Number(input.id);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Invalid receipt ID.");
    const amountMinor = parseCurrencyToMinor(input.amount ?? input.amount_minor);
    if (amountMinor <= 0) throw new Error("Receipt amount must be greater than zero.");
    const paymentDate = validateText(input.paymentDate || input.payment_date, "Payment date", 20);
    const paymentMethod = optionalText(input.paymentMethod || input.payment_method, 100) || "Bank Transfer";
    const reference = optionalText(input.reference, 200);
    const notes = optionalText(input.notes, 1000);

    db.prepare(`
      UPDATE trading_buyer_payments
      SET amount_minor = ?, payment_date = ?, payment_method = ?, reference = ?, notes = ?
      WHERE id = ?
    `).run(amountMinor, paymentDate, paymentMethod, reference, notes, id);

    return { id, success: true };
  });

  ipcMain.handle("trading:buyer-payments:delete", (_event, paymentId) => {
    const id = Number(paymentId);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Invalid receipt ID.");
    const res = db.prepare("DELETE FROM trading_buyer_payments WHERE id = ?").run(id);
    if (res.changes === 0) throw new Error("Receipt record not found.");
    return { success: true, id };
  });

  // Balances: Seller Payables & Buyer Receivables
  ipcMain.handle("trading:balances:get", () => {
    const sellerRows = db.prepare(`
      SELECT
        tp.seller_name,
        COUNT(DISTINCT tp.id) AS papers_count,
        GROUP_CONCAT(tp.title, ' || ') AS papers_list,
        SUM(tp.purchase_price_minor) AS total_purchase_amount_minor,
        COALESCE((
          SELECT SUM(tsp.amount_minor)
          FROM trading_seller_payments tsp
          JOIN trading_purchases tp2 ON tp2.id = tsp.purchase_id
          WHERE tp2.seller_name = tp.seller_name
        ), 0) AS total_amount_paid_minor,
        (
          SELECT MAX(tsp.payment_date)
          FROM trading_seller_payments tsp
          JOIN trading_purchases tp2 ON tp2.id = tsp.purchase_id
          WHERE tp2.seller_name = tp.seller_name
        ) AS last_payment_date
      FROM trading_purchases tp
      GROUP BY tp.seller_name
      ORDER BY tp.seller_name ASC
    `).all();

    const sellerPayables = sellerRows.map((s) => {
      const remaining = s.total_purchase_amount_minor - s.total_amount_paid_minor;
      let status = "Pending";
      if (remaining <= 0) {
        status = "Fully Paid";
      } else if (s.total_amount_paid_minor > 0) {
        status = "Partially Paid";
      }
      return {
        ...s,
        remaining_amount_minor: remaining,
        payment_status: status
      };
    });

    const buyerRows = db.prepare(`
      SELECT
        ts.buyer_name,
        COUNT(DISTINCT ts.id) AS papers_count,
        GROUP_CONCAT(ts.title, ' || ') AS papers_list,
        SUM(ts.sale_price_minor) AS total_sales_amount_minor,
        COALESCE((
          SELECT SUM(tbp.amount_minor)
          FROM trading_buyer_payments tbp
          JOIN trading_sales ts2 ON ts2.id = tbp.sale_id
          WHERE ts2.buyer_name = ts.buyer_name
        ), 0) AS total_amount_received_minor,
        (
          SELECT MAX(tbp.payment_date)
          FROM trading_buyer_payments tbp
          JOIN trading_sales ts2 ON ts2.id = tbp.sale_id
          WHERE ts2.buyer_name = ts.buyer_name
        ) AS last_payment_date
      FROM trading_sales ts
      GROUP BY ts.buyer_name
      ORDER BY ts.buyer_name ASC
    `).all();

    const buyerReceivables = buyerRows.map((b) => {
      const remaining = b.total_sales_amount_minor - b.total_amount_received_minor;
      let status = "Pending";
      if (remaining <= 0) {
        status = "Fully Paid";
      } else if (b.total_amount_received_minor > 0) {
        status = "Partially Paid";
      }
      return {
        ...b,
        remaining_amount_minor: remaining,
        payment_status: status
      };
    });

    return { sellerPayables, buyerReceivables };
  });

  // Financial Reports & Analytics
  ipcMain.handle("trading:reports:getFinancials", () => {
    const purchaseSum = db.prepare(`SELECT COALESCE(SUM(purchase_price_minor), 0) AS total, COUNT(*) AS count FROM trading_purchases`).get();
    const salesSum = db.prepare(`SELECT COALESCE(SUM(sale_price_minor), 0) AS total, COALESCE(SUM(cost_price_minor), 0) AS total_cost, COUNT(*) AS count FROM trading_sales`).get();
    const cashPaidSum = db.prepare(`SELECT COALESCE(SUM(amount_minor), 0) AS total FROM trading_seller_payments`).get();
    const cashReceivedSum = db.prepare(`SELECT COALESCE(SUM(amount_minor), 0) AS total FROM trading_buyer_payments`).get();

    const totalPurchaseValue = purchaseSum.total;
    const totalSalesValue = salesSum.total;
    const grossProfit = totalSalesValue - salesSum.total_cost;
    const totalCashPaid = cashPaidSum.total;
    const totalCashReceived = cashReceivedSum.total;
    const outstandingSellerPayables = totalPurchaseValue - totalCashPaid;
    const outstandingBuyerReceivables = totalSalesValue - totalCashReceived;
    const netCashPosition = totalCashReceived - totalCashPaid;

    // Monthly breakdown (last 12 months)
    const monthlySummary = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en-US", { month: "short", year: "numeric" });

      const pMonth = db.prepare(`SELECT COALESCE(SUM(purchase_price_minor), 0) AS val, COUNT(*) as cnt FROM trading_purchases WHERE purchase_date LIKE ?`).get(`${ym}%`);
      const sMonth = db.prepare(`SELECT COALESCE(SUM(sale_price_minor), 0) AS val, COALESCE(SUM(cost_price_minor), 0) AS cost, COUNT(*) as cnt FROM trading_sales WHERE sale_date LIKE ?`).get(`${ym}%`);
      const paidMonth = db.prepare(`SELECT COALESCE(SUM(amount_minor), 0) AS val FROM trading_seller_payments WHERE payment_date LIKE ?`).get(`${ym}%`);
      const recMonth = db.prepare(`SELECT COALESCE(SUM(amount_minor), 0) AS val FROM trading_buyer_payments WHERE payment_date LIKE ?`).get(`${ym}%`);

      monthlySummary.push({
        monthKey: ym,
        label,
        purchasesCount: pMonth.cnt,
        salesCount: sMonth.cnt,
        purchasesValue: pMonth.val,
        salesValue: sMonth.val,
        grossProfit: sMonth.val - sMonth.cost,
        cashPaid: paidMonth.val,
        cashReceived: recMonth.val,
        netCashFlow: recMonth.val - paidMonth.val
      });
    }

    return {
      totalPurchaseValue,
      totalSalesValue,
      grossProfit,
      totalCashPaid,
      totalCashReceived,
      outstandingSellerPayables,
      outstandingBuyerReceivables,
      netCashPosition,
      papersPurchasedCount: purchaseSum.count,
      papersSoldCount: salesSum.count,
      monthlySummary
    };
  });

  // Unified Transaction History
  ipcMain.handle("trading:transactions:unified", () => {
    const purchases = db.prepare(`
      SELECT
        id,
        'Purchase' AS type,
        purchase_date AS date,
        title,
        seller_name AS party,
        seller_contact AS party_contact,
        purchase_price_minor AS amount_minor,
        status,
        notes,
        created_at,
        '' AS payment_method,
        '' AS reference,
        id AS related_id,
        NULL AS parent_id
      FROM trading_purchases
    `).all();

    const sales = db.prepare(`
      SELECT
        id,
        'Sale' AS type,
        sale_date AS date,
        title,
        buyer_name AS party,
        buyer_contact AS party_contact,
        sale_price_minor AS amount_minor,
        'Active' AS status,
        notes,
        created_at,
        '' AS payment_method,
        '' AS reference,
        id AS related_id,
        purchase_id AS parent_id
      FROM trading_sales
    `).all();

    const sellerPayments = db.prepare(`
      SELECT
        tsp.id,
        'Seller Payment' AS type,
        tsp.payment_date AS date,
        tp.title,
        tp.seller_name AS party,
        tp.seller_contact AS party_contact,
        tsp.amount_minor,
        'Completed' AS status,
        tsp.notes,
        tsp.created_at,
        tsp.payment_method,
        tsp.reference,
        tsp.id AS related_id,
        tsp.purchase_id AS parent_id
      FROM trading_seller_payments tsp
      JOIN trading_purchases tp ON tp.id = tsp.purchase_id
    `).all();

    const buyerPayments = db.prepare(`
      SELECT
        tbp.id,
        'Buyer Receipt' AS type,
        tbp.payment_date AS date,
        ts.title,
        ts.buyer_name AS party,
        ts.buyer_contact AS party_contact,
        tbp.amount_minor,
        'Completed' AS status,
        tbp.notes,
        tbp.created_at,
        tbp.payment_method,
        tbp.reference,
        tbp.id AS related_id,
        tbp.sale_id AS parent_id
      FROM trading_buyer_payments tbp
      JOIN trading_sales ts ON ts.id = tbp.sale_id
    `).all();

    const all = [...purchases, ...sales, ...sellerPayments, ...buyerPayments];
    all.sort((a, b) => {
      const dateCmp = (b.date || "").localeCompare(a.date || "");
      if (dateCmp !== 0) return dateCmp;
      return (b.created_at || "").localeCompare(a.created_at || "");
    });
    return all;
  });

  // Trading Backup & Restore
  ipcMain.handle("trading:backup:export", async () => {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const defaultName = `ResearchTrading_Backup_${timestamp}.tpbak`;

    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Export Research Paper Trading Backup",
      defaultPath: defaultName,
      filters: [
        { name: "Trading Paper Backup Archive (*.tpbak, *.json)", extensions: ["tpbak", "json"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });

    if (result.canceled || !result.filePath) return null;

    const purchases = db.prepare("SELECT * FROM trading_purchases ORDER BY id ASC").all();
    const sellerPayments = db.prepare("SELECT * FROM trading_seller_payments ORDER BY id ASC").all();
    const sales = db.prepare("SELECT * FROM trading_sales ORDER BY id ASC").all();
    const buyerPayments = db.prepare("SELECT * FROM trading_buyer_payments ORDER BY id ASC").all();

    const backupData = {
      app: "research-trading",
      format_version: 1,
      export_date: now.toISOString(),
      summary: {
        purchases: purchases.length,
        seller_payments: sellerPayments.length,
        sales: sales.length,
        buyer_payments: buyerPayments.length,
        total_records: purchases.length + sellerPayments.length + sales.length + buyerPayments.length
      },
      tables: {
        trading_purchases: purchases,
        trading_seller_payments: sellerPayments,
        trading_sales: sales,
        trading_buyer_payments: buyerPayments
      }
    };

    fs.writeFileSync(result.filePath, JSON.stringify(backupData, null, 2), "utf8");
    const stats = fs.statSync(result.filePath);

    try {
      db.prepare(`
        INSERT INTO trading_backup_logs (backup_type, file_name, file_path, file_size_bytes, record_count_summary)
        VALUES ('manual', ?, ?, ?, ?)
      `).run(path.basename(result.filePath), result.filePath, stats.size, JSON.stringify(backupData.summary));
    } catch {}

    return {
      success: true,
      filePath: result.filePath,
      fileName: path.basename(result.filePath),
      size: stats.size,
      summary: backupData.summary
    };
  });

  ipcMain.handle("trading:backup:select-restore-file", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Select Research Paper Trading Backup File to Restore",
      filters: [
        { name: "Trading Paper Backup (*.tpbak, *.json)", extensions: ["tpbak", "json"] },
        { name: "All Files", extensions: ["*"] }
      ],
      properties: ["openFile"]
    });

    if (result.canceled || !result.filePaths.length) return null;

    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(content);

    if (parsed.app !== "research-trading" && !parsed.tables?.trading_purchases) {
      throw new Error("The selected file is not a valid Research Paper Trading backup archive.");
    }

    const previewSummary = parsed.summary || {
      purchases: (parsed.tables?.trading_purchases || []).length,
      seller_payments: (parsed.tables?.trading_seller_payments || []).length,
      sales: (parsed.tables?.trading_sales || []).length,
      buyer_payments: (parsed.tables?.trading_buyer_payments || []).length
    };

    return {
      filePath,
      fileName: path.basename(filePath),
      previewSummary
    };
  });

  ipcMain.handle("trading:backup:restore", async (_event, { filePath, rawJsonData }) => {
    let data = null;
    if (rawJsonData) {
      data = typeof rawJsonData === "string" ? JSON.parse(rawJsonData) : rawJsonData;
    } else if (filePath) {
      const content = fs.readFileSync(filePath, "utf8");
      data = JSON.parse(content);
    } else {
      throw new Error("No backup file or data provided for restore.");
    }

    if (!data || typeof data !== "object") throw new Error("Invalid backup data format.");
    if (data.app !== "research-trading" && !data.tables?.trading_purchases) {
      throw new Error("The provided file is not a valid Research Paper Trading backup.");
    }

    const tables = data.tables || {};
    const purchases = Array.isArray(tables.trading_purchases) ? tables.trading_purchases : [];
    const sellerPayments = Array.isArray(tables.trading_seller_payments) ? tables.trading_seller_payments : [];
    const sales = Array.isArray(tables.trading_sales) ? tables.trading_sales : [];
    const buyerPayments = Array.isArray(tables.trading_buyer_payments) ? tables.trading_buyer_payments : [];

    // Safe transaction: restore ONLY trading tables! Research management data is 100% untouched.
    const restoreTx = db.transaction(() => {
      db.prepare("DELETE FROM trading_buyer_payments").run();
      db.prepare("DELETE FROM trading_sales").run();
      db.prepare("DELETE FROM trading_seller_payments").run();
      db.prepare("DELETE FROM trading_purchases").run();

      const insPurch = db.prepare(`
        INSERT INTO trading_purchases (id, title, seller_name, seller_contact, purchase_date, purchase_price_minor, notes, status, created_at)
        VALUES (@id, @title, @seller_name, @seller_contact, @purchase_date, @purchase_price_minor, @notes, @status, @created_at)
      `);
      for (const p of purchases) {
        insPurch.run({
          id: p.id,
          title: p.title || "Untitled Paper",
          seller_name: p.seller_name || "Unknown Seller",
          seller_contact: p.seller_contact || "",
          purchase_date: p.purchase_date || new Date().toISOString().slice(0, 10),
          purchase_price_minor: p.purchase_price_minor || 0,
          notes: p.notes || "",
          status: p.status || "Active",
          created_at: p.created_at || new Date().toISOString()
        });
      }

      const insSellPay = db.prepare(`
        INSERT INTO trading_seller_payments (id, purchase_id, amount_minor, payment_date, payment_method, reference, notes, created_at)
        VALUES (@id, @purchase_id, @amount_minor, @payment_date, @payment_method, @reference, @notes, @created_at)
      `);
      for (const sp of sellerPayments) {
        insSellPay.run({
          id: sp.id,
          purchase_id: sp.purchase_id,
          amount_minor: sp.amount_minor || 0,
          payment_date: sp.payment_date || new Date().toISOString().slice(0, 10),
          payment_method: sp.payment_method || "Bank Transfer",
          reference: sp.reference || "",
          notes: sp.notes || "",
          created_at: sp.created_at || new Date().toISOString()
        });
      }

      const insSale = db.prepare(`
        INSERT INTO trading_sales (id, purchase_id, title, buyer_name, buyer_contact, sale_date, sale_price_minor, cost_price_minor, notes, created_at)
        VALUES (@id, @purchase_id, @title, @buyer_name, @buyer_contact, @sale_date, @sale_price_minor, @cost_price_minor, @notes, @created_at)
      `);
      for (const s of sales) {
        insSale.run({
          id: s.id,
          purchase_id: s.purchase_id || null,
          title: s.title || "Untitled Paper",
          buyer_name: s.buyer_name || "Unknown Buyer",
          buyer_contact: s.buyer_contact || "",
          sale_date: s.sale_date || new Date().toISOString().slice(0, 10),
          sale_price_minor: s.sale_price_minor || 0,
          cost_price_minor: s.cost_price_minor || 0,
          notes: s.notes || "",
          created_at: s.created_at || new Date().toISOString()
        });
      }

      const insBuyPay = db.prepare(`
        INSERT INTO trading_buyer_payments (id, sale_id, amount_minor, payment_date, payment_method, reference, notes, created_at)
        VALUES (@id, @sale_id, @amount_minor, @payment_date, @payment_method, @reference, @notes, @created_at)
      `);
      for (const bp of buyerPayments) {
        insBuyPay.run({
          id: bp.id,
          sale_id: bp.sale_id,
          amount_minor: bp.amount_minor || 0,
          payment_date: bp.payment_date || new Date().toISOString().slice(0, 10),
          payment_method: bp.payment_method || "Bank Transfer",
          reference: bp.reference || "",
          notes: bp.notes || "",
          created_at: bp.created_at || new Date().toISOString()
        });
      }
    });

    restoreTx();

    db.pragma("foreign_key_check");
    db.pragma("integrity_check");

    return {
      success: true,
      counts: {
        purchases: purchases.length,
        seller_payments: sellerPayments.length,
        sales: sales.length,
        buyer_payments: buyerPayments.length
      }
    };
  });

  ipcMain.handle("trading:backup:list-logs", () => {
    try {
      return db.prepare(`SELECT * FROM trading_backup_logs ORDER BY id DESC LIMIT 20`).all().map(r => {
        let summary = {};
        try { summary = JSON.parse(r.record_count_summary || "{}"); } catch {}
        return { ...r, record_count_summary: summary };
      });
    } catch {
      return [];
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: "Research Management System",
    icon: path.join(__dirname, "..", "public", "main-logo.svg"),
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

    // Schedule weekly automatic backup without interrupting user
    setTimeout(checkAndRunWeeklyAutoBackup, 3500);
    setInterval(checkAndRunWeeklyAutoBackup, 60 * 60 * 1000);

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
