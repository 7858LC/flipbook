import { google } from "googleapis";
import type { sheets_v4 } from "googleapis";
import { nanoid } from "nanoid";
import { withExponentialBackoff } from "./backoff";
import { logger } from "./logger";
import { calculateNetProfit } from "./money";

const IS_DEMO = (id: string) => id === "__demo__";
import type { SaleRow, ExpenseRow, Settings } from "@/types";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function getAuth() {
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    ?.replace(/^["']|["'],?$/g, "")  // strip surrounding quotes/comma
    ?.replace(/\\n/g, "\n");         // convert \n to real newlines
  if (!privateKey || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    throw new Error("Google service account credentials not configured");
  }
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });
}

function getSheetsClient(): sheets_v4.Sheets {
  return google.sheets({ version: "v4", auth: getAuth() });
}

// ---------------------------------------------------------------------------
// Registry helpers (master spreadsheet that maps email -> spreadsheet_id)
// ---------------------------------------------------------------------------

// In-memory cache so returning users never hit the master sheet again
const registryCache = new Map<string, string>();

async function lookupUserSpreadsheet(email: string): Promise<string | null> {
  if (registryCache.has(email)) return registryCache.get(email)!;
  const masterSpreadsheetId = process.env.MASTER_SPREADSHEET_ID;
  if (!masterSpreadsheetId) {
    throw new Error("MASTER_SPREADSHEET_ID not configured");
  }
  const sheets = getSheetsClient();
  const result = await withExponentialBackoff(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId: masterSpreadsheetId,
      range: "Users!A:B",
    })
  );
  const rows = result.data.values ?? [];
  for (const row of rows) {
    if (row[0] === email) {
      const id = row[1] as string;
      registryCache.set(email, id);
      return id;
    }
  }
  return null;
}

async function registerUserSpreadsheet(
  email: string,
  spreadsheetId: string
): Promise<void> {
  const masterSpreadsheetId = process.env.MASTER_SPREADSHEET_ID;
  if (!masterSpreadsheetId) {
    throw new Error("MASTER_SPREADSHEET_ID not configured");
  }
  const sheets = getSheetsClient();
  await withExponentialBackoff(() =>
    sheets.spreadsheets.values.append({
      spreadsheetId: masterSpreadsheetId,
      range: "Users!A:B",
      valueInputOption: "RAW",
      requestBody: { values: [[email, spreadsheetId]] },
    })
  );
  registryCache.set(email, spreadsheetId);
}

// ---------------------------------------------------------------------------
// Spreadsheet creation
// ---------------------------------------------------------------------------

const SALES_HEADERS = [
  "id",
  "date",
  "item_name",
  "category",
  "platform",
  "buy_price",
  "sell_price",
  "platform_fee_pct",
  "shipping_cost",
  "other_costs",
  "net_profit",
  "days_to_sell",
  "notes",
  "status",
];

const EXPENSE_HEADERS = [
  "id",
  "date",
  "category",
  "description",
  "amount",
  "tax_deductible",
  "receipt_url",
  "notes",
];

const DEFAULT_CATEGORIES_LIST = [
  "Electronics",
  "Clothing",
  "Tools",
  "Furniture",
  "Books",
  "Collectibles",
  "Sporting Goods",
  "Other",
];

export async function getOrCreateSpreadsheet(
  email: string,
  userAccessToken?: string
): Promise<string> {
  const existing = await lookupUserSpreadsheet(email);
  if (existing) return existing;

  logger.info("Creating new spreadsheet for user", { email });

  const trialEndDate = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  // Create the spreadsheet using the user's OAuth token (service account has no Drive quota).
  // The user's access token has drive.file scope, so it can create files in their Drive.
  if (!userAccessToken) {
    throw new Error(
      "Cannot create spreadsheet: no user access token available. Please sign out and sign back in."
    );
  }

  const userAuth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  userAuth.setCredentials({ access_token: userAccessToken });

  const userSheets = google.sheets({ version: "v4", auth: userAuth });
  const userDrive = google.drive({ version: "v3", auth: userAuth });

  // Create the spreadsheet file in the user's Drive
  const created = await withExponentialBackoff(() =>
    userSheets.spreadsheets.create({
      requestBody: {
        properties: { title: `FlipBook — ${email}` },
        sheets: [
          { properties: { title: "Sales" } },
          { properties: { title: "Expenses" } },
          { properties: { title: "Settings" } },
          { properties: { title: "Categories" } },
        ],
      },
    })
  );

  const spreadsheetId = created.data.spreadsheetId!;

  // Populate headers and default data
  await withExponentialBackoff(() =>
    userSheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: [
          { range: "Sales!A1:N1", values: [SALES_HEADERS] },
          { range: "Expenses!A1:H1", values: [EXPENSE_HEADERS] },
          {
            range: "Settings!A:B",
            values: [
              ["tax_rate", "25"],
              ["business_name", ""],
              ["state", ""],
              ["stripe_customer_id", ""],
              ["stripe_subscription_id", ""],
              ["subscription_status", "trialing"],
              ["trial_end_date", trialEndDate],
              ["spreadsheet_id", spreadsheetId],
            ],
          },
          {
            range: "Categories!A:A",
            values: DEFAULT_CATEGORIES_LIST.map((c) => [c]),
          },
        ],
      },
    })
  );

  // Share the spreadsheet with the service account so it can read/write going forward
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  if (serviceAccountEmail) {
    await withExponentialBackoff(() =>
      userDrive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          role: "writer",
          type: "user",
          emailAddress: serviceAccountEmail,
        },
        sendNotificationEmail: false,
      })
    ).catch((err) => {
      logger.warn("Could not share spreadsheet with service account", { email, err });
    });
  }

  // Register in the master spreadsheet (service account has access to master)
  await registerUserSpreadsheet(email, spreadsheetId);

  return spreadsheetId;
}

// ---------------------------------------------------------------------------
// Row parsers / serializers
// ---------------------------------------------------------------------------

function parseSaleRow(row: string[]): SaleRow {
  const buyDate = row[1] ?? "";
  let daysToSell = parseInt(row[11] ?? "0", 10);
  if (isNaN(daysToSell)) daysToSell = 0;

  return {
    id: row[0] ?? "",
    date: buyDate,
    item_name: row[2] ?? "",
    category: row[3] ?? "",
    platform: row[4] ?? "",
    buy_price: parseInt(row[5] ?? "0", 10) || 0,
    sell_price: parseInt(row[6] ?? "0", 10) || 0,
    platform_fee_pct: parseFloat(row[7] ?? "0") || 0,
    shipping_cost: parseInt(row[8] ?? "0", 10) || 0,
    other_costs: parseInt(row[9] ?? "0", 10) || 0,
    net_profit: parseInt(row[10] ?? "0", 10) || 0,
    days_to_sell: daysToSell,
    notes: row[12] ?? "",
    status: (row[13] as "active" | "sold") ?? "active",
  };
}

function saleToRow(sale: SaleRow): string[] {
  return [
    sale.id,
    sale.date,
    sale.item_name,
    sale.category,
    sale.platform,
    String(sale.buy_price),
    String(sale.sell_price),
    String(sale.platform_fee_pct),
    String(sale.shipping_cost),
    String(sale.other_costs),
    String(sale.net_profit),
    String(sale.days_to_sell),
    sale.notes,
    sale.status,
  ];
}

function parseExpenseRow(row: string[]): ExpenseRow {
  return {
    id: row[0] ?? "",
    date: row[1] ?? "",
    category: row[2] ?? "",
    description: row[3] ?? "",
    amount: parseInt(row[4] ?? "0", 10) || 0,
    tax_deductible: (row[5] as "yes" | "no") ?? "no",
    receipt_url: row[6] ?? "",
    notes: row[7] ?? "",
  };
}

function expenseToRow(expense: ExpenseRow): string[] {
  return [
    expense.id,
    expense.date,
    expense.category,
    expense.description,
    String(expense.amount),
    expense.tax_deductible,
    expense.receipt_url,
    expense.notes,
  ];
}

// ---------------------------------------------------------------------------
// Generic row finder
// ---------------------------------------------------------------------------

async function findRowIndex(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  id: string
): Promise<number> {
  const result = await withExponentialBackoff(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`,
    })
  );
  const rows = result.data.values ?? [];
  const idx = rows.findIndex((r) => r[0] === id);
  if (idx === -1) throw new Error(`Row with id ${id} not found`);
  return idx;
}

async function deleteRowByIndex(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  rowIndex: number
): Promise<void> {
  const spreadsheet = await withExponentialBackoff(() =>
    sheets.spreadsheets.get({ spreadsheetId })
  );
  const sheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === sheetName
  );
  if (!sheet?.properties?.sheetId === undefined) {
    throw new Error(`Sheet ${sheetName} not found`);
  }
  const sheetId = sheet?.properties?.sheetId ?? 0;

  await withExponentialBackoff(() =>
    sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          },
        ],
      },
    })
  );
}

// ---------------------------------------------------------------------------
// Sales CRUD
// ---------------------------------------------------------------------------

export async function getSales(spreadsheetId: string): Promise<SaleRow[]> {
  if (IS_DEMO(spreadsheetId)) return [];
  const sheets = getSheetsClient();
  const result = await withExponentialBackoff(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sales!A2:N",
    })
  );
  const rows = result.data.values ?? [];
  return rows.filter((r) => r[0]).map(parseSaleRow);
}

export async function addSale(
  spreadsheetId: string,
  input: {
    date: string;
    item_name: string;
    category: string;
    platform: string;
    buy_price: number;
    sell_price: number;
    platform_fee_pct: number;
    shipping_cost: number;
    other_costs: number;
    notes: string;
    status: "active" | "sold";
  }
): Promise<SaleRow> {
  const sheets = getSheetsClient();
  const id = nanoid();
  const netProfit = calculateNetProfit(
    input.buy_price,
    input.sell_price,
    input.platform_fee_pct,
    input.shipping_cost,
    input.other_costs
  );

  const sale: SaleRow = {
    ...input,
    id,
    net_profit: netProfit,
    days_to_sell: 0,
  };

  await withExponentialBackoff(() =>
    sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sales!A:N",
      valueInputOption: "RAW",
      requestBody: { values: [saleToRow(sale)] },
    })
  );

  return sale;
}

export async function updateSale(
  spreadsheetId: string,
  id: string,
  updates: Partial<Omit<SaleRow, "id">>
): Promise<SaleRow> {
  const sheets = getSheetsClient();
  const all = await getSales(spreadsheetId);
  const existing = all.find((s) => s.id === id);
  if (!existing) throw new Error(`Sale ${id} not found`);

  const merged: SaleRow = { ...existing, ...updates, id };
  merged.net_profit = calculateNetProfit(
    merged.buy_price,
    merged.sell_price,
    merged.platform_fee_pct,
    merged.shipping_cost,
    merged.other_costs
  );

  if (merged.status === "sold" && existing.status === "active") {
    const listed = new Date(existing.date);
    const sold = new Date(merged.date);
    const diff = sold.getTime() - listed.getTime();
    merged.days_to_sell = Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
  }

  const rowIndex = await findRowIndex(sheets, spreadsheetId, "Sales", id);
  await withExponentialBackoff(() =>
    sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Sales!A${rowIndex + 1}:N${rowIndex + 1}`,
      valueInputOption: "RAW",
      requestBody: { values: [saleToRow(merged)] },
    })
  );

  return merged;
}

export async function deleteSale(
  spreadsheetId: string,
  id: string
): Promise<void> {
  const sheets = getSheetsClient();
  const rowIndex = await findRowIndex(sheets, spreadsheetId, "Sales", id);
  await deleteRowByIndex(sheets, spreadsheetId, "Sales", rowIndex);
}

// ---------------------------------------------------------------------------
// Expenses CRUD
// ---------------------------------------------------------------------------

export async function getExpenses(
  spreadsheetId: string
): Promise<ExpenseRow[]> {
  if (IS_DEMO(spreadsheetId)) return [];
  const sheets = getSheetsClient();
  const result = await withExponentialBackoff(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Expenses!A2:H",
    })
  );
  const rows = result.data.values ?? [];
  return rows.filter((r) => r[0]).map(parseExpenseRow);
}

export async function addExpense(
  spreadsheetId: string,
  input: {
    date: string;
    category: string;
    description: string;
    amount: number;
    tax_deductible: "yes" | "no";
    receipt_url: string;
    notes: string;
  }
): Promise<ExpenseRow> {
  const sheets = getSheetsClient();
  const expense: ExpenseRow = { ...input, id: nanoid() };
  await withExponentialBackoff(() =>
    sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Expenses!A:H",
      valueInputOption: "RAW",
      requestBody: { values: [expenseToRow(expense)] },
    })
  );
  return expense;
}

export async function updateExpense(
  spreadsheetId: string,
  id: string,
  updates: Partial<Omit<ExpenseRow, "id">>
): Promise<ExpenseRow> {
  const sheets = getSheetsClient();
  const all = await getExpenses(spreadsheetId);
  const existing = all.find((e) => e.id === id);
  if (!existing) throw new Error(`Expense ${id} not found`);

  const merged: ExpenseRow = { ...existing, ...updates, id };
  const rowIndex = await findRowIndex(sheets, spreadsheetId, "Expenses", id);
  await withExponentialBackoff(() =>
    sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Expenses!A${rowIndex + 1}:H${rowIndex + 1}`,
      valueInputOption: "RAW",
      requestBody: { values: [expenseToRow(merged)] },
    })
  );
  return merged;
}

export async function deleteExpense(
  spreadsheetId: string,
  id: string
): Promise<void> {
  const sheets = getSheetsClient();
  const rowIndex = await findRowIndex(sheets, spreadsheetId, "Expenses", id);
  await deleteRowByIndex(sheets, spreadsheetId, "Expenses", rowIndex);
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getSettings(spreadsheetId: string): Promise<Settings> {
  if (IS_DEMO(spreadsheetId)) return {
    tax_rate: 25, business_name: "Demo Reseller", state: "FL",
    stripe_customer_id: "", stripe_subscription_id: "",
    subscription_status: "trialing",
    trial_end_date: new Date(Date.now() + 30 * 86400000).toISOString(),
    spreadsheet_id: "__demo__",
  };
  const sheets = getSheetsClient();
  const result = await withExponentialBackoff(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Settings!A:B",
    })
  );
  const rows = result.data.values ?? [];
  const map: Record<string, string> = {};
  for (const row of rows) {
    if (row[0]) map[row[0] as string] = (row[1] as string) ?? "";
  }

  return {
    tax_rate: parseFloat(map["tax_rate"] ?? "25") || 25,
    business_name: map["business_name"] ?? "",
    state: map["state"] ?? "",
    stripe_customer_id: map["stripe_customer_id"] ?? "",
    stripe_subscription_id: map["stripe_subscription_id"] ?? "",
    subscription_status: map["subscription_status"] ?? "trialing",
    trial_end_date: map["trial_end_date"] ?? "",
    spreadsheet_id: map["spreadsheet_id"] ?? spreadsheetId,
  };
}

export async function updateSettings(
  spreadsheetId: string,
  updates: Partial<Settings>
): Promise<void> {
  const sheets = getSheetsClient();

  const existing = await withExponentialBackoff(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Settings!A:B",
    })
  );
  const rows = existing.data.values ?? [];
  const updatedRows: string[][] = rows.map((row) => {
    const key = row[0] as string;
    if (key && key in updates) {
      const val = updates[key as keyof Settings];
      return [key, val !== undefined ? String(val) : (row[1] as string) ?? ""];
    }
    return row as string[];
  });

  // Add any new keys
  for (const [key, val] of Object.entries(updates)) {
    if (!updatedRows.some((r) => r[0] === key)) {
      updatedRows.push([key, String(val)]);
    }
  }

  await withExponentialBackoff(() =>
    sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Settings!A1",
      valueInputOption: "RAW",
      requestBody: { values: updatedRows },
    })
  );
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

export async function exportAllData(
  spreadsheetId: string
): Promise<{ sales: string; expenses: string }> {
  const [sales, expenses] = await Promise.all([
    getSales(spreadsheetId),
    getExpenses(spreadsheetId),
  ]);

  const salesCsv = [
    SALES_HEADERS.join(","),
    ...sales.map((s) =>
      saleToRow(s)
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\n");

  const expensesCsv = [
    EXPENSE_HEADERS.join(","),
    ...expenses.map((e) =>
      expenseToRow(e)
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\n");

  return { sales: salesCsv, expenses: expensesCsv };
}

