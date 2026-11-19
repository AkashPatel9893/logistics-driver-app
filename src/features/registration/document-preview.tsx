import { AppText, AppView, Icon } from '@/components/ui';

export type PreviewKind = 'dl' | 'pan' | 'aadhaar';

const BLUE = '#2563eb';

/** A placeholder text line on the drawn card. */
function Line({ width, dark = false }: { width: `${number}%`; dark?: boolean }) {
  return (
    <AppView
      style={{ width }}
      className={`h-[6px] rounded-full ${dark ? 'bg-black/25' : 'bg-black/10'}`}
    />
  );
}

/** The value the driver must type, outlined and tagged so it stands out on the card. */
function Highlight({
  label,
  value,
  big = false,
}: {
  label?: string;
  value: string;
  big?: boolean;
}) {
  return (
    <AppView className="self-start">
      <AppView
        row
        style={{ borderColor: BLUE }}
        className="gap-1.5 rounded-md border-2 bg-white/90 px-1.5 py-0.5"
      >
        {label ? (
          <AppText className="text-[9px] font-bold text-neutral-600">{label}</AppText>
        ) : null}
        <AppText
          className={`${big ? 'text-[15px] tracking-[2px]' : 'text-[11px] tracking-wide'} font-black text-neutral-900`}
        >
          {value}
        </AppText>
      </AppView>
    </AppView>
  );
}

function Photo() {
  return (
    <AppView className="h-[54px] w-[42px] items-center justify-center rounded-md border border-black/10 bg-black/5">
      <Icon name="person.fill" size={24} color="#9ca3af" />
    </AppView>
  );
}

function DrivingLicenceCard() {
  return (
    <AppView className="overflow-hidden rounded-xl border border-black/10 bg-[#F4F1E8]">
      <AppView className="bg-[#1E4F7A] px-3 py-1.5">
        <AppText className="text-[9px] font-black tracking-[1px] text-white">
          INDIAN UNION DRIVING LICENCE
        </AppText>
        <AppText className="text-[7px] font-semibold text-white/80">
          Issued by Transport Department
        </AppText>
      </AppView>
      <AppView className="gap-2 p-3">
        <Highlight label="DL No." value="KA05 20190012345" />
        <AppView row className="items-start gap-3">
          <Photo />
          <AppView className="flex-1 gap-1.5 pt-1">
            <Line width="70%" dark />
            <Line width="50%" />
            <Line width="60%" />
            <AppView row className="mt-1 items-center gap-1.5">
              <AppText className="text-[8px] font-bold text-neutral-500">Valid Till</AppText>
              <AppView
                style={{ borderColor: BLUE }}
                className="rounded border border-dashed px-1 py-px"
              >
                <AppText className="text-[9px] font-bold text-neutral-800">18-04-2039</AppText>
              </AppView>
            </AppView>
          </AppView>
        </AppView>
      </AppView>
    </AppView>
  );
}

function PanCard() {
  return (
    <AppView className="overflow-hidden rounded-xl border border-black/10 bg-[#DCEBF7]">
      <AppView row className="justify-between bg-[#5B8FC7]/25 px-3 py-1.5">
        <AppText className="text-[9px] font-black tracking-[1px] text-[#1E3A5F]">
          INCOME TAX DEPARTMENT
        </AppText>
        <AppText className="text-[8px] font-bold text-[#1E3A5F]">GOVT. OF INDIA</AppText>
      </AppView>
      <AppView row className="items-start gap-3 p-3">
        <AppView className="flex-1 gap-1.5">
          <Line width="75%" dark />
          <Line width="60%" />
          <Line width="40%" />
          <AppText className="mt-1 text-[8px] font-semibold text-neutral-600">
            Permanent Account Number Card
          </AppText>
          <Highlight value="ABCDE1234F" big />
        </AppView>
        <Photo />
      </AppView>
    </AppView>
  );
}

function AadhaarCard() {
  return (
    <AppView className="overflow-hidden rounded-xl border border-black/10 bg-white">
      <AppView className="h-[5px] bg-[#F59E0B]" />
      <AppView className="items-center py-1">
        <AppText className="text-[9px] font-black tracking-[1px] text-neutral-700">
          GOVERNMENT OF INDIA
        </AppText>
      </AppView>
      <AppView row className="items-start gap-3 px-3">
        <Photo />
        <AppView className="flex-1 gap-1.5 pt-1">
          <Line width="70%" dark />
          <Line width="45%" />
          <Line width="35%" />
        </AppView>
      </AppView>
      <AppView className="items-center gap-1 px-3 pb-2 pt-2.5">
        <Highlight value="4444 3333 6666" big />
      </AppView>
      <AppView className="h-[5px] bg-[#16A34A]" />
    </AppView>
  );
}

const CARDS: Record<PreviewKind, () => React.JSX.Element> = {
  dl: DrivingLicenceCard,
  pan: PanCard,
  aadhaar: AadhaarCard,
};

export interface DocumentPreviewProps {
  kind: PreviewKind;
  /** One line telling the driver where to look. */
  caption: string;
}

/** "Where to find it" preview: a drawn sample card with the number to type highlighted. */
export function DocumentPreview({ kind, caption }: DocumentPreviewProps) {
  const Card = CARDS[kind];
  return (
    <AppView className="gap-3 rounded-2xl bg-[#E8F1FD] p-4 dark:bg-[#132339]">
      <AppText className="text-[11px] font-bold uppercase tracking-wider text-[#2563eb]">
        Sample · where to find it
      </AppText>
      <AppView className="px-2">
        <Card />
      </AppView>
      <AppView row className="items-start gap-2">
        <Icon name="info.circle" size={16} color={BLUE} />
        <AppText className="flex-1 text-[12px] leading-4 text-foreground-secondary">
          {caption}
        </AppText>
      </AppView>
    </AppView>
  );
}
