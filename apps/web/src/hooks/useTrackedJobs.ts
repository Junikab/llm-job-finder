import { useAppliedJobs } from './useAppliedJobs';
import { useSavedForLater } from './useSavedForLater';

export type TrackedJobsAPI = {
  isApplied: (key: string) => boolean;
  setApplied: (key: string, v: boolean) => void;
  toggleApplied: (key: string) => void;
  getAppliedAt: (key: string) => string | null;
  isSaved: (key: string) => boolean;
  setSaved: (key: string, v: boolean) => void;
  toggleSaved: (key: string) => void;
  getSavedAt: (key: string) => string | null;
  isTracked: (key: string) => boolean;
};

export function useTrackedJobs(): TrackedJobsAPI {
  const { isApplied, setApplied, toggleApplied, getAppliedAt } = useAppliedJobs();
  const { isSaved, setSaved, toggleSaved, getSavedAt } = useSavedForLater();

  const isTracked = (key: string) => isApplied(key) || isSaved(key);

  return {
    isApplied,
    setApplied,
    toggleApplied,
    getAppliedAt,
    isSaved,
    setSaved,
    toggleSaved,
    getSavedAt,
    isTracked,
  };
}
