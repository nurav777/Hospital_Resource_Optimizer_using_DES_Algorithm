import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Medicine, PharmacyAPIError } from "@/types/pharmacy";

const API_BASE = "http://localhost:5000";

export default function Pharmacy() {
  const { toast } = useToast();
  const [meds, setMeds] = useState<Medicine[]>([]);

  const loadMeds = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/pharmacy/medicines`, {
        headers: { Authorization: `Bearer ${token || ""}` },
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.error || data.message || "Failed to load medicines"
        );
      type RawMed = {
        name?: string;
        stock?: number;
        quantity?: number;
        id?: string;
        PK?: string;
        updatedAt?: string;
        timestamp?: string;
        threshold?: number;
        lastReorderDate?: string;
      };
      const raw = data.medicines || ([] as RawMed[]);
      const mapped = (raw || []).map((i: RawMed) => {
        const qty = Number(i.stock ?? i.quantity ?? 0);
        return {
          id: i.id || i.PK || i.name,
          name: i.name || "",
          quantity: qty,
          threshold: i.threshold ?? 40,
          needsReplenishment: qty < 20,
          lastReorderDate: i.updatedAt || i.timestamp || i.lastReorderDate,
        } as Medicine;
      });
      setMeds(mapped || []);
    } catch (err) {
      const error = err as PharmacyAPIError;
      toast({
        title: "Failed",
        description: error.message || "Failed to load medicines",
        variant: "destructive",
      });
    }
  }, [toast]);

  const requestReplenish = useCallback(
    async (medName: string) => {
      try {
        const token = localStorage.getItem("token");
        const body = { medName, suggestedAmount: 100 };
        const res = await fetch(`${API_BASE}/pharmacy/reorders`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token || ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to request reorder");
        toast({
          title: "Requested",
          description: `Reorder created for ${medName}`,
        });
        await loadMeds();
      } catch (err) {
        const error = err as PharmacyAPIError;
        toast({
          title: "Failed",
          description: error.message || "Failed to request reorder",
          variant: "destructive",
        });
      }
    },
    [loadMeds, toast]
  );

  useEffect(() => {
    void loadMeds();
  }, [loadMeds]);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Pharmacy Inventory</h2>
      <Card>
        <CardHeader>
          <CardTitle>Medicines</CardTitle>
          <CardDescription>Current stock levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meds.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.name}</TableCell>
                    <TableCell>{m.quantity}</TableCell>
                    <TableCell>
                      {m.needsReplenishment ? "Requires replenishing" : "OK"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => requestReplenish(m.name)}
                      >
                        Request Replenishment
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!meds.length && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-sm text-muted-foreground"
                    >
                      No medicines found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
