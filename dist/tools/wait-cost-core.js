/**
 * Wait / detention cost estimate for truckers.
 */

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * @param {object} input
 * @param {number} [input.hourlyValue] truck value per hour (preferred)
 * @param {number} [input.dailyFixedCost] if hourly not set: payment+insurance+etc per day
 * @param {number} [input.hoursPerWorkDay] default 10 when deriving hourly from daily
 * @param {number} input.waitHours
 * @param {number} [input.detentionPayPerHour] what shipper pays you (if any)
 */
export function estimateWaitCost(input = {}) {
  const waitHours = num(input.waitHours);
  if (!(waitHours >= 0)) {
    return { ok: false, error: "Enter wait hours (0 or more)." };
  }

  let hourlyValue = num(input.hourlyValue);
  const dailyFixedCost = num(input.dailyFixedCost);
  const hoursPerWorkDay = num(input.hoursPerWorkDay);
  const dayHours =
    hoursPerWorkDay > 0 && hoursPerWorkDay <= 24 ? hoursPerWorkDay : 10;

  let source = "hourly";
  if (!(hourlyValue > 0)) {
    if (dailyFixedCost > 0) {
      hourlyValue = dailyFixedCost / dayHours;
      source = "daily";
    } else {
      return {
        ok: false,
        error:
          "Enter your truck’s value per hour, or daily fixed cost (payment, insurance, etc.).",
      };
    }
  }

  const detentionPayPerHour = Math.max(0, num(input.detentionPayPerHour) || 0);
  const waitCost = hourlyValue * waitHours;
  const detentionIncome = detentionPayPerHour * waitHours;
  const netCost = waitCost - detentionIncome;

  let label = "Waiting costs you money";
  if (waitHours === 0) label = "No wait entered";
  else if (netCost <= 0) label = "Detention covers your wait (on paper)";
  else if (netCost < hourlyValue) label = "Small net wait cost";
  else label = "Waiting is expensive — price it in";

  return {
    ok: true,
    label,
    source,
    hourlyValue: round2(hourlyValue),
    waitHours: round2(waitHours),
    waitCost: round2(waitCost),
    detentionPayPerHour: round2(detentionPayPerHour),
    detentionIncome: round2(detentionIncome),
    netCost: round2(netCost),
    dayHours: round2(dayHours),
    familyNote:
      waitHours >= 2
        ? `About ${round1(waitHours)} hour(s) of wait is time you are not home and not earning a loaded mile.`
        : "",
    disclaimer:
      "Estimate based only on numbers you enter. It is not a legal detention claim or a guarantee.",
  };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
function round2(n) {
  return Math.round(n * 100) / 100;
}
