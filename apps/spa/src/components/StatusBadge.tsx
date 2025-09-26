export default function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toUpperCase();
  const color = s === 'COMPLETE'
    ? 'bg-green-100 text-green-800'
    : s === 'PROCESSING'
    ? 'bg-yellow-100 text-yellow-800'
    : s === 'FAILED'
    ? 'bg-red-100 text-red-800'
    : 'bg-gray-100 text-gray-800';
  return <span className={`inline-block px-2 py-1 text-xs rounded ${color}`}>{s}</span>;
}

