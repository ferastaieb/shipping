import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  QueryCommandInput,
  ScanCommand,
  ScanCommandInput,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";

const client = new DynamoDBClient({
  region,
  endpoint: process.env.DYNAMODB_ENDPOINT || undefined,
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          sessionToken: process.env.AWS_SESSION_TOKEN,
        }
      : undefined,
});

export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const TABLE_ENV_KEYS = {
  shipments: "DDB_SHIPMENTS_TABLE",
  partialShipments: "DDB_PARTIAL_SHIPMENTS_TABLE",
  packageDetails: "DDB_PACKAGE_DETAILS_TABLE",
  partialShipmentItems: "DDB_PARTIAL_SHIPMENT_ITEMS_TABLE",
  customers: "DDB_CUSTOMERS_TABLE",
  users: "DDB_USERS_TABLE",
  notes: "DDB_NOTES_TABLE",
  auditLogs: "DDB_AUDIT_LOGS_TABLE",
  counters: "DDB_COUNTERS_TABLE",
} as const;

const TABLES: Record<keyof typeof TABLE_ENV_KEYS, string> = {
  shipments: process.env.DDB_SHIPMENTS_TABLE || "",
  partialShipments: process.env.DDB_PARTIAL_SHIPMENTS_TABLE || "",
  packageDetails: process.env.DDB_PACKAGE_DETAILS_TABLE || "",
  partialShipmentItems: process.env.DDB_PARTIAL_SHIPMENT_ITEMS_TABLE || "",
  customers: process.env.DDB_CUSTOMERS_TABLE || "",
  users: process.env.DDB_USERS_TABLE || "",
  notes: process.env.DDB_NOTES_TABLE || "",
  auditLogs: process.env.DDB_AUDIT_LOGS_TABLE || "",
  counters: process.env.DDB_COUNTERS_TABLE || "",
};

export function tableName(key: keyof typeof TABLES) {
  const name = TABLES[key];
  if (!name) {
    throw new Error(`Missing env var ${TABLE_ENV_KEYS[key]}`);
  }
  return name;
}

export function buildUpdateExpression(updates: Record<string, unknown>) {
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  const sets: string[] = [];
  let index = 0;

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) {
      continue;
    }
    const nameKey = `#k${index}`;
    const valueKey = `:v${index}`;
    names[nameKey] = key;
    values[valueKey] = value;
    sets.push(`${nameKey} = ${valueKey}`);
    index += 1;
  }

  if (!sets.length) {
    return null;
  }

  return {
    UpdateExpression: `SET ${sets.join(", ")}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  };
}

export async function nextId(counterName: string) {
  const result = await ddb.send(
    new UpdateCommand({
      TableName: tableName("counters"),
      Key: { name: counterName },
      UpdateExpression: "SET #value = if_not_exists(#value, :zero) + :inc",
      ExpressionAttributeNames: { "#value": "value" },
      ExpressionAttributeValues: { ":inc": 1, ":zero": 0 },
      ReturnValues: "UPDATED_NEW",
    })
  );

  const value = result.Attributes?.value;
  if (typeof value !== "number") {
    throw new Error(`Failed to allocate id for ${counterName}`);
  }
  return value;
}

export async function getItem<T>(table: string, key: Record<string, unknown>) {
  const result = await ddb.send(new GetCommand({ TableName: table, Key: key }));
  return (result.Item as T) || null;
}

export async function putItem(table: string, item: Record<string, unknown>) {
  await ddb.send(
    new PutCommand({
      TableName: table,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );
}

export async function updateItem(
  table: string,
  key: Record<string, unknown>,
  updates: Record<string, unknown>
) {
  const expression = buildUpdateExpression(updates);
  if (!expression) {
    return null;
  }
  const result = await ddb.send(
    new UpdateCommand({
      TableName: table,
      Key: key,
      ...expression,
      ReturnValues: "ALL_NEW",
    })
  );
  return result.Attributes || null;
}

export async function incrementItem(
  table: string,
  key: Record<string, unknown>,
  increments: Record<string, number>
) {
  const names: Record<string, string> = {};
  const values: Record<string, number> = {};
  const addParts: string[] = [];
  let index = 0;

  for (const [field, amount] of Object.entries(increments)) {
    if (!amount) {
      continue;
    }
    const nameKey = `#k${index}`;
    const valueKey = `:v${index}`;
    names[nameKey] = field;
    values[valueKey] = amount;
    addParts.push(`${nameKey} ${valueKey}`);
    index += 1;
  }

  if (!addParts.length) {
    return null;
  }

  const result = await ddb.send(
    new UpdateCommand({
      TableName: table,
      Key: key,
      UpdateExpression: `ADD ${addParts.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW",
    })
  );

  return result.Attributes || null;
}

export async function deleteItem(table: string, key: Record<string, unknown>) {
  await ddb.send(new DeleteCommand({ TableName: table, Key: key }));
}

export async function scanAll<T>(params: ScanCommandInput) {
  const items: T[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await ddb.send(
      new ScanCommand({
        ...params,
        ExclusiveStartKey: lastKey,
      })
    );
    if (result.Items) {
      items.push(...(result.Items as T[]));
    }
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return items;
}

export async function queryAll<T>(params: QueryCommandInput) {
  const items: T[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await ddb.send(
      new QueryCommand({
        ...params,
        ExclusiveStartKey: lastKey,
      })
    );
    if (result.Items) {
      items.push(...(result.Items as T[]));
    }
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return items;
}

export async function batchWriteAll(requests: Record<string, { DeleteRequest?: { Key: Record<string, unknown> } }[]>) {
  let unprocessed = requests;

  while (Object.keys(unprocessed).length) {
    const result = await ddb.send(new BatchWriteCommand({ RequestItems: unprocessed }));
    unprocessed = result.UnprocessedItems || {};
    if (Object.keys(unprocessed).length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}
