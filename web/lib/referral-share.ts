/** Public referral commission — matches backend REFERRAL_RATE_BPS default (1500 = 15%). */
export const REFERRAL_EARN_PERCENT = "15%";

export function referralShareUrl(site: string, code: string) {
  return `${site.replace(/\/$/, "")}/r/${code}`;
}

export function referralSharePath(code: string) {
  return `/r/${code}`;
}

export function referralShareTitle(code: string) {
  return `Join ArcFlows · ${code}`;
}

export function referralShareDescription() {
  return `You're invited to lock and vest on Arc. Referrers earn ${REFERRAL_EARN_PERCENT} USDC from every referral — scan the QR or open the link.`;
}

export function referralTweetText(link: string) {
  return [
    "Join me on ArcFlows — lock & vest on Arc with public proof.",
    `Earn ${REFERRAL_EARN_PERCENT} USDC from every referral you bring.`,
    "",
    link,
  ].join("\n");
}

export function referralLandingHeadline() {
  return "You're invited to ArcFlows";
}

export function referralLandingSubcopy() {
  return "Lock, vest, and stream on Arc with public proof. Gas in USDC. Referrers earn 15% from every referral.";
}
