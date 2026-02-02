export class MoonrakerError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody?: string
  ) {
    super(message);
    this.name = "MoonrakerError";
  }

  toUserMessage(): string {
    switch (this.statusCode) {
      case 401:
        return "Authentication failed. Check your MOONRAKER_API_KEY.";
      case 403:
        return "Permission denied. Config write access may be disabled in Moonraker.";
      case 404:
        return "File or directory not found.";
      case 409:
        return "Conflict: The file may be in use or locked.";
      case 500:
        return `Moonraker server error: ${this.responseBody}`;
      default:
        return this.message;
    }
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}
