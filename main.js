
const UID_LENGTH = 13
const DEFAULT_FABLED = new Set(["doomsayer", "angel", "buddhist", "hellslibrarian", "revolutionary", "fiddler", "toymaker"]);
var tokens_ref;
var loading = false;
var CURRENT_SCRIPT;
var night_order_ref;
class NightCounter
{
  constructor()
  {
    this.gameplace = 1;
  }
  isNight()
  {
    return this.gameplace % 2 == 0;
  }
  isSetup()
  {
    return this.gameplace == 1;
  }
  nextNight()
  {
    this.gameplace++;
  }
  prevNight()
  {
    if (this.gameplace > 1)
    {
      this.gameplace--;
    }
  }
  getRot()
  {
    return this.gameplace * 180;
  }
  getcurrText()
  {
    if (this.isSetup())
    {
      return "";
    } else
    {
      if (this.isNight())
      {
        return "night";
      } else
      {
        return "day"
      }
    }
  }
  getCurrNumber()
  {
    if (this.isSetup())
    {
      return "setup";
    } else
    {
      return Math.floor(this.gameplace / 2);
    }
  }
  toString()
  {
    return "gameplace: " + this.gameplace + ", " + this.getcurrText() + " " + this.getCurrNumber();
  }
}
var counter = new NightCounter();
// ? TODO better scripts menu
// TODO fullscreeen settings menu
// TODO better fabled tokens
// ? TODO pip layer clean up prompt delete
// TODO clean up saving and loading 
// * TODO fancify night widget
// * TODO higher player limit to include travellers

function generate_game_state_json()
{
  var state = new Object();
  state.script = CURRENT_SCRIPT;
  state.scriptColor = document.getElementById("script_upload_feedback").getAttribute("used");
  state.scriptNumber = document.getElementById("script_options").selectedIndex;
  state.playercount = document.getElementById("player_count").value;
  state.night = document.getElementById("body_actual").getAttribute("night");
  state.orientation = document.getElementById("body_actual").getAttribute("orientation");
  state.background = document.getElementById("body_actual").style.getPropertyValue("--BG-IMG");
  state.players = [];
  players = document.getElementById("token_layer").getElementsByClassName("role_token");
  for (i = 0; i < players.length; i++)
  {
    state.players[i] = new Object();
    state.players[i].role = players[i].getAttribute("role");
    state.players[i].uid = players[i].getAttribute("uid");
    state.players[i].visibility = players[i].getAttribute("visibility");
    state.players[i].viability = players[i].getAttribute("viability");
    state.players[i].cat = players[i].getAttribute("cat");
    state.players[i].show_face = players[i].getAttribute("show_face");
    state.players[i].left = players[i].style.left;
    state.players[i].top = players[i].style.top;
    state.players[i].name = players[i].getElementsByClassName("token_text")[0].innerHTML;
    reminders = [];
    reminderdivs = players[i].getElementsByClassName("reminder drag");
    for(j = 0; j < reminderdivs.length; j++){
      reminders.push([reminderdivs[j].getAttribute("role"),reminderdivs[j].getElementsByClassName("reminder_text")[0].innerHTML, reminderdivs[j].getAttribute("uid")])
    }
    state.players[i].reminders = reminders;
  }
  state.reminders = [];
  reminders = document.getElementById("reminder_layer").getElementsByClassName("reminder");
  for (i = 0; i < reminders.length; i++)
  {
    state.reminders[i] = new Object();
    state.reminders[i].id = reminders[i].getAttribute("role");
    state.reminders[i].text = reminders[i].children[2].innerText;
    state.reminders[i].uid = reminders[i].getAttribute("uid");
    state.reminders[i].left = reminders[i].style.left;
    state.reminders[i].top = reminders[i].style.top;
  }
  state.pips = [];
  pips = document.getElementById("interactivePlane").getElementsByClassName("reminder");
  var j = 0;
  for (i = 0; i < pips.length; i++)
  {
    if (pips[i].getAttribute("stacked") == "false")
    {
      state.pips[j] = new Object();
      state.pips[j].type = pips[i].getAttribute("role");
      state.pips[j].left = pips[i].style.left;
      state.pips[j].top = pips[i].style.top;
      j++;
    }
  }
  return JSON.stringify(state);
}

async function load_game_state_json(state)
{
  state = JSON.parse(state);
  if (state == null)
  {
    loading = false;
    return;
  }
  loading = true;
  await populate_script(state.script);
  document.getElementById("script_upload_feedback").setAttribute("used", state.scriptColor);
  document.getElementById("script_options").selectedIndex = state.scriptNumber;
  document.getElementById("player_count").value = state.playercount;
  document.getElementById("body_actual").setAttribute("night", state.night);
  document.getElementById("body_actual").style.setProperty("--BG-IMG", state.background);
  for (let i = 0; i < state.players.length; i++)
  {
    spawnToken(state.players[i].role, state.players[i].uid, state.players[i].visibility, state.players[i].cat, state.players[i].hide_face, state.players[i].viability, state.players[i].left, state.players[i].top, state.players[i].name, state.players[i].reminders)
  }
  for (const reminder of state.reminders) 
  {
    if (!reminder.text) {
      const idParts = reminder.id.split("_");
      reminder.id = idParts[0];
      reminder.text = idParts.slice(1).map(x => x[0].toUpperCase() + x.substring(1)).join(" ");
    } 
    spawnReminder(reminder.id, reminder.text, reminder.uid, reminder.left, reminder.top);
  }
  for (let i = 0; i < state.pips.length; i++)
  {
    dragPipLayerSpawn(state.pips[i].type, state.pips[i].left, state.pips[i].top, "false")
  }
  if (state.orientation != getOrientation())
  {
    orientationChange();
  }
  loading = false;
}

function save_game_state()
{
  localStorage.setItem("state", generate_game_state_json())
}

async function get_JSON(path)
{
  return await (await fetch("./data/" + path)).json();
}

function background_image_change(file_name)
{
  document.getElementById("body_actual").style.setProperty("--BG-IMG", "url('assets/backgrounds/" + file_name + ".webp')");
  if (!loading) { save_game_state(); }
}

function getOrientation()
{
  if (window.innerHeight > window.innerWidth)
  {
    return "portrait";
  } else
  {
    return "landscape";
  }
}
function resized()
{
  if (document.getElementById("body_actual").getAttribute("orientation") != getOrientation())
  {
    orientationChange();
  }
  document.getElementById("body_actual").setAttribute("orientation", getOrientation());
}
function swapObjectOrientation(HTMLobj)
{
  tmp = HTMLobj.style.top;
  HTMLobj.style.top = HTMLobj.style.left;
  HTMLobj.style.left = tmp;
}
function orientationChange()
{
  players = document.getElementById("token_layer").getElementsByClassName("role_token");
  for (i = 0; i < players.length; i++)
  {
    swapObjectOrientation(players[i]);
  }
  reminders = document.getElementById("reminder_layer").getElementsByClassName("reminder");
  for (i = 0; i < reminders.length; i++)
  {
    swapObjectOrientation(reminders[i]);
  }
  pips = document.getElementById("interactivePlane").getElementsByClassName("reminder");
  for (i = 0; i < pips.length; i++)
  {
    if (pips[i].getAttribute("stacked") == "false")
    {
      swapObjectOrientation(pips[i]);
    }
  }
}

async function loaded()
{
  loading = true;
  tokens_ref = await get_JSON("tokens.json");
  dragPipLayerSpawnDefault("good");
  dragPipLayerSpawnDefault("evil");
  dragPipLayerSpawnDefault("reminder_pip");
  load_scripts().then(() =>
  {
    load_game_state_json(localStorage.getItem("state"))
  })
  setTimeout(function ()
  {
    loading = false;
    player_count_change();
  }, 2000)
  document.getElementById("body_actual").setAttribute("orientation", getOrientation())
  window.onresize = resized;
}

// corner toggles and night functions
function visibility_toggle()
{
  tokens = document.getElementById("token_layer").getElementsByClassName("role_token");
  if (document.getElementById("body_actual").getAttribute("night") == "false")
  { // ! nighttime
    document.getElementById("body_actual").setAttribute("night", "true");
    for (i = 0; i < tokens.length; i++)
    {
      var id = tokens[i].getAttribute("role");
      var uid = tokens[i].getAttribute("uid");
      tokens[i].style.backgroundImage = "";
      tokens[i].setAttribute("onclick", "javascript:deathCycle('" + id + "', " + uid + ")");
    }
  } else
  {                                                                     // ! daytime
    document.getElementById("body_actual").setAttribute("night", "false");
    for (i = 0; i < tokens.length; i++)
    {
      var id = tokens[i].getAttribute("role");
      var uid = tokens[i].getAttribute("uid");
      tokens[i].style.backgroundImage = "url('assets/token.png')"
      tokens[i].setAttribute("onclick", "javascript:infoCall('" + id + "', " + uid + ")");
    }
  }
  clear_night_order();
}
function deathCycle(id, uid)
{
  let token = document.getElementById(id + "_token_" + uid);
  switch (token.getAttribute("viability"))
  {
    case "alive": //toDeadVote
      token.setAttribute("viability", "dead_vote");
      break;
    case "dead_vote": //toDead
      token.setAttribute("viability", "dead");
      break;
    case "dead": // toAlive
      token.setAttribute("viability", "alive");
      break;
    default: token.setAttribute("viability", "alive");
  }
  populate_night_order();
  if (!loading) { save_game_state(); }
}
function move_toggle()
{
  var self = document.getElementById("move_toggle")
  if (self.style.backgroundColor == "green")
  {
    self.style.backgroundColor = "rgb(66, 66, 66)";
  } else
  {
    self.style.backgroundColor = "green";
  }
}
function night_wedge_next_day()
{
  counter.nextNight();
  document.getElementById("night_wedge_rotate").style.transform = "rotate(" + counter.getRot() + "deg)";
  update_night_wedge_text();
}
function night_wedge_prev_day()
{
  counter.prevNight();
  document.getElementById("night_wedge_rotate").style.transform = "rotate(" + counter.getRot() + "deg)";
  update_night_wedge_text();
}
function update_night_wedge_text()
{
  if (counter.isNight())
  {
    document.getElementById("night_wedge_night_text_pre").innerHTML = counter.getcurrText();
    document.getElementById("night_wedge_night_text_num").innerHTML = counter.getCurrNumber();
  } else
  {
    document.getElementById("night_wedge_day_text_pre").innerHTML = counter.getcurrText();
    document.getElementById("night_wedge_day_text_num").innerHTML = counter.getCurrNumber();
  }
}

//token functions
function spawnToken(id, uid, visibility, cat, hide_face, viability, left, top, nameText, reminders)
{
  // Force tokens to appear if we try to add one. 
  if (document.getElementById("body_actual").getAttribute("night") == "true") {
    visibility_toggle()
  }

  // The div.
  var div = document.createElement("div");
  div.setAttribute("onclick", "javascript:infoCall('" + id + "', " + uid + ")");
  div.classList = "role_token drag";
  div.style = `background-image: url('assets/token.png'); left:${left}; top:${top}`
  div.id = id + "_token_" + uid;
  div.setAttribute("role", id);
  div.setAttribute("viability", viability);
  div.setAttribute("uid", uid);
  div.setAttribute("visibility", visibility);
  div.setAttribute("cat", cat);
  div.setAttribute("show_face", !hide_face);

  // Actual picture.
  var role = document.createElement("img");
  role.src = `assets/icons/official/${id}.png`;
  role.id = `${id}_${uid}_image`;
  role.classList = "token_image background_image";
  div.appendChild(role);

  // The token name. 
  var roleName = createRoleNameElement(id, uid);
  div.appendChild(roleName);
  
  // Death shroud.
  var death = document.createElement("img");
  death.src = "assets/shroud.png";
  death.classList = "token_death";
  death.id = id + "_" + uid + "_death";
  div.appendChild(death);

  // The icon indicating if this token is hidden in TS (bluff, reminder, etc)
  var visibility_pip = document.createElement("div");
  visibility_pip.classList = "token_visibility_pip background_image";
  visibility_pip.id = id + "_" + uid + "_visibility_pip";
  div.appendChild(visibility_pip);

  // Dead vote (TS mode)
  var vote = document.createElement("img");
  vote.src = "assets/vote_token.png";
  vote.classList = "token_vote";
  vote.id = id + "_" + uid + "_vote";
  div.appendChild(vote);

  // The role of travelers, when shown in TS mode. 
  var outsider_betray = document.createElement("div");
  if (cat == "TRAV")
  {
    outsider_betray.style.backgroundImage = "url('assets/icons/official/" + id + ".png')"
  }
  outsider_betray.classList = "token_outsider_betray background_image";
  outsider_betray.id = id + "_" + uid + "_outsider_betray";
  div.appendChild(outsider_betray);

  // Player name, if given.
  var name = document.createElement("span")
  name.innerHTML = nameText;
  name.classList = "token_text"
  name.id = id + "_name_" + uid;
  div.appendChild(name);

  document.getElementById("token_layer").appendChild(div);

  // Add reminder tokens
  for(i = 0; i < reminders.length; i++){
    reminder = spawnReminder(reminders[i][0],reminders[i][1],reminders[i][2],'-50px','0px')
    div.appendChild(reminder);
  }
  // Random admin stuff.
  update_role_counts();
  player_count_change();
  dragInit();
  populate_night_order();

  // This function is used by the loading code to place all the tokens.
  if (!loading) { save_game_state(); }
}

function createRoleNameElement(id, uid)
{
  var roleName = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  roleName.setAttribute("viewBox", "0 0 150 150");
  roleName.classList.add("token_role_name");
  
  // Create the path element
  var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M 13 75 C 13 150, 138 150, 138 75");
  path.setAttribute("id", "curve");
  path.setAttribute("fill", "transparent");
  roleName.appendChild(path);
  
  // Create the text element
  var text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("width", "150");
  text.setAttribute("x", "62.5%");
  text.setAttribute("y", "130");
  text.setAttribute("text-anchor", "middle");
  
  // Create the textPath element
  var textPath = document.createElementNS("http://www.w3.org/2000/svg", "textPath");
  textPath.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#curve"); // Use setAttributeNS for xlink
  textPath.setAttribute("style", "fill: black; font-family: Dumbledor; font-size: 24px;");
  textPath.classList.add("js--character--name");
  textPath.id = `${id}_${uid}_name_text`;
  textPath.textContent = tokens_ref[id]["name"]; // Use textContent for dynamic text
  
  // Append textPath to text, and text to svg
  text.appendChild(textPath);
  roleName.appendChild(text);

  return roleName;
}


function spawnTokenDefault(id, visibility, cat, hide_face)
{
  var time = new Date();
  var uid = time.getTime()
  spawnToken(id, uid, visibility, cat, hide_face, "alive", (parseInt(window.visualViewport.width / 2) - 75) + "px", "calc(50% - 75px)", "", []);
}
function remove_token(id, uid)
{
  rm = document.getElementById(id + "_token_" + uid);
  rm.parentNode.removeChild(rm);
  clean_tokens(uid);
  update_role_counts();
  player_count_change();
  hideInfo();
  populate_night_order();
}
function clean_tokens(uid)
{
  let reminders = document.getElementById("reminder_layer").getElementsByClassName("reminder");
  for (i = reminders.length - 1; i != -1; --i)
  {
    if (reminders[i].getAttribute("uid").substring(0, UID_LENGTH) == uid)
    {
      document.getElementById("reminder_layer").removeChild(reminders[i]);
    }
  }
}
function mutate_menu(id, uid)
{
  var town = document.getElementById("mutate_menu_TOWN").children;
  for (i = 0; i < town.length; i++)
  {
    town[i].setAttribute("onclick", "mutate_token('" + id + "', " + uid + ", '" + town[i].id.match(/(?<=mutate_menu_).*/) + "')")
  }
  var outsiders = document.getElementById("mutate_menu_OUT").children;
  for (i = 0; i < outsiders.length; i++)
  {
    outsiders[i].setAttribute("onclick", "mutate_token('" + id + "', " + uid + ", '" + outsiders[i].id.match(/(?<=mutate_menu_).*/) + "')")
  }
  var minions = document.getElementById("mutate_menu_MIN").children;
  for (i = 0; i < minions.length; i++)
  {
    minions[i].setAttribute("onclick", "mutate_token('" + id + "', " + uid + ", '" + minions[i].id.match(/(?<=mutate_menu_).*/) + "')")
  }
  var demons = document.getElementById("mutate_menu_DEM").children;
  for (i = 0; i < demons.length; i++)
  {
    demons[i].setAttribute("onclick", "mutate_token('" + id + "', " + uid + ", '" + demons[i].id.match(/(?<=mutate_menu_).*/) + "')")
  }
  var travellers = document.getElementById("mutate_menu_TRAV").children;
  for (i = 0; i < travellers.length; i++)
  {
    travellers[i].setAttribute("onclick", "mutate_token('" + id + "', " + uid + ", '" + travellers[i].id.match(/(?<=mutate_menu_).*/) + "')")
  }
  document.getElementById("mutate_menu_main").style.display = "inherit";
}
function close_mutate_menu()
{
  document.getElementById("mutate_menu_main").style.display = "none";
  document.getElementById("mutate_menu_all_main").style.display = "none";
}

function mutate_token(idFrom, uid, idTo)
{
  let new_json = tokens_ref[idTo];

  let subject = document.getElementById(idFrom + "_token_" + uid);

  subject.setAttribute("cat", new_json["class"]);
  if (new_json["class"] == "TRAV") { subject.getElementsByClassName("token_outsider_betray")[0].style.backgroundImage = "url('assets/icons/official/" + idTo + ".png')" }
  else { subject.getElementsByClassName("token_outsider_betray")[0].style.backgroundImage = "" }

  subject.setAttribute("show_face", !new_json["hide_face"]);
  subject.setAttribute("role", new_json["id"]);
  subject.style.backgroundImage = "url('assets/token.png')";
  subject.setAttribute("onclick", "javascript:infoCall('" + idTo + "', " + uid + ")");
  subject.id = idTo + "_token_" + uid;

  const image = document.getElementById(`${idFrom}_${uid}_image`);
  image.id = `${idTo}_${uid}_image`;
  image.src = `assets/icons/official/${idTo}.png`;

  document.getElementById(idFrom + "_" + uid + "_death").id = idTo + "_" + uid + "_death";
  document.getElementById(idFrom + "_" + uid + "_visibility_pip").id = idTo + "_" + uid + "_visibility_pip";
  document.getElementById(idFrom + "_" + uid + "_vote").id = idTo + "_" + uid + "_vote";
  document.getElementById(idFrom + "_name_" + uid).id = idTo + "_name_" + uid;

  const name_text = document.getElementById(`${idFrom}_${uid}_name_text`);
  name_text.id = `${idTo}_${uid}_name_text`;
  name_text.textContent = new_json["name"];

  clean_tokens(uid);
  if (document.getElementById("info_box").style.display == "inherit") { infoCall(idTo, uid); }
  if (!loading) { save_game_state(); }
}
function shuffle_roles()
{
  if (document.getElementById("body_actual").getAttribute("night") == "true") { visibility_toggle() }
  function shuffle(a)
  {
    for (let i = a.length - 1; i > 0; i--)
    {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    hideInfo();
  }
  let tokens = document.getElementById("token_layer").children;
  var ids = [];
  for (i = 0, j = 0; i < tokens.length; i++)
  {
    if (tokens[i].getAttribute("visibility") == "show")
    {
      ids[j++] = tokens[i].id.match(/.*(?=_token_)/)[0];
    }
  }
  shuffle(ids);
  var offset = 0
  for (let i = 0, j = 0; i < tokens.length; i++)
  {
    if (tokens[i].getAttribute("visibility") == "show")
    {
      mutate_token(tokens[i].id.match(/.*(?=_token_)/)[0], tokens[i].getAttribute("uid"), ids[j++]);
    }
  }
}
function populate_mutate_menu(tokens)
{
  tokens.forEach((element) =>
  {
    var div = document.createElement("div");
    div.id = "mutate_menu_" + element["id"];
    generateSampleToken(element["id"], div);
    div.classList = "background_image mutate_menu_token";
    if (element["class"] != "FAB")
    {
      document.getElementById("mutate_menu_" + element["class"]).appendChild(div);
    }
  })
}


//good/evil reminders
function dragPipLayerSpawn(type, left, top, stacked)
{
  var time = new Date();
  var uid = time.getTime();
  var div = document.createElement("div");
  div.classList = "reminder drag";
  div.style = "background-image: url('assets/reminders/" + type + ".png'); left: " + left + "; top: " + top + "; border-radius: 100%; pointer-events: all;";
  div.id = type + "_" + uid;
  div.setAttribute("disposable-reminder", true);
  div.setAttribute("alignment", type);
  div.setAttribute("stacked", stacked);
  var img = document.createElement("img");
  img.style = "width: 80%; height: 80%; margin: 10%; pointer-events: none; display: none; border-radius: 100%; user-select: none";
  img.src = "assets/delete.png";
  img.id = type + "_" + uid + "_img";
  div.appendChild(img);
  document.getElementById("dragPipLayer").prepend(div);
  dragInit();
  if (!loading) { save_game_state(); }
}
function dragPipLayerSpawnDefault(type)
{
  const ref = { "good": "90px", "evil": "175px", "reminder_pip": "260px" }
  dragPipLayerSpawn(type, "5px", ref[type], "true");
}
function prompt_delete_reminder(id)
{
  document.getElementById(id + "_img").style.display = "inherit";
  document.getElementById(id).setAttribute("onmouseup", null);
  setTimeout(function () { try { document.getElementById(id).setAttribute("onclick", "javascript:delete_reminder('" + id + "')"); } catch (TypeError) { null }; }, 30)
}
function delete_reminder(id)
{
  document.getElementById(id).setAttribute("onmouseup", null);
  document.getElementById(id).parentNode.removeChild(document.getElementById(id));
  if (!loading) { save_game_state(); }
}
function unprompt_reminders()
{
  tokens = document.getElementById("dragPipLayer").children;
  for (var i = 0; i < tokens.length; i++)
  {
    var element = tokens[i];
    document.getElementById(element.id + "_img").style.display = "none";
    element.setAttribute("onclick", null);
    element.setAttribute("onmouseup", "javascript:prompt_delete_reminder('" + element.id + "')");
  }
  tokens = document.getElementById("reminder_layer").children;
  for (var i = 0; i < tokens.length; i++)
  {
    var element = tokens[i];
    document.getElementById(element.id + "_img").style.display = "none";
    element.setAttribute("onclick", null);
    element.setAttribute("onmouseup", "javascript:prompt_delete_reminder('" + element.id + "')");
  }
}


//menu functions
function open_menu()
{
  if(document.getElementById("body_actual").getAttribute("night") == "false"){
    document.getElementById("menu_main").style.transform = "translateX(0px)";
  }
}
function close_menu()
{
  if(document.getElementById("body_actual").getAttribute("night") == "false"){
    document.getElementById("menu_main").style.transform = "translateX(-300px)";
  }
}
async function load_scripts()
{
  var scripts = await get_JSON("scripts/scripts.json")
  var initScript;
  for (i = 0; i < scripts.length; i++)
  {
    var element = scripts[i]
    var script = await get_JSON("scripts/" + element["file"] + ".json");
    if (i == 0) { initScript = script; }
    option = document.createElement("option");
    optionText = document.createTextNode(script[0]["name"]);
    option.appendChild(optionText);
    document.getElementById("script_options").appendChild(option);
  }
  populate_script(initScript)
}
async function script_select()
{
  var script_names = await get_JSON("scripts/scripts.json");
  var script = await get_JSON("scripts/" + script_names[document.getElementById("script_options").options.selectedIndex]["file"] + ".json");
  document.getElementById("script_upload_feedback").setAttribute("used", "select");
  document.getElementById("script_upload").value = "";
  populate_script(script);
  document.getElementById("menu_settings_dropdown").style.height = "calc(" + document.getElementById("menu_settings_dropdown_body").scrollHeight + "px + 68px)";
  if (!loading) { save_game_state(); }
}
async function script_upload()
{
  let json = JSON.parse(await document.getElementById("script_upload").files[0].text());
  if (typeof json[1] == typeof "")
  {
    for (var i = 0; i < json.length; i++)
    {
      if (typeof json[i] == typeof "")
      {
        json[i] = { "id": json[i] };
      }
    }
  }
  try
  {
    json[0]["id"]
    populate_script(json);
    document.getElementById("script_upload_feedback").setAttribute("used", "upload");
  } catch (e) {
    console.error(e);
    document.getElementById("script_upload_feedback").innerHTML = "Error Processing File";
    document.getElementById("script_upload_feedback").setAttribute("used", "error");
  }
  document.getElementById("menu_settings_dropdown").style.height = "calc(" + document.getElementById("menu_settings_dropdown_body").scrollHeight + "px + 68px)";
  if (!loading) { save_game_state(); }
}
async function populate_script(script)
{
  CURRENT_SCRIPT = script;
  document.getElementById("script_upload_feedback").innerHTML = script[0]["name"];
  function header(text, landing_name, color)
  {
    var div = document.createElement("div");
    div.innerHTML = text;
    div.style.color = color;
    div.classList = "menu_header"
    landing = document.getElementById(landing_name)
    landing.appendChild(div);
    var ratio = document.createElement("div");
    ratio.classList = "menu_ratio";
    ratio.innerHTML = "0/0";
    ratio.id = "ratio_" + landing_name
    landing.appendChild(ratio);
    landing.insertAdjacentHTML("beforeend", "<hr style='margin-block-end: 0em;'>");
  }
  function options(type, tokenNames, text)
  {
    var landing = document.getElementById(type)
    for (i = 0; i < tokenNames.length; i++)
    {
      var tokenJSON = tokenNames[i];
      if (tokenJSON.class == type)
      {
        var outer_div = document.createElement("div");
        outer_div.classList = "menu_list_div";
        outer_div.title = tokenJSON["description"];
        outer_div.setAttribute("onclick", "javascript:spawnTokenDefault('" + tokenJSON["id"] + "', " + (tokenJSON["hide_token"] == "true" ? "'hidden'" : "'show'") + ", '" + tokenJSON["class"] + "', " + tokenJSON["hide_face"] + ", 'alive')");
        var label = document.createElement("label");
        label.classList = "menu_list";
        label.innerHTML = tokenJSON["name"];
        outer_div.appendChild(label);
        var count_div = document.createElement("div");
        count_div.classList = "menu_token_count";
        count_div.innerHTML = 0;
        count_div.id = tokenJSON["id"] + "_count";
        outer_div.appendChild(count_div);
        outer_div.insertAdjacentHTML("beforeend", "&nbsp;");
        var hr = document.createElement("hr");
        hr.style.marginBlockEnd = "0em";
        outer_div.appendChild(hr);
        landing.appendChild(outer_div)
      }
    }
    //Add button to add offscreen of each category
    var outer_div = document.createElement("div");
        outer_div.classList = "menu_list_div";
        outer_div.title = title="Add offscript " + text;
        outer_div.setAttribute("onclick", "add_offscript_character('"+ type +"')");
        var label = document.createElement("label");
        label.classList = "menu_list";
        label.innerHTML = "Add Offscript " + text;
        outer_div.appendChild(label);
        outer_div.insertAdjacentHTML("beforeend", "&nbsp;");
        var hr = document.createElement("hr");
        hr.style.marginBlockEnd = "0em";
        outer_div.appendChild(hr);
        landing.appendChild(outer_div)
  }
  function clear(div)
  {
    document.getElementById(div).innerHTML = ""
  }
  let scriptTokens = [];
  script.forEach(element =>
  {
    if (element.id.substring(0, 1) != "_")
    {
      try { scriptTokens.push(tokens_ref[element.id]) } catch { }
    }
  })

  clear("TOWN")
  header("Town", "TOWN", "#0033cc")
  options("TOWN", scriptTokens, "Town")
  clear("OUT")
  header("Outsiders", "OUT", "#1a53ff")
  options("OUT", scriptTokens, "Outsiders")
  clear("MIN")
  header("Minions", "MIN", "#b30000")
  options("MIN", scriptTokens, "Minions")
  clear("DEM")
  header("Demons", "DEM", "#e60000")
  options("DEM", scriptTokens, "Demons")
  clear("TRAV")
  header("Travellers", "TRAV", "#6600ff")
  options("TRAV", scriptTokens, "Travellers")
  player_count_change();
  update_role_counts();
  clear_mutate_menu();
  populate_mutate_menu(scriptTokens);

  if (!loading) { save_game_state(); }
  return Promise.resolve()
}
function increment_player_count(x)
{
  document.getElementById("player_count").value = parseInt(document.getElementById("player_count").value) + parseInt(x);
  player_count_change()
}
function player_count_change()
{
  var player_count_tmp = document.getElementById("player_count").value;
  tableIndex = 0;
  if (player_count_tmp < 5)
  {
    document.getElementById("player_count").value = 5;
    player_count_tmp = 5
  }
  let player_count = player_count_tmp;
  if (player_count_tmp > 15)
  {
    player_count_tmp = 15
  }
  tableIndex = parseInt(player_count_tmp) - 5;
  var table = [[3, 0, 1, 1], [3, 1, 1, 1], [5, 0, 1, 1], [5, 1, 1, 1], [5, 2, 1, 1], [7, 0, 2, 1], [7, 1, 2, 1], [7, 2, 2, 1], [9, 0, 3, 1], [9, 1, 3, 1], [9, 2, 3, 1], [10, 2, 3, 1], [11, 2, 3, 1], [11, 3, 3, 1]]
  var counts = [0, 0, 0, 0, 0];
  tokens = document.getElementsByClassName("role_token");
  if (!loading)
  { //dont try to update player counts before menu is loaded
    var expected = new Object();
    // [hard modifier, soft positive modifier, soft negative modifier, locked?]
    expected.town = [table[tableIndex][0], 0, 0, false];
    expected.out = [table[tableIndex][1], 0, 0, false];
    expected.min = [table[tableIndex][2], 0, 0, false];
    expected.dem = [table[tableIndex][3], 0, 0, false];
    expected.trav = [0, 0, 0, false];
    async function makeupMod(id)
    {
      try
      {
        let lambdas = {
          "HARD": ((cat, mod) => { expected[cat][0] += mod }),
          "SOFTPOS": ((cat, mod) => { expected[cat][1] += mod }),
          "SOFTNEG": ((cat, mod) => { expected[cat][2] += mod }),
          "REQ": ((cat, val) => { }),
          "LOCK": ((cat, val) =>
          {
            if (val == -1)
            {
              expected[cat][0] = player_count;
            } else
            {
              expected[cat][0] = val;
            }
            expected[cat][3] = true;
            expected[cat][1] = 0;
            expected[cat][2] = 0;
          })
        }
        let json = tokens_ref[id];
        json["change_makeup"].forEach(element =>
        {
          let changeKey = Object.keys(element)[0];
          if (!expected[element[changeKey][0]][3])
          {
            lambdas[changeKey](element[changeKey][0], element[changeKey][1]);
          }
        });
      } catch { }
      return Promise.resolve();
    }
    for (i = 0; i < tokens.length; i++)
    {
      let visibility = tokens[i].getAttribute("visibility");
      switch (tokens[i].getAttribute("cat"))
      {
        case "TOWN":
          if (visibility == "show") { counts[0]++; }
          break;
        case "OUT":
          if (visibility == "show") { counts[1]++; }
          break;
        case "MIN":
          if (visibility == "show") { counts[2]++; }
          break;
        case "DEM":
          if (visibility == "show") { counts[3]++; }
          break;
        case "TRAV":
          if (visibility == "show") { counts[4]++; }
          break;
      }
    }
    for (i = 0; i < tokens.length; i++)
    {
      makeupMod(tokens[i].id.match(/.*(?=_token_)/)[0])
    }
    function genSoftModString(pos, neg)
    {
      var string = " "
      var combined = 0;
      while (pos > 0 && neg > 0)
      {
        combined++;
        pos--;
        neg--;
      }
      if (combined > 0)
      {
        string += String.fromCharCode(177) + combined;
      }
      if (pos > 0)
      {
        string += " +" + pos;
      }
      if (neg > 0)
      {
        string += " -" + neg;
      }
      return string;
    }
    document.getElementById("ratio_TOWN").innerHTML = counts[0] + "/" + expected["town"][0] + genSoftModString(expected["town"][1], expected["town"][2]);
    document.getElementById("ratio_OUT").innerHTML = counts[1] + "/" + expected["out"][0] + genSoftModString(expected["out"][1], expected["out"][2]);
    document.getElementById("ratio_MIN").innerHTML = counts[2] + "/" + expected["min"][0] + genSoftModString(expected["min"][1], expected["min"][2]);
    document.getElementById("ratio_DEM").innerHTML = counts[3] + "/" + expected["dem"][0] + genSoftModString(expected["dem"][1], expected["dem"][2]);
    if (player_count > 15 && !expected["trav"][3]) { expected["trav"][0] += player_count - 15 }
    document.getElementById("ratio_TRAV").innerHTML = counts[4] + "/" + expected["trav"][0] + genSoftModString(expected["trav"][1], expected["trav"][2]);
  }
}
function update_role_counts()
{
  var counts = document.getElementsByClassName("menu_token_count");
  for (let i = 0; i < counts.length; i++)
  {
    counts[i].innerHTML = 0;
  }
  var tokens = document.getElementsByClassName("role_token");
  for (let i = 0; i < tokens.length; i++)
  {
    id = tokens[i].getAttribute("id").match(/.*(?=_token)/)[0];
    try
    {
      if (tokens[i].getAttribute("visibility") == "show")
      {
        document.getElementById(id + "_count").innerHTML = parseInt(document.getElementById(id + "_count").innerHTML) + 1;
      }
    }
    catch (e) { }

  }

}
function clear_mutate_menu()
{
  document.getElementById("mutate_menu_TOWN").innerHTML = "";
  document.getElementById("mutate_menu_OUT").innerHTML = "";
  document.getElementById("mutate_menu_MIN").innerHTML = "";
  document.getElementById("mutate_menu_DEM").innerHTML = "";
  document.getElementById("mutate_menu_TRAV").innerHTML = "";
}
function toggle_menu_collapse()
{
  const dropdown = document.getElementById("menu_settings_dropdown");
  if (dropdown.getAttribute("expand") == "true")
  {
    dropdown.setAttribute("expand", "false");
    dropdown.style.height = "40px";
  } else
  {
    dropdown.setAttribute("expand", "true");
    dropdown.style.height = "calc(" + document.getElementById("menu_settings_dropdown_body").scrollHeight + "px + 68px)";
  }
}
function clean_board()
{
  const tokens = document.getElementById("token_layer").children;
  for (let it = tokens.length - 1; it >= 0; it--)
  {
    remove_token(tokens[it].id.match(/.*(?=_token_)/)[0], tokens[it].getAttribute("uid"))
  }
  const pips = document.getElementById("dragPipLayer").children;
  for (let it = pips.length - 1; it >= 0; it--)
  {
    if (pips[it].getAttribute("stacked") == "false")
    {
      delete_reminder(pips[it].id);
    }
  }
  clear_night_order();
  save_game_state();
}
async function game_state_upload()
{
  let json = await document.getElementById("game_state_upload").files[0].text();
  load_game_state_json(json).then(() =>
  {
    save_game_state();
  })
}
function download_game_state()
{
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(generate_game_state_json()));
  element.setAttribute('download', "game_state.json");
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
function change_background_menu()
{
  document.getElementById("background_select_menu").style.display = "inherit";
}
function change_background_menu_hide()
{
  document.getElementById("background_select_menu").style.display = "none";
}

//info functions
async function infoCall(id, uid)
{
  close_menu();
  let data_token = document.getElementById(id + "_token_" + uid);
  generateSampleToken(id,  document.getElementById("info_img"));
  var roleJSON = tokens_ref[id];
  document.getElementById("info_title_field").innerHTML = roleJSON["name"];
  document.getElementById("info_name_field").innerHTML = data_token.children.namedItem(id + "_name_" + uid).innerHTML;
  document.getElementById("info_img_name").innerHTML = data_token.children.namedItem(id + "_name_" + uid).innerHTML;
  document.getElementById("info_desc_field").innerHTML = roleJSON["description"];
  document.getElementById("info_list").setAttribute("current_player", id);
  document.getElementById("info_token_landing").innerHTML = "";
  document.getElementById("info_remove_player").setAttribute("onclick", "javascript:remove_token('" + id + "', '" + uid + "')");
  document.getElementById("info_kill_cycle").setAttribute("onclick", "javascript:info_death_cycle_trigger('" + id + "', '" + uid + "')");
  document.getElementById("info_visibility_toggle").setAttribute("onclick", "javascript:cycle_token_visibility_toggle('" + id + "', '" + uid + "')");
  document.getElementById("info_edit_role").setAttribute("onclick", "javascript:mutate_menu('" + id + "', '" + uid + "')");
  document.getElementById("info_box").setAttribute("hidden", data_token.getAttribute("visibility"));
  document.getElementById("info_name_input").value = data_token.children.namedItem(id + "_name_" + uid).innerHTML;
  document.getElementById("info_name_input").setAttribute("onchange", "javascript:nameIn('" + id + "', " + uid + ")");
  document.getElementById("info_box").style.display = "inherit";
  document.getElementById("info_token_dragbox").innerHTML = "";

  update_info_death_cycle(id, uid);

  const landing = document.getElementById("info_token_landing");
  for (var i = 0; i < roleJSON["tokens"].length; i++)
  {
    const backing = generateReminderBacking(id, roleJSON["tokens"][i], uid);
    // div.setAttribute("reminderId", i);
    document.getElementById("info_token_landing").appendChild(backing);

    const x = backing.getBoundingClientRect().x - landing.getBoundingClientRect().x;
    const y = backing.getBoundingClientRect().y - landing.getBoundingClientRect().y;
    // x, y, roleName, reminder info, id
    spawnReminderGhost(x, y, id, roleJSON["tokens"][i], backing.id);
  }
}

function generateSampleToken(id, el) {
  el.textContent = "";

  var token = document.createElement("img");
  token.src = "assets/token.png"
  token.style.width = "100%";
  token.style.height = "100%";
  el.appendChild(token);

  var role = document.createElement("img");
  role.id = "info_img_role";
  role.style.position = "absolute";
  role.src = `assets/icons/official/${id}.png`;
  el.appendChild(role);

  var roleName = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  roleName.setAttribute("viewBox", "0 0 150 150");
  roleName.classList.add("token_role_name");
  
  // Curvature
  var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M 13 75 C 13 150, 138 150, 138 75");
  path.setAttribute("id", "curve");
  path.setAttribute("fill", "transparent");
  roleName.appendChild(path);
  
  // Text
  var text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("width", "150");
  text.setAttribute("x", "62.5%");
  text.setAttribute("y", "130");
  text.setAttribute("text-anchor", "middle");
  
  // Create the textPath element
  var textPath = document.createElementNS("http://www.w3.org/2000/svg", "textPath");
  textPath.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#curve");
  textPath.setAttribute("style", "fill: black; font-family: Dumbledor; font-size: 24px;");
  textPath.classList.add("js--character--name");
  textPath.textContent = tokens_ref[id]["name"]; 
  
  text.appendChild(textPath);
  roleName.appendChild(text);
  el.appendChild(roleName);

  return el;
}

function generateReminderBacking(roleName, reminder, uid) {

  var div = document.createElement("div");
  div.className = "info_tokens";
  div.id = "info_" + reminder + "_" + uid;
  
  var base = document.createElement("img");
  base.src = "assets/reminder.png"
  base.style.width = "100%";
  base.style.height = "100%";
  base.style.pointerEvents = "none";
  div.appendChild(base);
  
  var role = document.createElement("img");
  role.id = "info_img_role";
  role.style.position = "absolute";
  role.style.pointerEvents = "none";
  role.src = `assets/icons/official/${roleName}.png`;
  div.appendChild(role);

  var text = document.createElement("p");
  text.innerText = reminder;
  text.classList = "reminder_ghost_text";
  div.appendChild(text);
  
  return div;
  // document.getElementById("info_token_landing").appendChild(div);
}

function spawnReminderGhost(left, top, roleName, reminder, longId)
{
  // Create a reminder that we put in the info box. 
  // This is slightly larger than the actual reminder, and appears larger until we put it onto the page.
  var time = new Date();
  var uid = time.getTime();

  var div = document.createElement("div");
  div.classList = "info_tokens_drag drag";
  div.style = `left: ${left}; top: ${top}; border-radius: 100%; pointer-events: all; width: 100px; height 100px;`
  div.id = longId + "_" + uid;
  div.setAttribute("ghost", "true");
  div.setAttribute("token_from", "info");
  div.setAttribute("role", roleName);

  var base = document.createElement("img");
  base.src = "assets/reminder.png"
  base.style.width = "100%";
  base.style.height = "100%";
  base.style.pointerEvents = "none";
  div.appendChild(base);
  
  var role = document.createElement("img");
  role.id = "info_img_role";
  role.style.position = "absolute";
  role.style.pointerEvents = "none";
  role.src = `assets/icons/official/${roleName}.png`;
  div.appendChild(role);

  var text = document.createElement("p");
  text.innerText = reminder;
  text.classList = "reminder_ghost_text";
  div.appendChild(text);

  document.getElementById("info_token_dragbox").prepend(div);
  dragInit();
}

function spawnReminder(roleName, reminder, uid, left, top)
{

  var div = document.createElement("div");
  div.classList = "reminder drag";
  div.style = `left: ${left}; top: ${top}; border-radius: 100%; pointer-events: all;`
  div.id = roleName + "_" + uid;
  div.setAttribute("uid", uid);
  div.setAttribute("role", roleName);
  div.setAttribute("onmouseup", "javascript:prompt_delete_reminder('" + div.id + "')");

  var base = document.createElement("img");
  base.src = "assets/reminder.png"
  base.style.width = "100%";
  base.style.height = "100%";
  base.style.pointerEvents = "none";
  div.appendChild(base);
  
  var role = document.createElement("img");
  role.id = "info_img_role";
  role.style.position = "absolute";
  role.style.pointerEvents = "none";
  role.src = `assets/icons/official/${roleName}.png`;
  div.appendChild(role);

  var text = document.createElement("p");
  text.innerText = reminder;
  text.classList = "reminder_text";
  div.appendChild(text);
  
  var trash = document.createElement("img");
  trash.classList = "reminder_delete"
  trash.src = "assets/delete.png";
  trash.id = roleName + "_" + uid + "_img";
  div.appendChild(trash);

  document.getElementById("reminder_layer").appendChild(div);
  dragInit();

  attachTokenToToken(div);//Make new reminder tokens check to see if they should be attach to a character token
  if (!loading) { save_game_state(); }
  return(div);
}

function spawnFabledReminder(roleName, reminder)
{
  var time = new Date();
  var uid = time.getTime();
  spawnReminder(roleName, reminder, uid, 'calc(50% - 40px)', 'calc(50% - 40px)')
}

function hideInfo()
{
  document.getElementById("info_box").style.display = "none";
}

function nameIn(id, uid)
{
  let value = document.getElementById("info_name_input").value;
  document.getElementById(id + "_name_" + uid).innerHTML = value;
  document.getElementById("info_name_field").innerHTML = value;
  document.getElementById("info_img_name").innerHTML = value;
}

function cycle_token_visibility_toggle(id, uid)
{
  switch (document.getElementById(id + "_token_" + uid).getAttribute("visibility"))
  {
    case "show":
      document.getElementById(id + "_token_" + uid).setAttribute("visibility", "bluff");
      document.getElementById("info_box").setAttribute("hidden", "bluff");
      break;
    case "bluff":
      document.getElementById(id + "_token_" + uid).setAttribute("visibility", "hide");
      document.getElementById("info_box").setAttribute("hidden", "hide");
      break;
    case "hide":
      document.getElementById(id + "_token_" + uid).setAttribute("visibility", "show");
      document.getElementById("info_box").setAttribute("hidden", "show");
      break;
  }
  update_role_counts();
  player_count_change();
  populate_night_order();
  if (!loading) { save_game_state(); }
}

function expand_info_tab(tab)
{
  document.getElementById("info_desc").setAttribute("focus", "false");
  document.getElementById("info_list").setAttribute("focus", "false");
  document.getElementById("info_rmnd").setAttribute("focus", "false");
  document.getElementById("info_powr").setAttribute("focus", "false");
  document.getElementById("info_rmnd").style.overflow = "hidden";
  switch (tab)
  {
    case 'desc':
      document.getElementById("info_desc").setAttribute("focus", "true");
      break;
    case 'list':
      document.getElementById("info_list").setAttribute("focus", "true");
      break;
    case 'rmnd':
      document.getElementById("info_rmnd").setAttribute("focus", "true");
      setTimeout((() => { document.getElementById("info_rmnd").style.overflow = "visible"; }), 200) // because overflow needs to be visible/ delays until after animation
      break;
    case 'powr':
      document.getElementById("info_powr").setAttribute("focus", "true");
      break;
  }
}

function info_death_cycle_trigger(id, uid)
{
  deathCycle(id, uid);
  update_info_death_cycle(id, uid);

}

function update_info_death_cycle(id, uid)
{
  switch (document.getElementById(id + "_token_" + uid).getAttribute("viability"))
  {
    case "alive":
      document.getElementById("info_kill_cycle").style.backgroundImage = "url('assets/tombstone.png')"
      break;
    case "dead_vote":
      document.getElementById("info_kill_cycle").style.backgroundImage = "url('assets/vote.png')"
      break;
    case "dead":
      document.getElementById("info_kill_cycle").style.backgroundImage = "url('assets/revive.png')"
      break;
  }
}

function load_playerinfo_shroud(typeId)
{
  function mapped_specials(typeId)
  {
    switch (typeId)
    {
      case 2:
        var bluffs = [];
        var tokens = document.getElementById("token_layer").children;
        for (i = 0; i < tokens.length; i++)
        {
          if (tokens[i].getAttribute("visibility") == "bluff")
          {
            bluffs.push(tokens[i].id.match(/.*(?=_token_)/)[0])
          }
        }
        var places = document.getElementById("playerinfo_character_landing").children
        for (i = 0; i < places.length; i++)
        {
          if (bluffs.length != 0)
          {
            select_playerinfo_character(i, bluffs.pop())
          }
        }
        break;
      case 5:
        select_playerinfo_character(0, document.getElementById("info_list").getAttribute("current_player"));
        break;
      case 10:
        var input = document.createElement("textarea");
        function recalcHeight()
        {
          document.getElementById("playerinfo_body").style.top = "calc(50% - " + document.getElementById("playerinfo_body").clientHeight / 2 + "px)";
        }
        new ResizeObserver(recalcHeight).observe(input);
        input.id = "playerinfo_input"
        document.getElementById("playerinfo_character_landing").prepend(document.createElement("br"));
        document.getElementById("playerinfo_character_landing").prepend(input);
        break;
    }
  }
  let cards = {
    0: { "title": "Use Your Ability?", "players": 0 },
    1: { "title": "Choose a Player", "players": 0 },
    2: { "title": "These Characters are Not In Play", "players": 3 },
    3: { "title": "This Is Your Demon", "players": 0 },
    4: { "title": "These Are Your Minions", "players": 0 },
    5: { "title": "You Are", "players": 1 },
    6: { "title": "This Player Is", "players": 1 },
    7: { "title": "Character Selected You", "players": 1 },
    8: { "title": "Did You Vote Today?", "players": 0 },
    9: { "title": "Did You Nominate Today?", "players": 0 },
    10: { "title": "Info", "players": 3 },
    11: { "title": "Make your Choice", "players": 1 },
    12: { "title": "Make your Choices", "players": 2 },
    13: { "title": "Make your Choices", "players": 3 }
  }
  document.getElementById("playerinfo_shoud").style.display = "inherit";
  document.getElementById("playerinfo_title").innerHTML = cards[typeId]["title"];
  document.getElementById("playerinfo_character_landing").innerHTML = "";
  for (i = 0; i < cards[typeId]["players"]; i++)
  {
    var div = document.createElement("div");
    div.id = "playerinfo_character_" + i;
    div.classList = "playerinfo_character";
    div.setAttribute("onclick", "javascript:trigger_playerinfo_character_select(" + i + ")")
    document.getElementById("playerinfo_character_landing").appendChild(div);
  }
  mapped_specials(typeId);
  document.getElementById("playerinfo_body").style.top = "calc(50% - " + document.getElementById("playerinfo_body").clientHeight / 2 + "px)";
}

function trigger_playerinfo_character_select(id)
{
  var town = document.getElementById("mutate_menu_TOWN").children;
  for (i = 0; i < town.length; i++)
  {
    town[i].setAttribute("onclick", "select_playerinfo_character('" + id + "', '" + town[i].id.match(/(?<=mutate_menu_).*/) + "')")
  }
  var outsiders = document.getElementById("mutate_menu_OUT").children;
  for (i = 0; i < outsiders.length; i++)
  {
    outsiders[i].setAttribute("onclick", "select_playerinfo_character('" + id + "', '" + outsiders[i].id.match(/(?<=mutate_menu_).*/) + "')")
  }
  var minions = document.getElementById("mutate_menu_MIN").children;
  for (i = 0; i < minions.length; i++)
  {
    minions[i].setAttribute("onclick", "select_playerinfo_character('" + id + "', '" + minions[i].id.match(/(?<=mutate_menu_).*/) + "')")
  }
  var demons = document.getElementById("mutate_menu_DEM").children;
  for (i = 0; i < demons.length; i++)
  {
    demons[i].setAttribute("onclick", "select_playerinfo_character('" + id + "', '" + demons[i].id.match(/(?<=mutate_menu_).*/) + "')")
  }
  var travellers = document.getElementById("mutate_menu_TRAV").children;
  for (i = 0; i < travellers.length; i++)
  {
    travellers[i].setAttribute("onclick", "select_playerinfo_character('" + id + "', '" + travellers[i].id.match(/(?<=mutate_menu_).*/) + "')")
  }
  document.getElementById("mutate_menu_main").style.display = "inherit";
}

function select_playerinfo_character(id, selection)
{
  const div = document.createElement("div");
  generateSampleToken(selection, div);

  div.style.position = "absolute";
  div.style.left = 25;
  div.style.width = 300;
  div.style.height = 300;

  document.getElementById("playerinfo_character_" + id).innerText = "";
  document.getElementById("playerinfo_character_" + id).appendChild(div);
}

function close_playerinfo_shroud()
{
  document.getElementById("playerinfo_shoud").style.display = "none";
}


//drag functions
var active;
function dragInit()
{
  const dragSpots = document.getElementsByClassName("drag");
  for (var i = 0; i < dragSpots.length; i++)
  {
    var container = dragSpots[i];

    container.addEventListener("touchstart", dragStart, false);
    container.addEventListener("touchend", dragEnd, false);
    container.addEventListener("touchmove", drag, false);

    container.addEventListener("mousedown", dragStart, false);
    container.addEventListener("mouseup", dragEnd, false);
    container.addEventListener("mousemove", drag, false);
  }
}
function dragStart(e)
{
  if (document.getElementById("move_toggle").style.backgroundColor != "green") { return }
  const token = getActualDragged(e.target);
  if(e.target.parentNode.getAttribute("class")=="role_token drag"){
    tokenlayer = document.getElementById("reminder_layer");
    tokenlayer.appendChild(e.target);
    e.target.style.position = 'absolute';
    e.target.style.left = e.touches[0].clientX-37.5
    e.target.style.top = e.touches[0].clientY-37.5
    token.style.position = 'absolute';

  }
  var pos = getComputedStyle(token)
  if (e.type === "touchstart")
  {
    xOffset = e.touches[0].clientX - pos.getPropertyValue('left').match(/\d+/)[0];
    yOffset = e.touches[0].clientY - pos.getPropertyValue('top').match(/\d+/)[0];
  } else
  {
    xOffset = e.clientX - pos.getPropertyValue('left').match(/\d+/)[0];
    yOffset = e.clientY - pos.getPropertyValue('top').match(/\d+/)[0];
  }
  if (token.classList.contains("drag"))
  {
    active = true;
  }
}
//Attatches a token to another token
//Intended to be reminder tokens, but adjusting to allow for character tokens shouldn't be that complicated
function attachTokenToToken(div){
  if(div.getAttribute("class")=="reminder drag"){
    players = document.getElementById("token_layer").getElementsByClassName("role_token");
    const radius = 112.5;
    const left = parseInt(getComputedStyle(div).getPropertyValue('left'))
    const top =  parseInt(getComputedStyle(div).getPropertyValue('top'))
    for (const player in players) {
      if(!isNaN(parseInt(player))){
        try {
          playerstyle = getComputedStyle(players[player]);
          
          diffx = parseInt(playerstyle.getPropertyValue('left'))+37.5 - left;
          diffy = parseInt(playerstyle.getPropertyValue('top'))+37.5 - top;
          if(Math.sqrt(diffx*diffx + diffy * diffy) < 75){
            players[player].appendChild(div);
            div.style.position = 'relative'
            div.style.left = '-50px'
            div.style.top = '0px'
            //update night order
            populate_night_order()
          }
        } catch (error) {console.log(error)}      
      }     
    }
  }
}

function dragEnd(e)
{
  const el = e.target;
  //if a reminder token is touching a role token it 'attaches' itself to the role token
  if(el.getAttribute("class")=="reminder drag"){
    attachTokenToToken(el)
  }
  // The good, evil, and generic reminder tokens.
  if (el.getAttribute("disposable-reminder"))
  {
    if (el.getAttribute("stacked") == "true")
    {
      dragPipLayerSpawnDefault(el.getAttribute("alignment"));
    }
    el.setAttribute("stacked", false);
    el.setAttribute("onmouseup", "javascript:prompt_delete_reminder('" + el.id + "')");
    el.style.cursor = "pointer";
  }
  
  // If a new reminder token is to be instantiated.
  if (el.getAttribute("ghost") == "true")
  {
    const role = el.getAttribute("role");
    const reminder = el.children[2].innerText;
    spawnReminder(
        role,
        reminder,
        //el.id.substring(5, e.target.id.length - (2 * UID_LENGTH) - 2), 
        el.id.substring(e.target.id.length - (2 * UID_LENGTH) - 1, e.target.id.length), 
        el.getBoundingClientRect().left + 12.5, 
        e.target.getBoundingClientRect().top + 12.5
    );
    if (e.target.getAttribute("token_from") == "info")
    {
      let x = document.getElementById(el.id.substring(0, e.target.id.length - UID_LENGTH - 1)).getBoundingClientRect().x - document.getElementById("info_token_landing").getBoundingClientRect().x;
      let y = document.getElementById(el.id.substring(0, e.target.id.length - UID_LENGTH - 1)).getBoundingClientRect().y - document.getElementById("info_token_landing").getBoundingClientRect().y;
      // SCUFFED AF
      spawnReminderGhost(
          x, 
          y, 
          role,
          reminder,
          e.target.id.substring(0, e.target.id.length - UID_LENGTH - 1)
      );
    }// else if (e.target.getAttribute("token_from") == "night_order") {
    //   let x = document.getElementById("night_order_" + e.target.id.substring(0, e.target.id.length-UID_LENGTH-1))
    //   let y = document.getElementById("night_order_" + e.target.id.substring(0, e.target.id.length-UID_LENGTH-1))
    //   spawnNightOrderGhost(x, y, e.target.style.backgroundImage, e.target.id.substring(0, e.target.id.length-UID_LENGTH-1));
    // }
    e.target.parentNode.removeChild(e.target);
  }
  active = false;
  if (!loading) { save_game_state(); }
}
function drag(e)
{
  if (active)
  {

    e.preventDefault();
    let moved = e.target;

    while (moved.localName != "html" && moved.localName != "div") {
      moved = moved.parentElement;
    }
    //if (!moved.classList.contains("role_token")) return;

    if (e.type === "touchmove")
    {
      currentX = e.touches[0].clientX - xOffset;
      currentY = e.touches[0].clientY - yOffset;
    } else
    {
      currentX = e.clientX - xOffset;
      currentY = e.clientY - yOffset;
    }

    setTranslate(currentX, currentY, moved);
  }
}
function setTranslate(xPos, yPos, el)
{
  el.style.left = xPos + "px"
  el.style.top = yPos + "px"
}

function getActualDragged(el) {
  let root = el;
  while (root.localName != "body") {
    if (root.classList.contains("role_token")) return root;
    root = root.parentElement;
  }
  return el;
}

function isRoleToken(el) {
  while (el.localName != "body") {
    if (el.classList.contains("role_token")) return true;
    el = el.parentElement;
  }
  return false;
}


//if you click on black space
function neutralClick()
{
  active = false;
  hideInfo()
  close_menu()
  unprompt_reminders()
}


//night order and jinx
function toggle_night_order_buttons(type)
{
  if (document.getElementById("nightorder_button_container").getAttribute("nightOrder") == type)
  {
    clean_night_order();
    document.getElementById("nightorder_button_container").setAttribute("nightOrder", "none");
  } else
  {
    switch (type)
    {
      case "fabled":
        document.getElementById("nightorder_button_container").setAttribute("nightOrder", "fabled");
        populate_fabled();
        break;
      case "jinx":
        document.getElementById("nightorder_button_container").setAttribute("nightOrder", "jinx");
        populate_jinx();
        break;
      case "firstnight":
        document.getElementById("nightorder_button_container").setAttribute("nightOrder", "firstnight");
        populate_night_order();
        break;
      case "othernight":
        document.getElementById("nightorder_button_container").setAttribute("nightOrder", "othernight");
        populate_night_order();
        break;
    }
  }
}
function clean_night_order()
{
  document.getElementById("night_order_tab_landing").innerHTML = ""
  document.getElementById("first_night").style.color = "";
  document.getElementById("other_night").style.color = "";
  document.getElementById("jinx_toggle").style.color = "";
}
async function populate_night_order()
{
  night = document.getElementById("nightorder_button_container").getAttribute("nightOrder");
  if (night == "jinx")
  {
    populate_jinx();
    return;
  }
  clean_night_order();
  if (night == "none") { return; }
  var order = await get_JSON("nightsheet.json")
  order = order[night];
  tokens = document.getElementById("token_layer").children;
  var inPlay = new Set();
  var alive = new Set();
  for (i = 0; i < tokens.length; i++)
  {
    var id = tokens[i].getAttribute("role");
    if (tokens[i].getAttribute("viability") == "alive" && tokens[i].getAttribute("visibility") != "bluff") { alive.add(id); }
    if (tokens[i].getAttribute("visibility") != "bluff") { inPlay.add(id); }
  }
  for (i = 0; i < order.length; i++)
  {
    if (inPlay.has(order[i]))
    {
      gen_night_order_tab_role(tokens_ref[order[i]], night, (alive.has(order[i])) ? false : true)
    }
    if (order[i].toUpperCase() == order[i])
    {
      gen_night_order_tab_info(order[i])
    }
  }
}
function clear_night_order()
{
  clean_night_order();
  document.getElementById("nightorder_button_container").setAttribute("nightOrder", "none");
}
function nightOrderScroll(enable)
{
  if (enable == "true")
  {
    document.getElementById("night_order_landing_container").style.pointerEvents = "all";
  } else if (enable == "false")
  {
    document.getElementById("night_order_landing_container").style.pointerEvents = "none";
  }
}
function gen_night_order_tab_role(token_JSON, night, dead)
{
  var color;
  switch (token_JSON.class)
  {
    case "TOWN": color = "#0033cc"; break;
    case "OUT": color = "#0086b3"; break;
    case "MIN": color = "#e62e00"; break;
    case "DEM": color = "#cc0000"; break;
    case "TRAV": color = "#6600ff"; break;
  }
  if (dead) { color = "#000000"; }
  div = document.createElement("div");
  div.classList = "night_order_tab";
  div.id = token_JSON.id + "_night_order_tab";
  div.style.backgroundImage = "linear-gradient(to right, rgba(0,0,0,0) , " + color + ")";
  span = document.createElement("span");
  span.classList = "night_order_span"
  //implement dynamic night order
  desc = token_JSON[night.substring(0, 5) + "_night_desc"];
  const start = desc.indexOf('{') + 1;
  let tempNightText = ""
  if(start != 0){
    while (desc.includes('{') && desc.includes('}')) {
      tempNightText += desc.split('{')[0]; // Text before first '{'
      const afterFirstBrace = desc.slice(desc.indexOf('{') + 1);
      const content = afterFirstBrace.split('}')[0]; // Content inside first '{...}'
      desc = afterFirstBrace.slice(afterFirstBrace.indexOf('}') + 1); // Text after first '}'
      const [reminder, defaultText] = content.split('='); // Split inside content
      reminderExists = false
      players = document.getElementById("token_layer").getElementsByClassName("role_token");
      for (const player in players) {
        if(!isNaN(parseInt(player))){
          try {
            childTokens = players[player].getElementsByClassName("reminder drag");
            for(childtoken = 0; childtoken < childTokens.length; childtoken++){
              if(childTokens[childtoken].getAttribute("role") == token_JSON.id){
                remindertext = childTokens[childtoken].getElementsByClassName("reminder_text")[0].textContent
                if(remindertext==reminder){
                  
                  playerName = players[player].getElementsByClassName("token_text")[0].textContent;
                  if(playerName != ""){
                    if(reminderExists){
                      tempNightText += " and "
                    }
                    reminderExists = true;
                    tempNightText += playerName
                  }else{
                    if(reminderExists){
                      tempNightText += " and "
                    }
                    reminderExists = true;
                    tempNightText += " the "
                    tempNightText += tokens_ref[players[player].getAttribute("role")].name;
                  }
                }
              }            
            }
          } catch (error) {console.log(error)}      
        }     
      }
      if(!reminderExists){
        tempNightText += defaultText;
      }
    }
    
    tempNightText += desc
    span.innerHTML = tempNightText;
  }else{
    span.innerHTML = desc;
  }
  span.id = token_JSON.id + "_night_order_tab_span";
  div.appendChild(span);
  img = document.createElement("img");
  img.classList = "night_order_img";
  img.src = "assets/icons/official/" + token_JSON.id + ".png";
  div.setAttribute("ontouchstart", "javascript:nightOrderScroll('true')");
  div.setAttribute("ontouchend", "javascript:nightOrderScroll('false')");
  div.setAttribute("onmouseenter", "javascript:nightOrderScroll('true')");
  div.setAttribute("onmouseleave", "javascript:nightOrderScroll('false')");
  div.setAttribute("onclick", "javascript:expand_night_order_tab('" + token_JSON.id + "_night_order_tab')");
  div.appendChild(img);
  document.getElementById("night_order_tab_landing").appendChild(div);
}
function gen_night_order_tab_info(info)
{
  var default_info = {
    "MINION_INFO": "If this game does not have 7 or more players skip this.\nIf more than one Minion, they all make eye contact with each other. Show the \"This is the Demon\" card. Point to the Demon.",
    "DEMON_INFO": "If this game does not have 7 or more players skip this.\nShow the \"These are your minions\" card. Point to each Minion. Show the \"These characters are not in play\" card. Show 3 character tokens of good characters not in play.",
    "DAWN": "Wait approximately 10 seconds. Call for eyes open; immediately announce which players (if anyone) died",
    "DUSK": "Confirm all players have eyes closed. Wait approximately 10 seconds"
  }
  div = document.createElement("div");
  div.classList = "night_order_tab";
  img = document.createElement("img");
  img.classList = "night_order_img";
  img.src = "assets/" + info + ".png"
  div.appendChild(img);
  div.id = info + "_night_order_tab";
  div.style.backgroundImage = "linear-gradient(to right, rgba(0,0,0,0) , #999999)";
  div.setAttribute("ontouchstart", "javascript:nightOrderScroll('true')");
  div.setAttribute("ontouchend", "javascript:nightOrderScroll('false')");
  div.setAttribute("onmouseenter", "javascript:nightOrderScroll('true')");
  div.setAttribute("onmouseleave", "javascript:nightOrderScroll('false')");
  div.setAttribute("onclick", "javascript:expand_night_order_tab('" + info + "_night_order_tab')");
  span = document.createElement("span");
  span.classList = "night_order_span"
  span.innerHTML = default_info[info];
  span.id = info + "_night_order_tab_span";
  div.appendChild(span);
  document.getElementById("night_order_tab_landing").appendChild(div);
}
function expand_night_order_tab(id)
{
  tab = document.getElementById(id)
  tab.style.width = "500px";
  tab.style.transform = "translateX(-410px)";
  tab.style.height = document.getElementById(id).scrollHeight;
  tab.setAttribute("onclick", "javascript:collapse_night_order_tab(event, '" + id + "')");
  if (tab.getElementsByClassName("night_order_fabled_token_container").length == 1 && tab.getElementsByClassName("night_order_fabled_token_container")[0].children.length != 0)
  {
    let container = tab.getElementsByClassName("night_order_fabled_token_container")[0];
    document.getElementById("token_drag_" + id).style = "position: absolute; height: 80px; left: " + container.offsetLeft + "; top: " + container.offsetTop + ";";
    var tokens = tab.getElementsByClassName("night_order_fabled_token_container")[0].children;
    // for (i = 0; i < tokens.length; i++) {
    //   spawnNightOrderGhost(tokens[i].offsetLeft, tokens[i].offsetTop, tokens[i].style.backgroundImage, tokens[i].id, container.id.match(/(?<=night_order_).*/)[0]);
    // }
  }
}
function collapse_night_order_tab(event, id)
{
  event.preventDefault()
  if (document.elementFromPoint(event.clientX, event.clientY).classList == "night_order_fabled_token_perm") { return; } // bad implementation to prvent tab from closing when spawing token
  tab = document.getElementById(id)
  tab.style.width = "90px";
  tab.style.transform = "translateX(0px)";
  tab.style.height = "90px";
  tab.setAttribute("onclick", "javascript:expand_night_order_tab('" + id + "')")
}
async function populate_jinx()
{
  clean_night_order();
  jinxes = await get_JSON("jinx.json");
  tokens = document.getElementById("token_layer").children;
  var inPlay = new Set();
  for (i = 0; i < tokens.length; i++)
  {
    var id = tokens[i].getAttribute("role");
    if (tokens[i].getAttribute("visibility") != "bluff") { inPlay.add(id); }
  }
  for (const token of inPlay)
  {
    for (i = 0; i < jinxes.length; i++)
    {
      if (jinxes[i].id == token)
      {
        for (j = 0; j < jinxes[i].jinx.length; j++)
        {
          if (inPlay.has(jinxes[i].jinx[j].id))
          {
            gen_jinxes_tab(jinxes[i].id, jinxes[i].jinx[j].id, jinxes[i].jinx[j].reason)
          }
        }
      }
    }
  }

}
function gen_jinxes_tab(id1, id2, reason)
{
  div = document.createElement("div");
  div.classList = "night_order_tab";
  div.id = id1 + "_" + id2 + "_jinx_tab";
  div.style.backgroundImage = "linear-gradient(to right, rgba(0,0,0,0) , #b3b300)";
  span = document.createElement("span");
  span.classList = "night_order_span"
  span.innerHTML = reason;
  span.id = id1 + "_" + id2 + "_jinx_tab_span";
  div.appendChild(span);
  imgDiv = document.createElement("div");
  imgDiv.classList = "night_order_img"
  img1 = document.createElement("img");
  img1.src = "assets/icons/official/" + id1 + ".png";
  img1.style = "width: 70%; position: absolute; top: 0px; left: 0px"
  img2 = document.createElement("img");
  img2.src = "assets/icons/official/" + id2 + ".png";
  img2.style = "width: 70%; position: absolute; bottom: 0px; right: 0px"
  imgDiv.appendChild(img1);
  imgDiv.appendChild(img2);
  div.appendChild(imgDiv);
  div.setAttribute("ontouchstart", "javascript:nightOrderScroll('true')");
  div.setAttribute("ontouchend", "javascript:nightOrderScroll('false')");
  div.setAttribute("onmouseenter", "javascript:nightOrderScroll('true')");
  div.setAttribute("onmouseleave", "javascript:nightOrderScroll('false')");
  div.setAttribute("onclick", "javascript:expand_night_order_tab('" + id1 + "_" + id2 + "_jinx_tab" + "')");
  document.getElementById("night_order_tab_landing").appendChild(div);
}
function populate_fabled()
{
  clean_night_order();
  var fabled = DEFAULT_FABLED;
  CURRENT_SCRIPT.forEach((entry) =>
  {
    if (entry.id != "_meta")
    {
      var token = tokens_ref[entry.id];
      if (token["class"] == "FAB")
      {
        fabled.add(entry.id);
      }
    }
    return Promise.resolve();
  })
  fabled.forEach((fable) =>
  {
    var json = tokens_ref[fable];
    gen_fabled_tab(json, true);
    return Promise.resolve();
  })
}
function gen_fabled_tab(token_JSON, inPlay)
{
  var color = "#b3b300";
  if (!inPlay) { color = "#000000"; }
  var div = document.createElement("div");
  div.classList = "night_order_tab";
  div.id = token_JSON.id + "_night_order_tab";
  div.style.backgroundImage = "linear-gradient(to right, rgba(0,0,0,0) , " + color + ")";
  var span = document.createElement("span");
  span.classList = "night_order_span"
  span.innerHTML = token_JSON["description"];
  span.id = token_JSON.id + "_night_order_tab_span";
  div.appendChild(span);
  var img = document.createElement("img");
  img.classList = "night_order_img";
  img.src = "assets/icons/official/" + token_JSON.id + ".png";
  var token_landing = document.createElement("div");
  token_landing.classList = "night_order_fabled_token_container"
  token_landing.id = "night_order_" + token_JSON.id;
  token_JSON["tokens"].forEach((token) =>
  {
    var uid = new Date().getTime()
    var token_perm = generateReminderBacking(token_JSON.id, token, uid)
    token_perm.id = `${token_JSON.id}_${token}`;
    token_perm.setAttribute("onclick", `javascript:spawnFabledReminder("${token_JSON.id}", "${token}")`)
    token_landing.appendChild(token_perm)
  })
  div.appendChild(token_landing);
  var token_drag = document.createElement("div");
  token_drag.id = "token_drag_" + token_JSON.id + "_night_order_tab";
  div.appendChild(token_drag);
  document.getElementById("night_order_tab_landing").appendChild(div);
  div.setAttribute("ontouchstart", "javascript:nightOrderScroll('true')");
  div.setAttribute("ontouchend", "javascript:nightOrderScroll('false')");
  div.setAttribute("onmouseenter", "javascript:nightOrderScroll('true')");
  div.setAttribute("onmouseleave", "javascript:nightOrderScroll('false')");
  div.setAttribute("onclick", "javascript:expand_night_order_tab('" + token_JSON.id + "_night_order_tab')");
  div.appendChild(img);
}
//generates an html page that can be printed to a pdf from currently loaded script
async function generateHTMLDocument() {
  update_current_script()

  // Start the HTML structure
    let html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${CURRENT_SCRIPT[0].name}</title>
    <style>
      @font-face {
        font-family: PiratesBay;
        src: url(sansation_light.woff);
      }
      body {
        margin: 10px;
        font-family: PiratesBay;
        font-size:x-small;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 0;
        padding: 0;
        
      }
      td {
        vertical-align: top;
        padding: 3px;
        font-size:15px
      }
      img {
        max-width: 100%;
        height: auto;
      }
      h1 {
       font-size:30px
      }
       h2 {
       font-size:20px
      }
    </style>
    <script>
      alert("Print page to pdf");
    </script>
  </head>
  <body>
  <h1>${CURRENT_SCRIPT[0].name}</h1>
  <h2>Townsfolk<h2>
  <table>`;

    // Generate rows from the provided arrays for town
    for (let i = 1; i < CURRENT_SCRIPT.length; i++) {
      if(tokens_ref[CURRENT_SCRIPT[i].id].class == 'TOWN'){
        html += `
      <tr>
        <td style="width: 7.5%;"><img src="assets/icons/official/${tokens_ref[CURRENT_SCRIPT[i].id].id}.png" alt="${tokens_ref[CURRENT_SCRIPT[i].id].name}"></td>
        <td style="width: 15%; font-weight: bold;">${tokens_ref[CURRENT_SCRIPT[i].id].name}</td>
        <td style="width: 75%;">${tokens_ref[CURRENT_SCRIPT[i].id].description}</td>
      </tr>`;
      }
    }

  html += `
  </table>

  <h2>Outsiders<h2>
  <table>`;

    // Generate rows from the provided arrays for OUTsiders
    for (let i = 1; i < CURRENT_SCRIPT.length; i++) {
      if(tokens_ref[CURRENT_SCRIPT[i].id].class == 'OUT'){
        html += `
      <tr>
        <td style="width: 7.5%;"><img src="assets/icons/official/${tokens_ref[CURRENT_SCRIPT[i].id].id}.png" alt="${tokens_ref[CURRENT_SCRIPT[i].id].name}"></td>
        <td style="width: 15%; font-weight: bold;">${tokens_ref[CURRENT_SCRIPT[i].id].name}</td>
        <td style="width: 75%;">${tokens_ref[CURRENT_SCRIPT[i].id].description}</td>
      </tr>`;
      }
    }
    html += `
  </table>

  <h2>Minions<h2>
  <table>`;

    // Generate rows from the provided arrays for minions
    for (let i = 1; i < CURRENT_SCRIPT.length; i++) {
      if(tokens_ref[CURRENT_SCRIPT[i].id].class == 'MIN'){
        html += `
      <tr>
        <td style="width: 7.5%;"><img src="assets/icons/official/${tokens_ref[CURRENT_SCRIPT[i].id].id}.png" alt="${tokens_ref[CURRENT_SCRIPT[i].id].name}"></td>
        <td style="width: 15%; font-weight: bold;">${tokens_ref[CURRENT_SCRIPT[i].id].name}</td>
        <td style="width: 75%;">${tokens_ref[CURRENT_SCRIPT[i].id].description}</td>
      </tr>`;
      }
    }
    html += `
  </table>

  <h2>Demons<h2>
  <table>`;

  // Generate rows from the provided arrays for Demons
  for (let i = 1; i < CURRENT_SCRIPT.length; i++) {
    if(tokens_ref[CURRENT_SCRIPT[i].id].class == 'DEM'){
      html += `
    <tr>
      <td style="width: 7.5%;"><img src="assets/icons/official/${tokens_ref[CURRENT_SCRIPT[i].id].id}.png" alt="${tokens_ref[CURRENT_SCRIPT[i].id].name}"></td>
      <td style="width: 15%; font-weight: bold;">${tokens_ref[CURRENT_SCRIPT[i].id].name}</td>
      <td style="width: 75%;">${tokens_ref[CURRENT_SCRIPT[i].id].description}</td>
    </tr>`;
    }
  }
  //close table
  html += `
  </table>`;
  //Night Order
  var order = await get_JSON("nightsheet.json");
  let first_night = [];
  let other_night = [];
  for(i = 0; i < order["firstnight"].length; i++){
    id = order["firstnight"][i]
    for(j=0; j < CURRENT_SCRIPT.length; j++){
      if(CURRENT_SCRIPT[j].id === id  && tokens_ref[id].class != "TRAV"){first_night.push(id)}
    }
  }
  for(i = 0; i < order["othernight"].length; i++){
    id = order["othernight"][i]
    for(j=0; j < CURRENT_SCRIPT.length; j++){
      if(CURRENT_SCRIPT[j].id === id && tokens_ref[id].class != "TRAV"){other_night.push(id)}
    }
  }
  //fill night order table
  html +=`
  <table>
        <tr>
            <th><h2>First Night</h2></th>
            <th><h2>Other Nights</h2></th>
        </tr>`
  for(i = 0; i < (other_night.length < first_night.length ? first_night.length : other_night.length); i++){
    let first_id = first_night[i];
    let other_id = other_night[i];
    html+=`
    <tr>`
    if(tokens_ref[first_id]){
      html+=`
      <td><img style="width: 7.5%" src="assets/icons/official/${first_id}.png" alt="${tokens_ref[first_id].name}"> <b>${tokens_ref[first_id].name}</b></td>`
    }else{
      html+=`
      <td></td>`
    };
    if(tokens_ref[other_id]){
      html+=`
        <td><img style="width: 7.5%" src="assets/icons/official/${other_id}.png" alt="${tokens_ref[other_id].name}"> <b>${tokens_ref[other_id].name}</b></td>`
    }else{
      html+=`
      <td></td>`
    };
    html+=`
    </tr>`
  }
  //end table
  html+=`      
    </table>`
  //Print jinxes
  
  jinxes = await get_JSON("jinx.json");
  anyjinx = false
  for(i = 0; i <  jinxes.length; i++){
    for(j = 0; j < CURRENT_SCRIPT.length; j++){
      //if the first role in the pair is in the current script
      if(jinxes[i].id == CURRENT_SCRIPT[j].id){
        for(k = 0; k < jinxes[i].jinx.length; k++){
          jinx = jinxes[i].jinx[k];         
          for(l = 0; l < CURRENT_SCRIPT.length; l++){
            //if the second role in the pair is in the current script
            if(jinx.id == CURRENT_SCRIPT[l].id){
              if(!anyjinx){               
                html +=`
                <h2>Jinxes<h2>
                <table>`;
                anyjinx = true
              }
              html += `
              <tr>
                <td style="width: 7.5%;"><img src="assets/icons/official/${jinxes[i].id}.png" alt="${tokens_ref[jinxes[i].id].name}"></td>
                <td style="width: 15%; font-weight: bold;">${tokens_ref[jinxes[i].id].name}</td>
                <td style="width: 7.5%;"><img src="assets/icons/official/${jinx.id}.png" alt="${tokens_ref[jinx.id].name}"></td>
                <td style="width: 15%; font-weight: bold;">${tokens_ref[jinx.id].name}</td>
                <td style="width: 70%;">${jinx.reason}</td>
              </tr>`;
            }
          }          
        }
      }
    }  
  }
  if(anyjinx){
    //end table
    html+=`      
    </table>`
  }
  

  //Print travelers and fables
  html +=`
  <h2>Travelers<h2>
  <table>`;

  // Generate rows For travelers
  for (element in tokens_ref) {
    if(tokens_ref[element].class == 'TRAV'){
      html += `
    <tr>
      <td style="width: 7.5%;"><img src="assets/icons/official/${tokens_ref[element].id}.png" alt="${tokens_ref[element].name}"></td>
      <td style="width: 15%; font-weight: bold;">${tokens_ref[element].name}</td>
      <td style="width: 75%;">${tokens_ref[element].description}</td>
    </tr>`;
    }
  }
  //close table
  html += `
  </table>`;

  // Generate rows For fables
  html +=`
  <h2>Fables<h2>
  <table>`;
  for (element in tokens_ref) {
    if(tokens_ref[element].class == 'FAB'){
      html += `
    <tr>
      <td style="width: 7.5%;"><img src="assets/icons/official/${tokens_ref[element].id}.png" alt="${tokens_ref[element].name}"></td>
      <td style="width: 15%; font-weight: bold;">${tokens_ref[element].name}</td>
      <td style="width: 75%;">${tokens_ref[element].description}</td>
    </tr>`;
    }
  }
  //close table
  html += `
  </table>`;

  // Close the HTML structure
  html +=`
  </body>
  </html>`;

  // Optional: Automatically open the generated HTML in a new window
  const newWindow = window.open();
  newWindow.document.write(html);
  newWindow.document.close();
}

//Downloads the script of onscreen tokens in a .json file
function download_current_script()
{
  update_current_script()
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(CURRENT_SCRIPT)));
  element.setAttribute('download', CURRENT_SCRIPT[0].name + ".json");
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

//Updates the current script name to reflect the inputted name
function update_current_script_name(){
  CURRENT_SCRIPT[0].name = document.getElementById("script_upload_feedback").textContent;
}

//updates the current to script to on screen tokens
function update_current_script(){
  //clear current script
  CURRENT_SCRIPT = CURRENT_SCRIPT.filter(element => element.id == CURRENT_SCRIPT[0].id);
  //repopulated based on tokens currently on screen(and not hidden or dead)
  onscreen_tokens = document.getElementById("token_layer").getElementsByClassName("role_token");
  for (i = 0; i < onscreen_tokens.length; i++) {
    if(onscreen_tokens[i].getAttribute("visibility")=="show" && onscreen_tokens[i].getAttribute("viability") == "alive"){
      let newElement = {"id":onscreen_tokens[i].role}
      if (!CURRENT_SCRIPT.some(element => element.id == newElement.id)) {
        CURRENT_SCRIPT.push(newElement); // Add the element only if it doesn't exist
      }
    }   
  }
}

//Opens a mutate menu of all tokens of a set class
//And when selected the token will be spawned on the board
function add_offscript_character(token_class){ 
  document.getElementById("mutate_menu_all").innerHTML = "";
  let allTokens = [];
  for(let element in tokens_ref)
  {
    element = tokens_ref[element]
    if (element.class == token_class)
    {      
      try {
        var div = document.createElement("div");
        div.id = "mutate_menu_all";
        generateSampleToken(element["id"], div);
        div.classList = "background_image mutate_menu_token";
        div.setAttribute("onclick","spawnTokenDefault('" + element["id"] + "', 'show', '"+ token_class + "', 'alive')")
        document.getElementById("mutate_menu_all").appendChild(div);
        } catch { }
    }
  }
  document.getElementById("mutate_menu_all_main").style.display = "inherit";
}

//open and close menu with m key
//could be expanded to allow for more keybinds
document.addEventListener('keydown', function(event) {
  const keyPressed = event.key; // Get the key that was pressed
  if(event.key == 'm'){
    document.getElementById("menu_main").style.transform == "translateX(0px)" ? close_menu() : open_menu();   
  }
});

// function spawnNightOrderGhost(x, y, imgUrl, id, fabled) {
//   var time = new Date();
//   var uid = time.getTime();
//   var div = document.createElement("div");
//   div.classList = "info_tokens_drag drag";
//   div.style = "background-image: "+imgUrl+"; left: "+x+"; top: "+y+"; border-radius: 100%; pointer-events: all; width: 80px; height: 80px;";
//   div.id = id + "_" + uid;
//   div.setAttribute("ghost", "true");
//   div.setAttribute("token_from", "night_order");
//   var img = document.createElement("img");
//   img.style = "width: 80%; height: 80%; margin: 10%; pointer-events: none; display: none; border-radius: 100%; user-select: none";
//   img.src = "assets/delete.png";
//   img.id = id + "_" + uid + "_img";
//   div.appendChild(img);
//   document.getElementById("token_drag_" + fabled + "_night_order_tab").prepend(div);
//   dragInit();
// }
