export interface KingdomState {
  year: number;
  season: number;
  population: number;
  storedRice: number;
}

export interface TurnOrders {
  dykeWorkers: number;
  fieldWorkers: number;
  villageGuards: number;
  riceToPlant: number;
}

export function processSeason(state: KingdomState, orders: TurnOrders): { state: KingdomState, turnReport: string } {
  // Validation
  const totalWorkers = orders.dykeWorkers + orders.fieldWorkers + orders.villageGuards;
  if (totalWorkers > state.population) {
    throw "My Lord, we do not have enough peasants for these orders!";
  }

  let turnReport = "";

  // Copy state to avoid mutating the original
  const updatedState = { ...state };

  // Starvation Math
  const requiredRice = updatedState.population * 20;
  let starved = 0;

  if (updatedState.storedRice >= requiredRice) {
    updatedState.storedRice -= requiredRice;
  } else {
    const deficit = requiredRice - updatedState.storedRice;
    starved = Math.ceil(deficit / 20);
    updatedState.population -= starved;
    updatedState.storedRice = 0;
  }

  if (starved > 0) {
    turnReport += `${starved} peasants starved to death. `;
  } else {
    turnReport += `No peasants starved. `;
  }

  // Harvest Math
  if (updatedState.season === 2) {
    let baseYield = orders.riceToPlant * 3;
    let maxYield = orders.fieldWorkers * 50;
    let finalYield = Math.min(baseYield, maxYield);
    updatedState.storedRice += finalYield;
    turnReport += `The harvest yielded ${finalYield} rice. `;
  }

  // Advance Time
  updatedState.season++;
  if (updatedState.season > 3) {
    updatedState.season = 1;
    updatedState.year++;
  }

  const upcomingSeasonName = updatedState.season === 1 ? "Growing" : updatedState.season === 2 ? "Harvest" : "Winter";
  turnReport += `The upcoming season is ${updatedState.season} (${upcomingSeasonName}).`;
  // Draw the new map before returning the report to the AI!
  renderMap(updatedState);

  return { state: updatedState, turnReport: turnReport.trim() };

  return { state: updatedState, turnReport: turnReport.trim() };
}

function renderMap(state: KingdomState) {
  const mapContainer = document.getElementById('map-container');
  if (!mapContainer) return;

  // Visual representations based on your actual data
  const peasants = "🧑‍🌾".repeat(Math.ceil(state.population / 20)); // 1 icon per 20 people
  const rice = "🌾".repeat(Math.ceil(state.storedRice / 500)); // 1 icon per 500 rice

  // Draw the river (maybe it changes color if we add floods later!)
  const river = "🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦";

  // Inject the graphics into the HTML
  mapContainer.innerHTML = `
    <div><strong>Year: ${state.year} | Season: ${state.season}</strong></div>
    <div style="margin: 20px 0;">${river}</div>
    <div><strong>Villagers:</strong><br/> ${peasants || "💀 (Ghost Town)"}</div>
    <div style="margin: 10px 0;"><strong>Granary:</strong><br/> ${rice || "Empty!"}</div>
    
    <div class="stats">
      Population: ${state.population} | Stored Rice: ${state.storedRice}
    </div>
  `;
}

