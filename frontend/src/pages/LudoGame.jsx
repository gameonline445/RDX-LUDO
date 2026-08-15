import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, wsUrl } from "@/lib/api";
import { toast } from "sonner";
import {
  Dice1,
  Dice2,
  Dice3,
  Dice4,
  Dice5,
  Dice6,
  Trophy,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const DICE_ICONS = [null, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];
const PLAYER_COLORS = ["#DC2626", "#2563EB"];
const PLAYER_LIGHT = ["#FEE2E2", "#DBEAFE"];

export default function LudoGame() {
  const { battleId } = useParams();
  const [battle, setBattle] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [moving, setMoving] = useState(false);
  const wsRef = useRef(null);
  const nav = useNavigate();
  const { user, refresh } = useAuth();

  const load = async () => {
    try {
      const { data } = await api.get(`/rooms/${battleId}`);
      setBattle(data);
    } catch (e) {
      toast.error(e.message);
    }
  };

  useEffect(() => {
    load();

    const ws = new WebSocket(wsUrl(battleId));
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.battle) setBattle(msg.battle);
      } catch {}
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    const hb = setInterval(() => {
      try {
        ws.send("ping");
      } catch {}
    }, 15000);

    return () => {
      clearInterval(hb);
      try {
        ws.close();
      } catch {}
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleId]);

  useEffect(() => {
    if (battle?.status === "completed") {
      refresh();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle?.status]);

  if (!battle) {
    return (
      <div className="app-shell p-6 text-slate-500">
        Loading game…
      </div>
    );
  }

  const state = battle.game_state;
  const myIdx = state?.players?.indexOf(user.id);
  const iAmTurn = state?.turn === myIdx && !state?.winner;
  const dice = state?.dice;
  const DiceIcon = dice ? DICE_ICONS[dice] : Dice5;

  const rollDice = async () => {
    setRolling(true);

    try {
      await api.post("/game/roll", {
        battle_id: battleId,
      });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setRolling(false);
    }
  };

  const moveToken = async (tokenIdx) => {
    if (!iAmTurn || dice == null) return;

    if (!state.tokens[String(myIdx)]) return;

    setMoving(true);

    try {
      await api.post("/game/move", {
        battle_id: battleId,
        token_index: tokenIdx,
        dice,
      });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setMoving(false);
    }
  };

  const leave = async () => {
    if (!window.confirm("Leave? Opponent will win.")) return;

    try {
      await api.post("/game/leave", {
        battle_id: battleId,
      });

      nav("/battles");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const validMoves = (() => {
    if (!iAmTurn || dice == null) return [];

    const tokens = state.tokens[String(myIdx)];

    if (!tokens) return [];

    const valid = [];

    tokens.forEach((pos, i) => {
      if (pos === 58) return;

      if (pos === -1) {
        if (dice === 6) valid.push(i);
        return;
      }

      if (pos + dice <= 58) {
        valid.push(i);
      }
    });

    return valid;
  })();

  const renderPlayerTokens = (pIdx) => {
    const tokens = state.tokens[String(pIdx)];
    const color = PLAYER_COLORS[pIdx];
    const light = PLAYER_LIGHT[pIdx];
    const isMe = pIdx === myIdx;

    return (
      <div
        className="card p-3 space-y-2"
        style={{ borderColor: color }}
        data-testid={`player-panel-${pIdx}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full"
              style={{
                background: light,
                border: `3px solid ${color}`,
              }}
            />

            <div>
              <div className="font-bold text-sm">
                {battle.player_details[pIdx].username}{" "}
                {isMe && "(You)"}
              </div>

              <div className="text-[10px] text-slate-500">
                {state.turn === pIdx && !state.winner
                  ? "🎯 Turn"
                  : ""}
              </div>
            </div>
          </div>

          <div className="text-xs font-bold text-slate-500">
            Home: {tokens.filter((t) => t === 58).length}/4
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {tokens.map((pos, i) => {
            const canMove =
              isMe && validMoves.includes(i);

            const label =
              pos === -1
                ? "🏠"
                : pos === 58
                ? "★"
                : pos >= 52
                ? `H${pos - 51}`
                : pos + 1;

            return (
              <button
                key={i}
                data-testid={`token-${pIdx}-${i}`}
                onClick={() =>
                  canMove && moveToken(i)
                }
                disabled={!canMove || moving}
                className={`aspect-square rounded-xl flex items-center justify-center font-extrabold text-sm border-2 transition-transform ${
                  canMove
                    ? "cursor-pointer hover:scale-105 shadow-lg"
                    : "cursor-default"
                }`}
                style={{
                  background:
                    pos === 58 ? "#FEF3C7" : light,
                  borderColor: canMove
                    ? "#16A34A"
                    : color,
                  color,
                  animation: canMove
                    ? "pulse 1.5s infinite"
                    : "none",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="app-shell">
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
        <div>
          <div className="text-xs text-slate-500">
            Room {battle.room_code}
          </div>

          <div className="font-bold text-slate-900">
            Prize ₹{battle.prize_amount}
          </div>
        </div>

        <button
          data-testid="leave-btn"
          onClick={leave}
          className="px-3 py-2 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm font-bold flex items-center gap-1"
        >
          <LogOut size={14} />
          Leave
        </button>
      </div>

      <div className="px-4 py-4 space-y-3">
        {state.players.map((_, i) =>
          renderPlayerTokens(i)
        )}

        <div className="card p-4 flex items-center gap-4">
          <div
            className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-white border border-slate-200 flex items-center justify-center ${
              rolling ? "animate-bounce" : ""
            }`}
            data-testid="dice-display"
          >
            <DiceIcon
              size={48}
              className="text-slate-900"
            />
          </div>

          <div className="flex-1">
            <div className="text-xs text-slate-500 font-bold">
              {state.winner !== null
                ? "GAME OVER"
                : iAmTurn
                ? "YOUR TURN"
                : "OPPONENT'S TURN"}
            </div>

            <div className="text-lg font-bold text-slate-900">
              {dice
                ? `Rolled ${dice}`
                : iAmTurn
                ? "Tap to roll"
                : "Waiting…"}
            </div>

            <button
              data-testid="roll-btn"
              onClick={rollDice}
              disabled={
                !iAmTurn ||
                dice != null ||
                rolling ||
                state.winner !== null
              }
              className="btn-primary mt-2 w-full disabled:bg-slate-300 disabled:shadow-none"
            >
              {rolling ? "Rolling…" : "Roll Dice"}
            </button>
          </div>
        </div>

        {dice != null &&
          iAmTurn &&
          validMoves.length === 0 && (
            <div className="text-center text-sm text-slate-500">
              No valid moves. Turn passes to opponent…
            </div>
          )}

        {state.winner !== null && (
          <div
            className="card p-6 mt-3 text-center border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50"
            data-testid="winner-card"
          >
            <Trophy
              className="mx-auto text-amber-500"
              size={40}
            />

            <div className="heading text-2xl font-extrabold text-slate-900 mt-2">
              {battle.player_details[state.winner].username} wins!
            </div>

            <div className="text-sm text-slate-600 mt-1">
              Prize ₹{battle.prize_amount} credited to winnings.
            </div>

            <button
              onClick={() => nav("/battles")}
              className="btn-primary mt-4 w-full"
            >
              Back to Battles
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%,100% {
            box-shadow: 0 0 0 0 rgba(22,163,74,0.5)
          }
          50% {
            box-shadow: 0 0 0 8px rgba(22,163,74,0)
          }
        }
      `}</style>
    </div>
  );
}
