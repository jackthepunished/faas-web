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

/** Client-side export of the row — the mock has no PDF to serve. */
function downloadInvoice(invoice: Invoice) {
  const rows = [
    ['invoice', 'status', 'period_start', 'period_end', 'issued_at', 'amount_usd'],
    [
      invoice.number,
      invoice.status,
      new Date(invoice.periodStart).toISOString().slice(0, 10),
      new Date(invoice.periodEnd).toISOString().slice(0, 10),
      new Date(invoice.issuedAt).toISOString().slice(0, 10),
      invoice.amountUsd.toFixed(2),
    ],
  ];
  const csv = rows.map((r) => r.join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${invoice.number}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

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
    render: (i) => (
      <button
        type="button"
        aria-label={`Download invoice ${i.number}`}
        onClick={() => downloadInvoice(i)}
        className="inline-flex rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <Download className="h-3.5 w-3.5" />
      </button>
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
