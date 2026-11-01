export const HEALTH_REFERENCES = {
  whoGrowth: "https://www.who.int/tools/growth-reference-data-for-5to19-years",
  whoActivity: "https://www.who.int/publications/i/item/9789240015128",
  whoDiet: "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
  dohAdolescent: "https://armm.doh.gov.ph/images/HealthProgram_ICON/Philippine-Health-Advisories.pdf",
  cdcAsthma: "https://www.cdc.gov/asthma/living-with/"
};

const bmiGuidance = {
  "Severe thinness": ["Ask for professional guidance", "A qualified healthcare professional can assess growth, nutrition, symptoms, and other factors that BMI cannot explain."],
  Thinness: ["Support steady growth", "Choose regular, varied meals and discuss unexpected weight changes or symptoms with a qualified healthcare professional."],
  "Within expected range": ["Keep building sustainable routines", "Continue varied meals, regular movement, hydration, and enough rest without focusing on a single measurement."],
  Overweight: ["Focus on sustainable habits", "Avoid crash diets. Build enjoyable activity and varied, balanced meals gradually, with professional guidance when needed."],
  Obesity: ["Seek supportive guidance", "A qualified healthcare professional can consider growth history and overall health and help plan safe, sustainable next steps."]
};

export function recommendationsFor(classification, conditions = []) {
  const selected = new Set(Array.isArray(conditions) ? conditions : []);
  const base = bmiGuidance[classification] || bmiGuidance["Within expected range"];
  const items = [
    { icon: "activity", title: base[0], body: base[1], source: "WHO growth reference", href: HEALTH_REFERENCES.whoGrowth },
    { icon: "leaf", title: "Choose balance and variety", body: "Build meals around adequacy, balance, moderation, diversity, and safe food choices.", source: "WHO healthy diet", href: HEALTH_REFERENCES.whoDiet }
  ];

  if (selected.has("asthma")) items.push({
    icon: "shield", title: "Plan activity around asthma",
    body: "Follow your personal Asthma Action Plan and healthcare provider’s guidance, and stop activity if breathing symptoms appear.",
    source: "CDC asthma guidance", href: HEALTH_REFERENCES.cdcAsthma
  });
  if (["heart", "hypertension", "diabetes", "epilepsy", "arthritis", "injury"].some((condition) => selected.has(condition))) items.push({
    icon: "shield", title: "Follow condition-specific guidance",
    body: "Choose activity that matches the plan from your qualified healthcare professional and your current symptoms.",
    source: "WHO physical activity guidance", href: HEALTH_REFERENCES.whoActivity
  });
  if (["allergy", "celiac"].some((condition) => selected.has(condition))) items.push({
    icon: "leaf", title: "Keep food restrictions safe",
    body: "Follow your established allergy or gluten-safety plan while maintaining a varied diet with professional support when needed.",
    source: "WHO healthy diet", href: HEALTH_REFERENCES.whoDiet
  });
  if (selected.has("other") || selected.has("private")) items.push({
    icon: "info", title: "Use advice that fits your health needs",
    body: "General recommendations may not account for every condition. Follow guidance from a qualified healthcare professional.",
    source: "DOH adolescent health advisory", href: HEALTH_REFERENCES.dohAdolescent
  });
  return items.slice(0, 4);
}
