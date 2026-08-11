export const selectActiveDailyTemplates = (templates, activeTemplateIds) => {
  const source = Array.isArray(templates) ? templates.filter(Boolean) : [];
  if (!Array.isArray(activeTemplateIds)) return source;
  const activeIds = new Set(activeTemplateIds.filter(Boolean));
  return source.filter((template) => activeIds.has(template.id));
};

export const shouldSkipDailyPrecheck = (templates) =>
  !Array.isArray(templates) || templates.length === 0;
