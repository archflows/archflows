/** Mirror of ArcFlow._released / ArcFlowStream._streamed for live UI. */

export function lockReleased(args: {
  amount: bigint;
  start: bigint;
  cliff: bigint;
  end: bigint;
  now: bigint;
}): bigint {
  const { amount, start, cliff, end, now } = args;
  if (amount === 0n || now < cliff) return 0n;
  if (now >= end) return amount;
  const duration = end - start;
  if (duration === 0n) return amount;
  return (amount * (now - start)) / duration;
}

export function lockClaimable(args: {
  amount: bigint;
  claimed: bigint;
  start: bigint;
  cliff: bigint;
  end: bigint;
  now: bigint;
}): bigint {
  const released = lockReleased(args);
  return released > args.claimed ? released - args.claimed : 0n;
}

export function streamStreamed(args: {
  amount: bigint;
  withdrawn: bigint;
  vestedBase: bigint;
  start: bigint;
  cliff: bigint;
  end: bigint;
  period: bigint;
  now: bigint;
}): bigint {
  const { amount, vestedBase, start, cliff, end, period, now } = args;
  if (amount === 0n || now < cliff) return 0n;
  if (now >= end) return amount;
  const accruing = amount - vestedBase;
  if (accruing === 0n) return vestedBase;
  const duration = end - start;
  if (duration === 0n) return amount;
  let elapsed = now - start;
  if (period > 1n) elapsed = (elapsed / period) * period;
  if (elapsed === 0n) return vestedBase;
  return vestedBase + (accruing * elapsed) / duration;
}

export function streamWithdrawable(args: Parameters<typeof streamStreamed>[0]): bigint {
  const vested = streamStreamed(args);
  return vested > args.withdrawn ? vested - args.withdrawn : 0n;
}
