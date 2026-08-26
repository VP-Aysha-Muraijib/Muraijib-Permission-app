'use client';

import * as React from 'react';
import type { ChangeSet, Op } from '@/lib/domain/types';
import type { ValidationResult } from '@/lib/engine/validator';
import type { RepairProposal } from '@/lib/engine/repair';
import { runAgent, type AgentResult } from '@/lib/agent/runtime';
import { useSchedule } from '@/lib/state/schedule-provider';
import { Badge, Button, Card, Input } from '@/components/ui';
import { PageHeader } from '@/components/layout/page-header';
import { Icon } from '@/components/layout/icon';
import { ChangePreviewDialog } from '@/components/timetable/change-preview';
import { cn } from '@/lib/utils';

interface Turn {
  id: string;
  question: string;
  result: AgentResult;
}

const STARTERS = [
  'ابحث عن تعارضات',
  'ما درجة جودة الجدول؟',
  'أظهر المعلمات الأقل نصابًا',
  'من يمكنها أخذ حصتين إضافيتين؟',
  'أعد توزيع الجدول بأقل عدد ممكن من التغييرات',
];

export default function AgentPage() {
  const { snapshot, index, preview, makeChangeSet, apply } = useSchedule();
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [input, setInput] = React.useState('');
  const [thinking, setThinking] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  const [pending, setPending] = React.useState<{
    changeSet: ChangeSet;
    validation: ValidationResult;
    titleAr: string;
    subtitleAr?: string;
  } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns, thinking]);

  if (!snapshot || !index) return null;

  const ask = (question: string) => {
    const text = question.trim();
    if (!text) return;
    setInput('');
    setThinking(true);
    // تأخير قصير مقصود: التحليل فوري، لكن ظهور النتيجة قبل قراءة السؤال مربك.
    setTimeout(() => {
      const result = runAgent(text, snapshot);
      setTurns((prev) => [...prev, { id: `${Date.now()}`, question: text, result }]);
      setThinking(false);
    }, 220);
  };

  const openPreview = (ops: Op[], titleAr: string, subtitleAr?: string) => {
    setError(null);
    const validation = preview(ops);
    const changeSet = makeChangeSet({
      ops,
      summaryAr: titleAr,
      reason: 'مقترح من مساعد الجدول الذكي',
      source: 'agent',
    });
    if (!validation || !changeSet) return;
    setPending({ changeSet, validation, titleAr, subtitleAr });
  };

  const approve = async () => {
    if (!pending) return;
    setBusy(true);
    const result = await apply(pending.changeSet);
    setBusy(false);
    if (result.ok) {
      setPending(null);
      setTurns((prev) => [
        ...prev,
        {
          id: `${Date.now()}-applied`,
          question: '—',
          result: {
            intent: 'help',
            titleAr: 'تم اعتماد التغيير',
            stepsAr: [],
            summaryAr: `اعتُمد «${pending.titleAr}». أُنشئت نسخة جديدة من الجدول وسُجّل التغيير في سجل التغييرات.`,
            facts: [],
            constraintsAr: [],
            followUpsAr: ['ابحث عن تعارضات', 'ما درجة جودة الجدول؟'],
          },
        },
      ]);
    } else {
      setError(result.errorAr ?? 'تعذّر اعتماد التغيير.');
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="مساعد الجدول الذكي"
        description="اكتب طلبك بلغتك الطبيعية. المساعد يحلّل ويقترح ويشرح — ولا يعدّل الجدول إطلاقًا قبل معاينتك وموافقتك."
      />

      {turns.length === 0 && (
        <Card className="mb-4 px-5 py-6">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand">
              <Icon name="Sparkles" className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink">كيف أساعدك في الجدول؟</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                أفهم انتقال المعلمات وتغيّر الأنصبة وإعادة التوزيع الجزئي. يمكنك أيضًا تقييد طلبك، مثل:
                «دون تغيير جداول الصف الثامن» أو «بأقل عدد ممكن من التغييرات».
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    onClick={() => ask(starter)}
                    className="rounded-full border border-line px-3 py-1.5 text-2xs text-ink-muted transition-colors hover:border-brand-soft hover:bg-brand-tint hover:text-brand-ink"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {turns.map((turn) => (
          <div key={turn.id}>
            {turn.question !== '—' && (
              <div className="mb-2 flex justify-start">
                <p className="max-w-[85%] rounded-lg rounded-tr-sm bg-brand px-3.5 py-2 text-xs leading-relaxed text-ink-invert">
                  {turn.question}
                </p>
              </div>
            )}
            <AgentAnswer result={turn.result} onAsk={ask} onPreview={openPreview} />
          </div>
        ))}

        {thinking && (
          <Card className="px-5 py-4">
            <p className="flex items-center gap-2 text-xs text-ink-muted">
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
              أحلّل الجدول والأنصبة والقيود…
            </p>
          </Card>
        )}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 mt-4 border-t border-line bg-canvas pb-2 pt-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="مثال: انتقلت معلمة 3 من المدرسة، أوجد أفضل حل دون تغيير جداول الصف الثامن"
            className="h-11"
          />
          <Button type="submit" variant="primary" size="lg" disabled={!input.trim()}>
            <Icon name="Send" className="h-4 w-4" />
            إرسال
          </Button>
        </form>
        <p className="mt-1.5 text-2xs text-ink-faint">
          المساعد لا يملك صلاحية الكتابة. كل مقترح يمرّ بمعاينة وتحقق من القيود قبل الاعتماد.
        </p>
      </div>

      <ChangePreviewDialog
        open={Boolean(pending)}
        onClose={() => {
          setPending(null);
          setError(null);
        }}
        onApprove={approve}
        index={index}
        validation={pending?.validation ?? null}
        changeSet={pending?.changeSet ?? null}
        titleAr={pending?.titleAr ?? ''}
        subtitleAr={pending?.subtitleAr}
        busy={busy}
        errorAr={error}
      />
    </div>
  );
}

/* ────────── عرض إجابة المساعد ────────── */

function AgentAnswer({
  result,
  onAsk,
  onPreview,
}: {
  result: AgentResult;
  onAsk: (q: string) => void;
  onPreview: (ops: Op[], titleAr: string, subtitleAr?: string) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3 px-5 py-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand">
          <Icon name="Sparkles" className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">{result.titleAr}</p>

          {result.needsClarificationAr ? (
            <p className="mt-2 rounded border border-warn/25 bg-warn-soft px-3 py-2 text-xs leading-relaxed text-warn">
              {result.needsClarificationAr}
            </p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">{result.summaryAr}</p>
          )}

          {result.constraintsAr.length > 0 && (
            <div className="mt-2.5 rounded border border-brand/20 bg-brand-tint px-3 py-2">
              <p className="text-2xs font-semibold text-brand-ink">القيود التي فهمتها من طلبك</p>
              <ul className="mt-1 space-y-0.5">
                {result.constraintsAr.map((constraint, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-2xs leading-relaxed text-brand-ink">
                    <Icon name="Check" className="mt-0.5 h-3 w-3 shrink-0" />
                    {constraint}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.stepsAr.length > 0 && (
            <details className="mt-2.5" open>
              <summary className="cursor-pointer text-2xs font-medium text-ink-muted hover:text-ink">
                خطوات التحليل ({result.stepsAr.length})
              </summary>
              <ol className="mt-1.5 space-y-1">
                {result.stepsAr.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-2xs leading-relaxed text-ink-muted">
                    <span className="tabular mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-[9px] font-bold">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </details>
          )}
        </div>
      </div>

      {result.facts.length > 0 && (
        <div className="grid grid-cols-2 gap-px border-y border-line bg-line sm:grid-cols-4">
          {result.facts.map((fact, i) => (
            <div key={i} className="bg-surface px-3 py-2.5">
              <p className="text-2xs text-ink-muted">{fact.labelAr}</p>
              <p
                className={cn(
                  'tabular mt-0.5 text-lg font-bold leading-none',
                  fact.tone === 'danger' && 'text-danger',
                  fact.tone === 'warn' && 'text-warn',
                  fact.tone === 'ok' && 'text-ok',
                )}
              >
                {fact.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {result.table && (
        <div className="max-h-72 overflow-auto border-b border-line">
          <table className="w-full border-collapse text-right">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-line">
                {result.table.headers.map((header) => (
                  <th key={header} className="table-head px-4 py-2">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.table.rows.map((row, i) => (
                <tr
                  key={i}
                  className={cn(
                    'border-b border-line last:border-0',
                    row.tone === 'danger' && 'bg-danger-soft/40',
                    row.tone === 'warn' && 'bg-warn-soft/40',
                  )}
                >
                  {row.cells.map((cell, k) => (
                    <td
                      key={k}
                      className={cn(
                        'px-4 py-2 text-xs leading-relaxed text-ink',
                        typeof cell === 'number' && 'tabular text-left',
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.directOps && (
        <div className="border-b border-line px-5 py-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onPreview(result.directOps!.ops, result.directOps!.summaryAr)}
          >
            <Icon name="Eye" className="h-3.5 w-3.5" />
            معاينة التغيير قبل الاعتماد
          </Button>
        </div>
      )}

      {result.proposals && result.proposals.length > 0 && (
        <div className="space-y-2 border-b border-line bg-surface-sunken/50 px-5 py-4">
          <p className="text-xs font-bold text-ink">الحلول المقترحة ({result.proposals.length})</p>
          {result.proposals.map((proposal, i) => (
            <ProposalCard key={i} proposal={proposal} rank={i} onPreview={onPreview} />
          ))}
        </div>
      )}

      {result.followUpsAr.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-5 py-3">
          {result.followUpsAr.map((followUp) => (
            <button
              key={followUp}
              onClick={() => onAsk(followUp)}
              className="rounded-full border border-line px-3 py-1 text-2xs text-ink-muted transition-colors hover:border-brand-soft hover:bg-brand-tint hover:text-brand-ink"
            >
              {followUp}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

function ProposalCard({
  proposal,
  rank,
  onPreview,
}: {
  proposal: RepairProposal;
  rank: number;
  onPreview: (ops: Op[], titleAr: string, subtitleAr?: string) => void;
}) {
  const [showUnresolved, setShowUnresolved] = React.useState(false);
  const complete = proposal.unresolved.length === 0;

  return (
    <div
      className={cn(
        'rounded-lg border bg-surface px-4 py-3',
        rank === 0 ? 'border-brand-soft ring-1 ring-brand-tint' : 'border-line',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-bold text-ink">
            {proposal.titleAr}
            {rank === 0 && <Badge tone="brand">الأفضل</Badge>}
          </p>
          <p className="mt-0.5 text-2xs leading-relaxed text-ink-muted">{proposal.subtitleAr}</p>
        </div>
        <Button
          size="sm"
          variant={rank === 0 ? 'primary' : 'secondary'}
          onClick={() =>
            onPreview(proposal.changeSet.ops, proposal.titleAr, proposal.subtitleAr)
          }
          disabled={proposal.changeSet.ops.length === 0}
        >
          <Icon name="Eye" className="h-3.5 w-3.5" />
          معاينة
        </Button>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="حصص ستتغيّر" value={proposal.lessonsChanged} />
        <Metric
          label="حصص عولجت"
          value={`${proposal.resolvedCount} / ${proposal.resolvedCount + proposal.unresolved.length}`}
          tone={complete ? 'ok' : 'warn'}
        />
        <Metric label="درجة الجودة" value={proposal.score} />
        <Metric
          label="فرق الدرجة"
          value={`${proposal.impact.scoreAfter - proposal.impact.scoreBefore > 0 ? '+' : ''}${proposal.impact.scoreAfter - proposal.impact.scoreBefore}`}
          tone={proposal.impact.scoreAfter >= proposal.impact.scoreBefore ? 'ok' : 'danger'}
        />
      </div>

      {proposal.unresolved.length > 0 && (
        <div className="mt-2.5">
          <button
            onClick={() => setShowUnresolved((v) => !v)}
            className="text-2xs font-medium text-warn hover:underline"
          >
            {proposal.unresolved.length} حصة بلا حل — اعرض السبب
          </button>
          {showUnresolved && (
            <ul className="mt-1.5 space-y-1">
              {proposal.unresolved.slice(0, 6).map((item, i) => (
                <li key={i} className="rounded border border-warn/20 bg-warn-soft px-2.5 py-1.5 text-2xs leading-relaxed text-warn">
                  {item.reasonAr}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'ok' | 'warn' | 'danger';
}) {
  return (
    <div className="rounded border border-line px-2.5 py-1.5">
      <p className="text-2xs text-ink-muted">{label}</p>
      <p
        className={cn(
          'tabular mt-0.5 text-sm font-bold leading-none',
          tone === 'ok' && 'text-ok',
          tone === 'warn' && 'text-warn',
          tone === 'danger' && 'text-danger',
        )}
      >
        {value}
      </p>
    </div>
  );
}
