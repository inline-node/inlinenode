// Placeholder for shared math logic between calculators and CurveLab

export function round(value, decimals = 3) {
  return Number(Math.round(value + "e" + decimals) + "e-" + decimals);
}

export function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

export function toDegrees(rad) {
  return (rad * 180) / Math.PI;
}
