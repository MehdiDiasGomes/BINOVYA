/**
 * Sets the title, description and Open Graph tags of a public page, following the current locale.
 * @param titleKey - i18n key of the page title
 * @param descriptionKey - i18n key of the page description
 */
export const usePageSeo = (titleKey: string, descriptionKey: string): void => {
  const { t } = useI18n()
  const title = (): string => t(titleKey)
  const description = (): string => t(descriptionKey)

  useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogType: 'website',
  })
}
