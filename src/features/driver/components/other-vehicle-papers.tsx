import { useState } from 'react';

import { AppPressable, AppText, AppView } from '@/components/ui';
import {
  VehicleDocumentSheet,
  type VehicleDocumentSubmission,
  type VehicleDocumentType,
} from '@/features/fleet/components/vehicle-document-sheet';

export interface PaperInfo {
  type: string;
  status: string;
  /** ISO date, when the document has one. */
  expiryDate: string | null;
}

const PERMITS: VehicleDocumentType[] = ['STATE_PERMIT', 'NATIONAL_PERMIT'];
const PERMIT_CHOICES = [
  { type: 'STATE_PERMIT' as const, label: 'State permit' },
  { type: 'NATIONAL_PERMIT' as const, label: 'National permit' },
];

function formDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** What to show for a paper, and whether it can be sent (again). */
function paperState(doc: PaperInfo | undefined) {
  const today = new Date().toISOString().slice(0, 10);
  if (!doc) return { label: 'Not uploaded', tone: 'wait', canSend: true };
  if (doc.expiryDate && doc.expiryDate < today) {
    return { label: 'Expired', tone: 'bad', canSend: true };
  }
  if (doc.status === 'VERIFIED') return { label: 'Verified', tone: 'good', canSend: false };
  if (['FAILED', 'REJECTED', 'RESUBMISSION_REQUIRED', 'EXPIRED'].includes(doc.status)) {
    return { label: 'Refused', tone: 'bad', canSend: true };
  }
  if (doc.status === 'PENDING') return { label: 'Not sent', tone: 'wait', canSend: true };
  return { label: 'In review', tone: 'wait', canSend: false };
}

const TONE: Record<string, string> = {
  good: 'text-emerald-700 dark:text-emerald-400',
  bad: 'text-red-600',
  wait: 'text-amber-700 dark:text-amber-400',
};

/**
 * Fitness certificate and permit: papers only some vehicles need (by vehicle type, or fitness for
 * a vehicle over 15 years). Shows a row for each one that is needed or already uploaded, with an
 * upload button while it is missing, refused or expired. Nothing when neither applies.
 */
export function OtherVehiclePapers({
  needFitness,
  needPermit,
  papers,
  submitting,
  note,
  onSubmit,
}: {
  needFitness: boolean;
  needPermit: boolean;
  papers: PaperInfo[];
  submitting: boolean;
  /** Line under the upload sheet's title. */
  note: string;
  /** Resolves once sent; the sheet then closes. */
  onSubmit: (submission: VehicleDocumentSubmission) => Promise<boolean>;
}) {
  const [open, setOpen] = useState<'FITNESS' | 'PERMIT' | null>(null);
  const fitness = papers.find((p) => p.type === 'FITNESS');
  const permit = papers.find((p) => PERMITS.includes(p.type as VehicleDocumentType));

  const rows = [
    ...(needFitness || fitness
      ? [{ key: 'FITNESS' as const, label: 'Fitness certificate', doc: fitness }]
      : []),
    ...(needPermit || permit
      ? [
          {
            key: 'PERMIT' as const,
            label: permit?.type === 'NATIONAL_PERMIT' ? 'National permit' : 'Permit',
            doc: permit,
          },
        ]
      : []),
  ];
  if (rows.length === 0) return null;

  return (
    <AppView className="gap-2.5">
      <AppText className="px-1 text-[16px] font-extrabold text-foreground">Other papers</AppText>
      <AppView className="overflow-hidden rounded-3xl border border-border bg-card">
        {rows.map((row, index) => {
          const state = paperState(row.doc);
          return (
            <AppView
              key={row.key}
              row
              className={`items-center justify-between p-4 ${
                index < rows.length - 1 ? 'border-b border-border/60' : ''
              }`}
            >
              <AppView className="flex-1">
                <AppText className="text-[15px] font-bold text-foreground">{row.label}</AppText>
                {row.doc?.expiryDate ? (
                  <AppText className="text-[12px] text-muted">
                    Valid till {formDate(row.doc.expiryDate)}
                  </AppText>
                ) : null}
              </AppView>
              <AppView className="items-end gap-1.5">
                <AppText className={`text-[12px] font-bold ${TONE[state.tone]}`}>
                  {state.label}
                </AppText>
                {state.canSend ? (
                  <AppPressable
                    onPress={() => setOpen(row.key)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Upload ${row.label.toLowerCase()}`}
                  >
                    <AppText className="text-[13px] font-bold text-[#FF5722]">
                      {row.doc ? 'Upload again' : 'Upload'}
                    </AppText>
                  </AppPressable>
                ) : null}
              </AppView>
            </AppView>
          );
        })}
      </AppView>

      {open ? (
        <VehicleDocumentSheet
          visible
          type={
            open === 'FITNESS'
              ? 'FITNESS'
              : ((permit?.type as VehicleDocumentType | undefined) ?? 'STATE_PERMIT')
          }
          title={open === 'FITNESS' ? 'Fitness certificate' : 'Permit'}
          choices={open === 'PERMIT' ? PERMIT_CHOICES : undefined}
          note={note}
          submitting={submitting}
          onSubmit={async (submission) => {
            if (await onSubmit(submission)) setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </AppView>
  );
}
