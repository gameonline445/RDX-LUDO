"""Simplified 2-player Classic Ludo engine (server-authoritative).

- 2 players: red (index 0) and blue (index 1)
- 4 tokens each. Track positions as int:
    -1 = in home yard (start)
    0..51 = on main track (relative to player's start)
    52..57 = on home column (final approach)
    58 = finished (in center home)
- Dice: 1..6. A 6 grants an extra turn and can bring a token out.
- Safe cells (absolute positions on main track): 0, 8, 13, 21, 26, 34, 39, 47
    Red starts at absolute 0, Blue starts at absolute 26.
- Capture: If a moving token lands on a non-safe cell containing an
  opponent token, the opponent token is sent back to home yard.
- Win: First player to move all 4 tokens to position 58 wins.
"""
from __future__ import annotations
import secrets
from typing import List, Dict, Optional, Tuple

MAIN_TRACK = 52
HOME_COL = 6  # 6 steps in home column (52..57)
FINISHED = 58
SAFE_CELLS = {0, 8, 13, 21, 26, 34, 39, 47}
PLAYER_START_OFFSET = {0: 0, 1: 26}  # red / blue starting absolute positions


def new_game_state(player_ids: List[str]) -> Dict:
    """Create fresh game state for 2 players."""
    return {
        "players": player_ids,  # [p1_id, p2_id]
        "tokens": {
            "0": [-1, -1, -1, -1],
            "1": [-1, -1, -1, -1],
        },
        "turn": 0,  # index into players
        "dice": None,  # last rolled dice value (or None if not rolled)
        "extra_turn": False,
        "winner": None,  # player index (0/1) or None
        "history": [],  # list of event dicts
        "move_count": 0,
    }


def roll_dice() -> int:
    return secrets.randbelow(6) + 1


def _absolute_pos(player_idx: int, rel_pos: int) -> Optional[int]:
    """Convert relative track position to absolute board cell. None if in yard/home-column/finished."""
    if rel_pos < 0 or rel_pos >= MAIN_TRACK:
        return None
    return (PLAYER_START_OFFSET[player_idx] + rel_pos) % MAIN_TRACK


def valid_moves(state: Dict, player_idx: int, dice: int) -> List[int]:
    """Return list of token indices (0..3) that this player can legally move."""
    if dice is None:
        return []
    tokens = state["tokens"][str(player_idx)]
    valid: List[int] = []
    for i, pos in enumerate(tokens):
        if pos == FINISHED:
            continue
        if pos == -1:
            if dice == 6:
                valid.append(i)
            continue
        new_pos = pos + dice
        if new_pos > FINISHED:
            continue  # overshoot final home
        valid.append(i)
    return valid


def apply_move(state: Dict, player_idx: int, token_idx: int, dice: int) -> Dict:
    """Apply a validated move. Returns updated state.

    Raises ValueError if the move is illegal.
    """
    if state["winner"] is not None:
        raise ValueError("game_finished")
    if state["turn"] != player_idx:
        raise ValueError("not_your_turn")
    if state["dice"] != dice:
        raise ValueError("dice_mismatch")
    if token_idx not in valid_moves(state, player_idx, dice):
        raise ValueError("invalid_move")

    tokens = state["tokens"][str(player_idx)]
    pos = tokens[token_idx]

    captured = False
    if pos == -1:
        # Bring out to start (relative 0)
        new_pos = 0
    else:
        new_pos = pos + dice

    tokens[token_idx] = new_pos

    # Handle capture on main track
    abs_new = _absolute_pos(player_idx, new_pos)
    if abs_new is not None and abs_new not in SAFE_CELLS:
        opp = 1 - player_idx
        opp_tokens = state["tokens"][str(opp)]
        for j, opos in enumerate(opp_tokens):
            if opos < 0 or opos >= MAIN_TRACK:
                continue
            if _absolute_pos(opp, opos) == abs_new:
                opp_tokens[j] = -1  # send back to yard
                captured = True

    # Record event
    state["history"].append({
        "player": player_idx,
        "token": token_idx,
        "dice": dice,
        "from": pos,
        "to": new_pos,
        "captured": captured,
    })
    state["move_count"] += 1

    # Winner check
    if all(t == FINISHED for t in tokens):
        state["winner"] = player_idx

    # Determine next turn
    # Extra turn on 6 OR on capture OR on reaching FINISHED
    extra = (dice == 6) or captured or (new_pos == FINISHED)
    state["dice"] = None
    if state["winner"] is not None:
        state["extra_turn"] = False
    elif extra:
        state["extra_turn"] = True
        # same player continues
    else:
        state["extra_turn"] = False
        state["turn"] = 1 - player_idx
    return state


def set_dice(state: Dict, player_idx: int, value: int) -> Dict:
    if state["winner"] is not None:
        raise ValueError("game_finished")
    if state["turn"] != player_idx:
        raise ValueError("not_your_turn")
    if state["dice"] is not None:
        raise ValueError("dice_already_rolled")
    state["dice"] = value
    # If no valid moves at all with this dice -> auto pass turn (unless 6? actually if 6 with no valid moves - impossible if any token in yard, but if all tokens finished it can't happen anyway)
    if not valid_moves(state, player_idx, value):
        # No moves — turn passes (extra turn on 6 still passes since nothing to do)
        state["history"].append({
            "player": player_idx,
            "dice": value,
            "skipped": True,
        })
        state["dice"] = None
        state["extra_turn"] = False
        state["turn"] = 1 - player_idx
    return state
