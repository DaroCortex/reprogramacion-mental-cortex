const uniqueIds = (values = []) => Array.from(new Set(values.filter(Boolean)));

const isTemplateActive = (store = {}, templateId = "") => {
  if (!templateId) return false;
  if (!Array.isArray(store.activeTemplateIds)) return true;
  return store.activeTemplateIds.includes(templateId);
};

const removeTemplateFromFutureRoutine = ({
  store = {},
  templateId = "",
  effectiveAfterKey = "",
  knownTemplateIds = []
}) => {
  if (!templateId || !effectiveAfterKey) return store;
  const sourceTemplateIds = Array.isArray(store.activeTemplateIds)
    ? store.activeTemplateIds
    : knownTemplateIds;
  const days = Object.fromEntries(
    Object.entries(store.days || {}).map(([key, day]) => [
      key,
      key <= effectiveAfterKey
        ? day
        : {
            ...day,
            items: (day.items || []).filter((item) => item.templateId !== templateId)
          }
    ])
  );

  return {
    ...store,
    days,
    activeTemplateIds: uniqueIds(sourceTemplateIds).filter((id) => id !== templateId)
  };
};

export { isTemplateActive, removeTemplateFromFutureRoutine };
