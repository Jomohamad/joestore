import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { statusClass } from './helpers';

export function AdminCard(props: { title: string; value: ReactNode; subtitle?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <p className="text-xs uppercase tracking-[0.15em] text-slate-400">{props.title}</p>
      <p className="mt-2 text-2xl font-bold text-white">{props.value}</p>
      {props.subtitle ? <p className="mt-1 text-xs text-slate-400">{props.subtitle}</p> : null}
    </div>
  );
}

export function Panel(props: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{props.title}</h3>
          {props.subtitle ? <p className="text-sm text-slate-400">{props.subtitle}</p> : null}
        </div>
        {props.actions ? <div className="flex flex-wrap gap-2">{props.actions}</div> : null}
      </div>
      {props.children}
    </section>
  );
}

export function StatusPill(props: { status: unknown }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(props.status)}`}>{String(props.status || '-')}</span>;
}

export function JsonModal(props: {
  open: boolean;
  title: string;
  body: string;
  onClose: () => void;
}) {
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h4 className="text-base font-semibold text-white">{props.title}</h4>
          <button onClick={props.onClose} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800">
            Close
          </button>
        </div>
        <div className="max-h-[70vh] overflow-auto p-5">
          <pre className="whitespace-pre-wrap break-words text-xs text-slate-200">{props.body}</pre>
        </div>
      </div>
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400 ${props.className || ''}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400 ${props.className || ''}`} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400 ${props.className || ''}`} />;
}

export function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 min-h-11 disabled:cursor-not-allowed disabled:opacity-50 ${props.className || ''}`} />;
}

export function SecondaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800 min-h-11 disabled:cursor-not-allowed disabled:opacity-50 ${props.className || ''}`} />;
}

export function DangerButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400 min-h-11 disabled:cursor-not-allowed disabled:opacity-50 ${props.className || ''}`} />;
}
