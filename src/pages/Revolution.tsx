import { useEffect, useRef, useState } from 'react'
import '../styles/Revolution.css'
import { useAuth } from '../contexts/AuthContext'
import { saveRevolutionState, loadRevolutionState, isFirebaseEnabled } from '../lib/firebase'

const STORAGE_KEY = 'revolution_state_v1'

function loadSavedState() {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (e) {
    return null
  }
}

function saveState(state: any) {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    // ignore
  }
}

// Format numbers for UI: if absolute value > 1e6 show exponential with 3 significant digits
function formatForDisplay(n: number, smallFormatter: (v: number) => string) {
  if (!isFinite(n)) return String(n)
  if (Math.abs(n) > 1e6) return n.toExponential(2)
  return smallFormatter(n)
}

function App() {
  const numberOfRings = 9
  const _saved = loadSavedState()

  // whether the player has ever reached Infinity (used to gate IP UI)
  
  const auth = useAuth()

  // primary gameplay state
  const [rotValues, setRotValues] = useState<number[]>(() => {
    const s = _saved
    if (s && Array.isArray(s.rotValues)) {
      const arr = Array(numberOfRings).fill(1)
      for (let i = 0; i < Math.min(s.rotValues.length, numberOfRings); i++) arr[i] = s.rotValues[i]
      return arr
    }
    return Array(numberOfRings).fill(1)
  })

  const [score, setScore] = useState<number>(() => {
    const s = _saved
    return s && typeof s.score === 'number' ? s.score : 0
  })

  const [speedLevels, setSpeedLevels] = useState<number[]>(() => {
    const s = _saved
    if (s && Array.isArray(s.speedLevels)) {
      const arr = Array(numberOfRings).fill(0)
      for (let i = 0; i < Math.min(s.speedLevels.length, numberOfRings); i++) arr[i] = s.speedLevels[i]
      return arr
    }
    return Array(numberOfRings).fill(0)
  })

  const [prestigePoints, setPrestigePoints] = useState<number>(() => {
    const s = _saved
    return s && typeof s.prestigePoints === 'number' ? s.prestigePoints : 0
  })

  const [prestigeStrength, setPrestigeStrength] = useState<number>(() => {
    const s = _saved
    return s && typeof s.prestigeStrength === 'number' ? s.prestigeStrength : 0
  })

  const [promotionLevel, setPromotionLevel] = useState<number>(() => {
    const s = _saved
    return s && typeof s.promotionLevel === 'number' ? s.promotionLevel : 0
  })

  const [autoBuy, setAutoBuy] = useState<boolean>(() => {
    const s = _saved
    return s && typeof s.autoBuy === 'boolean' ? s.autoBuy : false
  })

  // auto-promotion toggle (user can turn auto-promotion on/off)
  const [autoPromo, setAutoPromo] = useState<boolean>(() => {
    const s = _saved
    return s && typeof s.autoPromo === 'boolean' ? s.autoPromo : false
  })

  const [infinityPoints, setInfinityPoints] = useState<number>(() => {
    const s = _saved
    return s && typeof s.infinityPoints === 'number' ? s.infinityPoints : 0
  })

  const [hasReachedInfinity, setHasReachedInfinity] = useState<boolean>(() => {
    const s = _saved
    return s && typeof s.hasReachedInfinity === 'boolean' ? s.hasReachedInfinity : false
  })

  // how many times the player has reached Infinity
  const [infinityReachCount, setInfinityReachCount] = useState<number>(() => {
    const s = _saved
    return s && typeof s.infinityReachCount === 'number' ? s.infinityReachCount : 0
  })


  // IP upgrades: horizontal skill tree that unlocks from left to right
  const [ipUpgrades, setIpUpgrades] = useState<{
    node1: number   // starting node: score boost
    node2: number   // basic rotation speed
    node3a: number  // branch A: prestige power
    node3b: number  // branch B: multi gain
    node3c: number  // branch C: cost reduction
    node4: number   // converge: super boost (requires any node3)
    node5: number   // advanced rotation
    node6a: number  // branch A: mega score
    node6b: number  // branch B: auto buy power
    node6c: number  // branch C: prestige strength
    node7: number   // ultimate: infinity power (requires all node6)
    node8: number   // extended main path
    node9: number   // extended main path
    node10: number
    node11: number
    node12: number
     node13: number
     node14: number
  }>(() => {
    const s = _saved
    if (s && s.ipUpgrades) {
      return {
        node1: s.ipUpgrades.node1 || 0,
        node2: s.ipUpgrades.node2 || 0,
        node3a: s.ipUpgrades.node3a || 0,
        node3b: s.ipUpgrades.node3b || 0,
        node3c: s.ipUpgrades.node3c || 0,
        node4: s.ipUpgrades.node4 || 0,
        node5: s.ipUpgrades.node5 || 0,
        node6a: s.ipUpgrades.node6a || 0,
        node6b: s.ipUpgrades.node6b || 0,
        node6c: s.ipUpgrades.node6c || 0,
        node7: s.ipUpgrades.node7 || 0,
        node8: s.ipUpgrades.node8 || 0,
        node9: s.ipUpgrades.node9 || 0,
        node10: s.ipUpgrades.node10 || 0,
        node11: s.ipUpgrades.node11 || 0,
        node12: s.ipUpgrades.node12 || 0,
         node13: s.ipUpgrades.node13 || 0,
         node14: s.ipUpgrades.node14 || 0,
      }
    }
    return {
      node1: 0,
      node2: 0,
      node3a: 0,
      node3b: 0,
      node3c: 0,
      node4: 0,
      node5: 0,
      node6a: 0,
      node6b: 0,
      node6c: 0,
      node7: 0,
      node8: 0,
      node9: 0,
      node10: 0,
      node11: 0,
      node12: 0,
       node13: 0,
       node14: 0,
    }
  })
  // control visibility of the IP upgrades shop panel
  const [showIpShop, setShowIpShop] = useState<boolean>(false)
  // manual sync status message (一時表示)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  
  // cumulative purchase counts per-ring: used to compute upgrade cost so costs don't reset on ascension
  const [purchaseCounts, setPurchaseCounts] = useState<number[]>(() => {
    const s = loadSavedState()
    if (s && Array.isArray(s.purchaseCounts)) {
      const arr = Array(numberOfRings).fill(0)
      for (let i = 0; i < Math.min(s.purchaseCounts.length, numberOfRings); i++) arr[i] = s.purchaseCounts[i]
      return arr
    }
    return Array(numberOfRings).fill(0)
  })
  // highest score reached at the moment of the most recent prestige
  const [lastPrestigeScore, setLastPrestigeScore] = useState<number>(() => {
    const s = loadSavedState()
    return s && typeof s.lastPrestigeScore === 'number' ? s.lastPrestigeScore : 0
  })
  const prestigeThreshold = 1000000
  // Promotion: new reinforcement that increases per-rotation gain ("multi gain").
  // Unlock condition: prestige points >= PROMO_THRESHOLD
  const PROMO_THRESHOLD = 1e90
  // Each purchased promotion multiplies multi-gain by 10 (i.e. ×10 per promotion)
  const PROMO_MULT_PER_LEVEL = 10

  // compute prestige multiplier from prestige points with staged soft-caps
  function computePrestigeMultiplierFromPoints(n: number) {
    const points = n || 0
    // base raw multiplier: sqrt(10 * n), minimum 1
    let val = Math.max(1, Math.sqrt(10 * points))

    // staged soft-cap tiers up to 1e30
    // apply suppression by taking a power of `val` while preserving continuity at the cap:
    // when val > cap, transform val -> val^alpha * cap^(1-alpha)
    // slightly relaxed tiers compared to previous aggressive settings
    // increased caps and slightly larger alphas so suppression is milder
    const tiers = [
      { cap: 20, alpha: 0.35 },       // lightly suppress early
      { cap: 100, alpha: 0.18 },      // moderate
      { cap: 500, alpha: 0.09 },      // moderate
      { cap: 5e3, alpha: 0.045 },     // moderate
      { cap: 5e6, alpha: 0.03 },      // moderate
      { cap: 1e10, alpha: 0.025 },    // relax a bit
      { cap: 1e14, alpha: 0.03 },     // relax upper-mid
      { cap: 1e20, alpha: 0.04 },     // top tiers relaxed (user requested B)
      { cap: 1e26, alpha: 0.045 },    // top tiers relaxed
      { cap: 1e30, alpha: 0.05 }      // top tiers relaxed and noticeably milder
    ]

    for (const t of tiers) {
      if (val > t.cap) {
        // increase alpha by one order of magnitude (ユーザー指定)
        // but clamp to <1 to avoid amplification
        const a = Math.min(t.alpha * 10, 0.99)
        // preserve continuity at cap using power-based mapping
        val = Math.pow(val, a) * Math.pow(t.cap, 1 - a)
      }
    }

    return Math.max(1, val)
  }

  

  function computePrestigeGain(s: number) {
    if (!isFinite(s) || s < prestigeThreshold) return 0
    // award 1 prestige point per `prestigeThreshold` (1e6) accumulated
    // subtract already-awarded points based on `lastPrestigeScore`
    const totalPoints = Math.floor(s / prestigeThreshold)
    const prevPoints = Math.floor((lastPrestigeScore || 0) / prestigeThreshold)
    const baseGain = Math.max(0, totalPoints - prevPoints)
    // apply IP prestige multiplier
    const ipMult = getIPPrestigeMultiplier()
    return Math.floor(baseGain * ipMult)
  }

  // calculate the next prestige threshold (doubles each time)
  function getNextPrestigeThreshold() {
    if (lastPrestigeScore === 0) return prestigeThreshold
    // next threshold is simply the next multiple of `prestigeThreshold`
    return lastPrestigeScore + prestigeThreshold
  }

  // perform prestige: convert score->prestige points, then reset everything except prestigePoints
  function doPrestige() {
    const gain = computePrestigeGain(score)
    if (gain <= 0) return
    // require score to reach the next prestige threshold (doubles each time)
    const nextThreshold = getNextPrestigeThreshold()
    if (score < nextThreshold) return
    // temporarily disable auto-buy to avoid interference during reset
    const prevAuto = autoBuyRef.current || false
    if (prevAuto) setAutoBuy(false)

    // pause RAF loop and mark reset in progress so any queued updates are ignored
    pauseLoopRef.current = true
    resetRef.current = true
    setPrestigePoints((p) => p + gain)
    // record the last prestige score as the largest multiple of prestigeThreshold
    // that was just consumed (so next threshold = that + prestigeThreshold)
    const awardedMultiple = Math.floor(score / prestigeThreshold)
    setLastPrestigeScore(awardedMultiple * prestigeThreshold)
    // increase prestige strength based on points gained: use sqrt(10 * gain)
    // `gain` is the number of prestige points awarded by this prestige
    // apply IP prestige strength boost
    const ipStrengthBoost = getIPPrestigeStrengthBoost()
    const deltaStrength = Math.sqrt(10 * gain) * ipStrengthBoost
    // debug: compute predicted after-values for logging (React state updates are async)
    const prestigePointsBefore = prestigePoints
    const prestigeStrengthBefore = prestigeStrength
    const prestigePointsAfter = (prestigePointsBefore || 0) + gain
    const prestigeStrengthAfter = prestigeStrengthBefore + (Number.isFinite(deltaStrength) ? deltaStrength : 0)
    const displayedMulAfter = computePrestigeMultiplierFromPoints(prestigePointsAfter)
    // log for debugging unexpected large multipliers
    // eslint-disable-next-line no-console
    console.log('doPrestige debug', { gain, deltaStrength, prestigePointsBefore, prestigePointsAfter, prestigeStrengthBefore, prestigeStrengthAfter, displayedMulAfter, ipStrengthBoost })
    setPrestigeStrength((s) => s + (Number.isFinite(deltaStrength) ? deltaStrength : 0))

    // reset gameplay state
    setScore(0)
    setRotValues(() => Array(numberOfRings).fill(1))
    setSpeedLevels(() => Array(numberOfRings).fill(0))
    // reset cumulative purchase counts so upgrade costs start over after prestige
    setPurchaseCounts(() => Array(numberOfRings).fill(0))
    

    // clear canvases
    const trails = trailRefs.current
    if (trails) {
      for (let i = 0; i < trails.length; i++) {
        const t = trails[i]
        if (t) {
          const ctx = t.getContext('2d')
          if (ctx) ctx.clearRect(0, 0, t.width, t.height)
        }
      }
    }
    const overlay = overlayRef.current
    if (overlay) {
      const ctx = overlay.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height)
    }

    // reset internal refs used by the loop
    lastPosRef.current = Array(numberOfRings).fill(null)
    lastWholeRef.current = Array(numberOfRings).fill(0)
    startRef.current = null
    // resume RAF loop on next frame and clear reset guard, then restore auto-buy
    requestAnimationFrame(() => {
      pauseLoopRef.current = false
      resetRef.current = false
      if (prevAuto) setAutoBuy(true)
    })
  }

  // perform promotion: requires enough prestige points for next promotion level
  function doPromotion() {
    const nextReq = PROMO_THRESHOLD * ((promotionLevel || 0) + 1)
    if (!isFinite(prestigePoints) || prestigePoints < nextReq) return

    // temporarily disable auto-buy to avoid interference during reset
    const prevAuto = autoBuyRef.current || false
    if (prevAuto) setAutoBuy(false)

    // pause RAF loop so it won't read stale refs/state while we reset
    pauseLoopRef.current = true
    resetRef.current = true
    resetRef.current = true

    // increment purchased promotion level (update both state and ref synchronously)
    const newPromoLevel = (promotionLevelRef.current || promotionLevel || 0) + 1
    setPromotionLevel(newPromoLevel)
    promotionLevelRef.current = newPromoLevel

    // ensure prestige ref is zeroed immediately so the RAF loop sees the change
    prestigeRef.current = 0

    // reset gameplay state (start over but keep promotion enhancements)
    setScore(0)
    setRotValues(() => Array(numberOfRings).fill(1))
    setSpeedLevels(() => Array(numberOfRings).fill(0))
    setPurchaseCounts(() => Array(numberOfRings).fill(0))
    // reset prestige points and last recorded prestige score
    setPrestigePoints(0)
    setLastPrestigeScore(0)

    // clear canvases
    const trails = trailRefs.current
    if (trails) {
      for (let i = 0; i < trails.length; i++) {
        const t = trails[i]
        if (t) {
          const ctx = t.getContext('2d')
          if (ctx) ctx.clearRect(0, 0, t.width, t.height)
        }
      }
    }
    const overlay = overlayRef.current
    if (overlay) {
      const ctx = overlay.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height)
    }

    // reset internal refs used by the loop
    lastPosRef.current = Array(numberOfRings).fill(null)
    lastWholeRef.current = Array(numberOfRings).fill(0)
    startRef.current = null

    // resume RAF loop on next frame and restore auto-buy to previous state
    requestAnimationFrame(() => {
      pauseLoopRef.current = false
      resetRef.current = false
      if (prevAuto) setAutoBuy(true)
    })
  }

  if (import.meta.env.DEV) {
    ;(window as any).debugReachInfinity = debugReachInfinity
  }

  // purchase IP upgrade functions (horizontal skill tree)
  type IPUpgradeType = 'node1' | 'node2' | 'node3a' | 'node3b' | 'node3c' | 'node4' | 'node5' | 'node6a' | 'node6b' | 'node6c' | 'node7' | 'node8' | 'node9' | 'node10' | 'node11' | 'node12' | 'node13' | 'node14'

  // check if skill is unlocked (left-to-right progression)
  function isSkillUnlocked(type: IPUpgradeType): boolean {
    switch(type) {
      case 'node1':
        return true
      case 'node2':
        return ipUpgrades.node1 >= 1
      // First branch: requires node2
      case 'node3a':
      case 'node3b':
      case 'node3c':
        return ipUpgrades.node2 >= 1
      // Converge: requires any branch from node3
      case 'node4':
        return ipUpgrades.node3a >= 1 || ipUpgrades.node3b >= 1 || ipUpgrades.node3c >= 1
      case 'node5':
        return ipUpgrades.node4 >= 1
      // Second branch: requires node5
      case 'node6a':
      case 'node6b':
      case 'node6c':
        return ipUpgrades.node5 >= 1
      // Ultimate: requires all branches from node6
      case 'node7':
        return ipUpgrades.node6a >= 1 && ipUpgrades.node6b >= 1 && ipUpgrades.node6c >= 1
      case 'node8':
        return ipUpgrades.node7 >= 1
      case 'node9':
        return ipUpgrades.node8 >= 1
      case 'node10':
        return ipUpgrades.node9 >= 1
      case 'node11':
        return ipUpgrades.node10 >= 1
      case 'node12':
        return ipUpgrades.node11 >= 1
      case 'node13':
        return ipUpgrades.node12 >= 1
      case 'node14':
        return ipUpgrades.node13 >= 1
      default:
        return false
    }
  }

  function buyIPUpgrade(type: IPUpgradeType) {
    if (!isSkillUnlocked(type)) return // can't buy locked skills
    const cost = getIPUpgradeCost(type)
    const max = getMaxLevel(type)
    const current = ipUpgrades[type] || 0
    if (current >= max) return // already at max
    if (infinityPoints >= cost) {
      setInfinityPoints(ip => ip - cost)
      setIpUpgrades(prev => ({
        ...prev,
        [type]: Math.min(prev[type] + 1, max)
      }))
    }
  }

  function getMaxLevel(type: IPUpgradeType) {
    // node3a is a branch unlock — only 1 level. Others default to 5.
    if (type === 'node3a') return 1
    // node10: unlocks promotion automation — single-use (max 1)
    if (type === 'node10') return 1
    // node14: medal amplifier — single-use
    if (type === 'node14') return 1
    return 5
  }

  function getIPUpgradeCost(type: IPUpgradeType) {
    const level = ipUpgrades[type] || 0
    // base exponential cost
    const base = Math.pow(2, level)
    // Note: node3c no longer reduces IP-upgrade costs; costs are pure exponential
    return Math.ceil(base)
  }

  // compute effective multipliers from IP upgrades (horizontal skill tree)
  function getIPPrestigeMultiplier() {
    const n6c = Math.pow(3, ipUpgrades.node6c)
    const n7 = Math.pow(5, ipUpgrades.node7)
    return n6c * n7
  }

  function getIPPrestigeStrengthBoost() {
    const n6c = Math.pow(3, ipUpgrades.node6c)
    return n6c
  }

  

  // perform infinite: requires score to reach Infinity, increments IP and resets everything except IP
  function doInfinite() {
    if (score !== Infinity) return

    // temporarily disable auto-buy to avoid interference during reset
    const prevAuto = autoBuyRef.current || false
    if (prevAuto) setAutoBuy(false)

    // pause RAF loop so it won't read stale refs/state while we reset
    pauseLoopRef.current = true

    // increment infinity points (update both state and ref synchronously)
    const newIP = (infinityPoints || 0) + 1
    setInfinityPoints(newIP)
    // mark that the player has reached Infinity at least once
    setHasReachedInfinity(true)
    // increment reach count
    setInfinityReachCount((c) => (c || 0) + 1)

    // reset all gameplay state including prestige and promotion
    setScore(0)
    setRotValues(() => Array(numberOfRings).fill(1))
    setSpeedLevels(() => Array(numberOfRings).fill(0))
    setPurchaseCounts(() => Array(numberOfRings).fill(0))
    setPrestigePoints(0)
    setPrestigeStrength(0)
    setLastPrestigeScore(0)
    setPromotionLevel(0)

    // reset prestige and promotion refs
    prestigeRef.current = 0
    prestigeStrengthRef.current = 0
    promotionLevelRef.current = 0

    // clear canvases
    const trails = trailRefs.current
    if (trails) {
      for (let i = 0; i < trails.length; i++) {
        const t = trails[i]
        if (t) {
          const ctx = t.getContext('2d')
          if (ctx) ctx.clearRect(0, 0, t.width, t.height)
        }
      }
    }
    const overlay = overlayRef.current
    if (overlay) {
      const ctx = overlay.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height)
    }

    // reset internal refs used by the loop
    lastPosRef.current = Array(numberOfRings).fill(null)
    lastWholeRef.current = Array(numberOfRings).fill(0)
    startRef.current = null

    // resume RAF loop on next frame and restore auto-buy to previous state
    requestAnimationFrame(() => {
      pauseLoopRef.current = false
      resetRef.current = false
      if (prevAuto) setAutoBuy(true)
    })
  }

  // Debug helper: force the player to reach Infinity (bypasses score check).
  // Visible only in development builds via the debug button added to the UI.
  function debugReachInfinity() {
    // temporarily disable auto-buy to avoid interference during reset
    const prevAuto = autoBuyRef.current || false
    if (prevAuto) setAutoBuy(false)

    // pause RAF loop so it won't read stale refs/state while we reset
    pauseLoopRef.current = true
    resetRef.current = true

    // increment infinity points (update both state and ref synchronously)
    const newIP = (infinityPoints || 0) + 1
    setInfinityPoints(newIP)
    // mark that the player has reached Infinity at least once
    setHasReachedInfinity(true)
    // increment reach count
    setInfinityReachCount((c) => (c || 0) + 1)

    // reset all gameplay state including prestige and promotion
    setScore(0)
    setRotValues(() => Array(numberOfRings).fill(1))
    setSpeedLevels(() => Array(numberOfRings).fill(0))
    setPurchaseCounts(() => Array(numberOfRings).fill(0))
    setPrestigePoints(0)
    setPrestigeStrength(0)
    setLastPrestigeScore(0)
    setPromotionLevel(0)

    // reset prestige and promotion refs
    prestigeRef.current = 0
    prestigeStrengthRef.current = 0
    promotionLevelRef.current = 0

    // clear canvases
    const trails = trailRefs.current
    if (trails) {
      for (let i = 0; i < trails.length; i++) {
        const t = trails[i]
        if (t) {
          const ctx = t.getContext('2d')
          if (ctx) ctx.clearRect(0, 0, t.width, t.height)
        }
      }
    }
    const overlay = overlayRef.current
    if (overlay) {
      const ctx = overlay.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height)
    }

    // reset internal refs used by the loop
    lastPosRef.current = Array(numberOfRings).fill(null)
    lastWholeRef.current = Array(numberOfRings).fill(0)
    startRef.current = null

    // resume RAF loop on next frame and restore auto-buy to previous state
    requestAnimationFrame(() => {
      pauseLoopRef.current = false
      resetRef.current = false
      if (prevAuto) setAutoBuy(true)
    })
  }

  

  // persist state to localStorage whenever important pieces change
  useEffect(() => {
    saveState({ rotValues, score, speedLevels, prestigePoints, prestigeStrength, promotionLevel, autoBuy, autoPromo, purchaseCounts, lastPrestigeScore, infinityPoints, ipUpgrades, hasReachedInfinity, infinityReachCount })
  }, [
    JSON.stringify(rotValues),
    score,
    JSON.stringify(speedLevels),
    prestigePoints,
    prestigeStrength,
    promotionLevel,
    autoBuy,
    autoPromo,
    JSON.stringify(purchaseCounts),
    lastPrestigeScore,
    infinityPoints,
    infinityReachCount,
    JSON.stringify(ipUpgrades),
    hasReachedInfinity,
  ])

  // Manual sync helper: save localStorage and optionally push to Firestore only when user requests
  const handleManualSync = async () => {
    const toSave = { rotValues, score, speedLevels, prestigePoints, prestigeStrength, promotionLevel, autoBuy, autoPromo, purchaseCounts, lastPrestigeScore, infinityPoints, ipUpgrades, hasReachedInfinity, infinityReachCount }
    // always save to localStorage (already done by other effect, but ensure freshness)
    saveState(toSave)

    if (!auth.user) {
      console.warn('Not signed in — local save only')
      return
    }
    if (!isFirebaseEnabled) {
      console.warn('Firebase not enabled — local save only')
      return
    }

    // show temporary UI feedback for success/failure
    setSyncStatus(null)
    try {
      await saveRevolutionState(auth.user!.uid, toSave)
      console.log('Revolution state synced to Firebase')
      setSyncStatus('保存に成功しました')
      setTimeout(() => setSyncStatus(null), 3000)
    } catch (e) {
      console.warn('Failed to save revolution state to Firebase:', e)
      setSyncStatus('保存に失敗しました')
      setTimeout(() => setSyncStatus(null), 3000)
    }
  }

  // Load Revolution state from Firestore when user signs in
  useEffect(() => {
    if (!auth.user || !isFirebaseEnabled) return

    let cancelled = false
    const load = async () => {
      try {
        const remote = await loadRevolutionState(auth.user!.uid)
        if (!remote || cancelled) return

        // Merge remote values into local state, preserving defaults
        if (Array.isArray(remote.rotValues)) {
          const arr = Array(numberOfRings).fill(1)
          for (let i = 0; i < Math.min(remote.rotValues.length, numberOfRings); i++) arr[i] = remote.rotValues[i]
          setRotValues(arr)
        }
        if (typeof remote.score === 'number') setScore(remote.score)
        if (Array.isArray(remote.speedLevels)) {
          const arr = Array(numberOfRings).fill(0)
          for (let i = 0; i < Math.min(remote.speedLevels.length, numberOfRings); i++) arr[i] = remote.speedLevels[i]
          setSpeedLevels(arr)
        }
        if (typeof remote.prestigePoints === 'number') setPrestigePoints(remote.prestigePoints)
        if (typeof remote.prestigeStrength === 'number') setPrestigeStrength(remote.prestigeStrength)
        if (typeof remote.promotionLevel === 'number') setPromotionLevel(remote.promotionLevel)
        if (typeof remote.autoBuy === 'boolean') setAutoBuy(remote.autoBuy)
        if (typeof remote.autoPromo === 'boolean') setAutoPromo(remote.autoPromo)
        if (typeof remote.infinityPoints === 'number') setInfinityPoints(remote.infinityPoints)
        if (typeof remote.hasReachedInfinity === 'boolean') setHasReachedInfinity(remote.hasReachedInfinity)
        if (typeof remote.infinityReachCount === 'number') setInfinityReachCount(remote.infinityReachCount)
        if (remote.ipUpgrades && typeof remote.ipUpgrades === 'object') {
          const ip: any = {}
          for (const k of Object.keys(remote.ipUpgrades)) ip[k] = remote.ipUpgrades[k] || 0
          setIpUpgrades((prev) => ({ ...prev, ...ip }))
        }
        if (Array.isArray(remote.purchaseCounts)) {
          const arr = Array(numberOfRings).fill(0)
          for (let i = 0; i < Math.min(remote.purchaseCounts.length, numberOfRings); i++) arr[i] = remote.purchaseCounts[i]
          setPurchaseCounts(arr)
        }
        if (typeof remote.lastPrestigeScore === 'number') setLastPrestigeScore(remote.lastPrestigeScore)
      } catch (e) {
        console.warn('Failed to load revolution state from Firebase:', e)
      }
    }

    load()
    return () => { cancelled = true }
  }, [auth.user])

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // per-ring colors (HSL hues)
  const ringColors = Array.from({ length: numberOfRings }, (_, i) => `hsl(${(i * 360) / numberOfRings},70%,55%)`)

  const spinDuration = 2 // seconds for one full rotation
  // threshold in revolutions/sec above which we show static circle
  const FAST_REVS_PER_SEC = 5
  // cost growth per cumulative purchase ( >1 increases steepness ). Tweak to tune difficulty.
  const COST_GROWTH = 1.2
  // Responsive canvas size: use viewport dimensions with padding consideration
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  // Account for padding and ensure canvas fits within viewport
  const canvasSize = Math.min(windowSize.width - 40, windowSize.height * 0.5, 500)
  // Refs and state for dynamic skill-tree SVG connections
  const treeContainerRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const nodeKeys = ['node1','node2','node3a','node3b','node3c','node4','node5','node6a','node6b','node6c','node7','node8','node9','node10','node11','node12','node13','node14']
  // Unified color palette by effect category. Map each node to an effect,
  // then generate `nodeColors` from that mapping so all nodes of the same
  // effect share the same color (e.g. Rotate = blue, Score = purple).
  const effectColors: Record<string, string> = {
    score: '#8e44ad',      // purple (Score)
    rotate: '#2980b9',     // blue (Rotate)
    automation: '#c0392b', // red (Automation / unlocks)
    boost: '#d35400',      // orange (Boost / power)
    strong: '#16a085',     // teal (Strength)
    ultimate: '#f1c40f',   // gold (Ultimate)
    path: '#e67e22',       // salmon/orange (extended path)
    both: '#6c5ce7',       // indigo (both Score+Rotate)
    medal: '#2ecc71',      // green (Medal-related)
  }

  const nodeEffect: Record<string, string> = {
    node1: 'score',
    node2: 'rotate',
    node3a: 'automation',
    node3b: 'score',
    node3c: 'rotate',
    node4: 'boost',
    node5: 'rotate',
    node6a: 'boost',
    node6b: 'score',
    node6c: 'strong',
    node7: 'ultimate',
    node8: 'score',
    node9: 'rotate',
    node10: 'automation',
    node11: 'score',
    node12: 'rotate',
    node13: 'both',
    node14: 'medal',
  }

  const nodeColors: Record<string, string> = Object.fromEntries(
    nodeKeys.map((k) => [k, effectColors[nodeEffect[k] || 'path'] || '#888'])
  ) as Record<string, string>
  const [nodeCenters, setNodeCenters] = useState<Record<string, { x: number; y: number }>>({})
  const [svgSize, setSvgSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })

  const connections: Array<[string, string, string]> = [
    ['node1','node2','#888'],
    ['node2','node3a','#c06'], ['node2','node3b','#06c'], ['node2','node3c','#0c6'],
    ['node3a','node4','#c06'], ['node3b','node4','#06c'], ['node3c','node4','#0c6'],
    ['node4','node5','#888'],
    ['node5','node6a','#c60'], ['node5','node6b','#f0c'], ['node5','node6c','#09c'],
    ['node6a','node7','#c60'], ['node6b','node7','#f0c'], ['node6c','node7','#09c'],
    ['node7','node8','#f95'], ['node8','node9','#f95'], ['node9','node10','#f95'], ['node10','node11','#f95'], ['node11','node12','#f95'], ['node12','node13','#f95'], ['node13','node14','#f95'],
  ]
  const trailRefs = useRef<(HTMLCanvasElement | null)[]>(Array(numberOfRings).fill(null))
  const overlayRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const lastWholeRef = useRef<number[]>(Array(numberOfRings).fill(0))
  const lastPosRef = useRef<({ x: number; y: number } | null)[]>(Array(numberOfRings).fill(null))
  // refs to hold latest state values so the RAF loop sees updates without re-creating
  const speedLevelsRef = useRef<number[]>(speedLevels)
  
  const prestigeRef = useRef<number>(prestigePoints)
  const prestigeStrengthRef = useRef<number>(prestigeStrength)
  const promotionLevelRef = useRef<number>(promotionLevel)
  const ipUpgradesRef = useRef(ipUpgrades)
  // prestige multiplier: n points => ×n (minimum ×1)
  // we compute `prestigeMultiplier = Math.max(1, prestige)` where `prestige` is number of points
  // keep refs in sync when React state updates
  useEffect(() => {
    // update node positions when overlay opens/resizes/scrolls
    function updatePositions() {
      const container = treeContainerRef.current
      if (!container) return
      const containerRect = container.getBoundingClientRect()
      // compute width/height based on measured node positions so the
      // scrollable area always covers absolutely-positioned nodes
      const measuredWidth = Math.max(container.scrollWidth, container.clientWidth)
      const measuredHeight = Math.max(container.scrollHeight, container.clientHeight)
      let width = measuredWidth
      let height = measuredHeight
      const centers: Record<string, { x: number; y: number }> = {}
      for (const key of nodeKeys) {
        const el = nodeRefs.current[key]
        if (!el) continue
        const r = el.getBoundingClientRect()
        const cx = r.left - containerRect.left + container.scrollLeft + r.width / 2
        const cy = r.top - containerRect.top + container.scrollTop + r.height / 2
        centers[key] = { x: Math.round(cx), y: Math.round(cy) }
        // ensure container width covers this node's right edge
        const nodeRight = Math.round(r.right - containerRect.left + container.scrollLeft)
        if (nodeRight + 24 > width) width = nodeRight + 24
        const nodeBottom = Math.round(r.bottom - containerRect.top + container.scrollTop)
        if (nodeBottom + 24 > height) height = nodeBottom + 24
      }
      setNodeCenters(centers)
      setSvgSize({ width, height })

      // apply a minimum width on the container so the browser's scroll area
      // includes the far-right nodes (fixes partial-scroll issue)
      try {
        container.style.minWidth = `${Math.max(width, 1400)}px`
      } catch (e) {
        // ignore in non-DOM environments
      }
    }

    let resizeTimer: any = null
    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(updatePositions, 50)
    }

    window.addEventListener('resize', onResize)
    const container = treeContainerRef.current
    if (container) container.addEventListener('scroll', updatePositions)

    // observe mutations/DOM changes that might move nodes (font load / layout shifts)
    const mo = new MutationObserver(() => updatePositions())
    if (container) mo.observe(container, { childList: true, subtree: true, attributes: true })

    // call once to initialise
    updatePositions()

    return () => {
      window.removeEventListener('resize', onResize)
      if (container) container.removeEventListener('scroll', updatePositions)
      if (mo) mo.disconnect()
      if (resizeTimer) clearTimeout(resizeTimer)
    }
  }, [showIpShop])

  useEffect(() => {
    speedLevelsRef.current = speedLevels
  }, [speedLevels])
  
  useEffect(() => {
    prestigeRef.current = prestigePoints
  }, [prestigePoints])
  useEffect(() => {
    prestigeStrengthRef.current = prestigeStrength
  }, [prestigeStrength])
  useEffect(() => {
    promotionLevelRef.current = promotionLevel
  }, [promotionLevel])
  useEffect(() => {
    ipUpgradesRef.current = ipUpgrades
  }, [ipUpgrades])
  // Auto-promotion: if node10 (Auto Promo) is purchased, automatically perform Promotion
  // when the player has enough prestige points for the next promotion level.
  useEffect(() => {
    if ((ipUpgrades.node10 || 0) < 1) return
    try {
      const nextReq = PROMO_THRESHOLD * ((promotionLevelRef.current || promotionLevel || 0) + 1)
      // only auto-run promotion if user enabled auto-promotion
      if (autoPromoRef.current && isFinite(prestigePoints) && prestigePoints >= nextReq) {
        doPromotion()
      }
    } catch (e) {
      // ignore errors from calling doPromotion unexpectedly
    }
  }, [prestigePoints, ipUpgrades.node10, promotionLevel])

  // Auto-prestige trigger: when score changes, if autoPromo is enabled and node10 purchased,
  // check whether performing a Prestige now would make Promotion available. If so, automatically
  // call doPrestige() so that the Promotion effect (handled by the above effect) can run immediately.
  useEffect(() => {
    if ((ipUpgrades.node10 || 0) < 1) return
    if (!autoPromoRef.current) return
    try {
      const gainIfPrestige = computePrestigeGain(score)
      if (!isFinite(gainIfPrestige) || gainIfPrestige <= 0) return
      const predictedPointsAfter = (prestigePoints || 0) + gainIfPrestige
      const nextPromoReq = PROMO_THRESHOLD * ((promotionLevelRef.current || promotionLevel || 0) + 1)
      if (predictedPointsAfter >= nextPromoReq) {
        // perform prestige now; the existing auto-promotion effect will detect
        // the updated prestigePoints and run doPromotion()
        doPrestige()
      }
    } catch (e) {
      // ignore
    }
  }, [score, prestigePoints, ipUpgrades.node10, promotionLevel])
  // unlock auto-buy when node3a is purchased
  useEffect(() => {
    if ((ipUpgrades.node3a || 0) >= 1) {
      // enable auto-buy once unlocked if it isn't already enabled
      if (!autoBuy) setAutoBuy(true)
    }
  }, [ipUpgrades.node3a])
  const autoBuyRef = useRef<boolean>(autoBuy)
  useEffect(() => {
    autoBuyRef.current = autoBuy
  }, [autoBuy])
  // auto-promotion toggle ref
  const autoPromoRef = useRef<boolean>(autoPromo)
  useEffect(() => {
    autoPromoRef.current = autoPromo
  }, [autoPromo])
  const [selectedSkill, setSelectedSkill] = useState<IPUpgradeType | null>(null)

  function getSkillTitle(type: IPUpgradeType) {
    const titles: Record<IPUpgradeType, string> = {
      node1: 'Score', node2: 'Rotate', node3a: 'Automation', node3b: 'Score Multi', node3c: 'Rotate', node4: 'Boost', node5: 'Rotate+', node6a: 'Mega', node6b: 'Score+', node6c: 'Strong', node7: 'Ultimate', node8: 'Score', node9: 'Rotate', node10: 'Auto Promo', node11: 'Score+', node12: 'Rotate+', node13: 'Both', node14: 'Medal Amplifier'
    }
    return titles[type]
  }

  function getSkillEffectText(type: IPUpgradeType) {
    switch (type) {
      case 'node3a': return `自動購入を解放：『Auto』チェックが使用可能になります（ON/OFF）`
      case 'node1': return `効果: 合計 ×${formatForDisplay(Math.pow(2, ipUpgrades[type]), v => v.toFixed(2))}（レベルごとに ×2）`
      case 'node2': return `効果: 合計 ×${formatForDisplay(Math.pow(1.5, ipUpgrades[type]), v => v.toFixed(2))}（レベルごとに ×1.5）`
      case 'node3b': return `効果: 合計 ×${formatForDisplay(Math.pow(1.5, ipUpgrades[type]), v => v.toFixed(2))}（レベルごとに ×1.5）`
      case 'node3c': return `効果: 合計 ×${formatForDisplay(Math.pow(1.5, ipUpgrades[type]), v => v.toFixed(2))}（回転速度：レベルごとに ×1.5）`
      case 'node4': return `効果: 合計 ×${formatForDisplay(Math.pow(1.25, ipUpgrades[type]), v => v.toFixed(2))}（回転速度・スコア 共に レベルごとに ×1.25）`
      case 'node5': return `効果: 合計 ×${formatForDisplay(Math.pow(2, ipUpgrades[type]), v => v.toFixed(2))}（レベルごとに ×2）`
      case 'node6a': return `効果: 合計 ×${formatForDisplay(Math.pow(3, ipUpgrades[type]), v => v.toFixed(2))}（レベルごとに ×3）`
      case 'node6b': return `効果: 合計 ×${formatForDisplay(Math.pow(1.4, ipUpgrades[type]), v => v.toFixed(2))}（レベルごとに ×1.4）`
      case 'node6c': return `効果: 合計 ×${formatForDisplay(Math.pow(3, ipUpgrades[type]), v => v.toFixed(2))}（プレステージ強度：レベルごとに ×3）`
      case 'node7': return `効果: 合計 ×${formatForDisplay(Math.pow(5, ipUpgrades[type]), v => v.toFixed(2))}（レベルごとに ×5）`
      case 'node8': return `スコア：合計 ×${formatForDisplay(Math.pow(1.1, ipUpgrades[type]), v => v.toFixed(2))}（レベルごとに ×1.1）`
      case 'node9': return `回転速度：合計 ×${formatForDisplay(Math.pow(1.1, ipUpgrades[type]), v => v.toFixed(2))}（レベルごとに ×1.1）`
    }
  }
  // allow temporarily pausing the RAF loop during state resets (promotion / prestige)
  const pauseLoopRef = useRef<boolean>(false)
  // guard to ignore any queued score updates while performing a reset
  const resetRef = useRef<boolean>(false)
  // automatic purchase effect: when score updates and autoBuy enabled,
  // attempt to purchase as many affordable speed upgrades as possible
  useEffect(() => {
    if (!autoBuy) return
    let localScore = score
    const newLevels = [...speedLevels]
    const newPurch = [...purchaseCounts]
    let changed = false
    // Try buying upgrades starting from inner rings outward
    for (let i = 0; i < numberOfRings; i++) {
      while (true) {
        const levelAt = newLevels[i] || 0
        if (levelAt >= 100) break // respect visible max level
          const baseCost = 1
          // use the locally-updated purchase counts so repeated buys in this loop increase cost
          const purch = newPurch[i] || 0
          // next cost computed from cumulative purchases with multiplicative growth
          const cost = baseCost * Math.pow(100, i) * Math.pow(COST_GROWTH, purch)
        if (localScore >= cost) {
          localScore = +(localScore - cost).toFixed(8)
          newLevels[i] = Math.min(levelAt + 1, 100)
          newPurch[i] = purch + 1
          changed = true
        } else {
          break
        }
      }
    }
    if (changed) {
      setSpeedLevels(newLevels)
      setPurchaseCounts(newPurch)
      setScore(localScore)
    }
  }, [score, autoBuy, speedLevels, purchaseCounts])
  
  // purchase an upgrade for ring i: consumes score and increases speed level
  function buyUpgrade(i: number) {
    const purch = purchaseCounts[i] || 0
      const baseCost = 1
    const cost = baseCost * Math.pow(100, i) * Math.pow(COST_GROWTH, purch)
    if (score >= cost) {
      setScore((s) => {
        if (resetRef.current) return s
        return +(s - cost).toFixed(4)
      })
      setSpeedLevels((arr) => {
        const copy = [...arr]
        copy[i] = Math.min((copy[i] || 0) + 1, 100) // cap visible level at 100
        return copy
      })
      setPurchaseCounts((arr) => {
        const copy = [...arr]
        copy[i] = (copy[i] || 0) + 1
        return copy
      })
    }
  }

  
  useEffect(() => {
    const trails = trailRefs.current
    const overlay = overlayRef.current
    if (!overlay) return
    // ensure all trail canvases exist
    if (!trails || trails.length !== numberOfRings || trails.some((t) => t == null)) return

    // Use 1:1 canvas pixel size (no DPR scaling) so lineWidth maps directly to CSS pixels.
    const w = canvasSize
    const h = canvasSize
    for (let i = 0; i < numberOfRings; i++) {
      const t = trails[i]!
      t.width = w
      t.height = h
      t.style.width = `${w}px`
      t.style.height = `${h}px`
    }
    overlay.width = w
    overlay.height = h
    overlay.style.width = `${w}px`
    overlay.style.height = `${h}px`

    const ctxTrails = trails.map((t) => t!.getContext('2d')!)
    const ctxOverlay = overlay.getContext('2d')!

    const cx = w / 2
    const cy = h / 2
    // Adjust radius and spacing to fit within canvas with proper padding
    const maxRingRadius = (numberOfRings - 1) * 16 + 40 + 8 // last ring radius + stroke width
    const scale = Math.min(1, (Math.min(w, h) / 2 - 20) / maxRingRadius)
    const baseRadius = 40 * scale
    const spacing = 16 * scale
    // keep the inner ring's angular period as the reference (spinDuration)
    // compute a constant linear speed (pixels/sec) based on the inner ring
    const linearSpeed = (2 * Math.PI * baseRadius) / spinDuration

    function drawSegment(i: number, x: number, y: number, color: string, width = 2) {
      const last = lastPosRef.current[i]
      const ctx = ctxTrails[i]
      if (last) {
        ctx.beginPath()
        ctx.moveTo(last.x, last.y)
        ctx.lineTo(x, y)
        ctx.strokeStyle = color
        // use width directly (canvas is 1:1 with CSS pixels)
        ctx.lineWidth = width
        ctx.lineJoin = 'round'
        ctx.lineCap = 'round'
        ctx.stroke()
      }
      lastPosRef.current[i] = { x, y }
    }

    function drawOverlay(x: number, y: number, color: string) {
      // draw a translucent small blob on the overlay using a lighter HSLA
      ctxOverlay.beginPath()
      // extract hue from the ring color (which is `hsl(h,s%,l%)`)
      const m = color.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/)
      const hue = m ? m[1] : '220'
      // use a lighter lightness and low alpha so blobs are colored but not dark
      ctxOverlay.fillStyle = `hsla(${hue},70%,70%,0.16)`
      ctxOverlay.arc(x, y, 9, 0, Math.PI * 2)
      ctxOverlay.fill()
      ctxOverlay.lineWidth = 3
      ctxOverlay.strokeStyle = `hsla(${hue},70%,50%,0.25)`
      ctxOverlay.stroke()
    }

    function loop(nowMs: number) {
      if (!startRef.current) startRef.current = nowMs
      const elapsed = (nowMs - startRef.current) / 1000

      // if loop is paused (e.g. during promotion reset), skip processing this frame
      if (pauseLoopRef.current) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      // clear overlay per frame
      ctxOverlay.clearRect(0, 0, w, h)
      // subtle globalComposite to avoid full continuous ring: we keep overlay additive but trail is persistent dots

      // for each ring, compute position and draw, and check per-ring full rotations
      for (let i = 0; i < numberOfRings; i++) {
        const radius = baseRadius + i * spacing
        // compute per-ring angular velocity so tangential (linear) speed is constant
        // apply per-ring multiplier: only the red ring (index 0) is active initially
        const baseMult = i === 0 ? 1 : 0
        const multiplier = baseMult + (speedLevelsRef.current[i] || 0) * 0.125
        const angVel = (linearSpeed * multiplier) / radius // radians per second
        // start from up (-90deg) and rotate clockwise (increasing angle)
        const angle = -Math.PI / 2 + angVel * elapsed
        const x = cx + Math.cos(angle) * radius
        const y = cy + Math.sin(angle) * radius

        const color = ringColors[i]

        // draw: if very fast (rotations/sec), show a static ring instead of a moving dot to avoid artifacts
        const segWidth = 8
        const revolutionsPerSec = angVel / (Math.PI * 2)
        const isFast = revolutionsPerSec > FAST_REVS_PER_SEC
        if (isFast) {
          // draw a static stroked circle onto the trails canvas for this ring
          const ctx = ctxTrails[i]
          ctx.clearRect(0, 0, w, h)
          ctx.beginPath()
          ctx.arc(cx, cy, radius, 0, Math.PI * 2)
          ctx.strokeStyle = color
          ctx.lineWidth = segWidth
          ctx.lineJoin = 'round'
          ctx.lineCap = 'round'
          ctx.stroke()
          // ensure overlay doesn't try to draw the moving blob
          lastPosRef.current[i] = null
        } else {
          // draw continuous segment from previous position to current (per-frame)
          drawSegment(i, x, y, color, segWidth)
          // draw the transparent moving object on overlay (all rings)
          drawOverlay(x, y, color)
        }

        // per-ring full rotations (how many full revolutions this ring has completed)
        const revolutions = (angVel * elapsed) / (Math.PI * 2)
        const whole = Math.floor(revolutions)
        if (whole > lastWholeRef.current[i]) {
          // calculate how many complete rotations happened since last update
          const rotationsSinceLastUpdate = whole - lastWholeRef.current[i]
          
          // clear only this ring's trail canvas and reset its last position
          const ctx = ctxTrails[i]
          ctx.clearRect(0, 0, w, h)
          lastPosRef.current[i] = null
          lastWholeRef.current[i] = whole

          // increment only this ring's rot value and add its product to score
          // determine increment amount (base 0.01, scaled by ascension multiplier and prestige)
          // multiplier derived from accumulated prestigeStrength (log-scaled)
          // prestige multiplier computed with staged soft-caps
          const prestigePointsVal = prestigeRef.current || 0
          const prestigeMultiplier = computePrestigeMultiplierFromPoints(prestigePointsVal)
          // promotion level derived from prestige points; increases the per-rotation increment
          // use purchased promotion level (persisted) rather than points-derived level
          const promotionLevelVal = promotionLevelRef.current || 0
          // promotion multiplies multi-gain by 10 per level
          const promotionMultiplier = Math.pow(PROMO_MULT_PER_LEVEL, promotionLevelVal)
          // apply IP rotation speed boost from ref
          const n2 = Math.pow(1.5, ipUpgradesRef.current.node2 || 0)
          const n5 = Math.pow(2, ipUpgradesRef.current.node5 || 0)
          const n7 = Math.pow(5, ipUpgradesRef.current.node7 || 0)
          const n4 = Math.pow(1.25, ipUpgradesRef.current.node4 || 0)
          const n3c = Math.pow(1.5, ipUpgradesRef.current.node3c || 0)
          const n9 = Math.pow(1.1, ipUpgradesRef.current.node9 || 0)
          const n12 = Math.pow(1.15, ipUpgradesRef.current.node12 || 0)
          const n13 = Math.pow(2, ipUpgradesRef.current.node13 || 0)
          // include node3c as a small per-level rotation speed boost (×1.1 per level)
          const ipRotationBoost = n2 * n5 * n7 * n4 * n3c * n9 * n12 * n13
          const n3b = Math.pow(1.5, ipUpgradesRef.current.node3b || 0)
          const inc = 0.01 * prestigeMultiplier * promotionMultiplier * ipRotationBoost * n3b * n4
          setRotValues((arr) => {
            const prod = arr.reduce((a, b) => a * b, 1)
            // apply prestige multiplier to score addition (1 + accumulated log-strength)
            const prestigeMul = prestigeMultiplier
            // apply IP score multiplier from ref
              const n1 = Math.pow(2, ipUpgradesRef.current.node1 || 0)
              const n6a = Math.pow(3, ipUpgradesRef.current.node6a || 0)
              const n6bscore = Math.pow(1.4, ipUpgradesRef.current.node6b || 0)
              const n7sm = Math.pow(5, ipUpgradesRef.current.node7 || 0)
              const n3bscore = Math.pow(1.5, ipUpgradesRef.current.node3b || 0)
              const n4score = Math.pow(1.25, ipUpgradesRef.current.node4 || 0)
              const n8 = Math.pow(1.1, ipUpgradesRef.current.node8 || 0)
              const n11 = Math.pow(1.15, ipUpgradesRef.current.node11 || 0)
              const ipScoreMult = n1 * n6a * n6bscore * n7sm * n3bscore * n4score * n8 * n11 * n13
            // multiply score by the number of rotations that occurred
            setScore((s) => {
              if (resetRef.current) return 0
              return s + prod * prestigeMul * ipScoreMult * rotationsSinceLastUpdate
            })
            // multiply increment by the number of rotations that occurred
            return arr.map((v, idx) => (idx === i ? +((v + inc * rotationsSinceLastUpdate).toFixed(2)) : v))
          })
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // predicted multiplier if the player prestiges right now
  const predictedGainNow = computePrestigeGain(score)
  const predictedPointsAfter = (prestigePoints || 0) + predictedGainNow
  const predictedMulNow = computePrestigeMultiplierFromPoints(predictedPointsAfter)
  const predictedPromotionAvailable = predictedPointsAfter >= PROMO_THRESHOLD * ((promotionLevel || 0) + 1)
  const predictedPromotionMultiplier = Math.pow(PROMO_MULT_PER_LEVEL, (promotionLevel || 0) + (predictedPromotionAvailable ? 1 : 0))

  return (
    <>
      {/* Debug button removed */}
      {/* Infinity Upgrades Full Screen Overlay */}
      {showIpShop && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh', 
          background: 'linear-gradient(135deg, #f9f0ff, #fff0f9)', 
          zIndex: 9999,
          overflow: 'auto',
          padding: '20px'
        }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
              <h2 style={{ margin: 0, color: '#90c', fontSize: '2rem' }}>∞ Infinity Skill Tree</h2>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {hasReachedInfinity ? (
                    <div style={{ color: '#c0f', fontWeight: 700, fontSize: '1.5rem' }}>IP: {formatForDisplay(infinityPoints, v => v.toLocaleString())}</div>
                  ) : null}
                  {/* Debug IP controls removed in production build */}
                </div>
                <button onClick={() => setShowIpShop(false)} style={{ padding: '0.6em 1.2em', fontSize: '1.1rem' }}>Close</button>
              </div>
            </div>
            
            {selectedSkill && (
              <div style={{ position: 'fixed', right: 40, bottom: 40, width: 320, maxHeight: '50vh', overflowY: 'auto', background: 'white', padding: 12, borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 10001 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{getSkillTitle(selectedSkill)}</div>
                  <button onClick={() => setSelectedSkill(null)} style={{ padding: '0.2em 0.6em' }}>×</button>
                </div>
                <div style={{ marginBottom: 8, color: '#444' }}>{getSkillEffectText(selectedSkill)}</div>
                {(() => {
                  const cur = selectedSkill ? (ipUpgrades[selectedSkill] || 0) : 0
                  const max = selectedSkill ? getMaxLevel(selectedSkill) : 0
                  const cost = selectedSkill ? getIPUpgradeCost(selectedSkill) : 0
                  const atMax = cur >= max
                  return (
                    <>
                      <div style={{ marginBottom: 8, color: '#666' }}>Lv{cur} / {max} {atMax ? <span style={{ color: '#0a0', fontWeight: 700, marginLeft: 8 }}>MAX</span> : null}</div>
                      {!atMax && <div style={{ marginBottom: 12, fontWeight: 700 }}>Cost: {cost} IP</div>}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => { if (selectedSkill) buyIPUpgrade(selectedSkill) }}
                          disabled={!selectedSkill || !isSkillUnlocked(selectedSkill) || infinityPoints < cost || atMax}
                          style={{ flex: 1, padding: '0.6em 0.8em', fontSize: '1rem' }}
                        >
                          {atMax ? 'MAX' : 'Upgrade'}
                        </button>
                        <button onClick={() => setSelectedSkill(null)} style={{ padding: '0.6em 0.8em' }}>Close</button>
                      </div>
                    </>
                  )
                })()}
              </div>
            )}

            {/* Horizontal Skill Tree Layout */}
            <div ref={(el) => { treeContainerRef.current = el }} style={{ position: 'relative', minWidth: 1400, padding: '60px 20px', overflowX: 'auto', height: 'calc(100vh - 200px)', boxSizing: 'border-box' }}>

              {/* Connection Lines - SVG overlay (dynamic: uses measured node centers) */}
              <svg
                ref={(el) => { svgRef.current = el }}
                style={{ position: 'absolute', top: 0, left: 0, width: svgSize.width || '100%', height: svgSize.height || '100%', pointerEvents: 'none', zIndex: 0 }}
                viewBox={`0 0 ${svgSize.width || 1400} ${svgSize.height || 400}`}
                preserveAspectRatio="xMinYMin"
              >
                <defs>
                  {connections.map(([a, b, color], idx) => {
                    const pa = nodeCenters[a]
                    const pb = nodeCenters[b]
                    if (!pa || !pb) return null
                    const ca = nodeColors[a] || color || '#888'
                    const cb = nodeColors[b] || color || '#888'
                    return (
                      <linearGradient
                        id={`grad-${idx}`}
                        key={`g-${idx}`}
                        gradientUnits="userSpaceOnUse"
                        x1={pa.x}
                        y1={pa.y}
                        x2={pb.x}
                        y2={pb.y}
                      >
                        <stop offset="0%" stopColor={ca} />
                        <stop offset="100%" stopColor={cb} />
                      </linearGradient>
                    )
                  })}
                </defs>

                {connections.map(([a, b], idx) => {
                  const pa = nodeCenters[a]
                  const pb = nodeCenters[b]
                  if (!pa || !pb) return null
                  return (
                    <line
                      key={idx}
                      x1={pa.x}
                      y1={pa.y}
                      x2={pb.x}
                      y2={pb.y}
                      stroke={`url(#grad-${idx})`}
                      strokeWidth={4}
                      opacity={0.8}
                      strokeLinecap="round"
                    />
                  )
                })}
              </svg>

              {/* Skill Nodes - Positioned Horizontally */}
              
              {/* Row: nodes at y=130 (main path) */}
              <div ref={(el) => { nodeRefs.current['node1'] = el }} style={{ position: 'absolute', left: '20px', top: '160px', width: '80px', height: '80px', zIndex: 2 }}>
                <div style={{ 
                  boxSizing: 'border-box',
                  width: '100%',
                  height: '100%',
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: isSkillUnlocked('node1') ? 'rgba(255,255,255,0.95)' : 'rgba(200,200,200,0.3)', 
                  borderRadius: 8, 
                  border: isSkillUnlocked('node1') ? `3px solid ${nodeColors.node1}` : '3px dashed #999',
                  boxShadow: '0 6px 12px rgba(0,0,0,0.2)'
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, color: nodeColors.node1, fontSize: '1.1rem' }}>Score</div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: 8 }}>{/* only header + open button per design */}</div>
                  <button
                    onClick={() => setSelectedSkill('node1')}
                    disabled={!isSkillUnlocked('node1')}
                    style={{ padding: '0.4em 0.8em', fontSize: '0.85rem', width: '100%' }}
                  >
                    Open
                  </button>
                </div>
              </div>

              <div ref={(el) => { nodeRefs.current['node10'] = el }} style={{ position: 'absolute', left: '1630px', top: '160px', width: '80px', height: '80px', zIndex: 2 }}>
                <div style={{
                  boxSizing: 'border-box',
                  width: '100%',
                  height: '100%',
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: isSkillUnlocked('node10') ? 'rgba(255,255,255,0.95)' : 'rgba(200,200,200,0.3)',
                  borderRadius: 8,
                  border: isSkillUnlocked('node10') ? `3px solid ${nodeColors.node10}` : '3px dashed #999',
                  boxShadow: isSkillUnlocked('node10') ? '0 6px 12px rgba(0,0,0,0.2)' : 'none',
                  opacity: isSkillUnlocked('node10') ? 1 : 0.85
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, color: nodeColors.node10, fontSize: '1.1rem' }}>Auto Promo</div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: 8 }}></div>
                  <button onClick={() => setSelectedSkill('node10')} disabled={!isSkillUnlocked('node10')} style={{ padding: '0.4em 0.8em', fontSize: '0.85rem', width: '100%' }}>Open</button>
                </div>
              </div>

              <div ref={(el) => { nodeRefs.current['node11'] = el }} style={{ position: 'absolute', left: '1790px', top: '160px', width: '80px', height: '80px', zIndex: 2 }}>
                <div style={{
                  boxSizing: 'border-box',
                  width: '100%',
                  height: '100%',
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: isSkillUnlocked('node11') ? 'rgba(255,255,255,0.95)' : 'rgba(200,200,200,0.3)',
                  borderRadius: 8,
                  border: isSkillUnlocked('node11') ? `3px solid ${nodeColors.node11}` : '3px dashed #999',
                  boxShadow: isSkillUnlocked('node11') ? '0 6px 12px rgba(0,0,0,0.2)' : 'none',
                  opacity: isSkillUnlocked('node11') ? 1 : 0.85
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, color: nodeColors.node11, fontSize: '1.1rem' }}>Score+</div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: 8 }}></div>
                  <button onClick={() => setSelectedSkill('node11')} disabled={!isSkillUnlocked('node11')} style={{ padding: '0.4em 0.8em', fontSize: '0.85rem', width: '100%' }}>Open</button>
                </div>
              </div>

              <div ref={(el) => { nodeRefs.current['node12'] = el }} style={{ position: 'absolute', left: '1950px', top: '160px', width: '80px', height: '80px', zIndex: 2 }}>
                <div style={{
                  boxSizing: 'border-box',
                  width: '100%',
                  height: '100%',
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: isSkillUnlocked('node12') ? 'rgba(255,255,255,0.95)' : 'rgba(200,200,200,0.3)',
                  borderRadius: 8,
                  border: isSkillUnlocked('node12') ? `3px solid ${nodeColors.node12}` : '3px dashed #999',
                  boxShadow: isSkillUnlocked('node12') ? '0 6px 12px rgba(0,0,0,0.2)' : 'none',
                  opacity: isSkillUnlocked('node12') ? 1 : 0.85
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, color: nodeColors.node12, fontSize: '1.1rem' }}>Rotate+</div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: 8 }}></div>
                  <button onClick={() => setSelectedSkill('node12')} disabled={!isSkillUnlocked('node12')} style={{ padding: '0.4em 0.8em', fontSize: '0.85rem', width: '100%' }}>Open</button>
                </div>
              </div>

              <div ref={(el) => { nodeRefs.current['node13'] = el }} style={{ position: 'absolute', left: '2110px', top: '160px', width: '80px', height: '80px', zIndex: 2 }}>
                <div style={{
                  boxSizing: 'border-box',
                  width: '100%',
                  height: '100%',
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: isSkillUnlocked('node13') ? 'rgba(255,255,255,0.95)' : 'rgba(200,200,200,0.3)',
                  borderRadius: 8,
                  border: isSkillUnlocked('node13') ? `3px solid ${nodeColors.node13}` : '3px dashed #999',
                  boxShadow: isSkillUnlocked('node13') ? '0 6px 12px rgba(0,0,0,0.2)' : 'none',
                  opacity: isSkillUnlocked('node13') ? 1 : 0.85
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, color: nodeColors.node13, fontSize: '1.1rem' }}>Both</div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: 8 }}></div>
                  <button onClick={() => setSelectedSkill('node13')} disabled={!isSkillUnlocked('node13')} style={{ padding: '0.4em 0.8em', fontSize: '0.85rem', width: '100%' }}>Open</button>
                </div>
              </div>
              <div ref={(el) => { nodeRefs.current['node14'] = el }} style={{ position: 'absolute', left: '2270px', top: '160px', width: '80px', height: '80px', zIndex: 2 }}>
                <div style={{
                  boxSizing: 'border-box',
                  width: '100%',
                  height: '100%',
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: isSkillUnlocked('node14') ? 'rgba(255,255,255,0.95)' : 'rgba(200,200,200,0.3)',
                  borderRadius: 8,
                  border: isSkillUnlocked('node14') ? `3px solid ${nodeColors.node14}` : '3px dashed #999',
                  boxShadow: isSkillUnlocked('node14') ? '0 6px 12px rgba(0,0,0,0.2)' : 'none',
                  opacity: isSkillUnlocked('node14') ? 1 : 0.85
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, color: nodeColors.node14, fontSize: '1.1rem' }}>Medal</div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: 8 }}></div>
                  <button onClick={() => setSelectedSkill('node14')} disabled={!isSkillUnlocked('node14')} style={{ padding: '0.4em 0.8em', fontSize: '0.85rem', width: '100%' }}>Open</button>
                </div>
              </div>
              <div ref={(el) => { nodeRefs.current['node2'] = el }} style={{ position: 'absolute', left: '150px', top: '160px', width: '80px', height: '80px', zIndex: 2 }}>
                <div style={{ 
                  boxSizing: 'border-box',
                  width: '100%',
                  height: '100%',
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: isSkillUnlocked('node2') ? 'rgba(255,255,255,0.95)' : 'rgba(200,200,200,0.3)', 
                  borderRadius: 8, 
                  border: isSkillUnlocked('node2') ? `3px solid ${nodeColors.node2}` : '3px dashed #999',
                  boxShadow: isSkillUnlocked('node2') ? '0 6px 12px rgba(0,0,0,0.2)' : 'none',
                  opacity: isSkillUnlocked('node2') ? 1 : 0.85
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, color: nodeColors.node2, fontSize: '1.1rem' }}>Rotate</div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: 8 }}></div>
                  <button
                    onClick={() => setSelectedSkill('node2')}
                    disabled={!isSkillUnlocked('node2')}
                    style={{ padding: '0.4em 0.8em', fontSize: '0.85rem', width: '100%' }}
                  >
                    Open
                  </button>
                </div>
              </div>

              {/* First Branch - node3a/b/c */}
              <div ref={(el) => { nodeRefs.current['node3a'] = el }} style={{ position: 'absolute', left: '340px', top: '0px', width: '80px', height: '80px', zIndex: 2 }}>
                <div style={{ 
                  boxSizing: 'border-box',
                  width: '100%',
                  height: '100%',
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: isSkillUnlocked('node3a') ? 'rgba(255,255,255,0.95)' : 'rgba(200,200,200,0.3)', 
                  borderRadius: 8, 
                  border: isSkillUnlocked('node3a') ? `3px solid ${nodeColors.node3a}` : '3px dashed #999',
                  boxShadow: isSkillUnlocked('node3a') ? '0 6px 12px rgba(0,0,0,0.2)' : 'none',
                  opacity: isSkillUnlocked('node3a') ? 1 : 0.85
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, color: nodeColors.node3a, fontSize: '1.1rem' }}>Automation</div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: 8 }}></div>
                  <button
                    onClick={() => setSelectedSkill('node3a')}
                    disabled={!isSkillUnlocked('node3a')}
                    style={{ padding: '0.4em 0.8em', fontSize: '0.85rem', width: '100%' }}
                  >
                    Open
                  </button>
                </div>
              </div>

              <div ref={(el) => { nodeRefs.current['node3b'] = el }} style={{ position: 'absolute', left: '340px', top: '160px', width: '80px', height: '80px', zIndex: 2 }}>
                <div style={{ 
                  boxSizing: 'border-box',
                  width: '100%',
                  height: '100%',
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: isSkillUnlocked('node3b') ? 'rgba(255,255,255,0.95)' : 'rgba(200,200,200,0.3)', 
                  borderRadius: 8, 
                  border: isSkillUnlocked('node3b') ? `3px solid ${nodeColors.node3b}` : '3px dashed #999',
                  boxShadow: isSkillUnlocked('node3b') ? '0 6px 12px rgba(0,0,0,0.2)' : 'none',
                  opacity: isSkillUnlocked('node3b') ? 1 : 0.85
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, color: nodeColors.node3b, fontSize: '1.1rem' }}>Score Multi</div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: 8 }}></div>
                  <button
                    onClick={() => setSelectedSkill('node3b')}
                    disabled={!isSkillUnlocked('node3b')}
                    style={{ padding: '0.4em 0.8em', fontSize: '0.85rem', width: '100%' }}
                  >
                    Open
                  </button>
                </div>
              </div>

              <div ref={(el) => { nodeRefs.current['node3c'] = el }} style={{ position: 'absolute', left: '340px', top: '320px', width: '80px', height: '80px', zIndex: 2 }}>
                <div style={{ 
                  boxSizing: 'border-box',
                  width: '100%',
                  height: '100%',
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: isSkillUnlocked('node3c') ? 'rgba(255,255,255,0.95)' : 'rgba(200,200,200,0.3)', 
                  borderRadius: 8, 
                  border: isSkillUnlocked('node3c') ? `3px solid ${nodeColors.node3c}` : '3px dashed #999',
                  boxShadow: isSkillUnlocked('node3c') ? '0 6px 12px rgba(0,0,0,0.2)' : 'none',
                  opacity: isSkillUnlocked('node3c') ? 1 : 0.85
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, color: nodeColors.node3c, fontSize: '1.1rem' }}>Rotate</div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: 8 }}></div>
                  <button
                    onClick={() => setSelectedSkill('node3c')}
                    disabled={!isSkillUnlocked('node3c')}
                    style={{ padding: '0.4em 0.8em', fontSize: '0.85rem', width: '100%' }}
                  >
                    Open
                  </button>
                </div>
              </div>

              

              {/* Converge node4 */}
              <div ref={(el) => { nodeRefs.current['node4'] = el }} style={{ position: 'absolute', left: '530px', top: '160px', width: '80px', height: '80px', zIndex: 2 }}>
                <div style={{ 
                  boxSizing: 'border-box',
                  width: '100%',
                  height: '100%',
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: isSkillUnlocked('node4') ? 'rgba(255,255,255,0.95)' : 'rgba(200,200,200,0.3)', 
                  borderRadius: 8, 
                  border: isSkillUnlocked('node4') ? `3px solid ${nodeColors.node4}` : '3px dashed #999',
                  boxShadow: isSkillUnlocked('node4') ? '0 6px 12px rgba(0,0,0,0.2)' : 'none',
                  opacity: isSkillUnlocked('node4') ? 1 : 0.85
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, color: nodeColors.node4, fontSize: '1.1rem' }}>Boost</div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: 8 }}></div>
                  <button
                    onClick={() => setSelectedSkill('node4')}
                    disabled={!isSkillUnlocked('node4')}
                    style={{ padding: '0.4em 0.8em', fontSize: '0.85rem', width: '100%' }}
                  >
                    Open
                  </button>
                </div>
              </div>

              <div ref={(el) => { nodeRefs.current['node5'] = el }} style={{ position: 'absolute', left: '770px', top: '160px', width: '80px', height: '80px', zIndex: 2 }}>
                <div style={{ 
                  boxSizing: 'border-box',
                  width: '100%',
                  height: '100%',
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: isSkillUnlocked('node5') ? 'rgba(255,255,255,0.95)' : 'rgba(200,200,200,0.3)', 
                  borderRadius: 8, 
                  border: isSkillUnlocked('node5') ? `3px solid ${nodeColors.node5}` : '3px dashed #999',
                  boxShadow: isSkillUnlocked('node5') ? '0 6px 12px rgba(0,0,0,0.2)' : 'none',
                  opacity: isSkillUnlocked('node5') ? 1 : 0.85
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, color: nodeColors.node5, fontSize: '1.1rem' }}>Rotate+</div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: 8 }}></div>
                  <button
                    onClick={() => setSelectedSkill('node5')}
                    disabled={!isSkillUnlocked('node5')}
                    style={{ padding: '0.4em 0.8em', fontSize: '0.85rem', width: '100%' }}
                  >
                    Open
                  </button>
                </div>
              </div>

              {/* Second Branch - node6a/b/c */}
              <div ref={(el) => { nodeRefs.current['node6a'] = el }} style={{ position: 'absolute', left: '960px', top: '0px', width: '80px', height: '80px', zIndex: 2 }}>
                <div style={{ 
                  boxSizing: 'border-box',
                  width: '100%',
                  height: '100%',
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: isSkillUnlocked('node6a') ? 'rgba(255,255,255,0.95)' : 'rgba(200,200,200,0.3)', 
                  borderRadius: 8, 
                  border: isSkillUnlocked('node6a') ? `3px solid ${nodeColors.node6a}` : '3px dashed #999',
                  boxShadow: isSkillUnlocked('node6a') ? '0 6px 12px rgba(0,0,0,0.2)' : 'none',
                  opacity: isSkillUnlocked('node6a') ? 1 : 0.85
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, color: nodeColors.node6a, fontSize: '1.1rem' }}>Mega</div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: 8 }}></div>
                  <button
                    onClick={() => setSelectedSkill('node6a')}
                    disabled={!isSkillUnlocked('node6a')}
                    style={{ padding: '0.4em 0.8em', fontSize: '0.85rem', width: '100%' }}
                  >
                    Open
                  </button>
                </div>
              </div>

              <div ref={(el) => { nodeRefs.current['node6b'] = el }} style={{ position: 'absolute', left: '960px', top: '160px', width: '80px', height: '80px', zIndex: 2 }}>
                <div style={{ 
                  boxSizing: 'border-box',
                  width: '100%',
                  height: '100%',
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: isSkillUnlocked('node6b') ? 'rgba(255,255,255,0.95)' : 'rgba(200,200,200,0.3)', 
                  borderRadius: 8, 
                  border: isSkillUnlocked('node6b') ? `3px solid ${nodeColors.node6b}` : '3px dashed #999',
                  boxShadow: isSkillUnlocked('node6b') ? '0 6px 12px rgba(0,0,0,0.2)' : 'none',
                  opacity: isSkillUnlocked('node6b') ? 1 : 0.85
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, color: nodeColors.node6b, fontSize: '1.1rem' }}>Score+</div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: 8 }}></div>
                  <button
                    onClick={() => setSelectedSkill('node6b')}
                    disabled={!isSkillUnlocked('node6b')}
                    style={{ padding: '0.4em 0.8em', fontSize: '0.85rem', width: '100%' }}
                  >
                    Open
                  </button>
                </div>
              </div>

              <div ref={(el) => { nodeRefs.current['node6c'] = el }} style={{ position: 'absolute', left: '960px', top: '320px', width: '80px', height: '80px', zIndex: 2 }}>
                <div style={{ 
                  boxSizing: 'border-box',
                  width: '100%',
                  height: '100%',
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: isSkillUnlocked('node6c') ? 'rgba(255,255,255,0.95)' : 'rgba(200,200,200,0.3)', 
                  borderRadius: 8, 
                  border: isSkillUnlocked('node6c') ? `3px solid ${nodeColors.node6c}` : '3px dashed #999',
                  boxShadow: isSkillUnlocked('node6c') ? '0 6px 12px rgba(0,0,0,0.2)' : 'none',
                  opacity: isSkillUnlocked('node6c') ? 1 : 0.85
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, color: nodeColors.node6c, fontSize: '1.1rem' }}>Strong</div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: 8 }}></div>
                  <button
                    onClick={() => setSelectedSkill('node6c')}
                    disabled={!isSkillUnlocked('node6c')}
                    style={{ padding: '0.4em 0.8em', fontSize: '0.85rem', width: '100%' }}
                  >
                    Open
                  </button>
                </div>
              </div>

              

              {/* Ultimate node7 */}
              <div ref={(el) => { nodeRefs.current['node7'] = el }} style={{ position: 'absolute', left: '1150px', top: '140px', width: '120px', height: '120px', zIndex: 2 }}>
                <div style={{ 
                  boxSizing: 'border-box',
                  width: '100%',
                  height: '100%',
                  padding: 12, 
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: isSkillUnlocked('node7') ? 'linear-gradient(135deg, #ffd700, #ffed4e)' : 'rgba(200,200,200,0.3)', 
                  borderRadius: 12, 
                  border: isSkillUnlocked('node7') ? `5px solid ${nodeColors.node7}` : '5px dashed #999',
                  boxShadow: isSkillUnlocked('node7') ? '0 8px 20px rgba(255,165,0,0.6)' : 'none',
                  opacity: isSkillUnlocked('node7') ? 1 : 0.85,
                  textAlign: 'center'
                }}>
                  <div style={{ fontWeight: 800, marginBottom: 8, color: nodeColors.node7, fontSize: '1.3rem' }}>Ultimate</div>
                  <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: 10 }}></div>
                  <button
                    onClick={() => setSelectedSkill('node7')}
                    disabled={!isSkillUnlocked('node7')}
                    style={{ padding: '0.5em 1em', fontSize: '0.9rem', width: '100%', fontWeight: 600 }}
                  >
                    Open
                  </button>
                </div>
              </div>

                <div ref={(el) => { nodeRefs.current['node8'] = el }} style={{ position: 'absolute', left: '1310px', top: '160px', width: '80px', height: '80px', zIndex: 2 }}>
                  <div style={{
                    boxSizing: 'border-box',
                    width: '100%',
                    height: '100%',
                    padding: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: isSkillUnlocked('node8') ? 'rgba(255,255,255,0.95)' : 'rgba(200,200,200,0.3)',
                    borderRadius: 8,
                    border: isSkillUnlocked('node8') ? `3px solid ${nodeColors.node8}` : '3px dashed #999',
                    boxShadow: isSkillUnlocked('node8') ? '0 6px 12px rgba(0,0,0,0.2)' : 'none',
                    opacity: isSkillUnlocked('node8') ? 1 : 0.85
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 6, color: nodeColors.node8, fontSize: '1.1rem' }}>Score</div>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: 8 }}></div>
                    <button onClick={() => setSelectedSkill('node8')} disabled={!isSkillUnlocked('node8')} style={{ padding: '0.4em 0.8em', fontSize: '0.85rem', width: '100%' }}>Open</button>
                  </div>
                </div>

                <div ref={(el) => { nodeRefs.current['node9'] = el }} style={{ position: 'absolute', left: '1470px', top: '160px', width: '80px', height: '80px', zIndex: 2 }}>
                  <div style={{
                    boxSizing: 'border-box',
                    width: '100%',
                    height: '100%',
                    padding: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: isSkillUnlocked('node9') ? 'rgba(255,255,255,0.95)' : 'rgba(200,200,200,0.3)',
                    borderRadius: 8,
                    border: isSkillUnlocked('node9') ? `3px solid ${nodeColors.node9}` : '3px dashed #999',
                    boxShadow: isSkillUnlocked('node9') ? '0 6px 12px rgba(0,0,0,0.2)' : 'none',
                    opacity: isSkillUnlocked('node9') ? 1 : 0.85
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 6, color: nodeColors.node9, fontSize: '1.1rem' }}>Rotate</div>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: 8 }}></div>
                    <button onClick={() => setSelectedSkill('node9')} disabled={!isSkillUnlocked('node9')} style={{ padding: '0.4em 0.8em', fontSize: '0.85rem', width: '100%' }}>Open</button>
                  </div>
                </div>

              </div>
          </div>
        </div>
      )}

      {/* Main Game Screen - hidden when IP shop is open */}
      {!showIpShop && (
      <>
      {/* Top info row: ring values, score, prestige summary */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, fontSize: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <div className="color-numbers" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {ringColors.map((c, i) => (
            <span key={i} style={{ color: c, fontWeight: 700, fontSize: '1rem' }}>
              {formatForDisplay(rotValues[i], v => v.toFixed(2))}{i < numberOfRings - 1 ? '×' : ''}
            </span>
          ))}
        </div>
        <div className="score" style={{ marginLeft: 8 }}>Score: {formatForDisplay(score, v => v.toFixed(4))}</div>
        <div style={{ marginLeft: 8, whiteSpace: 'nowrap' }}>
            {(() => {
              const displayedMul = computePrestigeMultiplierFromPoints(prestigePoints)
              const promoLevel = promotionLevel || 0
              const promoMultiplier = Math.pow(PROMO_MULT_PER_LEVEL, promoLevel)
              return `Prestige: ${formatForDisplay(prestigePoints, v => v.toLocaleString())} (×${formatForDisplay(displayedMul, v => v.toFixed(2))}) ${promoLevel > 0 ? `| Promotion L${promoLevel} (×${formatForDisplay(promoMultiplier, v => v.toFixed(2))})` : '| Promotion: locked'}`
            })()}
        </div>
      </div>

      {/* Infinity row: appears only when player reached Infinity; dedicated line */}
      {hasReachedInfinity && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <div style={{ color: '#c0f', fontWeight: 700 }}>IP: {formatForDisplay(infinityPoints, v => v.toLocaleString())}</div>
          <button
            onClick={() => setShowIpShop(true)}
            style={{ padding: '0.4em 0.8em' }}
          >
            Infinity Upgrades
          </button>
          {!isFinite(score) && score === Infinity && (
            <button
              onClick={doInfinite}
              style={{ padding: '0.4em 1em', fontSize: '1rem', background: 'linear-gradient(135deg, #c0f, #f0c)', color: 'white', fontWeight: 700, border: '2px solid #90c' }}
            >
              Infinite +1 IP
            </button>
          )}
        </div>
      )}

      {/* Controls row: from Auto onwards (wrapped to new line) */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={autoBuy} onChange={(e) => setAutoBuy(e.target.checked)} disabled={(ipUpgrades.node3a || 0) < 1} />
          <small>Auto</small>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={autoPromo} onChange={(e) => setAutoPromo(e.target.checked)} disabled={(ipUpgrades.node10 || 0) < 1} />
          <small>Auto Promo</small>
        </label>
        <button onClick={handleManualSync} style={{ padding: '0.4em 0.8em' }}>
          Sync
        </button>
        {syncStatus && (
          <span style={{ color: syncStatus.includes('成功') ? '#2e7d32' : '#c62828', fontWeight: 700 }}>{syncStatus}</span>
        )}

        {/* Prestige / Promotion / Infinite buttons (stay in controls row) */}
        {score >= getNextPrestigeThreshold() && (
            <>
              <button
                onClick={doPrestige}
                style={{ padding: '0.4em 1em', fontSize: '1rem' }}
              >
                Prestige +{formatForDisplay(predictedGainNow, v => Math.floor(v).toLocaleString())}
              </button>
              <small style={{ marginLeft: 8, color: '#333' }}>If prestige now: ×{formatForDisplay(predictedMulNow, v => v.toFixed(2))}</small>
              {/* Promotion button: appears when next promotion level is unlocked */}
              {(() => {
                const nextReq = ((promotionLevel || 0) + 1) * PROMO_THRESHOLD
                return nextReq <= prestigePoints ? (
                  <button onClick={doPromotion} style={{ marginLeft: 12, padding: '0.4em 0.8em' }}>
                    Promotion (Cost: {formatForDisplay(nextReq, v => v.toExponential(2))})
                  </button>
                ) : null
              })()}
              {/* predicted promotion availability after prestige */}
              {predictedPromotionAvailable && (
                <small style={{ marginLeft: 8, color: '#336' }}>If prestige now → Promotion available (×{formatForDisplay(predictedPromotionMultiplier, v => v.toFixed(2))})</small>
              )}
            </>
          )}
          {score < getNextPrestigeThreshold() && (
                    <small style={{ color: '#666' }}>
              Next: {formatForDisplay(getNextPrestigeThreshold(), v => v.toLocaleString(undefined, { maximumFractionDigits: 0 }))}
            </small>
          )}
        {/* Infinite button moved into Infinity row */}
      </div>

      <div className="card">
        <div className="rotation-area">
          <div className="canvas-wrap" style={{ width: canvasSize, height: canvasSize, margin: '0 auto' }}>
            {Array.from({ length: numberOfRings }).map((_, i) => (
              <canvas key={i} ref={(el) => { trailRefs.current[i] = el }} className="trail-canvas" />
            ))}
            <canvas ref={overlayRef} className="overlay-canvas" />
          </div>
          <div className="rot-values">
            {rotValues.map((_v, i) => {
              const level = speedLevels[i] || 0
              // compute current revolutions per second for display
              const maxRingRadius = (numberOfRings - 1) * 16 + 40 + 8
              const scale = Math.min(1, (Math.min(canvasSize, canvasSize) / 2 - 20) / maxRingRadius)
              const baseRadius = 40 * scale
              const spacing = 16 * scale
              const radius = baseRadius + i * spacing
              const multiplier = (i === 0 ? 1 : 0) + (speedLevels[i] || 0) * 0.125
              const revsPerSec = (baseRadius * multiplier) / (spinDuration * radius)
              const isStatic = revsPerSec > FAST_REVS_PER_SEC
              const baseCost = 1
              const purch = purchaseCounts[i] || 0
              // cost for next purchase is based on cumulative purchases (so ascension doesn't reset it)
              const cost = baseCost * Math.pow(100, i) * Math.pow(COST_GROWTH, purch)
              const costLabel = cost > 1e6 ? cost.toExponential(2) : cost.toLocaleString()
              return (
                <div key={i} className="rot-value-item">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ minWidth: 24, fontWeight: 600 }}>#{i + 1}</span>
                    <small>{formatForDisplay(revsPerSec, v => v.toFixed(1))}r/s</small>
                    {isStatic && <small style={{ color: '#888' }}>⚡</small>}
                    <small>P:{purch}</small>
                    
                    <button
                      onClick={() => { if ((level || 0) < 100) buyUpgrade(i) }}
                      disabled={score < cost || (level || 0) >= 100}
                      style={{ padding: '0.3em 0.8em', fontSize: '0.9rem' }}
                    >
                      {(level || 0) >= 100 ? 'Lv100 (MAX)' : `Lv${level}`}
                    </button>
                    <small style={{ fontSize: '0.8rem' }}>{costLabel}</small>
                    
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      </>
      )}
    </>
  )
}

export default App
