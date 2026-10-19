const KEY = "cleaning_session";

export const setSession = (petugas, shift) =>
  localStorage.setItem(KEY, JSON.stringify({ petugas, shift }));

export const getSession = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
};

export const clearSession = () => localStorage.removeItem(KEY);