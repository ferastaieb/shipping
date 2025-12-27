import { NextResponse } from "next/server";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { batchWriteAll, ddb, tableName } from "@/lib/dynamodb";

export const runtime = "nodejs";

type TableKey =
  | "shipments"
  | "partialShipments"
  | "packageDetails"
  | "partialShipmentItems"
  | "customers"
  | "users"
  | "notes"
  | "auditLogs";

type ParsedValue = string | number | boolean | null;

const TABLE_KEY_BY_SQL: Record<string, TableKey> = {
  shipment: "shipments",
  partialshipment: "partialShipments",
  packagedetail: "packageDetails",
  partialshipmentitem: "partialShipmentItems",
  customer: "customers",
  user: "users",
  note: "notes",
  auditlog: "auditLogs",
};

const BOOLEAN_COLUMNS = new Set(["isOpen", "paymentCompleted"]);
const JSON_COLUMNS = new Set(["images"]);

function extractCreateTableSchemas(sql: string) {
  const schemas: Record<string, string[]> = {};
  const regex = /CREATE TABLE\s+`?([A-Za-z0-9_]+)`?\s*\(([\s\S]*?)\)\s*ENGINE=/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(sql)) !== null) {
    const tableNameRaw = match[1];
    const body = match[2];
    const columns: string[] = [];
    const lines = body.split(/\r?\n/);
    for (const line of lines) {
      const colMatch = line.trim().match(/^`([^`]+)`\s+/);
      if (colMatch) {
        columns.push(colMatch[1]);
      }
    }
    if (columns.length) {
      schemas[tableNameRaw.toLowerCase()] = columns;
    }
  }

  return schemas;
}

function extractInsertStatements(sql: string) {
  const statements: string[] = [];
  const lower = sql.toLowerCase();
  let idx = 0;

  while (idx < sql.length) {
    const start = lower.indexOf("insert into", idx);
    if (start === -1) {
      break;
    }
    let i = start;
    let inString = false;
    while (i < sql.length) {
      const ch = sql[i];
      if (inString) {
        if (ch === "'") {
          if (sql[i + 1] === "'") {
            i += 2;
            continue;
          }
          if (sql[i - 1] !== "\\") {
            inString = false;
          }
        }
        i += 1;
        continue;
      }
      if (ch === "'") {
        inString = true;
        i += 1;
        continue;
      }
      if (ch === ";") {
        i += 1;
        break;
      }
      i += 1;
    }
    statements.push(sql.slice(start, i));
    idx = i;
  }

  return statements;
}

function parseInsertStatement(statement: string) {
  const match = statement.match(
    /insert\s+into\s+`?([A-Za-z0-9_]+)`?\s*(\(([^)]*)\))?\s*values\s*/i
  );
  if (!match) {
    return null;
  }

  const tableNameRaw = match[1];
  const columnsRaw = match[3];
  const columns = columnsRaw
    ? columnsRaw
        .split(",")
        .map((col) => col.trim().replace(/`/g, ""))
        .filter(Boolean)
    : null;

  const matchIndex = match.index ?? 0;
  const valuesPart = statement.slice(matchIndex + match[0].length).trim().replace(/;$/, "");

  return {
    tableNameRaw,
    columns,
    rows: parseValuesPart(valuesPart),
  };
}

function parseValuesPart(valuesPart: string) {
  const rows: ParsedValue[][] = [];
  let i = 0;
  let inString = false;
  let currentRow: ParsedValue[] | null = null;
  let currentValue = "";
  let currentValueIsString = false;

  while (i < valuesPart.length) {
    const ch = valuesPart[i];

    if (!currentRow) {
      if (ch === "(") {
        currentRow = [];
        currentValue = "";
        currentValueIsString = false;
      }
      i += 1;
      continue;
    }

    if (inString) {
      if (ch === "\\") {
        const next = valuesPart[i + 1];
        if (next) {
          const escapeMap: Record<string, string> = {
            n: "\n",
            r: "\r",
            t: "\t",
            "0": "\0",
            "'": "'",
            '"': '"',
            "\\": "\\",
          };
          currentValue += escapeMap[next] ?? next;
          i += 2;
          continue;
        }
      }

      if (ch === "'") {
        if (valuesPart[i + 1] === "'") {
          currentValue += "'";
          i += 2;
          continue;
        }
        inString = false;
        i += 1;
        continue;
      }

      currentValue += ch;
      i += 1;
      continue;
    }

    if (ch === "'") {
      inString = true;
      currentValueIsString = true;
      i += 1;
      continue;
    }

    if (ch === ",") {
      currentRow.push(parseToken(currentValue, currentValueIsString));
      currentValue = "";
      currentValueIsString = false;
      i += 1;
      continue;
    }

    if (ch === ")") {
      currentRow.push(parseToken(currentValue, currentValueIsString));
      rows.push(currentRow);
      currentRow = null;
      currentValue = "";
      currentValueIsString = false;
      i += 1;
      continue;
    }

    currentValue += ch;
    i += 1;
  }

  return rows;
}

function parseToken(raw: string, isString: boolean): ParsedValue {
  if (isString) {
    return raw;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const upper = trimmed.toUpperCase();
  if (upper === "NULL" || upper === "\\N") {
    return null;
  }
  if (upper === "TRUE") {
    return true;
  }
  if (upper === "FALSE") {
    return false;
  }
  const num = Number(trimmed);
  if (!Number.isNaN(num)) {
    return num;
  }
  return trimmed;
}

function normalizeItem(tableKey: TableKey, item: Record<string, ParsedValue>) {
  const normalized: Record<string, ParsedValue> = { ...item };

  if (typeof normalized.id === "number") {
    normalized.id = Number(normalized.id);
  }

  for (const [key, value] of Object.entries(normalized)) {
    if (BOOLEAN_COLUMNS.has(key)) {
      if (typeof value === "number") {
        normalized[key] = value === 1;
      } else if (typeof value === "string") {
        normalized[key] = value === "1" || value.toLowerCase() === "true";
      }
    }

    if (JSON_COLUMNS.has(key) && typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          normalized[key] = JSON.parse(trimmed) as ParsedValue;
        } catch {
          normalized[key] = value;
        }
      }
    }
  }

  if (tableKey === "shipments" && typeof normalized.isOpen === "number") {
    normalized.isOpen = normalized.isOpen === 1;
  }

  if (tableKey === "partialShipments" && typeof normalized.paymentCompleted === "number") {
    normalized.paymentCompleted = normalized.paymentCompleted === 1;
  }

  return normalized;
}

async function writeItems(tableKey: TableKey, items: Record<string, ParsedValue>[]) {
  if (!items.length) {
    return 0;
  }
  const table = tableName(tableKey);
  const requests = items.map((item) => ({
    PutRequest: { Item: item },
  }));

  for (let i = 0; i < requests.length; i += 25) {
    await batchWriteAll({
      [table]: requests.slice(i, i + 25),
    });
  }

  return items.length;
}

async function updateCounter(counterName: string, value: number) {
  await ddb.send(
    new UpdateCommand({
      TableName: tableName("counters"),
      Key: { name: counterName },
      UpdateExpression: "SET #value = :value",
      ExpressionAttributeNames: { "#value": "value" },
      ExpressionAttributeValues: { ":value": value },
    })
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "SQL file is required." }, { status: 400 });
    }

    const sql = await file.text();
    if (!sql.trim()) {
      return NextResponse.json({ error: "SQL file is empty." }, { status: 400 });
    }

    const schemaMap = extractCreateTableSchemas(sql);
    const statements = extractInsertStatements(sql);
    if (!statements.length) {
      return NextResponse.json({ error: "No INSERT statements found." }, { status: 400 });
    }

    const itemsByTable: Record<TableKey, Record<string, ParsedValue>[]> = {
      shipments: [],
      partialShipments: [],
      packageDetails: [],
      partialShipmentItems: [],
      customers: [],
      users: [],
      notes: [],
      auditLogs: [],
    };

    const maxIds: Record<TableKey, number> = {
      shipments: 0,
      partialShipments: 0,
      packageDetails: 0,
      partialShipmentItems: 0,
      customers: 0,
      users: 0,
      notes: 0,
      auditLogs: 0,
    };

    for (const statement of statements) {
      const parsed = parseInsertStatement(statement);
      if (!parsed) {
        continue;
      }

      const normalizedName = parsed.tableNameRaw.replace(/`/g, "").toLowerCase();
      const tableKey = TABLE_KEY_BY_SQL[normalizedName];
      if (!tableKey) {
        continue;
      }

      const columns = parsed.columns && parsed.columns.length
        ? parsed.columns
        : schemaMap[normalizedName];
      if (!columns || !columns.length) {
        return NextResponse.json(
          { error: `Missing columns for table ${parsed.tableNameRaw}.` },
          { status: 400 }
        );
      }

      for (const row of parsed.rows) {
        const item: Record<string, ParsedValue> = {};
        columns.forEach((col, index) => {
          item[col] = row[index] ?? null;
        });

        const normalized = normalizeItem(tableKey, item);
        itemsByTable[tableKey].push(normalized);

        if (typeof normalized.id === "number" && normalized.id > maxIds[tableKey]) {
          maxIds[tableKey] = normalized.id;
        }
      }
    }

    const inserted: Record<TableKey, number> = {
      shipments: await writeItems("shipments", itemsByTable.shipments),
      partialShipments: await writeItems("partialShipments", itemsByTable.partialShipments),
      packageDetails: await writeItems("packageDetails", itemsByTable.packageDetails),
      partialShipmentItems: await writeItems("partialShipmentItems", itemsByTable.partialShipmentItems),
      customers: await writeItems("customers", itemsByTable.customers),
      users: await writeItems("users", itemsByTable.users),
      notes: await writeItems("notes", itemsByTable.notes),
      auditLogs: await writeItems("auditLogs", itemsByTable.auditLogs),
    };

    const counterUpdates: Record<string, number> = {};
    for (const [key, value] of Object.entries(maxIds)) {
      if (value > 0) {
        await updateCounter(key, value);
        counterUpdates[key] = value;
      }
    }

    return NextResponse.json({
      message: "Import completed.",
      inserted,
      counters: counterUpdates,
    });
  } catch (error: any) {
    console.error("SQL import failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to import SQL file." },
      { status: 500 }
    );
  }
}
