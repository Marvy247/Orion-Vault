/**
 * CreditEngine — deterministic ML-style credit scoring.
 *
 * Computes a probability-of-default (PD) score 0–1 and a recommended
 * interest rate in basis points for a given loan request.
 *
 * Features used (mirrors a real LightGBM feature set):
 *   - on-chain credit score (from contract)
 *   - repayment ratio (totalRepaid / totalBorrowed)
 *   - active loan count
 *   - requested amount vs estimated capacity
 *   - market volatility
 */
export class CreditEngine {
  /**
   * @param {object} agentOnChain  - result of contract.getAgent()
   * @param {number} requestedUSDT - loan principal in USDT (human units)
   * @param {number} volatility    - market volatility 0–1
   * @returns {{ pd: number, interestBps: number, approved: boolean, reason: string }}
   */
  score(agentOnChain, requestedUSDT, volatility = 0.3) {
    const creditScore  = Number(agentOnChain.creditScore)   // 0–1000
    const totalBorrowed = Number(agentOnChain.totalBorrowed)
    const totalRepaid   = Number(agentOnChain.totalRepaid)
    const activeLoans   = Number(agentOnChain.activeLoans)

    // Feature 1: normalised credit score (0–1, higher = better)
    const f_credit = creditScore / 1000

    // Feature 2: repayment ratio (0–1)
    const f_repay = totalBorrowed > 0 ? Math.min(totalRepaid / totalBorrowed, 1) : 0.5

    // Feature 3: active loan penalty
    const f_active = 1 - (activeLoans * 0.2)  // 0 loans = 1.0, 3 loans = 0.4

    // Feature 4: amount stress (larger loans = higher risk)
    const capacity = (creditScore / 1000) * 50_000  // max capacity in USDT
    const f_amount = requestedUSDT <= capacity ? 1 : capacity / requestedUSDT

    // Feature 5: market volatility penalty
    const f_vol = 1 - (volatility * 0.3)

    // Weighted score (higher = safer borrower)
    const safetyScore = (
      f_credit * 0.35 +
      f_repay  * 0.25 +
      f_active * 0.15 +
      f_amount * 0.15 +
      f_vol    * 0.10
    )

    // Probability of default (logistic-style inversion)
    const pd = Math.max(0.01, Math.min(0.99, 1 - safetyScore))

    // Interest rate: base 300bps + risk premium
    const interestBps = Math.round(300 + pd * 2000)  // 3%–23%

    const approved = creditScore >= 200 && activeLoans < 3 && pd < 0.75

    const reason = !approved
      ? creditScore < 200 ? 'credit score too low'
        : activeLoans >= 3 ? 'too many active loans'
        : 'default probability too high'
      : `PD=${(pd*100).toFixed(1)}%, rate=${(interestBps/100).toFixed(1)}%`

    return { pd, interestBps, approved, reason, safetyScore }
  }
}
