export class GeminiConfigError extends Error {
  constructor(message = "GEMINI_API_KEY is not set") {
    super(message);
    this.name = "GeminiConfigError";
  }
}

export class GeminiQuotaError extends Error {
  constructor(message = "Gemini rate limit or quota exceeded. Try again in a minute.") {
    super(message);
    this.name = "GeminiQuotaError";
  }
}

export class GeminiOutputError extends Error {
  constructor(message = "The model returned invalid output. Try again.") {
    super(message);
    this.name = "GeminiOutputError";
  }
}

export class GeminiUnavailableError extends Error {
  constructor(message = "Gemini is unavailable. Try again later.") {
    super(message);
    this.name = "GeminiUnavailableError";
  }
}
