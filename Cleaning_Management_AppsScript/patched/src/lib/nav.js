export const backOr = (navigate, fallback) => {
  if (window.history.state && window.history.state.idx > 0) {
    navigate(-1);
  } else {
    navigate(fallback, { replace: true });
  }
};