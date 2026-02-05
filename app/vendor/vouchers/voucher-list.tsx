'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Deal {
  id: string;
  title: string;
  createdAt: Date;
}

interface Voucher {
  id: string;
  qrToken: string;
  status: string;
  issuedAt: Date;
  redeemedAt: Date | null;
  deal: { title: string };
}

interface Business {
  id: string;
  name: string;
  monthlyVoucherAllowance: number | null;
  deals: Deal[];
  vouchers: Voucher[];
}

interface Props {
  business: Business;
  vouchersIssuedThisMonth: number;
}

export default function VoucherList({ business, vouchersIssuedThisMonth }: Props) {
  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Vouchers are issued through the customer purchase flow and then redeemed by your staff. Vendors do not manually issue vouchers.
      </div>

      {/* Voucher List Section */}
      <Card className="shadow-soft border-0">
        <CardHeader>
          <CardTitle className="font-heading">Recent Vouchers</CardTitle>
        </CardHeader>
        <CardContent>
          {business.vouchers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No vouchers issued yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>QR Code</TableHead>
                    <TableHead>Deal</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Issued</TableHead>
                    <TableHead className="text-center">Redeemed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {business.vouchers.map((voucher) => (
                    <TableRow key={voucher.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {voucher.qrToken.slice(0, 12)}...
                      </TableCell>
                      <TableCell className="text-sm">{voucher.deal.title}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={voucher.status === 'ISSUED' ? 'secondary' : 'default'}
                          className={
                            voucher.status === 'ISSUED'
                              ? 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                              : 'bg-green-100 text-green-700 hover:bg-green-100'
                          }
                        >
                          {voucher.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {new Date(voucher.issuedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {voucher.redeemedAt
                          ? new Date(voucher.redeemedAt).toLocaleDateString()
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
