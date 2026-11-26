import { useState } from 'react';
import { Keyboard } from 'react-native';

import { AppPressable, AppText, AppView, Icon } from '@/components/ui';

import { COMPANY_TYPES } from '../company';

export interface CompanyTypePickerProps {
  value: string;
  onChange: (value: string) => void;
}

/** Inline drop-down for the kind of company. */
export function CompanyTypePicker({ value, onChange }: CompanyTypePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <AppView>
      <AppText className="mb-2 text-[13px] font-semibold text-foreground-secondary">
        Company type
      </AppText>
      <AppPressable
        onPress={() => {
          Keyboard.dismiss();
          setOpen((prev) => !prev);
        }}
        className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm active:bg-neutral-100 dark:active:bg-neutral-800"
      >
        <AppView row className="items-center gap-3">
          <Icon name="briefcase" size={20} tone="icon-subtle" />
          <AppText className="text-[15px] font-semibold text-foreground">
            {value || 'Select company type'}
          </AppText>
        </AppView>
        <Icon name={open ? 'chevron.up' : 'chevron.down'} size={18} tone="icon-subtle" />
      </AppPressable>

      {open ? (
        <AppView className="mt-2 rounded-2xl border border-border bg-card p-2 shadow-md">
          {COMPANY_TYPES.map((type) => (
            <AppPressable
              key={type}
              onPress={() => {
                onChange(type);
                setOpen(false);
              }}
              className={`flex-row items-center justify-between rounded-xl px-3 py-2.5 ${
                value === type
                  ? 'bg-[#FF5722]/10'
                  : 'active:bg-neutral-100 dark:active:bg-neutral-800'
              }`}
            >
              <AppText
                className={`text-[14px] ${
                  value === type ? 'font-bold text-[#FF5722]' : 'font-medium text-foreground'
                }`}
              >
                {type}
              </AppText>
              {value === type ? <Icon name="check" size={16} tone="brand" /> : null}
            </AppPressable>
          ))}
        </AppView>
      ) : null}
    </AppView>
  );
}
