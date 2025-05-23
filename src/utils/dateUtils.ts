export function getNextMonday() {
  const today = new Date();
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + ((8 - today.getDay()) % 7 || 7));
  return nextMonday;
}

export function puedeCrearMenuProximaSemana() {
  const today = new Date();
  // Permitir crear menú próxima semana a partir del sábado (getDay() === 6) o domingo (0)
  return today.getDay() === 6 || today.getDay() === 0;
}

export function getNextSaturday() {
  const today = new Date();
  const nextSaturday = new Date(today);
  const daysUntilSaturday = (6 - today.getDay() + 7) % 7;
  nextSaturday.setDate(today.getDate() + daysUntilSaturday);
  nextSaturday.setHours(0, 0, 0, 0);
  return nextSaturday;
}

export function getMondayOfCurrentWeek(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function getMondayOfNextWeek(date = new Date()) {
  const monday = getMondayOfCurrentWeek(date);
  monday.setDate(monday.getDate() + 7);
  return monday;
}

export function getTargetMondayForMenu() {
  const now = new Date();
  if (now.getDay() === 0 && now.getHours() >= 22) {
    return getMondayOfNextWeek(now);
  }
  return getMondayOfCurrentWeek(now);
}

export function getBaseMondayForDisplay() {
  const now = new Date();
  if (now.getDay() === 0 && now.getHours() >= 22) {
    return getMondayOfNextWeek(now);
  }
  return getMondayOfCurrentWeek(now);
} 