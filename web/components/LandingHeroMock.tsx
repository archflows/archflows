export function LandingHeroMock() {
  return (
    <div className="lp-mock" aria-hidden>
      <div className="lp-mock-bar">
        <span className="lp-proof-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="lp-mock-url">app.arcflow / create lock</span>
        <span className="live live-accent">Testnet</span>
      </div>
      <div className="lp-mock-body">
        <div className="lp-mock-row">
          <span>Token</span>
          <strong>USDC</strong>
        </div>
        <div className="lp-mock-field">
          <span>Amount</span>
          <b>1,250,000</b>
        </div>
        <div className="lp-mock-modes">
          <span className="is-on">Hard lock</span>
          <span>Linear vest</span>
        </div>
        <div className="lp-mock-field">
          <span>Unlock date</span>
          <b>12 Jun 2027, 14:00 UTC</b>
        </div>
        <div className="lp-mock-row lp-mock-fee">
          <span>Protocol fee</span>
          <strong>$10 USDC</strong>
        </div>
        <div className="lp-mock-cta">Lock tokens</div>
      </div>
    </div>
  );
}
