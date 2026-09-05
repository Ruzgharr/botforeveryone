export class Logger {
  constructor(serviceName = "BOT") {
    this.serviceName = serviceName.toUpperCase();
  }

  format(level, message) {
    const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
    return `[${timestamp}] [${this.serviceName}] [${level}]: ${message}`;
  }

  info(message) {
    console.log(this.format("INFO", message));
  }

  warn(message) {
    console.warn(this.format("WARN", message));
  }

  error(message, error) {
    console.error(this.format("ERROR", message), error ? error : "");
  }

  success(message) {
    console.log(this.format("SUCCESS", message));
  }
}
