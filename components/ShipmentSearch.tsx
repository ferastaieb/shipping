// components/ShipmentSearch.tsx
export default async function ShipmentSearch({
    searchParams,
  }: {
    searchParams: Record<string, string | string[]>;
  }) {
    // Convert searchParams to a plain object with string values only.
    const plainParams: Record<string, string> = {};
    for (const key in searchParams) {
      if (Object.prototype.hasOwnProperty.call(searchParams, key)) {
        const value = searchParams[key];
        if (typeof value === "string") {
          plainParams[key] = value;
        } else if (Array.isArray(value)) {
          plainParams[key] = value.join(",");
        }
      }
    }
  
    // Create a query string from the plain object.
    const query = new URLSearchParams(plainParams).toString();
  
    // Use a relative URL so Next.js correctly resolves the API route.
    const res = await fetch(`/api/shipments/search?${query}`, { cache: "no-store" });
  
    // Check if the response is OK. If not, throw an error with the response text.
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Error fetching shipments: ${errorText}`);
    }
  
    // Parse the response as JSON.
    const shipments = await res.json();
  
    return (
      <div className="space-y-6">
        <form method="get" className="flex flex-wrap gap-6 mb-6 items-end">
          <div className="flex flex-col">
            <label className="text-sm font-medium">Shipment ID</label>
            <input
              type="text"
              name="id"
              placeholder="Enter shipment ID"
              className="border rounded p-2"
              defaultValue={plainParams.id || ""}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium">Receiver Name</label>
            <input
              type="text"
              name="receiver"
              placeholder="Enter receiver name"
              className="border rounded p-2"
              defaultValue={plainParams.receiver || ""}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium">Receiver Phone</label>
            <input
              type="text"
              name="receiverPhone"
              placeholder="Enter receiver phone"
              className="border rounded p-2"
              defaultValue={plainParams.receiverPhone || ""}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium">Customer Phone</label>
            <input
              type="text"
              name="customerPhone"
              placeholder="Enter customer phone"
              className="border rounded p-2"
              defaultValue={plainParams.customerPhone || ""}
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
            Search
          </button>
        </form>
  
        <div className="space-y-4">
          {shipments.length > 0 ? (
            shipments.map((shipment: any) => (
              <div key={shipment.id} className="border p-4 rounded shadow">
                <p>
                  <strong>Shipment ID:</strong> {shipment.id}
                </p>
                <p>
                  <strong>Destination:</strong> {shipment.destination}
                </p>
                <p>
                  <strong>Total Weight:</strong> {shipment.totalWeight}
                </p>
                <div className="mt-2 space-y-2">
                  {shipment.partialShipments.map((ps: any) => (
                    <div key={ps.id} className="pl-4 border-l">
                      <p>
                        <strong>Receiver:</strong> {ps.receiverName || "N/A"}
                      </p>
                      <p>
                        <strong>Receiver Phone:</strong> {ps.receiverPhone || "N/A"}
                      </p>
                      <p>
                        <strong>Customer Phone:</strong> {ps.customer?.phone || "N/A"}
                      </p>
                      <p>
                        <strong>Volume:</strong> {ps.volume}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p>No shipments found.</p>
          )}
        </div>
      </div>
    );
  }
  