// Global error handling

window.addEventListener('error', event => {
  console.error('Error:', event.error);
});

window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled rejection:', event.reason);
});

function handleError(error, context = '') {
  console.error(`Error in ${context}:`, error);
  const message = error.message || 'An error occurred. Please try again.';
  showToast(message, 'error');
  return false;
}

function logError(error, context = '') {
  const errorData = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    url: window.location.href
  };
  console.error('[Error Log]', errorData);
  return errorData;
}
