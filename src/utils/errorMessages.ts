export const getFriendlyErrorMessage = (error: any, fallbackMessage: string) => {
  const serverMessage = error?.response?.data?.error || error?.response?.data?.message;
  const status = error?.response?.status;

  if (status && status < 500 && serverMessage) {
    return serverMessage;
  }

  if (error?.code === 'ECONNABORTED' || error?.message === 'Network timeout') {
    return 'Unable to complete request. Please try again later.';
  }

  if (!error?.response || status >= 500) {
    return fallbackMessage;
  }

  return serverMessage || fallbackMessage;
};