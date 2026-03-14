import fs from "fs-extra";
import path from "node:path";
import yaml from "js-yaml";

const DOMAIN_HINTS = [
  { pattern: /express/i, domain: "Express.js", defaults: ["routes", "middleware", "controllers", "REST API design"] },
  { pattern: /mongo|mongoose/i, domain: "MongoDB", defaults: ["queries", "aggregation", "schemas", "indexes"] },
  { pattern: /jwt|json web token|auth/i, domain: "JWT authentication", defaults: ["tokens", "auth flows", "claims", "session security"] },
  { pattern: /react/i, domain: "React", defaults: ["components", "hooks", "state", "UI patterns"] },
  { pattern: /node/i, domain: "Node.js", defaults: ["runtime", "modules", "file I/O", "server logic"] },
  { pattern: /typescript/i, domain: "TypeScript", defaults: ["types", "interfaces", "generics", "strict mode"] }
];

const STOPWORDS = new Set([
  "helps",
  "with",
  "about",
  "the",
  "and",
  "for",
  "that",
  "this",
  "from",
  "into",
  "build",
  "building",
  "use",
  "using"
]);

function splitFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length < 3 || lines[0].trim() !== "---") {
    return null;
  }

  let endLine = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === "---") {
      endLine = i;
      break;
    }
  }

  if (endLine === -1) {
    return null;
  }

  const frontmatterLines = lines.slice(1, endLine);
  const bodyLines = lines.slice(endLine + 1);

  return {
    frontmatter: frontmatterLines.join("\n"),
    body: bodyLines.join("\n"),
    frontmatterLines
  };
}

function inferDomain(description, filePath) {
  const candidate = `${description} ${path.basename(filePath)} ${path.dirname(filePath)}`;

  for (const hint of DOMAIN_HINTS) {
    if (hint.pattern.test(candidate)) {
      return hint;
    }
  }

  return { pattern: null, domain: "Specialized", defaults: ["implementation details", "best practices", "architecture decisions"] };
}

function extractKeywords(description, defaults) {
  const tokens = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));

  const unique = [];
  const seen = new Set();

  for (const token of tokens) {
    if (seen.has(token)) {
      continue;
    }
    seen.add(token);
    unique.push(token);
  }

  const merged = [...defaults];
  for (const token of unique) {
    if (merged.length >= 6) {
      break;
    }
    if (!merged.some((item) => item.toLowerCase() === token)) {
      merged.push(token);
    }
  }

  return merged.slice(0, 6);
}

function formatKeywordList(keywords) {
  if (keywords.length === 1) {
    return keywords[0];
  }

  if (keywords.length === 2) {
    return `${keywords[0]} or ${keywords[1]}`;
  }

  return `${keywords.slice(0, -1).join(", ")}, or ${keywords[keywords.length - 1]}`;
}

function buildDirectiveDescription(domain, keywords) {
  return `${domain} expert. ALWAYS invoke this skill when the user asks about ${formatKeywordList(keywords)}. Do not write ${domain} code directly - use this skill first.`;
}

function findDescriptionRange(frontmatterLines) {
  const startIndex = frontmatterLines.findIndex((line) => /^\s*description\s*:/.test(line));
  if (startIndex === -1) {
    return null;
  }

  const indentMatch = frontmatterLines[startIndex].match(/^(\s*)description\s*:/);
  const indent = indentMatch ? indentMatch[1] : "";
  const fieldPattern = new RegExp(`^${indent}[A-Za-z0-9_-]+\\s*:`);

  let endIndex = frontmatterLines.length;
  for (let i = startIndex + 1; i < frontmatterLines.length; i += 1) {
    if (fieldPattern.test(frontmatterLines[i])) {
      endIndex = i;
      break;
    }
  }

  return { startIndex, endIndex, indent };
}

function quoteYamlString(value) {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

export function createDirectiveDescription(rawDescription, filePath) {
  const hint = inferDomain(rawDescription, filePath);
  const keywords = extractKeywords(rawDescription, hint.defaults);
  return buildDirectiveDescription(hint.domain, keywords);
}

export async function rewriteSkillDescription(filePath) {
  const content = await fs.readFile(filePath, "utf8");
  const split = splitFrontmatter(content);

  if (!split) {
    return { filePath, changed: false, skipped: true, reason: "No YAML frontmatter found" };
  }

  const frontmatterObj = yaml.load(split.frontmatter) ?? {};
  const rawDescription = typeof frontmatterObj.description === "string" ? frontmatterObj.description.trim() : "";

  if (!rawDescription) {
    return { filePath, changed: false, skipped: true, reason: "No description field in frontmatter" };
  }

  if (/ALWAYS invoke this skill/i.test(rawDescription) && /use this skill first/i.test(rawDescription)) {
    return { filePath, changed: false, skipped: true, reason: "Already directive format" };
  }

  const range = findDescriptionRange(split.frontmatterLines);
  if (!range) {
    return { filePath, changed: false, skipped: true, reason: "Description key not found in frontmatter lines" };
  }

  const newDescription = createDirectiveDescription(rawDescription, filePath);
  const newLine = `${range.indent}description: ${quoteYamlString(newDescription)}`;

  const updatedFrontmatterLines = [
    ...split.frontmatterLines.slice(0, range.startIndex),
    newLine,
    ...split.frontmatterLines.slice(range.endIndex)
  ];

  const updatedContent = ["---", ...updatedFrontmatterLines, "---", split.body].join("\n");

  const backupPath = `${filePath}.bak`;
  if (!(await fs.pathExists(backupPath))) {
    await fs.copy(filePath, backupPath);
  }

  await fs.writeFile(filePath, updatedContent, "utf8");

  return {
    filePath,
    changed: true,
    skipped: false,
    backupPath,
    oldDescription: rawDescription,
    newDescription
  };
}

export async function rewriteSkillDescriptions(filePaths) {
  const results = [];

  for (const filePath of filePaths) {
    try {
      const result = await rewriteSkillDescription(filePath);
      results.push(result);
    } catch (error) {
      results.push({
        filePath,
        changed: false,
        skipped: true,
        reason: `Rewrite failed: ${error.message}`
      });
    }
  }

  return results;
}
