"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function CustomersList() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [originFilter, setOriginFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all customers on mount
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch customers");
        }
        return res.json();
      })
      .then((data) => {
        setCustomers(data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching customers:", error);
        setIsLoading(false);
      });
  }, []);

  // Filter customers based on search (name and phone) and origin
  const filteredCustomers = customers.filter((customer) => {
    const lowerSearch = search.toLowerCase();
    const nameMatch = customer.name.toLowerCase().includes(lowerSearch);
    const phoneMatch = customer.phone.toLowerCase().includes(lowerSearch);
    const searchMatch = nameMatch || phoneMatch;

    const originMatch = originFilter
      ? customer.origin.toLowerCase().includes(originFilter.toLowerCase())
      : true;

    return searchMatch && originMatch;
  });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-white">Customers</h1>

      {/* Search and Filter Form */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex flex-col">
          <label htmlFor="search" className="block text-white mb-1">
            Search (Name or Phone)
          </label>
          <Input
            id="search"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="origin" className="block text-white mb-1">
            Origin
          </label>
          <Input
            id="origin"
            placeholder="Filter by origin..."
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value)}
            className="w-64"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-white">Loading customers...</p>
      ) : (
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-[#2C3E50]">
              <Users className="mr-2 h-5 w-5 text-[#3498DB]" />
              Customer List
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="text-[#2C3E50]">Name</TableHead>
                  <TableHead className="text-[#2C3E50]">Phone</TableHead>
                  <TableHead className="text-[#2C3E50]">Address</TableHead>
                  <TableHead className="text-[#2C3E50]">Origin</TableHead>
                  <TableHead className="text-[#2C3E50]">Note</TableHead>
                  <TableHead className="text-right text-[#2C3E50]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer: any, index: number) => (
                  <TableRow key={customer.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <TableCell className="border-t border-[#DCDCDC]">{customer.name}</TableCell>
                    <TableCell className="border-t border-[#DCDCDC]">{customer.phone}</TableCell>
                    <TableCell className="border-t border-[#DCDCDC]">{customer.address}</TableCell>
                    <TableCell className="border-t border-[#DCDCDC]">{customer.origin}</TableCell>
                    <TableCell className="border-t border-[#DCDCDC]">
                      {customer.note ? (
                        <span title={customer.note.content} className="text-gray-600">
                          {customer.note.content.substring(0, 50)}
                          {customer.note.content.length > 50 ? "..." : ""}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">No note</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right border-t border-[#DCDCDC]">
                      <Link href={`/customers/${customer.id}`}>
                        <Button variant="outline" size="sm" className="bg-[#3498DB] text-white hover:bg-[#2980B9]">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
