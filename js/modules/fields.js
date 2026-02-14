import { qs } from "./app.js";

export function renderFields(game){
  const host = qs("#dynamicFields");
  host.innerHTML = "";

  const make = (html)=> {
    const div = document.createElement("div");
    div.innerHTML = html.trim();
    return div.firstElementChild;
  };

  if(game === "pokemon"){
    host.append(
      make(fieldText("name","Name",true)),
      make(fieldNumber("hp","HP",0,999,false)),
      make(fieldText("type","Type",true,"e.g., Fire, Water")),
      make(fieldText("evolutionStage","Evolution Stage",false,"Basic / Stage 1 / Stage 2")),
      make(fieldText("evolvesFrom","Evolves From",false)),
      make(fieldText("artwork","Artwork",false,"Artist / source notes")),
      make(fieldText("ability","Ability",false)),
      make(fieldTextarea("attacks","Attacks",false,"List attacks & damage")),
      make(fieldText("weakness","Weakness",false)),
      make(fieldText("resistance","Resistance",false)),
      make(fieldText("retreatCost","Retreat Cost",false,"e.g., 2 Colorless")),
      make(fieldTextarea("pokedexText","Pokédex / Flavor Text",false)),
      make(fieldText("cardNumber","Card Number",true,"e.g., 12/102")),
      make(fieldText("setSymbol","Set Symbol",false)),
      make(fieldText("raritySymbol","Rarity Symbol",false)),
      make(fieldText("regulationMark","Regulation Mark",false,"e.g., F / G / H")),
      make(fieldText("illustrator","Illustrator",false))
    );

    qs("#cardBackInfo").innerHTML = `
      <ul>
        <li>Pokémon logo</li>
        <li>Poké Ball design</li>
      </ul>
    `;
  }else{
    host.append(
      make(fieldText("name","Name",true)),
      make(fieldText("manaCost","Mana Cost",false,"e.g., 1G, UU, {2}{R}")),
      make(fieldText("cardType","Card Type",true,"e.g., Creature, Sorcery")),
      make(fieldText("subtype","Subtype",false,"e.g., Elf Druid")),
      make(fieldText("setSymbol","Set Symbol",false)),
      make(fieldText("rarity","Rarity",false)),
      make(fieldText("artwork","Artwork",false,"Artist / source notes")),
      make(fieldText("powerToughness","Power / Toughness",false,"Only if creature (e.g., 2/3)")),
      make(fieldTextarea("rulesText","Rules Text",false)),
      make(fieldTextarea("flavorText","Flavor Text",false)),
      make(fieldText("artistCredit","Artist Credit",false)),
      make(fieldText("collectorNumber","Collector Number",true)),
      make(fieldText("setCode","Set Code",false,"e.g., DMU")),
      make(fieldText("language","Language",false,"e.g., EN")),
      make(fieldText("expansionSymbol","Expansion Symbol",false))
    );

    qs("#cardBackInfo").innerHTML = `
      <ul>
        <li>Magic: The Gathering logo</li>
        <li>Card back design</li>
        <li>Deckmaster label</li>
      </ul>
    `;
  }
}

function fieldText(id,label,required=false,placeholder=""){
  return `
  <div class="field">
    <label for="${id}">${label}${required ? " *" : ""}</label>
    <input id="${id}" name="${id}" type="text" ${required ? "required" : ""} ${placeholder ? `placeholder="${escapeAttr(placeholder)}"`: ""}/>
    ${required ? `<div class="hint">Required</div>` : `<div class="hint">Optional</div>`}
  </div>`;
}
function fieldNumber(id,label,min,max,required=false){
  return `
  <div class="field">
    <label for="${id}">${label}${required ? " *" : ""}</label>
    <input id="${id}" name="${id}" type="number" min="${min}" max="${max}" ${required ? "required" : ""} inputmode="numeric"/>
    <div class="hint">${required ? "Required" : "Optional"}</div>
  </div>`;
}
function fieldTextarea(id,label,required=false,placeholder=""){
  return `
  <div class="field">
    <label for="${id}">${label}${required ? " *" : ""}</label>
    <textarea id="${id}" name="${id}" ${required ? "required" : ""} ${placeholder ? `placeholder="${escapeAttr(placeholder)}"`: ""}></textarea>
    <div class="hint">${required ? "Required" : "Optional"}</div>
  </div>`;
}
function escapeAttr(s){
  return String(s).replaceAll('"',"&quot;");
}
