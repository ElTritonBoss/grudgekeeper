-- Runs grudgekeeper_logger.lua against stubbed game interfaces and fires a
-- few events, so the log format can be checked without the game.
-- Usage: lua5.1 mod/test/harness.lua <path to grudgekeeper_logger.lua> <out dir>
local script_path, out_dir = arg[1], arg[2]

local function iface(t) t.is_null_interface = function() return false end; return t end
local null = { is_null_interface = function() return true end }
local function list(items) return { num_items = function() return #items end, item_at = function(_, i) return items[i + 1] end } end
function model_pairs(l) local i, max = -1, l:num_items() - 1; return function() i = i + 1; if i <= max then return i, l:item_at(i) end end end

local saved, listeners, first_tick = {}, {}, nil
local turn = 1
local function faction(key) return iface({ name = function() return key end, treasury = function() return 4200 end,
  region_list = function() return list({1,2,3}) end, military_force_list = function() return list({ ARMY }) end,
  faction_leader = function() return LORD end }) end
local function unit(key, hp) return iface({ unit_key = function() return key end, percentage_proportion_of_full_strength = function() return hp end }) end
LORD = iface({ command_queue_index = function() return 11 end, get_forename = function() return "names_name_thorgrim" end,
  get_surname = function() return "names_name_grudgebearer" end, character_type_key = function() return "general" end,
  character_subtype_key = function() return "wh_main_dwf_thorgrim_grudgebearer" end, rank = function() return 7 end,
  faction = function() return PLAYER end, is_wounded = function() return false end })
ARMY = iface({ unit_list = function() return list({ unit("wh_main_dwf_inf_longbeards", 100), unit("wh_main_dwf_art_cannon", 62.4) }) end,
  has_general = function() return true end, general_character = function() return LORD end,
  is_armed_citizenry = function() return false end, command_queue_index = function() return 21 end })
PLAYER = faction("wh_main_dwf_dwarfs")
ENEMY = faction("wh_main_grn_crooked_moon")

local loc = { names_name_thorgrim = "Thorgrim", names_name_grudgebearer = "Grudgebearer",
  ["factions_screen_name_wh_main_dwf_dwarfs"] = "Karaz-a-Karak", ["factions_screen_name_wh_main_grn_crooked_moon"] = "Crooked Moon",
  ["regions_onscreen_wh3_main_combi_region_black_crag"] = "Black Crag", ["land_units_onscreen_name_wh_main_dwf_inf_longbeards"] = "Longbeards" }
common = { get_localised_string = function(k) return loc[k] or "" end }

local pb = iface({ has_been_fought = function() return true end, attacker_battle_result = function() return "heroic_victory" end,
  defender_battle_result = function() return "crushing_defeat" end, attacker_kills = function() return 812 end,
  defender_kills = function() return 97 end, attacker_casulaties = function() return 97 end, defender_casulaties = function() return 812 end,
  percentage_of_attacker_killed = function() return 8.5 end, percentage_of_defender_killed = function() return 91.25 end,
  units_killed_by_attacker_character = function(_, mf, ch) return 143 end, units_killed_by_defender_character = function() return 3 end,
  region_data = function() return iface({ key = function() return "wh3_main_combi_region_black_crag" end }) end,
  battle_type = function() return "land_normal" end, siege_battle = function() return true end, ambush_battle = function() return false end,
  naval_battle = function() return false end, night_battle = function() return false end, is_auto_resolved = function() return false end })
local model = { turn_number = function() return turn end, pending_battle = function() return pb end,
  world = function() return { faction_by_key = function(_, k) return k == "wh_main_dwf_dwarfs" and PLAYER or ENEMY end } end }

cm = { model = function() return model end, is_multiplayer = function() return false end, get_local_faction_name = function() return "wh_main_dwf_dwarfs" end,
  get_saved_value = function(_, k) return saved[k] end, set_saved_value = function(_, k, v) saved[k] = v end,
  get_campaign_name = function() return "main_warhammer" end, is_new_game = function() return true end,
  add_first_tick_callback = function(_, f) first_tick = f end,
  get_character_by_cqi = function(_, c) if c == 11 then return LORD end return false end,
  pending_battle_cache_num_attackers = function() return 1 end, pending_battle_cache_num_defenders = function() return 1 end,
  pending_battle_cache_get_attacker = function() return 11, 21, "wh_main_dwf_dwarfs" end,
  pending_battle_cache_get_defender = function() return 99, 31, "wh_main_grn_crooked_moon" end,
  pending_battle_cache_get_attacker_units = function() return { { unit_key = "wh_main_dwf_inf_longbeards" } } end,
  pending_battle_cache_get_defender_units = function() return { { unit_key = "wh_main_grn_inf_night_goblins" } } end }
core = { add_listener = function(_, name, event, cond, cb) listeners[event] = listeners[event] or {}; table.insert(listeners[event], { cond = cond, cb = cb }) end }
local function fire(event, ctx) for _, l in ipairs(listeners[event] or {}) do if l.cond == true or l.cond(ctx) then l.cb(ctx) end end end

local real_getenv = os.getenv
os.getenv = function(k) if k == "APPDATA" then return nil end return real_getenv(k) end
local real_open = io.open
io.open = function(p, m) return real_open(out_dir .. "/" .. p, m) end

dofile(script_path)
grudgekeeper_logger()
first_tick()
fire("FactionTurnStart", { faction = function() return PLAYER end })
fire("FactionTurnStart", { faction = function() return ENEMY end })
fire("ScriptEventPendingBattle", {})
fire("BattleCompleted", {})
fire("CharacterRecruited", { character = function() return LORD end })
local region = iface({ name = function() return "wh3_main_combi_region_black_crag" end, owning_faction = function() return PLAYER end })
fire("RegionFactionChangeEvent", { region = function() return region end, previous_faction = function() return ENEMY end, reason = function() return "occupation" end })
-- Simulate a reload of a save made after the turn event (n = 1 + unit_names-less counter)
saved.gk_logger_n = 1
listeners = {}
first_tick = nil
grudgekeeper_logger()
first_tick()
turn = 2
fire("FactionTurnStart", { faction = function() return PLAYER end })
print(saved.gk_logger_campaign_id)
