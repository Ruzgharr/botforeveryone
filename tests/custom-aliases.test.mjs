import test from "node:test";
import assert from "node:assert/strict";

function matchCommandTrigger(trigger, commands, config) {
  let matched = null;
  const commandTrigger = trigger.toLowerCase();

  for (const cmd of commands) {
    const cmdCfg = config.commands?.get ? config.commands.get(cmd.name) : config.commands?.[cmd.name];
    const customName = cmdCfg?.customName || cmd.name;
    const isEnabled = cmdCfg?.enabled ?? true;
    const mode = cmdCfg?.mode || "BOTH";

    if (!isEnabled || mode === "DISABLED" || mode === "SLASH") continue;

    const customAliases = Array.isArray(cmdCfg?.customAliases)
      ? cmdCfg.customAliases.map((a) => String(a).toLowerCase().trim())
      : (typeof cmdCfg?.customAliases === "string"
          ? cmdCfg.customAliases.split(",").map((a) => a.toLowerCase().trim()).filter(Boolean)
          : []);
    const builtInAliases = cmd.aliases ? cmd.aliases.map((a) => String(a).toLowerCase()) : [];

    if (
      cmd.name.toLowerCase() === commandTrigger ||
      customName.toLowerCase() === commandTrigger ||
      builtInAliases.includes(commandTrigger) ||
      customAliases.includes(commandTrigger)
    ) {
      matched = cmd;
      break;
    }
  }

  return matched;
}

test("BaseBot command matcher identifies primary name and builtin aliases", () => {
  const commands = [
    { name: "ban", aliases: ["yasakla"] },
    { name: "kick", aliases: ["at"] }
  ];
  const config = { commands: {} };

  assert.equal(matchCommandTrigger("ban", commands, config)?.name, "ban");
  assert.equal(matchCommandTrigger("yasakla", commands, config)?.name, "ban");
  assert.equal(matchCommandTrigger("at", commands, config)?.name, "kick");
  assert.equal(matchCommandTrigger("bilinmeyen", commands, config), null);
});

test("BaseBot command matcher handles customAliases defined from dashboard", () => {
  const commands = [
    { name: "ban", aliases: ["yasakla"] },
    { name: "coin", aliases: ["bakiye", "cuzdan"] }
  ];
  const config = {
    commands: {
      ban: {
        enabled: true,
        customName: "superban",
        customAliases: ["b", "ucur", "sutla"],
        mode: "BOTH"
      },
      coin: {
        enabled: true,
        customName: "para",
        customAliases: ["p", "c"],
        mode: "PREFIX"
      }
    }
  };

  assert.equal(matchCommandTrigger("superban", commands, config)?.name, "ban");
  assert.equal(matchCommandTrigger("b", commands, config)?.name, "ban");
  assert.equal(matchCommandTrigger("ucur", commands, config)?.name, "ban");
  assert.equal(matchCommandTrigger("sutla", commands, config)?.name, "ban");

  assert.equal(matchCommandTrigger("para", commands, config)?.name, "coin");
  assert.equal(matchCommandTrigger("p", commands, config)?.name, "coin");
  assert.equal(matchCommandTrigger("c", commands, config)?.name, "coin");
});

test("BaseBot command matcher respects mode DISABLED and SLASH", () => {
  const commands = [
    { name: "jail", aliases: ["karantina"] },
    { name: "mute", aliases: ["sustur"] }
  ];
  const config = {
    commands: {
      jail: { enabled: false, mode: "BOTH" },
      mute: { enabled: true, mode: "SLASH" }
    }
  };

  assert.equal(matchCommandTrigger("jail", commands, config), null);
  assert.equal(matchCommandTrigger("karantina", commands, config), null);
  assert.equal(matchCommandTrigger("mute", commands, config), null);
  assert.equal(matchCommandTrigger("sustur", commands, config), null);
});
