import { AlertCircle, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { SipStatus } from '../types/sip';

interface StatusLabelProps {
  status: SipStatus;
  sisaHari: number;
}

export function StatusLabel({ status, sisaHari }: StatusLabelProps) {
  if (status === 'aman') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
        <span>Aman</span>
        <span className="text-emerald-300 font-normal" aria-hidden="true">·</span>
        <span className="font-mono font-medium tabular-nums">
          {sisaHari} hr
        </span>
      </span>
    );
  }

  if (status === 'peringatan') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800 whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" aria-hidden="true" />
        <span>Peringatan</span>
        <span className="text-amber-300 font-normal" aria-hidden="true">·</span>
        <span className="font-mono font-medium tabular-nums">
          {sisaHari} hr
        </span>
      </span>
    );
  }

  if (status === 'kritis') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 border border-red-200 text-xs font-semibold text-red-700 whitespace-nowrap">
        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" aria-hidden="true" />
        <span>Kritis</span>
        <span className="text-red-300 font-normal" aria-hidden="true">·</span>
        <span className="font-mono font-medium tabular-nums">
          {sisaHari} hr
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-900 border border-red-950 text-xs font-semibold text-white whitespace-nowrap">
      <XCircle className="w-3.5 h-3.5 shrink-0 text-red-200" aria-hidden="true" />
      <span>Kadaluarsa</span>
      <span className="text-red-300 font-normal" aria-hidden="true">·</span>
      <span className="font-mono font-medium tabular-nums">
        {sisaHari === 0 ? '0 hr' : `${sisaHari} hr`}
      </span>
    </span>
  );
}
