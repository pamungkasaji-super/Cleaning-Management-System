export const SHIFTS = [
  { value: 1, label: "07:00-16:00", start: "07:00", end: "16:00" },
  { value: 2, label: "09:00-18:00", start: "09:00", end: "18:00" },
  { value: 3, label: "10:00-19:00", start: "10:00", end: "19:00" },
];

export const getShift = (v) => SHIFTS.find((s) => s.value === Number(v));
export const getShiftLabel = (v) => getShift(v)?.label || "";

export const todayISO = () => new Date().toISOString().slice(0, 10);