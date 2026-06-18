import { useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Card, CardBody, CardFooter, Button, Spinner } from '@heroui/react';
import { Calendar, Tag, ExternalLink } from 'lucide-react';
import { PageHeader, useToast } from '@spookydecs/ui';
import { getAllCosts } from '../api/financeApi';
import { formatCurrency, formatDate, type CostRecord } from '../config/financeConfig';

const BATCH_SIZE = 20;

interface Receipt {
  image_id: string;
  cloudfront_url?: string;
  cost_id: string;
  vendor?: string;
  created_at?: string;
}

export default function ReceiptsPage() {
  const toast = useToast();
  const [costsMap, setCostsMap] = useState<Record<string, CostRecord>>({});
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [displayedCount, setDisplayedCount] = useState(BATCH_SIZE);
  const [loading, setLoading] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const response = await getAllCosts();
        const costs: CostRecord[] = Array.isArray(response) ? response : response.costs || [];

        const map: Record<string, CostRecord> = {};
        costs.forEach((c) => {
          if (c.cost_id) map[c.cost_id] = c;
        });
        setCostsMap(map);

        const extracted: Receipt[] = costs
          .filter((cost) => (cost as any).receipt_data?.image_id)
          .map((cost) => {
            const rd = (cost as any).receipt_data;
            return {
              image_id: rd.image_id,
              cloudfront_url: rd.cloudfront_url || rd.image_url,
              cost_id: cost.cost_id,
              vendor: cost.vendor,
              created_at: (cost.cost_date as string) || (cost as any).created_at,
            };
          })
          .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

        setReceipts(extracted);
      } catch (err: any) {
        console.error('Failed to load receipts:', err);
        toast.showError('Failed to load receipts: ' + err.message);
        setReceipts([]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = useMemo(() => receipts.slice(0, displayedCount), [receipts, displayedCount]);
  const hasMore = displayedCount < receipts.length;

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setDisplayedCount((c) => c + BATCH_SIZE);
        });
      },
      { rootMargin: '100px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, shown.length]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="Loading receipts…" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Receipts"
        subtitle={`${receipts.length} receipt${receipts.length !== 1 ? 's' : ''}`}
      />
      {receipts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-default-500">
          <span className="text-4xl">📄</span>
          <p>No receipts available</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((receipt) => {
              const cost = costsMap[receipt.cost_id] || ({} as CostRecord);
              const vendor = cost.vendor || receipt.vendor || 'Unknown Vendor';
              const amount = cost.total_cost ? formatCurrency(cost.total_cost as number) : 'N/A';
              const date = receipt.created_at ? formatDate(receipt.created_at) : 'N/A';
              const itemName = cost.item_name || 'N/A';
              const receiptUrl = receipt.cloudfront_url;
              return (
                <Card key={receipt.image_id} shadow="sm" className="bg-content1">
                  <CardBody className="gap-3">
                    <div className="flex items-start justify-between">
                      <span className="font-semibold text-foreground">{vendor}</span>
                      <span className="font-semibold text-foreground">{amount}</span>
                    </div>
                    <div className="flex flex-col gap-1 text-small text-default-500">
                      <span className="flex items-center gap-2">
                        <Calendar size={14} /> {date}
                      </span>
                      <span className="flex items-center gap-2">
                        <Tag size={14} /> {itemName}
                      </span>
                    </div>
                  </CardBody>
                  <CardFooter className="gap-2">
                    {receiptUrl && (
                      <Button
                        as="a"
                        href={receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="sm"
                        variant="flat"
                        endContent={<ExternalLink size={14} />}
                      >
                        View Receipt
                      </Button>
                    )}
                    {receipt.cost_id && (
                      <Button
                        as={RouterLink}
                        to={`/costs/${receipt.cost_id}`}
                        size="sm"
                        variant="flat"
                        color="secondary"
                      >
                        View Cost Record
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
          {hasMore && <div ref={sentinelRef} className="h-10" />}
        </>
      )}
    </div>
  );
}
