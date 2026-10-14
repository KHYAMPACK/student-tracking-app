import { useEffect, useState } from 'react';
import { getUnseenParentChangelog, markParentChangelogSeen } from '../../lib/parentChangelog';
import StaffWhatsNewDialog from '../StaffWhatsNewDialog';

/** Shows unseen parent release notes once, right after login. */
export default function ParentWhatsNew({ profileId }) {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    setEntries(getUnseenParentChangelog(profileId));
  }, [profileId]);

  if (!entries.length) return null;

  return (
    <StaffWhatsNewDialog
      entries={entries}
      onDismiss={() => {
        markParentChangelogSeen(profileId, entries.map((entry) => entry.id));
        setEntries([]);
      }}
    />
  );
}
