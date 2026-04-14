function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isHindiScriptText(text) {
  return /[\u0900-\u097F]/.test(text);
}

function sentenceCaseHindi(text) {
  if (!text) {
    return "";
  }

  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?।])/g, "$1")
    .trim();
}

function convertKnownPatterns(input) {
  const text = normalizeText(input);
  if (!text) {
    return "";
  }

  const patterns = [
    {
      regex: /^hello,?\s*kaise\s+help\s+kar\s+sakta\s+hoon\??$/i,
      out: "हेलो, कैसे मदद कर सकता हूँ?",
    },
    {
      regex: /^song\s+play\s+kar\s+raha\s+hoon\.?$/i,
      out: "मैं गाना चला रहा हूँ",
    },
    {
      regex: /^file\s+create\s+ho\s+gayi\s+hai\.?$/i,
      out: "फ़ाइल बन गई है",
    },
    {
      regex: /^(.+?)\s+browser\s+me\s+open\s+kar\s+raha\s+hoon\.?$/i,
      out: (_, site) => `मैं ${site.trim()} ब्राउज़र में खोल रहा हूँ`,
    },
    {
      regex: /^(.+?)\s+open\s+kar\s+raha\s+hoon\.?$/i,
      out: (_, appName) => `मैं ${appName.trim()} खोल रहा हूँ`,
    },
    {
      regex: /^(.+?)\s+play\s+kar\s+raha\s+hoon\.?$/i,
      out: (_, thing) => `मैं ${thing.trim()} चला रहा हूँ`,
    },
  ];

  for (const rule of patterns) {
    const match = text.match(rule.regex);
    if (!match) {
      continue;
    }

    const converted = typeof rule.out === "function" ? rule.out(...match) : rule.out;
    return sentenceCaseHindi(converted);
  }

  return "";
}

function convertTokenFallback(input) {
  const text = normalizeText(input);
  if (!text) {
    return "";
  }

  const map = new Map([
    [/\bhello\b/gi, "हेलो"],
    [/\bhow are you\b/gi, "आप कैसे हैं"],
    [/\bkaise\b/gi, "कैसे"],
    [/\bhelp\b/gi, "मदद"],
    [/\bmain\b/gi, "मैं"],
    [/\bmein\b/gi, "में"],
    [/\bme\b/gi, "में"],
    [/\bopen\b/gi, "खोल"],
    [/\bplay\b/gi, "चला"],
    [/\bcreate\b/gi, "बना"],
    [/\bfile\b/gi, "फ़ाइल"],
    [/\bsong\b/gi, "गाना"],
    [/\bkar\b/gi, "कर"],
    [/\braha\b/gi, "रहा"],
    [/\brahi\b/gi, "रही"],
    [/\bhoon\b/gi, "हूँ"],
    [/\bhai\b/gi, "है"],
    [/\bgayi\b/gi, "गई"],
    [/\bho\b/gi, "हो"],
    [/\bbrowser\b/gi, "ब्राउज़र"],
  ]);

  let converted = text;
  for (const [pattern, replacement] of map.entries()) {
    converted = converted.replace(pattern, replacement);
  }

  converted = converted
    .replace(/\bkar\s+raha\s+hoon\b/gi, "कर रहा हूँ")
    .replace(/\bkar\s+rahi\s+hoon\b/gi, "कर रही हूँ")
    .replace(/\bho\s+gayi\s+hai\b/gi, "हो गई है")
    .replace(/\s+/g, " ")
    .trim();

  return sentenceCaseHindi(converted);
}

export function convertHinglishToHindiTts(inputText) {
  const text = normalizeText(inputText);
  if (!text) {
    return "";
  }

  if (isHindiScriptText(text)) {
    return text;
  }

  const fromPatterns = convertKnownPatterns(text);
  if (fromPatterns) {
    return fromPatterns;
  }

  const fromFallback = convertTokenFallback(text);
  return fromFallback || text;
}
