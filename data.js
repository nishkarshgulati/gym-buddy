/* ============ EXERCISE LIBRARY ============
   Every muscle group is split into ZONES. A session always takes exactly one
   exercise from every zone of a group, so each workout covers the whole muscle.
   Zone 1 of every strength group is the MAIN LIFT: the heaviest, most demanding
   compound movement, always done first while energy is highest. */

const TGT = {
  main: { txt: '3 × 8–10', lo: 8, hi: 10 },
  std: { txt: '3 × 10–12', lo: 10, hi: 12 },
  hi: { txt: '3 × 12–15', lo: 12, hi: 15 },
  hold: { txt: '3 × 30–45 s', lo: 30, hi: 45 },
  carry: { txt: '3 × 30–40 s', lo: 30, hi: 40 },
  work: { txt: '3 × 30 s work', lo: 25, hi: 40 },
  flow: { txt: '3 × 5 breaths', lo: 20, hi: 40 },
  stretch: { txt: '3 × 30–45 s', lo: 30, hi: 45 },
  mob: { txt: '2–3 × 10 each side', lo: 8, hi: 12 },
};

const GROUPS = {
  legs: { name: 'Legs', major: true, kind: 'strength', zones: [
    { k: 'main', name: 'Main lift', covers: 'Quads + glutes, heavy', ex: ['bb_squat', 'leg_press', 'hack_squat'] },
    { k: 'hams', name: 'Hamstrings', covers: 'Back of thigh', ex: ['db_rdl', 'leg_curl', 'bb_rdl', 'cable_pullthrough'] },
    { k: 'glute', name: 'Glutes, quads & single leg', covers: 'Glutes, hips, quad finish', ex: ['hip_thrust', 'reverse_lunge', 'leg_extension', 'step_up', 'glute_bridge'] },
    { k: 'calf', name: 'Calves', covers: 'Lower leg', ex: ['standing_calf', 'seated_db_calf', 'legpress_calf', 'single_calf'] },
  ]},
  chest: { name: 'Chest', major: true, kind: 'strength', zones: [
    { k: 'main', name: 'Main lift', covers: 'Whole chest, heavy press', ex: ['bb_bench', 'db_bench'] },
    { k: 'upper', name: 'Upper chest', covers: 'Clavicular head', ex: ['incline_db', 'incline_bb', 'low_high_fly'] },
    { k: 'lower', name: 'Lower chest', covers: 'Sternal / lower fibres', ex: ['high_low_fly', 'decline_db', 'incline_pushup'] },
    { k: 'inner', name: 'Inner squeeze', covers: 'Full stretch + squeeze', ex: ['pec_deck', 'db_fly', 'cable_crossover'] },
  ]},
  back: { name: 'Back', major: true, kind: 'strength', zones: [
    { k: 'main', name: 'Main lift', covers: 'Whole back chain, heavy', ex: ['deadlift', 'bb_row', 'db_bent_row'] },
    { k: 'lats', name: 'Lats (width)', covers: 'Vertical pull', ex: ['lat_pulldown', 'vbar_pulldown', 'single_arm_pd', 'straight_arm_pd'] },
    { k: 'mid', name: 'Mid-back (thickness)', covers: 'Horizontal row', ex: ['seated_row', 'one_arm_row', 'chest_supported_row'] },
    { k: 'post', name: 'Traps, rear & lower back', covers: 'Posture muscles', ex: ['face_pull', 'db_shrug', 'superman'] },
  ]},
  shoulders: { name: 'Shoulders', major: false, kind: 'strength', zones: [
    { k: 'main', name: 'Main lift', covers: 'Front delts, overhead press', ex: ['db_shoulder_press', 'bb_ohp', 'arnold_press'] },
    { k: 'side', name: 'Side delts', covers: 'Shoulder width', ex: ['db_lateral', 'cable_lateral', 'leanaway_lateral'] },
    { k: 'rear', name: 'Rear delts', covers: 'Back of shoulder', ex: ['reverse_pec_deck', 'bent_rear_fly', 'cable_rear_fly'] },
  ]},
  triceps: { name: 'Triceps', major: false, kind: 'strength', zones: [
    { k: 'main', name: 'Main lift', covers: 'All 3 heads, heavy press', ex: ['close_grip_bench', 'bench_dip', 'close_grip_db'] },
    { k: 'long', name: 'Long head', covers: 'Overhead stretch', ex: ['overhead_db_ext', 'overhead_cable_ext', 'skullcrusher'] },
    { k: 'lat', name: 'Lateral & medial heads', covers: 'Arm pushdown / lockout', ex: ['rope_pushdown', 'bar_pushdown', 'reverse_pushdown', 'db_kickback'] },
  ]},
  biceps: { name: 'Biceps', major: false, kind: 'strength', zones: [
    { k: 'main', name: 'Main lift', covers: 'Both heads, heavy curl', ex: ['bb_curl', 'ez_curl', 'db_curl'] },
    { k: 'iso', name: 'Peak & stretch', covers: 'Long + short head focus', ex: ['incline_curl', 'preacher_curl', 'concentration_curl', 'cable_curl'] },
    { k: 'brach', name: 'Brachialis & forearm', covers: 'Arm thickness, grip', ex: ['hammer_curl', 'rope_hammer', 'reverse_curl'] },
  ]},
  core: { name: 'Core', major: false, kind: 'strength', zones: [
    { k: 'main', name: 'Lower abs', covers: 'Hip flexion under load', ex: ['cable_crunch', 'reverse_crunch', 'lying_leg_raise'] },
    { k: 'obl', name: 'Obliques', covers: 'Rotation & side bend', ex: ['woodchop', 'side_bend', 'bicycle'] },
    { k: 'stab', name: 'Stability', covers: 'Deep core, anti-movement', ex: ['plank', 'dead_bug', 'pallof', 'bird_dog'] },
  ]},
  athletic: { name: 'Athletic', major: true, kind: 'athletic', zones: [
    { k: 'power', name: 'Power', covers: 'Explosive hips, low impact', ex: ['kb_swing', 'speed_squat', 'db_push_press'] },
    { k: 'agility', name: 'Agility & footwork', covers: 'Quick feet, side-to-side', ex: ['lateral_shuffle', 'quick_feet', 'grapevine'] },
    { k: 'carry', name: 'Carry & push', covers: 'Grip, posture, conditioning', ex: ['farmer_carry', 'suitcase_carry', 'goblet_carry'] },
    { k: 'balance', name: 'Balance', covers: 'Single-leg control, fall-proofing', ex: ['sl_rdl', 'balance_reach', 'tandem_walk'] },
  ]},
  mobility: { name: 'Dynamic warm-up', major: false, kind: 'yoga', zones: [
    { k: 'spine', name: 'Spine', covers: 'Flexion, extension, rotation', ex: ['cat_cow', 'torso_twist', 'side_bend_stretch'] },
    { k: 'hips', name: 'Hips', covers: 'Hip joint range', ex: ['leg_swing', 'hip_gate', 'knee_hug'] },
    { k: 'shoulders', name: 'Shoulders', covers: 'Shoulder joint range', ex: ['arm_circles', 'wall_slide'] },
  ]},
  yoga: { name: 'Yoga flow', major: true, kind: 'yoga', zones: [
    { k: 'stand', name: 'Standing strength', covers: 'Legs & posture', ex: ['warrior2', 'warrior1', 'chair_pose', 'side_angle'] },
    { k: 'bal', name: 'Balance', covers: 'Ankles, focus', ex: ['tree', 'warrior3'] },
    { k: 'hip', name: 'Hip opener', covers: 'Hip flexors, groin', ex: ['low_lunge', 'garland'] },
    { k: 'spine', name: 'Spine & back-bend', covers: 'Back extension', ex: ['cobra', 'down_dog', 'bridge_pose'] },
  ]},
  stretch: { name: 'Static stretch', major: true, kind: 'yoga', zones: [
    { k: 'hams', name: 'Hamstrings', covers: 'Back of thigh', ex: ['seated_fold', 'strap_ham', 'step_ham'] },
    { k: 'hips', name: 'Hips & glutes', covers: 'Outer hip, groin', ex: ['figure4', 'butterfly'] },
    { k: 'quads', name: 'Quads & hip flexors', covers: 'Front of hip/thigh', ex: ['kneel_hipflexor', 'standing_quad'] },
    { k: 'upper', name: 'Chest & shoulders', covers: 'Upper body', ex: ['doorway_chest', 'cross_body', 'triceps_stretch'] },
    { k: 'back', name: 'Back & spine', covers: 'Lower back release', ex: ['childs_pose', 'supine_twist', 'knees_chest'] },
  ]},
};

const GROUP_ORDER = ['legs', 'chest', 'back', 'shoulders', 'triceps', 'biceps', 'core', 'athletic', 'mobility', 'yoga', 'stretch'];

const CARDIO = ['incline_walk', 'bike', 'recumbent_bike', 'cross_trainer', 'stair_climber'];

/* E(id, name, pattern, props, metric, target, increment kg, cues[], safety tip) */
const EX = {};
function E(id, n, pat, pr, m, tgt, inc, cues, tip) { EX[id] = { id, n, pat, pr: pr || '', m, tgt, inc: inc && inc < 2.5 ? 2.5 : inc, cues, tip }; }

// ---------- LEGS ----------
E('bb_squat', 'Barbell back squat', 'squatBack', 'bb', 'wr', 'main', 2.5, ['Bar on upper back, feet shoulder-width, toes slightly out', 'Sit hips back and down; knees track over toes', 'Go to parallel or as low as your back stays flat', 'Drive through the whole foot to stand'], 'Use the safety pins in the rack. Warm up with 2 lighter sets first.');
E('leg_press', 'Leg press', 'legPress', 'plate', 'wr', 'main', 5, ['Feet hip-width in the middle of the plate', 'Lower until knees reach about 90°', 'Keep lower back pressed into the pad', 'Push through heels; don\'t lock knees hard'], 'Never let your hips roll off the seat at the bottom.');
E('hack_squat', 'Hack squat (leg press machine)', 'squatBack', 'sc:hack', 'wr', 'main', 5, ['Shoulders under pads, back flat on the sled', 'Feet mid-plate, hip-width', 'Lower slowly to about 90° knee bend', 'Press up without slamming the knees straight'], 'Keep the safety handles within reach.');
E('smith_squat', 'Smith machine squat', 'squatBack', 'bb sc:smith', 'wr', 'main', 2.5, ['Feet slightly in front of the bar', 'Brace your stomach before each rep', 'Sit down between your heels', 'Stand tall and squeeze glutes at the top'], 'Set the stoppers just below your lowest point.');
E('db_rdl', 'Dumbbell Romanian deadlift', 'rdl', 'db2', 'wr', 'std', 1, ['Soft knees, dumbbells in front of thighs', 'Push hips back like closing a car door', 'Lower to mid-shin with a flat back', 'Squeeze glutes to stand'], 'Stop the moment your back starts to round.');
E('seated_leg_curl', 'Seated leg curl', 'legCurlSeated', 'pad', 'wr', 'std', 2.5, ['Knees line up with the machine pivot', 'Thigh pad snug on top of the legs', 'Pull heels under the seat', 'Return slowly over 3 seconds'], 'Keep hips down in the seat.');
E('lying_leg_curl', 'Lying leg curl', 'legCurlLying', 'pad', 'wr', 'std', 2.5, ['Lie face down, pad just above heels', 'Hips stay pressed into the bench', 'Curl heels toward glutes', 'Lower slowly, don\'t drop the stack'], 'If your lower back arches, reduce the weight.');
E('hip_thrust', 'Hip thrust', 'hipThrust', 'hipbar', 'wr', 'std', 2.5, ['Upper back on bench edge, feet flat', 'Chin tucked, ribs down', 'Drive hips up until body is a straight line', 'Pause and squeeze glutes 1 second'], 'Use a pad under the bar on your hips.');
E('reverse_lunge', 'Reverse lunge', 'lunge', 'db2', 'wr', 'std', 1, ['Step back far enough for both knees to bend 90°', 'Front knee stays over the ankle', 'Back knee lowers toward the floor', 'Push through front heel to return'], 'Hold a rail with one hand if balance is shaky.');
E('step_up', 'Dumbbell step-up', 'stepUp', 'db2', 'wr', 'std', 1, ['Whole foot on a stable low step (below knee height)', 'Lean slightly forward', 'Drive through the top heel to stand', 'Step down slowly with control'], 'Start with a lower step; height is not the goal.');
E('glute_bridge', 'Glute bridge', 'gluteBridge', '', 'wr', 'hi', 2.5, ['Lie on back, heels close to hips', 'Press lower back flat first', 'Lift hips until knees-hips-shoulders line up', 'Hold 2 seconds at the top'], 'Place a dumbbell on hips to add load.');
E('standing_calf', 'Standing calf raise', 'calfRaise', 'db2', 'wr', 'hi', 2.5, ['Balls of feet on a step edge', 'Lower heels for a full stretch', 'Rise as high as possible', 'Pause 1 second at top'], 'Hold a rail for balance.');
E('seated_calf', 'Seated calf raise', 'seatedCalf', 'kpad', 'wr', 'hi', 2.5, ['Pad snug on lower thighs', 'Full stretch at the bottom', 'Press up onto the balls of the feet', 'Slow 2-second lowering'], 'Targets the deeper soleus muscle.');
E('legpress_calf', 'Leg press calf press', 'legPressCalf', 'plate', 'wr', 'hi', 5, ['Balls of feet on the bottom edge of plate', 'Knees straight but not locked', 'Push the plate with your toes', 'Let heels come back for a full stretch'], 'Keep the safety catches engaged.');
E('single_calf', 'Single-leg calf raise', 'calfRaise', 'dbN', 'wr', 'hi', 1, ['One foot on the step edge', 'Hold a rail with the free hand', 'Rise high, lower slow', 'Do all reps, then switch legs'], 'Bodyweight alone is plenty to start.');

E('bb_rdl', 'Barbell Romanian deadlift', 'rdl', 'bb', 'wr', 'std', 2.5, ['Hold the bar at hip height, soft knees', 'Push hips back, bar slides down the thighs', 'Stop just below the knees with a flat back', 'Drive hips forward to stand'], 'Use a lighter bar than your deadlift.');
E('cable_pullthrough', 'Cable pull-through', 'rdl', 'c:28,134', 'wr', 'std', 2.5, ['Rope on the low pulley, face away from the stack', 'Rope between your legs, step forward', 'Hinge back, then snap hips forward to stand', 'Squeeze glutes at the top'], 'Arms stay long; the hips do the work.');
E('leg_curl', 'Leg curl machine', 'legCurlSeated', 'pad', 'wr', 'std', 2.5, ['Set the machine to leg curl', 'Pad sits just above the heels', 'Curl heels toward you, squeeze', 'Return slowly over 3 seconds'], 'Keep hips down; don\'t swing the weight.');
E('leg_extension', 'Leg extension machine', 'legExt', 'pad', 'wr', 'std', 2.5, ['Set the machine to leg extension', 'Knees line up with the pivot', 'Straighten legs, squeeze the thighs', 'Lower slowly'], 'Moderate weight; stop short of locking the knees hard.');
E('seated_db_calf', 'Seated dumbbell calf raise', 'seatedCalf', 'dbk', 'wr', 'hi', 2.5, ['Sit on the bench end, balls of feet on a plate', 'Dumbbells rest on your knees', 'Rise high onto your toes', 'Lower heels for a full stretch'], 'Targets the deeper soleus muscle.');

// ---------- CHEST ----------
E('bb_bench', 'Barbell bench press', 'benchFlat', 'bb', 'wr', 'main', 2.5, ['Eyes under the bar, feet flat', 'Shoulder blades squeezed together', 'Lower bar to mid-chest, elbows about 45°', 'Press up and slightly back'], 'Always use a spotter or safety arms on heavy sets.');
E('db_bench', 'Dumbbell bench press', 'benchFlat', 'db2', 'wr', 'main', 1, ['Dumbbells over chest, palms forward', 'Lower until elbows are just below bench', 'Press up, bringing dumbbells together', 'Keep wrists stacked over elbows'], 'Kick the dumbbells up from your knees to start.');
E('smith_bench', 'Smith machine bench press', 'benchFlat', 'bb sc:smithbench', 'wr', 'main', 2.5, ['Bar lines up with mid-chest', 'Grip slightly wider than shoulders', 'Lower under control', 'Press up without bouncing'], 'Set the stoppers above your chest.');
E('machine_chest', 'Chest press machine', 'seatedPress', '', 'wr', 'main', 5, ['Handles line up with mid-chest', 'Back flat on the pad', 'Press forward until arms are nearly straight', 'Return slowly, feel the stretch'], 'Adjust seat height before loading.');
E('incline_db', 'Incline dumbbell press', 'benchIncline', 'db2', 'wr', 'std', 1, ['Bench at 30°', 'Dumbbells at upper chest', 'Press up over the collarbones', 'Lower slowly with elbows tucked slightly'], 'Lower incline = less shoulder strain.');
E('incline_bb', 'Incline barbell press', 'benchIncline', 'bb', 'wr', 'std', 2.5, ['Adjustable bench at 30°, set inside the rack', 'Lower bar to upper chest', 'Elbows under the bar', 'Press straight up'], 'Use safety arms or a spotter.');
E('incline_machine', 'Incline chest press machine', 'benchIncline', '', 'wr', 'std', 5, ['Handles start at upper-chest height', 'Press up and out', 'Squeeze chest at the top', 'Control the return'], 'Good choice on low-energy days.');
E('low_high_fly', 'Low-to-high cable fly', 'flyLowHigh', 'cc:185,128', 'wr', 'std', 2.5, ['Pulleys at the lowest setting', 'Slight bend in the elbows', 'Sweep hands up to chest height in front', 'Squeeze upper chest, lower slowly'], 'Keep the weight light and controlled.');
E('assisted_dip', 'Assisted dip machine', 'dips', '', 'wr', 'std', 5, ['Kneel on the pad, hands on handles', 'Lean chest slightly forward', 'Lower until elbows reach 90°', 'Press back up'], 'More assistance weight = easier. Stop if shoulders pinch.');
E('decline_db', 'Hip-raised dumbbell press', 'benchFlat', 'db2', 'wr', 'std', 1, ['Flat bench, feet flat, lift hips into a low bridge', 'Press dumbbells over lower chest', 'Lower under control', 'Squeeze at the top'], 'Raising the hips turns a flat press into a lower-chest press.');
E('high_low_fly', 'High-to-low cable fly', 'flyHighLow', 'cc:185,18', 'wr', 'std', 2.5, ['Pulleys at the top', 'Step forward, slight lean', 'Sweep hands down to meet at hip height', 'Control back up'], 'Keep elbows softly bent the whole time.');
E('incline_pushup', 'Incline push-up', 'inclinePushup', '', 'r', 'hi', 0, ['Hands on a bench, shoulder-width', 'Body straight from head to heels', 'Lower chest to the bench edge', 'Push away fully'], 'Higher hands = easier. Move lower as you get stronger.');
E('pec_deck', 'Chest fly machine', 'pecDeck', '', 'wr', 'std', 5, ['Handles at chest height', 'Slight bend in the elbows', 'Bring handles together in front', 'Open slowly to a comfortable stretch'], 'Don\'t let the handles pull you past a comfortable stretch.');
E('db_fly', 'Dumbbell fly', 'flyFlat', 'db2', 'wr', 'std', 1, ['Dumbbells over chest, palms facing', 'Open arms in a wide arc', 'Stop when elbows reach bench level', 'Hug a tree to bring them back'], 'Use light weights; this is a stretch move.');
E('cable_crossover', 'Cable crossover', 'crossover', 'cc:185,42', 'wr', 'std', 2.5, ['Pulleys at shoulder height', 'Step forward, staggered stance', 'Bring hands together in front of chest', 'Return slowly'], 'Keep shoulders down, away from ears.');

// ---------- BACK ----------
E('deadlift', 'Barbell deadlift', 'deadlift', 'bb', 'wr', 'main', 2.5, ['Bar over mid-foot, shins close', 'Hips back, chest up, flat back', 'Push the floor away, bar stays close', 'Stand tall; don\'t lean back'], 'Start light. Stop immediately if your lower back rounds.');
E('bb_row', 'Bent-over barbell row', 'rowBent', 'bb', 'wr', 'main', 2.5, ['Hinge to about 45°, soft knees', 'Flat back, bar hangs under shoulders', 'Pull bar to lower ribs', 'Lower with control'], 'If your back tires, switch to a chest-supported row.');
E('trapbar_dl', 'Trap-bar deadlift', 'deadlift', 'db2', 'wr', 'main', 2.5, ['Stand in the centre of the hex bar', 'Grip high handles to start', 'Push through the floor to stand', 'Lower by bending hips and knees together'], 'The easiest deadlift on the lower back.');
E('tbar_row', 'T-bar row', 'rowBent', 'bb', 'wr', 'main', 2.5, ['Chest up, flat back', 'Pull handle to the chest', 'Squeeze shoulder blades', 'Lower until arms straighten'], 'Use the chest-supported version if available.');
E('lat_pulldown', 'Wide-grip lat pulldown (machine)', 'pulldown', 'c:108,6 bar', 'wr', 'std', 2.5, ['Thighs under the pad', 'Grip wider than shoulders', 'Pull bar to upper chest, lean back slightly', 'Let arms straighten fully at top'], 'Never pull behind the neck.');
E('assisted_pullup', 'Assisted pull-up', 'pulldown', 'sc:pullup', 'wr', 'std', 5, ['Knees on pad, grip just wider than shoulders', 'Pull chest toward the bar', 'Lead with elbows down', 'Lower slowly to a full hang'], 'More assistance weight = easier.');
E('vbar_pulldown', 'Close-grip pulldown (machine)', 'pulldown', 'c:108,6 bar', 'wr', 'std', 2.5, ['Short bar handle, palms facing or underhand', 'Pull handle to upper chest', 'Elbows drive down to your sides', 'Controlled return'], 'Keep the torso still; no swinging.');
E('straight_arm_pd', 'Straight-arm pulldown', 'straightArm', 'c:150,12 bar', 'wr', 'std', 2.5, ['Slight forward lean, arms long', 'Sweep bar down to thighs', 'Keep elbows almost straight', 'Feel the lats under the armpits'], 'Light weight; lats do the work, not triceps.');
E('seated_row', 'Seated cable row', 'seatedRow', 'c:172,80', 'wr', 'std', 2.5, ['Knees soft, chest tall', 'Pull handle to the belly button', 'Squeeze shoulder blades together', 'Reach forward without rounding'], 'Don\'t rock the torso to move the weight.');
E('one_arm_row', 'One-arm dumbbell row', 'oneArmRow', 'dbN', 'wr', 'std', 1, ['Hand and knee on the bench', 'Flat back, parallel to the floor', 'Pull dumbbell to your hip pocket', 'Lower to a full stretch'], 'Do all reps, then switch sides.');
E('chest_supported_row', 'Chest-supported row', 'rowBent', 'db2 sc:incline_row', 'wr', 'std', 1, ['Chest on an incline bench', 'Let arms hang straight', 'Row elbows back past the ribs', 'Pause and squeeze'], 'Zero lower-back load; great for tired days.');
E('face_pull', 'Face pull', 'facePull', 'c:165,32', 'wr', 'hi', 2.5, ['Rope at face height', 'Pull rope toward your forehead', 'Split the rope, elbows high', 'Squeeze rear shoulders'], 'One of the best posture exercises; go light.');
E('db_shrug', 'Dumbbell shrug', 'shrug', 'db2', 'wr', 'hi', 1, ['Stand tall, arms straight', 'Lift shoulders straight up to ears', 'Hold 1 second', 'Lower all the way'], 'No rolling the shoulders.');
E('back_ext', 'Back extension (45°)', 'backExt', '', 'r', 'hi', 0, ['Hip bone just above the pad', 'Arms crossed on chest', 'Lower with a flat back', 'Rise until body is a straight line; don\'t over-arch'], 'Hold a plate to chest only when 15 reps are easy.');

E('db_bent_row', 'Two-dumbbell bent-over row', 'rowBent', 'db2', 'wr', 'main', 2.5, ['Hinge to about 45°, soft knees', 'Dumbbells hang under shoulders', 'Row both to the lower ribs', 'Lower slowly'], 'Keep the back flat; go lighter if it rounds.');
E('single_arm_pd', 'Single-arm cable pulldown', 'pulldown', 'c:108,6', 'wr', 'std', 2.5, ['Single handle on the high pulley, kneel or sit', 'Pull elbow down to your side', 'Squeeze under the armpit', 'Let the arm rise fully'], 'Do all reps, then switch arms.');
E('superman', 'Superman hold', 'superman', '', 't', 'hold', 0, ['Lie face down on a mat, arms forward', 'Lift arms, chest and legs a little', 'Hold, breathing slowly', 'Lower and rest'], 'Small lift only; no pain in the lower back.');

// ---------- SHOULDERS ----------
E('db_shoulder_press', 'Seated dumbbell shoulder press', 'ohpSeated', 'db2', 'wr', 'main', 1, ['Back against an upright bench', 'Dumbbells start at ear height', 'Press up until arms are straight', 'Lower to chin level'], 'Don\'t arch the lower back; brace your stomach.');
E('bb_ohp', 'Standing barbell press', 'ohpStand', 'bb', 'wr', 'main', 2.5, ['Bar on front of shoulders', 'Squeeze glutes, brace core', 'Press straight up, head moves back then through', 'Lock out overhead'], 'Use a lighter bar; strict form beats heavy weight.');
E('machine_shoulder_press', 'Shoulder press machine', 'ohpSeated', '', 'wr', 'main', 5, ['Handles at shoulder height', 'Back flat on pad', 'Press up smoothly', 'Lower under control'], 'Set the seat so handles start at shoulder height.');
E('arnold_press', 'Arnold press', 'ohpSeated', 'db2', 'wr', 'main', 1, ['Start with palms facing you at chin', 'Rotate palms forward as you press', 'Finish overhead, palms forward', 'Reverse on the way down'], 'Go lighter than a normal shoulder press.');
E('db_lateral', 'Dumbbell lateral raise', 'lateralRaise', 'db2', 'wr', 'std', 1, ['Slight bend in elbows', 'Raise arms out to the sides', 'Stop at shoulder height', 'Lower over 3 seconds'], 'Lead with elbows, not hands. Light weight.');
E('cable_lateral', 'Cable lateral raise', 'cableLateral', 'c:30,132', 'wr', 'std', 2.5, ['Pulley at the bottom, stand side-on', 'Raise arm out to shoulder height', 'Keep torso still', 'Control down'], 'Do all reps, then switch sides.');
E('machine_lateral', 'Lateral raise machine', 'lateralRaise', 'sc:seatf', 'wr', 'std', 2.5, ['Pads on the outside of your arms', 'Raise elbows to shoulder height', 'Pause', 'Lower slowly'], 'Adjust seat so shoulders line up with the pivot.');
E('reverse_pec_deck', 'Reverse fly machine', 'reversePecDeck', 'sc:seatf', 'wr', 'std', 2.5, ['Set the chest fly machine to reverse, face the pad', 'Sweep arms back and out', 'Squeeze rear shoulders', 'Return slowly'], 'Keep chest against the pad.');
E('bent_rear_fly', 'Bent-over rear delt fly', 'rearFly', 'db2', 'wr', 'std', 1, ['Hinge forward, flat back', 'Arms hang, slight elbow bend', 'Raise arms out to the sides', 'Pause, then lower'], 'Can be done seated, chest on thighs.');
E('cable_rear_fly', 'Cable rear delt fly', 'reverseFlyStand', 'cc:185,40', 'wr', 'std', 2.5, ['Cross the cables, arms in front', 'Pull hands apart and back', 'Arms at shoulder height', 'Control the return'], 'Very light weight works best.');

E('leanaway_lateral', 'Lean-away lateral raise', 'cableLateral', 'dbN', 'wr', 'std', 2.5, ['Hold the rack with one hand, lean away slightly', 'Raise the dumbbell out to the side', 'Stop at shoulder height', 'Lower slowly'], 'Do all reps, then switch sides.');

// ---------- TRICEPS ----------
E('close_grip_bench', 'Close-grip bench press', 'benchFlat', 'bb', 'wr', 'main', 2.5, ['Hands shoulder-width', 'Elbows tucked close to ribs', 'Lower bar to lower chest', 'Press up by straightening arms'], 'Use a spotter on heavy sets.');
E('bench_dip', 'Bench dip', 'benchDip', '', 'r', 'hi', 0, ['Hands on bench edge behind you', 'Knees bent, feet flat (easier)', 'Lower until elbows reach 90°', 'Press back up'], 'Skip if you feel pain at the front of the shoulder.');
E('close_grip_db', 'Close-grip dumbbell press', 'benchFlat', 'db2', 'wr', 'main', 1, ['Dumbbells touching, palms facing', 'Elbows tight to the body', 'Lower to chest', 'Press straight up'], 'A shoulder-friendly triceps press.');
E('overhead_db_ext', 'Overhead dumbbell extension', 'overheadExt', 'db1', 'wr', 'std', 1, ['Sit tall, one dumbbell in both hands', 'Lower it behind your head', 'Elbows point forward, stay close', 'Straighten arms fully'], 'Keep ribs down; don\'t arch.');
E('overhead_cable_ext', 'Overhead cable extension', 'overheadCable', 'c:40,120', 'wr', 'std', 2.5, ['Face away from the pulley', 'Rope behind head, elbows up', 'Straighten arms forward and up', 'Return slowly'], 'Staggered stance for balance.');
E('skullcrusher', 'Lying dumbbell extension', 'skullcrusher', 'db2', 'wr', 'std', 1, ['Lie on a bench, arms straight up', 'Bend only at the elbows', 'Lower dumbbells beside your head', 'Straighten back up'], 'Upper arms stay still throughout.');
E('rope_pushdown', 'Rope pushdown', 'pushdown', 'c:125,8', 'wr', 'std', 2.5, ['Elbows pinned to your sides', 'Push rope down', 'Split the rope at the bottom', 'Return to 90° only'], 'Don\'t lean over the stack.');
E('bar_pushdown', 'Straight-bar pushdown', 'pushdown', 'c:125,8 bar', 'wr', 'std', 2.5, ['Overhand grip, shoulder-width', 'Elbows stay at your sides', 'Press bar to thighs', 'Control up'], 'Stand tall with a slight lean.');
E('reverse_pushdown', 'Reverse-grip pushdown', 'pushdown', 'c:125,8 bar', 'wr', 'std', 2.5, ['Underhand grip', 'Elbows locked at your sides', 'Push bar down to full lockout', 'Slow return'], 'Hits the medial head; use a lighter weight.');
E('db_kickback', 'Dumbbell kickback', 'kickback', 'dbN', 'wr', 'std', 1, ['Hand on bench, flat back', 'Upper arm parallel to the floor', 'Straighten the arm behind you', 'Squeeze for 1 second'], 'Upper arm stays still; only the forearm moves.');

// ---------- BICEPS ----------
E('bb_curl', 'Barbell curl', 'curl', 'bb', 'wr', 'main', 2.5, ['Stand tall, shoulder-width grip', 'Elbows stay at your sides', 'Curl bar to upper chest', 'Lower all the way down'], 'No swinging; use a lighter bar if needed.');
E('ez_curl', 'EZ-bar curl', 'curl', 'bb', 'wr', 'main', 2.5, ['Grip the angled part of the bar', 'Elbows pinned', 'Curl up, squeeze', 'Lower over 3 seconds'], 'Easier on wrists than a straight bar.');
E('db_curl', 'Standing dumbbell curl', 'curl', 'db2', 'wr', 'main', 1, ['Palms forward, arms straight', 'Curl both dumbbells up', 'Twist pinkies up at the top', 'Lower slowly'], 'Alternate arms if both together feels heavy.');
E('incline_curl', 'Incline dumbbell curl', 'inclineCurl', 'db2', 'wr', 'std', 1, ['Bench at 45°, arms hang straight', 'Curl without moving the elbows forward', 'Squeeze at the top', 'Full stretch at the bottom'], 'Use lighter dumbbells than standing curls.');
E('preacher_curl', 'Bench preacher curl', 'preacher', 'dbN', 'wr', 'std', 2.5, ['Adjustable bench upright; arm over the top of the back pad', 'Curl up to shoulder height', 'Lower until arms are almost straight', 'Don\'t bounce at the bottom'], 'Never drop into a locked elbow.');
E('concentration_curl', 'Concentration curl', 'concentration', 'dbN', 'wr', 'std', 1, ['Sit, elbow against inner thigh', 'Curl toward the shoulder', 'Squeeze 1 second', 'Lower all the way'], 'Do all reps, then switch arms.');
E('cable_curl', 'Cable curl', 'curl', 'c:125,134 bar', 'wr', 'std', 2.5, ['Pulley at the bottom', 'Elbows pinned to sides', 'Curl to chest', 'Constant tension on the way down'], 'Step back so the cable stays tight at the bottom.');
E('hammer_curl', 'Hammer curl', 'curl', 'db2', 'wr', 'std', 1, ['Palms face each other', 'Curl up like holding a hammer', 'Elbows still', 'Lower slowly'], 'Great for elbow health and grip.');
E('rope_hammer', 'Rope hammer curl', 'curl', 'c:125,134', 'wr', 'std', 2.5, ['Rope on the low pulley', 'Thumbs up grip', 'Curl rope to chest', 'Control down'], 'Keep wrists straight.');
E('reverse_curl', 'Reverse-grip curl', 'curl', 'bb', 'wr', 'std', 2.5, ['Overhand grip', 'Curl bar up, wrists straight', 'Elbows stay still', 'Lower slowly'], 'Use about half your normal curl weight.');

// ---------- CORE ----------
E('captain_knee_raise', "Captain's chair knee raise", 'kneeRaise', '', 'r', 'hi', 0, ['Back flat on the pad, forearms on rests', 'Lift knees toward chest', 'Curl hips slightly at the top', 'Lower slowly, no swinging'], 'Knees bent keeps it easy on the lower back.');
E('cable_crunch', 'Kneeling cable crunch', 'cableCrunch', 'c:100,4', 'wr', 'hi', 2.5, ['Kneel, rope beside your head', 'Crunch ribs toward hips', 'Hips stay still', 'Uncurl slowly'], 'Move from the stomach, not the arms.');
E('reverse_crunch', 'Reverse crunch', 'reverseCrunch', '', 'r', 'hi', 0, ['Lie on back, knees bent at 90°', 'Curl hips off the floor toward chest', 'Lower slowly', 'Lower back stays down'], 'Small, slow movement is enough.');
E('woodchop', 'Cable woodchop', 'woodchop', 'c:185,15', 'wr', 'std', 2.5, ['Pulley high, stand side-on', 'Pull diagonally across to the opposite knee', 'Pivot the back foot', 'Control back up'], 'Arms stay long; turn from the trunk.');
E('side_bend', 'Dumbbell side bend', 'sideBend', 'dbN', 'wr', 'hi', 1, ['Dumbbell in one hand, stand tall', 'Bend sideways toward the weight', 'Come back up past centre', 'Switch sides'], 'Only bend sideways, not forward.');
E('bicycle', 'Slow bicycle crunch', 'bicycle', '', 'r', 'hi', 0, ['Lie on back, hands lightly at head', 'Bring elbow toward opposite knee', 'Extend the other leg', 'Slow and controlled; count each side'], 'Don\'t pull on your neck.');
E('plank', 'Forearm plank', 'plank', '', 't', 'hold', 0, ['Elbows under shoulders', 'Body straight, glutes squeezed', 'Breathe normally', 'Knees down is fine'], 'Stop when hips start to sag.');
E('dead_bug', 'Dead bug', 'deadBug', '', 'r', 'hi', 0, ['Lie on back, arms up, knees at 90°', 'Press lower back into the floor', 'Lower opposite arm and leg slowly', 'Return and switch sides'], 'Go only as far as your back stays flat.');
E('pallof', 'Pallof press', 'pallof', 'c:30,62', 'wr', 'std', 2.5, ['Stand side-on to the pulley', 'Handle at chest', 'Press straight out and hold 2 s', 'Don\'t let the cable twist you'], 'Do all reps, then switch sides.');
E('bird_dog', 'Bird dog', 'birdDog', '', 'r', 'hi', 0, ['Hands under shoulders, knees under hips', 'Reach opposite arm and leg out', 'Hold 2 seconds, keep hips level', 'Switch sides'], 'Move slowly; balance is the goal.');

E('lying_leg_raise', 'Bent-knee leg raise', 'legRaise', '', 'r', 'hi', 0, ['Lie on a mat, hands under hips', 'Knees slightly bent', 'Lift legs until hips are at 90°', 'Lower slowly, back stays down'], 'Stop lower if your back arches.');

// ---------- ATHLETIC ----------
E('kb_swing', 'Kettlebell swing', 'kbSwing', 'kb', 'wr', 'std', 2, ['Hinge at hips, bell between legs', 'Snap hips forward to swing', 'Bell floats to chest height', 'Arms are just ropes'], 'It\'s a hip hinge, not a squat. Start light.');
E('ball_slam', 'Medicine ball slam', 'ballSlam', 'mb', 'wr', 'std', 1, ['Ball overhead, rise on toes', 'Slam it down in front', 'Bend hips and knees to pick up', 'Reset and repeat'], 'Use a soft slam ball, 3–6 kg.');
E('chest_pass', 'Med ball chest pass', 'chestPass', 'mb', 'wr', 'std', 1, ['Stand an arm\'s length from a wall', 'Ball at chest', 'Push it hard at the wall', 'Catch and repeat quickly'], 'Keep it rhythmic, not maximal.');
E('lateral_shuffle', 'Lateral shuffle', 'lateralShuffle', '', 't', 'work', 0, ['Athletic stance, knees bent', 'Shuffle 4–5 steps sideways', 'Don\'t cross the feet', 'Shuffle back'], 'Low and controlled; no jumping needed.');
E('quick_feet', 'Quick feet / ladder', 'quickFeet', '', 't', 'work', 0, ['Stay on the balls of your feet', 'Fast, small steps in place or through a ladder', 'Arms pump naturally', 'Breathe'], 'Speed of feet matters, not height.');
E('band_walk', 'Band side walk', 'lateralShuffle', 'band', 't', 'work', 0, ['Band just above knees', 'Half-squat position', 'Step sideways, keep tension', 'Toes point forward'], 'Great for hip stability and knee health.');
E('farmer_carry', "Farmer's carry", 'walk', 'db2', 'wt', 'carry', 2, ['Heavy dumbbells at your sides', 'Stand tall, shoulders back', 'Walk with short steady steps', 'Set down with a flat back'], 'Pick weights you can hold for 30 s.');
E('suitcase_carry', 'Suitcase carry', 'walk', 'dbN', 'wt', 'carry', 2, ['Weight in one hand only', 'Don\'t lean toward it', 'Walk tall', 'Switch hands each set'], 'Trains the core to resist leaning.');
E('sled_push', 'Sled push', 'sledPush', 'sc:sled', 'wt', 'carry', 5, ['Hands on handles, arms extended', 'Lean forward about 45°', 'Drive with short powerful steps', 'Keep back flat'], 'Add plates slowly; the sled is heavy on its own.');
E('sl_rdl', 'Single-leg Romanian deadlift', 'slRdl', 'dbN', 'wr', 'std', 1, ['Stand on one leg, soft knee', 'Hinge forward, back leg lifts', 'Body moves like a seesaw', 'Return tall'], 'Touch a wall with the free hand if needed.');
E('balance_reach', 'Single-leg balance reach', 'balanceReach', '', 't', 'work', 0, ['Stand on one leg', 'Reach the free foot forward, side, back', 'Touch lightly, don\'t put weight down', 'Switch legs'], 'Stand near a wall or rail.');
E('tandem_walk', 'Heel-to-toe walk', 'tandemWalk', '', 't', 'work', 0, ['Place heel directly in front of toes', 'Eyes forward, arms out', 'Walk slowly in a straight line', 'Turn and walk back'], 'Walk beside a wall for safety.');

E('speed_squat', 'Goblet speed squat', 'goblet', 'db1', 'wr', 'std', 2.5, ['Hold a dumbbell or kettlebell at chest', 'Lower under control', 'Stand up fast and strong', 'Reset between reps'], 'Speed on the way up only.');
E('db_push_press', 'Dumbbell push press', 'pushPress', 'db2', 'wr', 'std', 2.5, ['Dumbbells at shoulders', 'Small knee dip', 'Drive with legs and press overhead', 'Lower to shoulders with control'], 'Use lighter weights than your shoulder press.');
E('grapevine', 'Grapevine walk', 'lateralShuffle', '', 't', 'work', 0, ['Step sideways, cross the back foot behind', 'Step sideways again, cross in front', 'Stay light on your feet', 'Go and come back'], 'Slow it down until the pattern feels easy.');
E('goblet_carry', 'Goblet carry', 'walkGoblet', 'db1', 'wt', 'carry', 2.5, ['Hold one dumbbell or kettlebell at chest', 'Elbows in, stand tall', 'Walk with steady steps', 'Breathe normally'], 'Trains posture and deep core.');

// ---------- MOBILITY / YOGA / STRETCH ----------
E('cat_cow', 'Cat-cow', 'catCow', '', 'r', 'mob', 0, ['Hands under shoulders, knees under hips', 'Inhale: drop belly, lift head', 'Exhale: round back, tuck chin', 'Move with your breath'], 'Use a folded mat under knees.');
E('torso_twist', 'Standing torso twist', 'torsoTwist', '', 'r', 'mob', 0, ['Feet hip-width, arms loose', 'Turn gently side to side', 'Let arms swing', 'Hips stay mostly forward'], 'Keep it gentle and rhythmic.');
E('side_bend_stretch', 'Standing side reach', 'sideReach', '', 'r', 'mob', 0, ['Feet together, one arm overhead', 'Reach up and over', 'Feel the side of the body open', 'Switch sides'], 'Don\'t twist; reach straight sideways.');
E('leg_swing', 'Leg swings', 'legSwing', 'sc:wallR', 'r', 'mob', 0, ['Hand on a wall', 'Swing one leg forward and back', 'Grow the swing gradually', 'Switch legs'], 'Stand tall; don\'t force the range.');
E('hip_gate', 'Hip open-the-gate', 'hipGate', '', 'r', 'mob', 0, ['Stand tall, hands on hips', 'Lift knee in front', 'Rotate it out to the side', 'Lower and switch'], 'Hold a wall for balance.');
E('knee_hug', 'Walking knee hug', 'kneeHug', '', 'r', 'mob', 0, ['Lift one knee', 'Hug it toward chest', 'Rise onto the standing toe', 'Step and switch'], 'Go slowly; balance first.');
E('arm_circles', 'Arm circles', 'armCircles', '', 'r', 'mob', 0, ['Arms out at shoulder height', 'Small circles forward', 'Grow them bigger', 'Reverse direction'], 'Keep shoulders relaxed.');
E('wall_slide', 'Wall slides', 'wallSlide', 'sc:wallF', 'r', 'mob', 0, ['Back and arms against a wall', 'Start with arms in a W', 'Slide up into a Y', 'Keep wrists touching the wall'], 'Only as high as you can keep contact.');
E('warrior2', 'Warrior II', 'warrior2', '', 't', 'flow', 0, ['Feet wide, front toes forward', 'Bend front knee over ankle', 'Arms long at shoulder height', 'Gaze over front hand'], 'Shorten the stance if knees complain.');
E('warrior1', 'Warrior I', 'warrior1', '', 't', 'flow', 0, ['Long step, back heel down at 45°', 'Bend front knee', 'Hips face forward', 'Arms reach up'], 'Hands on hips is a fine option.');
E('chair_pose', 'Chair pose', 'chairPose', '', 't', 'flow', 0, ['Feet together or hip-width', 'Sit back as if into a chair', 'Arms reach up and forward', 'Weight in the heels'], 'Go only as low as is comfortable.');
E('side_angle', 'Extended side angle', 'sideAngle', '', 't', 'flow', 0, ['From Warrior II', 'Forearm rests on front thigh', 'Top arm reaches over the ear', 'Long line from heel to fingertips'], 'Keep the chest open, not collapsing.');
E('tree', 'Tree pose', 'tree', '', 't', 'flow', 0, ['Stand on one leg', 'Foot on calf or inner thigh, never the knee', 'Hands at chest or overhead', 'Fix gaze on one point'], 'Toes down on the floor (kickstand) is fine.');
E('warrior3', 'Warrior III at the wall', 'warrior3', 'sc:wallFar', 'r', 'flow', 0, ['Hands on a wall at hip height', 'Hinge forward on one leg', 'Back leg lifts in line with the body', 'Hips stay level'], 'The wall does the balancing for you.');
E('low_lunge', 'Low lunge', 'lowLunge', '', 't', 'flow', 0, ['Back knee on a folded mat', 'Front knee over ankle', 'Sink hips forward gently', 'Arms up or hands on thigh'], 'Pad the back knee well.');
E('garland', 'Supported garland squat', 'garland', '', 't', 'flow', 0, ['Feet wider than hips, toes out', 'Sit low, heels down (block under hips ok)', 'Elbows press knees apart', 'Chest lifts'], 'Hold a door frame or sit on a block.');
E('cobra', 'Cobra', 'cobra', '', 't', 'flow', 0, ['Lie face down, hands under shoulders', 'Press gently to lift the chest', 'Elbows stay bent', 'Shoulders away from ears'], 'Low cobra is enough; no pinching in the back.');
E('down_dog', 'Downward dog', 'downDog', '', 't', 'flow', 0, ['From plank, lift hips up and back', 'Knees can stay bent', 'Press the floor away', 'Heels reach toward the floor'], 'Hands on a chair seat makes this easier.');
E('bridge_pose', 'Bridge pose', 'gluteBridge', '', 't', 'flow', 0, ['Lie on back, feet under knees', 'Lift hips, arms along the floor', 'Hold and breathe', 'Roll down one vertebra at a time'], 'Keep knees pointing forward.');
E('seated_fold', 'Seated forward fold', 'seatedFold', '', 't', 'stretch', 0, ['Sit tall, legs long', 'Hinge forward from the hips', 'Hands on shins or feet', 'Breathe into the back of the legs'], 'Bend knees if the lower back rounds a lot.');
E('strap_ham', 'Lying towel hamstring stretch', 'strapHam', 'strap', 't', 'stretch', 0, ['Lie on back, towel around one foot', 'Raise the straight leg', 'Stop at a gentle pull', 'Switch legs'], 'The safest hamstring stretch for the back.');
E('step_ham', 'Standing hamstring stretch', 'stepHam', 'sc:box', 't', 'stretch', 0, ['Heel on the flat bench, leg straight', 'Hinge forward with a flat back', 'Hands on thigh', 'Switch legs'], 'Keep the standing knee soft.');
E('figure4', 'Figure-4 stretch', 'figure4', '', 't', 'stretch', 0, ['Lie on back, ankle over opposite knee', 'Pull the bottom thigh toward you', 'Feel the outer hip', 'Switch sides'], 'Keep head resting on the floor.');
E('butterfly', 'Butterfly stretch', 'butterfly', '', 't', 'stretch', 0, ['Sit tall, soles together', 'Let knees drop out', 'Hold feet, lean slightly forward', 'Breathe'], 'Sit on a cushion to make it easier.');
E('kneel_hipflexor', 'Kneeling hip flexor stretch', 'kneelHipFlexor', '', 't', 'stretch', 0, ['Kneel on one knee, front foot forward', 'Tuck tailbone under', 'Shift hips gently forward', 'Switch sides'], 'Pad the knee.');
E('standing_quad', 'Standing quad stretch', 'standingQuad', 'sc:wallR', 't', 'stretch', 0, ['Hold a wall', 'Grab ankle, heel to glute', 'Knees side by side', 'Switch legs'], 'Use a towel around the ankle if you can\'t reach.');
E('doorway_chest', 'Rack-upright chest stretch', 'doorway', 'sc:door', 't', 'stretch', 0, ['Forearm on a rack upright or door frame, elbow at shoulder height', 'Step through gently', 'Feel the chest open', 'Switch sides'], 'Gentle stretch only; no pain in the shoulder.');
E('cross_body', 'Cross-body shoulder stretch', 'crossBody', '', 't', 'stretch', 0, ['Bring one arm across the chest', 'Hold above the elbow', 'Pull gently', 'Switch'], 'Keep shoulder down.');
E('triceps_stretch', 'Overhead triceps stretch', 'tricepsStretch', '', 't', 'stretch', 0, ['Reach one arm up, bend the elbow', 'Hand drops behind the head', 'Other hand eases the elbow back', 'Switch'], 'Stand tall; don\'t arch.');
E('childs_pose', "Child's pose", 'childsPose', '', 't', 'stretch', 0, ['Kneel, sit back to heels', 'Walk hands forward', 'Forehead rests down', 'Breathe into the back'], 'Knees wide or a pillow under the hips helps.');
E('supine_twist', 'Lying spinal twist', 'supineTwist', '', 't', 'stretch', 0, ['Lie on back, knees bent', 'Let both knees fall to one side', 'Arms out, shoulders down', 'Switch sides'], 'Pillow under the knees if needed.');
E('knees_chest', 'Knees to chest', 'kneesChest', '', 't', 'stretch', 0, ['Lie on back', 'Hug both knees in', 'Gently rock side to side', 'Breathe'], 'Easy release for the lower back.');

// ---------- CARDIO ----------
E('incline_walk', 'Incline treadmill walk', 'walk', 'sc:treadmill', 'min', null, 0, ['Incline 6–10%, speed 4.5–5.5 km/h', 'Don\'t hold the rails', 'Stand tall, arms swing', 'Aim to talk in short sentences'], 'Cool down at 0% for the last 2 minutes.');
E('bike', 'Stationary bike', 'bike', 'sc:bike', 'min', null, 0, ['Seat height: slight bend at bottom of pedal', 'Steady cadence 70–90 rpm', 'Add resistance every 5 minutes', 'Relaxed shoulders'], 'Easiest on the knees.');
E('recumbent_bike', 'Seated (recumbent) cycle', 'recumbent', 'sc:recumbent', 'min', null, 0, ['Back against the seat', 'Knee slightly bent at the far pedal', 'Steady cadence 60–80 rpm', 'Add resistance every 5 minutes'], 'The most joint-friendly cardio option.');
E('cross_trainer', 'Cross-trainer', 'walk', 'sc:elliptical', 'min', null, 0, ['Stand tall, hold moving handles', 'Push and pull with arms', 'Smooth strides', 'Moderate resistance'], 'Low impact, full body.');
E('rower', 'Rowing machine', 'rower', 'c:182,112 sc:rower', 'min', null, 0, ['Legs, then body, then arms', 'Return: arms, body, legs', 'Keep back straight', 'Easy pace, 20–24 strokes/min'], 'Push with legs; don\'t yank with the back.');
E('stair_climber', 'Stepper', 'stairClimb', 'sc:stairs', 'min', null, 0, ['Slow steady pace', 'Light touch on the rails', 'Whole foot on each step', 'Stand tall'], 'Choose a speed you can hold for 15 minutes.');

/* Preset day templates */
const PRESETS = [
  { id: 'legs_sh', name: 'Legs + Shoulders', groups: ['legs', 'shoulders'], cardio: 15 },
  { id: 'chest_tri', name: 'Chest + Triceps', groups: ['chest', 'triceps'], cardio: 15 },
  { id: 'back_bi', name: 'Back + Biceps', groups: ['back', 'biceps'], cardio: 15 },
  { id: 'athletic', name: 'Athletic + Core', groups: ['athletic', 'core'], cardio: 15 },
  { id: 'yoga', name: 'Yoga + Stretching', groups: ['mobility', 'yoga', 'stretch'], cardio: 0 },
  { id: 'cardio', name: 'Cardio only', groups: [], cardio: 30 },
  { id: 'rest', name: 'Rest', groups: [], cardio: 0 },
];

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_NAMES = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

const RECOMMENDED = {
  mon: { groups: ['legs', 'shoulders'], cardio: 15 },
  tue: { groups: ['chest', 'triceps'], cardio: 15 },
  wed: { groups: ['athletic', 'core'], cardio: 15 },
  thu: { groups: ['back', 'biceps'], cardio: 15 },
  fri: { groups: ['mobility', 'yoga', 'stretch'], cardio: 0 },
  sat: { groups: [], cardio: 0 },
  sun: { groups: [], cardio: 0 },
};
