import React from 'react';

export function useLandingForm() {
  const [file, setFile] = React.useState<File | null>(null);
  const [location, setLocation] = React.useState<string>('');
  const [worldwide, setWorldwide] = React.useState<boolean>(false);

  const onFileChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
  }, []);

  const canSubmit = React.useMemo(() => {
    const hasFile = !!file;
    const hasLocation = worldwide || ((location || '').trim().length > 0);
    return hasFile && hasLocation;
  }, [file, location, worldwide]);

  return {
    file,
    setFile,
    location,
    setLocation,
    worldwide,
    setWorldwide,
    canSubmit,
    onFileChange,
  } as const;
}
