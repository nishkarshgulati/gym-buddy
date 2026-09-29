/* ============ FORM FIGURES ============
   A small forward-kinematics stick figure. Each exercise pattern has a start
   pose (A) and an end pose (B); the sheet animates between them.
   Angles: limbs 0 = straight down, +90 = forward (+x), 180 = up.
   Torso 0 = upright, +90 = head forward (+x), -90 = head back (-x).
   v:'f' = front view (near limbs drawn right, far limbs mirrored left). */
const FIG = (() => {
  const G = 138, T = 40, UA = 24, FA = 22, TH = 32, SH = 30, FT = 9, NECK = 12, HR = 8;
  const R = (d) => (d * Math.PI) / 180;
  const vec = (a, L) => [Math.sin(R(a)) * L, Math.cos(R(a)) * L];

  const PAT = {
    // ---- legs
    squatBack: { A: { x: 95, t: 0, a: [-35, 165], l: [0, 0] }, B: { x: 80, t: 40, a: [-30, 165], l: [82, -32] } },
    legPress: { sc: 'legpress', A: { x: 90, y: 104, t: -60, a: [30, 20], l: [150, 75], f: 170 }, B: { x: 90, y: 104, t: -60, a: [30, 20], l: [125, 125], f: 150 } },
    legPressCalf: { sc: 'legpress', A: { x: 90, y: 104, t: -60, a: [30, 20], l: [125, 125], f: 170 }, B: { x: 90, y: 104, t: -60, a: [30, 20], l: [125, 125], f: 120 } },
    rdl: { A: { x: 95, t: 0, a: [0, 0], l: [0, 0] }, B: { x: 82, t: 75, a: [0, 0], l: [12, -6] } },
    legCurlSeated: { sc: 'legext', A: { x: 88, y: 102, t: -8, a: [10, 40], l: [88, 82] }, B: { x: 88, y: 102, t: -8, a: [10, 40], l: [88, -25] } },
    legCurlLying: { sc: 'lyingbench', A: { x: 80, y: 100, t: 90, a: [60, 20], l: [-90, -90], f: -180 }, B: { x: 80, y: 100, t: 90, a: [60, 20], l: [-90, 170], f: -90 } },
    hipThrust: { sc: 'thrustbench', A: { x: 100, y: 124, t: -46, ar: 1, a: [0, 5], l: [118, 8] }, B: { x: 104, y: 98, t: -90, ar: 1, a: [0, 5], l: [72, -4] } },
    gluteBridge: { A: { x: 95, y: 133, t: -90, ar: 1, a: [0, 0], l: [131, 13] }, B: { x: 100, y: 112, t: -114, ar: 1, a: [0, 0], l: [94, -14] } },
    lunge: { A: { x: 95, t: 0, a: [0, 0], l: [0, 0] }, B: { x: 95, t: 4, a: [0, 0], l: [82, -2], l2: [-22, -85], f2: 10 } },
    stepUp: { sc: 'box', A: { x: 90, y: 70, t: 10, a: [0, 0], l: [60, -20], l2: [0, 0] }, B: { x: 124, y: 48, t: 0, a: [0, 0], l: [0, 0], l2: [75, -10] } },
    calfRaise: { sc: 'step', A: { x: 95, y: 72, a: [0, 0], l: [0, 0], f: 90 }, B: { x: 95, y: 65, a: [0, 0], l: [0, 0], f: 50 } },
    seatedCalf: { sc: 'calfseat', A: { x: 80, y: 100, t: 0, a: [30, 60], l: [90, 0], f: 90 }, B: { x: 80, y: 100, t: 0, a: [30, 70], l: [80, 0], f: 50 } },
    // ---- chest
    benchFlat: { sc: 'bench', A: { x: 80, y: 100, t: 90, a: [2, 180], l: [-80, 0], f: -90 }, B: { x: 80, y: 100, t: 90, a: [178, 180], l: [-80, 0], f: -90 } },
    flyFlat: { sc: 'bench', A: { x: 80, y: 100, t: 90, a: [178, 175], l: [-80, 0], f: -90 }, B: { x: 80, y: 100, t: 90, a: [178, 160], k: 0.22, l: [-80, 0], f: -90 } },
    benchIncline: { sc: 'incline', A: { x: 82, y: 104, t: 55, a: [10, 180], l: [-85, 0], f: -90 }, B: { x: 82, y: 104, t: 55, a: [178, 180], l: [-85, 0], f: -90 } },
    seatedPress: { sc: 'seatpress', A: { x: 85, y: 104, t: -8, a: [-70, 90], l: [85, 0] }, B: { x: 85, y: 104, t: -8, a: [85, 90], l: [85, 0] } },
    inclinePushup: { sc: 'pushbench', A: { x: 100, t: 55, a: [5, 5], l: [-55, -55], f: 10 }, B: { x: 100, t: 62, a: [-40, 35], l: [-62, -62], f: 10 } },
    dips: { sc: 'bars', A: { x: 100, y: 80, t: 10, a: [0, 0], l: [5, -70] }, B: { x: 100, y: 96, t: 18, a: [-70, 10], l: [5, -70] } },
    pecDeck: { sc: 'seatf', A: { v: 'f', x: 100, y: 98, a: [92, 92], k: 1, l: [12, 0], kl: [0.3, 1] }, B: { v: 'f', x: 100, y: 98, a: [92, 92], k: -0.26, l: [12, 0], kl: [0.3, 1] } },
    reversePecDeck: { sc: 'seatf', A: { v: 'f', x: 100, y: 98, a: [92, 92], k: -0.26, l: [12, 0], kl: [0.3, 1] }, B: { v: 'f', x: 100, y: 98, a: [92, 92], k: 1, l: [12, 0], kl: [0.3, 1] } },
    reverseFlyStand: { A: { v: 'f', x: 100, a: [92, 92], k: -0.26, l: [5, 0] }, B: { v: 'f', x: 100, a: [92, 92], k: 1, l: [5, 0] } },
    crossover: { A: { v: 'f', x: 100, a: [95, 95], k: 1, l: [8, 0] }, B: { v: 'f', x: 100, a: [95, 95], k: -0.26, l: [8, 0] } },
    flyHighLow: { A: { v: 'f', x: 100, a: [125, 125], k: 1, l: [8, 0] }, B: { v: 'f', x: 100, a: [-15, -15], k: 0.9, l: [8, 0] } },
    flyLowHigh: { A: { v: 'f', x: 100, a: [40, 40], k: 1, l: [8, 0] }, B: { v: 'f', x: 100, a: [-60, -60], k: 0.3, l: [8, 0] } },
    // ---- back
    deadlift: { A: { x: 84, t: 60, a: [5, 5], l: [60, -25] }, B: { x: 95, t: 0, a: [0, 0], l: [0, 0] } },
    rowBent: { A: { x: 88, t: 65, a: [0, 0], l: [18, -8] }, B: { x: 88, t: 65, a: [-75, 5], l: [18, -8] } },
    oneArmRow: { sc: 'rowbench', A: { x: 90, t: 70, a: [0, 0], a2: [10, 5], l: [15, -5] }, B: { x: 90, t: 70, a: [-80, 5], a2: [10, 5], l: [15, -5] } },
    pulldown: { sc: 'pulldown', A: { x: 95, y: 104, t: -10, a: [170, 178], l: [85, 0] }, B: { x: 95, y: 104, t: -18, a: [-30, 165], l: [85, 0] } },
    straightArm: { A: { x: 92, t: 20, a: [150, 150], l: [12, -5] }, B: { x: 92, t: 20, a: [10, 10], l: [12, -5] } },
    seatedRow: { sc: 'rowseat', A: { x: 80, y: 110, t: 18, a: [85, 88], l: [75, 95], f: 175 }, B: { x: 80, y: 110, t: -5, a: [-65, 85], l: [75, 95], f: 175 } },
    facePull: { A: { x: 95, t: -5, a: [95, 95], l: [10, 0], l2: [-10, 0] }, B: { x: 95, t: -5, a: [-100, 170], l: [10, 0], l2: [-10, 0] } },
    shrug: { A: { x: 95, a: [0, 0], s: 0 }, B: { x: 95, a: [0, 0], s: 6 } },
    backExt: { sc: 'backext', A: { x: 100, y: 95, t: 135, ar: 1, a: [15, 165], l: [-45, -45], f: -45 }, B: { x: 100, y: 95, t: 45, ar: 1, a: [15, 165], l: [-45, -45], f: -45 } },
    // ---- shoulders
    ohpSeated: { sc: 'seatup', A: { x: 95, y: 104, t: 0, a: [15, 175], l: [85, 0] }, B: { x: 95, y: 104, t: 0, a: [178, 180], l: [85, 0] } },
    ohpStand: { A: { x: 95, t: 0, a: [20, 172] }, B: { x: 95, t: 0, a: [178, 180] } },
    lateralRaise: { A: { v: 'f', x: 100, a: [8, 8], l: [4, 0] }, B: { v: 'f', x: 100, a: [88, 88], l: [4, 0] } },
    cableLateral: { A: { v: 'f', x: 100, a: [-10, -10], a2: [30, -40], l: [5, 0] }, B: { v: 'f', x: 100, a: [85, 88], a2: [30, -40], l: [5, 0] } },
    rearFly: { A: { v: 'f', x: 100, kt: 0.65, hd: 0, a: [5, 5], l: [8, -8] }, B: { v: 'f', x: 100, kt: 0.65, a: [88, 88], l: [8, -8] } },
    // ---- triceps
    benchDip: { sc: 'dipbench', A: { x: 100, y: 107, t: 0, a: [-15, -15], l: [75, 40] }, B: { x: 100, y: 120, t: 0, a: [-70, 25], l: [85, 58] } },
    overheadExt: { sc: 'seatup', A: { x: 95, y: 104, t: 0, a: [172, -25], l: [85, 0] }, B: { x: 95, y: 104, t: 0, a: [172, 178], l: [85, 0] } },
    overheadCable: { A: { x: 100, t: 25, a: [150, -30], l: [30, -5], l2: [-25, -10] }, B: { x: 100, t: 25, a: [150, 145], l: [30, -5], l2: [-25, -10] } },
    skullcrusher: { sc: 'bench', A: { x: 80, y: 100, t: 90, a: [160, 30], l: [-80, 0], f: -90 }, B: { x: 80, y: 100, t: 90, a: [160, 162], l: [-80, 0], f: -90 } },
    pushdown: { A: { x: 92, t: 8, a: [5, 150] }, B: { x: 92, t: 8, a: [5, 2] } },
    kickback: { sc: 'rowbench', A: { x: 90, t: 70, a: [-80, 0], a2: [10, 5], l: [15, -5] }, B: { x: 90, t: 70, a: [-80, -85], a2: [10, 5], l: [15, -5] } },
    // ---- biceps
    curl: { A: { x: 95, a: [0, 0] }, B: { x: 95, a: [8, 160] } },
    inclineCurl: { sc: 'inclineback', A: { x: 100, y: 104, t: -30, a: [0, 0], l: [85, 0] }, B: { x: 100, y: 104, t: -30, a: [0, 150], l: [85, 0] } },
    preacher: { sc: 'preacher', A: { x: 80, y: 104, t: 15, a: [50, 40], l: [85, 0] }, B: { x: 80, y: 104, t: 15, a: [50, 160], l: [85, 0] } },
    concentration: { sc: 'lowbench', A: { x: 82, y: 104, t: 40, a: [8, 8], l: [82, 0], l2: [60, -10] }, B: { x: 82, y: 104, t: 40, a: [8, 150], l: [82, 0], l2: [60, -10] } },
    // ---- core
    kneeRaise: { sc: 'captain', A: { x: 95, y: 74, t: 0, a: [-10, 90], l: [0, 0] }, B: { x: 95, y: 74, t: -4, a: [-10, 90], l: [95, -5] } },
    cableCrunch: { A: { x: 95, y: 106, t: 20, ar: 1, a: [160, 20], l: [0, -90], f: -90 }, B: { x: 95, y: 106, t: 90, ar: 1, a: [160, 60], l: [0, -90], f: -90 } },
    reverseCrunch: { A: { x: 95, y: 134, t: -90, ar: 1, a: [0, 0], l: [150, 80] }, B: { x: 95, y: 126, t: -80, ar: 1, a: [0, 0], l: [205, 110] } },
    woodchop: { A: { v: 'f', x: 100, a: [146, 146], k: 0.66, a2: [-120, -120], k2: 1.08, l: [12, 0] }, B: { v: 'f', x: 100, a: [-38, -38], k: 1.16, a2: [9, 9], k2: 0.93, l: [12, 0] } },
    sideBend: { A: { v: 'f', x: 100, t: 0, a: [0, 0], a2: [0, 0], l: [6, 0] }, B: { v: 'f', x: 100, t: 14, a: [0, 0], a2: [0, 0], l: [6, 0] } },
    bicycle: { A: { x: 92, y: 132, t: -62, a: [-120, 40], l: [150, 90], l2: [100, 95] }, B: { x: 92, y: 132, t: -62, a: [-120, 40], l: [100, 95], l2: [150, 90] } },
    plank: { A: { x: 90, y: 120, t: 81, a: [0, 90], l: [-73, -73], f: 10 }, B: { x: 90, y: 118, t: 80, a: [0, 90], l: [-73, -73], f: 10 } },
    deadBug: { A: { x: 95, y: 134, t: -90, a: [180, 180], l: [180, 90], f: 180 }, B: { x: 95, y: 134, t: -90, a: [-95, -95], a2: [180, 180], l: [180, 90], l2: [100, 100], f: 180 } },
    pallof: { A: { x: 95, t: 0, a: [10, 150], l: [8, 0], l2: [-8, 0] }, B: { x: 95, t: 0, a: [88, 90], l: [8, 0], l2: [-8, 0] } },
    birdDog: { A: { x: 75, y: 106, t: 70, a: [0, 0], l: [0, -90], f: -90 }, B: { x: 75, y: 106, t: 70, a: [110, 105], a2: [0, 0], l: [0, -90], l2: [-95, -92], f: -90 } },
    // ---- athletic
    kbSwing: { A: { x: 88, t: 65, a: [-20, -20], l: [22, -12] }, B: { x: 95, t: -3, a: [92, 92], l: [0, 0] } },
    ballSlam: { A: { x: 95, t: -5, a: [178, 180], l: [0, 0] }, B: { x: 88, t: 60, a: [40, 30], l: [55, -25] } },
    chestPass: { sc: 'wallFar', A: { x: 95, t: 3, a: [20, 150], l: [25, -5], l2: [-15, -5] }, B: { x: 95, t: 3, a: [88, 90], l: [25, -5], l2: [-15, -5] } },
    lateralShuffle: { A: { v: 'f', x: 92, t: 0, a: [25, -20], l: [24, -6] }, B: { v: 'f', x: 108, t: 0, a: [25, -20], l: [9, 0] } },
    quickFeet: { A: { x: 95, t: 8, a: [-40, 60], a2: [40, 120], l: [55, -40], l2: [-5, -10] }, B: { x: 95, t: 8, a: [40, 120], a2: [-40, 60], l: [-5, -10], l2: [55, -40] } },
    walk: { A: { x: 95, t: 0, a: [-15, 10], a2: [15, 30], l: [18, 5], l2: [-18, -25] }, B: { x: 95, t: 0, a: [15, 30], a2: [-15, 10], l: [-18, -25], l2: [18, 5] } },
    sledPush: { A: { x: 95, t: 50, a: [60, 70], l: [40, -5], l2: [-35, -45] }, B: { x: 95, t: 50, a: [60, 70], l: [-35, -45], l2: [40, -5] } },
    slRdl: { A: { x: 95, t: 0, a: [0, 0], l: [0, 0], l2: [0, 0] }, B: { x: 88, t: 80, a: [0, 0], l: [8, -4], l2: [-95, -92] } },
    balanceReach: { A: { x: 95, t: 0, a: [70, 80], k: 0.5, l: [0, 0], l2: [55, -40] }, B: { x: 93, t: -6, a: [70, 80], k: 0.5, l: [6, 0], l2: [80, 80] } },
    tandemWalk: { A: { x: 95, t: 0, a: [80, 85], k: 0.35, l: [8, 3], l2: [-8, -12] }, B: { x: 95, t: 0, a: [80, 85], k: 0.35, l: [-8, -12], l2: [8, 3] } },
    // ---- mobility / yoga / stretch
    catCow: { A: { x: 75, y: 106, t: 70, c: -7, hd: -35, a: [0, 0], l: [0, -90], f: -90 }, B: { x: 75, y: 106, t: 70, c: 11, hd: 45, a: [0, 0], l: [0, -90], f: -90 } },
    torsoTwist: { A: { v: 'f', x: 100, a: [80, 80], k: 1, k2: 0.3, l: [8, 0] }, B: { v: 'f', x: 100, a: [80, 80], k: 0.3, k2: 1, l: [8, 0] } },
    sideReach: { A: { v: 'f', x: 100, t: 0, a: [0, 0], a2: [175, 180], l: [3, 0] }, B: { v: 'f', x: 100, t: 16, a: [0, 0], a2: [205, 220], l: [3, 0] } },
    legSwing: { A: { x: 95, y: 76, t: 0, a: [0, 0], a2: [60, 70], l: [-35, -30], l2: [0, 0] }, B: { x: 95, y: 76, t: 0, a: [0, 0], a2: [60, 70], l: [60, 55], l2: [0, 0] } },
    hipGate: { A: { v: 'f', x: 100, a: [35, -50], l: [0, 0] }, B: { v: 'f', x: 100, a: [35, -50], l: [75, -10], l2: [0, 0] } },
    kneeHug: { A: { x: 95, t: 0, a: [0, 0], l: [0, 0] }, B: { x: 95, t: 0, a: [45, 120], l: [150, -5], l2: [0, 0] } },
    armCircles: { A: { v: 'f', x: 100, a: [70, 70], l: [5, 0] }, B: { v: 'f', x: 100, a: [110, 110], l: [5, 0] } },
    wallSlide: { A: { v: 'f', x: 100, a: [75, 170], l: [5, 0] }, B: { v: 'f', x: 100, a: [150, 152], l: [5, 0] } },
    warrior2: { A: { v: 'f', x: 100, a: [90, 90], l: [60, -3], l2: [40, 40] }, B: { v: 'f', x: 100, a: [90, 90], l: [64, -3], l2: [42, 42] } },
    warrior1: { A: { x: 95, t: 0, a: [0, 0], l: [55, -10], l2: [-38, -38] }, B: { x: 95, t: -3, a: [178, 180], l: [55, -10], l2: [-38, -38] } },
    chairPose: { A: { x: 95, t: 0, a: [178, 180], l: [0, 0] }, B: { x: 86, t: 28, a: [165, 168], l: [58, -28] } },
    sideAngle: { A: { v: 'f', x: 100, a: [90, 90], l: [62, -3], l2: [40, 40] }, B: { v: 'f', x: 100, t: 40, a: [5, 5], a2: [-140, -140], l: [64, -3], l2: [42, 42] } },
    tree: { A: { v: 'f', x: 100, a: [25, -100], l: [55, -65], l2: [0, 0] }, B: { v: 'f', x: 100, a: [-164, -164], l: [55, -65], l2: [0, 0] } },
    warrior3: { A: { x: 95, t: 0, a: [88, 90], l: [0, 0] }, B: { x: 92, t: 88, a: [90, 90], l: [0, 0], l2: [-90, -90] } },
    lowLunge: { A: { x: 95, y: 106, t: 8, a: [40, 40], l: [85, -5], l2: [-35, -90], f2: -90 }, B: { x: 97, y: 108, t: -3, a: [178, 180], l: [85, -5], l2: [-35, -90], f2: -90 } },
    garland: { A: { x: 95, t: 0, a: [25, -100], l: [0, 0] }, B: { x: 90, t: 22, a: [40, 150], l: [105, -40] } },
    cobra: { A: { x: 80, y: 132, t: 90, a: [-90, 90], l: [-90, -90], f: -90 }, B: { x: 80, y: 132, t: 55, a: [-40, 77], l: [-90, -90], f: -90 } },
    downDog: { A: { x: 115, t: 65, a: [0, 0], l: [-65, -65], f: 10 }, B: { x: 85, y: 85, t: 120, a: [44, 44], l: [-31, -31], f: 60 } },
    seatedFold: { A: { x: 80, y: 132, t: 0, a: [175, 178], l: [90, 90], f: 180 }, B: { x: 80, y: 132, t: 62, a: [100, 95], l: [90, 90], f: 180 } },
    strapHam: { A: { x: 95, y: 134, t: -90, a: [150, 160], l: [130, 130], l2: [90, 90], f: 180 }, B: { x: 95, y: 134, t: -90, a: [165, 172], l: [170, 170], l2: [90, 90], f: 180 } },
    stepHam: { A: { x: 92, t: 0, a: [20, 40], l: [57, 57], l2: [0, 0], f: 180 }, B: { x: 88, t: 38, a: [60, 20], l: [60, 60], l2: [0, 0], f: 180 } },
    figure4: { A: { x: 95, y: 134, t: -90, a: [140, 120], l: [115, 100], kl: [0.75, 0.9], l2: [140, 18] }, B: { x: 95, y: 134, t: -90, a: [150, 150], l: [135, 110], kl: [0.75, 0.9], l2: [170, 45] } },
    butterfly: { A: { v: 'f', x: 100, y: 124, t: 0, a: [15, -20], l: [100, -72] }, B: { v: 'f', x: 100, y: 124, t: 0, kt: 0.8, a: [15, -25], l: [96, -70] } },
    kneelHipFlexor: { A: { x: 95, y: 108, t: 0, a: [30, -60], l: [85, -5], l2: [-35, -90], f2: -90 }, B: { x: 100, y: 110, t: -8, a: [30, -60], l: [80, -8], l2: [-40, -90], f2: -90 } },
    standingQuad: { A: { x: 95, t: 0, a: [-11, -11], k: 0.93, a2: [60, 70], l: [-5, -150], l2: [0, 0] }, B: { x: 95, t: 0, a: [-11, -11], k: 0.93, a2: [60, 70], l: [-8, -172], l2: [0, 0] } },
    doorway: { A: { x: 95, t: 0, a: [-95, 180], l: [0, 0] }, B: { x: 99, t: 8, a: [-105, 182], l: [10, 0], l2: [-8, 0] } },
    crossBody: { A: { v: 'f', x: 100, a: [-90, -90], k: 0.9, a2: [30, -70] }, B: { v: 'f', x: 100, a: [-93, -93], k: 1, a2: [30, -80] } },
    tricepsStretch: { A: { v: 'f', x: 100, a: [170, -20], a2: [160, -110] }, B: { v: 'f', x: 100, a: [176, -25], a2: [165, -120] } },
    childsPose: { A: { x: 75, y: 106, t: 70, a: [0, 0], l: [0, -90], f: -90 }, B: { x: 70, y: 122, t: 105, a: [85, 90], l: [65, -95], f: -90 } },
    supineTwist: { A: { x: 95, y: 134, t: -90, a: [90, 90], k: 0.3, l: [150, 70] }, B: { x: 95, y: 134, t: -90, a: [90, 90], k: 0.3, l: [150, 70], kl: [0.35, 0.35] } },
    kneesChest: { A: { x: 95, y: 134, t: -90, a: [100, 100], l: [140, 18] }, B: { x: 95, y: 131, t: -90, a: [140, 110], l: [205, 100] } },
    legExt: { sc: 'legext', A: { x: 88, y: 102, t: -8, a: [10, 40], l: [88, 5] }, B: { x: 88, y: 102, t: -8, a: [10, 40], l: [88, 82] } },
    superman: { A: { x: 85, y: 132, t: 90, a: [90, 90], l: [-90, -90], f: -90 }, B: { x: 85, y: 132, t: 80, a: [100, 98], l: [-98, -98], f: -90 } },
    legRaise: { A: { x: 95, y: 134, t: -90, ar: 1, a: [0, 0], l: [92, 90], f: 180 }, B: { x: 95, y: 134, t: -90, ar: 1, a: [0, 0], l: [172, 150], f: 180 } },
    goblet: { A: { x: 95, t: 0, a: [20, 160], l: [0, 0] }, B: { x: 82, t: 35, a: [40, 170], l: [82, -32] } },
    walkGoblet: { A: { x: 95, t: 0, a: [20, 160], l: [18, 5], l2: [-18, -25] }, B: { x: 95, t: 0, a: [20, 160], l: [-18, -25], l2: [18, 5] } },
    pushPress: { A: { x: 95, t: 0, a: [20, 168], l: [22, -20] }, B: { x: 95, t: 0, a: [178, 180], l: [0, 0] } },
    recumbent: { sc: 'recumbent', A: { x: 80, y: 104, t: -20, a: [10, 60], l: [75, 55], l2: [95, 95] }, B: { x: 80, y: 104, t: -20, a: [10, 60], l: [95, 95], l2: [75, 55] } },
    // ---- cardio
    bike: { sc: 'bike', A: { x: 86, y: 78, t: 25, a: [62, 62], l: [62, -20], l2: [25, 15] }, B: { x: 86, y: 78, t: 25, a: [62, 62], l: [25, 15], l2: [62, -20] } },
    rower: { sc: 'rower', A: { x: 85, y: 122, t: 25, a: [88, 90], l: [140, 8], f: 150 }, B: { x: 60, y: 122, t: -20, a: [-60, 95], l: [88, 92], f: 150 } },
    stairClimb: { sc: 'stairs', A: { x: 95, t: 10, a: [40, 60], l: [55, -15], l2: [0, 0] }, B: { x: 95, t: 10, a: [40, 60], l: [0, 0], l2: [55, -15] } },
  };

  const SC = {
    bench: '<rect x="40" y="104" width="110" height="6" rx="2" class="eqf"/><path d="M55 110V138M135 110V138" class="eq"/>',
    smithbench: '<rect x="40" y="104" width="110" height="6" rx="2" class="eqf"/><path d="M55 110V138M135 110V138" class="eq"/><path d="M104 6V138M150 6V138" class="eqs"/>',
    incline: '<rect x="58" y="107" width="36" height="5" rx="2" class="eqf"/><path d="M86 109L124 82" class="eqw"/><path d="M70 112V138M112 96L116 138" class="eq"/>',
    seatpress: '<rect x="70" y="106" width="32" height="5" rx="2" class="eqf"/><path d="M80 104L74 58" class="eqw"/><path d="M86 111V138M150 28V138M150 28H136" class="eq"/>',
    pushbench: '<rect x="118" y="126" width="55" height="5" rx="2" class="eqf"/><path d="M125 131V138M165 131V138" class="eq"/>',
    bars: '<path d="M75 88H126" class="eqw"/><path d="M121 88V138" class="eq"/>',
    pulldown: '<rect x="78" y="106" width="32" height="5" rx="2" class="eqf"/><circle cx="124" cy="99" r="5" class="eqf"/><path d="M94 111V138M150 5V138M108 5H150M124 99H150" class="eq"/>',
    rowseat: '<rect x="55" y="112" width="40" height="5" rx="2" class="eqf"/><path d="M146 102V130" class="eqw"/><path d="M40 132H180M172 60V138" class="eq"/>',
    incline_row: '<path d="M92 91L131 72" class="eqw"/><path d="M100 90V138M126 76V138" class="eq"/>',
    rowbench: '<rect x="118" y="109" width="57" height="6" rx="2" class="eqf"/><path d="M125 115V138M168 115V138" class="eq"/>',
    backext: '<path d="M106 100L70 136" class="eqw"/><circle cx="58" cy="131" r="5" class="eqf"/><path d="M40 138H120" class="eq"/>',
    seatup: '<rect x="80" y="106" width="32" height="5" rx="2" class="eqf"/><path d="M88 106V58" class="eqw"/><path d="M96 111V138" class="eq"/>',
    legext: '<rect x="68" y="104" width="34" height="5" rx="2" class="eqf"/><path d="M73 102L68 62" class="eqw"/><path d="M85 109V138" class="eq"/>',
    lyingbench: '<rect x="15" y="104" width="125" height="6" rx="2" class="eqf"/><path d="M30 110V138M125 110V138" class="eq"/>',
    thrustbench: '<rect x="30" y="96" width="46" height="6" rx="2" class="eqf"/><path d="M38 102V138M70 102V138" class="eq"/>',
    box: '<rect x="108" y="110" width="44" height="28" rx="3" class="eqf"/>',
    step: '<rect x="80" y="134" width="40" height="4" rx="1" class="eqf"/>',
    calfseat: '<rect x="60" y="103" width="36" height="5" rx="2" class="eqf"/><path d="M78 108V138" class="eq"/><rect x="110" y="130" width="16" height="8" rx="1" class="eqf"/>',
    dipbench: '<rect x="55" y="112" width="40" height="6" rx="2" class="eqf"/><path d="M62 118V138M88 118V138" class="eq"/>',
    inclineback: '<rect x="86" y="107" width="34" height="5" rx="2" class="eqf"/><path d="M96 107L73 67" class="eqw"/><path d="M100 112V138" class="eq"/>',
    preacher: '<path d="M90 74L113 94" class="eqw"/><path d="M108 94V138" class="eq"/><rect x="64" y="106" width="30" height="5" rx="2" class="eqf"/><path d="M79 111V138" class="eq"/>',
    lowbench: '<rect x="55" y="106" width="52" height="6" rx="2" class="eqf"/><path d="M62 112V138M100 112V138" class="eq"/>',
    captain: '<path d="M87 18V100" class="eqw"/><path d="M82 62H120" class="eqw"/><path d="M80 10V138M118 62V138" class="eq"/>',
    hack: '<path d="M62 8V138M132 8V138" class="eqs"/>',
    smith: '<path d="M62 6V138M136 6V138" class="eqs"/>',
    legpress: '<path d="M94 110L50 84" class="eqw"/><path d="M40 138H165M70 110V138" class="eq"/><path d="M118 118L172 48" class="eqs"/>',
    sled: '<path d="M148 132H196" class="eqw"/><path d="M167 70V132" class="eq"/>',
    wallR: '<path d="M142 5V138" class="eqw"/>',
    wallFar: '<path d="M180 5V138" class="eqw"/>',
    wallF: '<rect x="44" y="6" width="112" height="132" rx="4" class="eqwall"/>',
    door: '<path d="M70 6V138M70 6H128" class="eqw"/>',
    treadmill: '<path d="M38 134H176" class="eqw"/><path d="M166 134V62M160 62H178" class="eq"/>',
    bike: '<path d="M78 80H96" class="eqw"/><path d="M88 80L92 128M142 128L145 62M138 62H152M66 136H160" class="eq"/><circle cx="106" cy="126" r="9" class="eqs"/>',
    elliptical: '<path d="M40 136H170" class="eqw"/><path d="M146 136L150 58" class="eq"/>',
    rower: '<path d="M22 130H186" class="eqw"/><circle cx="178" cy="112" r="11" class="eqs"/><path d="M120 110L126 130" class="eqw"/>',
    stairs: '<path d="M30 138V128H80V118H130V108H180" class="eqw"/>',
    recumbent: '<rect x="60" y="106" width="34" height="5" rx="2" class="eqf"/><path d="M66 108L54 68" class="eqw"/><path d="M76 111V136M48 136H165" class="eq"/><circle cx="140" cy="118" r="10" class="eqs"/><path d="M140 128V136" class="eq"/>',
    seatf: '<rect x="78" y="100" width="44" height="7" rx="2" class="eqf"/><path d="M100 107V138" class="eq"/>',
  };

  function num(v, d) { return v == null ? d : v; }

  function solve(p) {
    const front = p.v === 'f';
    const t = p.t || 0, kt = num(p.kt, 1);
    const l = p.l || [0, 0], l2 = p.l2 || l;
    const kl = p.kl || [1, 1], kl2 = p.kl2 || kl;
    const leg = (ang, k, m, hx) => {
      const a = vec(ang[0], TH * k[0]), b = vec(ang[1], SH * k[1]);
      const knee = [hx + a[0] * m, a[1]];
      return { knee, ank: [knee[0] + b[0] * m, knee[1] + b[1]] };
    };
    const L1 = leg(l, kl, 1, front ? 7 : 0), L2 = leg(l2, kl2, front ? -1 : 1, front ? -7 : 0);
    const x = p.x, y = p.y != null ? p.y : G - Math.max(L1.ank[1], L2.ank[1]);
    const hip = [x, y];
    const d = [Math.sin(R(t)), -Math.cos(R(t))];
    const tl = T * kt + (p.s || 0);
    const sc = [x + d[0] * tl, y + d[1] * tl];
    const hd = t + (p.hd || 0);
    const head = [sc[0] + Math.sin(R(hd)) * NECK, sc[1] - Math.cos(R(hd)) * NECK];
    const perp = [Math.cos(R(t)), Math.sin(R(t))];
    const sN = front ? [sc[0] + perp[0] * 13, sc[1] + perp[1] * 13] : sc;
    const sF = front ? [sc[0] - perp[0] * 13, sc[1] - perp[1] * 13] : sc;
    const a = p.a || [0, 0], a2 = p.a2 || a;
    const k = num(p.k, 1), k2 = num(p.k2, p.a2 ? 1 : k);
    const arm = (s, ang, kk, m) => {
      let u = ang[0], f = ang[1];
      if (p.ar) { u -= t; f -= t; }
      const A = vec(u, UA * kk), B = vec(f, FA * kk);
      const el = [s[0] + A[0] * m, s[1] + A[1]];
      return { el, hand: [el[0] + B[0] * m, el[1] + B[1]] };
    };
    const A1 = arm(sN, a, k, 1), A2 = arm(sF, a2, k2, front ? -1 : 1);
    const knee1 = [x + L1.knee[0], y + L1.knee[1]], ank1 = [x + L1.ank[0], y + L1.ank[1]];
    const knee2 = [x + L2.knee[0], y + L2.knee[1]], ank2 = [x + L2.ank[0], y + L2.ank[1]];
    const hipN = front ? [x + 7, y] : hip, hipF = front ? [x - 7, y] : hip;
    let f1, f2;
    if (front) {
      f1 = [ank1[0] + 7, ank1[1] + 1]; f2 = [ank2[0] - 7, ank2[1] + 1];
    } else {
      const fa = num(p.f, 90), fb = num(p.f2, fa);
      const v1 = vec(fa, FT), v2 = vec(fb, FT);
      f1 = [ank1[0] + v1[0], ank1[1] + v1[1]]; f2 = [ank2[0] + v2[0], ank2[1] + v2[1]];
    }
    return { front, hip, hipN, hipF, sc, sN, sF, head, d, c: p.c || 0, A1, A2, knee1, ank1, knee2, ank2, f1, f2 };
  }

  function lerp(pa, pb, u) {
    const o = {};
    const keys = new Set([...Object.keys(pa), ...Object.keys(pb)]);
    keys.forEach((key) => {
      const va = pa[key], vb = pb[key];
      if (key === 'v' || key === 'ar') { o[key] = va != null ? va : vb; return; }
      if (Array.isArray(va) || Array.isArray(vb)) {
        const A = va || (key === 'a2' ? pa.a : key === 'l2' ? pa.l : key === 'kl2' ? pa.kl : null) || vb;
        const B = vb || (key === 'a2' ? pb.a : key === 'l2' ? pb.l : key === 'kl2' ? pb.kl : null) || va;
        o[key] = A.map((n, i) => n + (B[i] - n) * u);
        return;
      }
      if (va == null && key === 'y') { o[key] = undefined; return; }
      if (vb == null && key === 'y') { o[key] = undefined; return; }
      const defs = { k: 1, k2: 1, kt: 1, s: 0, c: 0, hd: 0, t: 0, f: 90 };
      const A = va != null ? va : key === 'f2' ? num(pa.f, 90) : defs[key];
      const B = vb != null ? vb : key === 'f2' ? num(pb.f, 90) : defs[key];
      o[key] = A == null ? B : B == null ? A : A + (B - A) * u;
    });
    return o;
  }

  const P = (p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1);
  const ln = (a, b, cls) => `<path d="M${P(a)}L${P(b)}" class="${cls}"/>`;

  function db(h, vertical) {
    if (vertical) return `<g class="prop"><path d="M${h[0].toFixed(1)} ${(h[1] - 7).toFixed(1)}v14" class="pl"/><rect x="${(h[0] - 5).toFixed(1)}" y="${(h[1] - 10).toFixed(1)}" width="10" height="4" rx="1"/><rect x="${(h[0] - 5).toFixed(1)}" y="${(h[1] + 6).toFixed(1)}" width="10" height="4" rx="1"/></g>`;
    return `<g class="prop"><path d="M${(h[0] - 7).toFixed(1)} ${h[1].toFixed(1)}h14" class="pl"/><rect x="${(h[0] - 9).toFixed(1)}" y="${(h[1] - 5).toFixed(1)}" width="4" height="10" rx="1"/><rect x="${(h[0] + 5).toFixed(1)}" y="${(h[1] - 5).toFixed(1)}" width="4" height="10" rx="1"/></g>`;
  }

  function props(s, pr) {
    let out = '';
    const toks = (pr || '').split(' ').filter(Boolean);
    const hN = s.A1.hand, hF = s.A2.hand;
    toks.forEach((tk) => {
      if (tk === 'db2') { out += s.front ? db(hN) + db(hF) : db(hF) + db(hN); }
      else if (tk === 'dbN') out += db(hN);
      else if (tk === 'db1') out += db([(hN[0] + hF[0]) / 2, (hN[1] + hF[1]) / 2], true);
      else if (tk === 'bb') out += `<g class="prop"><circle cx="${hN[0].toFixed(1)}" cy="${hN[1].toFixed(1)}" r="11" class="plate"/><circle cx="${hN[0].toFixed(1)}" cy="${hN[1].toFixed(1)}" r="2.5"/></g>`;
      else if (tk === 'kb') out += `<g class="prop"><circle cx="${hN[0].toFixed(1)}" cy="${(hN[1] + 8).toFixed(1)}" r="6.5"/><path d="M${(hN[0] - 4).toFixed(1)} ${(hN[1] + 3).toFixed(1)}Q${hN[0].toFixed(1)} ${(hN[1] - 5).toFixed(1)} ${(hN[0] + 4).toFixed(1)} ${(hN[1] + 3).toFixed(1)}" class="pl"/></g>`;
      else if (tk === 'mb') { const m = s.front ? [(hN[0] + hF[0]) / 2, (hN[1] + hF[1]) / 2] : [hN[0] + 3, hN[1]]; out += `<circle cx="${m[0].toFixed(1)}" cy="${m[1].toFixed(1)}" r="8" class="prop ball"/>`; }
      else if (tk.startsWith('c:') || tk.startsWith('cc:')) {
        const [cx, cy] = tk.split(':')[1].split(',').map(Number);
        out += `<path d="M${cx} ${cy}L${P(hN)}" class="cable"/><circle cx="${cx}" cy="${cy}" r="3.5" class="pulley"/>`;
        if (tk.startsWith('cc:')) out += `<path d="M${200 - cx} ${cy}L${P(hF)}" class="cable"/><circle cx="${200 - cx}" cy="${cy}" r="3.5" class="pulley"/>`;
      }
      else if (tk === 'bar') out += `<path d="M${(hN[0] - 11).toFixed(1)} ${hN[1].toFixed(1)}h22" class="pl prop"/>`;
      else if (tk === 'pad') out += `<circle cx="${s.ank1[0].toFixed(1)}" cy="${s.ank1[1].toFixed(1)}" r="5" class="prop"/>`;
      else if (tk === 'dbk') out += db([s.knee1[0], s.knee1[1] - 6]);
      else if (tk === 'kpad') out += `<rect x="${(s.knee1[0] - 9).toFixed(1)}" y="${(s.knee1[1] - 10).toFixed(1)}" width="18" height="6" rx="2" class="prop"/>`;
      else if (tk === 'hipbar') out += `<circle cx="${s.hip[0].toFixed(1)}" cy="${(s.hip[1] - 9).toFixed(1)}" r="10" class="prop plate"/>`;
      else if (tk === 'plate') {
        const dx = s.ank1[0] - s.hip[0], dy = s.ank1[1] - s.hip[1], n = Math.hypot(dx, dy) || 1;
        const u = [dx / n, dy / n], pp = [-u[1], u[0]], c = [s.ank1[0] + u[0] * 5, s.ank1[1] + u[1] * 5];
        out += `<path d="M${P([c[0] + pp[0] * 16, c[1] + pp[1] * 16])}L${P([c[0] - pp[0] * 16, c[1] - pp[1] * 16])}" class="eqw"/>`;
      }
      else if (tk === 'band') out += `<path d="M${P(s.knee1)}L${P(s.knee2)}" class="band"/>`;
      else if (tk === 'strap') out += `<path d="M${P(hN)}L${P(s.f1)}" class="band"/>`;
    });
    return out;
  }

  function draw(p, pr, scKey) {
    const s = solve(p);
    let o = '<path d="M8 138H192" class="gr"/>';
    if (scKey && SC[scKey]) o += SC[scKey];
    // far side
    o += `<g class="far">${ln(s.hipF, s.knee2, 'lb')}${ln(s.knee2, s.ank2, 'lb')}${ln(s.ank2, s.f2, 'ft')}${ln(s.sF, s.A2.el, 'lb')}${ln(s.A2.el, s.A2.hand, 'lb')}</g>`;
    // torso
    if (s.front) {
      o += `<path d="M${P(s.hipF)}L${P(s.hipN)}L${P(s.sN)}L${P(s.sF)}Z" class="torso tf"/>`;
    } else if (s.c) {
      const mid = [(s.hip[0] + s.sc[0]) / 2, (s.hip[1] + s.sc[1]) / 2];
      const pp = [s.d[1], -s.d[0]];
      const cp = [mid[0] + pp[0] * s.c * 2, mid[1] + pp[1] * s.c * 2];
      o += `<path d="M${P(s.hip)}Q${P(cp)} ${P(s.sc)}" class="torso"/>`;
    } else o += ln(s.hip, s.sc, 'torso');
    o += `<circle cx="${s.head[0].toFixed(1)}" cy="${s.head[1].toFixed(1)}" r="${HR}" class="head"/>`;
    o += `<g class="near">${ln(s.hipN, s.knee1, 'lb')}${ln(s.knee1, s.ank1, 'lb')}${ln(s.ank1, s.f1, 'ft')}${ln(s.sN, s.A1.el, 'lb')}${ln(s.A1.el, s.A1.hand, 'lb')}</g>`;
    o += props(s, pr);
    return o;
  }

  function parse(ex) {
    const toks = (ex.pr || '').split(' ');
    const sc = toks.find((t) => t.startsWith('sc:'));
    const pr = toks.filter((t) => !t.startsWith('sc:')).join(' ');
    const pat = PAT[ex.pat] || PAT.curl;
    return { pat, pr, sc: sc ? sc.slice(3) : pat.sc };
  }

  function svgStatic(ex, which) {
    const { pat, pr, sc } = parse(ex);
    return `<svg viewBox="0 0 200 150" class="fig" aria-hidden="true">${draw(which === 'A' ? pat.A : pat.B, pr, sc)}</svg>`;
  }

  // Animated player; returns stop function
  function animate(el, ex) {
    const { pat, pr, sc } = parse(ex);
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.innerHTML = `<svg viewBox="0 0 200 150" class="fig big" role="img" aria-label="${ex.n} form animation"></svg>`;
    const svg = el.firstChild;
    if (reduce) { svg.innerHTML = draw(pat.B, pr, sc); return () => {}; }
    let raf, start = null, alive = true;
    const period = 3200;
    const tick = (ts) => {
      if (!alive) return;
      if (start == null) start = ts;
      const ph = ((ts - start) % period) / period;
      // hold at A, move to B, hold, return
      let u;
      if (ph < 0.12) u = 0; else if (ph < 0.45) u = (ph - 0.12) / 0.33; else if (ph < 0.6) u = 1; else if (ph < 0.93) u = 1 - (ph - 0.6) / 0.33; else u = 0;
      u = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      svg.innerHTML = draw(lerp(pat.A, pat.B, u), pr, sc);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }

  return { svgStatic, animate, PAT };
})();
