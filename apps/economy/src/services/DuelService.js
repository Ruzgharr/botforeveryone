import { Economy } from "@bot/database";

const activeDuels = new Map();

export class DuelService {
  static createDuel({ guildId, challengerId, targetId, bet, config = {} }) {
    const minBet = config.casinoSettings?.minBet || 10;
    const maxBet = config.casinoSettings?.maxBet || 50000;

    if (bet < minBet || bet > maxBet) {
      return {
        success: false,
        message: `Düello bahsi minimum **${minBet.toLocaleString("tr-TR")}**, maksimum **${maxBet.toLocaleString("tr-TR")} Coin** olabilir.`
      };
    }

    if (challengerId === targetId) {
      return { success: false, message: "Kendinize düello teklif edemezsiniz." };
    }

    for (const [id, d] of activeDuels.entries()) {
      if (d.challengerId === challengerId || d.targetId === challengerId) {
        if (Date.now() > d.expiresAt) {
          activeDuels.delete(id);
        } else {
          return { success: false, message: "Zaten devam eden veya bekleyen bir düellonuz var." };
        }
      }
      if (d.challengerId === targetId || d.targetId === targetId) {
        if (Date.now() > d.expiresAt) {
          activeDuels.delete(id);
        } else {
          return { success: false, message: "Hedef kullanıcının şu an bekleyen başka bir düellosu bulunuyor." };
        }
      }
    }

    const duelId = `duel_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const expiresAt = Date.now() + 60000;

    const duel = {
      id: duelId,
      guildId,
      challengerId,
      targetId,
      bet,
      expiresAt,
      createdAt: Date.now()
    };

    activeDuels.set(duelId, duel);

    setTimeout(() => {
      if (activeDuels.has(duelId)) {
        activeDuels.delete(duelId);
      }
    }, 65000);

    return { success: true, duel };
  }

  static getDuel(duelId) {
    const d = activeDuels.get(duelId);
    if (!d) return null;
    if (Date.now() > d.expiresAt) {
      activeDuels.delete(duelId);
      return null;
    }
    return d;
  }

  static cancelDuel(duelId, userId) {
    const d = this.getDuel(duelId);
    if (!d) return { success: false, message: "Düello bulunamadı veya süresi dolmuş." };
    if (d.challengerId !== userId && d.targetId !== userId) {
      return { success: false, message: "Bu düelloyu iptal etme yetkiniz yok." };
    }
    activeDuels.delete(duelId);
    return { success: true, duel: d };
  }

  static async resolveDuel(duelId, acceptedUserId) {
    const duel = this.getDuel(duelId);
    if (!duel) {
      return { success: false, message: "Düello bulunamadı veya davet süresi dolmuş." };
    }

    if (duel.targetId !== acceptedUserId) {
      return { success: false, message: "Bu düelloyu yalnızca davet edilen kullanıcı kabul edebilir." };
    }

    const { guildId, challengerId, targetId, bet } = duel;

    const ecoChallenger = await Economy.findOne({ guildId, userId: challengerId });
    const ecoTarget = await Economy.findOne({ guildId, userId: targetId });

    if (!ecoChallenger || ecoChallenger.wallet < bet) {
      activeDuels.delete(duelId);
      return { success: false, message: `Meydan okuyanın cüzdanında yeterli bakiye bulunamadı. (${bet.toLocaleString("tr-TR")} Coin)` };
    }

    if (!ecoTarget || ecoTarget.wallet < bet) {
      activeDuels.delete(duelId);
      return { success: false, message: `Cüzdanınızda düello bahsini karşılayacak yeterli bakiye yok. (${bet.toLocaleString("tr-TR")} Coin)` };
    }

    ecoChallenger.wallet -= bet;
    ecoTarget.wallet -= bet;

    const roll1 = Math.floor(Math.random() * 100) + 1;
    let roll2 = Math.floor(Math.random() * 100) + 1;
    if (roll1 === roll2) roll2 = (roll2 % 100) + 1;

    const challengerWins = roll1 > roll2;
    const winnerId = challengerWins ? challengerId : targetId;
    const loserId = challengerWins ? targetId : challengerId;
    const winnerRoll = challengerWins ? roll1 : roll2;
    const loserRoll = challengerWins ? roll2 : roll1;

    const totalPot = bet * 2;
    if (challengerWins) {
      ecoChallenger.wallet += totalPot;
    } else {
      ecoTarget.wallet += totalPot;
    }

    await ecoChallenger.save();
    await ecoTarget.save();
    activeDuels.delete(duelId);

    return {
      success: true,
      winnerId,
      loserId,
      winnerRoll,
      loserRoll,
      totalPot,
      bet,
      challengerId,
      targetId,
      challengerRoll: roll1,
      targetRoll: roll2
    };
  }
}
