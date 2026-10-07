import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_SCORE_COEFFICIENTS,
  LGS_SUBJECTS,
  formatLgsScore,
  resolveScoreCoefficients,
  saveSessionScoreCoefficients,
} from '../../lib/lgsExam';
import { InlineError } from '../dashboardUi';

const FIELDS = [
  { key: 'base', label: 'Taban puan' },
  ...LGS_SUBJECTS.map((subject) => ({ key: subject.code, label: subject.label })),
];

function toInputs(coefficients) {
  return Object.fromEntries(
    FIELDS.map((field) => [field.key, String(coefficients[field.key]).replace('.', ',')])
  );
}

function parseInputs(inputs) {
  const parsed = {};
  for (const field of FIELDS) {
    const raw = String(inputs[field.key] ?? '').trim().replace(',', '.');
    const value = Number(raw);
    if (raw === '' || !Number.isFinite(value) || value < 0) return null;
    parsed[field.key] = value;
  }
  return parsed;
}

export default function ExamScoreCoefficients({ session, onSaved }) {
  const current = useMemo(() => resolveScoreCoefficients(session.score_coefficients), [session.score_coefficients]);
  const [inputs, setInputs] = useState(() => toInputs(current));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setInputs(toInputs(current));
    setMessage('');
    setError(null);
  }, [current, session.id]);

  const parsed = parseInputs(inputs);
  const dirty = parsed != null && FIELDS.some((field) => parsed[field.key] !== current[field.key]);
  const maxScore = parsed
    ? parsed.base + LGS_SUBJECTS.reduce((sum, subject) => sum + subject.questions * parsed[subject.code], 0)
    : null;
  const usingDefaults = FIELDS.every((field) => current[field.key] === DEFAULT_SCORE_COEFFICIENTS[field.key]);

  async function persist(next) {
    setSaving(true);
    setError(null);
    setMessage('');
    try {
      const saved = await saveSessionScoreCoefficients(session.id, next);
      await onSaved?.(saved);
      setMessage(next ? 'Katsayılar kaydedildi, puanlar yeniden hesaplandı.' : 'Varsayılan katsayılara dönüldü.');
    } catch (saveError) {
      setError(saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="exam-coef">
      <p className="dash-hint">
        Puan = taban + Σ (ders neti × katsayı). Katsayılar yayınevine göre değişebilir; değiştirince bu
        denemenin puanları ve sıralaması yeniden hesaplanır.
      </p>
      {error ? <InlineError error={error} context="calendar" /> : null}
      <div className="exam-coef__grid">
        {FIELDS.map((field) => (
          <label key={field.key} className="dash-label">
            {field.label}
            <input
              className="dash-input"
              inputMode="decimal"
              value={inputs[field.key] ?? ''}
              disabled={saving}
              onChange={(event) => {
                setMessage('');
                setInputs((prev) => ({ ...prev, [field.key]: event.target.value }));
              }}
            />
          </label>
        ))}
      </div>
      <p className="dash-hint">
        {parsed
          ? `Tam doğru = ${formatLgsScore(maxScore)} puan`
          : 'Tüm alanlar 0 veya daha büyük bir sayı olmalı.'}
        {usingDefaults ? ' · Varsayılan katsayılar kullanılıyor.' : ''}
      </p>
      <div className="exam-coef__actions">
        <button
          type="button"
          className="demo-btn demo-btn--primary"
          disabled={saving || !dirty}
          onClick={() => persist(parsed)}
        >
          {saving ? 'Hesaplanıyor…' : 'Kaydet ve yeniden hesapla'}
        </button>
        <button
          type="button"
          className="demo-btn"
          disabled={saving || (usingDefaults && session.score_coefficients == null)}
          onClick={() => persist(null)}
        >
          Varsayılana dön
        </button>
      </div>
      {message ? <p className="dash-hint">{message}</p> : null}
    </div>
  );
}
