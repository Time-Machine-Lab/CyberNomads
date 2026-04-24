'use strict';

class CliError extends Error {
  constructor(message, exitCode = 1, details = null, hint = '') {
    super(message);
    this.name = 'CliError';
    this.exitCode = exitCode;
    this.details = details;
    this.hint = hint;
  }
}

module.exports = {
  CliError,
};
