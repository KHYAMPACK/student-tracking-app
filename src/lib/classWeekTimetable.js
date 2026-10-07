import { supabase } from './supabase';
import { withSchoolFilter } from './tenant';
import { academicWeekIndex, resolveSubjectForClass } from './curriculum';
import { ATLAS_SLOT_COUNT } from './atlasLessons';
import { TIMETABLE_SUBJECT_DEFS, teacherBranchBySlug, teacherBranchLabel } from './teacherBranches';

const DIN_COLOR = '#1e3a8a';
const CUSTOM_COLOR = '#64748b';

/**
 * A grid cell is either '' (empty), a subject slug, or a free-text activity encoded as
 * `custom:<label>` ("Soru Çözümü", "Ödev"…). Stored as subject_slug 'custom' + custom_label.
 */
export const CUSTOM_CELL_PREFIX = 'custom:';
export const CUSTOM_LABEL_MAX = 40;
export const CUSTOM_LABEL_PRESETS = ['Soru Çözümü', 'Ödev'];

export function isCustomCell(value) {
  return typeof value === 'string' && value.startsWith(CUSTOM_CELL_PREFIX);
}

export function customCellValue(label) {
  return `${CUSTOM_CELL_PREFIX}${label ?? ''}`;
}

export function customCellLabel(value) {
  return isCustomCell(value) ? value.slice(CUSTOM_CELL_PREFIX.length) : '';
}

function rowCellValue(row) {
  if (row.subject_slug === 'custom') return customCellValue(row.custom_label);
  return row.subject_slug ?? '';
}

/** True when a custom cell was picked but never given a name (would be silently dropped on save). */
export function hasEmptyCustomCell(grid) {
  return TIMETABLE_WEEKDAYS.some((day) =>
    Array.from({ length: ATLAS_SLOT_COUNT }, (_, index) => grid?.[day.id]?.[index + 1]).some(
      (value) => isCustomCell(value) && !customCellLabel(value).trim()
    )
  );
}

export const TIMETABLE_WEEKDAYS = [
  { id: 1, label: 'Pazartesi', shortLabel: 'Pzt' },
  { id: 2, label: 'Salı', shortLabel: 'Sal' },
  { id: 3, label: 'Çarşamba', shortLabel: 'Çar' },
  { id: 4, label: 'Perşembe', shortLabel: 'Per' },
  { id: 5, label: 'Cuma', shortLabel: 'Cum' },
];

export const TIMETABLE_SELECT =
  'id, school_id, class_id, week_index, weekday, slot_index, subject_slug, custom_label';

export function isoWeekday(isoDate) {
  const day = new Date(`${isoDate}T12:00:00`).getDay();
  return day === 0 ? 7 : day;
}

export function emptyTimetableGrid() {
  const grid = {};
  for (const day of TIMETABLE_WEEKDAYS) {
    grid[day.id] = {};
    for (let slot = 1; slot <= ATLAS_SLOT_COUNT; slot += 1) {
      grid[day.id][slot] = '';
    }
  }
  return grid;
}

export function rowsToTimetableGrid(rows = []) {
  const grid = emptyTimetableGrid();
  for (const row of rows) {
    if (!grid[row.weekday]) continue;
    grid[row.weekday][row.slot_index] = rowCellValue(row);
  }
  return grid;
}

export function timetableGridToRows(grid) {
  const rows = [];
  for (const day of TIMETABLE_WEEKDAYS) {
    for (let slot = 1; slot <= ATLAS_SLOT_COUNT; slot += 1) {
      const value = grid?.[day.id]?.[slot];
      if (!value) continue;
      if (isCustomCell(value)) {
        const label = customCellLabel(value).trim().slice(0, CUSTOM_LABEL_MAX);
        if (label) {
          rows.push({ weekday: day.id, slot_index: slot, subject_slug: 'custom', custom_label: label });
        }
      } else {
        rows.push({ weekday: day.id, slot_index: slot, subject_slug: value, custom_label: null });
      }
    }
  }
  return rows;
}

export function timetableSubjectsForGrade(grade) {
  const defs = [...TIMETABLE_SUBJECT_DEFS];
  if (grade >= 8) {
    defs.push({ slug: 'din', name: 'Din Kültürü', color: '#1e3a8a', icon: 'book' });
  }
  return defs;
}

export async function loadTimetableForWeek(schoolId, classId, weekIndex) {
  if (!schoolId || !classId || !weekIndex) return [];
  const { data, error } = await withSchoolFilter(
    supabase
      .from('class_week_timetable')
      .select(TIMETABLE_SELECT)
      .eq('class_id', classId)
      .eq('week_index', weekIndex)
      .order('weekday')
      .order('slot_index'),
    schoolId
  );
  if (error) throw error;
  return data ?? [];
}

export async function saveTimetableWeek({ schoolId, classId, weekIndex, grid }) {
  if (!schoolId || !classId || !weekIndex) {
    throw new Error('Haftalık program kaydı için şube ve hafta gerekli.');
  }

  const { error: deleteError } = await withSchoolFilter(
    supabase
      .from('class_week_timetable')
      .delete()
      .eq('class_id', classId)
      .eq('week_index', weekIndex),
    schoolId
  );
  if (deleteError) throw deleteError;

  const cells = timetableGridToRows(grid);
  if (!cells.length) return [];

  const rows = cells.map((cell) => ({
    school_id: schoolId,
    class_id: classId,
    week_index: weekIndex,
    weekday: cell.weekday,
    slot_index: cell.slot_index,
    subject_slug: cell.subject_slug,
    custom_label: cell.custom_label,
  }));

  const { data, error } = await supabase.from('class_week_timetable').insert(rows).select(TIMETABLE_SELECT);
  if (error) throw error;
  return data ?? [];
}

/** Custom labels this school already uses, newest first — feeds the editor's suggestions. */
export async function loadCustomTimetableLabels(schoolId) {
  if (!schoolId) return [];
  const { data, error } = await withSchoolFilter(
    supabase
      .from('class_week_timetable')
      .select('custom_label')
      .eq('subject_slug', 'custom')
      .order('updated_at', { ascending: false })
      .limit(200),
    schoolId
  );
  if (error) throw error;
  return [...new Set((data ?? []).map((row) => row.custom_label).filter(Boolean))];
}

export async function fillEmptyTimetableSlot({ classId, weekIndex, weekday, slotIndex }) {
  const { data, error } = await supabase.rpc('fill_empty_timetable_slot', {
    p_class_id: classId,
    p_week_index: weekIndex,
    p_weekday: weekday,
    p_slot_index: slotIndex,
  });
  if (error) throw error;
  return data;
}

export async function copyTimetableFromPreviousWeek({ schoolId, classId, weekIndex }) {
  if (weekIndex <= 1) {
    throw new Error('İlk haftanın kopyalanacak önceki programı yok.');
  }
  const previous = await loadTimetableForWeek(schoolId, classId, weekIndex - 1);
  const grid = rowsToTimetableGrid(previous);
  return saveTimetableWeek({ schoolId, classId, weekIndex, grid });
}

export function subjectSlugFromTimetableRows(rows, weekday, slotIndex) {
  const match = (rows ?? []).find(
    (row) => row.weekday === weekday && row.slot_index === slotIndex
  );
  return match ? rowCellValue(match) || null : null;
}

export function resolveTimetableSubject({ rows, sessionDate, slotIndex, subjects, classGrade }) {
  if (!sessionDate || !slotIndex) return { subjectSlug: null, subject: null };
  const weekday = isoWeekday(sessionDate);
  const subjectSlug = subjectSlugFromTimetableRows(rows, weekday, slotIndex);
  const subject = resolveSubjectForClass(subjects, subjectSlug, classGrade);
  return { subjectSlug, subject };
}

export function timetableWeekIndexForDate(isoDate) {
  return academicWeekIndex(isoDate);
}

export function formatTimetableSubject(slug) {
  if (isCustomCell(slug)) return customCellLabel(slug).trim();
  if (slug === 'din') return 'Din Kültürü';
  return teacherBranchLabel(slug);
}

export function timetableSubjectColor(slug) {
  if (!slug) return null;
  if (isCustomCell(slug)) return CUSTOM_COLOR;
  if (slug === 'din') return DIN_COLOR;
  return teacherBranchBySlug(slug)?.color ?? null;
}
