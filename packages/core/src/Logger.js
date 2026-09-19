import { SecurityHelper } from "./SecurityHelper.js";

export class Logger {
  constructor(serviceName = "BOT") {
    this.serviceName = serviceName.toUpperCase();
  }

  format(level, message) {
    const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
    const cleanMessage = SecurityHelper.redactSensitiveData(message);
    return `[${timestamp}] [${this.serviceName}] [${level}]: ${cleanMessage}`;
  }

  info(message) {
    console.log(this.format("INFO", message));
  }

  warn(message) {
    console.warn(this.format("WARN", message));
  }

  error(message, error) {
    const cleanError = error ? SecurityHelper.redactSensitiveData(error.stack || error.message || error) : "";
    console.error(this.format("ERROR", message), cleanError);
  }

  success(message) {
    console.log(this.format("SUCCESS", message));
  }
}
