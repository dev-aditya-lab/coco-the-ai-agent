/**
 * Base tool class for all LangChain agent tools
 * Provides common interface and utility methods
 */

export class BaseTool {
  constructor(name, description, schema) {
    this.name = name;
    this.description = description;
    this.schema = schema || {
      type: "object",
      properties: {},
      required: [],
    };
  }

  /**
   * Execute the tool - must be implemented by subclasses
   * @param {Object} input - Input parameters
   * @returns {Promise<string>} - Result as string
   */
  async execute(input) {
    throw new Error(`execute() must be implemented in ${this.name}`);
  }

  /**
   * Get tool definition for LangChain
   * @returns {Object} - Tool definition
   */
  getDefinition() {
    return {
      name: this.name,
      description: this.description,
      schema: this.schema,
    };
  }

  /**
   * Normalize string utility
   * @param {*} value - Value to normalize
   * @returns {string} - Normalized string
   */
  normalizeString(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  /**
   * Format response based on style (bilingual or english)
   * @param {string} style - Response style ('bilingual' or 'english')
   * @param {string} hinglish - Hinglish response
   * @param {string} english - English response
   * @returns {string} - Formatted response
   */
  formatByStyle(style, hinglish, english) {
    if (style === "bilingual") {
      return hinglish;
    }
    return english;
  }
}
