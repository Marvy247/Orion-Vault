import { CreditEngine } from './creditEngine.js'
import { negotiateLoanTerms, generateLoanRequest } from './negotiation.js'

const BORROWER_TYPES = ['DeFi Yield Agent', 'Trading Agent', 'Tipping Agent', 'Content Agent', 'Arbitrage Agent']

/**
 * LendingEngine — orchestrates the full agent-to-agent lending lifecycle:
 *   1. Borrower agents request loans with LLM-generated rationale
 *   2. Lender agent scores credit via CreditEngine
 *   3. LLM negotiates final terms
 *   4. Lender funds on-chain
 *   5. Borrower simulates revenue and auto-repays
 *   6. Overdue loans get marked default / liquidated
 */
export class LendingEngine {
  constructor(lenderAgent, borrowerAgents, contract) {
    this.lender    = lenderAgent
    this.borrowers = borrowerAgents
    this.contract  = contract
    this.credit    = new CreditEngine()

    // In-memory loan registry (mirrors on-chain state)
    this.loans     = new Map()   // loanId → enriched loan object
    this.events    = []
    this.market    = { ETH: 3200, BTC: 65000, XAUT: 2400, volatility: 0.3 }
    this._cycle    = 0
    this._txCount  = 0
    this._pending  = new Set()   // agent names with in-flight txs
  }

  // ── Market simulation ──────────────────────────────────────────────────────

  _tickMarket() {
    const drift = () => 1 + (Math.random() - 0.48) * 0.04
    this.market.ETH  = Math.round(this.market.ETH  * drift())
    this.market.BTC  = Math.round(this.market.BTC  * drift())
    this.market.XAUT = Math.round(this.market.XAUT * drift())
    this.market.volatility = Math.max(0.05, Math.min(0.9,
      this.market.volatility + (Math.random() - 0.5) * 0.05
    ))
  }

  // ── Main cycle ─────────────────────────────────────────────────────────────

  async tick() {
    this._cycle++
    this._tickMarket()
    const cycleEvents = []

    // 1. Each borrower may request a loan (staggered)
    for (const borrower of this.borrowers) {
      if (this._cycle % 4 !== this.borrowers.indexOf(borrower) % 4) continue
      if (borrower.activeLoans >= 2) continue

      const event = await this._processBorrowerRequest(borrower)
      if (event) cycleEvents.push(event)
    }

    // 2. Lender scans pending loans and funds eligible ones
    const funded = await this._lenderFundPending()
    cycleEvents.push(...funded)

    // 3. Borrowers simulate revenue and auto-repay active loans
    const repayments = await this._processRepayments()
    cycleEvents.push(...repayments)

    // 4. Check for overdue loans
    const defaults = await this._checkDefaults()
    cycleEvents.push(...defaults)

    for (const e of cycleEvents) this._emit(e)
    return cycleEvents
  }

  // ── Borrower request ───────────────────────────────────────────────────────

  async _processBorrowerRequest(borrower) {
    const agentType = BORROWER_TYPES[this.borrowers.indexOf(borrower) % BORROWER_TYPES.length]
    const amount    = Math.floor(500 + Math.random() * 4500)  // $500–$5000

    const rationale = await generateLoanRequest({
      agentName: borrower.name,
      agentType,
      amount,
      purpose: agentType,
      marketData: this.market,
    })

    // On-chain: request loan (no collateral for undercollateralized demo)
    let loanId = null
    let txHash = null
    if (!this._pending.has(borrower.name)) {
      this._pending.add(borrower.name)
      try {
        const principal = BigInt(amount) * 1_000_000n  // USDT 6 decimals
        const result = await this.contract.requestLoan(
          borrower.name, principal, 500, 7 * 24 * 3600, 0n
        )
        loanId = result.loanId
        txHash = result.hash
        this._txCount++
      } catch (e) {
        console.error(`[LendingEngine] requestLoan failed for ${borrower.name}:`, e.message.slice(0, 80))
      } finally {
        this._pending.delete(borrower.name)
      }
    }

    const loan = {
      id:          loanId ?? `local-${Date.now()}`,
      borrower:    borrower.name,
      borrowerAddr: borrower.address,
      agentType,
      amount,
      status:      'pending',
      requestedAt: Date.now(),
      rationale,
      txHash,
    }
    this.loans.set(loan.id, loan)
    borrower.pendingLoanId = loan.id

    return { type: 'loan_requested', borrower: borrower.name, loanId: loan.id, amount, agentType, rationale, txHash }
  }

  // ── Lender funding ─────────────────────────────────────────────────────────

  async _lenderFundPending() {
    const events = []
    for (const [id, loan] of this.loans) {
      if (loan.status !== 'pending') continue

      // Get on-chain agent state for credit scoring
      let onChainAgent = { creditScore: 500n, totalBorrowed: 0n, totalRepaid: 0n, activeLoans: 0n }
      try {
        onChainAgent = await this.contract.getAgent(
          this.borrowers.find(b => b.name === loan.borrower)?.address || loan.borrowerAddr
        )
      } catch {}

      const scoring = this.credit.score(onChainAgent, loan.amount, this.market.volatility)

      // LLM negotiation
      const negotiated = await negotiateLoanTerms({
        lenderName:          this.lender.name,
        borrowerName:        loan.borrower,
        requestedAmount:     loan.amount,
        creditScore:         Number(onChainAgent.creditScore),
        pd:                  scoring.pd,
        marketVolatility:    this.market.volatility,
        suggestedInterestBps: scoring.interestBps,
      })

      const terms = {
        interestBps:   negotiated?.interestBps  ?? scoring.interestBps,
        durationDays:  negotiated?.durationDays ?? 7,
        collateralPct: negotiated?.collateralPct ?? 0,
        approved:      negotiated?.approved      ?? scoring.approved,
        reasoning:     negotiated?.reasoning     ?? scoring.reason,
      }

      loan.scoring  = scoring
      loan.terms    = terms

      if (!terms.approved) {
        loan.status = 'rejected'
        events.push({ type: 'loan_rejected', loanId: id, borrower: loan.borrower, reason: terms.reasoning })
        continue
      }

      // Fund on-chain
      let txHash = null
      if (!this._pending.has(this.lender.name)) {
        this._pending.add(this.lender.name)
        try {
          if (typeof id === 'number') {
            txHash = await this.contract.fundLoan(
              this.lender.name, id, BigInt(loan.amount) * 1_000_000n, BigInt(terms.durationDays) * 86400n
            )
            this._txCount++
          }
        } catch (e) {
          console.error(`[LendingEngine] fundLoan failed:`, e.message.slice(0, 80))
        } finally {
          this._pending.delete(this.lender.name)
        }
      }

      loan.status   = 'active'
      loan.fundedAt = Date.now()
      loan.dueAt    = Date.now() + terms.durationDays * 86400_000
      loan.txHash   = txHash ?? loan.txHash

      const borrower = this.borrowers.find(b => b.name === loan.borrower)
      if (borrower) { borrower.activeLoans = (borrower.activeLoans || 0) + 1 }

      events.push({ type: 'loan_funded', loanId: id, borrower: loan.borrower, lender: this.lender.name, amount: loan.amount, terms, txHash })
    }
    return events
  }

  // ── Auto-repayment from simulated revenue ──────────────────────────────────

  async _processRepayments() {
    const events = []
    for (const [id, loan] of this.loans) {
      if (loan.status !== 'active') continue

      // Simulate borrower earning revenue (5–15% of loan per cycle)
      const earnRate   = 0.05 + Math.random() * 0.10
      const earned     = Math.floor(loan.amount * earnRate)
      const repayAmount = Math.min(earned, loan.amount * 1.05 - (loan.repaid || 0))

      if (repayAmount <= 0) continue

      loan.repaid = (loan.repaid || 0) + repayAmount

      let txHash = null
      if (!this._pending.has(loan.borrower)) {
        this._pending.add(loan.borrower)
        try {
          if (typeof id === 'number') {
            const owed = await this.contract.totalOwed(id)
            const paying = owed < BigInt(Math.round(repayAmount * 1_000_000)) ? owed : BigInt(Math.round(repayAmount * 1_000_000))
            txHash = await this.contract.repay(loan.borrower, id, paying)
            this._txCount++
          }
        } catch (e) {
          console.error(`[LendingEngine] repay failed:`, e.message.slice(0, 80))
        } finally {
          this._pending.delete(loan.borrower)
        }
      }

      const fullRepayment = loan.repaid >= loan.amount * 1.05
      if (fullRepayment) {
        loan.status = 'repaid'
        const borrower = this.borrowers.find(b => b.name === loan.borrower)
        if (borrower) borrower.activeLoans = Math.max(0, (borrower.activeLoans || 1) - 1)
      }

      events.push({ type: 'repayment', loanId: id, borrower: loan.borrower, amount: repayAmount, fullRepayment, txHash })
    }
    return events
  }

  // ── Default detection ──────────────────────────────────────────────────────

  async _checkDefaults() {
    const events = []
    const now = Date.now()
    for (const [id, loan] of this.loans) {
      if (loan.status !== 'active') continue
      if (!loan.dueAt || now <= loan.dueAt) continue

      loan.status = 'defaulted'
      const borrower = this.borrowers.find(b => b.name === loan.borrower)
      if (borrower) borrower.activeLoans = Math.max(0, (borrower.activeLoans || 1) - 1)

      try {
        if (typeof id === 'number') {
          await this.contract.markDefault(this.lender.name, id)
          this._txCount++
        }
      } catch {}

      events.push({ type: 'default', loanId: id, borrower: loan.borrower })
    }
    return events
  }

  // ── State snapshot ─────────────────────────────────────────────────────────

  getState() {
    const loanList = [...this.loans.values()]
    return {
      cycle:      this._cycle,
      txCount:    this._txCount,
      market:     this.market,
      lender:     this.lender,
      borrowers:  this.borrowers,
      loans:      loanList,
      stats: {
        totalLoans:    loanList.length,
        activeLoans:   loanList.filter(l => l.status === 'active').length,
        repaidLoans:   loanList.filter(l => l.status === 'repaid').length,
        defaultedLoans: loanList.filter(l => l.status === 'defaulted').length,
        rejectedLoans: loanList.filter(l => l.status === 'rejected').length,
        totalDeployed: loanList.filter(l => ['active','repaid'].includes(l.status)).reduce((s,l) => s + l.amount, 0),
      },
    }
  }

  _emit(event) {
    this.events.push({ ...event, ts: Date.now() })
    if (this.events.length > 200) this.events.shift()
  }
}
