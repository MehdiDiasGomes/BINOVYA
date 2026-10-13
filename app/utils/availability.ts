/**
 * Tells whether a day is the customer's collection day or the day right after it.
 * @param date - Day to evaluate
 * @param collectionWeekdays - Collection weekdays, 0 (Sunday) to 6 (Saturday)
 * @returns True when the bins are expected to be empty
 */
export const isRecommendedDay = (date: Date, collectionWeekdays: number[]): boolean => {
  const weekday: number = date.getDay()
  const previousWeekday: number = (weekday + 6) % 7
  return collectionWeekdays.includes(weekday) || collectionWeekdays.includes(previousWeekday)
}
