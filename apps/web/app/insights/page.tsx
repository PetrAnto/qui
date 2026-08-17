import { redirect } from 'next/navigation';

import { getInsights } from '@indenoi/core';

import { SIGNAL_LABELS } from '../../lib/format';
import { currentUserId } from '../../lib/session';
import { ports } from '../../lib/store';

export const dynamic = 'force-dynamic';

function bar(value: number, max: number): string {
  return `${Math.max(2, Math.round((value / Math.max(max, 1)) * 100))}%`;
}

/**
 * Internal insights.
 *
 * The question is "where is this starting to work", and the answer has to be
 * allowed to be a small town. The activation score weights conversion —
 * responses, threads, people who actually turned up — far above impressions, so
 * a city with a lot of scrolling and no meetings scores badly, and does.
 *
 * Everything on this page is aggregate and comes from the closed analytics
 * shape (INV-ANALYTICS-1): no names, no handles, no free-form payload, no
 * time-spent. Gating it to an internal role in production is a release
 * checklist item.
 */
export default async function InsightsPage() {
  if ((await currentUserId()) === null) redirect('/welcome');

  const insights = await getInsights(ports());
  const { report, scopeNames, totals } = insights;
  const topScore = report.cities[0]?.activationScore ?? 1;

  return (
    <>
      <header className="pagehead">
        <h1>Where is this working?</h1>
        <p className="pagehead__sub">
          Internal view. Aggregate only — this page has no way to name anybody, because the event
          shape it reads has no field for it.
        </p>
      </header>

      <p className="notice notice--warn">
        Synthetic history over six days of invented usage. The shape is the point, not the volume.
      </p>

      <section className="card card--pad stack stack--tight">
        <h2>Totals</h2>
        <div className="row row--wrap">
          <span className="chip">{totals.people} people</span>
          <span className="chip">{totals.posts} posts</span>
          <span className="chip">{totals.signals} signals</span>
          <span className="chip">{totals.threads} threads</span>
          <span className="chip">{totals.events} events</span>
        </div>
      </section>

      <section className="card card--pad stack stack--tight">
        <h2>Cities by activation</h2>
        <table className="table">
          <thead>
            <tr>
              <th>City</th>
              <th>Active</th>
              <th>Threads</th>
              <th>Real</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {report.cities.map((row) => (
              <tr key={row.key}>
                <td>
                  {scopeNames[row.geoScopeId] ?? row.geoScopeId}
                  <div className="bar" style={{ width: bar(row.activationScore, topScore) }} />
                </td>
                <td>{row.activeUsers}</td>
                <td>{row.threadsStarted}</td>
                <td>{row.localOutcomes}</td>
                <td>{row.activationScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="faint">
          &ldquo;Real&rdquo; is a self-reported real-world meeting. It is the only number here that
          says the product did its job.
        </p>
      </section>

      <section className="card card--pad stack stack--tight">
        <h2>City × practice</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Cluster</th>
              <th>Active</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {report.cityPractices.slice(0, 12).map((row) => (
              <tr key={row.key}>
                <td>
                  {scopeNames[row.geoScopeId] ?? row.geoScopeId} · {row.practice}
                </td>
                <td>{row.activeUsers}</td>
                <td>{row.activationScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card card--pad stack stack--tight">
        <h2>City × signal type</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Cluster</th>
              <th>Responses</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {report.citySignalTypes.slice(0, 12).map((row) => (
              <tr key={row.key}>
                <td>
                  {scopeNames[row.geoScopeId] ?? row.geoScopeId} ·{' '}
                  {row.signalType === null ? '—' : SIGNAL_LABELS[row.signalType]}
                </td>
                <td>{row.signalResponses}</td>
                <td>{row.activationScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
