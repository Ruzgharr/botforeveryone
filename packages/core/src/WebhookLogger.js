export class WebhookLogger {
  static async sendAlert(webhookUrl, { title, description, color = 0xe02424, fields = [], footer = "Ecosystem Guard" }) {
    if (!webhookUrl || !webhookUrl.startsWith("http")) return false;

    const payload = {
      embeds: [
        {
          title: title || "Güvenlik Bildirimi",
          description: description || "",
          color,
          fields,
          footer: { text: footer },
          timestamp: new Date().toISOString()
        }
      ]
    };

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
