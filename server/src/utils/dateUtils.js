const config = require('../config/env');

/**
 * Format a Date or ISO string into a human-readable Indian standard time representation
 */
function formatCampusDateTime(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: config.campusTimezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Format only the time component (e.g., "12:30 PM")
 */
function formatCampusTime(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: config.campusTimezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Check if the cancellation deadline has passed for an order with a pickup window starts_at
 * @param {string|Date} windowStartsAt 
 * @param {number} cutoffMinutes 
 * @returns {{ isAllowed: boolean, cutoffTime: Date, minutesRemaining: number }}
 */
function checkCancellationEligibility(windowStartsAt, cutoffMinutes = config.cancellationCutoffMinutes) {
  const now = new Date();
  const windowStart = new Date(windowStartsAt);
  const cutoffTime = new Date(windowStart.getTime() - cutoffMinutes * 60 * 1000);

  const diffMs = cutoffTime.getTime() - now.getTime();
  const minutesRemaining = Math.floor(diffMs / (60 * 1000));

  return {
    isAllowed: now <= cutoffTime,
    cutoffTime,
    minutesRemaining: Math.max(0, minutesRemaining),
  };
}

module.exports = {
  formatCampusDateTime,
  formatCampusTime,
  checkCancellationEligibility,
};
