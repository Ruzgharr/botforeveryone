import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export class GitUpdateManager {
  static getRootPath() {
    return process.cwd();
  }

  static getBackupsDir() {
    const dir = path.join(this.getRootPath(), ".system_generated", "backups");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  static getSafetyShieldDir() {
    const dir = path.join(this.getRootPath(), ".system_generated", "safety-shield");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  static preserveSafetyShield() {
    const root = this.getRootPath();
    const shieldDir = this.getSafetyShieldDir();

    const criticalItems = [".env", "data", "packages/config/src/index.js"];
    for (const item of criticalItems) {
      const src = path.join(root, item);
      const dest = path.join(shieldDir, item);
      if (fs.existsSync(src)) {
        if (fs.statSync(src).isDirectory()) {
          fs.mkdirSync(dest, { recursive: true });
          fs.cpSync(src, dest, { recursive: true, force: true });
        } else {
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.copyFileSync(src, dest);
        }
      }
    }
  }

  static restoreSafetyShield() {
    const root = this.getRootPath();
    const shieldDir = this.getSafetyShieldDir();

    if (!fs.existsSync(shieldDir)) return;

    const criticalItems = [".env", "data"];
    for (const item of criticalItems) {
      const shieldSrc = path.join(shieldDir, item);
      const targetDest = path.join(root, item);
      if (fs.existsSync(shieldSrc)) {
        if (fs.statSync(shieldSrc).isDirectory()) {
          fs.mkdirSync(targetDest, { recursive: true });
          fs.cpSync(shieldSrc, targetDest, { recursive: true, force: true });
        } else {
          fs.copyFileSync(shieldSrc, targetDest);
        }
      }
    }
  }

  static getGitStatus() {
    const root = this.getRootPath();
    try {
      const branch = execSync("git branch --show-current", { cwd: root, encoding: "utf8" }).trim() || "main";
      const commitHash = execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim();
      const commitMsg = execSync('git log -1 --format="%h : %s (%ar)"', { cwd: root, encoding: "utf8" }).trim();
      const statusPorcelain = execSync("git status --porcelain", { cwd: root, encoding: "utf8" }).trim();
      
      let remoteUrl = "";
      try {
        remoteUrl = execSync("git remote get-url origin", { cwd: root, encoding: "utf8" }).trim();
      } catch {}

      let commitsBehind = 0;
      let remoteAvailable = false;
      let pendingCommits = [];
      let remoteCommitHash = "";
      let remoteCommitMsg = "";

      try {
        execSync(`git fetch origin ${branch}`, { cwd: root, stdio: "ignore", timeout: 10000 });
        remoteAvailable = true;

        const behindCount = execSync(`git rev-list --count HEAD..origin/${branch}`, { cwd: root, encoding: "utf8" }).trim();
        commitsBehind = parseInt(behindCount, 10) || 0;

        try {
          remoteCommitHash = execSync(`git rev-parse origin/${branch}`, { cwd: root, encoding: "utf8" }).trim();
          remoteCommitMsg = execSync(`git log -1 origin/${branch} --format="%h : %s (%ar)"`, { cwd: root, encoding: "utf8" }).trim();
        } catch {}

        if (commitsBehind > 0) {
          try {
            const rawPending = execSync(`git log HEAD..origin/${branch} --format="%h|%s|%an|%ar" -n 15`, { cwd: root, encoding: "utf8" }).trim();
            if (rawPending) {
              pendingCommits = rawPending.split("\n").map((line) => {
                const [hash, message, author, date] = line.split("|");
                return { hash, message, author, date };
              });
            }
          } catch {}
        }
      } catch (e) {
        remoteAvailable = false;
      }

      const uncommittedLines = statusPorcelain ? statusPorcelain.split("\n").filter(Boolean) : [];

      return {
        success: true,
        branch,
        commitHash,
        shortHash: commitHash.slice(0, 7),
        commitMessage: commitMsg,
        remoteUrl,
        remoteAvailable,
        remoteCommitHash,
        remoteShortHash: remoteCommitHash ? remoteCommitHash.slice(0, 7) : "",
        remoteCommitMessage: remoteCommitMsg,
        commitsBehind,
        pendingCommits,
        isUpToDate: remoteAvailable ? commitsBehind === 0 : true,
        hasLocalChanges: uncommittedLines.length > 0,
        uncommittedCount: uncommittedLines.length,
        lastCheckedAt: new Date().toISOString()
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        branch: "main",
        commitHash: "unknown",
        shortHash: "unknown",
        commitMessage: "Git bilgisi okunamadı",
        remoteUrl: "",
        remoteAvailable: false,
        remoteCommitHash: "",
        remoteShortHash: "",
        remoteCommitMessage: "",
        commitsBehind: 0,
        pendingCommits: [],
        isUpToDate: true,
        hasLocalChanges: false,
        uncommittedCount: 0,
        lastCheckedAt: new Date().toISOString()
      };
    }
  }

  static createFullBackup() {
    const root = this.getRootPath();
    const backupsDir = this.getBackupsDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupName = `backup-${timestamp}`;
    const targetDir = path.join(backupsDir, backupName);

    fs.mkdirSync(targetDir, { recursive: true });

    const ignoredFolders = new Set([
      "node_modules",
      ".git",
      ".system_generated",
      ".tempmediaStorage",
      ".tmp",
      "dist",
      "build"
    ]);

    let copiedFiles = 0;

    const copyRecursive = (src, dest) => {
      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
          if (ignoredFolders.has(entry.name)) continue;
          fs.mkdirSync(destPath, { recursive: true });
          copyRecursive(srcPath, destPath);
        } else if (entry.isFile()) {
          fs.copyFileSync(srcPath, destPath);
          copiedFiles++;
        }
      }
    };

    copyRecursive(root, targetDir);

    let commit = "unknown";
    try {
      commit = execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim();
    } catch {}

    const meta = {
      backupName,
      createdAt: new Date().toISOString(),
      commitHash: commit,
      fileCount: copiedFiles
    };

    fs.writeFileSync(path.join(targetDir, "backup-meta.json"), JSON.stringify(meta, null, 2));

    return {
      success: true,
      backupName,
      backupPath: targetDir,
      fileCount: copiedFiles,
      createdAt: meta.createdAt
    };
  }

  static listBackups() {
    const backupsDir = this.getBackupsDir();
    if (!fs.existsSync(backupsDir)) return [];

    const entries = fs.readdirSync(backupsDir, { withFileTypes: true });
    const list = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const metaPath = path.join(backupsDir, entry.name, "backup-meta.json");
      if (fs.existsSync(metaPath)) {
        try {
          const content = JSON.parse(fs.readFileSync(metaPath, "utf8"));
          list.push(content);
        } catch {
          list.push({ backupName: entry.name, createdAt: "Bilinmiyor", fileCount: 0 });
        }
      } else {
        list.push({ backupName: entry.name, createdAt: "Bilinmiyor", fileCount: 0 });
      }
    }

    return list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }

  static restoreBackup(backupName) {
    if (!backupName) {
      return { success: false, error: "backupName belirtilmedi" };
    }

    const backupsDir = this.getBackupsDir();
    const sourceDir = path.join(backupsDir, backupName);
    const root = this.getRootPath();

    if (!fs.existsSync(sourceDir)) {
      return { success: false, error: "Yedek klasörü bulunamadı" };
    }

    let restoredCount = 0;

    const copyRestoreRecursive = (src, dest) => {
      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === "backup-meta.json") continue;
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
          fs.mkdirSync(destPath, { recursive: true });
          copyRestoreRecursive(srcPath, destPath);
        } else if (entry.isFile()) {
          fs.copyFileSync(srcPath, destPath);
          restoredCount++;
        }
      }
    };

    copyRestoreRecursive(sourceDir, root);

    return {
      success: true,
      backupName,
      restoredCount,
      message: `${backupName} yedeğindeki ${restoredCount} dosya başarıyla geri yüklendi.`
    };
  }

  static async performSafeUpdate({ branch = "main" } = {}) {
    const root = this.getRootPath();
    const logs = [];

    const addLog = (step, message, status = "ok") => {
      logs.push({ step, message, status, time: new Date().toISOString() });
    };

    addLog(1, "1. Adım: Projenin tam ve eksiksiz yedeği alınıyor...");
    let backupResult;
    try {
      backupResult = this.createFullBackup();
      this.preserveSafetyShield();
      addLog(1, `Tam yedek başarıyla oluşturuldu (${backupResult.fileCount} dosya: ${backupResult.backupName})`, "success");
    } catch (err) {
      addLog(1, `Yedekleme hatası: ${err.message}`, "error");
      return { success: false, logs, error: "Yedek alınamadığı için işlem güvenlik sebebiyle iptal edildi." };
    }

    addLog(2, "2. Adım: Yerel ayarlar ve .env dosyası güvenlik kalkanına alınıyor...");
    let stashed = false;
    try {
      const stashOutput = execSync(`git stash push -u -m "bfe-preupdate-${Date.now()}"`, { cwd: root, encoding: "utf8" }).trim();
      stashed = !stashOutput.includes("No local changes to save");
      addLog(2, stashed ? "Yerel değişiklikler ve konfigürasyonlar güvene alındı." : "Kaydedilecek bekleyen yerel değişiklik yok, temiz durumda.", "success");
    } catch (err) {
      addLog(2, `Stash uyarısı: ${err.message}`, "warn");
    }

    addLog(3, `3. Adım: GitHub üzerinden '${branch}' dalındaki yeni ve düzenlenen satırlar çekiliyor...`);
    try {
      execSync(`git fetch origin ${branch}`, { cwd: root, stdio: "ignore" });
      execSync(`git merge origin/${branch} --no-edit -m "Safe merge remote updates"`, { cwd: root, stdio: "ignore" });
      addLog(3, "GitHub üzerindeki güncel kodlar başarıyla birleştirildi.", "success");
    } catch (err) {
      try {
        execSync(`git pull origin ${branch} --no-rebase`, { cwd: root, stdio: "ignore" });
        addLog(3, "GitHub üzerinden yeni dosyalar ve satırlar alternatif pull ile çekildi.", "success");
      } catch (pullErr) {
        addLog(3, `Kod çekme hatası: ${pullErr.message}`, "error");
        this.restoreSafetyShield();
        if (stashed) {
          try {
            execSync("git stash pop", { cwd: root, stdio: "ignore" });
          } catch {}
        }
        return { success: false, logs, error: "GitHub kodları çekilemedi." };
      }
    }

    if (stashed) {
      addLog(4, "4. Adım: Yerel ayarlar ve özelleştirmeler projeye geri uygulanıyor...");
      try {
        execSync("git stash pop", { cwd: root, stdio: "ignore" });
        addLog(4, "Yerel ayarlar (.env ve özel yapılandırmalar) başarıyla korundu ve geri yüklendi.", "success");
      } catch (popErr) {
        addLog(4, "Yerel ayarlar geri uygulanırken birleşim korundu.", "warn");
      }
    } else {
      addLog(4, "4. Adım: Yerel ayarlar korunarak doğrulandı.", "success");
    }

    this.restoreSafetyShield();

    addLog(5, "5. Adım: Bağımlılık paketleri kontrol ediliyor ve güncelleniyor (npm install)...");
    try {
      execSync("npm install --no-audit --no-fund", { cwd: root, stdio: "ignore", timeout: 120000 });
      addLog(5, "Bağımlılıklar başarıyla güncellendi ve doğrulandı.", "success");
    } catch (npmErr) {
      addLog(5, `Paket kontrol uyarısı: ${npmErr.message}`, "warn");
    }

    addLog(6, "6. Adım: Güncelleme tamamlandı. Sistem ve botlar yeni kodlarla çalışmaya hazır!", "success");

    const newStatus = this.getGitStatus();

    return {
      success: true,
      logs,
      backup: backupResult,
      status: newStatus
    };
  }
}
