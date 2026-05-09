/* ============================================================================
 * 1. INITIALIZATION MODULE
 * ============================================================================
 * Handles initial script loading, diagnostics, and environment detection
 */

class Plant {
  /**
   * @param {string} name The Plant's display name.
   * @param {string} id The Plants in game ID.
   * @param {string} shopImage The link to the image for the Plant.
   * @param {number} rarity The number of the rarity for the Plant inside the shop (if in the shop)/For the plant in general, 0 for common, 1 for uncommon, 2 for rare, 3 for legendary, 4 for mythical, 5 for divine, 6 for celestial
   * @param {number} shopPrice The price of the Plant in the shop (If in the shop)
   * @param {boolean} inShop Whether or not the Plant is buyable in the shop
   * @param {string} htmlEmoji The emoji (EG 🌵 for Cactus) to be shown inside html for Notifications, Wiki tools, etc.
   * @param {number} plantValue The base selling value for said Plant, with no modifiers.
   */
  constructor(
    name,
    id,
    shopImage,
    rarity,
    shopPrice,
    inShop,
    htmlEmoji,
    plantValue,
  ) {
    this.name = name;
    this.id = id;
    this.shopImage = shopImage;
    this.rarity = rarity;
    this.shopPrice = shopPrice;
    this.inShop = inShop;
    this.htmlEmoji = htmlEmoji;
    this.plantValue = plantValue;
  }

  /**
   * Returns the plant in json format.
   * @returns {string} the plant in json
   */
  getPlantJson() {
    if (this.inShop) {
      return `
       {
         "name" = "${this.name}",
         "id" = "${this.id}",
         "shopImage" = "${this.shopImage}",
         "rarity" = ${this.rarity},
         "shopPrice" = ${this.shopPrice},
         "inShop" = ${this.inShop},
         "htmlEmoji" = "${this.htmlEmoji}",
         "plantValue" = ${this.plantValue}
       }
       `;
    } else {
      return `
       {
         "name" = "${this.name}",
         "id" = "${this.id}",
         "shopImage" = "${this.shopImage}",
         "rarity" = ${this.rarity},
         "inShop" = ${this.inShop},
         "htmlEmoji" = "${this.htmlEmoji}",
         "plantValue" = ${this.plantValue}
       }
       `;
    }
  }
}

async function fetchPlantsFromMGAPI() {
  const url = "https://mg-api.ariedam.fr/data/plants";
  const plantsArray = [];
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const plants = await response.json();

    for (const [id, plant] of Object.entries(plants)) {
      let rarityNum = 0;
      switch (plant.seed.rarity) {
        case "Uncommon":
          rarityNum = 1;
          break;
        case "Rare":
          rarityNum = 2;
          break;
        case "Legendary":
          rarityNum = 3;
          break;
        case "Mythic":
          rarityNum = 4;
          break;
        case "Divine":
          rarityNum = 5;
          break;
        case "Celestial":
          rarityNum = 6;
          break;

        default:
          break;
      }
      const newPlant = new Plant(
        plant.crop.name,
        id,
        plant.crop.sprite,
        rarityNum,
        plant.seed.coinPrice,
        plant.seed.purchasable,
        "⚠️",
        plant.crop.baseSellPrice,
      );
      /*console.log(
        `"name": "${plant.crop.name}", "id": "${id}", "shopImage": "${plant.crop.sprite}", "rarity": ${rarityNum}, "shopPrice": ${plant.seed.coinPrice}, "inShop": ${plant.seed.purchasable}, "htmlEmoji": "⚠️", "plantValue": ${plant.crop.baseSellPrice}`,
      );*/
      plantsArray.push(newPlant);
    }
  } catch (error) {
    console.error(error.message);
  }
  return plantsArray;
}

// === DIAGNOSTIC LOGGING (MUST EXECUTE IF SCRIPT LOADS) ===
console.warn(
  "%c🚨🚨🚨 MGTOOLS LOADING - IF YOU SEE THIS, SCRIPT IS RUNNING 🚨🚨🚨",
  "font-size: 20px;",
);
console.log("[MGTOOLS-DEBUG] 1. Script file loaded");
console.log(
  "[MGTOOLS-DEBUG] ⚡ VERSION: 2.6.0 - Added dynamic shop info + The feed buttons are back!",
);
console.log("[MGTOOLS-DEBUG] 🕐 Load Time:", new Date().toISOString());
console.log("[MGTOOLS-DEBUG] 2. Location:", window.location.href);
console.log("[MGTOOLS-DEBUG] 3. Navigator:", navigator.userAgent);
console.log(
  "[MGTOOLS-DEBUG] 4. Window type:",
  window === window.top ? "TOP" : "IFRAME",
);

