import { createFileRoute } from '@tanstack/react-router';
import { Download } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/primitives';
import { Pill, ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { INVOICES, formatDate, type Invoice } from '@/lib/mock-resources';
import { formatUsd } from '@/lib/mock-data';

export const Route = createFileRoute('/dashboard/invoices')({ component: InvoicesPage });

const STATUS_COLOR: Record<Invoice['status'], string | undefined> = {
  paid: 'var(--status-good)',
  open: 'var(--status-warning)',
  void: undefined,
};

const COLUMNS: Column<Invoice>[] = [
  {
    key: 'number',
    label: 'Invoice',
    render: (i) => <span className="font-mono">{i.number}</span>,
  },
  {
    key: 'status',
    label: 'Status',
    width: 'w-24',
    render: (i) => <Pill label={i.status} color={STATUS_COLOR[i.status]} />,
  },
  {
    key: 'periodStart',
    label: 'Period',
    render: (i) => (
      <span className="text-muted-foreground">
        {formatDate(i.periodStart)} – {formatDate(i.periodEnd)}
      </span>
    ),
  },
  { key: 'issuedAt', label: 'Issued', numeric: true, render: (i) => formatDate(i.issuedAt) },
  {
    key: 'amountUsd',
    label: 'Amount',
    numeric: true,
    render: (i) => <span className="font-medium">{formatUsd(i.amountUsd)}</span>,
  },
  {
    key: 'id',
    label: '',
    sortable: false,
    numeric: true,
    width: 'w-16',
    render: () => (
      <span className="inline-flex text-muted-foreground transition-colors hover:text-foreground">
        <Download className="h-3.5 w-3.5" />
      </span>
    ),
  },
];

function InvoicesPage() {
  const outstanding = INVOICES.filter((i) => i.status === 'open').reduce(
    (a, i) => a + i.amountUsd,
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Invoices"
        description={
          outstanding > 0
            ? `${formatUsd(outstanding)} outstanding on the current period.`
            : 'All invoices settled.'
        }
      />
      <ResourceTable
        rows={INVOICES}
        columns={COLUMNS}
        initialSort={{ key: 'issuedAt', dir: 'desc' }}
        searchKeys={['number']}
        searchPlaceholder="Filter by invoice number…"
        emptyMessage="No invoices match these filters."
        minWidth="min-w-[720px]"
      />
    </div>
  );
}
