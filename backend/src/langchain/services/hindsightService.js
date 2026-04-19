import { HindsightClient } from "@vectorize-io/hindsight-client";
import { env } from "../../config/env.js";

let hindsightClient = null;
let bankReady = false;

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isConfigured() {
  return Boolean(env.hindsightApiEndpoint || env.hindsightApiUrl);
}

function getBaseUrl() {
  return env.hindsightApiEndpoint || env.hindsightApiUrl || "http://localhost:8888";
}

function getBankId() {
  return normalizeString(env.hindsightBankId) || "coco-agent";
}

function getClient() {
  if (!hindsightClient) {
    const options = { baseUrl: getBaseUrl() };

    if (normalizeString(env.hindsightApiKey)) {
      options.apiKey = env.hindsightApiKey;
    }

    hindsightClient = new HindsightClient(options);
  }

  return hindsightClient;
}

function normalizeMetadata(metadata = {}) {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  return Object.entries(metadata).reduce((accumulator, [key, value]) => {
    if (value === undefined || value === null) {
      return accumulator;
    }

    accumulator[key] = typeof value === "string" ? value : JSON.stringify(value);
    return accumulator;
  }, {});
}

function stringifyRecallResults(response) {
  const results = Array.isArray(response?.results) ? response.results : [];

  return results
    .map((result, index) => {
      const text = normalizeString(result?.text || result?.content || "");
      return text ? `${index + 1}. ${text}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

async function ensureMemoryBank() {
  if (!isConfigured()) {
    return "";
  }

  const bankId = getBankId();

  if (bankReady) {
    return bankId;
  }

  try {
    const client = getClient();
    await client.createBank(bankId, { name: "COCO Agent Memory" });
  } catch (error) {
    const message = String(error?.message || error || "").toLowerCase();
    if (!message.includes("already") && !message.includes("exists") && !message.includes("conflict")) {
      console.warn("[hindsight] bank_init_failed", error?.message || error);
    }
  }

  bankReady = true;
  return bankId;
}

export async function recallMemory(query, options = {}) {
  if (!normalizeString(query)) {
    return null;
  }

  const bankId = await ensureMemoryBank();
  if (!bankId) {
    return null;
  }

  try {
    const client = getClient();
    return await client.recall(bankId, query, {
      types: options.types || ["world", "experience", "observation"],
      maxTokens: options.maxTokens || 1200,
      budget: options.budget || "mid",
      trace: options.trace || false,
      queryTimestamp: options.queryTimestamp,
      includeEntities: options.includeEntities ?? true,
      includeChunks: options.includeChunks ?? false,
      includeSourceFacts: options.includeSourceFacts ?? false,
      tags: options.tags,
    });
  } catch (error) {
    console.warn("[hindsight] recall_failed", error?.message || error);
    return null;
  }
}

export async function buildMemoryContext(query, options = {}) {
  const response = await recallMemory(query, options);
  const resultText = stringifyRecallResults(response);

  if (!resultText) {
    return "";
  }

  return `Relevant long-term memory:\n${resultText}`;
}

export async function retainMemory(content, options = {}) {
  const safeContent = normalizeString(content);
  if (!safeContent) {
    return null;
  }

  const bankId = await ensureMemoryBank();
  if (!bankId) {
    return null;
  }

  try {
    const client = getClient();
    return await client.retain(bankId, safeContent, {
      context: options.context || "conversation",
      metadata: normalizeMetadata(options.metadata),
      documentId: options.documentId,
      tags: options.tags,
      async: options.async ?? false,
    });
  } catch (error) {
    console.warn("[hindsight] retain_failed", error?.message || error);
    return null;
  }
}

export async function reflectMemory(query, options = {}) {
  const safeQuery = normalizeString(query);
  if (!safeQuery) {
    return null;
  }

  const bankId = await ensureMemoryBank();
  if (!bankId) {
    return null;
  }

  try {
    const client = getClient();
    return await client.reflect(bankId, safeQuery, {
      context: options.context,
      budget: options.budget || "mid",
      maxTokens: options.maxTokens,
    });
  } catch (error) {
    console.warn("[hindsight] reflect_failed", error?.message || error);
    return null;
  }
}
