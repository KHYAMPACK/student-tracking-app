import { useEffect, useState } from 'react';
import { formatCalendarDateTr } from '../../lib/calendar';
import { loadClassHomeworkForClass } from '../../lib/classHomework';

/** Read-only list of the class's current homework for the parent's weekly summary. */
export default function ClassHomeworkCard({ classId }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!classId) return undefined;
    let mounted = true;
    (async () => {
      try {
        const rows = await loadClassHomeworkForClass(classId);
        if (mounted) setItems(rows);
      } catch {
        // The weekly summary still works without the homework block.
      }
    })();
    return () => {
      mounted = false;
    };
  }, [classId]);

  if (!items.length) return null;

  return (
    <section className="week-report__panel">
      <p className="week-report__label">Ödevler</p>
      <ul className="week-report__feed">
        {items.map((item) => (
          <li key={item.id} className="week-report__feed-item">
            <div>
              <span className="week-report__feed-kicker">
                {item.subject_label}
                {item.due_on ? ` · Teslim: ${formatCalendarDateTr(item.due_on)}` : ''}
              </span>
              <p>
                <strong>{item.title}</strong>
              </p>
              {item.description ? <p>{item.description}</p> : null}
              <span className="dash-hint">{item.author_name}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
