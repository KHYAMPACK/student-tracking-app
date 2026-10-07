import { useEffect, useState } from 'react';
import { formatCalendarDateTr } from '../../lib/calendar';
import {
  LGS_SUBJECTS,
  formatLgsScore,
  loadPublishedSubjectResultsForStudents,
  loadRankingsForStudents,
} from '../../lib/lgsExam';

/** Most recent exam result the school has published for this student (weekly summary card). */
export default function LatestExamSummary({ studentId }) {
  const [latest, setLatest] = useState(null);

  useEffect(() => {
    if (!studentId) return undefined;
    let mounted = true;
    (async () => {
      try {
        const [rankings, subjects] = await Promise.all([
          loadRankingsForStudents([studentId]),
          loadPublishedSubjectResultsForStudents([studentId]),
        ]);
        const sessions = new Map();
        for (const row of [...rankings, ...subjects]) {
          if (row.exam_sessions) sessions.set(row.exam_sessions.id, row.exam_sessions);
        }
        const newest = [...sessions.values()].sort((a, b) =>
          `${b.held_on ?? ''}${b.published_at ?? ''}`.localeCompare(`${a.held_on ?? ''}${a.published_at ?? ''}`)
        )[0];
        if (!mounted || !newest) return;
        const ranking = rankings.find((row) => row.session_id === newest.id) ?? null;
        const rows = subjects.filter((row) => row.session_id === newest.id);
        setLatest({ session: newest, ranking, rows });
      } catch {
        // The weekly summary still works without the exam block.
      }
    })();
    return () => {
      mounted = false;
    };
  }, [studentId]);

  if (!latest) return null;
  const { session, ranking, rows } = latest;

  return (
    <section className="week-report__panel latest-exam">
      <p className="week-report__label">Son deneme sonucu</p>
      <div className="latest-exam__head">
        <div>
          <strong>{session.title}</strong>
          {session.held_on ? <span className="dash-hint">{formatCalendarDateTr(session.held_on)}</span> : null}
        </div>
        <div className="latest-exam__scores">
          {ranking?.total_net != null ? <span>Net {Number(ranking.total_net).toFixed(2)}</span> : null}
          {ranking?.lgs_score != null ? <span>Puan {formatLgsScore(ranking.lgs_score)}</span> : null}
        </div>
      </div>
      {ranking?.school_rank || ranking?.class_rank ? (
        <p className="dash-hint">
          Kurumda {ranking.school_rank ?? '—'} · Sınıfta {ranking.class_rank ?? '—'}
        </p>
      ) : null}
      {rows.length ? (
        <table className="exam-mini-table">
          <thead>
            <tr>
              <th className="exam-mini-table__name">Ders</th>
              <th>D</th>
              <th>Y</th>
              <th>B</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            {LGS_SUBJECTS.map((def) => {
              const row = rows.find((item) => item.subject_code === def.code);
              return (
                <tr key={def.code}>
                  <td className="exam-mini-table__name">{def.label}</td>
                  <td>{row?.correct_count ?? '—'}</td>
                  <td>{row?.wrong_count ?? '—'}</td>
                  <td>{row?.blank_count ?? '—'}</td>
                  <td>{row?.net != null ? Number(row.net).toFixed(2) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
