export const FIELDS = [
  { key: "level", label: "المستوى الدراسي", placeholder: "مثال: باك+2" },
  { key: "specialty", label: "التخصص", placeholder: "مثال: تسيير المقاولات" },
  { key: "experience", label: "الخبرات", placeholder: "مثال: تدريب 3 أشهر في شركة...", long: true },
  { key: "skills", label: "المهارات", placeholder: "مثال: Excel، التواصل، خدمة الزبناء", long: true },
  { key: "languages", label: "اللغات", placeholder: "مثال: العربية، الفرنسية (جيد)" },
  { key: "certificates", label: "الشهادات", placeholder: "مثال: شهادة TOEIC" },
  { key: "city", label: "المدينة", placeholder: "مثال: طنجة" },
  { key: "jobType", label: "نوع العمل المرغوب", placeholder: "حضوري/عن بعد، دوام كامل/جزئي" },
  { key: "sectors", label: "القطاعات المستهدفة", placeholder: "مثال: الإدارة، التجارة" },
  { key: "salary", label: "الراتب المتوقع", placeholder: "مثال: 3500 درهم" },
  { key: "goal", label: "هدفي المهني", placeholder: "مثال: وظيفة مساعد إداري في طنجة خلال 3 أشهر", long: true },
];

export function completeness(data = {}) {
  const filled = FIELDS.filter((f) => (data[f.key] || "").trim()).length;
  return Math.round((filled / FIELDS.length) * 100);
}

export function summarize(data = {}) {
  return FIELDS.filter((f) => (data[f.key] || "").trim())
    .map((f) => `${f.label}: ${data[f.key].trim()}`)
    .join("\n");
}

export const STATUSES = {
  found: "تم العثور عليه",
  suitable: "مناسب",
  applied: "تم الترشح",
  interview: "مقابلة",
  offer: "عرض قُبل",
  rejected: "مرفوض",
};

export const JOB_TYPES = {
  full_time: "دوام كامل",
  part_time: "دوام جزئي",
  remote: "عن بعد",
  internship: "تدريب",
  contract: "عقد",
};
