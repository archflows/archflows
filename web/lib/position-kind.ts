/** On-chain: hard lock sets cliff == end. Linear vest sets start ≤ cliff < end. */
export function isHardLock(cliff?: bigint, end?: bigint) {
  return cliff !== undefined && end !== undefined && cliff === end;
}
