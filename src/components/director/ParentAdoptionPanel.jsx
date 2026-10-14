import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatClassLabel } from '../../lib/curriculum';
import { formatCalendarDateTr } from '../../lib/calendar';
import {
  loadParentAdoption,
  loginCardText,
  schoolAppAddress,
  summarizeAdoption,
  whatsappShareUrl,
} from '../../lib/parentAdoption';
import { downloadParentCardsPdf } from '../../lib/parentCards/downloadParentCards';
import { InlineError } from '../dashboardUi';

const FILTERS = [
  { id: 'never', label: 'Hiç giriş yapmayan' },
  { id: 'nopush', label: 'Bildirimi kapalı' },
  { id: 'all', label: 'Tüm veliler' },
  { id: 'unlinked', label: 'Velisiz öğrenciler' },
];

/** Director overview of parent adoption, with shareable login cards. */
export default function ParentAdoptionPanel({ school, parents, students, classes = [], links }) {
  const [adoption, setAdoption] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('never');
  const [selected, setSelected] = useState(() => new Set());
  const [cardFor, setCardFor] = useState(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setAdoption(await loadParentAdoption());
    } catch (loadError) {
      setError(loadError);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const studentById = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);
  const classLabelById = useMemo(
    () => new Map(classes.map((klass) => [klass.id, formatClassLabel(klass.grade, klass.name)])),
    [classes]
  );

  const summary = useMemo(
    () => (adoption ? summarizeAdoption({ parents, students, links, adoption }) : null),
    [adoption, parents, students, links]
  );

  const childrenOf = useCallback(
    (parentId) =>
      links
        .filter((link) => link.parent_id === parentId)
        .map((link) => studentById.get(link.student_id)?.full_name)
        .filter(Boolean),
    [links, studentById]
  );

  const visibleRows = useMemo(() => {
    if (!summary) return [];
    if (filter === 'never') return summary.rows.filter((row) => row.neverSignedIn);
    if (filter === 'nopush') return summary.rows.filter((row) => !row.hasPush);
    if (filter === 'all') return summary.rows;
    return [];
  }, [summary, filter]);

  const schoolName = school?.name ?? 'Okul';
  const address = schoolAppAddress(school);

  function cardData(parent) {
    return {
      parentName: parent.full_name ?? parent.username,
      children: childrenOf(parent.id),
      username: parent.username,
      pin: parent.login_pin,
    };
  }

  function toggle(parentId) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected(new Set(visibleRows.filter((row) => row.parent.login_pin).map((row) => row.parent.id)));
  }

  const selectedParents = parents.filter((parent) => selected.has(parent.id) && parent.login_pin && parent.username);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      await downloadParentCardsPdf({
        schoolName,
        address,
        cards: selectedParents.map(cardData),
      });
    } catch (exportError) {
      setError(exportError);
    } finally {
      setExporting(false);
    }
  }

  async function handleCopy(parent) {
    const data = cardData(parent);
    try {
      await navigator.clipboard.writeText(loginCardText({ schoolName, address, ...data }));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(new Error('Kopyalanamadı; metni elle seçip kopyalayın.'));
    }
  }

  return (
    <details className="cal-collapsible-form dash-card parent-adoption" open>
      <summary className="cal-collapsible-form__summary">
        <span className="cal-collapsible-form__chevron" aria-hidden="true" />
        <span className="dash-section-title">Veli katılımı</span>
      </summary>
      <div className="cal-collapsible-form__body parent-adoption__body">
        {error ? <InlineError error={error} context="general" /> : null}
        {!summary ? (
          <p className="dash-hint">{error ? '' : 'Yükleniyor…'}</p>
        ) : (
          <>
            <div className="parent-adoption__kpis">
              <div className="parent-adoption__kpi">
                <strong>{summary.totals.parents}</strong>
                <span>Veli hesabı</span>
              </div>
              <div className="parent-adoption__kpi">
                <strong>{summary.totals.everSignedIn}</strong>
                <span>Giriş yapmış</span>
              </div>
              <div className="parent-adoption__kpi">
                <strong>{summary.totals.active}</strong>
                <span>Son 14 gün aktif</span>
              </div>
              <div className="parent-adoption__kpi">
                <strong>{summary.totals.withPush}</strong>
                <span>Bildirimi açık</span>
              </div>
              <div className="parent-adoption__kpi parent-adoption__kpi--warn">
                <strong>{summary.unlinkedStudents.length}</strong>
                <span>Velisiz öğrenci</span>
              </div>
            </div>

            <div className="cur-assign-chips" role="group" aria-label="Filtre">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`cur-assign-chip${filter === item.id ? ' cur-assign-chip--active' : ''}`}
                  onClick={() => {
                    setFilter(item.id);
                    setSelected(new Set());
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {filter === 'unlinked' ? (
              summary.unlinkedStudents.length === 0 ? (
                <p className="dash-hint">Her öğrencinin bir velisi var.</p>
              ) : (
                <>
                  <p className="dash-hint">
                    Bu öğrencilere bağlı veli hesabı yok. Aşağıdaki «Yeni veli» bölümünden oluşturun.
                  </p>
                  <ul className="manage-list">
                    {summary.unlinkedStudents.map((student) => (
                      <li key={student.id} className="manage-list__item">
                        <div className="manage-list__main">
                          <strong>{student.full_name}</strong>
                          <span className="manage-list__meta">
                            {classLabelById.get(student.class_id) ?? ''}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )
            ) : visibleRows.length === 0 ? (
              <p className="dash-hint">Bu filtrede veli yok.</p>
            ) : (
              <>
                <div className="parent-adoption__actions">
                  <button type="button" className="demo-btn demo-btn--ghost" onClick={selectAllVisible}>
                    PIN’i kayıtlı olanların hepsini seç
                  </button>
                  <button
                    type="button"
                    className="demo-btn demo-btn--primary"
                    disabled={!selectedParents.length || exporting}
                    onClick={handleExport}
                  >
                    {exporting ? 'Hazırlanıyor…' : `Giriş kartlarını PDF indir (${selectedParents.length})`}
                  </button>
                </div>
                <ul className="manage-list">
                  {visibleRows.map(({ parent, lastSignInAt, hasPush }) => {
                    const canCard = Boolean(parent.login_pin && parent.username);
                    return (
                      <li key={parent.id} className="manage-list__item parent-adoption__row">
                        <input
                          type="checkbox"
                          aria-label={`${parent.full_name} seç`}
                          checked={selected.has(parent.id)}
                          disabled={!canCard}
                          onChange={() => toggle(parent.id)}
                        />
                        <div className="manage-list__main">
                          <strong>{parent.full_name ?? parent.username}</strong>
                          <span className="manage-list__meta">
                            {childrenOf(parent.id).join(', ') || 'Çocuk bağlı değil'}
                          </span>
                          <span className="manage-list__meta">
                            {lastSignInAt
                              ? `Son giriş: ${formatCalendarDateTr(lastSignInAt.slice(0, 10))}`
                              : 'Hiç giriş yapmadı'}
                            {hasPush ? ' · Bildirim açık' : ' · Bildirim kapalı'}
                            {canCard ? '' : ' · PIN kayıtlı değil'}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="demo-btn"
                          disabled={!canCard}
                          onClick={() => {
                            setCopied(false);
                            setCardFor(parent);
                          }}
                        >
                          Giriş kartı
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </>
        )}
      </div>

      {cardFor ? (
        <div className="app-dialog" role="presentation" onClick={() => setCardFor(null)}>
          <div
            className="app-dialog__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Giriş kartı"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="app-dialog__title">Giriş kartı</h2>
            <div className="parent-adoption__card">
              <strong>{schoolName}</strong>
              <span>{cardFor.full_name}</span>
              <span className="dash-hint">{childrenOf(cardFor.id).join(', ')}</span>
              <span className="dash-hint">Kullanıcı adı</span>
              <code>{cardFor.username}</code>
              <span className="dash-hint">PIN</span>
              <code className="parent-adoption__pin">{cardFor.login_pin}</code>
              <span className="dash-hint">{address}</span>
            </div>
            <div className="app-dialog__actions">
              <button type="button" className="demo-btn" onClick={() => handleCopy(cardFor)}>
                {copied ? 'Kopyalandı' : 'Metni kopyala'}
              </button>
              <a
                className="demo-btn demo-btn--primary"
                href={whatsappShareUrl(
                  loginCardText({ schoolName, address, ...cardData(cardFor) })
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp ile gönder
              </a>
              <button type="button" className="demo-btn" onClick={() => setCardFor(null)}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </details>
  );
}
