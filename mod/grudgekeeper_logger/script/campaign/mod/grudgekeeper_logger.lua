-- Grudgekeeper campaign logger
--
-- Listens to campaign events for the local player's faction and appends one
-- JSON object per line to a log file that the Grudgekeeper app reads live.
-- It only reads game state and writes a text file; it never changes the
-- campaign, so removing the mod is always safe.
--
-- Log location: %APPDATA%\Grudgekeeper\campaign-log-<id>.jsonl, or the game
-- folder if %APPDATA% can't be used.
--
-- Every logged event carries "n", a counter kept in the save. When a save is
-- loaded, a "load" event records the counter stored in that save, so the app
-- can drop events that happened after that save point (reloads).
--
-- Disabled in multiplayer: the log ids use the local clock, which would make
-- the saved values differ between players.

local LOG_VERSION = 1;

local gk = {
	faction_key = nil,
	file_path = nil,
	campaign_id = nil,
	pending = {},          -- participant details captured before a battle
	named_units = {},      -- unit keys already written to the log this session
};

---------------------------------------------------------------------------
-- Small helpers
---------------------------------------------------------------------------

local function safe(fn, ...)
	local ok, result = pcall(fn, ...);
	if ok then return result end;
	return nil;
end;

local function loc(key)
	if not key or key == "" then return "" end;
	local text = safe(function() return common.get_localised_string(key) end);
	return text or "";
end;

local function encode(value)
	local t = type(value);
	if t == "nil" then
		return "null";
	elseif t == "boolean" then
		return value and "true" or "false";
	elseif t == "number" then
		if value ~= value or value == math.huge or value == -math.huge then return "null" end;
		if value == math.floor(value) then return string.format("%d", value) end;
		return string.format("%.2f", value);
	elseif t == "string" then
		local s = value:gsub('[%c"\\]', function(c)
			if c == '"' then return '\\"'
			elseif c == "\\" then return "\\\\"
			elseif c == "\n" then return "\\n"
			elseif c == "\r" then return "\\r"
			elseif c == "\t" then return "\\t"
			else return string.format("\\u%04x", c:byte()) end;
		end);
		return '"' .. s .. '"';
	elseif t == "table" then
		-- Arrays are tables with consecutive integer keys starting at 1.
		if #value > 0 or next(value) == nil then
			local parts = {};
			for i = 1, #value do parts[i] = encode(value[i]) end;
			return "[" .. table.concat(parts, ",") .. "]";
		end;
		local keys = {};
		for k in pairs(value) do table.insert(keys, tostring(k)) end;
		table.sort(keys);
		local parts = {};
		for _, k in ipairs(keys) do
			table.insert(parts, encode(k) .. ":" .. encode(value[k]));
		end;
		return "{" .. table.concat(parts, ",") .. "}";
	end;
	return "null";
end;

local function character_name(character)
	if not character or character:is_null_interface() then return "" end;
	local forename = loc(character:get_forename());
	local surname = loc(character:get_surname());
	if surname ~= "" then
		return forename ~= "" and (forename .. " " .. surname) or surname;
	end;
	return forename;
end;

local function faction_name(faction_key)
	local name = loc("factions_screen_name_" .. tostring(faction_key));
	return name ~= "" and name or faction_key;
end;

local function region_name(region_key)
	local name = loc("regions_onscreen_" .. tostring(region_key));
	return name ~= "" and name or region_key;
end;

local function character_info(character)
	if not character or character:is_null_interface() then return nil end;
	return {
		cqi = character:command_queue_index(),
		name = character_name(character),
		type = safe(function() return character:character_type_key() end),
		subtype = character:character_subtype_key(),
		rank = safe(function() return character:rank() end),
		faction = character:faction():name(),
	};
end;

---------------------------------------------------------------------------
-- Writing
---------------------------------------------------------------------------

local function next_event_number()
	local n = (cm:get_saved_value("gk_logger_n") or 0) + 1;
	cm:set_saved_value("gk_logger_n", n);
	return n;
end;

local function write_line(event)
	if not gk.file_path then return end;
	local file = io.open(gk.file_path, "a");
	if not file then return end;
	file:write(encode(event), "\n");
	file:close();
end;

local function log_event(kind, data)
	data = data or {};
	data.t = kind;
	data.n = next_event_number();
	data.turn = cm:model():turn_number();
	data.at = os.date("%Y-%m-%dT%H:%M:%S");
	data.campaign = gk.campaign_id;
	write_line(data);
end;

local function pick_log_file(campaign_id)
	local file_name = "campaign-log-" .. campaign_id .. ".jsonl";
	local appdata = safe(function() return os.getenv("APPDATA") end);
	local candidates = {};
	if appdata and appdata ~= "" then
		table.insert(candidates, appdata .. "\\Grudgekeeper\\" .. file_name);
	end;
	table.insert(candidates, "grudgekeeper-" .. file_name);

	for _, path in ipairs(candidates) do
		local file = io.open(path, "a");
		if file then
			file:close();
			return path;
		end;
	end;
	return nil;
end;

---------------------------------------------------------------------------
-- Unit names: written once per session per unit key, so army snapshots can
-- carry just keys.
---------------------------------------------------------------------------

local function remember_unit_names(keys)
	local fresh = {};
	for _, key in ipairs(keys) do
		if not gk.named_units[key] then
			gk.named_units[key] = true;
			local name = loc("land_units_onscreen_name_" .. key);
			fresh[key] = name ~= "" and name or key;
		end;
	end;
	if next(fresh) ~= nil then
		write_line({ t = "unit_names", campaign = gk.campaign_id, names = fresh });
	end;
end;

local function army_snapshot(military_force)
	local units, keys = {}, {};
	for _, unit in model_pairs(military_force:unit_list()) do
		local key = unit:unit_key();
		table.insert(keys, key);
		table.insert(units, {
			key = key,
			hp = math.floor(unit:percentage_proportion_of_full_strength() + 0.5),
		});
	end;
	remember_unit_names(keys);
	local general = military_force:has_general() and military_force:general_character() or nil;
	return {
		cqi = military_force:command_queue_index(),
		lord = character_info(general),
		units = units,
	};
end;

---------------------------------------------------------------------------
-- Listeners
---------------------------------------------------------------------------

local function is_local_faction(faction)
	return faction and not faction:is_null_interface() and faction:name() == gk.faction_key;
end;

local function log_turn_start(faction)
	local armies = {};
	for _, military_force in model_pairs(faction:military_force_list()) do
		local snapshot = safe(function()
			if military_force:is_armed_citizenry() or not military_force:has_general() then return nil end;
			return army_snapshot(military_force);
		end);
		if snapshot then table.insert(armies, snapshot) end;
	end;
	log_event("turn", {
		treasury = safe(function() return faction:treasury() end),
		regions = safe(function() return faction:region_list():num_items() end),
		armies = armies,
	});
end;

-- Battle participants can die in the battle, so names and armies are captured
-- when the battle is set up and looked up again once it completes.
local function capture_participants()
	gk.pending = {};
	local function capture(count_fn, get_fn, units_fn, side)
		for i = 1, count_fn() do
			local char_cqi, mf_cqi, faction_key = get_fn(i);
			local character = cm:get_character_by_cqi(char_cqi);
			local entry = {
				side = side,
				char_cqi = char_cqi,
				mf_cqi = mf_cqi,
				faction = faction_key,
				faction_name = faction_name(faction_key),
				lord = character and character_info(character) or { cqi = char_cqi },
				units = {},
			};
			for _, unit in ipairs(units_fn(i) or {}) do
				table.insert(entry.units, unit.unit_key);
			end;
			table.insert(gk.pending, entry);
		end;
	end;
	capture(
		function() return cm:pending_battle_cache_num_attackers() end,
		function(i) return cm:pending_battle_cache_get_attacker(i) end,
		function(i) return cm:pending_battle_cache_get_attacker_units(i) end,
		"attacker"
	);
	capture(
		function() return cm:pending_battle_cache_num_defenders() end,
		function(i) return cm:pending_battle_cache_get_defender(i) end,
		function(i) return cm:pending_battle_cache_get_defender_units(i) end,
		"defender"
	);
end;

local function log_battle()
	local pb = cm:model():pending_battle();
	if not pb:has_been_fought() then return end;

	local involved = false;
	for _, p in ipairs(gk.pending) do
		if p.faction == gk.faction_key then involved = true end;
	end;
	if not involved then return end;

	local sides = {
		attacker = {
			result = safe(function() return pb:attacker_battle_result() end),
			kills = safe(function() return pb:attacker_kills() end),
			casualties = safe(function() return pb:attacker_casulaties() end),
			killed_pct = safe(function() return pb:percentage_of_attacker_killed() end),
			armies = {},
		},
		defender = {
			result = safe(function() return pb:defender_battle_result() end),
			kills = safe(function() return pb:defender_kills() end),
			casualties = safe(function() return pb:defender_casulaties() end),
			killed_pct = safe(function() return pb:percentage_of_defender_killed() end),
			armies = {},
		},
	};

	local player_side = nil;
	for _, p in ipairs(gk.pending) do
		local lord_kills = nil;
		if p.mf_cqi and p.char_cqi then
			lord_kills = safe(function()
				if p.side == "attacker" then
					return pb:units_killed_by_attacker_character(p.mf_cqi, p.char_cqi);
				end;
				return pb:units_killed_by_defender_character(p.mf_cqi, p.char_cqi);
			end);
		end;
		if p.faction == gk.faction_key then
			player_side = player_side or p.side;
			remember_unit_names(p.units);
		end;
		table.insert(sides[p.side].armies, {
			faction = p.faction,
			faction_name = p.faction_name,
			lord = p.lord,
			lord_kills = lord_kills,
			units = p.units,
		});
	end;

	local region_key = safe(function()
		local rd = pb:region_data();
		if rd:is_null_interface() then return nil end;
		return rd:key();
	end);

	log_event("battle", {
		player_side = player_side,
		region = region_key,
		region_name = region_key and region_name(region_key) or nil,
		battle_type = safe(function() return pb:battle_type() end),
		siege = safe(function() return pb:siege_battle() end),
		ambush = safe(function() return pb:ambush_battle() end),
		naval = safe(function() return pb:naval_battle() end),
		night = safe(function() return pb:night_battle() end),
		autoresolved = safe(function() return pb:is_auto_resolved() end),
		attacker = sides.attacker,
		defender = sides.defender,
	});
	gk.pending = {};
end;

local function add_listeners()
	core:add_listener("gk_logger_turn", "FactionTurnStart",
		function(context) return is_local_faction(context:faction()) end,
		function(context) safe(log_turn_start, context:faction()) end,
		true);

	core:add_listener("gk_logger_pending_battle", "ScriptEventPendingBattle", true,
		function() safe(capture_participants) end,
		true);

	core:add_listener("gk_logger_battle", "BattleCompleted", true,
		function() safe(log_battle) end,
		true);

	core:add_listener("gk_logger_recruited", "CharacterRecruited",
		function(context) return is_local_faction(context:character():faction()) end,
		function(context)
			safe(function() log_event("recruit", { character = character_info(context:character()) }) end);
		end,
		true);

	-- Legendary lords and heroes that join through events, confederation or
	-- unlocks are created rather than recruited. The app merges by cqi.
	core:add_listener("gk_logger_created", "CharacterCreated",
		function(context) return is_local_faction(context:character():faction()) end,
		function(context)
			safe(function() log_event("character_created", { character = character_info(context:character()) }) end);
		end,
		true);

	core:add_listener("gk_logger_rank", "CharacterRankUp",
		function(context) return is_local_faction(context:character():faction()) end,
		function(context)
			safe(function() log_event("rank_up", { character = character_info(context:character()) }) end);
		end,
		true);

	core:add_listener("gk_logger_wounded", "CharacterConvalescedOrKilled",
		function(context) return is_local_faction(context:character():faction()) end,
		function(context)
			safe(function()
				local character = context:character();
				log_event("lord_down", {
					character = character_info(character),
					wounded = safe(function() return character:is_wounded() end),
				});
			end);
		end,
		true);

	core:add_listener("gk_logger_region", "RegionFactionChangeEvent", true,
		function(context)
			safe(function()
				local region = context:region();
				local previous = context:previous_faction();
				local owner = region:owning_faction();
				local gained = is_local_faction(owner);
				local lost = is_local_faction(previous);
				if not gained and not lost then return end;
				log_event(gained and "region_gained" or "region_lost", {
					region = region:name(),
					region_name = region_name(region:name()),
					other_faction = gained and (not previous:is_null_interface() and previous:name() or nil)
						or (not owner:is_null_interface() and owner:name() or nil),
					reason = safe(function() return context:reason() end),
				});
			end);
		end,
		true);

	core:add_listener("gk_logger_confederation", "FactionJoinsConfederation",
		function(context) return is_local_faction(context:confederation()) end,
		function(context)
			safe(function()
				local joined = context:faction():name();
				log_event("confederation", { faction = joined, faction_name = faction_name(joined) });
			end);
		end,
		true);
end;

---------------------------------------------------------------------------
-- Startup
---------------------------------------------------------------------------

local function start()
	if cm:is_multiplayer() then return end;
	gk.faction_key = cm:get_local_faction_name(true);
	if not gk.faction_key then return end;

	local campaign_id = cm:get_saved_value("gk_logger_campaign_id");
	local first_session = false;
	if not campaign_id then
		campaign_id = gk.faction_key .. "_" .. os.date("%Y%m%d_%H%M%S");
		cm:set_saved_value("gk_logger_campaign_id", campaign_id);
		first_session = true;
	end;
	gk.campaign_id = campaign_id;
	gk.file_path = pick_log_file(campaign_id);
	if not gk.file_path then return end;

	local faction = cm:model():world():faction_by_key(gk.faction_key);
	if first_session then
		log_event("start", {
			version = LOG_VERSION,
			campaign_name = safe(function() return cm:get_campaign_name() end),
			faction = gk.faction_key,
			faction_name = faction_name(gk.faction_key),
			leader = safe(function() return character_info(faction:faction_leader()) end),
			new_game = cm:is_new_game(),
		});
	else
		-- The counter in this save tells the app where the save point is.
		write_line({
			t = "load",
			n = cm:get_saved_value("gk_logger_n") or 0,
			turn = cm:model():turn_number(),
			at = os.date("%Y-%m-%dT%H:%M:%S"),
			campaign = campaign_id,
		});
	end;

	add_listeners();
end;

function grudgekeeper_logger()
	cm:add_first_tick_callback(function() safe(start) end);
end;
