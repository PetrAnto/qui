'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { ReportReason, ReportTargetType } from '@indenoi/core';

import { api } from '../lib/client';
import { REPORT_REASONS, REPORT_REASON_LABELS } from '../lib/kinds';

/**
 * Block and report, on every piece of content and every profile.
 *
 * Two deliberate choices here. Blocking is described as mutual and permanent
 * for both directions, because that is what it does — the domain layer closes
 * shared threads and every read path projects around the edge. And reporting
 * confirms receipt and nothing else: no case id, no status, no "we removed it",
 * because the reported person must never be able to learn what was said about
 * them (INV-MOD-1).
 */
export function SafetyMenu({
  targetType,
  targetId,
  personId,
  personName,
}: {
  targetType: ReportTargetType;
  targetId: string;
  personId?: string;
  personName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('harassment');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function report(): Promise<void> {
    setBusy(true);
    const result = await api.post('/api/reports', { targetType, targetId, reason, note });
    setBusy(false);
    setStatus(
      result.ok
        ? 'Sent to moderation. You will not hear back through this screen, and they will never know it was you.'
        : result.message,
    );
    setNote('');
  }

  async function block(): Promise<void> {
    if (personId === undefined) return;
    setBusy(true);
    const result = await api.post('/api/blocks', { targetId: personId });
    setBusy(false);
    if (!result.ok) {
      setStatus(result.message);
      return;
    }
    setStatus('Blocked. You are now invisible to each other, and any shared thread is closed.');
    router.refresh();
  }

  return (
    <div className="stack stack--tight">
      <button
        type="button"
        className="btn btn--small btn--ghost"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'Close' : 'Report or block'}
      </button>

      {open ? (
        <div className="card card--pad stack stack--tight">
          <label className="field">
            <span>What is wrong here?</span>
            <select
              className="select"
              value={reason}
              onChange={(event) => setReason(event.target.value as ReportReason)}
            >
              {REPORT_REASONS.map((value) => (
                <option key={value} value={value}>
                  {REPORT_REASON_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Anything a moderator should know (optional)</span>
            <textarea
              className="textarea"
              value={note}
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <button type="button" className="btn btn--block" disabled={busy} onClick={() => void report()}>
            Send to moderation
          </button>
          {personId !== undefined ? (
            <button
              type="button"
              className="btn btn--block btn--danger"
              disabled={busy}
              onClick={() => void block()}
            >
              Block {personName ?? 'this person'}
            </button>
          ) : null}
          <p className="faint">
            A block works in both directions and closes any conversation you share. A report goes to
            moderation only; hosts are not moderators.
          </p>
          {status !== null ? <p className="notice">{status}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
