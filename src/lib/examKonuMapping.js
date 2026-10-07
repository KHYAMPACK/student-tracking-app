import { supabase } from './supabase';
import { withSchoolFilter } from './tenant';
import { loadCurriculumSubjects, UNIT_SELECT } from './curriculum';
import { enrichUnitsWithSubject, mapTopicToCurriculum, normalizeCurriculumText } from './studentGaps';
import { examSubjectToCurriculumSlug, subjectByCode } from './lgsExam';

export const KONU_MAPPING_SELECT =
  'id, school_id, grade, subject_code, label_normalized, label_display, unit_id, section_label, created_by, created_at';

const EMPTY_LABELS = new Set(['', '—', '-', 'diğer', 'diger', 'other']);

export function konuMappingKey(subjectCode, topicLabel) {
  return `${subjectCode}::${normalizeCurriculumText(topicLabel)}`;
}

export function isKonuLabelEmpty(topicLabel) {
  const normalized = normalizeCurriculumText(topicLabel);
  return !normalized || EMPTY_LABELS.has(normalized);
}

export function resolveAudienceGrades(session) {
  const grades = [...new Set(session?.audience_grades ?? [])].filter(
    (value) => Number.isInteger(value) && value >= 5 && value <= 8
  );
  return grades.length ? grades.sort((a, b) => a - b) : [5, 6, 7, 8];
}

export function buildKonuMappingLookup(mappings = []) {
  const map = new Map();
  for (const row of mappings ?? []) {
    map.set(`${row.subject_code}::${row.label_normalized}`, row);
  }
  return map;
}

export function collectUniqueKonuFromQuestions(questions = []) {
  const buckets = new Map();

  for (const question of questions ?? []) {
    const topicLabel = String(question.topic_label ?? '').trim();
    if (isKonuLabelEmpty(topicLabel)) continue;

    const subjectCode = question.subject_code;
    const key = `${subjectCode}::${normalizeCurriculumText(topicLabel)}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.questionCount += 1;
      continue;
    }
    buckets.set(key, {
      subject_code: subjectCode,
      topicLabel,
      questionCount: 1,
    });
  }

  return [...buckets.values()].sort((left, right) => {
    const leftLabel = subjectByCode(left.subject_code)?.label ?? left.subject_code;
    const rightLabel = subjectByCode(right.subject_code)?.label ?? right.subject_code;
    const subjectOrder = leftLabel.localeCompare(rightLabel, 'tr');
    if (subjectOrder !== 0) return subjectOrder;
    return left.topicLabel.localeCompare(right.topicLabel, 'tr');
  });
}

export function resolveExamKonu({
  topicLabel,
  subjectCode,
  units = [],
  mappingLookup = null,
}) {
  const label = String(topicLabel ?? '').trim();
  if (isKonuLabelEmpty(label)) {
    return { status: 'empty', mapped: false, unitId: null, sectionLabel: null };
  }

  if (mappingLookup) {
    const stored = mappingLookup.get(`${subjectCode}::${normalizeCurriculumText(label)}`);
    if (stored) {
      if (!stored.unit_id) {
        return {
          status: 'skipped',
          mapped: false,
          unitId: null,
          sectionLabel: null,
          mappingId: stored.id,
        };
      }
      const unit = units.find((row) => row.id === stored.unit_id);
      return {
        status: 'mapped',
        mapped: true,
        unitId: stored.unit_id,
        unitTitle: unit?.title ?? null,
        sectionLabel: stored.section_label ?? null,
        mappingId: stored.id,
        source: 'mapping',
      };
    }
  }

  const fuzzy = mapTopicToCurriculum(label, units, subjectCode);
  if (fuzzy.mapped) {
    return {
      status: 'fuzzy',
      mapped: true,
      unitId: fuzzy.unitId,
      unitTitle: fuzzy.unitTitle,
      sectionLabel: fuzzy.sectionLabel ?? null,
      source: 'fuzzy',
    };
  }

  return {
    status: 'unknown',
    mapped: false,
    unitId: null,
    sectionLabel: null,
    rawLabel: label,
  };
}

export function findUnknownKonuFromQuestions({
  questions = [],
  units = [],
  mappingLookup = null,
}) {
  const unique = collectUniqueKonuFromQuestions(questions);
  return unique.filter((item) => {
    const resolved = resolveExamKonu({
      topicLabel: item.topicLabel,
      subjectCode: item.subject_code,
      units,
      mappingLookup,
    });
    return resolved.status === 'unknown';
  });
}

export async function loadExamKonuMappings(schoolId, grades = []) {
  let query = withSchoolFilter(
    supabase.from('exam_konu_mappings').select(KONU_MAPPING_SELECT),
    schoolId
  ).order('label_display');

  if (grades?.length) {
    query = query.in('grade', grades);
  }

  const { data, error } = await query;
  if (error) {
    const message = error.message ?? '';
    if (/exam_konu_mappings|does not exist|schema cache/i.test(message)) {
      return [];
    }
    throw error;
  }
  return data ?? [];
}

export async function loadExamKonuContext(schoolId, grades = []) {
  const [mappings, subjects, unitsRes] = await Promise.all([
    loadExamKonuMappings(schoolId, grades),
    loadCurriculumSubjects(),
    supabase.from('curriculum_units').select(UNIT_SELECT).order('sort_order'),
  ]);
  if (unitsRes.error) throw unitsRes.error;

  const units = enrichUnitsWithSubject(unitsRes.data ?? [], subjects);
  const gradeSet = new Set(grades.length ? grades : [5, 6, 7, 8]);
  const gradeUnits = units.filter((unit) => gradeSet.has(unit.curriculum_subjects?.grade));

  return {
    mappings,
    mappingLookup: buildKonuMappingLookup(mappings),
    subjects,
    units: gradeUnits,
    allUnits: units,
  };
}

export async function upsertExamKonuMapping({
  schoolId,
  grade,
  subjectCode,
  topicLabel,
  unitId = null,
  sectionLabel = null,
  createdBy = null,
}) {
  const labelDisplay = String(topicLabel ?? '').trim();
  const labelNormalized = normalizeCurriculumText(labelDisplay);
  if (!labelNormalized) return null;

  const { data, error } = await supabase
    .from('exam_konu_mappings')
    .upsert(
      {
        school_id: schoolId,
        grade,
        subject_code: subjectCode,
        label_normalized: labelNormalized,
        label_display: labelDisplay,
        unit_id: unitId,
        section_label: sectionLabel || null,
        created_by: createdBy,
      },
      { onConflict: 'school_id,grade,subject_code,label_normalized' }
    )
    .select(KONU_MAPPING_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function saveKonuMappingsForGrades({
  schoolId,
  grades,
  subjectCode,
  topicLabel,
  unitId,
  sectionLabel,
  units,
  subjects,
  createdBy,
}) {
  const selectedUnit = (units ?? []).find((row) => row.id === unitId);
  const unitTitle = selectedUnit?.title ?? null;
  const saved = [];

  for (const grade of grades) {
    let targetUnitId = unitId;
    if (unitTitle) {
      const subject = (subjects ?? []).find(
        (row) => row.grade === grade && row.slug === examSubjectToCurriculumSlug(subjectCode)
      );
      if (subject) {
        const match = (units ?? []).find(
          (row) => row.subject_id === subject.id && row.title === unitTitle
        );
        if (match) targetUnitId = match.id;
        else if (selectedUnit?.curriculum_subjects?.grade !== grade) targetUnitId = null;
      }
    }

    const row = await upsertExamKonuMapping({
      schoolId,
      grade,
      subjectCode,
      topicLabel,
      unitId: targetUnitId,
      sectionLabel,
      createdBy,
    });
    if (row) saved.push(row);
  }

  return saved;
}

export async function saveKonuMappingBatch({
  schoolId,
  grades,
  decisions,
  units,
  subjects,
  createdBy,
}) {
  const allSaved = [];
  for (const decision of decisions ?? []) {
    const rows = await saveKonuMappingsForGrades({
      schoolId,
      grades,
      subjectCode: decision.subject_code,
      topicLabel: decision.topicLabel,
      unitId: decision.unitId ?? null,
      sectionLabel: decision.sectionLabel ?? null,
      units,
      subjects,
      createdBy,
    });
    allSaved.push(...rows);
  }
  return allSaved;
}

export function unitsForSubjectAndGrades(units, subjectCode, grades) {
  const gradeSet = new Set(grades);
  return (units ?? []).filter(
    (unit) =>
      gradeSet.has(unit.curriculum_subjects?.grade) &&
      unit.curriculum_subjects?.slug === examSubjectToCurriculumSlug(subjectCode)
  );
}

function matchesCurriculumExactly(label, subjectCode, units) {
  const target = normalizeCurriculumText(label);
  if (!target) return false;
  const slug = examSubjectToCurriculumSlug(subjectCode);
  return (units ?? []).some((unit) => {
    const unitSlug = unit.curriculum_subjects?.slug ?? unit.subject?.slug;
    if (unitSlug && unitSlug !== slug) return false;
    if (normalizeCurriculumText(unit.title) === target) return true;
    return (unit.sections ?? []).some(
      (section) =>
        normalizeCurriculumText(typeof section === 'string' ? section : section?.title ?? section?.name) ===
        target
    );
  });
}

/**
 * Key files can carry several topic names per question (e.g. publisher "konu" and MEB
 * ünite). Keep the primary label unless an alternate matches a curriculum unit/section
 * (or a saved mapping) exactly — loose matching is left to the normal resolve flow.
 */
export function preferResolvableTopicLabels({ questions = [], units = [], mappingLookup = null }) {
  return questions.map((question) => {
    const alternates = question.topic_alternates;
    if (!alternates?.length) return question;
    const candidates = [question.topic_label, ...alternates].filter(
      (label, index, all) => label && all.indexOf(label) === index
    );
    for (const label of candidates) {
      const stored = mappingLookup?.get(`${question.subject_code}::${normalizeCurriculumText(label)}`);
      if (stored || matchesCurriculumExactly(label, question.subject_code, units)) {
        return { ...question, topic_label: label };
      }
    }
    return question;
  });
}

export function sectionOptionsForUnit(unit) {
  const sections = (unit?.sections ?? [])
    .map((row) => (typeof row === 'string' ? row : row?.title ?? row?.name))
    .filter(Boolean);
  return sections;
}
