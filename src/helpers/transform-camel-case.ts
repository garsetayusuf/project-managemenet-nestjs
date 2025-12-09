export function camelCaseToWords(s: string): string {
  const result = s.replace(/([A-Z])/g, ' $1');
  const withoutController = result.replace(/controller/gi, '');

  return withoutController.charAt(0).toUpperCase() + withoutController.slice(1);
}
