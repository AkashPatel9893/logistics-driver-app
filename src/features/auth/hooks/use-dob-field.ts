import { useState } from 'react';
import { Keyboard } from 'react-native';

import { getDobBlurError, getDobTypingError } from '@/lib/dob';

/** "DD / MM / YYYY" input: formats while typing and checks day, month and year as they appear. */
export function useDobField(initial: string) {
  const [dob, setDob] = useState(initial);
  const [error, setError] = useState<string>();

  const handleChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    let formatted = digits;
    if (digits.length > 2 && digits.length <= 4) {
      formatted = `${digits.slice(0, 2)} / ${digits.slice(2)}`;
    } else if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)} / ${digits.slice(2, 4)} / ${digits.slice(4, 8)}`;
    }
    setDob(formatted);
    setError(getDobTypingError(formatted));
    // Complete: get the keyboard out of the way of the message.
    if (formatted.length === 14) Keyboard.dismiss();
  };

  /** Leaving the field half-filled is an error too. */
  const handleBlur = () => {
    const message = getDobBlurError(dob);
    if (message) setError(message);
  };

  return { dob, error, setError, handleChange, handleBlur };
}
