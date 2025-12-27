import {
  getItem,
  nextId,
  putItem,
  queryAll,
  scanAll,
  tableName,
  updateItem,
  deleteItem,
} from "@/lib/dynamodb";

type IncludeOptions = {
  includePackages?: boolean;
  includeItems?: boolean;
  includeCustomer?: boolean;
  includeNote?: boolean;
  includeShipment?: boolean;
};

export async function listShipments() {
  return scanAll<any>({ TableName: tableName("shipments") });
}

export async function listPartialShipments() {
  return scanAll<any>({ TableName: tableName("partialShipments") });
}

export async function listCustomers() {
  return scanAll<any>({ TableName: tableName("customers") });
}

export async function listPackageDetails() {
  return scanAll<any>({ TableName: tableName("packageDetails") });
}

export async function listPartialShipmentItems() {
  return scanAll<any>({ TableName: tableName("partialShipmentItems") });
}

export async function listUsers() {
  return scanAll<any>({ TableName: tableName("users") });
}

export async function getShipmentById(id: number) {
  return getItem<any>(tableName("shipments"), { id });
}

export async function getPartialShipmentById(id: number) {
  return getItem<any>(tableName("partialShipments"), { id });
}

export async function getPackageDetailById(id: number) {
  return getItem<any>(tableName("packageDetails"), { id });
}

export async function getPartialShipmentItemById(id: number) {
  return getItem<any>(tableName("partialShipmentItems"), { id });
}

export async function getCustomerById(id: number) {
  return getItem<any>(tableName("customers"), { id });
}

export async function getUserById(id: number) {
  return getItem<any>(tableName("users"), { id });
}

export async function getUserByUsername(username: string) {
  const results = await queryAll<any>({
    TableName: tableName("users"),
    IndexName: "byUsername",
    KeyConditionExpression: "#username = :username",
    ExpressionAttributeNames: { "#username": "username" },
    ExpressionAttributeValues: { ":username": username },
  });
  return results[0] || null;
}

export async function getNoteById(id: number) {
  return getItem<any>(tableName("notes"), { id });
}

export async function getPartialShipmentsByShipmentId(shipmentId: number) {
  return queryAll<any>({
    TableName: tableName("partialShipments"),
    IndexName: "byShipmentId",
    KeyConditionExpression: "#shipmentId = :shipmentId",
    ExpressionAttributeNames: { "#shipmentId": "shipmentId" },
    ExpressionAttributeValues: { ":shipmentId": shipmentId },
  });
}

export async function getPartialShipmentsByCustomerId(customerId: number) {
  return queryAll<any>({
    TableName: tableName("partialShipments"),
    IndexName: "byCustomerId",
    KeyConditionExpression: "#customerId = :customerId",
    ExpressionAttributeNames: { "#customerId": "customerId" },
    ExpressionAttributeValues: { ":customerId": customerId },
  });
}

export async function getPackagesByPartialShipmentId(partialShipmentId: number) {
  return queryAll<any>({
    TableName: tableName("packageDetails"),
    IndexName: "byPartialShipmentId",
    KeyConditionExpression: "#partialShipmentId = :partialShipmentId",
    ExpressionAttributeNames: { "#partialShipmentId": "partialShipmentId" },
    ExpressionAttributeValues: { ":partialShipmentId": partialShipmentId },
  });
}

export async function getItemsByPartialShipmentId(partialShipmentId: number) {
  return queryAll<any>({
    TableName: tableName("partialShipmentItems"),
    IndexName: "byPartialShipmentId",
    KeyConditionExpression: "#partialShipmentId = :partialShipmentId",
    ExpressionAttributeNames: { "#partialShipmentId": "partialShipmentId" },
    ExpressionAttributeValues: { ":partialShipmentId": partialShipmentId },
  });
}

export async function hydratePartialShipment(partialShipment: any, options: IncludeOptions = {}) {
  const {
    includePackages = true,
    includeItems = true,
    includeCustomer = true,
    includeNote = true,
    includeShipment = false,
  } = options;

  const [packages, items, customer, note, shipment] = await Promise.all([
    includePackages ? getPackagesByPartialShipmentId(partialShipment.id) : Promise.resolve(undefined),
    includeItems ? getItemsByPartialShipmentId(partialShipment.id) : Promise.resolve(undefined),
    includeCustomer ? getCustomerById(partialShipment.customerId) : Promise.resolve(undefined),
    includeNote && partialShipment.noteId ? getNoteById(partialShipment.noteId) : Promise.resolve(null),
    includeShipment ? getShipmentById(partialShipment.shipmentId) : Promise.resolve(undefined),
  ]);

  return {
    ...partialShipment,
    ...(includePackages ? { packages } : {}),
    ...(includeItems ? { items } : {}),
    ...(includeCustomer ? { customer } : {}),
    ...(includeNote ? { note } : {}),
    ...(includeShipment ? { shipment } : {}),
  };
}

export async function getPartialShipmentWithDetails(
  partialShipmentId: number,
  options: IncludeOptions = {}
) {
  const partialShipment = await getPartialShipmentById(partialShipmentId);
  if (!partialShipment) {
    return null;
  }
  return hydratePartialShipment(partialShipment, options);
}

export async function getShipmentWithDetails(shipmentId: number) {
  const shipment = await getShipmentById(shipmentId);
  if (!shipment) {
    return null;
  }

  const [partials, note] = await Promise.all([
    getPartialShipmentsByShipmentId(shipmentId),
    shipment.noteId ? getNoteById(shipment.noteId) : Promise.resolve(null),
  ]);

  const partialShipments = await Promise.all(
    partials.map((partial) => hydratePartialShipment(partial, { includeShipment: false }))
  );

  return {
    ...shipment,
    partialShipments,
    note,
  };
}

export async function getCustomerWithDetails(customerId: number) {
  const customer = await getCustomerById(customerId);
  if (!customer) {
    return null;
  }

  const [partials, note] = await Promise.all([
    getPartialShipmentsByCustomerId(customerId),
    customer.noteId ? getNoteById(customer.noteId) : Promise.resolve(null),
  ]);

  const partialShipments = await Promise.all(
    partials.map((partial) =>
      hydratePartialShipment(partial, {
        includeShipment: true,
        includeNote: true,
        includePackages: false,
        includeItems: false,
        includeCustomer: false,
      })
    )
  );

  return {
    ...customer,
    partialShipments,
    note,
  };
}

export async function createNote({
  content,
  images,
  userId,
}: {
  content?: string;
  images?: string[];
  userId?: number | null;
}) {
  const id = await nextId("notes");
  const note = {
    id,
    content,
    images,
    ...(userId ? { createdByUserId: userId, updatedByUserId: userId } : {}),
  };
  await putItem(tableName("notes"), note);
  return note;
}

export async function updateNote(
  noteId: number,
  updates: { content?: string; images?: string[] },
  userId?: number | null
) {
  return updateItem(
    tableName("notes"),
    { id: noteId },
    {
      ...updates,
      ...(userId ? { updatedByUserId: userId } : {}),
    }
  );
}

export async function deleteNote(noteId: number) {
  await deleteItem(tableName("notes"), { id: noteId });
}

export async function createUser({
  username,
  password,
}: {
  username: string;
  password: string;
}) {
  const id = await nextId("users");
  const now = new Date().toISOString();
  const user = {
    id,
    username,
    password,
    createdAt: now,
    updatedAt: now,
  };
  await putItem(tableName("users"), user);
  return user;
}
