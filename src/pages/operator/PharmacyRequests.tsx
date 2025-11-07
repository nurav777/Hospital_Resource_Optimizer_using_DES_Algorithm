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
import { MedicineReorder, PharmacyAPIError } from "@/types/pharmacy";

const API_BASE = "http://localhost:5000";

export default function PharmacyRequests() {
  const { toast } = useToast();
  const [reorders, setReorders] = useState<MedicineReorder[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [amountOrdered, setAmountOrdered] = useState<number>(100);
  const [isApproving, setIsApproving] = useState<boolean>(false);

  const loadReorders = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/pharmacy/reorders?status=pending`, {
        headers: { Authorization: `Bearer ${token || ""}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load reorders");
      setReorders(data.reorders || []);
    } catch (err) {
      const error = err as PharmacyAPIError;
      toast({
        title: "Failed",
        description: error.message || "Failed to load reorders",
        variant: "destructive",
      });
    }
  }, [toast]);

  const approve = useCallback(
    async (id: string) => {
      try {
        setIsApproving(true);
        const token = localStorage.getItem("token");
        const body = { amountOrdered, cost: "2" }; // Default cost of $2
        const res = await fetch(`${API_BASE}/pharmacy/reorders/${id}/approve`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token || ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to approve");

        // If backend returned receiptContent, download it as a .txt file
        if (data && data.receiptContent) {
          const blob = new Blob([data.receiptContent], {
            type: "text/plain;charset=utf-8",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `reorder_${id}.txt`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        }

        toast({ title: "Approved", description: `Reorder ${id} approved` });
        setSelectedId(null);
        await loadReorders();
      } catch (err) {
        const error = err as PharmacyAPIError;
        toast({
          title: "Failed",
          description: error.message || "Failed to approve reorder",
          variant: "destructive",
        });
      } finally {
        setIsApproving(false);
      }
    },
    [amountOrdered, loadReorders, toast]
  );

  useEffect(() => {
    loadReorders();
  }, [loadReorders]);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Pharmacy Requests (Operator)</h2>
      <Card>
        <CardHeader>
          <CardTitle>Pending Reorders</CardTitle>
          <CardDescription>Approve and generate receipts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reorders.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">{r.id}</TableCell>
                    <TableCell>{r.medName}</TableCell>
                    <TableCell>{r.requestedBy}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.requestedAt
                        ? new Date(r.requestedAt).toLocaleString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {selectedId === r.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min={1}
                            value={amountOrdered}
                            onChange={(e) =>
                              setAmountOrdered(Number(e.target.value))
                            }
                            className="border px-2 py-1 rounded w-24"
                            aria-label="amount-ordered"
                            placeholder="Amount"
                          />
                          <span className="text-sm text-muted-foreground px-2">
                            Cost: $2.00 (fixed)
                          </span>
                          <Button
                            size="sm"
                            onClick={() => approve(r.id)}
                            disabled={isApproving}
                          >
                            {isApproving ? "Approving..." : "Confirm"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedId(r.id);
                            setAmountOrdered(r.suggestedAmount || 100);
                            setCost("0");
                          }}
                        >
                          Approve & Receipt
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!reorders.length && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-sm text-muted-foreground"
                    >
                      No pending reorders
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
