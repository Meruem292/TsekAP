export const HEALTH_REFERENCES = {
  whoGrowth: "https://www.who.int/tools/growth-reference-data-for-5to19-years",
  whoActivity: "https://www.who.int/publications/i/item/9789240015128",
  whoDiet: "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
  dohAdolescent: "https://armm.doh.gov.ph/images/HealthProgram_ICON/Philippine-Health-Advisories.pdf",
  cdcAsthma: "https://www.cdc.gov/asthma/living-with/",
  cdcArthritis: "https://www.cdc.gov/arthritis/prevention/",
  adaDiabetes: "https://diabetes.org/health-wellness/fitness/exercise-and-type-1",
  epilepsySafety: "https://www.epilepsy.com/parents-and-caregivers/talking-kids-about-epilepsy/sports-other-activities",
  heartActivity: "https://www.heart.org/en/health-topics/congenital-heart-defects/care-and-treatment-for-congenital-heart-defects/congenital-heart-defects-and-physical-activity",
  youthStrength: "https://www.healthychildren.org/English/healthy-living/sports/Pages/Strength-Training.aspx",
  celiacDiet: "https://www.niddk.nih.gov/health-information/digestive-diseases/celiac-disease/eating-diet-nutrition",
  foodAllergy: "https://www.cdc.gov/school-health-conditions/food-allergies/",
  dashDiet: "https://www.nhlbi.nih.gov/health/dash-eating-plan"
};

export const BMI_CLASSIFICATIONS = ["Severe thinness", "Thinness", "Within expected range", "Overweight", "Obesity"];
export const SUPPORTED_CONDITIONS = ["asthma", "heart", "hypertension", "diabetes", "epilepsy", "arthritis", "injury", "allergy", "celiac", "other", "private"];

const ALL_BMI = [...BMI_CLASSIFICATIONS];
const STANDARD_BMI = ["Thinness", "Within expected range", "Overweight"];

const EXERCISE_CATALOG = [
  {
    id: "comfortable-walking", title: "Comfortable walking", asset: "exercise-walking", category: "aerobic",
    intensity: "Gentle–moderate", impact: "Low impact", classifications: ALL_BMI,
    preferredConditions: ["asthma", "heart", "hypertension", "diabetes", "epilepsy", "arthritis", "injury", "other", "private"],
    body: "Choose a comfortable pace that lets you talk. Begin with a short route and add time gradually as it feels easier.",
    why: "A practical, repeatable way to build stamina without treating movement as punishment.",
    safety: "Stop for chest pain, faintness, unusual breathlessness, or pain that changes how you walk.",
    safetyByCondition: {
      asthma: "Follow your Asthma Action Plan and keep prescribed quick-relief medicine available.",
      heart: "Use the pace and limits approved by your healthcare professional.",
      diabetes: "Follow your glucose, food, and medication plan before and after activity.",
      epilepsy: "Walk with a buddy when your seizure-safety plan recommends it.",
      injury: "Only walk when it does not increase pain, swelling, or instability."
    }, source: "WHO physical activity guidance", href: HEALTH_REFERENCES.whoActivity, baseScore: 20
  },
  {
    id: "cycling", title: "Cycling", asset: "exercise-cycling", category: "aerobic",
    intensity: "Gentle–moderate", impact: "Low impact", classifications: ALL_BMI,
    preferredConditions: ["asthma", "hypertension", "diabetes", "arthritis", "injury"],
    body: "Use a stationary bike or a safe, level route and increase duration gradually rather than racing.",
    why: "Cycling supports aerobic fitness while placing less impact on many joints than repeated jumping.",
    safety: "Wear a helmet outdoors and choose a traffic-free route whenever possible.",
    safetyByCondition: {
      asthma: "Warm up first and follow your Asthma Action Plan.",
      epilepsy: "Ride with a buddy, wear a helmet, and avoid roads or heights if seizures are not fully controlled.",
      injury: "Use only if cycling is allowed by your rehabilitation plan."
    }, source: "WHO physical activity guidance", href: HEALTH_REFERENCES.whoActivity, baseScore: 17
  },
  {
    id: "warmup-mobility", title: "Warm-up and mobility", asset: "exercise-warmup", category: "mobility",
    intensity: "Gentle", impact: "Low impact", classifications: ALL_BMI,
    preferredConditions: ["asthma", "heart", "hypertension", "diabetes", "epilepsy", "arthritis", "injury", "other", "private"],
    body: "Use easy marching, shoulder rolls, and comfortable joint movements before activity, then cool down gradually.",
    why: "A gradual start helps you notice symptoms and prepare your body before harder movement.",
    safety: "Stay within a comfortable range and never force a painful stretch.",
    safetyByCondition: { asthma: "A gradual warm-up should follow your Asthma Action Plan.", injury: "Use only movements approved for the injured area." },
    source: "WHO physical activity guidance", href: HEALTH_REFERENCES.whoActivity, baseScore: 19
  },
  {
    id: "chair-squats", title: "Supported chair squats", asset: "exercise-strength", category: "strength",
    intensity: "Gentle–moderate", impact: "Low impact", classifications: ALL_BMI,
    preferredConditions: ["arthritis", "hypertension", "diabetes"], excludedConditions: ["injury"],
    body: "Stand up from a stable chair with control, then sit back slowly. Use support and stop before your form breaks down.",
    why: "A stable bodyweight movement can build strength for everyday tasks without maximum loads.",
    safety: "Use a non-slip surface and stop if you feel joint pain, dizziness, or instability.",
    safetyByCondition: { arthritis: "Use a pain-free range and ask a therapist about helpful modifications.", hypertension: "Breathe continuously; do not hold your breath or strain." },
    source: "CDC joint-friendly activity guidance", href: HEALTH_REFERENCES.cdcArthritis, baseScore: 15
  },
  {
    id: "jumping-jacks", title: "Jumping jacks", asset: "exercise-jumping-jacks", category: "bone-strengthening",
    intensity: "Vigorous", impact: "High impact", classifications: ["Within expected range", "Overweight"],
    preferredConditions: [], excludedConditions: ["heart", "hypertension", "epilepsy", "arthritis", "injury", "other", "private"],
    body: "Try a brief set with soft landings, or step one foot out at a time for a lower-impact version.",
    why: "Short jumping activities can strengthen bones and add vigorous movement when high-impact exercise is appropriate.",
    safety: "Use supportive shoes and a clear, non-slip space. Stop if landing causes pain.",
    safetyByCondition: { asthma: "Warm up, follow your Asthma Action Plan, and pause for breathing symptoms." },
    source: "WHO physical activity guidance", href: HEALTH_REFERENCES.whoActivity, baseScore: 7
  },
  {
    id: "modified-pushups", title: "Modified or wall push-ups", asset: "exercise-pushups", category: "strength",
    intensity: "Moderate", impact: "Low impact", classifications: STANDARD_BMI,
    preferredConditions: ["diabetes"], excludedConditions: ["injury", "heart", "other", "private"],
    body: "Begin against a wall or sturdy surface, keep your body aligned, and use controlled repetitions.",
    why: "This adjustable bodyweight exercise builds upper-body strength without maximum lifting.",
    safety: "Stop for wrist, shoulder, chest, or back pain and avoid holding your breath.",
    safetyByCondition: { hypertension: "Use an easy variation and breathe continuously without straining." },
    source: "WHO physical activity guidance", href: HEALTH_REFERENCES.whoActivity, baseScore: 12
  },
  {
    id: "light-resistance", title: "Supervised light weights", asset: "exercise-light-weights", category: "strength",
    intensity: "Moderate", impact: "Low impact", classifications: ["Thinness", "Within expected range", "Overweight", "Obesity"],
    preferredConditions: [], excludedConditions: ["heart", "hypertension", "injury", "other", "private"],
    body: "Use light dumbbells or a light bar only with qualified adult supervision, correct form, and controlled repetitions.",
    why: "Age-appropriate resistance can build strength when technique matters more than the amount lifted.",
    safety: "Never attempt maximum, Olympic, ballistic, or unsupervised lifts. Use a spotter and stop for pain.",
    source: "AAP youth strength-training guidance", href: HEALTH_REFERENCES.youthStrength, baseScore: 10
  },
  {
    id: "walk-jog", title: "Walk-jog progression", asset: "exercise-walk-jog", category: "aerobic",
    intensity: "Moderate", impact: "Moderate impact", classifications: ["Within expected range", "Overweight"],
    preferredConditions: ["asthma", "diabetes"], excludedConditions: ["heart", "arthritis", "injury", "other", "private"],
    body: "Alternate comfortable walking with short, easy jogging intervals and lengthen the jogging portions gradually.",
    why: "Intervals make jogging easier to build without forcing a long continuous run.",
    safety: "Return to walking if you cannot speak a short sentence or if your form becomes uncomfortable.",
    safetyByCondition: { asthma: "Warm up and follow your Asthma Action Plan.", diabetes: "Follow your glucose and hypoglycemia plan." },
    source: "WHO physical activity guidance", href: HEALTH_REFERENCES.whoActivity, baseScore: 11
  },
  {
    id: "jogging", title: "Easy jogging", asset: "exercise-jogging", category: "aerobic",
    intensity: "Moderate–vigorous", impact: "Moderate impact", classifications: ["Within expected range"],
    preferredConditions: [], excludedConditions: ["heart", "hypertension", "epilepsy", "arthritis", "injury", "other", "private"],
    body: "Jog at an easy pace on a level route and increase time only after your body adapts comfortably.",
    why: "Jogging develops aerobic fitness when impact and vigorous exercise are appropriate for you.",
    safety: "Warm up first, use supportive shoes, and stop for chest pain, faintness, or joint pain.",
    safetyByCondition: { asthma: "Follow your Asthma Action Plan and avoid known air-quality or weather triggers." },
    source: "WHO physical activity guidance", href: HEALTH_REFERENCES.whoActivity, baseScore: 6
  },
  {
    id: "dancing", title: "Dancing", asset: "exercise-dancing", category: "aerobic",
    intensity: "Gentle–vigorous", impact: "Adjustable", classifications: ALL_BMI,
    preferredConditions: ["asthma", "hypertension", "diabetes", "epilepsy"], excludedConditions: ["injury"],
    body: "Choose music and steps you enjoy, keep enough space around you, and adjust the pace or impact to your comfort.",
    why: "Enjoyable movement is easier to repeat, and the intensity can range from gentle to energetic.",
    safety: "Use a clear, non-slip area and choose low-impact steps if jumping is uncomfortable.",
    safetyByCondition: { epilepsy: "Dance with someone who knows your seizure first-aid plan when needed." },
    source: "WHO physical activity guidance", href: HEALTH_REFERENCES.whoActivity, baseScore: 14
  },
  {
    id: "jump-rope", title: "Jump rope", asset: "exercise-jump-rope", category: "bone-strengthening",
    intensity: "Vigorous", impact: "High impact", classifications: ["Within expected range", "Overweight"],
    preferredConditions: [], excludedConditions: ["heart", "hypertension", "epilepsy", "arthritis", "injury", "other", "private"],
    body: "Start with a few controlled jumps, land softly, and take generous breaks between short rounds.",
    why: "Jump rope combines vigorous aerobic and bone-strengthening movement in short sessions.",
    safety: "Use a clear space, supportive shoes, and a level surface. Stop if landing causes pain.",
    source: "WHO physical activity guidance", href: HEALTH_REFERENCES.whoActivity, baseScore: 5
  },
  {
    id: "swimming", title: "Swimming or water movement", asset: "exercise-swimming", category: "water",
    intensity: "Gentle–moderate", impact: "Low impact", classifications: ALL_BMI,
    preferredConditions: ["arthritis", "injury", "asthma"], excludedConditions: ["heart", "other", "private"],
    body: "Swim easy laps or use gentle water movement in a supervised pool, building time gradually.",
    why: "Water supports the body and can make aerobic movement more comfortable for joints.",
    safety: "Never swim alone. Use trained supervision and follow all pool-safety rules.",
    safetyByCondition: { epilepsy: "Use close one-to-one supervision and follow your seizure water-safety plan.", injury: "Enter the water only when approved by your rehabilitation professional." },
    source: "Epilepsy activity safety guidance", href: HEALTH_REFERENCES.epilepsySafety, baseScore: 13
  },
  {
    id: "resistance-bands", title: "Resistance-band training", asset: "exercise-resistance-band", category: "strength",
    intensity: "Gentle–moderate", impact: "Low impact", classifications: ALL_BMI,
    preferredConditions: ["arthritis", "hypertension", "diabetes"], excludedConditions: ["injury"],
    body: "Use a light band for slow, controlled pulls through a comfortable range, with posture and breathing relaxed.",
    why: "Band resistance is adjustable and can strengthen muscles without heavy equipment.",
    safety: "Check the band for damage, secure it safely, and never release it under tension toward your face.",
    safetyByCondition: { heart: "Use only within limits approved by your healthcare professional.", hypertension: "Breathe continuously and avoid straining." },
    source: "CDC joint-friendly activity guidance", href: HEALTH_REFERENCES.cdcArthritis, baseScore: 13
  },
  {
    id: "balance-yoga", title: "Balance and beginner yoga", asset: "exercise-balance-yoga", category: "balance",
    intensity: "Gentle", impact: "Low impact", classifications: ALL_BMI,
    preferredConditions: ["heart", "hypertension", "diabetes", "epilepsy", "arthritis", "other", "private"],
    body: "Practice stable beginner poses near a wall or chair, moving slowly and breathing normally.",
    why: "Gentle balance and mobility work can support control, flexibility, and confidence.",
    safety: "Avoid inverted or painful poses, use support, and stop if you feel dizzy or unsteady.",
    safetyByCondition: { hypertension: "Avoid breath-holding and straining.", epilepsy: "Practice with a buddy and away from hard edges when your safety plan calls for it." },
    source: "WHO physical activity guidance", href: HEALTH_REFERENCES.whoActivity, baseScore: 16
  }
];

const FOOD_CATALOG = [
  {
    id: "balanced-filipino-plate", title: "Balanced Filipino plate", asset: "food-balanced", category: "meal",
    purpose: "Balance & variety", classifications: ALL_BMI, preferredConditions: ["diabetes", "hypertension"],
    body: "Combine rice or another staple, vegetables, a protein such as fish, chicken, tofu, or beans, fruit, and water.",
    why: "A varied plate supports growth and school-day energy without labeling foods as good or bad.",
    safety: "Use portions and ingredients that fit your household, culture, allergies, and healthcare plan.",
    source: "WHO healthy diet guidance", href: HEALTH_REFERENCES.whoDiet, baseScore: 20
  },
  {
    id: "regular-meals", title: "Keep meals regular", asset: "food-everyday", category: "routine",
    purpose: "Meal routine", classifications: ALL_BMI, excludedConditions: ["allergy", "celiac"], preferredConditions: ["diabetes"],
    body: "Use regular, satisfying meals instead of skipping meals, fasting, or trying a crash diet.",
    why: "A predictable meal pattern can support concentration, movement, and steady nourishment across the day.",
    safety: "Follow condition-specific meal timing from your healthcare team when you have one.",
    source: "WHO healthy diet guidance", href: HEALTH_REFERENCES.whoDiet, baseScore: 18
  },
  {
    id: "growth-support", title: "Growth-supportive nourishing meal", asset: "food-nourishing", category: "meal",
    purpose: "Growth & recovery", classifications: ["Severe thinness", "Thinness"], excludedConditions: ["allergy", "celiac"],
    body: "Build meals with a staple, protein, vegetables or fruit, and energy-supportive foods available to your family.",
    why: "Regular nutrient-dense meals support growth and recovery without using exercise to compensate for food.",
    safety: "Unexpected weight loss or severe thinness needs supportive professional assessment.",
    source: "WHO healthy diet guidance", href: HEALTH_REFERENCES.whoDiet, baseScore: 24
  },
  {
    id: "growth-snack", title: "Protein and energy-supportive snack", asset: "food-growth-snack", category: "snack",
    purpose: "Growth-supportive snack", classifications: ["Severe thinness", "Thinness"], excludedConditions: ["allergy", "celiac"],
    body: "Choose a snack such as banana with a known-safe spread, yogurt or an alternative, egg with rice, or another family staple.",
    why: "A planned snack can add nourishment between meals when growth or recovery needs extra support.",
    safety: "Use foods already known to be safe for you and follow professional advice for unexplained weight changes.",
    source: "WHO healthy diet guidance", href: HEALTH_REFERENCES.whoDiet, baseScore: 21
  },
  {
    id: "munggo-meal", title: "Affordable munggo meal", asset: "food-munggo", category: "meal",
    purpose: "Fiber & plant protein", classifications: ALL_BMI, excludedConditions: ["allergy"], preferredConditions: ["heart", "hypertension", "diabetes", "celiac"],
    body: "Pair munggo with vegetables and rice, using fish, egg, tofu, or another suitable protein when available.",
    why: "Munggo is a familiar, flexible source of fiber and plant protein that can form a satisfying meal.",
    safety: "Keep salty seasonings and processed meat additions modest; verify every ingredient for your condition.",
    source: "WHO healthy diet guidance", href: HEALTH_REFERENCES.whoDiet, baseScore: 15
  },
  {
    id: "fruit-vegetable-snack", title: "Fruit and vegetable snack", asset: "food-fruit-vegetable-snack", category: "snack",
    purpose: "Fiber & color", classifications: ALL_BMI, excludedConditions: ["allergy"], preferredConditions: ["heart", "hypertension", "diabetes", "celiac"],
    body: "Choose an available fruit or sliced vegetables and pair it with a known-safe protein food if you need a more satisfying snack.",
    why: "Fruit and vegetables add fiber, vitamins, variety, and naturally occurring flavors.",
    safety: "Use only foods known to be safe for you and follow your diabetes meal plan when applicable.",
    source: "WHO healthy diet guidance", href: HEALTH_REFERENCES.whoDiet, baseScore: 14
  },
  {
    id: "calcium-breakfast", title: "Calcium-rich breakfast", asset: "food-calcium-breakfast", category: "breakfast",
    purpose: "Breakfast & bone support", classifications: ALL_BMI, excludedConditions: ["allergy", "celiac"],
    body: "Combine rice, oats, or bread with fruit and a calcium-rich food such as milk, yogurt, fortified soy, or another suitable alternative.",
    why: "A balanced breakfast can support school concentration while calcium-rich choices support growing bones.",
    safety: "Choose lactose-free, dairy-free, or gluten-free alternatives when required for your diagnosed needs.",
    source: "WHO healthy diet guidance", href: HEALTH_REFERENCES.whoDiet, baseScore: 12
  },
  {
    id: "lower-sodium", title: "Lower-sodium heart-supportive plate", asset: "food-lower-sodium", category: "meal",
    purpose: "Heart-supportive", classifications: ALL_BMI, preferredConditions: ["heart", "hypertension"], excludedConditions: ["allergy"],
    body: "Use vegetables, fruit, rice or another staple, and a suitable protein while limiting salty sauces, instant foods, and processed meats.",
    why: "A varied pattern lower in sodium and highly processed foods can support heart and blood-pressure care.",
    safety: "Follow any sodium, fluid, or medication-related instructions from your healthcare team.",
    source: "NHLBI DASH eating plan", href: HEALTH_REFERENCES.dashDiet, baseScore: 28
  },
  {
    id: "diabetes-balanced", title: "Diabetes-aware balanced meal", asset: "food-diabetes-balanced", category: "meal",
    purpose: "Glucose-aware routine", classifications: ALL_BMI, preferredConditions: ["diabetes"], excludedConditions: ["allergy"],
    body: "Pair a measured staple with vegetables and protein, keep meal timing regular, and choose water instead of sugary drinks.",
    why: "Balanced, predictable meals can make it easier to follow the glucose plan created with your healthcare team.",
    safety: "This app cannot set carbohydrate, insulin, or medication amounts. Follow your personal diabetes plan.",
    source: "American Diabetes Association", href: HEALTH_REFERENCES.adaDiabetes, baseScore: 28
  },
  {
    id: "gluten-free-filipino", title: "Naturally gluten-free Filipino plate", asset: "food-gluten-free", category: "meal",
    purpose: "Gluten-free balance", classifications: ALL_BMI, preferredConditions: ["celiac"],
    body: "Build around plain rice, corn, vegetables, fruit, beans, fish, meat, or tofu prepared with verified gluten-free ingredients.",
    why: "Many familiar staple foods are naturally gluten-free and can still create a varied, balanced meal.",
    safety: "Check sauces and packaged ingredients, and prevent contact with wheat, barley, rye, and contaminated utensils.",
    safetyByCondition: { allergy: "Use only ingredients that are also safe for your specific food allergy." },
    source: "NIDDK celiac diet guidance", href: HEALTH_REFERENCES.celiacDiet, baseScore: 28
  },
  {
    id: "allergy-aware", title: "Allergy-aware safe-food preparation", asset: "food-allergy-aware", category: "safety",
    purpose: "Allergen safety", classifications: ALL_BMI, preferredConditions: ["allergy", "celiac"],
    body: "Read the current ingredient label, use your established safe-food list, and keep preparation surfaces and utensils separate when needed.",
    why: "Preventing cross-contact matters more than choosing a generic ‘healthy’ food when an allergen is involved.",
    safety: "Follow your emergency plan and never test an uncertain food through this app.",
    source: "CDC food-allergy guidance", href: HEALTH_REFERENCES.foodAllergy, baseScore: 30
  },
  {
    id: "hydration", title: "Water and hydrating foods", asset: "food-hydration", category: "hydration",
    purpose: "Hydration", classifications: ALL_BMI, preferredConditions: ["asthma", "hypertension", "diabetes", "epilepsy", "arthritis", "injury", "allergy", "celiac", "other", "private"],
    body: "Choose safe drinking water regularly and include familiar hydrating foods such as fruit, vegetables, and soups that fit your care plan.",
    why: "Hydration supports school, movement, and concentration without relying on sugary drinks.",
    safety: "Follow any fluid restriction or condition-specific hydration advice from your healthcare team.",
    source: "WHO healthy diet guidance", href: HEALTH_REFERENCES.whoDiet, baseScore: 17
  }
];

const CLASSIFICATION_PREFERENCES = {
  "Severe thinness": ["warmup-mobility", "comfortable-walking", "chair-squats", "balance-yoga", "growth-support", "growth-snack", "balanced-filipino-plate", "regular-meals"],
  Thinness: ["chair-squats", "comfortable-walking", "resistance-bands", "light-resistance", "growth-support", "growth-snack", "balanced-filipino-plate", "regular-meals"],
  "Within expected range": ["comfortable-walking", "dancing", "modified-pushups", "walk-jog", "balanced-filipino-plate", "regular-meals", "munggo-meal", "fruit-vegetable-snack"],
  Overweight: ["cycling", "comfortable-walking", "chair-squats", "dancing", "balanced-filipino-plate", "regular-meals", "munggo-meal", "hydration"],
  Obesity: ["cycling", "comfortable-walking", "chair-squats", "swimming", "balanced-filipino-plate", "regular-meals", "munggo-meal", "hydration"]
};

const CONDITION_CAUTIONS = {
  asthma: "Warm up gradually, follow your Asthma Action Plan, and stop for coughing, wheezing, chest tightness, or breathing trouble.",
  heart: "Use only activities and limits approved by a healthcare professional who knows your heart condition.",
  hypertension: "Avoid heavy lifting, straining, and breath-holding; use the activity and food plan from your healthcare team.",
  diabetes: "Follow your personal glucose-monitoring, food, medication, and hypoglycemia plan around activity.",
  epilepsy: "Use your seizure-safety plan, appropriate supervision, and a buddy for activities where a seizure could cause injury.",
  arthritis: "Choose low-impact, pain-free movement and ask for professional help if pain, stiffness, or swelling worsens.",
  injury: "Follow rehabilitation guidance and stop any movement that increases pain, swelling, or instability.",
  allergy: "Use only foods on your established safe list, prevent cross-contact, and follow your emergency plan.",
  celiac: "Use verified gluten-free ingredients and prevent cross-contact during storage, preparation, and serving.",
  other: "Because this condition is not specified, use professional guidance before changing activity or meals.",
  private: "Because not every health need is known here, begin conservatively and use professional guidance."
};

function normalizedConditions(conditions) {
  return [...new Set(Array.isArray(conditions) ? conditions.filter((condition) => SUPPORTED_CONDITIONS.includes(condition)) : [])];
}

function safeFor(item, classification, conditions) {
  return item.classifications.includes(classification) && !(item.excludedConditions || []).some((condition) => conditions.includes(condition));
}

function itemScore(item, classification, conditions) {
  const preferenceIndex = (CLASSIFICATION_PREFERENCES[classification] || []).indexOf(item.id);
  const classificationScore = preferenceIndex < 0 ? 0 : 40 - preferenceIndex * 3;
  const conditionScore = conditions.reduce((score, condition) => score + ((item.preferredConditions || []).includes(condition) ? 35 : 0), 0);
  return item.baseScore + classificationScore + conditionScore;
}

function rankedCatalog(catalog, classification, conditions) {
  const ranked = catalog
    .filter((item) => safeFor(item, classification, conditions))
    .map((item, index) => ({ item, index, score: itemScore(item, classification, conditions) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const varied = [];
  const deferred = [];
  const categories = new Set();
  for (const entry of ranked) {
    if (!categories.has(entry.item.category) && varied.length < 3) {
      varied.push(entry);
      categories.add(entry.item.category);
    } else deferred.push(entry);
  }
  return [...varied, ...deferred].map(({ item }) => item);
}

function personalizedSafety(item, conditions) {
  const specific = conditions.map((condition) => item.safetyByCondition?.[condition]).filter(Boolean);
  return [...new Set([item.safety, ...specific])].join(" ");
}

function toCard(kind, item, conditions) {
  return {
    id: item.id,
    kind,
    title: item.title,
    body: item.body,
    image: `/assets/recommendations/${item.asset}.jpg`,
    video: `/assets/recommendations/video/${item.asset}.mp4`,
    source: item.source,
    href: item.href,
    intensity: item.intensity || "Everyday choice",
    impact: item.impact || item.purpose,
    conditions: [...(item.preferredConditions || [])],
    excludedConditions: [...(item.excludedConditions || [])],
    classifications: [...item.classifications],
    safety: personalizedSafety(item, conditions),
    why: item.why
  };
}

export function wellnessPlanFor(classification, conditions = []) {
  const normalizedClassification = BMI_CLASSIFICATIONS.includes(classification) ? classification : "Within expected range";
  const selected = normalizedConditions(conditions);
  const exercise = rankedCatalog(EXERCISE_CATALOG, normalizedClassification, selected).map((item) => toCard("exercise", item, selected));
  const food = rankedCatalog(FOOD_CATALOG, normalizedClassification, selected).map((item) => toCard("food", item, selected));
  const cautions = selected.map((condition) => CONDITION_CAUTIONS[condition]).filter(Boolean);

  if (normalizedClassification === "Severe thinness") cautions.push("Severe thinness deserves supportive professional review. Do not use exercise to compensate for food or pursue weight loss.");
  if (normalizedClassification === "Obesity") cautions.push("BMI alone cannot explain health. Avoid fasting, crash diets, shame, or exercise used as punishment.");

  return { exercise, food, cautions: [...new Set(cautions)] };
}

export function recommendationsFor(classification, conditions = []) {
  const plan = wellnessPlanFor(classification, conditions);
  return [...plan.exercise.slice(0, 2), ...plan.food.slice(0, 2)];
}

export function recommendationPreview(items, expanded = false, limit = 3) {
  const safeItems = Array.isArray(items) ? items : [];
  const visible = expanded ? safeItems : safeItems.slice(0, limit);
  return { visible, remaining: Math.max(0, safeItems.length - limit) };
}

export const RECOMMENDATION_CATALOG = Object.freeze({ exercise: EXERCISE_CATALOG, food: FOOD_CATALOG });
