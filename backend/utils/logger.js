const log = (message, level = 'info') => {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  console.log(formattedMessage);
};

const error = (message, error = null) => {
  const timestamp = new Date().toISOString();
  let formattedMessage = `[${timestamp}] [ERROR] ${message}`;
  if (error) {
    formattedMessage += ` - Error: ${error.message || error}`;
    if (error.stack) {
      formattedMessage += `\nStack: ${error.stack}`;
    }
  }
  console.error(formattedMessage);
};

const info = (message) => {
  log(message, 'info');
};

const warn = (message) => {
  log(message, 'warn');
};

module.exports = { log, error, info, warn };
